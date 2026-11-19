/* タイトル / セーブスロット / 名前入力 / 設定 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input, UI = RR.UI, P = RR.Pal;

  // ---------- 背景（夜空・山・峠の道・町の灯り） ----------
  var bg = null, stars = [], roadPts = [];
  function buildBG() {
    var c = U.canvas(240, 160), g = c.g;
    // 空: ディザのグラデーション
    var sky = ['#060818', '#0c1030', '#141a48', '#202860', '#30306c'];
    for (var y = 0; y < 110; y++) {
      for (var x = 0; x < 240; x++) {
        var t = y / 110 * (sky.length - 1);
        var i = Math.floor(t), f = t - i;
        g.fillStyle = f > P.dither(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i];
        g.fillRect(x, y, 1, 1);
      }
    }
    // 月
    for (y = -9; y <= 9; y++) for (x = -9; x <= 9; x++) {
      var d = x * x + y * y;
      if (d <= 81) { g.fillStyle = (x - 3) * (x - 3) + (y + 2) * (y + 2) < 30 ? '#f8f0d0' : '#e0d8b8'; if (d > 64) g.fillStyle = '#c8c0a0'; g.fillRect(196 + x, 26 + y, 1, 1); }
    }
    g.fillStyle = '#b8b098'; g.fillRect(192, 28, 3, 2); g.fillRect(199, 22, 2, 2);
    // 山並み（3層）
    var layers = [{ c: '#181c40', h: 70, a: 22, f: 0.04, s: 1 }, { c: '#10142c', h: 88, a: 18, f: 0.07, s: 2 }, { c: '#080a1a', h: 104, a: 14, f: 0.11, s: 3 }];
    layers.forEach(function (L) {
      for (var x = 0; x < 240; x++) {
        var top = L.h - Math.abs(Math.sin(x * L.f + L.s) * L.a) - Math.sin(x * L.f * 2.7 + L.s * 3) * L.a * 0.3;
        g.fillStyle = L.c;
        g.fillRect(x, Math.round(top), 1, 160);
      }
    });
    // 町の灯り
    var rnd = U.rng(5);
    for (var i2 = 0; i2 < 90; i2++) {
      var lx = Math.floor(rnd() * 240), ly = 128 + Math.floor(rnd() * 30);
      g.fillStyle = ['#f8d878', '#f8a860', '#a8d8f8', '#f8f0d0'][i2 % 4];
      g.fillRect(lx, ly, 1, 1);
    }
    bg = c;
    for (i2 = 0; i2 < 70; i2++) stars.push({ x: Math.floor(rnd() * 240), y: Math.floor(rnd() * 80), p: rnd() * 6.28, b: rnd() });
    // 峠を下るヘッドライトの道筋
    for (var k = 0; k <= 60; k++) {
      var t2 = k / 60;
      roadPts.push([60 + Math.sin(t2 * 9) * 30 + t2 * 70, 74 + t2 * 52]);
    }
  }
  var logo = null;
  function buildLogo() {
    var w = 200, h = 34;
    var c = U.canvas(w, h), g = c.g;
    var t = U.canvas(w, h);
    F.draw(t.g, 'TOUGE NIGHT', w / 2, 4, '#ffffff', { scale: 3, align: 'center', shadow: null });
    // グラデーション
    var gc = U.canvas(w, h);
    var cols = ['#fff8c0', '#f8d860', '#f8a040', '#e85830', '#a82828'];
    for (var y = 0; y < h; y++) { gc.g.fillStyle = cols[Math.min(cols.length - 1, Math.floor((y - 4) / 5))] || cols[0]; gc.g.fillRect(0, y, w, 1); }
    gc.g.globalCompositeOperation = 'destination-in';
    gc.g.drawImage(t, 0, 0);
    // 縁取り
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 2; dy++) {
      if (!dx && !dy) continue;
      var o = U.canvas(w, h);
      o.g.drawImage(t, 0, 0);
      o.g.globalCompositeOperation = 'source-in';
      o.g.fillStyle = dy === 2 ? '#000008' : '#200810';
      o.g.fillRect(0, 0, w, h);
      g.drawImage(o, dx, dy);
    }
    g.drawImage(gc, 0, 0);
    logo = c;
  }

  var Title = RR.Title = { opaque: true };
  Title.enter = function (arg) {
    if (!bg) buildBG();
    if (!logo) buildLogo();
    this.t = 0; this.idle = 0;
    this.phase = arg && arg.menu ? 'menu' : 'press';
    this.sel = RR.State.anySave() ? 1 : 0;
    RR.State.S = null;
    RR.Audio.bgm('title');
    RR.Audio.ambient('night');
    RR.FX.fade = 1; RR.FX.fadeIn(30);
    this.carT = 0;
  };
  Title.items = function () { return ['はじめから', 'つづきから', 'せってい', 'おはなし']; };
  Title.update = function () {
    this.t++;
    this.carT = (this.carT + 1) % 600;
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
  Title.draw = function (g) {
    var t = this.t;
    g.drawImage(bg, 0, 0);
    stars.forEach(function (s) {
      var b = Math.sin(t * 0.05 + s.p) * 0.5 + 0.5;
      if (b * s.b < 0.25) return;
      g.fillStyle = b > 0.8 ? '#f8f8f8' : '#a8b0d8';
      g.fillRect(s.x, s.y, 1, 1);
    });
    // 峠を下る2台のライト
    [0, 40].forEach(function (off) {
      var k = ((this.carT + off * 3) % 300) / 300 * (roadPts.length - 1);
      var i = Math.floor(k), f = k - i;
      var a = roadPts[i], b = roadPts[Math.min(roadPts.length - 1, i + 1)];
      var x = U.lerp(a[0], b[0], f), y = U.lerp(a[1], b[1], f);
      g.globalAlpha = 0.3; g.fillStyle = '#f8f0c0'; g.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 3); g.globalAlpha = 1;
      g.fillStyle = '#fffbe0'; g.fillRect(Math.round(x), Math.round(y), 2, 1);
    }, this);
    var ly = 20 + Math.round(Math.sin(t * 0.03) * 1.5);
    g.drawImage(logo, 20, ly);
    F.draw(g, 'トウゲ・ナイトストーリー', 120, ly + 34, '#f8e8c8', { align: 'center' });
    if (this.phase === 'press') {
      if ((t >> 5) & 1) F.draw(g, 'PRESS START', 120, 112, '#ffffff', { align: 'center' });
    } else {
      var items = this.items();
      UI.win(g, 80, 86, 80, items.length * 13 + 10, 'dark');
      for (var i = 0; i < items.length; i++) {
        var dis = i === 1 && !RR.State.anySave();
        F.draw(g, items[i], 98, 91 + i * 13, dis ? '#606878' : '#f8f8f8');
        if (i === this.sel) UI.cursor(g, 86, 91 + i * 13);
      }
    }
    F.draw(g, 'V' + RR.VERSION, 236, 150, '#404868', { align: 'right', shadow: null });
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
          g.fillStyle = '#0c1030'; g.fillRect(0, 0, 240, 160);
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
      { key: 'scale', label: 'がめん' }, { key: 'shake', label: 'がめんの ゆれ' }, { key: 'full', label: 'フルスクリーン' }, { key: 'back', label: 'もどる' }
    ];
    function refresh() {
      items.forEach(function (it) {
        var k = it.key;
        if (k === 'bgm' || k === 'se') it.right = vol(s[k]);
        else if (k === 'mt') it.right = s.mt ? 'マニュアル' : 'オートマ';
        else if (k === 'assist') it.right = ASSIST[s.assist];
        else if (k === 'text') it.right = TEXTS[s.text];
        else if (k === 'pad') it.right = PAD[s.pad];
        else if (k === 'scale') it.right = s.scale === 'fit' ? 'フィット' : 'ドット';
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
      else if (k === 'scale') s.scale = s.scale === 'fit' ? 'int' : 'fit';
      else if (k === 'shake') s.shake = s.shake === false;
      else return;
      RR.Settings.save();
      if (k === 'pad' || k === 'scale') RR.Game.layout();
      RR.Audio.sfx('cursor');
      refresh();
    }
    refresh();
    var desc = {
      bgm: 'おんがくの おおきさ', se: 'こうかおんと かんきょうおんの おおきさ', mt: 'マニュアルは L / R で シフトチェンジ',
      assist: 'すべった ときの ぎゃくハンドルと タイヤの からまわりを たすける', text: 'かいわの もじが でる はやさ',
      pad: 'タッチそうさ よう の ボタン', scale: 'ドットは きれいな せいすうばい。フィットは がめんいっぱい',
      shake: 'しょうとつ などで がめんが ゆれる', full: 'Aで きりかえ', back: ''
    };
    var loop = function (sel) {
      return UI.menu({
        title: 'せってい', items: items, x: 8, y: 4, w: 224, rows: 7, sel: sel, lr: function (it, d) { change(it, d); },
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
