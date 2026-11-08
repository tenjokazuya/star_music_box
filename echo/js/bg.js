/* bg.js ― ステージ背景：多重スクロール / 疑似モード7 / ラスター揺らぎ / ワープ線 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, U = EB.U, G = EB.Gfx, Art = EB.Art;
  var FW = CFG.FW, FH = CFG.FH;

  function cv(w, h) { return G.mkCanvas(w, h); }

  // 縦グラデーション（帯＋ディザ）
  function bandGradient(w, h, stops, step) {
    var c = cv(w, h), x = c.getContext('2d');
    step = step || 4;
    function colAt(t) {
      for (var i = 0; i < stops.length - 1; i++) {
        if (t <= stops[i + 1][0]) { var k = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]); return U.mix(stops[i][1], stops[i + 1][1], U.clamp(k, 0, 1)); }
      }
      return stops[stops.length - 1][1];
    }
    for (var y = 0; y < h; y += step) {
      x.fillStyle = colAt(y / h); x.fillRect(0, y, w, step);
      var c2 = colAt(Math.min(1, (y + step) / h));
      x.fillStyle = c2;
      for (var j = 0; j < 2; j++) for (var i = (j & 1); i < w; i += 2) x.fillRect(i, y + step - 2 + j, 1, 1);
    }
    return c;
  }

  // 星
  function Stars(seed, n, speeds, colors) {
    var r = U.makeRng(seed);
    this.s = []; this.speeds = speeds; this.colors = colors;
    for (var i = 0; i < n; i++) this.s.push({ x: r.int(0, FW - 1), y: r.int(0, FH - 1), l: i % speeds.length, p: r.int(0, 60) });
  }
  Stars.prototype.update = function (m) {
    for (var i = 0; i < this.s.length; i++) {
      var s = this.s[i]; s.y += this.speeds[s.l] * m;
      if (s.y >= FH) { s.y -= FH; }
    }
  };
  Stars.prototype.draw = function (ctx, t) {
    for (var i = 0; i < this.s.length; i++) {
      var s = this.s[i], tw = ((t + s.p) >> 4) % 5 === 0;
      ctx.fillStyle = tw ? '#ffffff' : this.colors[s.l];
      var sz = s.l === this.speeds.length - 1 ? 2 : 1;
      ctx.fillRect(s.x, Math.round(s.y), sz, sz);
      if (s.l === this.speeds.length - 1 && tw) { ctx.fillRect(s.x - 1, Math.round(s.y), 4, 1); }
    }
  };

  // 垂直タイル描画
  function tileV(ctx, img, off, x, w) {
    var h = img.height, y = -(((off % h) + h) % h);
    for (; y < FH; y += h) ctx.drawImage(img, x || 0, Math.round(y));
  }

  // 背景色に溶け込ませる（霞）。色を背景に寄せて明度とコントラストを落とす。敵や弾と誤認させないための処理。
  function haze(s, color, alpha) {
    var c = cv(s.w, s.h), x = c.getContext('2d');
    x.drawImage(s.c, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = alpha; x.fillStyle = color; x.fillRect(0, 0, s.w, s.h);
    return { c: c, w: s.w, h: s.h, ox: s.ox, oy: s.oy };
  }

  // 岩・瓦礫スプライト（輪郭線は付けない：敵スプライトの黒縁と区別する）
  function rock(r, seed, ramp) {
    var rng = U.makeRng(seed), S = Math.ceil(r * 2 + 4);
    return G.make(S, S, function (P) {
      var c = S / 2, pts = [], n = 11;
      for (var i = 0; i < n; i++) { var a = i / n * U.TAU, rr = r * rng.range(0.72, 1.0); pts.push([c + Math.cos(a) * rr, c + Math.sin(a) * rr]); }
      P.poly(pts, ramp);
      for (var k = 0; k < Math.max(2, r / 5); k++) P.ell(c + rng.range(-r * 0.5, r * 0.5), c + rng.range(-r * 0.5, r * 0.5), rng.range(1.2, r * 0.22), rng.range(1, r * 0.2), 'iron');
    }, { outline: false });
  }
  function girder(len, seed) {
    return G.make(8, len, function (P) {
      P.rect(0, 0, 8, len, 'steel'); P.rect(2, 0, 4, len, 'iron');
      for (var y = 3; y < len; y += 8) P.line(0, y, 7, y + 6, 'steel');
    }, { outline: false });
  }

  // ================= 各ステージ =================
  var BGs = {};

  // --- 1: 宇宙空間・コロニー残骸 ---
  BGs[0] = function () {
    var self = { t: 0, off: 0 };
    var back = bandGradient(FW, FH, [[0, '#04061a'], [0.6, '#0a1038'], [1, '#18205a']], 4);
    var stars = new Stars(11, 90, [0.15, 0.35, 0.7], ['#4a5a9a', '#8aa0e0', '#cfe0ff']);
    var planet = haze(EB.Planet(46, { seed: 5, ocean: [40, 70, 160], land: [90, 140, 80], cloud: true, light: [-0.7, -0.4] }), '#0a1038', 0.4);
    var rocks = [], debris = [], r = U.makeRng(31), i;
    for (i = 0; i < 3; i++) rocks.push({ s: haze(rock(r.int(8, 14), 100 + i, 'iron'), '#0a1038', 0.62), x: r.int(10, FW - 10), y: r.int(0, 700), v: r.range(0.3, 0.5) });
    for (i = 0; i < 2; i++) debris.push({ s: haze(girder(r.int(20, 40), i), '#0a1038', 0.7), x: r.int(10, FW - 10), y: r.int(0, 800), v: r.range(0.2, 0.35), rot: 0 });
    self.update = function (m) {
      self.t++; self.off += m; stars.update(m);
      rocks.forEach(function (o) { o.y += o.v * m; if (o.y > FH + 30) { o.y = -r.int(60, 500); o.x = r.int(10, FW - 10); } });
      debris.forEach(function (o) { o.y += o.v * m; if (o.y > FH + 60) { o.y = -r.int(80, 600); o.x = r.int(10, FW - 10); } });
    };
    self.draw = function (ctx) {
      ctx.drawImage(back, 0, 0);
      stars.draw(ctx, self.t);
      var py = ((self.off * 0.08) % (FH + 140)) - 70;
      ctx.drawImage(planet.c, 100, Math.round(py));
      debris.forEach(function (o) { ctx.drawImage(o.s.c, Math.round(o.x), Math.round(o.y)); });
      rocks.forEach(function (o) { ctx.drawImage(o.s.c, Math.round(o.x - o.s.ox), Math.round(o.y - o.s.oy)); });
    };
    return self;
  };

  // --- 2: 海洋惑星（疑似モード7） ---
  function tnoise(x, y, P, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    function h(a, b) { return Art.hash(((a % P) + P) % P, ((b % P) + P) % P, seed); }
    var a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function makeOceanTex() {
    var S = 256, c = cv(S * 2, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    var pal = [[8, 20, 64], [12, 30, 86], [16, 44, 112], [24, 62, 140], [44, 96, 176], [150, 196, 236]];
    for (var y = 0; y < S; y++) for (var xx = 0; xx < S; xx++) {
      var n = tnoise(xx / 32, y / 32, 8, 3) * 0.6 + tnoise(xx / 16, y / 16, 16, 4) * 0.3 + tnoise(xx / 8, y / 8, 32, 5) * 0.1;
      var wave = Math.sin((xx + y * 0.5) * 0.35 + n * 8) * 0.5 + 0.5;
      var v = n * 0.8 + wave * 0.25, idx = Math.min(5, Math.floor(v * 5.2));
      var col = pal[Math.max(0, Math.min(4, idx))];
      if (wave > 0.975 && n > 0.5) col = pal[5];
      var isl = tnoise(xx / 40, y / 40, 6, 9);
      if (isl > 0.76) col = isl > 0.83 ? [40, 100, 56] : [150, 140, 96];
      var i = (y * S + xx) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); x.putImageData(img, S, 0);
    return c;
  }
  function makeCloudTex() {
    var S = 256, c = cv(S * 2, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    for (var y = 0; y < S; y++) for (var xx = 0; xx < S; xx++) {
      var n = tnoise(xx / 28, y / 28, 9, 21) * 0.65 + tnoise(xx / 12, y / 12, 21, 22) * 0.35;
      var i = (y * S + xx) * 4;
      if (n > 0.66) {
        var hi = n > 0.76;
        d[i] = hi ? 200 : 140; d[i + 1] = hi ? 224 : 172; d[i + 2] = hi ? 255 : 214; d[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0); x.putImageData(img, S, 0);
    return c;
  }
  BGs[1] = function () {
    var self = { t: 0, off: 0 };
    var HZ = 34, sky = bandGradient(FW, HZ + 4, [[0, '#16306e'], [0.7, '#4e84c8'], [1, '#a8d0f0']], 3);
    var ocean = makeOceanTex(), cloud = makeCloudTex();
    var fog = bandGradient(FW, 60, [[0, '#a8d0f0'], [0.35, '#5c8cc8'], [1, '#5c8cc8']], 3);
    self.update = function (m) { self.t++; self.off += 0.22 * m; };
    function plane(ctx, tex, scroll, A, Sv, step) {
      for (var sy = HZ; sy < FH; sy++) {
        var dy = sy - HZ + 1, z = A / dy;
        var span = Math.min(256, 77 * z * step), v = ((scroll + z * Sv) % 256 + 256) % 256;
        var u0 = (128 - span / 2 + Math.sin(self.t * 0.004) * 20 + 256) % 256;
        ctx.drawImage(tex, u0, v, span, 1, 0, sy, FW, 1);
      }
    }
    self.draw = function (ctx) {
      ctx.drawImage(sky, 0, 0);
      plane(ctx, ocean, self.off, 120, 75, 1);
      // 霞
      ctx.globalAlpha = 0.9; ctx.drawImage(fog, 0, HZ - 2, FW, 36); ctx.globalAlpha = 1;
      // 雲（別スクロール）
      ctx.globalAlpha = 0.45;
      plane(ctx, cloud, self.off * 1.6 + 40, 160, 70, 1.2);
      ctx.globalAlpha = 1;
      ctx.drawImage(fog, 0, HZ - 6, FW, 14);
    };
    return self;
  };

  // --- 3: 小惑星帯・研究基地 ---
  BGs[2] = function () {
    var self = { t: 0, off: 0 };
    var back = bandGradient(FW, FH, [[0, '#0a0620'], [0.5, '#1a0c3c'], [1, '#2c1456']], 4);
    var stars = new Stars(23, 80, [0.2, 0.45, 0.8], ['#5a4a9a', '#a090e0', '#e8e0ff']);
    var r = U.makeRng(77), layers = [[], [], []], i;
    var sizes = [[4, 8], [7, 12], [10, 17]], speeds = [[0.2, 0.35], [0.4, 0.6], [0.65, 0.9]], counts = [4, 3, 2], hz = [0.72, 0.64, 0.56];
    for (var l = 0; l < 3; l++) for (i = 0; i < counts[l]; i++) layers[l].push({ s: haze(rock(r.int(sizes[l][0], sizes[l][1]), 300 + l * 20 + i, l === 2 ? 'rust' : (l ? 'violet' : 'iron')), '#1a0c3c', hz[l]), x: r.int(0, FW), y: r.int(0, 700), v: r.range(speeds[l][0], speeds[l][1]), rot: 0 });
    var pylon = G.make(14, 64, function (P) {
      P.rect(0, 0, 14, 64, 'iron'); P.rect(3, 0, 8, 64, 'black');
      for (var y = 4; y < 64; y += 10) P.rect(1, y, 12, 3, 'steel');
    }, { outline: false });
    pylon = haze(pylon, '#1a0c3c', 0.62);
    self.update = function (m) {
      self.t++; self.off += m; stars.update(m);
      layers.forEach(function (L) { L.forEach(function (o) { o.y += o.v * m; if (o.y > FH + 40) { o.y = -r.int(40, 500); o.x = r.int(0, FW); } }); });
    };
    self.draw = function (ctx) {
      ctx.drawImage(back, 0, 0);
      stars.draw(ctx, self.t);
      layers.forEach(function (L, li) {
        L.forEach(function (o) { ctx.drawImage(o.s.c, Math.round(o.x - o.s.ox), Math.round(o.y - o.s.oy)); });
      });
      ctx.globalAlpha = 1;
      if (self.base) {
        for (var y = -64 + (self.off * 0.9) % 64; y < FH; y += 64) { ctx.drawImage(pylon.c, -4, Math.round(y)); ctx.drawImage(pylon.c, FW - 10, Math.round(y)); }
      }
    };
    self.base = false;
    return self;
  };

  // --- 4: 恒星環状都市（陽炎ラスター） ---
  function makePlasmaTex() {
    var S = 128, c = cv(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    var pal = [[26, 4, 8], [44, 8, 10], [66, 12, 12], [96, 18, 14], [136, 34, 16], [182, 66, 20], [232, 120, 34]];
    for (var y = 0; y < S; y++) for (var xx = 0; xx < S; xx++) {
      var n = tnoise(xx / 16, y / 16, 8, 41) * 0.55 + tnoise(xx / 8, y / 8, 16, 42) * 0.3 + tnoise(xx / 4, y / 4, 32, 43) * 0.15;
      var col = pal[Math.min(6, Math.floor(n * n * 9))];
      var i = (y * S + xx) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  BGs[3] = function () {
    var self = { t: 0, off: 0 };
    var tex = makePlasmaTex(), buf = cv(FW, FH), bx = buf.getContext('2d');
    var r = U.makeRng(55), ring = [], i;
    for (i = 0; i < 3; i++) ring.push({ s: haze(G.make(r.int(40, 70), r.int(8, 14), function (P) { P.rect(0, 0, P.w, P.h, 'black'); for (var x = 4; x < P.w; x += 9) P.rect(x, 2, 3, P.h - 4, 'rust'); P.rect(0, 0, P.w, 1, 'iron'); }, { outline: false }), '#2a0806', 0.6), x: r.int(-10, FW - 20), y: r.int(0, 700), v: r.range(0.3, 0.55) });
    var arcs = [];
    for (i = 0; i < 2; i++) arcs.push({ x: r.int(20, FW - 20), y: r.int(0, 700), v: r.range(0.25, 0.4), w: r.int(34, 56) });
    self.update = function (m) {
      self.t++; self.off += 0.9 * m;
      ring.forEach(function (o) { o.y += o.v * m; if (o.y > FH + 20) { o.y = -r.int(20, 300); o.x = r.int(-10, FW - 40); } });
      arcs.forEach(function (o) { o.y += o.v * m; if (o.y > FH + 40) { o.y = -r.int(20, 300); o.x = r.int(20, FW - 20); } });
    };
    self.draw = function (ctx) {
      // 合成を一旦バッファへ
      for (var yy = -(self.off % 128); yy < FH; yy += 128) for (var xx = 0; xx < FW; xx += 128) bx.drawImage(tex, xx, Math.round(yy));
      bx.fillStyle = '#200404';
      for (var sy = 0; sy < 72; sy += 6) { bx.globalAlpha = 0.5 * (1 - sy / 72); bx.fillRect(0, sy, FW, 6); }
      bx.globalAlpha = 1;
      // 紅炎アーチ
      bx.fillStyle = '#9a3412';        // 弾(黄/橙)と紛れないよう、背景に近い暗い赤橙
      arcs.forEach(function (o) {
        for (var a = 0; a <= 20; a++) {
          var ang = Math.PI + a / 20 * Math.PI, px = o.x + Math.cos(ang) * o.w * 0.5, py = o.y + Math.sin(ang) * o.w * 0.4 + o.w * 0.4;
          bx.fillRect(Math.round(px), Math.round(py), 2, 2);
        }
      });
      ring.forEach(function (o) { bx.drawImage(o.s.c, Math.round(o.x), Math.round(o.y)); });
      // ラスター揺らぎ
      for (var y = 0; y < FH; y++) {
        var amp = 1.2 + y / FH * 2.2, ox = Math.round(Math.sin(y * 0.13 + self.t * 0.07) * amp);
        ctx.drawImage(buf, 0, y, FW, 1, ox, y, FW, 1);
        if (ox > 0) ctx.drawImage(buf, FW - ox, y, ox, 1, 0, y, ox, 1);
        else if (ox < 0) ctx.drawImage(buf, 0, y, -ox, 1, FW + ox, y, -ox, 1);
      }
    };
    return self;
  };

  // --- 5: 深宇宙・ワープ航路 ---
  function makeNebula() {
    var W = FW, H = 256, c = cv(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    for (var y = 0; y < H; y++) for (var xx = 0; xx < W; xx++) {
      var n = tnoise(xx / 40, y / 40, 6, 61) * 0.6 + tnoise(xx / 16, y / 16, 15, 62) * 0.4;
      var k = Math.max(0, n - 0.42) * 2.2, q = Math.floor(k * 4) / 4;
      var i = (y * W + xx) * 4;
      d[i] = 20 + 120 * q; d[i + 1] = 8 + 30 * q; d[i + 2] = 40 + 110 * q; d[i + 3] = Math.round(220 * Math.min(1, q * 1.4));
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  BGs[4] = function () {
    var self = { t: 0, off: 0, boss: 0 };
    var back = bandGradient(FW, FH, [[0, '#04020e'], [0.5, '#0c0828'], [1, '#180a3a']], 4);
    var neb = makeNebula(), r = U.makeRng(91);
    var stars = new Stars(91, 60, [0.3, 0.7, 1.4], ['#6a60b0', '#b0a8f0', '#ffffff']);
    var streaks = [], i;
    for (i = 0; i < 44; i++) streaks.push({ x: r.int(0, FW), y: r.int(0, FH), v: r.range(4, 11), l: r.int(6, 22) });
    var gal = G.make(80, 40, function (P) {
      for (var k = 0; k < 160; k++) {
        var a = k * 0.28, rad = 2 + k * 0.22, px = 40 + Math.cos(a) * rad * 1.0, py = 20 + Math.sin(a) * rad * 0.45;
        P.px(px, py, k % 7 === 0 ? '#ffffff' : (k % 3 ? '#a090ff' : '#ff90d0'));
      }
      P.ell(40, 20, 4, 2.4, 'white');
    }, { outline: false, bevel: false });
    self.update = function (m) {
      self.t++; self.off += m; stars.update(m * (1 + self.boss * 0.6));
      streaks.forEach(function (s) { s.y += s.v * m * (0.6 + self.boss * 0.5); if (s.y > FH + 30) { s.y = -r.int(10, 80); s.x = r.int(0, FW); s.v = r.range(4, 11); } });
    };
    self.draw = function (ctx) {
      ctx.drawImage(back, 0, 0);
      ctx.drawImage(gal.c, 100, Math.round(((self.off * 0.12) % (FH + 100)) - 50));
      ctx.globalAlpha = 0.5; tileV(ctx, neb, self.off * 0.35, 0); ctx.globalAlpha = 1;
      stars.draw(ctx, self.t);
      ctx.fillStyle = self.boss ? '#ff90d8' : '#a8a0ff';
      streaks.forEach(function (s) { ctx.globalAlpha = 0.16 + (s.v - 4) / 30; ctx.fillRect(s.x, Math.round(s.y - s.l), 1, s.l); });
      ctx.globalAlpha = 1;
    };
    return self;
  };

  EB.BG = {
    make: function (stage) { return BGs[stage % 5](); },
    // タイトル/エンディング用の簡易星空
    stars: function (seed) {
      var s = new Stars(seed, 110, [0.1, 0.25, 0.5], ['#4a5a9a', '#8aa0e0', '#ffffff']), t = 0;
      return { update: function (m) { t++; s.update(m); }, draw: function (ctx, w, h) { /* 論理画面全体を覆う */ ctx.save(); s.draw(ctx, t); ctx.restore(); } };
    },
    bandGradient: bandGradient
  };
})();
