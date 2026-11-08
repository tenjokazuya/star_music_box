/* gfx.js ― 描画基盤：Canvas・拡大表示・ドット絵生成(Pix)・文字描画 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB, CFG = EB.CFG, U = EB.U;

  function mkCanvas(w, h) {
    var c = root.document.createElement('canvas'); c.width = w; c.height = h; return c;
  }

  // ---- カラーランプ [ハイライト, 基調, 影, 濃い影] ----
  var RAMP_SRC = {
    steel:  ['#eef2fa', '#aeb9d0', '#6e7c9c', '#3c4864'],
    iron:   ['#8d9bb8', '#5d6b88', '#3c4764', '#222a46'],
    white:  ['#ffffff', '#e8eef8', '#b6c2d8', '#7c8aaa'],
    red:    ['#ffb4a4', '#e8403c', '#a41c34', '#640c28'],
    orange: ['#ffdc98', '#ff9c34', '#d45c1a', '#8c2e12'],
    yellow: ['#fffcb4', '#ffe444', '#dca41c', '#905e12'],
    gold:   ['#fff4c0', '#f2c44c', '#b88422', '#744a12'],
    green:  ['#ccffb4', '#64dc64', '#2e9444', '#16522e'],
    lime:   ['#f0ffb0', '#b4e83c', '#6ca820', '#386010'],
    teal:   ['#bcfff4', '#44d4bc', '#22948c', '#0e545c'],
    cyan:   ['#e4ffff', '#74ecff', '#32a4dc', '#1a649c'],
    blue:   ['#b4d4ff', '#4c84f4', '#2e4cb4', '#1a2c74'],
    navy:   ['#6a90d8', '#34509c', '#1e306c', '#101a40'],
    purple: ['#e4bcff', '#a464ec', '#6c34b4', '#401c7c'],
    violet: ['#b8a0f0', '#6c54c0', '#443490', '#241c5c'],
    pink:   ['#ffc4ec', '#f464bc', '#b43084', '#741454'],
    rust:   ['#e8b884', '#ac7044', '#784428', '#442210'],
    black:  ['#5a627c', '#30344c', '#1a1c30', '#0a0c18'],
    glass:  ['#f4ffff', '#a8f0ff', '#58b8e8', '#2c78b4']
  };
  var RAMP = {};
  (function () {
    for (var k in RAMP_SRC) RAMP[k] = RAMP_SRC[k].map(U.hex);
  })();

  // ---- Pix：プリミティブでドット絵を描き、輪郭と陰影を自動付与 ----
  function Pix(w, h) {
    this.w = w; this.h = h;
    this.m = new Uint8Array(w * h);        // 0=空, 1..=ランプID, 255=生色
    this.rawc = new Uint32Array(w * h);    // 生色 (r<<16|g<<8|b)
    this.names = [null];                   // ランプID→名前
  }
  Pix.prototype._id = function (name) {
    var i = this.names.indexOf(name);
    if (i < 0) { i = this.names.length; this.names.push(name); }
    return i;
  };
  Pix.prototype.px = function (x, y, name) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    var i = y * this.w + x;
    if (name.charAt(0) === '#') {
      var c = U.hex(name);
      this.m[i] = 255; this.rawc[i] = (c[0] << 16) | (c[1] << 8) | c[2];
    } else {
      if (!RAMP[name]) throw new Error('unknown ramp ' + name);
      this.m[i] = this._id(name);
    }
    return this;
  };
  Pix.prototype.clear = function (x, y, w, h) {
    for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) {
      if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.m[j * this.w + i] = 0;
    }
    return this;
  };
  Pix.prototype.rect = function (x, y, w, h, name) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, name);
    return this;
  };
  Pix.prototype.ell = function (cx, cy, rx, ry, name) {
    var x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx), y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.px(x, y, name);
    }
    return this;
  };
  Pix.prototype.ring = function (cx, cy, r1, r2, name) {
    var x0 = Math.floor(cx - r2), x1 = Math.ceil(cx + r2), y0 = Math.floor(cy - r2), y1 = Math.ceil(cy + r2);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= r2 && d >= r1) this.px(x, y, name);
    }
    return this;
  };
  Pix.prototype.line = function (x0, y0, x1, y1, name) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (var n = 0; n < 1000; n++) {
      this.px(x0, y0, name);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  };
  Pix.prototype.poly = function (pts, name) {
    var minY = Infinity, maxY = -Infinity, i, n = pts.length;
    for (i = 0; i < n; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var cy = y + 0.5, xs = [];
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) {
          xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort(function (p, q) { return p - q; });
      for (i = 0; i + 1 < xs.length; i += 2) {
        for (var x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) this.px(x, y, name);
      }
    }
    return this;
  };
  // 左右対称描画（sp=多角形 sr=矩形 se=楕円）。中心は w/2
  Pix.prototype.sp = function (pts, name) {
    var w = this.w;
    this.poly(pts, name);
    this.poly(pts.map(function (p) { return [w - p[0], p[1]]; }), name);
    return this;
  };
  Pix.prototype.sr = function (x, y, w, h, name) {
    this.rect(x, y, w, h, name); this.rect(this.w - x - w, y, w, h, name); return this;
  };
  Pix.prototype.se = function (cx, cy, rx, ry, name) {
    this.ell(cx, cy, rx, ry, name); this.ell(this.w - cx, cy, rx, ry, name); return this;
  };
  Pix.prototype.spx = function (x, y, name) {
    this.px(x, y, name); this.px(this.w - 1 - x, y, name); return this;
  };
  // 左半分を右へ鏡映
  Pix.prototype.mirror = function () {
    var w = this.w, h = this.h;
    for (var y = 0; y < h; y++) for (var x = 0; x < (w >> 1); x++) {
      var a = y * w + x, b = y * w + (w - 1 - x);
      if (this.m[a]) { this.m[b] = this.m[a]; this.rawc[b] = this.rawc[a]; }
    }
    return this;
  };
  // 文字列行からの読み込み（map: 文字→ランプ名または#rrggbb）
  Pix.prototype.rows = function (rows, map, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    for (var y = 0; y < rows.length; y++) {
      var r = rows[y];
      for (var x = 0; x < r.length; x++) {
        var ch = r.charAt(x);
        if (ch === '.' || ch === ' ') continue;
        var nm = map[ch];
        if (nm) this.px(ox + x, oy + y, nm);
      }
    }
    return this;
  };
  Pix.prototype.build = function (opt) {
    opt = opt || {};
    var ol = (opt.outline === undefined) ? '#0a0a16' : opt.outline;
    var bevel = (opt.bevel === undefined) ? true : opt.bevel;
    var pad = ol ? 1 : 0, w = this.w, h = this.h, W = w + pad * 2, H = h + pad * 2;
    var c = mkCanvas(W, H), ctx = c.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data, m = this.m, names = this.names;
    var olc = ol ? U.hex(ol) : null;
    function at(x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? 0 : m[y * w + x]; }
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var id = m[y * w + x];
      if (!id) continue;
      var r, g, b, o = ((y + pad) * W + (x + pad)) * 4;
      if (id === 255) {
        var rc = this.rawc[y * w + x]; r = (rc >> 16) & 255; g = (rc >> 8) & 255; b = rc & 255;
      } else {
        var rp = RAMP[names[id]], t = 1;
        if (bevel) {
          var up = at(x, y - 1), lf = at(x - 1, y), dn = at(x, y + 1), rt = at(x + 1, y);
          var lit = ((up !== id && up !== 255) || (lf !== id && lf !== 255)) ? 1 : 0;
          var dk = ((dn !== id && dn !== 255) || (rt !== id && rt !== 255)) ? 1 : 0;
          if (lit && !dk) t = 0; else if (dk && !lit) t = 2;
          else if (lit && dk) t = 1;
          if (t === 2 && (dn !== id && dn !== 255) && (rt !== id && rt !== 255)) t = 3;
        }
        r = rp[t][0]; g = rp[t][1]; b = rp[t][2];
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    if (ol) {
      for (var yy = -1; yy <= h; yy++) for (var xx = -1; xx <= w; xx++) {
        if (at(xx, yy)) continue;
        if (at(xx - 1, yy) || at(xx + 1, yy) || at(xx, yy - 1) || at(xx, yy + 1)) {
          var oo = ((yy + pad) * W + (xx + pad)) * 4;
          d[oo] = olc[0]; d[oo + 1] = olc[1]; d[oo + 2] = olc[2]; d[oo + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return { c: c, w: W, h: H, ox: W / 2, oy: H / 2 };
  };

  // ---- Gfx 本体 ----
  var Gfx = {
    RAMP: RAMP, Pix: Pix, mkCanvas: mkCanvas,
    canvas: null, ctx: null, view: null,
    scale: 2, settings: { scanline: false },

    init: function () {
      var d = root.document;
      Gfx.canvas = d.getElementById('screen');
      Gfx.view = d.getElementById('view');
      Gfx.ctx = Gfx.canvas.getContext('2d', { alpha: false });
      Gfx.ctx.imageSmoothingEnabled = false;
      Gfx.layout();
      root.addEventListener('resize', Gfx.layout);
      root.addEventListener('orientationchange', function () { setTimeout(Gfx.layout, 200); });
    },

    layout: function () {
      var vw = root.innerWidth, vh = root.innerHeight;
      var touch = EB.touchUI;
      var portrait = vh > vw * 1.05;
      var s, x, y;
      if (touch && portrait) {
        s = vw / CFG.W; x = 0; y = Math.max(0, Math.min(8, vh * 0.02));
      } else {
        s = Math.min(vw / CFG.W, vh / CFG.H);
        if (!touch && s >= 2) s = Math.floor(s);
        x = (vw - CFG.W * s) / 2; y = (vh - CFG.H * s) / 2;
      }
      Gfx.scale = s;
      var v = Gfx.view;
      v.style.width = Math.round(CFG.W * s) + 'px';
      v.style.height = Math.round(CFG.H * s) + 'px';
      v.style.left = Math.round(x) + 'px';
      v.style.top = Math.round(y) + 'px';
      // ソフトキーの大きさ調整
      var k = Math.max(0.7, Math.min(1.25, Math.min(vw, vh) / 420));
      var dp = root.document.getElementById('dpad'), bt = root.document.getElementById('btns');
      if (dp) { dp.style.transform = 'scale(' + k + ')'; dp.style.transformOrigin = 'left bottom'; }
      if (bt) { bt.style.transform = 'scale(' + k + ')'; bt.style.transformOrigin = 'right bottom'; }
      if (EB.Input && EB.Input.relayout) EB.Input.relayout();
    },

    setScanline: function (on) {
      Gfx.settings.scanline = !!on;
      var el = root.document.getElementById('scan');
      if (el) el.className = on ? 'on' : '';
    },

    // ---- スプライト ----
    // 描画関数からスプライトを生成。fn(P) で Pix に描く
    make: function (w, h, fn, opt) {
      var P = new Pix(w, h); fn(P); return P.build(opt);
    },
    // 文字行からスプライト生成
    fromRows: function (rows, map, opt) {
      var P = new Pix(rows[0].length, rows.length); P.rows(rows, map); return P.build(opt);
    },
    // 左右反転
    flipX: function (s) {
      var c = mkCanvas(s.w, s.h), x = c.getContext('2d');
      x.translate(s.w, 0); x.scale(-1, 1); x.drawImage(s.c, 0, 0);
      return { c: c, w: s.w, h: s.h, ox: s.w - s.ox, oy: s.oy };
    },
    // 回転フレーム列（最近傍）
    rotated: function (s, n, size) {
      var out = [], S = size || Math.ceil(Math.sqrt(s.w * s.w + s.h * s.h)) + 2;
      for (var i = 0; i < n; i++) {
        var c = mkCanvas(S, S), x = c.getContext('2d');
        x.imageSmoothingEnabled = false;
        x.translate(S / 2, S / 2); x.rotate(i / n * U.TAU);
        x.drawImage(s.c, -s.ox, -s.oy);
        out.push({ c: c, w: S, h: S, ox: S / 2, oy: S / 2 });
      }
      return out;
    },
    // 整数倍拡大
    scaled: function (s, k) {
      var c = mkCanvas(s.w * k, s.h * k), x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(s.c, 0, 0, s.w * k, s.h * k);
      return { c: c, w: s.w * k, h: s.h * k, ox: s.ox * k, oy: s.oy * k };
    },
    // 単色化(閃光用)
    silhouette: function (s, color) {
      var c = mkCanvas(s.w, s.h), x = c.getContext('2d');
      x.drawImage(s.c, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = color || '#ffffff'; x.fillRect(0, 0, s.w, s.h);
      return { c: c, w: s.w, h: s.h, ox: s.ox, oy: s.oy };
    },
    flashOf: function (s) {
      return s._fl || (s._fl = Gfx.silhouette(s, '#ffffff'));
    },
    // 中心基準で描画
    spr: function (s, x, y) {
      Gfx.ctx.drawImage(s.c, Math.round(x - s.ox), Math.round(y - s.oy));
    },
    sprA: function (s, x, y, a) {
      var c = Gfx.ctx, o = c.globalAlpha; c.globalAlpha = o * a;
      c.drawImage(s.c, Math.round(x - s.ox), Math.round(y - s.oy)); c.globalAlpha = o;
    },

    // ---- 文字 ----
    textW: function (s) { return EB.Font.width(s); },
    // opt: {align:'l'|'c'|'r', shadow:色, outline:色, a:透明度}
    text: function (s, x, y, color, opt) {
      var c = Gfx.ctx;
      opt = opt || {};
      s = String(s);
      var z = opt.size, w = EB.Font.width(s, z);
      if (opt.align === 'c') x -= Math.floor(w / 2); else if (opt.align === 'r') x -= w;
      var oa = c.globalAlpha;
      if (opt.a !== undefined) c.globalAlpha = oa * opt.a;
      if (opt.outline) {
        var o = opt.outline;
        EB.Font.draw(c, s, x - 1, y, o, z); EB.Font.draw(c, s, x + 1, y, o, z);
        EB.Font.draw(c, s, x, y - 1, o, z); EB.Font.draw(c, s, x, y + 1, o, z);
        EB.Font.draw(c, s, x + 1, y + 1, o, z);
      } else if (opt.shadow) {
        EB.Font.draw(c, s, x + 1, y + 1, opt.shadow, z);
      }
      EB.Font.draw(c, s, x, y, color || '#ffffff', z);
      c.globalAlpha = oa;
      return x + w;
    },

    // ---- UI 部品 ----
    rect: function (x, y, w, h, color) {
      Gfx.ctx.fillStyle = color; Gfx.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    // 枠付きウィンドウ（SFC風の二重線）
    frame: function (x, y, w, h, opt) {
      var c = Gfx.ctx;
      opt = opt || {};
      var bg = opt.bg || 'rgba(8,12,40,0.88)', b1 = opt.b1 || '#8cb4ff', b2 = opt.b2 || '#2c4aa0';
      c.fillStyle = bg; c.fillRect(x, y, w, h);
      c.fillStyle = b2; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
      c.fillStyle = b1; c.fillRect(x + 1, y + 1, w - 2, 1); c.fillRect(x + 1, y + h - 2, w - 2, 1);
      c.fillRect(x + 1, y + 1, 1, h - 2); c.fillRect(x + w - 2, y + 1, 1, h - 2);
      c.fillStyle = '#000'; c.fillRect(x, y, 1, 1); c.fillRect(x + w - 1, y, 1, 1);
      c.fillRect(x, y + h - 1, 1, 1); c.fillRect(x + w - 1, y + h - 1, 1, 1);
    },
    bar: function (x, y, w, h, ratio, color, back) {
      var c = Gfx.ctx;
      c.fillStyle = back || '#101030'; c.fillRect(x, y, w, h);
      c.fillStyle = color; c.fillRect(x, y, Math.max(0, Math.round(w * ratio)), h);
    },
    // 縦グラデーション帯（ディザ付き）
    dither: function (ctx, x, y, w, h, c1, c2, phase) {
      // 市松ディザで2色を混ぜる
      ctx.fillStyle = c1; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = c2;
      for (var j = 0; j < h; j++) for (var i = ((j + (phase || 0)) & 1); i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1);
    }
  };
  EB.Gfx = Gfx;
})();
