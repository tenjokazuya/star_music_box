/* タイトル / セーブスロット / 名前入力 / 設定 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input, UI = RR.UI, P = RR.Pal;

  // ---------- 背景: 3D の峠を AI の車が走り続ける ----------
  var Title = RR.Title = { opaque: true };
  var TS = 1 / 120;
  function makeWorld() {
    var C = RR.Course, D = RR.Data;
    var course = C.build('tsuzura');
    var spec = D.rivalSpec(D.rivals.saki);
    var p0 = C.at(course, course.startS - 3);
    var car = new RR.Phys.Car(spec, { x: p0.x, y: p0.y, psi: p0.psi, assist: 1, tcs: 0.8 });
    car.lightsOn = true;
    var ai = new RR.AI(car, course, { skill: 0.94, line: 0.9 });
    ai.started = true;
    var R = {
      carData: { model: 'hayate', color: 'red', dirt: 0 }, player: car, rival: null, view: { ang: p0.psi }, parts: [],
      state: 'title', t: 0, course: course, time: 0, camFn: null
    };
    var w = { course: course, car: car, ai: ai, R: R, spec: spec };
    R.camFn = function (pos, look, cam) { camShot(w, pos, look, cam); };
    w.r3 = RR.Race3D.create(course, R);
    return w;
  }
  var SHOTS = [
    { name: 'front', dur: 520 }, { name: 'side', dur: 460 }, { name: 'high', dur: 480 }, { name: 'chase', dur: 460 }
  ];
  function camShot(w, pos, look, cam) {
    var car = w.car, t = w.t || 0, tot = 0;
    SHOTS.forEach(function (s) { tot += s.dur; });
    var tt = t % tot, shot = SHOTS[0], k = 0;
    for (var i = 0; i < SHOTS.length; i++) { if (tt < SHOTS[i].dur) { shot = SHOTS[i]; k = tt / shot.dur; break; } tt -= SHOTS[i].dur; }
    var fx = Math.sin(car.psi), fz = -Math.cos(car.psi), rx = Math.cos(car.psi), rz = Math.sin(car.psi);
    var e = RR.Race3D.elevAt(w.course, car.s || 0);
    var px, py, pz, lx, ly, lz, fov = 46;
    if (shot.name === 'front') { px = car.x + fx * 9 + rx * (3.2 - k * 1.2); py = e + 1.0 + k * 0.4; pz = car.y + fz * 9 + rz * (3.2 - k * 1.2); lx = car.x; ly = e + 0.7; lz = car.y; fov = 40; }
    else if (shot.name === 'side') { px = car.x + rx * 6.2 - fx * (3 - k * 5); py = e + 1.0; pz = car.y + rz * 6.2 - fz * (3 - k * 5); lx = car.x + fx * 1.5; ly = e + 0.6; lz = car.y + fz * 1.5; fov = 42; }
    else if (shot.name === 'high') { px = car.x - fx * 11 - rx * 6; py = e + 7 - k * 1.5; pz = car.y - fz * 11 - rz * 6; lx = car.x + fx * 5; ly = e; lz = car.y + fz * 5; fov = 50; }
    else { px = car.x - fx * 7.5 + rx * 0.5; py = e + 2.4; pz = car.y - fz * 7.5 + rz * 0.5; lx = car.x + fx * 10; ly = e + 1.0; lz = car.y + fz * 10; fov = 52; }
    w.cp = w.cp || { x: px, y: py, z: pz, lx: lx, ly: ly, lz: lz };
    var a = (t % tot) < 8 ? 0.2 : 0.1;
    w.cp.x += (px - w.cp.x) * a; w.cp.y += (py - w.cp.y) * a; w.cp.z += (pz - w.cp.z) * a;
    w.cp.lx += (lx - w.cp.lx) * a; w.cp.ly += (ly - w.cp.ly) * a; w.cp.lz += (lz - w.cp.lz) * a;
    pos.set(w.cp.x, w.cp.y, w.cp.z); look.set(w.cp.lx, w.cp.ly, w.cp.lz);
    cam.fov += (fov - cam.fov) * 0.05;
  }
  function stepWorld(w) {
    var car = w.car, c = w.course;
    w.t = (w.t || 0) + 1;
    for (var i = 0; i < 2; i++) { car.step(TS, w.ai.control(TS), c); }
    w.R.t = w.t; w.R.time = w.t / 60;
    if (car.s > c.finishS + 20) {
      var p0 = RR.Course.at(c, c.startS - 3);
      car.x = p0.x; car.y = p0.y; car.psi = p0.psi; car.u = 6; car.v = 0; car.r = 0; car.idx = null; car.T = [60, 60, 60, 60];
      w.ai.lane0 = null;
    }
  }
  function buildLogo() {
    var w = 360, h = 82;
    var c = U.canvas(w * 2, h * 2, true), g = c.g;
    g.scale(2, 2);
    function stroke(txt, y, size, grad) {
      g.font = 'italic 900 ' + size + 'px ' + RR.FONT_STACK;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = size * 0.2; g.strokeStyle = '#1a0610'; g.strokeText(txt, w / 2, y);
      var gr = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      grad.forEach(function (s, i) { gr.addColorStop(i / (grad.length - 1), s); });
      g.fillStyle = gr; g.fillText(txt, w / 2, y);
      g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.strokeText(txt, w / 2, y - 0.6);
    }
    stroke('TOUGE NIGHT', 28, 44, ['#fff8c0', '#f8d860', '#f8a040', '#e85830', '#b02828']);
    stroke('STORY', 66, 36, ['#d8f0ff', '#88c8f8', '#4888e0', '#2850b0']);
    return c;
  }
  var logo = null;

  Title.enter = function (arg) {
    if (!logo) logo = buildLogo();
    if (this.world) { this.world.r3.dispose(); }
    this.world = makeWorld();
    this.t = 0; this.idle = 0;
    this.phase = arg && arg.menu ? 'menu' : 'press';
    this.sel = RR.State.anySave() ? 1 : 0;
    RR.State.S = null;
    RR.Audio.bgm('title');
    RR.Audio.ambient('night');
    RR.FX.fade = 1; RR.FX.fadeIn(30);
  };
  Title.exit = function () {
    if (this.world) { this.world.r3.dispose(); this.world = null; }
  };
  Title.items = function () { return ['はじめから', 'つづきから', 'せってい', 'おはなし']; };
  Title.update = function () {
    this.t++;
    if (this.world) stepWorld(this.world);
    if (RR.UI.busy() || this.busy) return;
    if (In.anyPressed()) this.idle = 0; else this.idle++;
    if (this.idle > 60 * 22) { this.idle = 0; this.startDemo(); return; }
    if (this.phase === 'press') {
      if (In.pressed('start') || In.pressed('a')) { RR.Audio.sfx('ok'); this.phase = 'menu'; RR.Audio.bgm('title'); }
      return;
    }
    var items = this.items(), n = items.length;
    if (In.repeat('up')) { this.sel = (this.sel + n - 1) % n; RR.Audio.sfx('cursor'); }
    if (In.repeat('down')) { this.sel = (this.sel + 1) % n; RR.Audio.sfx('cursor'); }
    if (In.pressed('b')) { this.phase = 'press'; RR.Audio.sfx('cancel'); }
    if (In.pressed('a') || In.pressed('start')) {
      var self = this;
      if (this.sel === 1 && !RR.State.anySave()) { RR.Audio.sfx('error'); return; }
      RR.Audio.sfx('ok');
      this.busy = true;
      var done = function () { self.busy = false; };
      if (this.sel === 0) newGame().then(done);
      else if (this.sel === 1) cont().then(done);
      else if (this.sel === 2) RR.Settings.menu().then(done);
      else { this.busy = false; this.startDemo(); }
    }
  };
  Title.startDemo = function () {
    var self = this;
    this.busy = true;
    RR.FX.fadeOut(30).then(function () {
      self.busy = false;
      RR.Demo.play();
    });
  };
  Title.draw3d = function () {
    var w = this.world;
    if (!w) return;
    w.r3.update(w.R, 1 / 60);
    w.r3.render();
  };
  Title.draw = function (g) {
    var t = this.t, sc = UI.screen();
    // 上下を少し暗くして文字を読みやすく
    var gt = g.createLinearGradient(0, sc.y, 0, sc.y + sc.h);
    gt.addColorStop(0, 'rgba(0,0,12,0.55)'); gt.addColorStop(0.35, 'rgba(0,0,12,0)'); gt.addColorStop(0.7, 'rgba(0,0,12,0)'); gt.addColorStop(1, 'rgba(0,0,12,0.65)');
    g.fillStyle = gt; g.fillRect(sc.x, sc.y, sc.w, sc.h);
    var ly = sc.y + 10 + Math.sin(t * 0.03) * 1.2;
    var lw = 180, lh = lw * 82 / 360;
    g.save(); g.shadowColor = 'rgba(255,140,60,0.55)'; g.shadowBlur = 6;
    g.drawImage(logo, 120 - lw / 2, ly, lw, lh);
    g.restore();
    F.draw(g, 'トウゲ・ナイトストーリー 3D', 120, ly + lh + 2, '#f8e8c8', { align: 'center' });
    if (this.phase === 'press') {
      if (Math.sin(t * 0.12) > -0.2) F.draw(g, 'PRESS START', 120, sc.y + sc.h - 38, '#ffffff', { align: 'center', scale: 1.3, outline: 'rgba(0,0,30,0.8)' });
    } else {
      var items = this.items();
      var mh = items.length * 14 + 12, my = sc.y + sc.h - mh - 14;
      UI.win(g, 80, my, 80, mh, 'dark');
      for (var i = 0; i < items.length; i++) {
        var dis = i === 1 && !RR.State.anySave();
        var iy = my + 7 + i * 14;
        if (i === this.sel) { g.fillStyle = 'rgba(255,255,255,0.15)'; UI.roundRect(g, 83, iy - 2, 74, 13, 2); g.fill(); UI.cursor(g, 87, iy); }
        F.draw(g, items[i], 100, iy, dis ? '#606878' : '#f8f8f8');
      }
    }
    F.draw(g, 'V' + RR.VERSION, sc.x + sc.w - 4, sc.y + sc.h - 10, '#586088', { align: 'right', shadow: null });
  };

  // ---------- セーブスロット ----------
  RR.CHAPTERS = ['じょしょう', '1しょう', '2しょう', '3しょう', 'しゅうしょう', 'クリアご'];
  function slotItems(forNew) {
    var items = [];
    for (var i = 0; i < 3; i++) {
      var info = RR.State.info(i);
      if (info) items.push({ label: (i + 1) + ' ' + info.name, right: (info.cleared ? '★' : '') + RR.CHAPTERS[Math.min(5, info.stage)] + ' ' + RR.State.playtimeText(info.playtime), info: info });
      else items.push({ label: (i + 1) + ' - データなし -', right: '', disabled: !forNew, color: '#a0a8c0' });
    }
    return items;
  }
  function chooseSlot(forNew) {
    var items = slotItems(forNew);
    return UI.menu({
      title: forNew ? 'どこに きろく しますか?' : 'どの きろくで つづけますか?', items: items, x: 14, y: 26, w: 212, rows: 3, rowH: 16,
      drawExtra: function (g, m) {
        var it = items[m.sel];
        if (it && it.info) UI.descBox(g, '¥' + U.money(it.info.money) + '  ' + (it.info.cleared ? 'エンディング とうたつ ずみ' : ''));
      }
    });
  }
  function newGame() {
    return chooseSlot(true).then(function (slot) {
      if (slot < 0) return;
      var ok = Promise.resolve(0);
      if (RR.State.info(slot)) ok = UI.ask('', 'この きろくに うわがき します。|よろしいですか?', ['はい', 'いいえ'], { def: 1 });
      return ok.then(function (yes) {
        if (yes !== 0) return;
        return RR.NameEntry.open('ソラ').then(function (name) {
          if (!name) return;
          RR.Audio.sfx('save');
          RR.State.newGame(name, slot);
          RR.State.save();
          return RR.FX.fadeOut(40).then(function () {
            RR.Audio.stopBgm(0.5);
            RR.Scene.set(RR.Field, { fadeIn: true });
          });
        });
      });
    });
  }
  function cont() {
    return chooseSlot(false).then(function (slot) {
      if (slot < 0) return;
      if (!RR.State.load(slot)) { RR.Audio.sfx('error'); return UI.msg('きろくが こわれて いるようです。'); }
      RR.Audio.sfx('save');
      return RR.FX.fadeOut(30).then(function () { RR.Scene.set(RR.Field); });
    });
  }

  // ---------- 名前入力 ----------
  var HIRA = [
    'あいうえおかきくけこ', 'さしすせそたちつてと', 'なにぬねのはひふへほ', 'まみむめもやゆよらり', 'るれろわをんゃゅょっ',
    'がぎぐげござじずぜぞ', 'だぢづでどばびぶべぼ', 'ぱぴぷぺぽぁぃぅぇぉ'
  ];
  function toKata(s) { return s.replace(/[ぁ-ゖ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60); }); }
  var CMDS = ['ー', '・', 'カナ', 'けす', 'おわり'];
  RR.NameEntry = {
    open: function (def) {
      var st = { name: def || '', cx: 0, cy: 0, kata: true, max: 5 };
      return UI.custom({
        update: function () {
          var rows = HIRA.length + 1;
          if (In.repeat('up')) { st.cy = (st.cy + rows - 1) % rows; RR.Audio.sfx('cursor'); }
          if (In.repeat('down')) { st.cy = (st.cy + 1) % rows; RR.Audio.sfx('cursor'); }
          var cols = st.cy === HIRA.length ? CMDS.length : 10;
          if (st.cx >= cols) st.cx = cols - 1;
          if (In.repeat('left')) { st.cx = (st.cx + cols - 1) % cols; RR.Audio.sfx('cursor'); }
          if (In.repeat('right')) { st.cx = (st.cx + 1) % cols; RR.Audio.sfx('cursor'); }
          if (In.pressed('b')) { if (st.name.length) { st.name = st.name.slice(0, -1); RR.Audio.sfx('cancel'); } else RR.Audio.sfx('error'); }
          if (In.pressed('start')) { st.cy = HIRA.length; st.cx = 4; RR.Audio.sfx('cursor'); }
          if (In.pressed('a')) {
            if (st.cy < HIRA.length) {
              var ch = HIRA[st.cy][st.cx];
              if (st.kata) ch = toKata(ch);
              if (st.name.length < st.max) { st.name += ch; RR.Audio.sfx('blip'); } else RR.Audio.sfx('error');
            } else {
              var c = CMDS[st.cx];
              if (c === 'カナ') { st.kata = !st.kata; RR.Audio.sfx('ok'); }
              else if (c === 'けす') { st.name = st.name.slice(0, -1); RR.Audio.sfx('cancel'); }
              else if (c === 'おわり') {
                if (!st.name.trim()) { RR.Audio.sfx('error'); return; }
                RR.Audio.sfx('ok'); this.close(st.name);
              } else if (st.name.length < st.max) { st.name += c; RR.Audio.sfx('blip'); }
            }
          }
        },
        draw: function (g) {
          UI.dim(g, 0.82);
          UI.win(g, 8, 4, 224, 26);
          F.draw(g, 'なまえを おしえて', 16, 10, '#f8e060');
          for (var i = 0; i < st.max; i++) {
            var ch = st.name[i] || '';
            g.fillStyle = '#7888c8'; g.fillRect(132 + i * 18, 22, 14, 1);
            F.draw(g, ch, 135 + i * 18, 11, '#f8f8f8');
          }
          if ((RR.Game.frame >> 4) & 1 && st.name.length < st.max) { g.fillStyle = '#f8e060'; g.fillRect(132 + st.name.length * 18, 22, 14, 1); }
          UI.win(g, 8, 32, 224, 124);
          for (var y = 0; y < HIRA.length; y++) for (var x = 0; x < 10; x++) {
            var c = HIRA[y][x]; if (st.kata) c = toKata(c);
            var px = 24 + x * 20, py = 38 + y * 13;
            if (st.cy === y && st.cx === x) { g.fillStyle = '#4858a8'; g.fillRect(px - 3, py - 1, 14, 12); }
            F.draw(g, c, px, py, '#f8f8f8');
          }
          for (var k = 0; k < CMDS.length; k++) {
            var cx = 20 + k * 42, cy = 142;
            if (st.cy === HIRA.length && st.cx === k) { g.fillStyle = '#4858a8'; g.fillRect(cx - 4, cy - 1, F.measure(CMDS[k]) + 8, 12); }
            F.draw(g, CMDS[k], cx, cy, k === 4 ? '#f8e060' : '#c8d0f0');
          }
        }
      });
    }
  };

  // ---------- 設定 ----------
  var TEXTS = ['おそい', 'ふつう', 'はやい', 'いっしゅん'];
  var ASSIST = ['OFF', 'よわ', 'つよ'];
  var PAD = { auto: 'じどう', on: 'ひょうじ', off: 'けす' };
  RR.Settings.menu = function () {
    var s = RR.Settings.data;
    function vol(v) { var o = ''; for (var i = 0; i < 10; i++) o += i < v ? '■' : '□'; return o; }
    var items = [
      { key: 'bgm', label: 'BGM' }, { key: 'se', label: 'こうかおん' }, { key: 'mt', label: 'ミッション' },
      { key: 'assist', label: 'ドリフト アシスト' }, { key: 'text', label: 'もじの はやさ' }, { key: 'pad', label: 'ソフトキー' },
      { key: 'gfx', label: 'グラフィック' }, { key: 'cam', label: 'レースの しせん' }, { key: 'shake', label: 'がめんの ゆれ' }, { key: 'full', label: 'フルスクリーン' }, { key: 'back', label: 'もどる' }
    ];
    function refresh() {
      items.forEach(function (it) {
        var k = it.key;
        if (k === 'bgm' || k === 'se') it.right = vol(s[k]);
        else if (k === 'mt') it.right = s.mt ? 'マニュアル' : 'オートマ';
        else if (k === 'assist') it.right = ASSIST[s.assist];
        else if (k === 'text') it.right = TEXTS[s.text];
        else if (k === 'pad') it.right = PAD[s.pad];
        else if (k === 'gfx') it.right = RR.GL.QUALITY[s.gfx == null ? 1 : s.gfx].name;
        else if (k === 'cam') it.right = ['うしろ', 'ちかい', 'たかい'][s.cam || 0];
        else if (k === 'shake') it.right = s.shake !== false ? 'ON' : 'OFF';
        else it.right = '';
      });
    }
    function change(it, d) {
      var k = it.key;
      if (k === 'bgm' || k === 'se') s[k] = U.clamp(s[k] + d, 0, 10);
      else if (k === 'mt') s.mt = !s.mt;
      else if (k === 'assist') s.assist = (s.assist + d + 3) % 3;
      else if (k === 'text') s.text = (s.text + d + 4) % 4;
      else if (k === 'pad') { var o = ['auto', 'on', 'off']; s.pad = o[(o.indexOf(s.pad) + d + 3) % 3]; }
      else if (k === 'gfx') s.gfx = ((s.gfx == null ? 1 : s.gfx) + d + 3) % 3;
      else if (k === 'cam') s.cam = ((s.cam || 0) + d + 3) % 3;
      else if (k === 'shake') s.shake = s.shake === false;
      else return;
      RR.Settings.save();
      if (k === 'pad' || k === 'gfx') RR.Game.layout();
      RR.Audio.sfx('cursor');
      refresh();
    }
    refresh();
    var desc = {
      bgm: 'おんがくの おおきさ', se: 'こうかおんと かんきょうおんの おおきさ', mt: 'マニュアルは L / R で シフトチェンジ',
      assist: 'すべった ときの ぎゃくハンドルと タイヤの からまわりを たすける', text: 'かいわの もじが でる はやさ',
      pad: 'タッチそうさ よう の ボタン', gfx: 'えいぞうの きれいさ。おもい ときは ひくく する', cam: 'レースの カメラの いち',
      shake: 'しょうとつ などで がめんが ゆれる', full: 'Aで きりかえ', back: ''
    };
    var loop = function (sel) {
      return UI.menu({
        title: 'せってい', items: items, x: 8, y: 4, w: 224, rows: 8, sel: sel, lr: function (it, d) { change(it, d); },
        drawExtra: function (g, m) { UI.descBox(g, desc[items[m.sel].key]); }
      }).then(function (i) {
        if (i < 0 || items[i].key === 'back') return;
        var k = items[i].key;
        if (k === 'full') RR.platform.toggleFullscreen();
        else change(items[i], 1);
        return loop(i);
      });
    };
    return loop(0);
  };
})();
