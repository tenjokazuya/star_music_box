/* title.js — タイトル画面: 夜の海、消えたままの灯台、沖に小さな灯り（父の船）、ロゴ、PRESS START */
(function () {
  'use strict';

  var W = Game.W, H = Game.H, util = Game.util, F = Game.font;
  var built = null;

  /** 文字を n 倍にして、縁取りと色をつけた絵にする */
  function bigText(str, scale, top, bottom, edge) {
    var w = F.width(str), h = 14;
    var small = Game.gfx.create(w + 2, h);
    F.draw(small.g, str, 1, 4, '#ffffff');
    var bw = (w + 2) * scale, bh = h * scale;
    var big = Game.gfx.create(bw + 8, bh + 8);
    // 拡大したマスク
    var mask = Game.gfx.create(bw, bh);
    mask.g.drawImage(small.canvas, 0, 0, w + 2, h, 0, 0, bw, bh);
    // 縁取り
    var edgeCv = Game.gfx.recolor(mask.canvas, edge);
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1], [-2, 0], [2, 0], [0, 2], [0, -2]].forEach(function (o) {
      big.g.drawImage(edgeCv, 4 + o[0], 4 + o[1]);
    });
    big.g.drawImage(Game.gfx.recolor(mask.canvas, '#1a1030'), 5, 7);
    // 色（上下 2 段のグラデーション）。source-in は描くたびに外側を消すので、色の絵を作ってから 1 回で重ねる
    var grad = Game.gfx.create(bw, bh);
    for (var y = 0; y < bh; y++) {
      var k = y / bh;
      grad.g.fillStyle = k < 0.45 ? top : (k < 0.62 ? util.mix(top, bottom, 0.5) : bottom);
      grad.g.fillRect(0, y, bw, 1);
    }
    var col = Game.gfx.create(bw, bh);
    col.g.drawImage(mask.canvas, 0, 0);
    col.g.globalCompositeOperation = 'source-in';
    col.g.drawImage(grad.canvas, 0, 0);
    big.g.drawImage(col.canvas, 4, 4);
    // ハイライト（上端の 1 段）
    var hiSrc = Game.gfx.create(bw, bh);
    hiSrc.g.fillStyle = 'rgba(255,255,255,0.55)'; hiSrc.g.fillRect(0, 0, bw, scale);
    var hi = Game.gfx.create(bw, bh);
    hi.g.drawImage(mask.canvas, 0, 0);
    hi.g.globalCompositeOperation = 'source-in';
    hi.g.drawImage(hiSrc.canvas, 0, 0);
    big.g.drawImage(hi.canvas, 4, 4);
    return big.canvas;
  }

  function buildStatic() {
    var r = util.rng(1234);
    // 空
    var sky = Game.gfx.create(W, H);
    var bands = ['#080c30', '#0c1240', '#101a50', '#16235f', '#1e2f70', '#2a3c80', '#3a4a90', '#4e5a9e', '#6a6aac', '#8a7ab4', '#a88cb8', '#c89cb8'];
    for (var i = 0; i < bands.length; i++) {
      var y0 = Math.round(i * 104 / bands.length), y1 = Math.round((i + 1) * 104 / bands.length);
      sky.g.fillStyle = bands[i]; sky.g.fillRect(0, y0, W, y1 - y0);
      if (i > 0) {   // 境目を市松でなじませる
        sky.g.fillStyle = bands[i - 1];
        for (var x = 0; x < W; x += 2) { sky.g.fillRect(x + (y0 % 2), y0, 1, 1); sky.g.fillRect(x + ((y0 + 1) % 2), y0 + 1, 1, 1); }
      }
    }
    // 雲（ほそい横ながの影）
    sky.g.fillStyle = 'rgba(40,40,100,0.35)';
    [[10, 62, 70, 3], [90, 70, 60, 2], [150, 54, 80, 3], [30, 84, 90, 2]].forEach(function (c) { sky.g.fillRect(c[0], c[1], c[2], c[3]); sky.g.fillRect(c[0] + 6, c[1] - 1, c[2] - 20, 1); });
    // 月
    var mx = 150, my = 80;
    [[16, 'rgba(255,240,190,0.05)'], [13, 'rgba(255,240,190,0.07)'], [10, 'rgba(255,240,190,0.10)']].forEach(function (h) {
      sky.g.fillStyle = h[1]; for (var yy = -h[0]; yy <= h[0]; yy++) { var ww = Math.floor(Math.sqrt(h[0] * h[0] - yy * yy)); sky.g.fillRect(mx - ww, my + yy, ww * 2 + 1, 1); }
    });
    Game.gfx.disc(sky.g, mx, my, 8, '#fff2c8'); Game.gfx.disc(sky.g, mx + 2, my + 1, 6, '#fffbe6');
    sky.g.fillStyle = '#e8d8a8'; sky.g.fillRect(mx - 4, my - 2, 2, 2); sky.g.fillRect(mx + 1, my + 3, 3, 2); sky.g.fillRect(mx - 2, my + 4, 2, 1);
    // 星
    var stars = [];
    for (var s = 0; s < 46; s++) { stars.push({ x: r.int(W), y: r.int(88), ph: r.int(100), big: s % 9 === 0 }); }
    // 海のもと
    var sea = Game.gfx.create(W, H);
    sea.g.fillStyle = '#1a3480'; sea.g.fillRect(0, 104, W, 56);
    for (var y = 104; y < 160; y++) {
      var k = (y - 104) / 56;
      sea.g.fillStyle = k < 0.15 ? '#24489a' : (k < 0.4 ? '#1d3c8a' : (k < 0.7 ? '#173078' : '#122668'));
      sea.g.fillRect(0, y, W, 1);
    }
    // 崖（右）
    var cl = Game.gfx.create(W, H);
    cl.g.fillStyle = '#0c0f26';
    var pts = [[140, 160], [150, 140], [162, 128], [176, 120], [190, 116], [214, 114], [240, 112], [240, 160]];
    cl.g.beginPath(); cl.g.moveTo(pts[0][0], pts[0][1]);
    pts.forEach(function (p) { cl.g.lineTo(p[0], p[1]); });
    cl.g.closePath(); cl.g.fill();
    // 崖のふち（かすかな明かり）
    cl.g.fillStyle = '#242a58';
    for (var px = 176; px < 240; px += 1) { var cy = px < 190 ? 120 - Math.floor((px - 176) / 4) : (px < 214 ? 116 : 114 - Math.floor((px - 214) / 12)); cl.g.fillRect(px, cy, 1, 1); }
    for (var q = 150; q < 176; q++) { cl.g.fillRect(q, 140 - Math.floor((q - 150) * 0.7), 1, 1); }
    return { sky: sky.canvas, stars: stars, sea: sea.canvas, cliff: cl.canvas, mx: mx, my: my };
  }

  function drawLighthouse(g, lit, t) {
    var cx = 206, base = 116;
    // とうしん
    g.fillStyle = '#10142e';
    for (var y = 0; y < 52; y++) {
      var half = 5 + Math.floor(y * 3.2 / 52);
      g.fillRect(cx - half, base - 52 + y, half * 2, 1);
    }
    g.fillStyle = '#242c5c';
    for (var y2 = 0; y2 < 52; y2++) { var h2 = 5 + Math.floor(y2 * 3.2 / 52); g.fillRect(cx - h2, base - 52 + y2, 1, 1); }
    // しま
    g.fillStyle = '#1a2048';
    [10, 26, 42].forEach(function (o) { var h3 = 5 + Math.floor(o * 3.2 / 52); g.fillRect(cx - h3, base - 52 + o, h3 * 2, 4); });
    // ろうか・とうろう室
    g.fillStyle = '#10142e';
    g.fillRect(cx - 9, base - 56, 18, 4);
    g.fillRect(cx - 6, base - 66, 12, 10);
    g.fillRect(cx - 8, base - 69, 16, 3);
    g.fillRect(cx - 4, base - 73, 8, 4);
    g.fillRect(cx - 1, base - 76, 2, 3);
    if (lit) {
      g.fillStyle = '#fff6c0'; g.fillRect(cx - 5, base - 65, 10, 8);
      g.fillStyle = '#ffffff'; g.fillRect(cx - 3, base - 64, 6, 4);
      g.fillStyle = '#10142e'; g.fillRect(cx - 1, base - 65, 2, 8);
    } else {
      // 消えたままの灯台: ほんの少しだけ反射が見える
      g.fillStyle = '#2c3470'; g.fillRect(cx - 5, base - 65, 10, 8);
      g.fillStyle = '#10142e'; g.fillRect(cx - 1, base - 65, 2, 8);
      g.fillStyle = '#3a4488'; g.fillRect(cx - 4, base - 64, 2, 1);
    }
    // まど
    g.fillStyle = lit ? '#fff0a0' : '#1c2250';
    g.fillRect(cx - 1, base - 36, 3, 5); g.fillRect(cx - 1, base - 18, 3, 5);
  }

  function drawBeam(g, t) {
    var x0 = 206, y0 = 116 - 61;
    var ang = Math.sin(t / 150) * 0.9 - 0.2;
    g.globalCompositeOperation = 'lighter';
    [[0.16, 0.06], [0.10, 0.07], [0.05, 0.09]].forEach(function (w) {
      [0, Math.PI].forEach(function (off) {
        var a = ang + off;
        g.fillStyle = 'rgba(255,240,170,' + w[1] + ')';
        g.beginPath(); g.moveTo(x0, y0);
        g.lineTo(x0 + Math.cos(a - w[0]) * 300, y0 + Math.sin(a - w[0]) * 90 + 14);
        g.lineTo(x0 + Math.cos(a + w[0]) * 300, y0 + Math.sin(a + w[0]) * 90 + 14);
        g.closePath(); g.fill();
      });
    });
    g.globalCompositeOperation = 'source-over';
  }

  var title = Game.scenes.title = {
    t: 0, phase: 'wait', logo1: null, logo2: null, lit: false,
    enter: function () {
      if (!built) { built = buildStatic(); }
      if (!this.logo1) {
        this.logo1 = bigText('ともしびの', 3, '#fff0b0', '#f0a040', '#1a1650');
        this.logo2 = bigText('みなと', 3, '#fff0b0', '#f0a040', '#1a1650');
      }
      this.t = 0; this.phase = 'wait';
      this.lit = Game.save.list().some(function (s) { return s && s.cleared; });
      Game.ui.reset();
      Game.audio.bgm('title', { fade: 0.4 });
      Game.audio.ambient(['sea', 'night']);
      Game.gfx.setFade(1, '#000000');
      Game.gfx.fadeIn(50);
      Game.input.clear();
    },
    update: function () {
      this.t++;
      if (this.phase === 'wait' && this.t > 30 && (Game.input.pressed('a') || Game.input.pressed('start'))) {
        this.phase = 'go'; this.goT = 0;
        Game.audio.sfx('title_start');
        Game.gfx.flash('#fff6d0', 24, 0.7);
      }
      if (this.phase === 'go') {
        this.goT++;
        if (this.goT === 24) {
          Game.gfx.fadeOut(22, '#000000').then(function () { Game.scenes.replace(Game.scenes.saveselect); });
        }
      }
    },
    draw: function (g) {
      var t = this.t;
      g.drawImage(built.sky, 0, 0);
      // 星
      built.stars.forEach(function (s) {
        var a = Math.sin((t + s.ph * 3) / 18);
        if (a < -0.55) { return; }
        g.fillStyle = a > 0.6 ? '#ffffff' : '#c8d0ff';
        g.fillRect(s.x, s.y, 1, 1);
        if (s.big && a > 0.2) { g.fillStyle = '#8890e0'; g.fillRect(s.x - 1, s.y, 3, 1); g.fillRect(s.x, s.y - 1, 1, 3); }
      });
      // 海
      g.drawImage(built.sea, 0, 0);
      for (var y = 106; y < 160; y += 3) {
        var k = (y - 104) / 56;
        for (var x = 0; x < W; x += 1) {
          var v = (x * 0.9 + y * 5 + t * (0.4 + k * 0.5)) % 22;
          if (v < 3.2 && ((y / 3) | 0) % 2 === (x >> 5) % 2) {
            g.fillStyle = k < 0.3 ? '#4a6ec0' : '#2c50a4';
            g.fillRect(x, y, 1, 1);
          }
        }
      }
      // 月の道
      for (var my = 106; my < 150; my += 2) {
        var spread = 3 + (my - 104) * 0.22;
        var off = Math.sin((my + t * 0.7) / 3) * spread;
        var w = Math.max(1, Math.round(6 - (my - 104) * 0.08 + Math.sin((my * 3 + t * 0.3) / 5) * 2));
        g.fillStyle = my < 120 ? '#fff2c8' : '#d8c890';
        g.fillRect(Math.round(built.mx + off - w / 2), my, w, 1);
      }
      // 沖の灯り（父の船）
      var bob = Math.round(Math.sin(t / 30) * 1);
      g.fillStyle = '#0c1232'; g.fillRect(96, 106 + bob, 9, 2); g.fillRect(98, 104 + bob, 5, 2); g.fillRect(100, 100 + bob, 1, 4);
      var fl = (t % 70) < 4 ? 0 : 1;
      if (fl) { g.fillStyle = '#ffd860'; g.fillRect(100, 98 + bob, 1, 2); g.fillStyle = 'rgba(255,216,96,0.28)'; g.fillRect(98, 97 + bob, 5, 4); g.fillRect(99, 95 + bob, 3, 8); }
      // 崖と灯台
      g.drawImage(built.cliff, 0, 0);
      drawLighthouse(g, this.lit, t);
      if (this.lit) { drawBeam(g, t); }
      // ロゴ
      var drop = Math.min(1, this.t / 40);
      var oy = Math.round((1 - Game.util.ease.outBounce(drop)) * -60);
      g.drawImage(this.logo1, 8, 6 + oy);
      g.drawImage(this.logo2, 8, 40 + Math.round((1 - Game.util.ease.outBounce(Math.max(0, Math.min(1, (this.t - 12) / 40)))) * -90));
      // キラリ
      if (this.t > 60) {
        var sp = (this.t - 60) % 160;
        if (sp < 14) {
          var sx = 18 + Math.floor((sp / 14) * 150), sy = 14 + ((sp * 3) % 5);
          g.fillStyle = '#ffffff'; g.fillRect(sx, sy, 1, 1); g.fillRect(sx - 2, sy, 5, 1); g.fillRect(sx, sy - 2, 1, 5);
        }
      }
      // PRESS START
      if (this.t > 50 && (Math.floor(this.t / 24) % 2 === 0 || this.phase !== 'wait')) {
        var label = Game.input.device === 'touch' ? 'TAP  A  BUTTON' : 'PRESS START';
        F.draw(g, label, W / 2, 136, '#ffffff', { align: 'center', shadow: '#0a0e24' });
      }
      if (this.lit && this.t > 50) { F.draw(g, '★', 8, 146, '#ffd860'); }
    }
  };
})();
