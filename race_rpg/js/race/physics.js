/* 車両物理（120Hz）
 * ボディ座標: x=前, y=右, ヨーは時計回りが正。ワールド: 前方ベクトル (sinψ, -cosψ)
 * 4輪: 0=左前 1=右前 2=左後 3=右後
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, C = RR.Course;
  var G = 9.81, TAMB = 15;
  var Phys = RR.Phys = {};

  Phys.BASE = {
    mass: 1080, L: 2.4, a: 1.19, tw: 1.46, h: 0.52, R: 0.3, halfW: 0.86, halfL: 2.05,
    torque: 170, rpmPeak: 5400, redline: 7200, idle: 900, curve: 'normal', turbo: 0, lag: 0,
    gears: [3.3, 2.05, 1.45, 1.08, 0.86], final: 4.3, eff: 0.86,
    power: 1, mu: 1.04, muF: 1, muR: 1.0, heatOpt: 80, heatRange: 40, heatRate: 1, coolRate: 1,
    brake: 1, bias: 0.62, rollF: 0.52, susp: 1, steerMax: 0.6, steerRate: 3.0, steerQ: 1,
    lsd: 0.15, down: 0, drag: 0.36, offroad: 1, aeroBal: 0.45,
    wear: { engine: 1, tire: 1, brake: 1, susp: 1, trans: 1, diff: 1, aero: 1 }
  };

  function Car(spec, o) {
    o = o || {};
    this.sp = spec;
    this.x = o.x || 0; this.y = o.y || 0; this.psi = o.psi || 0;
    this.u = 0; this.v = 0; this.r = 0;
    this.delta = 0; this.steerIn = 0;
    this.rpm = spec.idle; this.gear = 1; this.shiftT = 0; this.boost = 0;
    this.ax = 0; this.ay = 0;
    var t0 = o.tireTemp == null ? 50 : o.tireTemp;
    this.T = [t0, t0, t0, t0];
    this.Fz = [0, 0, 0, 0]; this.Fx = [0, 0, 0, 0]; this.Fy = [0, 0, 0, 0];
    this.slide = [0, 0, 0, 0]; this.spin = [false, false, false, false]; this.lock = [false, false, false, false];
    this.surf = [0, 0, 0, 0];
    this.idx = null; this.s = 0; this.d = 0;
    this.reverse = false; this.revT = 0;
    this.thr = 0; this.brk = 0;
    this.wear = { engine: 0, tire: 0, brake: 0, susp: 0, trans: 0, diff: 0, aero: 0 };
    this.hits = 0; this.hitT = 0; this.lastImpact = 0; this.offT = 0;
    this.slipTotal = 0;
    this.mt = !!o.mt;
    this.assist = o.assist == null ? 1 : o.assist;
    this.tcs = o.tcs == null ? 0.6 : o.tcs; // 0=なし 1=強（駆動力を後輪の限界内に抑える）
    this.events = [];
  }
  Phys.Car = Car;

  Car.prototype.speed = function () { return Math.sqrt(this.u * this.u + this.v * this.v); };
  Car.prototype.kmh = function () { return this.speed() * 3.6; };
  Car.prototype.beta = function () { return Math.atan2(this.v, Math.max(Math.abs(this.u), 2)); };
  Car.prototype.ratio = function (g) { return this.sp.gears[(g || this.gear) - 1] * this.sp.final; };
  // 速度に応じた最大舵角（十字キーを押し切った時にタイヤのグリップ頂点付近になるように）
  Car.prototype.dmax = function () {
    var u = Math.abs(this.u);
    return Math.min(this.sp.steerMax, this.sp.L * this.sp.mu * 9.81 / (u * u + 1) + 0.13 * this.sp.steerQ);
  };

  function torqueShape(sp, rpm) {
    var idle = sp.idle, pk = sp.rpmPeak, red = sp.redline, t;
    var lowStart = sp.curve === 'high' ? 0.45 : sp.curve === 'low' ? 0.82 : sp.curve === 'turbo' ? 0.55 : 0.64;
    var topEnd = sp.curve === 'high' ? 0.86 : sp.curve === 'low' ? 0.55 : 0.72;
    if (rpm < pk) t = lowStart + (1 - lowStart) * U.smooth((rpm - idle) / (pk - idle));
    else t = 1 - (1 - topEnd) * Math.pow(U.clamp((rpm - pk) / (red - pk), 0, 1.2), 1.4);
    return Math.max(0.2, t);
  }
  Phys.torqueShape = torqueShape;

  function mf(alpha) {
    // 簡易マジックフォーミュラ（ピーク約9度、それ以上は緩やかに低下）
    var B = 9.5, Cc = 1.6, E = 0.2, x = B * alpha;
    return Math.sin(Cc * Math.atan(x - E * (x - Math.atan(x))));
  }
  function gripT(sp, T) {
    var x = (T - sp.heatOpt) / sp.heatRange;
    if (x < 0) return Math.max(0.82, 1 - 0.12 * x * x);
    return Math.max(0.6, 1 - 0.36 * x * x);
  }
  Phys.gripT = gripT;

  // input: {thr, brk, steer, up, down}
  Car.prototype.step = function (dt, inp, course) {
    var sp = this.sp, m = sp.mass;
    var a = sp.a, b = sp.L - sp.a, tw = sp.tw, h = sp.h;
    var u = this.u, v = this.v, r = this.r;
    var spd = Math.sqrt(u * u + v * v);
    this.events.length = 0;

    // ---- 入力 ----
    var thr = U.clamp(inp.thr || 0, 0, 1), brk = U.clamp(inp.brk || 0, 0, 1);
    // バック: 停止中にブレーキを押し続けると後退
    if (!this.reverse && u < 0.6 && brk > 0.5 && thr < 0.1) { this.revT += dt; if (this.revT > 0.45) { this.reverse = true; } }
    else if (!this.reverse) this.revT = 0;
    if (this.reverse && (thr > 0.1 || u > 1.5)) { this.reverse = false; this.revT = 0; }
    var revThr = 0;
    if (this.reverse) { revThr = brk; brk = 0; }
    this.thr = thr; this.brk = brk;

    // ---- ステアリング ----
    var sIn = U.clamp(inp.steer || 0, -1, 1);
    this.steerIn = sIn;
    var dmax = this.dmax();
    var beta = this.beta();
    var target = sIn * dmax;
    // ドリフトアシスト: リアが流れた時（横滑りとヨーが逆向き）だけ逆ハンを足す
    if (this.assist > 0 && u > 5 && beta * r < 0) {
      var excess = Math.abs(beta) - 0.04;
      if (excess > 0) target += this.assist * 0.9 * U.sign(beta) * excess;
    }
    target = U.clamp(target, -0.62, 0.62);
    var rate = sp.steerRate * (Math.abs(target) < Math.abs(this.delta) ? 1.6 : 1);
    this.delta = U.approach(this.delta, target, rate * dt);
    var dl = this.delta, cd = Math.cos(dl), sd = Math.sin(dl);

    // ---- 変速 ----
    var nG = sp.gears.length;
    if (this.shiftT > 0) this.shiftT -= dt;
    var wheelRpm = Math.abs(u) / sp.R * this.ratio() * 60 / (2 * Math.PI);
    if (this.mt) {
      if (inp.up && this.gear < nG) { this.gear++; this.shiftT = 0.12; this.wear.trans += 0.06 * sp.wear.trans; this.events.push('shift'); }
      if (inp.down && this.gear > 1) {
        var wrL = Math.abs(u) / sp.R * this.ratio(this.gear - 1) * 60 / (2 * Math.PI);
        if (wrL < sp.redline * 1.04) { this.gear--; this.shiftT = 0.1; this.wear.trans += 0.08 * sp.wear.trans; this.events.push('shift'); }
        else this.events.push('overrev');
      }
    } else if (this.shiftT <= 0 && !this.reverse) {
      if (wheelRpm > sp.redline * 0.95 && this.gear < nG && thr > 0.2) { this.gear++; this.shiftT = 0.16; this.wear.trans += 0.05 * sp.wear.trans; this.events.push('shift'); }
      else if (this.gear > 1) {
        var wrL2 = Math.abs(u) / sp.R * this.ratio(this.gear - 1) * 60 / (2 * Math.PI);
        if (wrL2 < sp.redline * 0.78 && (wheelRpm < sp.redline * 0.5 || (brk > 0.3 && wrL2 < sp.redline * 0.7))) { this.gear--; this.shiftT = 0.12; this.wear.trans += 0.05 * sp.wear.trans; this.events.push('shift'); }
      }
    }
    if (this.reverse) this.gear = 1;
    wheelRpm = Math.abs(u) / sp.R * this.ratio() * 60 / (2 * Math.PI);

    // ---- エンジン ----
    var launch = sp.idle + thr * 2600;
    var engRpm = Math.max(wheelRpm, this.gear === 1 || wheelRpm < 1500 ? Math.min(launch, 3500) : sp.idle);
    // 空転時は回転が上がる
    if (this.spin[2] || this.spin[3]) engRpm = Math.max(engRpm, Math.min(sp.redline, wheelRpm + 2200 * thr));
    this.rpm = U.lerp(this.rpm, Math.max(sp.idle * (0.95 + Math.random() * 0.1), engRpm), 0.25);
    var boostTarget = (thr > 0.5 && this.rpm > 3200) ? 1 : 0;
    if (sp.turbo > 0) this.boost = U.approach(this.boost, boostTarget, dt * (boostTarget > this.boost ? (2.8 * (1 - sp.lag) + 0.35) : 3));
    var tq = sp.torque * sp.power * torqueShape(sp, this.rpm) * (1 + sp.turbo * this.boost);
    var cut = this.rpm >= sp.redline ? 0 : 1;
    if (this.shiftT > 0) cut = 0;
    var driveF = 0;
    if (this.reverse) driveF = -revThr * sp.torque * 0.8 * this.ratio(1) * sp.eff / sp.R * (u > -4 ? 1 : 0);
    else driveF = thr * tq * cut * this.ratio() * sp.eff / sp.R;
    // エンジンブレーキ
    if (thr < 0.05 && !this.reverse && u > 1) driveF -= (this.rpm / sp.redline) * 260 * this.ratio() / sp.R * 0.012;
    this.wear.engine += dt * (this.rpm / sp.redline) * (this.rpm / sp.redline) * 0.045 * sp.wear.engine * (0.4 + thr);

    // ---- 荷重 ----
    var Fzf = m * G * b / sp.L, Fzr = m * G * a / sp.L;
    var down = sp.down * u * Math.abs(u);
    Fzf += down * sp.aeroBal; Fzr += down * (1 - sp.aeroBal);
    var dLong = m * this.ax * h / sp.L;
    Fzf -= dLong; Fzr += dLong;
    var dLat = m * this.ay * h / tw;
    var dLf = dLat * sp.rollF, dLr = dLat * (1 - sp.rollF);
    // ay>0（右へ加速=右旋回）で左輪に荷重
    var Fz = this.Fz;
    Fz[0] = Math.max(60, Fzf / 2 + dLf); Fz[1] = Math.max(60, Fzf / 2 - dLf);
    Fz[2] = Math.max(60, Fzr / 2 + dLr); Fz[3] = Math.max(60, Fzr / 2 - dLr);

    // ---- 路面 ----
    var fx = Math.sin(this.psi), fy = -Math.cos(this.psi), rx = Math.cos(this.psi), ry = Math.sin(this.psi);
    var WP = [[a, -tw / 2], [a, tw / 2], [-b, -tw / 2], [-b, tw / 2]];
    var anyOff = false;
    for (var i = 0; i < 4; i++) {
      var wx = this.x + fx * WP[i][0] + rx * WP[i][1], wy = this.y + fy * WP[i][0] + ry * WP[i][1];
      this.surf[i] = course ? C.surfaceAt(course, wx, wy) : 0;
      if (this.surf[i] >= 2) anyOff = true;
    }
    if (anyOff) this.offT += dt;

    // ---- タイヤ力 ----
    var FXb = 0, FYb = 0, MZ = 0;
    // 駆動力の左右配分（LSD: 0=等配分、1=荷重比）
    var wl = Math.pow(Fz[2], sp.lsd), wr2 = Math.pow(Fz[3], sp.lsd);
    var share = [0, 0, wl / (wl + wr2), wr2 / (wl + wr2)];
    // オープンデフ寄りだと滑りやすい側に引っ張られる
    var brakeTotal = brk * m * G * 1.15 * sp.brake;
    var slipSum = 0, heatSum = 0, brakePow = 0, spinAny = false;
    var caps = [0, 0, 0, 0];
    for (i = 0; i < 4; i++) {
      var sm = this.surf[i] === 0 ? 1 : this.surf[i] === 1 ? 0.88 : 0.58 / sp.offroad + (sp.offroad < 1 ? 0.12 : 0);
      caps[i] = sp.mu * (i < 2 ? sp.muF : sp.muR) * gripT(sp, this.T[i]) * sm * (1 - 0.07 * (Fz[i] / 2600 - 1)) * Fz[i];
    }
    // トラクション制御
    if (this.tcs > 0 && driveF > 0) {
      var maxDrive = (caps[2] + caps[3]) * U.lerp(1.7, 0.9, this.tcs);
      if (driveF > maxDrive) driveF = maxDrive;
    }
    for (i = 0; i < 4; i++) {
      var px = WP[i][0], py = WP[i][1];
      var vx = u - r * py, vy = v + r * px;
      var front = i < 2;
      var vl = front ? vx * cd + vy * sd : vx;
      var vt = front ? -vx * sd + vy * cd : vy;
      var alpha = Math.atan2(vt, Math.max(Math.abs(vl), 3));
      var cap = caps[i];
      var Fy = -cap * mf(alpha);
      // 縦力
      var Fx = 0;
      if (!front) Fx += driveF * share[i];
      var fb = brakeTotal * (front ? sp.bias : 1 - sp.bias) / 2;
      if (fb > 0 && Math.abs(vl) > 0.2) Fx += -U.sign(vl) * Math.min(fb, cap * 0.97); // ABS相当
      else if (fb > 0) { Fx += -vl * m * 0.5; }
      // 転がり抵抗
      Fx -= U.sign(vl) * Fz[i] * (this.surf[i] >= 2 ? 0.07 : 0.014);
      var spin = false, lock = false;
      if (Math.abs(Fx) > cap) {
        // 空転/ロック: 縦は動摩擦、横はほとんど残らない
        spin = !front && Math.abs(driveF) > 0;
        Fx = U.sign(Fx) * cap * 0.9;
        Fy *= 0.28;
      } else {
        var lim = Math.sqrt(Math.max(0, cap * cap - Fx * Fx));
        if (Fy > lim) Fy = lim; else if (Fy < -lim) Fy = -lim;
      }
      this.spin[i] = spin; this.lock[i] = lock;
      if (spin) spinAny = true;
      this.Fx[i] = Fx; this.Fy[i] = Fy;
      // ボディへ
      var bx = front ? Fx * cd - Fy * sd : Fx;
      var by = front ? Fx * sd + Fy * cd : Fy;
      FXb += bx; FYb += by;
      MZ += px * by - py * bx;
      // 滑り量（音・煙・発熱）
      var slipV = Math.abs(vt) + (spin ? Math.max(3, Math.abs(u) * 0.3) : 0);
      this.slide[i] = U.clamp(slipV / 6, 0, 2);
      slipSum += this.slide[i];
      var q = Math.abs(Fy) * Math.abs(vt) + (spin ? Math.abs(Fx) * 4 : 0) + Math.abs(Fx) * 0.05 * Math.abs(vl);
      heatSum += q;
      this.T[i] += (q * 0.0009 * sp.heatRate - (this.T[i] - TAMB) * 0.045 * sp.coolRate * (1 + Math.abs(u) * 0.045)) * dt;
      this.T[i] = U.clamp(this.T[i], 10, 160);
      if (fb > 0) brakePow += Math.min(fb, cap) * Math.abs(vl);
    }
    this.slipTotal = slipSum / 4;
    this.wear.tire += heatSum * dt * 7e-6 * sp.wear.tire;
    this.wear.brake += brakePow * dt * 1.1e-6 * sp.wear.brake;
    this.wear.susp += dt * (0.018 + (anyOff ? 0.35 : 0)) * sp.wear.susp;
    if (spinAny) this.wear.diff += dt * 0.35 * sp.wear.diff;
    this.wear.diff += dt * 0.008 * sp.wear.diff;

    // 空気抵抗・勾配
    FXb -= sp.drag * u * Math.abs(u);
    if (anyOff) FXb -= 0.9 * u * Math.abs(u);
    if (course && course.grade) FXb -= m * G * course.grade * (this.relCos == null ? 1 : this.relCos);

    // ---- 積分 ----
    var Iz = m * 1.42;
    var du = FXb / m + r * v, dv = FYb / m - r * u, dr = MZ / Iz;
    this.ax = U.lerp(this.ax, FXb / m, U.clamp(dt * 8 * sp.susp, 0, 1));
    this.ay = U.lerp(this.ay, FYb / m, U.clamp(dt * 8 * sp.susp, 0, 1));
    u += du * dt; v += dv * dt; r += dr * dt;
    // 低速の安定化
    if (spd < 2.5) {
      var k = (2.5 - spd) / 2.5;
      v *= 1 - k * 0.25; r *= 1 - k * 0.2;
      if (thr < 0.05 && !this.reverse && Math.abs(u) < 0.3 && brk > 0) u = 0;
    }
    if (!this.reverse && u < 0 && thr > 0) u = Math.max(u, 0);
    this.u = u; this.v = v; this.r = r;
    this.psi = U.wrapAngle(this.psi + r * dt);
    fx = Math.sin(this.psi); fy = -Math.cos(this.psi); rx = Math.cos(this.psi); ry = Math.sin(this.psi);
    this.x += (fx * u + rx * v) * dt;
    this.y += (fy * u + ry * v) * dt;

    // ---- コースとの位置関係・壁 ----
    if (course) this.collideWalls(course, dt);
  };

  Car.prototype.collideWalls = function (c, dt) {
    var loc = C.locate(c, this.x, this.y, this.idx);
    this.idx = loc.i; this.s = loc.s; this.d = loc.d;
    var rel = this.psi - c.pts[loc.i].psi;
    this.rel = U.wrapAngle(rel);
    this.relCos = Math.cos(this.rel);
    var hw = c.width / 2;
    var ext = this.sp.halfW * Math.abs(Math.cos(rel)) + this.sp.halfL * Math.abs(Math.sin(rel));
    var valleyR = loc.side === 'R' || loc.side === 'B', valleyL = loc.side === 'L' || loc.side === 'B';
    var limR = hw + (valleyR ? 0.85 : 1.0), limL = hw + (valleyL ? 0.85 : 1.0);
    var pen = 0, nx = 0, ny = 0;
    if (loc.d + ext > limR) { pen = loc.d + ext - limR; nx = loc.rx; ny = loc.ry; }
    else if (loc.d - ext < -limL) { pen = -limL - (loc.d - ext); nx = -loc.rx; ny = -loc.ry; }
    if (this.hitT > 0) this.hitT -= dt;
    if (pen <= 0) return;
    // 押し戻し
    this.x -= nx * pen; this.y -= ny * pen;
    var fx = Math.sin(this.psi), fy = -Math.cos(this.psi), rx = Math.cos(this.psi), ry = Math.sin(this.psi);
    var Vx = fx * this.u + rx * this.v, Vy = fy * this.u + ry * this.v;
    var vn = Vx * nx + Vy * ny;
    if (vn > 0) {
      Vx -= 1.25 * vn * nx; Vy -= 1.25 * vn * ny;
      var damp = 1 - Math.min(0.35, vn * 0.04);
      Vx *= damp; Vy *= damp;
      // 当たった側に応じて車体を回す
      var side = (nx * rx + ny * ry) > 0 ? 1 : -1;
      this.r += -side * Math.min(1.5, vn * 0.12) * U.sign(Math.cos(this.rel));
      this.u = Vx * fx + Vy * fy; this.v = Vx * rx + Vy * ry;
      if (this.hitT <= 0) {
        this.hitT = 0.25;
        this.lastImpact = vn;
        this.hits++;
        this.events.push(vn > 5 ? 'crash' : 'scrape');
        this.wear.aero += vn * 0.5 * this.sp.wear.aero;
        this.wear.susp += vn * 0.18 * this.sp.wear.susp;
      }
    } else {
      // こすっている
      var t = 1 - dt * 0.8;
      this.u *= t;
      if (this.hitT <= 0 && this.speed() > 3) { this.hitT = 0.35; this.events.push('scrape'); }
    }
  };

  // 2台の衝突（円2つで近似）
  Phys.collideCars = function (A, B) {
    var res = null;
    var ca = circles(A), cb = circles(B);
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      var dx = cb[j][0] - ca[i][0], dy = cb[j][1] - ca[i][1];
      var d = Math.sqrt(dx * dx + dy * dy), rr = 1.75;
      if (d < rr && d > 0.001) {
        var nx = dx / d, ny = dy / d, pen = (rr - d) / 2;
        A.x -= nx * pen; A.y -= ny * pen; B.x += nx * pen; B.y += ny * pen;
        var va = worldV(A), vb = worldV(B);
        var rel = (vb[0] - va[0]) * nx + (vb[1] - va[1]) * ny;
        if (rel < 0) {
          var jimp = -rel * 0.6;
          setWorldV(A, va[0] - nx * jimp, va[1] - ny * jimp);
          setWorldV(B, vb[0] + nx * jimp, vb[1] + ny * jimp);
          A.r += (Math.random() - 0.5) * jimp * 0.08; B.r += (Math.random() - 0.5) * jimp * 0.08;
          res = Math.max(res || 0, -rel);
        }
      }
    }
    return res;
  };
  function circles(c) {
    var fx = Math.sin(c.psi), fy = -Math.cos(c.psi);
    return [[c.x + fx * 1.0, c.y + fy * 1.0], [c.x - fx * 1.0, c.y - fy * 1.0]];
  }
  function worldV(c) {
    var fx = Math.sin(c.psi), fy = -Math.cos(c.psi), rx = Math.cos(c.psi), ry = Math.sin(c.psi);
    return [fx * c.u + rx * c.v, fy * c.u + ry * c.v];
  }
  function setWorldV(c, Vx, Vy) {
    var fx = Math.sin(c.psi), fy = -Math.cos(c.psi), rx = Math.cos(c.psi), ry = Math.sin(c.psi);
    c.u = Vx * fx + Vy * fy; c.v = Vx * rx + Vy * ry;
  }
})();
