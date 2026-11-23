/* パレットとドット描画の補助 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var P = RR.Pal = {};

  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r, g, b) {
    // GBA の 15bit カラーに丸める
    r = Math.round(U.clamp(r, 0, 255) / 8) * 8; g = Math.round(U.clamp(g, 0, 255) / 8) * 8; b = Math.round(U.clamp(b, 0, 255) / 8) * 8;
    r = Math.min(248, r); g = Math.min(248, g); b = Math.min(248, b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  P.rgb = hex2rgb;
  P.hex = rgb2hex;
  P.mix = function (a, b, t) {
    var x = hex2rgb(a), y = hex2rgb(b);
    return rgb2hex(U.lerp(x[0], y[0], t), U.lerp(x[1], y[1], t), U.lerp(x[2], y[2], t));
  };
  // amt>0 で明るく（黄み寄り）、amt<0 で暗く（青紫寄り）
  P.shade = function (c, amt) {
    var x = hex2rgb(c);
    if (amt >= 0) {
      return rgb2hex(x[0] + (255 - x[0]) * amt * 0.9 + 8 * amt, x[1] + (255 - x[1]) * amt * 0.85 + 4 * amt, x[2] + (255 - x[2]) * amt * 0.7);
    }
    var k = 1 + amt;
    return rgb2hex(x[0] * k * 0.92, x[1] * k * 0.95, x[2] * k + 14 * -amt);
  };
  P.ramp = function (c) {
    return { hi: P.shade(c, 0.35), lt: P.shade(c, 0.15), base: c, sh: P.shade(c, -0.28), dk: P.shade(c, -0.55) };
  };

  // 名前付きの色
  P.C = {
    black: '#080810', white: '#f8f8f8', ink: '#181020',
    skin: { pale: '#f8d8c0', light: '#f0c098', tan: '#d89868', dark: '#a06840' },
    hair: { black: '#282030', brown: '#684028', red: '#a83820', blond: '#d8b050', gray: '#a0a0a8', white: '#e0e0e8', blue: '#284878', teal: '#207068', pink: '#c86890' }
  };

  // ---------- ドット描画 ----------
  function Painter(w, h) {
    this.c = U.canvas(w, h);
    this.g = this.c.g;
    this.w = w; this.h = h;
  }
  Painter.prototype.px = function (x, y, col) {
    if (!col) return;
    this.g.fillStyle = col;
    this.g.fillRect(x | 0, y | 0, 1, 1);
  };
  Painter.prototype.rect = function (x, y, w, h, col) {
    if (!col || w <= 0 || h <= 0) return;
    this.g.fillStyle = col;
    this.g.fillRect(x | 0, y | 0, w | 0, h | 0);
  };
  Painter.prototype.span = function (y, x0, x1, col) { this.rect(x0, y, x1 - x0 + 1, 1, col); };
  Painter.prototype.vspan = function (x, y0, y1, col) { this.rect(x, y0, 1, y1 - y0 + 1, col); };
  // 文字列パターン描画: rows の各文字を map で色に変換（'.' は透明）
  Painter.prototype.pattern = function (rows, map, ox, oy, flip) {
    for (var y = 0; y < rows.length; y++) {
      var r = rows[y];
      for (var x = 0; x < r.length; x++) {
        var ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        var col = map[ch];
        if (col) this.px((ox || 0) + (flip ? r.length - 1 - x : x), (oy || 0) + y, col);
      }
    }
  };
  // ディザ付きの矩形グラデーション（縦）
  Painter.prototype.vgrad = function (x, y, w, h, c1, c2) {
    for (var j = 0; j < h; j++) {
      var t = h > 1 ? j / (h - 1) : 0;
      for (var i = 0; i < w; i++) {
        var th = BAYER[(j & 3) * 4 + (i & 3)];
        this.px(x + i, y + j, t > th ? c2 : c1);
      }
    }
  };
  // 透明部分のうち不透明に接する画素へ縁取り（隣の色を暗くした色）
  Painter.prototype.outline = function (dark, ignoreBottom) {
    var g = this.g, w = this.w, h = this.h;
    var img = g.getImageData(0, 0, w, h), d = img.data;
    var out = new Uint8ClampedArray(d);
    function a(x, y) { return x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0; }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (d[i + 3] > 0) continue;
        var nb = null;
        if (a(x - 1, y)) nb = (y * w + x - 1) * 4;
        else if (a(x + 1, y)) nb = (y * w + x + 1) * 4;
        else if (a(x, y - 1)) nb = ((y - 1) * w + x) * 4;
        else if (!ignoreBottom && a(x, y + 1)) nb = ((y + 1) * w + x) * 4;
        if (nb == null) continue;
        var k = dark == null ? 0.35 : dark;
        out[i] = d[nb] * k * 0.8; out[i + 1] = d[nb + 1] * k * 0.8; out[i + 2] = d[nb + 2] * k + 10; out[i + 3] = 255;
      }
    }
    img.data.set(out);
    g.putImageData(img, 0, 0);
  };
  // 左右反転コピー
  Painter.flipX = function (src, sx, sy, w, h) {
    var c = U.canvas(w, h);
    c.g.translate(w, 0); c.g.scale(-1, 1);
    c.g.drawImage(src, sx, sy, w, h, 0, 0, w, h);
    return c;
  };
  RR.Painter = Painter;

  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16; });
  P.BAYER = BAYER;
  P.dither = function (x, y) { return BAYER[(y & 3) * 4 + (x & 3)]; };

  // 光の輪（ドット調の同心円）を作る。color は中心色
  var lightCache = {};
  P.lightSprite = function (r, color, bands) {
    var key = r + color + (bands || 4);
    if (lightCache[key]) return lightCache[key];
    var s = r * 2, c = U.canvas(s, s), g = c.g;
    var rgb = hex2rgb(color);
    var n = bands || 4;
    for (var y = 0; y < s; y++) {
      for (var x = 0; x < s; x++) {
        var dx = x - r + 0.5, dy = y - r + 0.5;
        var d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d >= 1) continue;
        var v = 1 - d;
        v = v + (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) / n;
        var q = Math.max(0, Math.round(v * n) / n);
        if (q <= 0) continue;
        g.fillStyle = 'rgb(' + Math.round(rgb[0] * q) + ',' + Math.round(rgb[1] * q) + ',' + Math.round(rgb[2] * q) + ')';
        g.fillRect(x, y, 1, 1);
      }
    }
    lightCache[key] = c;
    return c;
  };
})();
