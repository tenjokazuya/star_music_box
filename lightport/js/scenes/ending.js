/* ending.js — エンディング: 制作者表記（PRODUCED BY 天上 和哉）と THE END。そのあとタイトルへ */
(function () {
  'use strict';

  var W = Game.W, H = Game.H, F = Game.font, util = Game.util;

  var ending = Game.scenes.ending = {
    t: 0, phase: 0, stars: [], done: false,
    enter: function () {
      this.t = 0; this.phase = 0; this.done = false;
      var r = util.rng(9);
      this.stars = [];
      for (var i = 0; i < 70; i++) { this.stars.push({ x: r.int(W), y: r.int(H), ph: r.int(100), v: 0.1 + r.int(5) * 0.05 }); }
      Game.ui.reset();
      Game.gfx.setFade(1, '#000000');
      Game.gfx.fadeIn(60);
      Game.audio.bgm('ending', { fade: 0.2 });
      Game.audio.ambient(['sea']);
      Game.input.clear();
    },
    update: function () {
      this.t++;
      var t = this.t;
      // 進行: 0 星空 → 1 制作者表記 → 2 THE END → 3 入力待ち
      if (this.phase === 0 && t > 150) { this.phase = 1; this.t = 0; }
      else if (this.phase === 1 && t > 420) { this.phase = 2; this.t = 0; }
      else if (this.phase === 2 && t > 200) { this.phase = 3; this.t = 0; }
      else if (this.phase === 3 && t > 40 && (Game.input.pressed('a') || Game.input.pressed('start')) && !this.done) {
        this.done = true;
        Game.audio.sfx('ok');
        Game.gfx.fadeOut(40, '#000000').then(function () { Game.scenes.toTitle(); });
      }
      if (this.phase === 1 && t === 1) { Game.audio.sfx('star', { vol: 0.8 }); }
    },
    draw: function (g) {
      var t = this.t, ph = this.phase;
      // 空
      g.fillStyle = '#0a1038'; g.fillRect(0, 0, W, H);
      var bands = ['#0a1038', '#0e1646', '#121e54', '#182a64', '#1e3274'];
      for (var i = 0; i < bands.length; i++) { g.fillStyle = bands[i]; g.fillRect(0, i * 32, W, 32); }
      // 星（ゆっくり流れる）
      var total = (ph === 0 ? t : 150 + 600);
      this.stars.forEach(function (s) {
        var x = (s.x - total * s.v * 0.15 + W * 10) % W;
        var a = Math.sin((total + s.ph * 4) / 20);
        g.fillStyle = a > 0.5 ? '#ffffff' : (a > -0.3 ? '#a8b4ff' : '#4a5498');
        g.fillRect(Math.floor(x), s.y, 1, 1);
        if (s.v > 0.3 && a > 0.5) { g.fillRect(Math.floor(x) - 1, s.y, 3, 1); g.fillRect(Math.floor(x), s.y - 1, 1, 3); }
      });
      // 灯台のひかりの筋
      var beam = Math.sin(total / 120) * 0.5;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,236,160,0.05)';
      g.beginPath(); g.moveTo(W + 20, H - 20); g.lineTo(0, 50 + beam * 80); g.lineTo(0, 90 + beam * 80); g.closePath(); g.fill();
      g.globalCompositeOperation = 'source-over';

      // 制作者表記（これが唯一の制作者表記）
      if (ph === 1 || ph === 2 || ph === 3) {
        var k = ph === 1 ? Math.min(1, t / 60) : (ph === 2 && t > 120 ? Math.max(0, 1 - (t - 120) / 60) : 1);
        if (ph === 3) { k = 0; }
        g.globalAlpha = Math.ceil(k * 8) / 8;
        var label = 'PRODUCED BY', kanji = '天上 和哉';
        var lw = F.width(label), kw = F.bigWidth(kanji);
        var total2 = lw + 10 + kw, x0 = Math.floor((W - total2) / 2);
        F.draw(g, label, x0, 69, '#e8ecff', { shadow: '#04062a' });
        F.drawBigText(g, kanji, x0 + lw + 10 + 1, 66 + 1, '#04062a');
        F.drawBigText(g, kanji, x0 + lw + 10, 66, '#fff0b8');
        g.globalAlpha = 1;
      }
      if (ph === 2 || ph === 3) {
        var k2 = ph === 2 ? Math.min(1, Math.max(0, (t - 100) / 40)) : 1;
        g.globalAlpha = Math.ceil(k2 * 8) / 8;
        // THE END（2 倍）
        var small = Game.gfx.create(60, 14);
        F.draw(small.g, 'THE END', 1, 3, '#ffffff');
        g.drawImage(small.canvas, 0, 0, 60, 14, W / 2 - 42 + 2, 64 + 2, 120, 28);
        var big = Game.gfx.recolor(small.canvas, '#fff0b8');
        g.drawImage(Game.gfx.recolor(small.canvas, '#04062a'), 0, 0, 60, 14, W / 2 - 42 + 2, 64 + 2, 120, 28);
        g.drawImage(big, 0, 0, 60, 14, W / 2 - 42, 64, 120, 28);
        g.globalAlpha = 1;
        if (ph === 3 && Math.floor(t / 24) % 2 === 0) { F.draw(g, 'PRESS START', W / 2, 130, '#a8b4ff', { align: 'center', shadow: '#04062a' }); }
      }
    }
  };

  /** エンディングを始める（フィールドからの切り替え） */
  Game.scenes.startEnding = function () {
    Game.state.cleared = true;
    Game.save.commit();
    return Game.gfx.fadeOut(40, '#000000').then(function () {
      Game.scenes.replace(Game.scenes.ending);
    });
  };

  /** タイトルへ戻る（状態を捨てる） */
  Game.scenes.toTitle = function () {
    Game.audio.bgm(null, { fade: 0.6 });
    Game.audio.ambient([]);
    return Game.gfx.fadeOut(24, '#000000').then(function () {
      Game.ui.reset();
      Game.scenes.replace(Game.scenes.title);
    });
  };
})();
