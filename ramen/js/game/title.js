/* タイトル・オープニング・あそびかた・ゲームオーバー。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx;
  var W = RP.W, H = RP.H;

  var TX = RP.TEXT.title, HW = RP.TEXT.howto, GO = RP.TEXT.gameover;
  // =============== タイトル ===============
  var tt = 0, tmenu = null, tdlg = new UI.Dialog(), tbg = null, saveInfo = null, logoIn = 0;

  function titleItems() {
    var has = RP.game.hasSave();
    return [
      { id: 'continue', label: TX.menu.continue, enabled: has },
      { id: 'new', label: TX.menu.fresh },
      { id: 'howto', label: TX.menu.howto },
      { id: 'settings', label: TX.menu.settings }
    ];
  }

  function startNew() {
    RP.game.newGame();
    RP.game.save();
    RP.scene.go('opening', {}, { trans: 'noren', dur: 0.9 });
  }

  function onSelect(it, i, denied) {
    if (denied) { return; }
    switch (it.id) {
      case 'continue':
        if (RP.game.load()) { RP.scene.go('morning', {}, { trans: 'noren', dur: 0.9 }); }
        else { tdlg.open({ title: TX.errTitle, text: TX.errText, choices: [{ label: 'OK', value: 1 }] }); }
        break;
      case 'new':
        if (RP.game.hasSave()) {
          tdlg.open({
            title: TX.newTitle, text: TX.newText, width: 236,
            choices: [{ label: TX.newNo, value: 'no' }, { label: TX.newYes, value: 'yes' }], cancelValue: 'no',
            onChoose: function (v) { if (v === 'yes') { startNew(); } }
          });
        } else { startNew(); }
        break;
      case 'howto': RP.scene.go('howto', { from: 'title' }, { trans: 'fade', dur: 0.4 }); break;
      case 'settings': RP.scene.go('settings', { from: 'title' }, { trans: 'fade', dur: 0.4 }); break;
      default: break;
    }
  }

  function drawLogo(y, t0) {
    var s1 = 'ラーメンパニック', n = s1.length, size = 28, w = size * n;
    var x0 = Math.round(W / 2 - w / 2);
    for (var i = 0; i < n; i++) {
      var k = U.clamp((t0 - i * 0.08) / 0.5, 0, 1);
      if (k <= 0) { continue; }
      var drop = (1 - U.ease.outBounce(k)) * -50;
      var wave = Math.round(Math.sin(tt * 2.4 + i * 0.7) * 1.5);
      var col = i < 4 ? 'yellow' : 'orange';
      T.draw(s1.charAt(i), x0 + i * size + size / 2, y + drop + wave, 'ink', { align: 'c', size: size, bold: true, outline: 'ink', shadow: 'ink' });
      T.draw(s1.charAt(i), x0 + i * size + size / 2, y + drop + wave - 1, col, { align: 'c', size: size, bold: true, outline: 'maroon' });
    }
    if (t0 > 1.6) {
      var a = U.clamp((t0 - 1.6) / 0.5, 0, 1);
      T.draw(RP.SUBTITLE, W / 2, y + 36, 'cream', { align: 'c', size: 12, outline: 'ink', alpha: a });
    }
  }

  RP.scene.register('title', {
    enter: function () {
      tt = 0; logoIn = 0;
      tmenu = new UI.Menu(titleItems(), {
        x: 132, y: 138, w: 120, rowH: 16, rows: 4, onSelect: onSelect,
        cursor: RP.game.hasSave() ? 0 : 1
      });
      saveInfo = RP.game.saveInfo();
      tbg = RP.bg.create(RP.TIERS[0], { decor: { lantern: 2, chime: 1 } }, 4242);
      tbg.noFront = true;
      RP.music.play('title', { fade: 0.8 });
      RP.audio.ambience({ city: 0.4, cricket: 0.4, train: 0.6, chime: 0.5 });
      FX.reset();
    },
    update: function (dt) {
      tt += dt; logoIn += dt;
      if (tdlg.active) { tdlg.update(dt); return; }
      tmenu.update();
      if (Math.random() < dt * 5) { FX.steam(70 + Math.random() * 20, 150, 1); }
      if (Math.random() < dt * 0.8) { FX.sparkle(40 + Math.random() * 300, 20 + Math.random() * 60, 1, ['white', 'yellow']); }
    },
    draw: function () {
      // 背景：夜の屋台（BGが描かない最上段が残像にならないよう、先に全面を塗る）
      G.clear('#141844');
      RP.bg.draw(tbg, 0.55, false, 1 / 60);
      G.rect(0, 92, W, H - 92, '#241812');
      G.rect(0, 92, W, 4, 'woodL'); G.rect(0, 96, W, 2, 'woodD');
      for (var x = 0; x < W; x += 24) { G.rect(x + 5, 94, 7, 1, '#8a5630'); }
      // 大きな丼
      G.sprite('bowl_empty', 8, 120, { sx: 4 });
      G.rect(8 + 12, 120 + 8, 48, 8, 'shoyu'); G.rect(8 + 8, 120 + 12, 56, 4, 'shoyu');
      G.rect(24, 118, 36, 8, 'noodle');
      G.rect(30, 114, 10, 6, 'lime'); G.rect(44, 115, 8, 6, 'white'); G.disc(54, 118, 4, 'pink');
      // 店主
      var cv = RP.cust.canvas(RP.OWNER_LOOK, Math.floor(tt) % 3 === 2 ? 'happy' : 'normal', 0);
      G.ctx.drawImage(cv, 304, 114, 44, 60);
      G.rect(296, 172, 62, 4, '#14101c');
      // ロゴ
      drawLogo(24, logoIn);
      // メニュー
      UI.panel(120, 130, 144, 74, {});
      tmenu.draw();
      if (saveInfo) {
        T.draw(TX.save(saveInfo.day, saveInfo.tierName, U.yen(saveInfo.money, true)), W / 2, 106, 'cream', { align: 'c', outline: 'ink', size: 10 });
      }
      UI.softkeys('', 'v' + RP.VERSION, TX.soft, { noInput: true, centerCol: 'silver' });
    },
    drawTop: function () { if (tdlg.active) { tdlg.draw(); } }
  });

  // =============== オープニング ===============
  var ST = RP.TEXT.opening;
  var op = { i: 0, c: 0, t: 0, done: false };
  RP.scene.register('opening', {
    enter: function () {
      op.i = 0; op.c = 0; op.t = 0; op.done = false;
      RP.music.play('opening', { fade: 0.8 });
      RP.audio.ambience({ city: 0.3, train: 0.8, wind: 0.3 });
      FX.reset();
    },
    update: function (dt) {
      op.t += dt;
      var total = T.count(ST[op.i].text);
      if (op.c < total) {
        var prev = Math.floor(op.c);
        op.c += dt * 22;
        if (Math.floor(op.c) !== prev && Math.floor(op.c) % 2 === 0) { UI.se('tick'); }
      }
      if (I.taps.length || I.pressed('ok')) {
        if (op.c < total) { op.c = total; }
        else if (op.i < ST.length - 1) { op.i++; op.c = 0; UI.se('select'); }
        else if (!op.done) { op.done = true; UI.se('ok'); RP.scene.go('morning', {}, { trans: 'noren', dur: 0.9 }); }
      }
      if (I.pressed('cancel') && !op.done) { op.done = true; RP.scene.go('morning', {}, { trans: 'noren', dur: 0.9 }); }
    },
    draw: function () {
      G.clear('#0c0a16');
      // 夜景のぼんやりした灯り
      for (var i = 0; i < 18; i++) {
        var x = (i * 47) % W, y = 30 + (i * 29) % 60;
        G.alpha(0.3 + 0.2 * Math.sin(op.t * 2 + i)); G.disc(x, y, 3, i % 2 ? '#ffd870' : '#a8e0ff'); G.alpha(1);
      }
      G.rect(0, 100, W, 116, '#14101c');
      // 屋台のシルエットと提灯
      G.rect(120, 110, 144, 5, '#4e3020'); G.rect(124, 115, 4, 60, '#4e3020'); G.rect(256, 115, 4, 60, '#4e3020');
      G.sprite('lantern', 108, 112); G.sprite('lantern', 266, 112);
      G.glow(112, 118, 16, 'orange', 0.45); G.glow(270, 118, 16, 'orange', 0.45);
      var look = RP.OWNER_LOOK;
      var cv = RP.cust.canvas(look, ST[op.i].mood, 0);
      G.ctx.drawImage(cv, W / 2 - 22, 106, 44, 60);
      G.rect(120, 168, 144, 14, '#6a4226');
      // 文章
      UI.panel(14, 150, 356, 52, {});
      T.draw(ST[op.i].text, 26, 160, 'white', { max: Math.floor(op.c), lineH: 16 });
      var total = T.count(ST[op.i].text);
      if (op.c >= total && Math.floor(op.t * 2) % 2 === 0) { T.draw('▼', 354, 188, 'yellow'); }
      UI.softkeys('', 'スキップ', '', { noInput: true, rightCol: 'silver' });
    }
  });

  // =============== あそびかた ===============
  var PAGES = HW.pages;
  var hw = { i: 0, t: 0, from: 'title' };
  function hwBack() { RP.scene.go(hw.from === 'title' ? 'title' : 'morning', {}, { trans: 'fade', dur: 0.3 }); }
  RP.scene.register('howto', {
    enter: function (a) { hw.i = 0; hw.t = 0; hw.from = (a && a.from) || 'title'; FX.reset(); if (!RP.music.current()) { RP.music.play('title', { fade: 0.5 }); } },
    update: function (dt) {
      hw.t += dt;
      var turn = 0;
      if (I.nav('left')) { turn = -1; }
      if (I.nav('right') || I.pressed('ok')) { turn = 1; }
      var tp = I.tapIn(0, 14, W, H - 30);
      if (tp) { turn = tp.x < W / 3 ? -1 : 1; }
      if (turn) {
        var n = hw.i + turn;
        if (n >= PAGES.length) { UI.se('cancel'); hwBack(); return; }
        if (n >= 0) { hw.i = n; UI.se('tab'); }
      }
      if (I.pressed('cancel') || I.tapIn(0, H - 14, 110, 14)) { UI.se('cancel'); hwBack(); }
    },
    draw: function () {
      UI.stripes(hw.t, '#1c1a3c', '#221e44');
      G.rect(0, 0, W, 14, 'ink'); G.rect(0, 13, W, 1, '#4a4060');
      T.draw(HW.title, 4, 1, 'yellow');
      var pg = PAGES[hw.i];
      UI.panel(10, 24, 364, 172, { title: pg.title });
      pg.lines.forEach(function (l, i) { T.draw(l, 32, 36 + i * 17, 'white'); });
      for (var i = 0; i < PAGES.length; i++) { G.rect(168 + i * 16, 186, 8, 4, i === hw.i ? 'yellow' : 'gray'); }
      T.draw('◀', 14, 100, hw.i > 0 ? 'cream' : 'gray'); T.draw('▶', 360, 100, 'cream');
      UI.softkeys(HW.back, '', HW.soft, { noInput: true, centerCol: 'silver' });
    }
  });

  // =============== ゲームオーバー（倒産） ===============
  var go = { t: 0, menu: null, dlg: new UI.Dialog() };
  RP.scene.register('gameover', {
    enter: function (args) {
      go.t = 0;
      go.cause = args && args.cause;
      go.net = args ? args.net : 0;
      go.menu = new UI.Menu([
        { id: 'retry', label: GO.retry, enabled: RP.game.hasSave() },
        { id: 'new', label: GO.fresh },
        { id: 'title', label: GO.title2 }
      ], {
        x: 130, y: 142, w: 124, rowH: 16, rows: 3, cursor: RP.game.hasSave() ? 0 : 1,
        onSelect: function (it, i, denied) {
          if (denied) { return; }
          if (it.id === 'retry') { if (RP.game.load()) { RP.scene.go('morning', {}, { trans: 'noren' }); } }
          else if (it.id === 'new') { RP.game.newGame(); RP.game.save(); RP.scene.go('opening', {}, { trans: 'noren' }); }
          else { RP.scene.go('title', {}, { trans: 'fade' }); }
        }
      });
      RP.music.stop(0.2);
      UI.se('gameOver');
      setTimeout(function () { if (RP.scene.name() === 'gameover') { RP.music.play('gameover', { fade: 0.5 }); } }, 2600);
      RP.audio.ambience({ wind: 0.5, city: 0.15 });
      RP.audio.loopsOff();
      FX.reset();
    },
    update: function (dt) {
      go.t += dt;
      if (go.t > 3) { go.menu.update(); }
    },
    draw: function () {
      G.clear('#0a0610');
      // 雨と暗い街
      for (var i = 0; i < 50; i++) {
        var rx = (i * 41 + Math.floor(go.t * 120)) % W, ry = (i * 29 + Math.floor(go.t * 260)) % H;
        G.rect(rx, ry, 1, 4, '#3a4a6a');
      }
      G.rect(0, 150, W, 66, '#14101c');
      // 閉じた屋台
      G.rect(120, 120, 144, 5, '#2e2018'); G.rect(124, 125, 4, 50, '#2e2018'); G.rect(256, 125, 4, 50, '#2e2018');
      var drop = Math.min(1, go.t / 1.6);
      for (var k = 0; k < 6; k++) { G.rect(128 + k * 22, 125, 20, Math.round(46 * drop), k % 2 ? '#4a1018' : '#2e0a10'); }
      var a = U.clamp((go.t - 0.8) / 1.0, 0, 1);
      T.draw(GO.title, W / 2, 30, 'red', { align: 'c', size: 32, bold: true, outline: 'ink', alpha: a });
      if (go.t > 1.8) {
        T.draw(GO.l1, W / 2, 78, 'white', { align: 'c', alpha: U.clamp((go.t - 1.8) / 0.8, 0, 1), outline: 'ink' });
        T.draw(GO.l2, W / 2, 94, 'cream', { align: 'c', alpha: U.clamp((go.t - 2.3) / 0.8, 0, 1), outline: 'ink' });
      }
      if (go.t > 3) { UI.panel(118, 136, 148, 58, {}); go.menu.draw(); }
      UI.softkeys('', '', '', { noInput: true });
    }
  });
})(window.RP);
