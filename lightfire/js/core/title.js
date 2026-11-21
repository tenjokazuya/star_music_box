/* title.js — タイトル・デモ・ゲームオーバー・クレジット・ゲーム開始フロー */
(function () {
  'use strict';
  var U = PF.ui, C = U.C, F = PF.font, W = PF.W, H = PF.H, SP = PF.sprites;
  var Q = PF.gfx.Q;

  /* ---------- 夜の村の背景（静止層を事前描画） ---------- */
  var bgCache = {};
  function nightBG(kind) {
    if (bgCache[kind]) return bgCache[kind];
    var c = PF.makeCanvas(W, H), g = c.getContext('2d'), q = new Q(c), R = PF.seeded(11);
    var cols = kind === 'dark' ? ['#05060e', '#080a18', '#0c1022', '#10162c'] : ['#0a0e2a', '#10163c', '#1a2150', '#2a2c64', '#3c3a78'];
    cols.forEach(function (col, i) { g.fillStyle = col; g.fillRect(0, i * (96 / cols.length), W, 96 / cols.length + 1); });
    for (var i = 0; i < 60; i++) { g.fillStyle = R() < 0.2 ? '#ffffff' : '#9ab0e0'; g.fillRect((R() * W) | 0, (R() * 70) | 0, 1, 1); }
    // 山
    q.poly([[0, 96], [0, 70], [28, 52], [54, 74], [86, 48], [120, 76], [150, 56], [186, 78], [214, 54], [240, 70], [240, 96]], kind === 'dark' ? '#0a0e1c' : '#1c2250');
    q.poly([[28, 52], [20, 62], [36, 62]], '#c8d8ff'); q.poly([[86, 48], [76, 60], [96, 60]], '#c8d8ff'); q.poly([[214, 54], [206, 64], [222, 64]], '#c8d8ff');
    // 地面（雪）
    g.fillStyle = kind === 'dark' ? '#1c2036' : '#c0cce8'; g.fillRect(0, 96, W, 64);
    g.fillStyle = kind === 'dark' ? '#14182c' : '#a4b4dc'; for (var x = 0; x < W; x += 6) g.fillRect(x, 108 + ((x * 7) % 5), 6, 2);
    g.fillStyle = kind === 'dark' ? '#10142a' : '#8c9cc8'; g.fillRect(0, 116, W, 44);
    // 家並み
    var houses = [[10, 26], [46, 22], [152, 30], [194, 24], [222, 22]];
    houses.forEach(function (h) {
      var x = h[0], w = h[1], y = 96;
      g.fillStyle = kind === 'dark' ? '#10142a' : '#2a2448'; g.fillRect(x, y - 14, w, 16);
      q.poly([[x - 3, y - 14], [x + w / 2, y - 26], [x + w + 3, y - 14]], kind === 'dark' ? '#0c1022' : '#4a2a38');
      q.poly([[x - 3, y - 14], [x + w / 2, y - 22], [x + w + 3, y - 14]], kind === 'dark' ? '#0c1022' : '#5a3446');
      g.fillStyle = '#d8e8ff'; g.fillRect(x - 1, y - 17, w + 2, 2);
      if (kind !== 'dark') { g.fillStyle = '#ffc860'; g.fillRect(x + 4, y - 9, 4, 4); g.fillRect(x + w - 8, y - 9, 4, 4); }
    });
    // ほこら（中央）
    g.fillStyle = kind === 'dark' ? '#14182c' : '#3a3258'; g.fillRect(96, 84, 48, 24); q.poly([[92, 84], [120, 66], [148, 84]], kind === 'dark' ? '#10142a' : '#5a3a48');
    g.fillStyle = '#d8e8ff'; g.fillRect(92, 82, 56, 3);
    g.fillStyle = kind === 'dark' ? '#080a14' : '#1c1028'; g.fillRect(112, 92, 16, 16);
    // 針葉樹
    for (var t = 0; t < 8; t++) { var tx = [4, 70, 82, 168, 176, 232, 120, 130][t], ty = 112 + (t % 3) * 4; q.poly([[tx, ty], [tx + 8, ty - 22], [tx + 16, ty]], kind === 'dark' ? '#0a1424' : '#163a3c'); q.poly([[tx + 2, ty - 8], [tx + 8, ty - 22], [tx + 14, ty - 8]], '#e8f0ff'); }
    bgCache[kind] = c; return c;
  }
  var flakes = [];
  for (var i = 0; i < 70; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() * 0.9, p: Math.random() * 6 });
  function drawFlakes(g, t, wind) {
    g.fillStyle = '#f4f8ff';
    flakes.forEach(function (f) { f.y += f.s * (wind ? 1.8 : 1); f.x += Math.sin(f.p + t / 40) * 0.3 + (wind ? 1.6 : 0.3); if (f.y > H) { f.y = -2; f.x = Math.random() * W; } if (f.x > W) f.x = 0; g.fillRect(Math.round(f.x), Math.round(f.y), f.s > 0.8 ? 2 : 1, f.s > 0.8 ? 2 : 1); });
  }
  function bigFlame(g, cx, cy, scale, t, alpha) {
    var fr = ((t / 6) | 0) % 3;
    g.globalAlpha = alpha === undefined ? 1 : alpha;
    // 光の輪
    for (var r = 3; r >= 1; r--) { g.fillStyle = 'rgba(255,170,60,' + (0.04 * (4 - r)) + ')'; var rad = 14 * r * scale; for (var y = -rad; y <= rad; y += 2) { var hw = Math.sqrt(rad * rad - y * y); g.fillRect(Math.round(cx - hw), Math.round(cy + y), Math.round(hw * 2), 2); } }
    g.drawImage(SP.flame[fr], cx - 8 * scale, cy - 14 * scale, 16 * scale, 16 * scale);
    g.globalAlpha = 1;
  }
  var sparks = [];
  function updSparks(g, cx, cy, t, on) {
    if (on && t % 3 === 0) sparks.push({ x: cx + (Math.random() - 0.5) * 8, y: cy, vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.6, l: 40 + PF.rnd(30) });
    for (var i = sparks.length - 1; i >= 0; i--) { var s = sparks[i]; s.x += s.vx; s.y += s.vy; s.l--; if (s.l <= 0) { sparks.splice(i, 1); continue; } g.fillStyle = s.l > 20 ? '#ffb030' : '#ff6a1a'; g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
  }

  /* ---------- タイトル ---------- */
  var T = PF.title = {};
  var ts = null;
  var titleScene = {
    onEnter: function () { ts = { t: 0, mode: 'intro', sel: PF.save.any() ? 1 : 0, idle: 0 }; PF.audio.playBGM('title'); PF.audio.ambience(['wind']); },
    onResume: function () { ts.idle = 0; PF.audio.playBGM('title'); PF.audio.ambience(['wind']); },
    update: function (paused) {
      ts.t++;
      if (paused) { ts.idle = 0; return; }
      ts.idle++;
      var inp = PF.input;
      if (ts.mode === 'intro') { if (ts.t > 90 || inp.anyPressed()) { ts.mode = 'press'; } return; }
      if (ts.mode === 'press') {
        if (inp.pressed('a') || inp.pressed('start')) { PF.sfx('ok'); ts.mode = 'menu'; ts.idle = 0; }
        else if (ts.idle > 60 * 22) startDemo();
        return;
      }
      if (ts.mode === 'menu') {
        var items = T.menuItems(), d = inp.dirRepeat();
        if (inp.anyPressed() || d) ts.idle = 0;
        if (d === 'u') { ts.sel = (ts.sel + items.length - 1) % items.length; PF.sfx('cursor'); }
        if (d === 'd') { ts.sel = (ts.sel + 1) % items.length; PF.sfx('cursor'); }
        if (inp.pressed('b')) { ts.mode = 'press'; PF.sfx('cancel'); }
        if (inp.pressed('a')) T.choose(items[ts.sel]);
        if (ts.idle > 60 * 30) startDemo();
      }
    },
    draw: function (g) {
      var t = ts.t;
      g.drawImage(nightBG('night'), 0, 0);
      bigFlame(g, 120, 100, 1.2, t);
      updSparks(g, 120, 90, t, true);
      drawFlakes(g, t);
      // ロゴ
      var a = Math.min(1, t / 50), ly = 22 + Math.round((1 - a) * -20);
      g.globalAlpha = a;
      var l1 = 'ともしびの', l2 = 'ひもり', w1 = F.widthScaled(l1, 3), w2 = F.widthScaled(l2, 3);
      [[l1, Math.round((W - w1) / 2), ly - 12], [l2, Math.round((W - w2) / 2) + 18, ly + 22]].forEach(function (q) {
        F.drawScaled(g, q[0], q[1], q[2] + 3, '#7a2810', 3);
        F.drawScaled(g, q[0], q[1], q[2], '#ffd868', 3, { outline: '#3a1408' });
      });
      g.globalAlpha = Math.max(0, Math.min(1, (t - 40) / 30));
      F.drawC(g, 'KEEPER OF THE EMBER', 120, ly + 64, '#c8d8ff', { outline: '#0a0e2a' });
      g.globalAlpha = 1;
      if (ts.mode === 'press' && ((t / 30) | 0) % 2 === 0) F.drawC(g, 'PRESS START', 120, 128, '#ffffff', { outline: '#0a0e2a' });
      if (ts.mode === 'menu') {
        var items = T.menuItems();
        U.window(g, 70, 96, 100, 8 + items.length * 14);
        items.forEach(function (it, i) { U.text(g, it.label, 90, 103 + i * 14, it.disabled ? C.dim : (i === ts.sel ? C.hi : C.text)); if (i === ts.sel) U.cursor(g, 77, 103 + i * 14); });
      }
    }
  };
  T.menuItems = function () {
    return [{ id: 'new', label: 'はじめから' }, { id: 'cont', label: 'つづきから', disabled: !PF.save.any() }, { id: 'set', label: 'せってい' }, { id: 'demo', label: 'デモを みる' }];
  };
  T.choose = async function (it) {
    if (it.disabled) { PF.sfx('error'); return; }
    PF.sfx('ok');
    if (it.id === 'new') {
      var ok = true;
      if (PF.save.any()) ok = await U.confirm('はじめから あそびます。\nよろしいですか?');
      if (ok) PF.game.newGame();
    } else if (it.id === 'cont') {
      var items = [];
      for (var i = 0; i < PF.save.slots; i++) { var inf = PF.save.info(i); items.push({ label: 'スロット' + (i + 1), right: inf ? 'Lv' + inf.lv : 'あき', desc: inf ? inf.place : '', disabled: !inf }); }
      var r = await PF.menu.list({ items: items, rows: 3, y: 40, title: 'どの ぼうけんを つづける?', def: Math.max(0, PF.save.lastUsed()), footer: function (g, it2) { U.window(g, 4, 118, 232, 38); U.text(g, it2.desc || '', 12, 124, C.text); } });
      if (r >= 0) PF.game.loadGame(r);
    } else if (it.id === 'set') await PF.menu.settings(true);
    else if (it.id === 'demo') startDemo();
  };
  T.start = function () { PF.scene.replace(titleScene); };

  /* ---------- デモ（物語の紹介） ---------- */
  var SLIDES = [
    { kind: 'fire', text: 'むかし ゆきの ふかい むらに\nおおきな ひが あった。', len: 330 },
    { kind: 'lamps', text: 'ひとびとは その ひを ともしびに わけ、\nさむい ふゆを こえてきた。', len: 420 },
    { kind: 'out', text: 'ところが ある よる、\nおおきな ひは ふいに きえた。', len: 400 },
    { kind: 'dark', text: 'のこったのは\nちいさな ひだね ひとつ。', len: 360 },
    { kind: 'walk', text: 'ともしびを まもる ものが\nたびに でる。', len: 420 }
  ];
  // 文字枠は最大2行（check_text.js が 行数と幅を検査する）
  T.demoSlides = SLIDES;
  var DEMO_BOX = { x: 12, y: 108, w: 216, h: 44, tx: 22, ty: 117, lh: 14 };
  var ds = null;
  var demoScene = {
    overlay: false,
    onEnter: function () { ds = { i: 0, t: 0, shown: 0 }; PF.audio.playBGM('night'); PF.audio.ambience(['wind']); PF.fx.fade(0, 20); },
    update: function () {
      if (PF.input.anyPressed()) { PF.sfx('cancel'); PF.scene.pop(); return; }
      ds.t++;
      var s = SLIDES[ds.i];
      if (ds.t > 40 && ds.shown < s.text.length && ds.t % 3 === 0) { ds.shown++; }
      if (ds.t > s.len) { ds.i++; ds.t = 0; ds.shown = 0; if (ds.i >= SLIDES.length) { PF.scene.pop(); } }
    },
    draw: function (g) {
      var s = SLIDES[Math.min(ds.i, SLIDES.length - 1)], t = ds.t, tt = PF.time;
      var a = Math.min(1, t / 25, (s.len - t) / 25);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.globalAlpha = Math.max(0, a);
      var k = s.kind;
      g.drawImage(nightBG(k === 'dark' || k === 'walk' ? 'dark' : 'night'), 0, 0);
      if (k === 'fire') { bigFlame(g, 120, 100, 1.4, tt); updSparks(g, 120, 88, tt, true); }
      if (k === 'lamps') {
        bigFlame(g, 120, 100, 1.0, tt);
        for (var i = 0; i < 12; i++) { var lx = 20 + ((i * 53) % 200), ly = 120 + ((i * 17) % 28), on = t > 40 + i * 14; if (on) { g.fillStyle = 'rgba(255,190,80,0.25)'; g.fillRect(lx - 4, ly - 4, 9, 9); g.fillStyle = '#ffd060'; g.fillRect(lx - 1, ly - 1, 3, 3); g.fillStyle = '#fff4c0'; g.fillRect(lx, ly, 1, 1); } }
      }
      if (k === 'out') {
        var f = Math.max(0, 1 - t / 220); bigFlame(g, 120, 100, 0.6 + f * 0.8, tt, f); if (f > 0) updSparks(g, 120, 90, tt, true);
        if (t > 200) { g.fillStyle = 'rgba(0,0,10,' + Math.min(0.7, (t - 200) / 100) + ')'; g.fillRect(0, 0, W, H); }
        if (t === 205) PF.sfx('wind');
      }
      if (k === 'dark') {
        // 小さな火の粉が 夜空へ
        var p = Math.min(1, t / 300), sx = 120 + p * 90 + Math.sin(tt / 9) * 4, sy = 98 - p * 40 + Math.sin(tt / 7) * 3;
        g.fillStyle = 'rgba(255,170,60,0.3)'; g.fillRect(sx - 4, sy - 4, 9, 9); g.drawImage(SP.ember[((tt / 6) | 0) % 4], sx - 8, sy - 8);
      }
      if (k === 'walk') {
        // 灯りを持つ人影と 遠くの塔
        var sh = PF.gfx.human({ hair: '#5a3220', skin: '#f8d0a0', cloth: '#e0583a', trim: '#fff0c0' }), wx = 30 + t * 0.25;
        g.fillStyle = '#10142a'; g.fillRect(190, 40, 14, 70); g.fillRect(186, 36, 22, 8); g.fillStyle = '#9ac8f0'; g.fillRect(194, 52, 3, 5);
        g.drawImage(sh.r[((t / 8) | 0) % 2 ? 1 : 3], Math.round(wx), 108);
        g.fillStyle = 'rgba(255,190,80,0.3)'; g.fillRect(Math.round(wx) + 12, 112, 8, 8); g.fillStyle = '#ffd060'; g.fillRect(Math.round(wx) + 15, 115, 3, 3);
      }
      drawFlakes(g, tt, k === 'out' || k === 'dark');
      g.globalAlpha = 1;
      // テキスト
      U.window(g, DEMO_BOX.x, DEMO_BOX.y, DEMO_BOX.w, DEMO_BOX.h, { alpha: 0.8 });
      var lines = s.text.slice(0, ds.shown).split('\n');
      lines.forEach(function (ln, i) { U.text(g, ln, DEMO_BOX.tx, DEMO_BOX.ty + i * DEMO_BOX.lh, C.text); });
      if (ds.t % 90 < 60) F.draw(g, 'A: とばす', 190, 2, 'rgba(200,210,255,0.5)');
    }
  };
  function startDemo() { PF.scene.push(demoScene); }

  /* ---------- ゲームオーバー ---------- */
  var gos = null;
  var gameOverScene = {
    onEnter: function () { gos = { t: 0, sel: 0 }; PF.audio.stopBGM(0.2); PF.audio.ambience([]); setTimeout(function () { PF.audio.playBGM('gameover'); }, 300); },
    update: function () {
      gos.t++;
      if (gos.t < 100) return;
      var items = T.goItems(), d = PF.input.dirRepeat();
      if (d === 'u' || d === 'd') { gos.sel = (gos.sel + 1) % items.length; PF.sfx('cursor'); }
      if (PF.input.pressed('a')) {
        PF.sfx('ok'); var it = items[gos.sel];
        if (it.id === 'cont') { gos.done = true; PF.game.loadGame(PF.save.lastUsed()); } else { PF.game.toTitle(); }
      }
    },
    draw: function (g) {
      g.fillStyle = '#080008'; g.fillRect(0, 0, W, H);
      var a = Math.min(1, gos.t / 60);
      g.globalAlpha = a; F.drawScaled(g, 'GAME OVER', 120 - F.widthScaled('GAME OVER', 3) / 2, 44, '#c82828', 3, { outline: '#2a0808' }); g.globalAlpha = 1;
      if (gos.t > 100) {
        var items = T.goItems();
        items.forEach(function (it, i) { U.textC(g, it.label, 120, 100 + i * 16, i === gos.sel ? C.hi : C.dim); if (i === gos.sel) U.cursor(g, 80, 100 + i * 16); });
      }
    }
  };
  T.goItems = function () { var a = []; if (PF.save.any()) a.push({ id: 'cont', label: 'さいごの セーブから つづける' }); a.push({ id: 'title', label: 'タイトルへ' }); return a; };

  /* ---------- クレジット ---------- */
  var cs = null;
  var creditScene = {
    onEnter: function () { cs = { t: 0 }; },
    update: function () { cs.t++; if (cs.t > 560 && cs.done) { var d = cs.done; cs.done = null; d(); } },
    draw: function (g) {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      var t = cs.t, a = Math.max(0, Math.min(1, (t - 60) / 80, (520 - t) / 70));
      g.globalAlpha = a;
      F.drawC(g, 'PRODUCED BY', 120, 56, '#c8d0f0');
      // 大字 (16x16) 天上 和哉
      var chars = ['天', '上', ' ', '和', '哉'], x = 120 - (4 * 24 + 8) / 2 + 12;
      var xs = [0, 20, 0, 44, 64];
      var sx = 120 - 40;
      PF.font.big(g, '天', sx, 72, '#ffd868', 1); PF.font.big(g, '上', sx + 18, 72, '#ffd868', 1);
      PF.font.big(g, '和', sx + 46, 72, '#ffd868', 1); PF.font.big(g, '哉', sx + 64, 72, '#ffd868', 1);
      g.globalAlpha = 1;
      if (a > 0.5) { var fr = ((t / 6) | 0) % 3; g.globalAlpha = a * 0.9; g.drawImage(SP.flame[fr], 112, 104, 16, 16); g.globalAlpha = 1; }
    }
  };
  T.credits = function () { return new Promise(function (res) { PF.scene.push(creditScene); cs.done = function () { PF.scene.pop(); res(); }; }); };

  /* ---------- ゲーム開始・復帰 ---------- */
  var Gm = PF.game = {};
  function enterField(opts) {
    PF.clearWaiters(); PF.modals.length = 0; PF.fx.reset();
    PF.field.lock = 0; PF.field.lastArea = null;
    PF.scene.replace(PF.field);
    var m = PF.state.map;
    PF.field.load(m.id, { x: m.x, y: m.y, dir: m.dir });
    PF.input.clear();
    PF.field.run(async function (g) { await PF.fx.fade(0, 24); if (opts && opts.enter) await g.runEnter(); else await g.runEnter(); });
  }
  Gm.newGame = function () {
    PF.audio.stopBGM(0.4); PF.audio.ambience([]);
    PF.fx.fade(1, 30).then(function () {
      PF.state = PF.newState(); PF.state.spawnStart = true;
      enterField({ enter: true });
    });
  };
  Gm.loadGame = function (slot) {
    PF.audio.stopBGM(0.4);
    PF.fx.fade(1, 24).then(function () {
      if (!PF.save.read(slot)) { PF.fx.fade(0, 10); return; }
      enterField({});
    });
  };
  Gm.toTitle = function () {
    PF.clearWaiters(); PF.modals.length = 0; PF.audio.stopBGM(0.3); PF.audio.ambience([]);
    PF.fx.reset(); PF.field.lock = 0; PF.state = null; PF.maps.current = null;
    PF.title.start();
  };
  Gm.gameOver = function () {
    PF.modals.length = 0; PF.fx.reset(); PF.field.lock = 0;
    PF.scene.replace(gameOverScene);
    return Promise.resolve();
  };
  Gm.credits = T.credits;
})();
