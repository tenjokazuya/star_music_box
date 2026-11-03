/* エンディング：全国チェーン「天下一」への出世。花火・紙吹雪・これまでの歩み・スタッフロール。
 * 終わったらエンディング後の世界（同じ店を継続）へ。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx;
  var W = RP.W, H = RP.H;

  var E = null;

  // 段階: 0=祝福の花火 1=これまでの歩み 2=スタッフロール 3=おしまい
  function enter(args) {
    var st = RP.game.state;
    E = { t: 0, phase: 0, pt: 0, st: st, first: !!(args && args.first), roll: 0, skipHint: 0, fw: 0, bgt: 0, fin: false };
    var s = st.stats;
    E.history = [
      '屋台を引いて、' + (s.days + 1) + '日。',
      U.comma(s.served) + '杯のラーメンを、お客さんに届けた。',
      'PERFECT（★3）は ' + U.comma(s.perfect) + ' 回。',
      '最高のコンボは ' + s.bestCombo + ' 連。',
      s.angry ? '怒らせてしまったお客さんも ' + U.comma(s.angry) + ' 人いた。' : '一人も怒らせなかった奇跡の屋台だ。',
      s.bankrupt ? '倒産の危機から ' + s.bankrupt + ' 回、立ち上がった。' : '一度も倒産しなかった。',
      'ガード下の灯りが、いまや全国の灯りとなった。'
    ];
    E.credits = [
      ['ラーメンパニック', '～屋台から天下一へ～'],
      ['ゲームデザイン・プログラム・ドット絵・音楽', 'Claude (Anthropic)'],
      ['企画・監修', 'あなた'],
      ['特別出演', '屋台に通ってくれたすべてのお客さん'],
      ['', ''],
      ['ご来店、ありがとうございました', '']
    ];
    RP.music.play('ending', { fade: 0.4 });
    RP.audio.ambience({ city: 0.3, cricket: 0.4, chime: 0.6 });
    RP.audio.loopsOff();
    UI.se('fanfareBig');
    FX.reset();
    FX.flash('#ffffff', 0.8, 0.9);
    FX.rainConfetti(120);
  }

  function launchFirework(x, y) {
    var cols = [['red', 'yellow', 'white'], ['cyan', 'white', 'lime'], ['pink', 'yellow', 'orange'], ['yellow', 'orange', 'white']];
    FX.burst(x, y, 46, { speed: 85, cols: cols[Math.floor(Math.random() * cols.length)], gravity: 35, life: 1.4, size: 1 });
    FX.ring(x, y, 'white', 14);
    UI.se('firework');
  }

  function update(dt) {
    E.t += dt; E.pt += dt; E.bgt += dt;
    // 花火は全期間で打ち上げ続ける
    E.fw -= dt;
    if (E.fw <= 0) { E.fw = 0.6 + Math.random() * 0.9; launchFirework(40 + Math.random() * 300, 30 + Math.random() * 70); }
    if (Math.random() < dt * 4) { FX.rainConfetti(2); }
    var adv = I.taps.length > 0 || I.pressed('ok');
    if (E.phase === 0) {
      if (E.pt > 5.5 || (adv && E.pt > 1.2)) { E.phase = 1; E.pt = 0; UI.se('select'); }
    } else if (E.phase === 1) {
      var total = E.history.length;
      var shown = Math.min(total, Math.floor(E.pt / 1.6));
      if (adv && E.pt > 0.8) {
        if (shown < total) { E.pt = (shown + 1) * 1.6; UI.se('select'); }
        else { E.phase = 2; E.pt = 0; E.roll = 0; }
      }
      if (E.pt > total * 1.6 + 2.5) { E.phase = 2; E.pt = 0; }
    } else if (E.phase === 2) {
      E.roll += dt * (I.held('ok') || I.downPoints().length ? 60 : 22);
      if (E.roll > E.credits.length * 46 + 120) { E.phase = 3; E.pt = 0; UI.se('fanfare'); }
      if (I.pressed('cancel')) { E.phase = 3; E.pt = 0; UI.se('fanfare'); }
    } else if (E.phase === 3) {
      if (E.pt > 1.5 && adv) { finish(); }
    }
  }

  function finish() {
    if (E.fin) { return; }
    E.fin = true;
    var st = RP.game.state;
    st.flags.endingSeen = true;
    RP.game.save();
    UI.se('ok');
    RP.scene.go('morning', { afterEnding: true }, { trans: 'noren', dur: 1.0 });
  }

  function skyline() {
    // 祝賀の夜空
    G.vgrad(0, 0, W, H, '#0a0830', '#4a2858', 12);
    for (var i = 0; i < 30; i++) {
      G.alpha(0.5 + 0.5 * Math.sin(E.bgt * 2 + i)); G.px((i * 53) % W, (i * 31) % 100, 'white'); G.alpha(1);
    }
    // 都会のビル群と本社ビル
    var r = new RP.Rng(99), x = 0;
    while (x < W) {
      var w = 14 + Math.floor(r.next() * 16), h = 30 + Math.floor(r.next() * 60);
      G.rect(x, H - 40 - h, w, h + 40, '#1c1840');
      for (var yy = H - 36 - h; yy < H - 44; yy += 7) { for (var xx = x + 3; xx < x + w - 3; xx += 5) { if (r.next() < 0.6) { G.rect(xx, yy, 2, 3, r.next() < 0.3 ? '#a8e0ff' : '#ffd870'); } } }
      x += w + 2;
    }
    // 中央の本社ビル
    G.rect(150, 70, 84, H - 70, '#2e2658'); G.rect(150, 70, 84, 3, '#d8382c');
    G.rect(158, 82, 68, 14, '#8c1f2a'); G.rect(159, 83, 66, 12, '#d8382c');
    T.draw('天下一', 192, 83, 'yellow', { align: 'c', outline: 'ink', bold: true });
    for (var by = 102; by < H - 42; by += 8) { for (var bx = 156; bx < 228; bx += 8) { G.rect(bx, by, 4, 4, (bx + by + Math.floor(E.bgt * 2)) % 5 === 0 ? '#ffd870' : '#6a5a9a'); } }
    G.rect(0, H - 40, W, 40, '#14101c');
    // 通りの人だかり（祝福）
    for (var k = 0; k < 14; k++) {
      var px = 10 + k * 27, bob = Math.floor(E.bgt * 3 + k) % 2;
      G.sprite('queue_fig', px, H - 38 - bob, { pal: { C: ['#d8382c', '#3c6cd0', '#48b04c', '#f8d848', '#f08ca8'][k % 5], s: 'skin' } });
    }
  }

  function draw() {
    skyline();
    var cx = W / 2;
    if (E.phase === 0) {
      var k = U.clamp(E.pt / 1.2, 0, 1);
      UI.big('天下一ラーメン', cx, 36 - (1 - k) * 30, 'yellow', { size: 32 });
      if (E.pt > 1.4) { UI.big('ついに、頂点へ！', cx, 80, 'orange', { size: 24, outline: 'maroon' }); }
      if (E.pt > 2.6) { T.draw('ガード下の屋台から、日本一のラーメン王国へ。', cx, 118, 'white', { align: 'c', outline: 'ink' }); }
      if (E.pt > 3.6) { T.draw('あなたは、業界の大手となった！', cx, 134, 'cream', { align: 'c', outline: 'ink' }); }
    } else if (E.phase === 1) {
      G.alpha(0.7); G.rect(0, 20, W, 176, 'ink'); G.alpha(1);
      T.draw('これまでの歩み', cx, 28, 'yellow', { align: 'c', size: 16, outline: 'ink' });
      var shown = Math.min(E.history.length, Math.floor(E.pt / 1.6) + 1);
      for (var i = 0; i < shown; i++) {
        var a = U.clamp((E.pt - i * 1.6) / 0.6, 0, 1);
        T.draw(E.history[i], cx, 56 + i * 18, 'white', { align: 'c', alpha: a });
      }
    } else if (E.phase === 2) {
      G.alpha(0.6); G.rect(0, 0, W, H, 'ink'); G.alpha(1);
      var y0 = H - E.roll;
      E.credits.forEach(function (c, i) {
        var y = y0 + i * 46;
        if (y < -20 || y > H) { return; }
        if (i === 0) { UI.big(c[0], cx, y, 'yellow', { size: 24 }); T.draw(c[1], cx, y + 28, 'cream', { align: 'c' }); }
        else { T.draw(c[0], cx, y, 'silver', { align: 'c', size: 10 }); T.draw(c[1], cx, y + 14, 'white', { align: 'c', size: 12 }); }
      });
    } else {
      G.alpha(0.55); G.rect(0, 0, W, H, 'ink'); G.alpha(1);
      UI.big('おしまい', cx, 60, 'yellow', { size: 32 });
      T.draw('でも、ラーメン屋の物語は終わらない。', cx, 108, 'white', { align: 'c', outline: 'ink' });
      T.draw('これからも、あなたの店で。', cx, 124, 'cream', { align: 'c', outline: 'ink' });
      if (E.pt > 1.5 && Math.floor(E.t * 2) % 2 === 0) { T.draw('タップで エンディング後の世界へ', cx, 170, 'yellow', { align: 'c', outline: 'ink' }); }
    }
    UI.softkeys('', E.phase < 3 ? 'タップで進める' : '', '', { noInput: true, rightCol: 'silver' });
  }

  RP.scene.register('ending', { enter: enter, update: update, draw: draw });
})(window.RP);
