/* レースシーン: VS演出 → カウントダウン → 走行 → ゴール → リザルト
 * スクリプトからは RR.Race.run('saki1') で呼び、{win, time, ...} を受け取る
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input, C = RR.Course, D = RR.Data;
  var Race = RR.Race = {};
  var COURSE_BGM = { urayama: 'race1', tsuzura: 'race1', hebinose: 'race2', kirigatani: 'race3', yasha: 'race_final', kyudo: 'race3' };

  Race.run = function (id, opt) {
    var cfg = typeof id === 'string' ? Object.assign({ id: id }, D.races[id]) : Object.assign({}, id);
    if (opt) Object.assign(cfg, opt);
    // 検証用: レースを省略して結果だけ反映
    if (RR.DEBUG && RR.Debug && RR.Debug.fakeRace) {
      var win = RR.Debug.fakeRace === 'win', S = RR.State.S;
      var money = win ? (cfg.stake || 0) + (cfg.prize || 0) : -Math.min(cfg.stake || 0, S.money);
      RR.State.addMoney(money);
      if (cfg.rival) { var rec = D.record(cfg.rival); if (win) rec.w++; else rec.l++; }
      S.stats.races++; if (win) S.stats.wins++;
      RR.Debug.log.push('  [レース] ' + cfg.id + ' → ' + (win ? 'かち' : 'まけ') + ' ' + money);
      return Promise.resolve({ win: win, time: 60000, money: money, wear: {} });
    }
    RR.Audio.sfx('swoosh');
    RR.Audio.stopBgm(0.4);
    var scene = Object.create(RaceScene);
    return RR.FX.cover('race', 26).then(function () {
      return RR.wait(2);
    }).then(function () {
      var p = RR.Scene.push(scene, cfg);
      RR.FX.uncover(20);
      return p;
    }).then(function (result) {
      if (RR.Field) RR.Field.restoreAudio();
      return RR.FX.fadeIn(16).then(function () { return result; });
    });
  };

  Race.debugStart = function () {
    var cfg = Object.assign({ id: 'debug' }, D.races[(/race=([a-z_0-9]+)/.exec(location.hash) || [])[1] || 'saki1']);
    var scene = Object.create(RaceScene);
    RR.Scene.set(scene, cfg);
  };

  var RaceScene = {
    opaque: true,
    enter: function (cfg) {
      var S = RR.State.S;
      this.cfg = cfg;
      this.course = C.build(cfg.course);
      var c = this.course;
      this.state = 'intro'; this.t = 0; this.time = 0;
      var st = RR.Settings.data;
      this.mt = !!st.mt;
      var assist = st.assist == null ? 2 : st.assist;
      var carData = D.currentCar();
      this.carData = carData;
      var spec = D.specOf(carData);
      var p0 = C.at(c, c.startS - 3);
      var rx = Math.cos(p0.psi), ry = Math.sin(p0.psi);
      var solo = !cfg.rival;
      var lane = solo ? 0 : -1.7;
      this.player = new RR.Phys.Car(spec, { x: p0.x + rx * lane, y: p0.y + ry * lane, psi: p0.psi, mt: this.mt, assist: [0, 0.6, 1][assist], tcs: [0.15, 0.55, 0.9][assist] });
      this.player.lightsOn = true; this.player.player = true;
      this.pSpr = RR.Sprites.carTop(carData.model, carData.color, 1, carData.dirt);
      this.rival = null;
      if (!solo) {
        var rv = D.rivals[cfg.rival];
        this.rv = rv;
        var rspec = D.rivalSpec(rv);
        var rc = new RR.Phys.Car(rspec, { x: p0.x - rx * lane, y: p0.y - ry * lane, psi: p0.psi, tcs: 0.9, assist: 1 });
        rc.lightsOn = true;
        this.rival = { car: rc, ai: new RR.AI(rc, c, { skill: rv.skill * (cfg.skillMul || 1), line: rv.line, wobble: rv.wobble, aggr: rv.aggr }) };
        this.rSpr = RR.Sprites.carTop(rv.car.model, rv.car.color, 1, 0);
      }
      this.view = { x: this.player.x, y: this.player.y, ang: p0.psi, k: 4.3, amb: 0.2, cars: [] };
      this.parts = [];
      this.thrIn = 0; this.brkIn = 0; this.stIn = 0;
      this.finish = null;
      this.bgm = cfg.bgm || COURSE_BGM[cfg.course] || 'race1';
      this.eng = null; this.reng = null;
      this.best = S && S.best[cfg.course];
      this.msg = null;
      RR.Audio.ambient(c.fog ? 'fog' : 'pass');
    },
    exit: function () {
      if (this.eng) this.eng.stop();
      if (this.reng) this.reng.stop();
      this.eng = this.reng = null;
    },

    update: function (dt) {
      this.t++;
      if (RR.UI.busy()) { this.quietEngines(); return; } // ポーズ中はアイドリングの音だけにする
      this.muted = false;
      var self = this;
      // デモは何か押すか一定時間で終了
      if (this.cfg.demo && !this.demoEnd && ((this.state !== 'intro' && In.anyPressed()) || (this.state === 'run' && this.time > 32) || this.state === 'goal')) {
        this.demoEnd = true;
        RR.FX.fadeOut(30).then(function () { RR.Scene.pop({ demo: true }); });
      }
      if (this.state === 'intro') {
        if (this.t === 1) RR.Audio.sfx('banner');
        if (this.t > 30 && (In.pressed('a') || this.t > (this.cfg.demo ? 120 : 200))) { this.state = 'count'; this.t = 0; RR.Audio.sfx('ok'); this.startEngines(); }
        return;
      }
      if (this.state === 'count') {
        this.readInput(dt);
        this.player.rpm = U.lerp(this.player.rpm, this.player.sp.idle + this.thrIn * 5200, 0.15);
        if (this.rival) this.rival.car.rpm = U.lerp(this.rival.car.rpm, 1500 + Math.sin(this.t * 0.3) * 800 + 1200, 0.1);
        if (this.t === 40 || this.t === 80 || this.t === 120) RR.Audio.sfx('beep');
        if (this.t === 160) {
          RR.Audio.sfx('go'); this.state = 'run'; this.t = 0; RR.Audio.bgm(this.bgm);
          if (this.rival) this.rival.ai.started = true;
          this.autoDrive = RR.DEBUG && RR.Debug && RR.Debug.autoDrive;
          if (this.cfg.demo || this.autoDrive) { this.autopilot = new RR.AI(this.player, this.course, { skill: 0.93 }); this.autopilot.started = true; }
        }
        this.sound();
        this.camera(dt);
        return;
      }
      if (this.state === 'result') {
        if (this.t > 40 && In.pressed('a')) { RR.Audio.sfx('ok'); this.state = 'done'; this.end(); }
        return;
      }
      if (this.state === 'done') return;
      if (this.state === 'run' && In.pressed('start')) {
        RR.Audio.sfx('open');
        RR.UI.choice(['つづける', 'リタイア'], { x: 84, y: 60 }).then(function (i) {
          if (i === 1) { self.result(false, true); }
        });
        return;
      }
      // 走行
      if (this.state === 'run') this.time += dt;
      this.readInput(dt);
      var inp = { thr: this.thrIn, brk: this.brkIn, steer: this.stIn, up: this.mt && In.pressed('r'), down: this.mt && In.pressed('l') };
      if ((this.state === 'goal' || this.cfg.demo || this.autoDrive) && this.autopilot) inp = this.autopilot.control(1 / 120);
      var c = this.course;
      for (var sub = 0; sub < 2; sub++) {
        this.player.step(1 / 120, inp, c);
        inp.up = inp.down = false;
        this.handleEvents(this.player, true);
        if (this.rival) {
          var rc = this.rival.car;
          this.rubberBand();
          rc.step(1 / 120, this.rival.ai.control(1 / 120), c);
          this.handleEvents(rc, false);
          var hit = RR.Phys.collideCars(this.player, rc);
          if (hit && hit > 1.5 && !this.carHitT) { RR.Audio.sfx(hit > 5 ? 'crash' : 'scrape'); this.carHitT = 20; if (hit > 5) RR.FX.shake(2, 8); }
        }
        if (this.state === 'goal' && this.autopilot && this.player.u < 2) { this.player.u = U.approach(this.player.u, 0, 0.2); }
      }
      if (this.carHitT) this.carHitT--;
      this.effects(this.player); if (this.rival) this.effects(this.rival.car);
      this.updateParticles(dt);
      this.sound();
      this.camera(dt);
      this.checkFinish();
      if (this.state === 'goal' && this.t > 150) { this.state = 'result'; this.t = 0; this.stopEngines(); }
      if (this.msgT > 0) this.msgT--;
    },

    readInput: function (dt) {
      var a = In.held('a'), b = In.held('b');
      this.thrIn = U.approach(this.thrIn, a ? 1 : 0, a ? dt * 6 : dt * 12);
      this.brkIn = U.approach(this.brkIn, b ? 1 : 0, b ? dt * 9 : dt * 14);
      var st = (In.held('right') ? 1 : 0) - (In.held('left') ? 1 : 0);
      var rate = st !== 0 ? (U.sign(st) !== U.sign(this.stIn) && this.stIn !== 0 ? dt * 10 : dt * 5) : dt * 9;
      this.stIn = U.approach(this.stIn, st, rate);
    },
    rubberBand: function () {
      // ゴール後は ゆっくり 速度を落とす
      if (this.state !== 'run') { this.rival.ai.pace = Math.max(0.45, this.rival.ai.pace - 0.004); return; }
      var gap = this.rival.car.s - this.player.s; // 正=相手が前
      var p = 1;
      if (gap > 30) p = 1 - Math.min(0.05, (gap - 30) / 2000);
      else if (gap < -30) p = 1 + Math.min(0.03, (-gap - 30) / 3000);
      this.rival.ai.pace = p;
    },
    startEngines: function () {
      this.eng = RR.Audio.engine(1, 0);
      if (this.rival) this.reng = RR.Audio.engine(0.5, 0.3);
      RR.Audio.sfx('starter');
    },
    stopEngines: function () {
      if (this.eng) this.eng.stop();
      if (this.reng) this.reng.stop();
      this.eng = this.reng = null;
    },
    quietEngines: function () {
      if (this.muted) return;
      this.muted = true;
      if (this.eng) { this.eng.setVol(0.4); this.eng.update(this.player.sp.idle, 0, 0, 0, 0); }
      if (this.reng) { this.reng.setVol(0); this.reng.update(900, 0, 0, 0, 0); }
    },
    sound: function () {
      var p = this.player;
      if (this.eng) this.eng.setVol(1);
      if (this.eng) this.eng.update(p.rpm, p.thr, p.slipTotal * (p.u > 3 ? 1 : 0), p.speed(), p.boost * (p.sp.turbo > 0 ? 1 : 0));
      if (this.reng && this.rival) {
        var rc = this.rival.car;
        var d = U.dist(p.x, p.y, rc.x, rc.y);
        this.reng.setVol(U.clamp(1 - d / 70, 0, 1) * 0.55);
        this.reng.update(rc.rpm, rc.thr, rc.slipTotal * 0.6, rc.speed(), 0);
      }
    },
    handleEvents: function (car, isPlayer) {
      var self = this;
      car.events.forEach(function (e) {
        if (e === 'shift' && isPlayer) RR.Audio.sfx('shift');
        else if (e === 'overrev' && isPlayer) RR.Audio.sfx('error');
        else if (e === 'crash' || e === 'scrape') {
          if (isPlayer || U.dist(self.player.x, self.player.y, car.x, car.y) < 30) {
            RR.Audio.sfx(e);
            if (e === 'crash' && isPlayer && RR.Settings.data.shake !== false) RR.FX.shake(3, 10);
          }
          for (var i = 0; i < 6; i++) self.spawn('spark', car.x + (Math.random() - 0.5) * 3, car.y + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 0.3, 0, 0);
        }
      });
    },
    effects: function (car) {
      var c = this.course;
      var fx = Math.sin(car.psi), fy = -Math.cos(car.psi), rx = Math.cos(car.psi), ry = Math.sin(car.psi);
      var sp = car.sp;
      var WP = [[sp.a, -sp.tw / 2], [sp.a, sp.tw / 2], [-(sp.L - sp.a), -sp.tw / 2], [-(sp.L - sp.a), sp.tw / 2]];
      for (var i = 0; i < 4; i++) {
        var wx = car.x + fx * WP[i][0] + rx * WP[i][1], wy = car.y + fy * WP[i][0] + ry * WP[i][1];
        if (car.slide[i] > 0.65 && car.speed() > 4) {
          C.skid(c, wx, wy);
          if (i >= 2 && (RR.Game.frame + i) % 3 === 0) this.spawn('smoke', wx, wy, (Math.random() - 0.5) * 2 - fx * 2, (Math.random() - 0.5) * 2 - fy * 2, 0.9 + car.slide[i] * 0.5, 1, 5);
        }
        if (car.surf[i] >= 2 && car.speed() > 5 && RR.Game.frame % 4 === i) this.spawn('dust', wx, wy, -fx * 3, -fy * 3, 0.8, 1, 4);
      }
    },
    spawn: function (kind, x, y, vx, vy, life, r0, r1) {
      if (this.parts.length > 140) this.parts.shift();
      this.parts.push({ kind: kind, x: x, y: y, vx: vx, vy: vy, t: 0, life: life, r0: r0, r1: r1 });
    },
    updateParticles: function (dt) {
      this.parts = this.parts.filter(function (p) {
        p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
        return p.t < p.life;
      });
    },
    camera: function (dt) {
      var p = this.player, v = this.view;
      var beta = U.clamp(Math.atan2(p.v, Math.max(Math.abs(p.u), 3)), -0.7, 0.7);
      var target = p.psi + (p.speed() > 3 ? beta * 0.5 : 0);
      v.ang += U.wrapAngle(target - v.ang) * Math.min(1, dt * 4);
      var kt = U.lerp(4.3, 3.0, U.clamp(p.speed() / 38, 0, 1));
      v.k += (kt - v.k) * Math.min(1, dt * 1.5);
      v.x = p.x; v.y = p.y;
      // 夜明け（最終戦は進むほど空が白む）
      var c = this.course;
      var prog = U.clamp((p.s - c.startS) / (c.finishS - c.startS), 0, 1);
      if (c.def.dawn) {
        v.amb = U.lerp(0.2, 0.62, U.smooth(prog * 1.1 - 0.1));
        v.tint = [U.lerp(0.55, 1.1, prog), U.lerp(0.65, 0.85, prog), U.lerp(1.15, 0.95, prog)];
        v.tint = v.tint.map(function (x) { return Math.round(x * 10) / 10; });
      } else { v.amb = c.fog ? 0.24 : 0.2; v.tint = null; }
    },
    checkFinish: function () {
      if (this.state !== 'run') return;
      var c = this.course;
      var pf = this.player.s >= c.finishS;
      var rf = this.rival && this.rival.car.s >= c.finishS;
      if (pf || rf) {
        this.rivalTime = rf ? this.time : null;
        if (pf && !rf) this.result(true);
        else if (rf && !pf) this.result(false);
        else this.result(this.player.s >= this.rival.car.s);
        return;
      }
      if (!this.rival && this.cfg.target && this.time * 1000 > this.cfg.target + 20000) { this.msg = 'じかん ぎれ'; this.result(false); return; }
      if (this.rival && this.rival.car.s - this.player.s > 320) { this.msg = 'ひきはなされた...'; this.result(false); }
    },
    result: function (win, retire) {
      var cfg = this.cfg;
      if (!this.rival && cfg.target && !retire) win = win && this.time * 1000 <= cfg.target;
      this.win = !!win; this.retire = !!retire;
      this.state = retire ? 'result' : 'goal'; this.t = 0;
      this.finishTime = this.time;
      this.autopilot = new RR.AI(this.player, this.course, { skill: 0.5 });
      this.autopilot.started = true;
      this.autopilot.pace = 0.6;
      if (retire) this.stopEngines();
      RR.Audio.stopBgm(0.6);
      if (!retire) {
        RR.FX.flash(10, this.win ? '#fff8d0' : '#ff4040');
        RR.Audio.sfx(this.win ? 'trophy' : 'lose');
      }
      // 結果の確定（お金・耐久度・記録）
      var S = RR.State.S, cd = this.carData;
      var finished = !this.retire && this.player.s >= this.course.finishS;
      var res = { win: this.win, retire: this.retire, time: finished ? Math.round(this.finishTime * 1000) : null, money: 0, newBest: false, wear: {} };
      if (S) {
        var stake = cfg.stake || 0;
        if (this.win) res.money = stake + (cfg.prize || 0);
        else res.money = -Math.min(stake, S.money);
        RR.State.addMoney(res.money);
        if (!this.retire && this.win && (!S.best[cfg.course] || res.time < S.best[cfg.course])) { S.best[cfg.course] = res.time; res.newBest = true; }
        var w = this.player.wear;
        res.wear = D.applyWear(cd, w);
        cd.dirt = Math.min(100, (cd.dirt || 0) + 6 + Math.round(this.player.offT * 3) + this.player.hits);
        S.stats.races++;
        if (this.win) S.stats.wins++;
        if (cfg.rival) { var rec = D.record(cfg.rival); if (this.win) rec.w++; else rec.l++; }
      }
      this.res = res;
    },
    end: function () {
      var self = this;
      if (this.eng) this.eng.stop();
      if (this.reng) this.reng.stop();
      this.eng = this.reng = null;
      RR.FX.fadeOut(16).then(function () {
        RR.Audio.ambient(null);
        RR.Scene.pop(self.res);
      });
    },

    // ---------- 描画 ----------
    draw: function (g) {
      var v = this.view, c = this.course;
      v.cars = [this.player]; if (this.rival) v.cars.push(this.rival.car);
      RR.RaceRender.draw(g, c, v);
      RR.RaceRender.drawParticles(g, v, this.parts.filter(function (p) { return p.kind !== 'smoke'; }));
      if (this.rival) RR.RaceRender.drawCar(g, v, this.rival.car, this.rSpr, { brake: this.rival.car.brk > 0.2, lights: true });
      RR.RaceRender.drawCar(g, v, this.player, this.pSpr, { brake: this.player.brk > 0.2, lights: true });
      RR.RaceRender.drawParticles(g, v, this.parts.filter(function (p) { return p.kind === 'smoke'; }));
      if (this.state === 'intro') { this.drawIntro(g); return; }
      RR.RaceHUD.draw(g, this);
      if (this.state === 'count') this.drawCount(g);
      if (this.state === 'run' && this.t < 50) bigText(g, 'GO!', 120, 62, '#78f878', 3, this.t);
      if (this.state === 'goal') this.drawGoal(g);
      if (this.state === 'result' || this.state === 'done') this.drawResult(g);
    },
    drawIntro: function (g) {
      var t = this.t, cfg = this.cfg, c = this.course;
      g.fillStyle = 'rgba(0,0,10,0.55)'; g.fillRect(0, 0, 240, 160);
      var s = U.easeOut(Math.min(1, t / 20));
      // 上: 自分
      var S = RR.State.S, cd = this.carData;
      var x1 = U.lerp(-240, 0, s), x2 = U.lerp(240, 0, s);
      g.fillStyle = '#802020'; g.fillRect(x1, 18, 240, 48);
      g.fillStyle = '#c03030'; g.fillRect(x1, 18, 240, 2);
      g.drawImage(RR.Sprites.carSide(cd.model, cd.color, cd.dirt), Math.round(x1 + 12), 30);
      F.draw(g, S ? S.name : 'YOU', x1 + 88, 26, '#f8f8f8', { scale: 2 });
      F.draw(g, D.cars[cd.model].name + '  LV ' + D.rating(cd), x1 + 88, 48, '#f8d8d0');
      if (this.rival) {
        var rv = this.rv;
        g.fillStyle = '#202880'; g.fillRect(x2, 92, 240, 48);
        g.fillStyle = '#3040c0'; g.fillRect(x2, 92, 240, 2);
        var side = RR.Painter.flipX(RR.Sprites.carSide(rv.car.model, rv.car.color, 0), 0, 0, 66, 28);
        g.drawImage(side, Math.round(x2 + 162), 104);
        F.draw(g, rv.name, x2 + 12, 100, '#f8f8f8', { scale: 2 });
        F.draw(g, D.cars[rv.car.model].name + '  LV ' + D.rivalRating(cfg.rival), x2 + 12, 122, '#d0d8f8');
      } else {
        g.fillStyle = '#204830'; g.fillRect(x2, 92, 240, 48);
        F.draw(g, 'タイムアタック', x2 + 12, 100, '#f8f8f8', { scale: 2 });
        F.draw(g, 'もくひょう ' + U.time(cfg.target), x2 + 12, 122, '#d0f8d8');
      }
      if (t > 16) {
        var pop = U.easeOutBack(Math.min(1, (t - 16) / 14));
        bigText(g, this.rival ? 'VS' : 'TA', 120, 66 + (1 - pop) * 6, '#f8e060', 3, 99);
      }
      // 下部: コース情報
      g.fillStyle = '#000'; g.fillRect(0, 142, 240, 18);
      var info = c.def.name + '  ' + c.def.kind + ' ' + (Math.round((c.finishS - c.startS) / 100) / 10) + 'KM';
      F.draw(g, info, 6, 146, '#f8f8f8');
      var stake = cfg.stake ? 'かけきん ¥' + U.money(cfg.stake) : (cfg.prize ? 'しょうきん ¥' + U.money(cfg.prize) : '');
      F.draw(g, stake, 234, 146, '#f8e060', { align: 'right' });
      F.draw(g, cfg.title || '', 120, 4, '#f8f8f8', { align: 'center' });
      if (t > 40 && (t >> 4) & 1) F.draw(g, 'A: スタート', 120, 80, '#ffffff', { align: 'center' });
    },
    drawCount: function (g) {
      var t = this.t;
      var n = t < 40 ? 0 : t < 80 ? 1 : t < 120 ? 2 : 3;
      var x = 96, y = 50;
      RR.RaceHUD.box(g, x - 4, y - 4, 56, 20);
      for (var i = 0; i < 3; i++) {
        var on = n > i;
        var col = n >= 3 ? '#40f060' : on ? '#f83828' : '#401818';
        g.fillStyle = '#101010'; g.fillRect(x + i * 17, y, 14, 12);
        g.fillStyle = col; g.fillRect(x + i * 17 + 2, y + 2, 10, 8);
        if (on || n >= 3) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + i * 17 + 3, y + 3, 3, 2); }
      }
      if (t >= 40) bigText(g, String(3 - Math.min(2, Math.floor((t - 40) / 40))), 120, 76, '#f8f8f8', 3, (t - 40) % 40);
      if (t < 40) F.draw(g, 'Aで エンジンを ふかせる', 120, 120, '#d0d8f8', { align: 'center' });
      // そうさの せつめい
      RR.RaceHUD.box(g, 48, 130, 178, 26);
      F.draw(g, 'A:アクセル  B:ブレーキ  ←→:ハンドル', 137, 133, '#f8f8f8', { align: 'center' });
      F.draw(g, (this.mt ? 'L/R:シフト  ' : '') + 'START:ポーズ', 137, 145, '#a8b0d0', { align: 'center' });
    },
    drawGoal: function (g) {
      var t = this.t;
      if (this.retire) return;
      bigText(g, this.win ? 'WIN!' : 'LOSE', 120, 56, this.win ? '#f8e060' : '#f86858', 3, t);
      F.draw(g, this.msg || (this.win ? 'ゴール!' : 'まけた...'), 120, 92, '#f8f8f8', { align: 'center' });
    },
    drawResult: function (g) {
      var r = this.res, cfg = this.cfg, c = this.course;
      var t = this.t;
      var s = U.easeOut(Math.min(1, t / 14));
      var y = Math.round(U.lerp(170, 26, s));
      RR.UI.win(g, 24, y, 192, 112, r.win ? 'blue' : 'red');
      F.draw(g, r.retire ? 'リタイア' : r.win ? 'しょうり!' : 'はいぼく', 120, y + 6, r.win ? '#f8e060' : '#f8b0a0', { align: 'center', scale: 2 });
      var ly = y + 30;
      function line(label, val, col) { F.draw(g, label, 34, ly, '#c8d0f0'); F.draw(g, val, 206, ly, col || '#f8f8f8', { align: 'right' }); ly += 12; }
      line(c.def.name, '');
      line('タイム', r.time ? U.time(r.time) : '-');
      if (this.rival) line(this.rv.name + ' の タイム', this.rivalTime ? U.time(this.rivalTime * 1000) : '-');
      else if (cfg.target) line('もくひょう', U.time(cfg.target));
      line('ベスト', U.time(RR.State.S && RR.State.S.best[cfg.course]), r.newBest && (t >> 3) & 1 ? '#f8e060' : '#f8f8f8');
      if (r.money) line(r.money > 0 ? 'てにいれた おかね' : 'はらった おかね', (r.money > 0 ? '+¥' : '-¥') + U.money(Math.abs(r.money)), r.money > 0 ? '#f8e060' : '#f88878');
      // 一番減ったパーツ
      var worst = null;
      for (var k in r.wear) if (!worst || r.wear[k] > r.wear[worst]) worst = k;
      if (worst && r.wear[worst] > 0.5) line(D.SLOT_NAMES[worst] + ' の たいきゅう', '-' + Math.round(r.wear[worst]) + '%', '#f8c078');
      if (t > 40 && (t >> 4) & 1) F.draw(g, '▼', 202, y + 100, '#f8e060');
    }
  };

  Race._scene = RaceScene;

  // 大きな文字（縁取り付き）
  function bigText(g, text, x, y, col, scale, t) {
    var pop = t != null && t >= 0 && t < 8 ? 1 + (8 - t) * 0.08 : 1;
    var sc = Math.max(1, Math.round(scale * pop));
    var w = F.measure(text, sc);
    var x0 = Math.round(x - w / 2), y0 = Math.round(y - 4 * sc);
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) if (dx || dy) F.draw(g, text, x0 + dx * sc, y0 + dy * sc, '#101018', { scale: sc, shadow: null });
    F.draw(g, text, x0, y0, col, { scale: sc, shadow: null });
  }
  Race.bigText = bigText;
})();
