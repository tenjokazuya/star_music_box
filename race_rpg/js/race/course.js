/* コース生成: セグメント列 → 中心線サンプル → パレット番号のワールドテクスチャ（4px/m）
 * セグメント: ['S', 長さm] / ['L'|'R', 角度deg, 半径m, 谷側('L'|'R')]
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var Course = RR.Course = { cache: {} };
  var PPM = Course.PPM = 4;      // テクスチャ解像度 px/m
  var DS = 0.5;                  // 中心線サンプル間隔 m

  // ---------- パレット番号 ----------
  var I = Course.IDX = {
    F0: 0, F1: 1, F2: 2, F3: 3, G0: 4, G1: 5,
    A0: 6, A1: 7, A2: 8, SKID: 9, CL: 10, EL: 11, SH0: 12, SH1: 13,
    RL: 14, RLS: 15, RP: 16, RK0: 17, RK1: 18, RK2: 19, GUT: 20, DROP0: 21, DROP1: 22,
    CW: 23, CB: 24, CR: 25, CWH: 26, REF: 27, POLE: 28, TR0: 29, TR1: 30, TR2: 31,
    DIRT: 32, CRACK: 33, SKID2: 34, BAN: 35, BAN2: 36
  };
  // 物理用の路面種別: 0=舗装 1=路肩 2=草/土 3=壁
  var SURF = Course.SURF = new Uint8Array(64);
  [I.F0, I.F1, I.F2, I.F3, I.TR0, I.TR1, I.TR2, I.DROP0, I.DROP1].forEach(function (i) { SURF[i] = 2; });
  [I.G0, I.G1, I.DIRT].forEach(function (i) { SURF[i] = 2; });
  [I.SH0, I.SH1, I.GUT, I.CR, I.CWH].forEach(function (i) { SURF[i] = 1; });
  [I.RL, I.RLS, I.RP, I.RK0, I.RK1, I.RK2, I.POLE].forEach(function (i) { SURF[i] = 3; });

  var PALS = {
    forest: {
      F0: '#0c1c12', F1: '#14301c', F2: '#20482a', F3: '#346038', G0: '#284c24', G1: '#346030',
      A0: '#34343e', A1: '#3c3c48', A2: '#464654', SKID: '#22222a', SKID2: '#2a2a32', CL: '#d8c050', EL: '#d8d8e0',
      SH0: '#6c6458', SH1: '#7c7464', RL: '#c8ccd8', RLS: '#7c8090', RP: '#505464', RK0: '#4c443c', RK1: '#5c5448', RK2: '#726858',
      GUT: '#8c8c94', DROP0: '#060c0a', DROP1: '#0c1a14', CW: '#f0f0f0', CB: '#181818', CR: '#c83030', CWH: '#e8e8e8',
      REF: '#f8f0a0', POLE: '#808090', TR0: '#183820', TR1: '#285030', TR2: '#4c7840', DIRT: '#5c4c38', CRACK: '#2c2c34', BAN: '#c83030', BAN2: '#f8f8f8'
    }
  };
  PALS.fog = PALS.forest;
  PALS.yasha = Object.assign({}, PALS.forest, { F1: '#1c2c24', F2: '#2c4030', F3: '#3c5440', RK1: '#6c6050', RK2: '#847868' });
  PALS.kyudo = Object.assign({}, PALS.forest, { A0: '#3c3a38', A1: '#46423e', A2: '#524c46', G0: '#38502c', G1: '#486038' });
  Course.PALS = PALS;

  // ---------- 中心線 ----------
  Course.build = function (id) {
    if (Course.cache[id]) return Course.cache[id];
    var def = RR.Data.courses[id];
    var pts = [];
    var x = 0, y = 0, psi = 0, s = 0;
    var valleyDef = def.valley || 'R';
    function push(k, side) {
      pts.push({ x: x, y: y, psi: psi, k: k, s: s, side: side });
    }
    push(0, valleyDef);
    def.segs.forEach(function (sg) {
      var t = sg[0];
      if (t === 'S') {
        var n = Math.max(1, Math.round(sg[1] / DS));
        for (var i = 0; i < n; i++) {
          x += Math.sin(psi) * DS; y -= Math.cos(psi) * DS; s += DS;
          push(0, sg[2] || valleyDef);
        }
      } else {
        var ang = sg[1] * Math.PI / 180, r = sg[2];
        var dir = t === 'R' ? 1 : -1;
        var len = ang * r;
        var n2 = Math.max(1, Math.round(len / DS));
        var dpsi = dir * ang / n2, ds = len / n2;
        // 内側が山、外側が谷（指定が無ければ）
        var side = sg[3] || (dir > 0 ? 'L' : 'R');
        for (var j = 0; j < n2; j++) {
          psi += dpsi / 2;
          x += Math.sin(psi) * ds; y -= Math.cos(psi) * ds; s += ds;
          psi += dpsi / 2;
          push(dir / r, side);
        }
      }
    });
    // 曲率をならす（AI用）
    var n = pts.length, ks = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var acc = 0, cnt = 0;
      for (var j = -12; j <= 12; j++) { var q = pts[U.clamp(i + j, 0, n - 1)]; acc += q.k; cnt++; }
      ks[i] = acc / cnt;
    }
    // 範囲
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    pts.forEach(function (p) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
    var M = 40;
    var ox = minX - M, oy = minY - M;
    pts.forEach(function (p) { p.x -= ox; p.y -= oy; });
    var c = {
      id: id, def: def, pts: pts, ks: ks, len: s, width: def.width || 7,
      W: Math.ceil((maxX - minX + M * 2)), H: Math.ceil((maxY - minY + M * 2)),
      startS: 12, finishS: s - 15, grade: def.grade || 0, fog: def.fog || 0,
      pal: PALS[def.pal || 'forest'] || PALS.forest
    };
    rasterize(c);
    Course.cache = {}; // メモリ節約のため直近1コースのみ保持
    Course.cache[id] = c;
    return c;
  };

  // ---------- 最寄り点探索 ----------
  // hint: 前回の index。戻り値 {i, d(符号付き横位置, 右が正), s, tx, ty(接線)}
  Course.locate = function (c, x, y, hint) {
    var pts = c.pts, n = pts.length;
    var best = -1, bd = 1e18;
    var lo = 0, hi = n - 1;
    if (hint != null && hint >= 0) { lo = Math.max(0, hint - 60); hi = Math.min(n - 1, hint + 60); }
    for (var i = lo; i <= hi; i++) {
      var p = pts[i], dx = x - p.x, dy = y - p.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    if (hint != null && (best === lo || best === hi) && lo > 0 && hi < n - 1) return Course.locate(c, x, y, null);
    var p0 = pts[best];
    var tx = Math.sin(p0.psi), ty = -Math.cos(p0.psi);
    var rx = Math.cos(p0.psi), ry = Math.sin(p0.psi);
    var ddx = x - p0.x, ddy = y - p0.y;
    var along = ddx * tx + ddy * ty;
    return { i: best, d: ddx * rx + ddy * ry, s: p0.s + along, tx: tx, ty: ty, rx: rx, ry: ry, side: p0.side, k: p0.k };
  };
  // s の位置（補間）
  Course.at = function (c, s) {
    var i = U.clamp(Math.floor(s / DS), 0, c.pts.length - 1);
    return c.pts[i];
  };
  Course.idx = function (c, s) { return U.clamp(Math.floor(s / DS), 0, c.pts.length - 1); };

  // ---------- ラスタライズ（道路周辺だけを 64x64 のチャンクで持つ） ----------
  var CS = 64, CSH = 6;
  var BGT = null; // 背景（森）の繰り返しテクスチャ 128x128
  function bgTex() {
    if (BGT) return BGT;
    BGT = new Uint8Array(128 * 128);
    for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) BGT[y * 128 + x] = bg(x, y);
    return BGT;
  }
  Course.bgTex = bgTex;
  function rasterize(c) {
    var TW = Math.ceil(c.W * PPM), TH = Math.ceil(c.H * PPM);
    var CW = Math.ceil(TW / CS), CH = Math.ceil(TH / CS);
    var chunks = new Array(CW * CH);
    var cand = {};
    var hw = c.width / 2;
    var R = hw + 9;
    var pts = c.pts, step = 2; // 1m毎
    var i;
    for (i = 0; i < pts.length - step; i += step) {
      var p0 = pts[i], q0 = pts[i + step];
      var cx0 = Math.max(0, Math.floor((Math.min(p0.x, q0.x) - R) * PPM) >> CSH), cx1 = Math.min(CW - 1, Math.ceil((Math.max(p0.x, q0.x) + R) * PPM) >> CSH);
      var cy0 = Math.max(0, Math.floor((Math.min(p0.y, q0.y) - R) * PPM) >> CSH), cy1 = Math.min(CH - 1, Math.ceil((Math.max(p0.y, q0.y) + R) * PPM) >> CSH);
      for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
        var key = cy * CW + cx;
        (cand[key] = cand[key] || []).push(i);
      }
    }
    var dist = new Float32Array(CS * CS), along = new Float32Array(CS * CS), side = new Uint8Array(CS * CS);
    var BG = bgTex();
    c.TW = TW; c.TH = TH; c.CW = CW; c.CH = CH; c.chunks = chunks;
    Object.keys(cand).forEach(function (key) {
      key = +key;
      var ccx = key % CW, ccy = Math.floor(key / CW);
      var bx = ccx * CS, by = ccy * CS;
      dist.fill(1e9);
      cand[key].forEach(function (i) {
        var p = pts[i], q = pts[i + step];
        var sx = q.x - p.x, sy = q.y - p.y, sl = Math.sqrt(sx * sx + sy * sy) || 1;
        var ux = sx / sl, uy = sy / sl;
        var x0 = Math.max(bx, Math.floor((Math.min(p.x, q.x) - R) * PPM)), x1 = Math.min(bx + CS - 1, Math.ceil((Math.max(p.x, q.x) + R) * PPM));
        var y0 = Math.max(by, Math.floor((Math.min(p.y, q.y) - R) * PPM)), y1 = Math.min(by + CS - 1, Math.ceil((Math.max(p.y, q.y) + R) * PPM));
        var sideCode = p.side === 'L' ? 1 : p.side === 'B' ? 3 : p.side === 'N' ? 0 : 2;
        for (var ty = y0; ty <= y1; ty++) {
          var wy = (ty + 0.5) / PPM - p.y;
          var row = (ty - by) * CS - bx;
          for (var tx = x0; tx <= x1; tx++) {
            var wx = (tx + 0.5) / PPM - p.x;
            var t = wx * ux + wy * uy;
            if (t < -0.3 || t > sl + 0.3) continue;
            var d = wx * uy - wy * ux; // 左が正
            var ad = d < 0 ? -d : d;
            var k = row + tx;
            var cur = dist[k];
            if (ad < (cur < 0 ? -cur : cur)) {
              dist[k] = -d; // 右を正に
              along[k] = p.s + t;
              side[k] = sideCode;
            }
          }
        }
      });
      var tex = new Uint8Array(CS * CS);
      classify(c, tex, dist, along, side, bx, by, BG, hw);
      chunks[key] = tex;
    });
    finishCourse(c, hw);
  }
  function classify(c, tex, dist, along, side, bx, by, BG, hw) {
    var hash = U.hash2;
    for (var ly = 0; ly < CS; ly++) {
      var ty2 = by + ly;
      for (var lx = 0; lx < CS; lx++) {
        var tx2 = bx + lx;
        var k2 = ly * CS + lx;
        var dd = dist[k2];
        var v;
        if (dd > 1e8) { tex[k2] = BG[(ty2 & 127) * 128 + (tx2 & 127)]; continue; }
        var a = dd < 0 ? -dd : dd;
        var s = along[k2];
        var sc = side[k2];
        var valleyHere = (dd > 0 && (sc & 2)) || (dd < 0 && (sc & 1));
        var h = hash(tx2, ty2, 3);
        if (a < hw) {
          // 路面
          v = h < 0.33 ? I.A0 : h < 0.8 ? I.A1 : I.A2;
          if (c.def.pal === 'kyudo' && hash(tx2 >> 2, ty2 >> 2, 11) > 0.86 && h > 0.4) v = I.CRACK;
          if (a < 0.09 && !c.def.noCenter && (Math.floor(s / 3) & 1) === 0) v = I.CL;
          if (a > hw - 0.32 && a < hw - 0.14) v = I.EL;
          if (a > hw - 0.32 && a < hw - 0.14 && (Math.floor(s) % 25) === 0) v = I.REF;
          // スタート/ゴール
          if (Math.abs(s - c.startS) < 0.6 || Math.abs(s - c.finishS) < 0.6) {
            var cx = Math.floor((dd + hw) * 2), cy = Math.floor(s * 2);
            v = ((cx + cy) & 1) ? I.CW : I.CB;
          }
        } else if (a < hw + 0.7) {
          v = h < 0.5 ? I.SH0 : I.SH1;
          // ヘアピンは縁石
          if (Math.abs(c.pts[U.clamp(Math.floor(s / DS), 0, c.pts.length - 1)].k) > 1 / 30 && a < hw + 0.6) v = (Math.floor(s) & 1) ? I.CR : I.CWH;
        } else if (valleyHere) {
          if (a < hw + 1.0) v = I.RL;
          else if (a < hw + 1.2) v = I.RLS;
          else if (a < hw + 1.5) v = (Math.floor(s / 2) % 2 === 0 && a < hw + 1.4) ? I.RP : I.DROP1;
          else v = bgDrop(tx2, ty2, a - hw);
        } else {
          // 山側: 側溝 → 岩壁 → 森
          if (a < hw + 1.0) v = I.GUT;
          else if (a < hw + 2.6) { var hr = hash(tx2 >> 1, ty2 >> 1, 5); v = hr < 0.3 ? I.RK0 : hr < 0.75 ? I.RK1 : I.RK2; }
          else v = BG[(ty2 & 127) * 128 + (tx2 & 127)];
        }
        tex[k2] = v;
      }
    }
  }
  function finishCourse(c, hw) {
    // 横断幕（スタート・ゴール）
    banner(c, c.startS + 3);
    banner(c, c.finishS + 3);
    // 街灯（スタート・ゴール付近と所々）: 画面空間で光を足すので位置だけ持つ
    var lamps = [c.startS - 4, c.startS + 20, c.finishS - 10, c.finishS + 6];
    (c.def.lamps || []).forEach(function (s) { lamps.push(s); });
    c.lamps = [];
    lamps.forEach(function (ls, n) {
      var p = Course.at(c, U.clamp(ls, 0, c.len));
      var sgn = (n & 1) ? 1 : -1;
      var lx = p.x + Math.cos(p.psi) * (hw + 1.6) * sgn, ly = p.y + Math.sin(p.psi) * (hw + 1.6) * sgn;
      c.lamps.push({ x: lx, y: ly, r: 15 });
      var tpx = Math.round(lx * PPM), tpy = Math.round(ly * PPM);
      for (var a2 = -1; a2 <= 1; a2++) for (var b2 = -1; b2 <= 1; b2++) setTex(c, tpx + a2, tpy + b2, I.POLE);
    });
  }
  function setTex(c, tx, ty, v) {
    if (tx < 0 || ty < 0 || tx >= c.TW || ty >= c.TH) return;
    var ch = c.chunks[(ty >> CSH) * c.CW + (tx >> CSH)];
    if (ch) ch[(ty & 63) * CS + (tx & 63)] = v;
  }
  function getTex(c, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= c.TW || ty >= c.TH) return BGT[(ty & 127) * 128 + (tx & 127)];
    var ch = c.chunks[(ty >> CSH) * c.CW + (tx >> CSH)];
    return ch ? ch[(ty & 63) * CS + (tx & 63)] : BGT[(ty & 127) * 128 + (tx & 127)];
  }
  Course.getTex = getTex;
  Course.setTex = setTex;
  function bg(x, y) {
    // 森: 大きめの塊でまだらに
    var h = U.hash2(x >> 3, y >> 3, 1), h2 = U.hash2(x >> 1, y >> 1, 2), h3 = U.hash2(x >> 4, y >> 4, 9);
    if (h3 > 0.86) return h2 > 0.5 ? I.G0 : I.G1;
    var v = h * 0.7 + h2 * 0.3;
    if (v > 0.78) return I.F3;
    if (v > 0.55) return I.F2;
    if (v > 0.25) return I.F1;
    return I.F0;
  }
  function bgDrop(x, y, d) {
    // 谷側: 遠い木々のてっぺん（暗い）
    var h = U.hash2(x >> 2, y >> 2, 4);
    if (d < 4) return h > 0.6 ? I.TR1 : I.TR0;
    return h > 0.82 ? I.TR0 : h > 0.4 ? I.DROP1 : I.DROP0;
  }
  function banner(c, s) {
    var p = Course.at(c, s), hw = c.width / 2 + 1.2;
    var rx = Math.cos(p.psi), ry = Math.sin(p.psi);
    for (var t = -hw; t <= hw; t += 0.12) {
      for (var w = 0; w < 0.6; w += 0.12) {
        var x = p.x + rx * t + Math.sin(p.psi) * w, y = p.y + ry * t - Math.cos(p.psi) * w;
        setTex(c, Math.round(x * PPM), Math.round(y * PPM), (Math.floor((t + hw) * 1.5) & 1) ? I.BAN : I.BAN2);
      }
    }
  }

  // ブレーキ痕をテクスチャに直接焼く
  Course.skid = function (c, x, y) {
    var tx = Math.round(x * PPM), ty = Math.round(y * PPM);
    var v = getTex(c, tx, ty);
    if (v === I.A0 || v === I.A1 || v === I.A2 || v === I.CRACK) setTex(c, tx, ty, Math.random() < 0.5 ? I.SKID : I.SKID2);
    else if (v === I.SKID2 && Math.random() < 0.3) setTex(c, tx, ty, I.SKID);
  };
  Course.surfaceAt = function (c, x, y) {
    return SURF[getTex(c, Math.floor(x * PPM), Math.floor(y * PPM))];
  };

  // AI 用の速度計画（μ:グリップ, a:減速度）
  Course.speedPlan = function (c, mu, brakeA) {
    var n = c.pts.length, v = new Float32Array(n), g = 9.81;
    for (var i = 0; i < n; i++) {
      var k = Math.abs(c.ks[i]);
      v[i] = k > 1e-4 ? Math.sqrt(mu * g / k) : 70;
      if (v[i] > 70) v[i] = 70;
    }
    for (i = n - 2; i >= 0; i--) {
      var lim = Math.sqrt(v[i + 1] * v[i + 1] + 2 * brakeA * DS);
      if (v[i] > lim) v[i] = lim;
    }
    return v;
  };
})();
