/* エンディング（夜明けのヤシャ岳 → その後の人々 → クレジット）とゲームオーバー
 * クレジットは「PRODUCED BY 天上 和哉」の一文のみ
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input;

  // ---- 3D: 夜明けのヤシャ岳に愛車が停まっている ----
  function makeEndWorld() {
    var C = RR.Course, D = RR.Data;
    var course = C.build('yasha');
    var carData = (D.currentCar && D.currentCar()) || { model: 'comet', color: 'red', dirt: 0 };
    var spec = D.specOf(carData);
    var p = C.at(course, course.finishS - 36);
    var car = new RR.Phys.Car(spec, { x: p.x + Math.cos(p.psi) * 1.2, y: p.y + Math.sin(p.psi) * 1.2, psi: p.psi, assist: 0, tcs: 0 });
    var loc = C.locate(course, car.x, car.y, null);
    car.s = loc.s; car.idx = loc.i;
    var R = { carData: { model: carData.model, color: carData.color, dirt: 0 }, player: car, rival: null, view: { ang: p.psi }, parts: [], state: 'ending', t: 0, course: course, skyProg: 0.5 };
    var w = { course: course, car: car, R: R, e: RR.Race3D.elevAt(course, car.s) };
    R.camFn = function (pos, look, cam) {
      var t = w.t || 0;
      var a = -0.5 + t * 0.0016;
      var d = 9.5 - Math.min(3, t * 0.003);
      pos.set(car.x - Math.cos(a) * d, w.e + 1.1 + t * 0.0004, car.y + Math.sin(a) * d - 2);
      look.set(car.x, w.e + 0.9, car.y);
      cam.fov = 40;
    };
    w.r3 = RR.Race3D.create(course, R);
    return w;
  }
  // 3D: その後の人々の立ち姿
  var pplScene = null, pplCam = null, pplModel = null, pplKey = '';
  function personShot(look, t) {
    var T = window.THREE;
    if (!pplScene) {
      pplScene = new T.Scene();
      pplScene.background = new T.Color(0x182038);
      pplScene.add(new T.HemisphereLight(0xc8d8ff, 0x403040, 0.9));
      var dl = new T.DirectionalLight(0xffe0b0, 0.9); dl.position.set(2, 4, 5); pplScene.add(dl);
      var back = new T.PointLight(0x6080ff, 0.8, 12); back.position.set(-3, 2.5, -2); pplScene.add(back);
      var floor = new T.Mesh(new T.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ color: 0x28304c }));
      pplScene.add(floor);
      pplCam = new T.PerspectiveCamera(26, 1.6, 0.1, 40);
    }
    if (pplKey !== look) {
      if (pplModel) pplScene.remove(pplModel.root);
      pplModel = RR.People3D.create(RR.Looks[look]);
      pplModel.root.scale.setScalar(1.35);
      pplScene.add(pplModel.root);
      pplKey = look;
    }
    pplModel.targetYaw = Math.sin(t * 0.02) * 0.5;
    pplModel.yaw += (pplModel.targetYaw - pplModel.yaw) * 0.1;
    pplModel.root.rotation.y = pplModel.yaw;
    pplModel.walk(1 / 60, false, 1);
    pplModel.root.rotation.y = pplModel.yaw = Math.sin(t * 0.02) * 0.5;
    pplCam.aspect = RR.GL.aspect();
    pplCam.position.set(0, 1.5, 6.2); pplCam.lookAt(0, 1.25, 0);
    pplCam.updateProjectionMatrix();
    RR.GL.render(pplScene, pplCam);
  }
  var blackScene = null;
  function blackShot() {
    var T = window.THREE;
    if (!blackScene) { blackScene = new T.Scene(); blackScene.background = new T.Color(0x000000); }
    RR.GL.render(blackScene, new T.PerspectiveCamera(30, 1, 0.1, 10));
  }

  // ---- その後の人々 ----
  function epilogue() {
    var S = RR.State.S;
    var list = [
      { look: 'tetsu', name: 'テツ', text: 'ガレージの シャッターは きょうも あいている。' },
      { look: 'mio', name: 'ミオ', text: 'スタンドの バイトは つづけている らしい。' },
      { look: 'kenta', name: 'ケンタ', text: 'コンビニの まえで こんどは じぶんが おしえる がわに なった。' },
      { look: 'saki', name: 'サキ', text: 'ツヅラの ヘアピンで あたらしい ラインを ためしている。' },
      { look: 'gou', name: 'ゴウ', text: 'ターボの おとが ヘビノセに ひびく。' },
      { look: 'shinobu', name: 'シノブ', text: S && S.flags.shinobu_quest ? 'きりの よるには ときどき ガレージに かおを だす。' : 'きりの たにで いまも ひとりで はしっている。' },
      { look: 'kurosawa', name: 'クロサワ', text: 'ヤシャの ちょうじょうで ときどき よあけを みている。' }
    ];
    return list;
  }

  var EndScene = {
    opaque: true,
    enter: function () {
      this.t = 0; this.phase = 0; this.pt = 0;
      this.people = epilogue();
      this.idx = 0;
      this.world = makeEndWorld();
      RR.Audio.bgm('ending');
      RR.Audio.ambient('pass');
      RR.FX.fade = 1; RR.FX.fadeIn(60, '#fff');
      this.lines = [
        'ヤシャの やまに あさひが のぼる。',
        'ガレージは まもられた。',
        'よるは おわり また つぎの よるが くる。',
        'とうげの ひかりは きえない。'
      ];
    },
    exit: function () { if (this.world) { this.world.r3.dispose(); this.world = null; } },
    update: function () {
      this.t++; this.pt++;
      if (this.world && this.phase === 0) { this.world.t = this.pt; this.world.R.t = this.pt; this.world.R.skyProg = Math.min(1, 0.5 + this.pt / 520); }
      var fast = In.held('a') ? 2 : 1;
      this.pt += fast - 1;
      if (this.phase === 0 && this.pt > 260) { this.next(); }
      else if (this.phase === 1 && this.pt > 200) { this.pt = 0; this.idx++; if (this.idx >= this.people.length) this.next(); }
      else if (this.phase === 2 && this.pt > 520) { this.next(); }
    },
    next: function () {
      var self = this;
      if (this.busy) return;
      this.busy = true;
      RR.FX.fadeOut(40).then(function () {
        self.phase++; self.pt = 0; self.idx = Math.min(self.idx, self.people.length - 1);
        self.busy = false;
        if (self.phase >= 3) { RR.Scene.pop(true); return; }
        if (self.phase === 2) RR.Audio.stopBgm(4);
        RR.FX.fadeIn(40);
      });
    },
    draw3d: function () {
      if (this.phase === 0 && this.world) { this.world.r3.update(this.world.R, 1 / 60); this.world.r3.render(); }
      else if (this.phase === 1) personShot(this.people[Math.min(this.idx, this.people.length - 1)].look, this.t);
      else blackShot();
    },
    draw: function (g) {
      var t = this.t, sc = RR.UI.screen();
      if (this.phase === 0) {
        var gt = g.createLinearGradient(0, sc.y, 0, sc.y + 60);
        gt.addColorStop(0, 'rgba(40,20,60,0.5)'); gt.addColorStop(1, 'rgba(40,20,60,0)');
        g.fillStyle = gt; g.fillRect(sc.x, sc.y, sc.w, 60);
        var li = Math.min(this.lines.length - 1, Math.floor(this.pt / 65));
        var a0 = U.clamp(Math.min((this.pt - li * 65) / 12, (65 - (this.pt - li * 65)) / 12 + 0.6), 0, 1);
        g.globalAlpha = a0;
        F.draw(g, this.lines[li], 120, sc.y + 16, '#ffffff', { align: 'center', scale: 1.3, shadow: '#5c3050' });
        g.globalAlpha = 1;
      } else if (this.phase === 1) {
        var p = this.people[Math.min(this.idx, this.people.length - 1)];
        var a = U.clamp(Math.min(this.pt / 20, (200 - this.pt) / 20), 0, 1);
        var by = sc.y + sc.h - 54;
        var gb = g.createLinearGradient(0, by - 10, 0, sc.y + sc.h);
        gb.addColorStop(0, 'rgba(0,0,10,0)'); gb.addColorStop(0.3, 'rgba(0,0,10,0.7)'); gb.addColorStop(1, 'rgba(0,0,10,0.85)');
        g.fillStyle = gb; g.fillRect(sc.x, by - 10, sc.w, 64);
        g.globalAlpha = a;
        F.draw(g, p.name, 120, by, '#f8e060', { align: 'center', scale: 1.4 });
        var lines = F.wrap(p.text, 220);
        lines.forEach(function (l, i) { F.draw(g, l, 120, by + 16 + i * 12, '#f8f8f8', { align: 'center' }); });
        g.globalAlpha = 1;
      } else if (this.phase === 2) {
        var al = U.clamp(this.pt / 90, 0, 1) * U.clamp((520 - this.pt) / 60, 0, 1);
        g.globalAlpha = al;
        F.draw(g, 'PRODUCED BY', 120, 52, '#d0d0e0', { align: 'center', shadow: null, scale: 1.2 });
        F.draw(g, '天上 和哉', 120, 72, '#f8f8f8', { align: 'center', scale: 2.4, shadow: null });
        g.globalAlpha = 1;
      }
    }
  };

  RR.Ending = {
    _scene: EndScene,
    play: function () {
      return RR.FX.fadeOut(60, '#fff').then(function () {
        RR.Audio.stopBgm(1);
        return RR.Scene.push(Object.create(EndScene));
      }).then(function () {
        RR.FX.fade = 1;
        RR.FX.fadeColor = '#000';
      });
    }
  };

  // ---------- ゲームオーバー ----------
  var GOScene = {
    opaque: true,
    enter: function (text) {
      this.t = 0; this.text = text || ''; this.sel = 0;
      RR.Audio.bgm('sad');
      RR.Audio.ambient('none');
      RR.FX.fade = 1; RR.FX.fadeIn(40);
    },
    update: function () {
      this.t++;
      if (this.t < 90 || this.done) return;
      if (In.repeat('up') || In.repeat('down')) { this.sel = 1 - this.sel; RR.Audio.sfx('cursor'); }
      if (In.pressed('a')) {
        RR.Audio.sfx('ok');
        this.done = true;
        var sel = this.sel, slot = RR.State.slot;
        RR.FX.fadeOut(40).then(function () {
          RR.Scene.stack.length = 0;
          if (sel === 0 && RR.State.load(slot)) RR.Scene.set(RR.Field);
          else RR.Scene.set(RR.Title, { menu: true });
        });
      }
    },
    draw: function (g) {
      var sc = RR.UI.screen();
      g.fillStyle = '#100408'; g.fillRect(sc.x, sc.y, sc.w, sc.h);
      for (var y = sc.y; y < sc.y + sc.h; y += 2) { g.fillStyle = 'rgba(80,0,20,' + (0.15 + 0.1 * Math.sin(y * 0.1 + this.t * 0.02)) + ')'; g.fillRect(sc.x, y, sc.w, 1); }
      RR.Race.bigText(g, 'GAME OVER', 120, 46, '#f86858', 2.6, this.t);
      var lines = [];
      this.text.split('|').forEach(function (t) { lines = lines.concat(F.wrap(t, 220)); });
      lines.forEach(function (l, i) { F.draw(g, l, 120, 70 + i * 12, '#f0d0d0', { align: 'center' }); });
      if (this.t >= 90) {
        ['さいごの きろくから', 'タイトルへ'].forEach(function (s, i) {
          F.draw(g, s, 100, 116 + i * 14, '#f8f8f8');
          if (i === this.sel) RR.UI.cursor(g, 86, 116 + i * 14);
        }, this);
      }
    }
  };
  RR.GameOver = {
    play: function (text) {
      return RR.FX.fadeOut(40).then(function () {
        RR.Scene.set(Object.create(GOScene), text);
        return new Promise(function () { }); // ここで物語は止まる
      });
    }
  };
})();
