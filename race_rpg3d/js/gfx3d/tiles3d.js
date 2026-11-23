/* 地形タイルの3D化: 手続き生成のテクスチャアトラス + 地面/壁/崖/森/フェンスのジオメトリ
 * RR.Tiles3D.build(map) -> { group, update(frame), dispose() }
 */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U, Gfx = RR.Gfx, Tiles = RR.Tiles;
  var T3 = RR.Tiles3D = {};

  var CELL = 64, PAD = 8, SLOT = CELL + PAD * 2, COLS = 12, AW = COLS * SLOT;

  // ---------- 描画補助（タイル可能：端をまたぐ図形は反対側にも描く） ----------
  function dots(g, S, rng, n, color, r0, r1, alpha) {
    g.fillStyle = color;
    if (alpha != null) g.globalAlpha = alpha;
    for (var i = 0; i < n; i++) {
      var x = rng() * S, y = rng() * S, r = r0 + rng() * (r1 - r0);
      for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) {
        var px = x + ox, py = y + oy;
        if (px < -r || py < -r || px > S + r || py > S + r) continue;
        g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  function blades(g, S, rng, n, colors, len) {
    g.lineWidth = 1.1; g.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var x = rng() * S, y = rng() * S, l = len * (0.5 + rng() * 0.8), a = -Math.PI / 2 + (rng() - 0.5) * 1.1;
      g.strokeStyle = colors[(rng() * colors.length) | 0];
      for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) {
        var px = x + ox, py = y + oy;
        if (px < -l || py < -l || px > S + l || py > S + l) continue;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
      }
    }
  }
  function rrect(g, x, y, w, h, r, fill) { UI_rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); }
  function UI_rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fill(g, S, base, amt, per, seed, tint, fine) { Gfx.noiseFill(g, S, S, base, { amt: amt, per: per, seed: seed, tint: tint, fine: fine }); }

  // ---------- 各タイルの絵（S=64。v=バリアント、tx,ty は代表座標） ----------
  var GR = ['#2c5424', '#3c7030', '#4c8034', '#58903c', '#78b050'];
  function grass(g, S, v, flowers) {
    var rng = U.rng(100 + v * 17);
    fill(g, S, '#3d7230', 0.2, 4, 7 + v, '#4f8638', 0.1);
    blades(g, S, rng, 60, [GR[0], GR[2], GR[3], GR[4]], 7);
    dots(g, S, rng, 6, GR[4], 0.6, 1.2, 0.6);
    if (flowers) {
      var fc = ['#f8f8f8', '#f8e060', '#f890b0', '#b0a0f8'];
      for (var i = 0; i < 5; i++) {
        var x = 6 + rng() * (S - 12), y = 6 + rng() * (S - 12), c = fc[(rng() * fc.length) | 0];
        g.fillStyle = c;
        for (var k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * 2.1, y + Math.sin(k * 1.256) * 2.1, 1.7, 0, 7); g.fill(); }
        g.fillStyle = '#f8d040'; g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill();
      }
    }
  }
  function asphalt(g, S, v) {
    var rng = U.rng(300 + v * 13);
    fill(g, S, '#3a3a46', 0.13, 5, 20 + v, null, 0.16);
    dots(g, S, rng, 60, '#2a2a34', 0.4, 1.0, 0.6);
    dots(g, S, rng, 40, '#585868', 0.3, 0.8, 0.5);
    if (v === 2) { g.strokeStyle = 'rgba(20,20,26,0.55)'; g.lineWidth = 0.9; var y = 10 + rng() * 40; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (rng() - 0.5) * 6); g.stroke(); }
  }
  var PAINT = {
    grass: function (g, S, v) { grass(g, S, v, false); },
    flower: function (g, S, v) { grass(g, S, v, true); },
    dirt: function (g, S, v) {
      var rng = U.rng(400 + v);
      fill(g, S, '#7c5c34', 0.22, 4, 30 + v, '#8c6c3c', 0.14);
      dots(g, S, rng, 30, '#5c4024', 0.5, 1.4, 0.7); dots(g, S, rng, 20, '#a8844c', 0.4, 1.2, 0.8);
      dots(g, S, rng, 5, '#6c6458', 1.4, 2.6, 0.9);
    },
    road: asphalt,
    road_ch: function (g, S, v) { asphalt(g, S, 0); if (v === 0) { g.fillStyle = '#d8c868'; g.fillRect(S * 0.12, S * 0.45, S * 0.76, S * 0.1); } },
    road_cv: function (g, S, v) { asphalt(g, S, 0); if (v === 0) { g.fillStyle = '#d8c868'; g.fillRect(S * 0.45, S * 0.12, S * 0.1, S * 0.76); } },
    road_wh: function (g, S) { asphalt(g, S, 1); g.fillStyle = '#d4d4dc'; g.fillRect(0, S * 0.45, S, S * 0.07); },
    cross_h: function (g, S) { asphalt(g, S, 1); g.fillStyle = '#dcdce4'; for (var i = 0; i < 4; i++) g.fillRect(S * (0.04 + i * 0.25), S * 0.06, S * 0.12, S * 0.88); },
    cross_v: function (g, S) { asphalt(g, S, 1); g.fillStyle = '#dcdce4'; for (var i = 0; i < 4; i++) g.fillRect(S * 0.06, S * (0.04 + i * 0.25), S * 0.88, S * 0.12); },
    park: function (g, S) { asphalt(g, S, 0); g.fillStyle = '#d4d4dc'; g.fillRect(0, 0, S * 0.07, S); },
    park_t: function (g, S) { asphalt(g, S, 0); g.fillStyle = '#d4d4dc'; g.fillRect(0, 0, S, S * 0.07); g.fillRect(0, 0, S * 0.07, S * 0.62); },
    walk: function (g, S, v) {
      var rng = U.rng(500 + v);
      fill(g, S, '#a0a0b4', 0.1, 4, 41, null, 0.1);
      g.strokeStyle = '#7c7c92'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(1, 1); g.lineTo(S / 2 - 1, 1); g.moveTo(S / 2 + 1, 1); g.lineTo(S - 1, 1); g.moveTo(1, S / 2 + 1); g.lineTo(S / 2 - 1, S / 2 + 1); g.moveTo(S / 2 + 1, S / 2 + 1); g.lineTo(S - 1, S / 2 + 1); g.stroke();
      dots(g, S, rng, 14, '#8888a0', 0.5, 1.2, 0.6);
    },
    brick: function (g, S, v) {
      fill(g, S, '#a85c44', 0.15, 4, 51 + v, null, 0.12);
      g.strokeStyle = '#6c382c'; g.lineWidth = 2;
      var bh = S / 4;
      for (var r = 0; r < 4; r++) {
        g.beginPath(); g.moveTo(0, r * bh); g.lineTo(S, r * bh); g.stroke();
        var off = (r & 1) * S / 4;
        for (var x = off; x < S + 1; x += S / 2) { g.beginPath(); g.moveTo(x, r * bh); g.lineTo(x, r * bh + bh); g.stroke(); }
      }
    },
    gravel: function (g, S, v) {
      var rng = U.rng(600 + v);
      fill(g, S, '#8c8478', 0.14, 6, 61, null, 0.18);
      dots(g, S, rng, 70, '#6c6458', 0.6, 1.8, 0.8); dots(g, S, rng, 60, '#aaa292', 0.5, 1.5, 0.8); dots(g, S, rng, 12, '#c4bcac', 0.8, 1.8, 0.9);
    },
    conc: function (g, S, v) {
      var rng = U.rng(700 + v);
      fill(g, S, '#9c9ca8', 0.1, 5, 71, null, 0.1);
      dots(g, S, rng, 20, '#84848e', 0.5, 1.3, 0.5);
      g.strokeStyle = '#74747e'; g.lineWidth = 1.4; g.strokeRect(0.5, 0.5, S - 1, S - 1);
      if (v === 1) { g.fillStyle = 'rgba(40,40,60,0.18)'; g.beginPath(); g.ellipse(S * 0.45, S * 0.5, 9, 6, 0.4, 0, 7); g.fill(); }
    },
    stone: function (g, S, v) {
      fill(g, S, '#5c5c68', 0.08, 4, 81, null, 0.1);
      var rng = U.rng(800 + v);
      var rects = [[3, 3, 26, 22], [33, 3, 28, 17], [3, 29, 16, 32], [23, 24, 38, 14], [23, 42, 16, 19], [43, 42, 18, 19]];
      rects.forEach(function (r) {
        var base = U.mix('#9898a4', '#a8a8b4', rng());
        rrect(g, r[0], r[1], r[2], r[3], 4, base);
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(r[0] + 2, r[1] + 1, r[2] - 4, 1.6);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(r[0] + 2, r[1] + r[3] - 2.4, r[2] - 4, 1.8);
      });
    },
    step: function (g, S) {
      for (var y = 0; y < S; y += S / 4) {
        var gr = g.createLinearGradient(0, y, 0, y + S / 4);
        gr.addColorStop(0, '#c8c8d4'); gr.addColorStop(0.75, '#a0a0b0'); gr.addColorStop(1, '#585868');
        g.fillStyle = gr; g.fillRect(0, y, S, S / 4);
      }
    },
    water: function (g, S, v) {
      fill(g, S, '#27508c', 0.16, 4, 91, '#3a68a8', 0.05);
      var rng = U.rng(900);
      g.strokeStyle = 'rgba(160,200,245,0.5)'; g.lineWidth = 1.2; g.lineCap = 'round';
      for (var i = 0; i < 9; i++) {
        var x = rng() * S, y = rng() * S, w = 6 + rng() * 10;
        for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + w / 2, y + oy - 2, x + ox + w, y + oy); g.stroke(); }
      }
    },
    rock: function (g, S, v) {
      var rng = U.rng(1000 + v);
      fill(g, S, '#675a4e', 0.22, 4, 101 + v, '#7c6e60', 0.14);
      for (var i = 0; i < 7; i++) {
        var x = rng() * S, y = rng() * S, w = 10 + rng() * 14, h = 7 + rng() * 10;
        var gr = g.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, '#9a8a78'); gr.addColorStop(1, '#4a4036');
        UI_rr(g, x, y, w, h, 3); g.fillStyle = gr; g.globalAlpha = 0.65; g.fill(); g.globalAlpha = 1;
      }
      g.strokeStyle = 'rgba(20,14,10,0.5)'; g.lineWidth = 1.3;
      for (i = 0; i < 4; i++) { var cx = rng() * S; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx + (rng() - 0.5) * 16, S); g.stroke(); }
    },
    forest: function (g, S, v) { fill(g, S, '#173a20', 0.18, 4, 111 + v, '#1f4a28', 0.1); },
    hedge: function (g, S, v) {
      var rng = U.rng(1100 + v);
      fill(g, S, '#2c6430', 0.2, 6, 121 + v, '#3c7c3c', 0.2);
      dots(g, S, rng, 80, '#4a9448', 1.0, 2.6, 0.8); dots(g, S, rng, 50, '#1c4420', 1.0, 2.4, 0.7);
    },
    fence: function (g, S, v) { grass(g, S, v, false); },
    rail: function (g, S, v) { grass(g, S, v, false); },
    wood: function (g, S, v) {
      var rng = U.rng(1200 + v);
      var bh = S / 4;
      for (var r = 0; r < 4; r++) {
        var c = U.mix('#9c6c3c', '#b4844c', rng());
        var gr = g.createLinearGradient(0, r * bh, 0, r * bh + bh);
        gr.addColorStop(0, U.shade(c, 0.12)); gr.addColorStop(1, U.shade(c, -0.1));
        g.fillStyle = gr; g.fillRect(0, r * bh, S, bh);
        g.strokeStyle = 'rgba(70,40,16,0.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, r * bh); g.lineTo(S, r * bh); g.stroke();
        var seam = rng() * S; g.beginPath(); g.moveTo(seam, r * bh); g.lineTo(seam, r * bh + bh); g.stroke();
        g.strokeStyle = 'rgba(80,46,20,0.25)'; g.lineWidth = 0.8;
        for (var k = 0; k < 3; k++) { var yy = r * bh + 3 + rng() * (bh - 6); g.beginPath(); g.moveTo(0, yy); g.lineTo(S, yy + (rng() - 0.5) * 2); g.stroke(); }
      }
    },
    tile: function (g, S, v) {
      var a = v ? '#dcdce4' : '#b8bcc8';
      var gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, U.shade(a, 0.08)); gr.addColorStop(1, U.shade(a, -0.06));
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(1, S); g.lineTo(1, 1); g.lineTo(S, 1); g.stroke();
      g.strokeStyle = 'rgba(90,90,110,0.55)'; g.beginPath(); g.moveTo(S - 1, 0); g.lineTo(S - 1, S - 1); g.lineTo(0, S - 1); g.stroke();
    },
    tatami: function (g, S, v) {
      fill(g, S, '#b8b070', 0.08, 5, 131, null, 0.1);
      g.strokeStyle = 'rgba(120,112,60,0.4)'; g.lineWidth = 1;
      for (var y = 2; y < S; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
      g.fillStyle = '#3c5030';
      if (v) g.fillRect(0, 0, S, 4); else g.fillRect(0, 0, 4, S);
    },
    garage: function (g, S, v) {
      var rng = U.rng(1300 + v);
      fill(g, S, '#6c6c78', 0.12, 5, 141, null, 0.16);
      dots(g, S, rng, 30, '#585864', 0.5, 1.4, 0.6);
      if (v === 1) { g.fillStyle = 'rgba(20,20,30,0.25)'; g.beginPath(); g.ellipse(S * 0.5, S * 0.5, 12, 8, 0.5, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, S, 1.5);
    },
    mat: function (g, S) {
      PAINT.wood(g, S, 1);
      var gr = g.createLinearGradient(0, S * 0.15, 0, S * 0.85); gr.addColorStop(0, '#a84848'); gr.addColorStop(1, '#6c2828');
      rrect(g, S * 0.1, S * 0.18, S * 0.8, S * 0.64, 4, gr);
      g.strokeStyle = 'rgba(255,200,180,0.5)'; g.lineWidth = 1; for (var x = S * 0.2; x < S * 0.9; x += 5) { g.beginPath(); g.moveTo(x, S * 0.24); g.lineTo(x, S * 0.76); g.stroke(); }
    },
    void: function (g, S) { g.fillStyle = '#080810'; g.fillRect(0, 0, S, S); },
    sky: function (g, S) { g.fillStyle = '#101830'; g.fillRect(0, 0, S, S); }
  };
  [['red', '#a03838'], ['blue', '#384c98'], ['green', '#3c7848'], ['beige', '#c8b490']].forEach(function (p) {
    PAINT['carpet_' + p[0]] = function (g, S, v) {
      fill(g, S, p[1], 0.08, 6, 150 + v, null, 0.18);
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
      for (var i = -S; i < S * 2; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); }
    };
  });
  // 壁紙（高さ方向に引き伸ばして使う: 上に飾り縁、下に幅木）
  [['wall', '#d8ccb0', '#c4b896'], ['wall_blue', '#a8b8d0', '#94a6c0'], ['wall_green', '#b8c8a0', '#a4b88c'], ['wall_pink', '#e0c0c0', '#cca8a8'], ['wall_gray', '#9c9cac', '#86869a'], ['wall_wood', '#906040', '#784c30']].forEach(function (p) {
    PAINT[p[0]] = function (g, S) {
      var gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, U.shade(p[1], -0.12)); gr.addColorStop(0.7, p[1]); gr.addColorStop(1, U.shade(p[1], -0.04));
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      g.fillStyle = p[2];
      for (var x = 0; x < S; x += S / 4) g.fillRect(x, 0, S / 16, S);
      // 幅木
      g.fillStyle = '#5c3c24'; g.fillRect(0, S * 0.86, S, S * 0.14);
      g.fillStyle = '#7c5434'; g.fillRect(0, S * 0.86, S, 2);
      // 飾り縁
      g.fillStyle = 'rgba(40,30,40,0.55)'; g.fillRect(0, 0, S, S * 0.05);
    };
  });

  var VARIANTS = { road_ch: 2, road_cv: 2, tile: 2, tatami: 2, conc: 2, mat: 1, step: 1, void: 1, sky: 1, cross_h: 1, cross_v: 1, park: 1, park_t: 1, road_wh: 1, water: 1, wall: 1, wall_blue: 1, wall_green: 1, wall_pink: 1, wall_gray: 1, wall_wood: 1 };
  function variantOf(id, x, y) {
    var n = VARIANTS[id] || 3;
    if (id === 'tile' || id === 'tatami') return (x + y) & 1;
    if (id === 'road_ch' || id === 'road_cv') return (id === 'road_ch' ? x : y) & 1;
    if (id === 'conc') return U.hash2(x, y, 3) < 0.15 ? 1 : 0;
    if (id === 'road') return U.hash2(x, y, 4) < 0.1 ? 2 : (U.hash2(x, y, 5) < 0.5 ? 0 : 1);
    return Math.floor(U.hash2(x, y, 9) * n);
  }

  // ---------- アトラス ----------
  function Atlas() {
    this.c = U.canvas(AW, AW, true);
    this.g = this.c.g;
    this.slots = {};
    this.n = 0;
    this.tex = null;
  }
  Atlas.prototype.uv = function (id, v) {
    var key = id + '#' + v;
    var s = this.slots[key];
    if (!s) {
      var idx = this.n++;
      var sx = (idx % COLS) * SLOT, sy = Math.floor(idx / COLS) * SLOT;
      var tile = U.canvas(CELL, CELL, true);
      var p = PAINT[id] || PAINT.grass;
      p(tile.g, CELL, v);
      var g = this.g;
      // 周囲に折り返しの余白（ミップマップの滲み対策）
      g.save(); g.beginPath(); g.rect(sx, sy, SLOT, SLOT); g.clip();
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) g.drawImage(tile, sx + PAD + ox * CELL, sy + PAD + oy * CELL);
      g.restore();
      var e = 0.5; // 半ピクセル内側
      s = this.slots[key] = [(sx + PAD + e) / AW, 1 - (sy + PAD + CELL - e) / AW, (sx + PAD + CELL - e) / AW, 1 - (sy + PAD + e) / AW];
      if (this.tex) this.tex.needsUpdate = true;
    }
    return s;
  };
  Atlas.prototype.texture = function () {
    if (!this.tex) {
      var t = this.tex = new T.CanvasTexture(this.c);
      t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter;
      t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    }
    return this.tex;
  };

  // ---------- 地形の構築 ----------
  var HEIGHT = { rock: [1.1, 1.8], wall: 2.5, hedge: 0.95 };
  function tileDef(id) { return Tiles.defs[id] || {}; }

  T3.build = function (map) {
    var W = map.w, H = map.h;
    var at = new Atlas();
    var group = new T.Group();
    var tb = new Gfx.Batch();     // テクスチャつき
    var vb = new Gfx.Batch();     // 頂点色のみ（フェンス・木・ガードレール）
    var wbatch = new Gfx.Batch(); // 水面
    function id(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? null : map.ground[y * W + x]; }
    function grp(x, y) { var i = id(x, y); return i == null ? null : tileDef(i).group; }
    function isTall(x, y) { var i = id(x, y); return i != null && !!tileDef(i).tall; }
    // 角の頂点の明るさ（背の高いものが隣にあると少し暗く）+ 低周波のむら
    function ao(cx, cy) {
      var n = 0;
      for (var dy = -1; dy <= 0; dy++) for (var dx = -1; dx <= 0; dx++) if (isTall(cx + dx, cy + dy)) n++;
      var k = 1 - n * 0.13;
      var m = 0.93 + 0.14 * Gfx.fbm(cx / 64, cy / 64, 5, 8, 2);
      return k * m;
    }
    function gray(k) { return [k, k, k]; }
    function cornerH(kind, cx, cy) {
      if (kind === 'rock') return HEIGHT.rock[0] + (HEIGHT.rock[1] - HEIGHT.rock[0]) * U.hash2(cx, cy, 77);
      return kind === 'wall' ? HEIGHT.wall : HEIGHT.hedge;
    }
    var rngF = U.rng(map.w * 131 + map.h * 7);
    var treeK = RR.GL.q().trees;
    var waterTiles = [];

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var tid = map.ground[y * W + x];
        var td = tileDef(tid);
        var grpName = td.group;
        // ---- 地面 ----
        var baseId = tid;
        if (tid === 'void' || tid === 'sky') continue;
        var lift = 0;
        if (tid === 'walk' || tid === 'stone') lift = 0.07;
        if (tid === 'step') lift = 0.04;
        if (td.tall && grpName === 'wall') baseId = 'wall';
        var surfId = baseId, surfTop = lift;
        if (td.tall) { surfId = grpName === 'rock' ? 'grass' : grpName === 'forest' ? 'forest' : grpName === 'hedge' ? 'grass' : null; }
        if (tid === 'water') { surfId = 'dirt'; surfTop = -0.4; }
        if (tid === 'fence' || tid === 'rail') surfId = 'grass';
        if (surfId) {
          var uv = at.uv(surfId, variantOf(surfId, x, y));
          var c00 = gray(ao(x, y)), c10 = gray(ao(x + 1, y)), c11 = gray(ao(x + 1, y + 1)), c01 = gray(ao(x, y + 1));
          if (tid === 'water') { c00 = c10 = c11 = c01 = [0.4, 0.45, 0.55]; }
          tb.quad([[x, surfTop, y + 1], [x + 1, surfTop, y + 1], [x + 1, surfTop, y], [x, surfTop, y]], [c01, c11, c10, c00], [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]);
          // 歩道・石畳の縁（車道・地面に面した側面）
          if (lift > 0) {
            var cu = at.uv(tid === 'stone' ? 'stone' : 'conc', 0);
            var sideUV = [[cu[0], cu[1]], [cu[2], cu[1]], [cu[2], cu[3]], [cu[0], cu[3]]];
            var sh = [0.7, 0.7, 0.7], lt = [0.95, 0.95, 0.98];
            if (grp(x, y + 1) !== grpName) tb.quad([[x, 0, y + 1], [x + 1, 0, y + 1], [x + 1, lift, y + 1], [x, lift, y + 1]], [sh, sh, lt, lt], sideUV);
            if (grp(x, y - 1) !== grpName) tb.quad([[x + 1, 0, y], [x, 0, y], [x, lift, y], [x + 1, lift, y]], [sh, sh, lt, lt], sideUV);
            if (grp(x - 1, y) !== grpName) tb.quad([[x, 0, y], [x, 0, y + 1], [x, lift, y + 1], [x, lift, y]], [sh, sh, lt, lt], sideUV);
            if (grp(x + 1, y) !== grpName) tb.quad([[x + 1, 0, y + 1], [x + 1, 0, y], [x + 1, lift, y], [x + 1, lift, y + 1]], [sh, sh, lt, lt], sideUV);
          }
        }
        // ---- 水 ----
        if (tid === 'water') {
          waterTiles.push([x, y]);
          var du = at.uv('dirt', 1);
          var dk = [0.5, 0.45, 0.4], dk2 = [0.9, 0.85, 0.8], suv = [[du[0], du[1]], [du[2], du[1]], [du[2], du[3]], [du[0], du[3]]];
          if (grp(x, y + 1) !== 'water') tb.quad([[x, -0.4, y + 1], [x + 1, -0.4, y + 1], [x + 1, 0, y + 1], [x, 0, y + 1]], [dk, dk, dk2, dk2], suv);
          if (grp(x, y - 1) !== 'water') tb.quad([[x + 1, -0.4, y], [x, -0.4, y], [x, 0, y], [x + 1, 0, y]], [dk, dk, dk2, dk2], suv);
          if (grp(x - 1, y) !== 'water') tb.quad([[x, -0.4, y], [x, -0.4, y + 1], [x, 0, y + 1], [x, 0, y]], [dk, dk, dk2, dk2], suv);
          if (grp(x + 1, y) !== 'water') tb.quad([[x + 1, -0.4, y + 1], [x + 1, -0.4, y], [x + 1, 0, y], [x + 1, 0, y + 1]], [dk, dk, dk2, dk2], suv);
        }
        // ---- 背の高いもの（壁・崖・生け垣）----
        if (td.tall && (grpName === 'wall' || grpName === 'rock' || grpName === 'hedge')) {
          var kind = grpName;
          var h00 = cornerH(kind, x, y), h10 = cornerH(kind, x + 1, y), h11 = cornerH(kind, x + 1, y + 1), h01 = cornerH(kind, x, y + 1);
          var sid = kind === 'wall' ? tid : kind === 'rock' ? 'rock' : 'hedge';
          var su = at.uv(sid, variantOf(sid, x, y));
          var wallK = kind === 'wall';
          var topC = kind === 'wall' ? gray(0.3) : kind === 'rock' ? null : gray(1);
          // 上面
          var tu = kind === 'rock' ? at.uv('grass', variantOf('grass', x, y)) : kind === 'hedge' ? at.uv('hedge', 0) : at.uv('wall_gray', 0);
          var tcol = kind === 'wall' ? [[0.18, 0.15, 0.2], [0.18, 0.15, 0.2], [0.18, 0.15, 0.2], [0.18, 0.15, 0.2]] : gray(1);
          tb.quad([[x, h01, y + 1], [x + 1, h11, y + 1], [x + 1, h10, y], [x, h00, y]], tcol, [[tu[0], tu[1]], [tu[2], tu[1]], [tu[2], tu[3]], [tu[0], tu[3]]]);
          var sUV = function (a, b) { return [[su[0], su[1]], [su[2], su[1]], [su[2], su[3]], [su[0], su[3]]]; };
          var bt = wallK ? 0.92 : 0.55;
          // 側面（隣が同じ種類でない面だけ）
          var cs = [[bt, bt, bt], [bt, bt, bt], [1, 1, 1], [1, 1, 1]];
          if (grp(x, y + 1) !== grpName) tb.quad([[x, 0, y + 1], [x + 1, 0, y + 1], [x + 1, h11, y + 1], [x, h01, y + 1]], cs, sUV());
          if (grp(x, y - 1) !== grpName) tb.quad([[x + 1, 0, y], [x, 0, y], [x, h00, y], [x + 1, h10, y]], [[bt * 0.8, bt * 0.8, bt * 0.8], [bt * 0.8, bt * 0.8, bt * 0.8], [0.8, 0.8, 0.8], [0.8, 0.8, 0.8]], sUV());
          if (grp(x - 1, y) !== grpName) tb.quad([[x, 0, y], [x, 0, y + 1], [x, h01, y + 1], [x, h00, y]], [[bt * 0.85, bt * 0.85, bt * 0.85], [bt * 0.85, bt * 0.85, bt * 0.85], [0.85, 0.85, 0.85], [0.85, 0.85, 0.85]], sUV());
          if (grp(x + 1, y) !== grpName) tb.quad([[x + 1, 0, y + 1], [x + 1, 0, y], [x + 1, h10, y], [x + 1, h11, y + 1]], [[bt * 0.85, bt * 0.85, bt * 0.85], [bt * 0.85, bt * 0.85, bt * 0.85], [0.85, 0.85, 0.85], [0.85, 0.85, 0.85]], sUV());
          // 崖の上の草（縁）と、低木
          if (kind === 'rock' && U.hash2(x, y, 31) < 0.35) vb.sphere(x + 0.5 + (U.hash2(x, y, 32) - 0.5) * 0.4, (h00 + h11) / 2 + 0.05, y + 0.5 + (U.hash2(x, y, 33) - 0.5) * 0.4, 0.34, 0.26, 0.34, '#3c7438', 6, 4);
        }
        // ---- 森 ----
        if (tid === 'forest') {
          var nT = treeK >= 1 ? 1 + (U.hash2(x, y, 41) < 0.35 ? 1 : 0) : (U.hash2(x, y, 41) < treeK ? 1 : 0);
          for (var ti = 0; ti < nT; ti++) {
            var tx = x + 0.5 + (U.hash2(x, y, 50 + ti) - 0.5) * 0.7, tz = y + 0.5 + (U.hash2(x, y, 60 + ti) - 0.5) * 0.7;
            var ht = 2.0 + U.hash2(x, y, 70 + ti) * 1.5;
            treeShape(vb, tx, tz, ht, U.hash2(x, y, 80 + ti) < 0.6 ? 'pine' : 'round', 0.85 + U.hash2(x, y, 90) * 0.3);
          }
        }
        // ---- フェンス ----
        if (tid === 'fence') {
          var fx = grp(x - 1, y) === 'fence' || grp(x + 1, y) === 'fence', fy = grp(x, y - 1) === 'fence' || grp(x, y + 1) === 'fence';
          var wood = '#a07040', wd = '#7c5430';
          vb.box(x + 0.42, 0, y + 0.42, x + 0.58, 0.8, y + 0.58, { side: wood, top: '#c89058' });
          if (fx || !fy) {
            if (grp(x + 1, y) === 'fence') { vb.box(x + 0.5, 0.52, y + 0.46, x + 1.5, 0.62, y + 0.54, wood); vb.box(x + 0.5, 0.26, y + 0.46, x + 1.5, 0.36, y + 0.54, wd); }
          }
          if (fy) {
            if (grp(x, y + 1) === 'fence') { vb.box(x + 0.46, 0.52, y + 0.5, x + 0.54, 0.62, y + 1.5, wood); vb.box(x + 0.46, 0.26, y + 0.5, x + 0.54, 0.36, y + 1.5, wd); }
          }
        }
        // ---- ガードレール ----
        if (tid === 'rail') {
          vb.box(x + 0.44, 0, y + 0.44, x + 0.56, 0.5, y + 0.56, '#6c7084');
          var rv = grp(x, y - 1) === 'rail' || grp(x, y + 1) === 'rail', rh = grp(x - 1, y) === 'rail' || grp(x + 1, y) === 'rail';
          if (rh || !rv) { if (grp(x + 1, y) === 'rail') vb.box(x + 0.5, 0.32, y + 0.4, x + 1.5, 0.52, y + 0.5, { top: '#f0f0f8', side: '#c8ccd8' }); }
          if (rv && !rh) { if (grp(x, y + 1) === 'rail') vb.box(x + 0.4, 0.32, y + 0.5, x + 0.5, 0.52, y + 1.5, { top: '#f0f0f8', side: '#c8ccd8' }); }
        }
      }
    }

    // メッシュ化
    var texMat = new T.MeshLambertMaterial({ map: at.texture(), vertexColors: true });
    var gm = tb.build(texMat, { cast: false, receive: true });
    gm.castShadow = false;
    group.add(gm);
    if (!vb.empty()) { var vm = vb.build(Gfx.vcol(), { cast: false }); group.add(vm); }

    // 水面
    var water = null, waterMat = null;
    if (waterTiles.length) {
      waterTiles.forEach(function (p) {
        wbatch.quad([[p[0], -0.08, p[1] + 1], [p[0] + 1, -0.08, p[1] + 1], [p[0] + 1, -0.08, p[1]], [p[0], -0.08, p[1]]], [1, 1, 1], [[p[0] / 2, p[1] / 2 + 0.5], [p[0] / 2 + 0.5, p[1] / 2 + 0.5], [p[0] / 2 + 0.5, p[1] / 2], [p[0] / 2, p[1] / 2]]);
      });
      var wt = Gfx.tex('water_tex', 128, 128, function (g, w, h) {
        PAINT.water(g, w, 0);
      });
      waterMat = new T.MeshLambertMaterial({ map: wt, vertexColors: true, transparent: true, opacity: 0.82, emissive: new T.Color(0x0a1a3a) });
      water = wbatch.build(waterMat, { cast: false, receive: false });
      group.add(water);
    }
    var atlasTex = at.tex;
    return {
      group: group,
      update: function (frame) {
        if (waterMat) { waterMat.map.offset.set(frame * 0.0006, frame * 0.0004); }
      },
      dispose: function () {
        gm.geometry.dispose(); texMat.dispose(); if (atlasTex) atlasTex.dispose();
        if (water) { water.geometry.dispose(); waterMat.dispose(); }
      }
    };
  };

  // 木の形（針葉樹/広葉樹）を頂点色バッチへ
  function treeShape(b, x, z, h, kind, k) {
    var trunk = '#5a3a1c';
    if (kind === 'pine') {
      b.cyl(x, z, 0, h * 0.35, 0.1 * k, 0.07 * k, trunk, 5, { noTop: true });
      var c0 = '#1f5a34', c1 = '#2a6c3c', c2 = '#34803f';
      b.cyl(x, z, h * 0.22, h * 0.6, 0.78 * k, 0.05, c0, 7);
      b.cyl(x, z, h * 0.42, h * 0.8, 0.6 * k, 0.04, c1, 7);
      b.cyl(x, z, h * 0.62, h * 1.0, 0.42 * k, 0.02, c2, 7);
    } else {
      b.cyl(x, z, 0, h * 0.5, 0.12 * k, 0.08 * k, trunk, 5, { noTop: true });
      b.sphere(x, h * 0.62, z, 0.8 * k, 0.7 * k, 0.8 * k, '#2c6c34', 7, 5);
      b.sphere(x + 0.35 * k, h * 0.72, z - 0.2 * k, 0.5 * k, 0.45 * k, 0.5 * k, '#388040', 6, 4);
      b.sphere(x - 0.3 * k, h * 0.55, z + 0.25 * k, 0.5 * k, 0.45 * k, 0.5 * k, '#2a6a36', 6, 4);
    }
  }
  T3.treeShape = treeShape;
})();
