/* util.js — 乱数・イージング・色・方向などの小道具 */
(function () {
  'use strict';

  var util = Game.util = {};

  util.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  util.lerp = function (a, b, t) { return a + (b - a) * t; };

  /** 種つき乱数（mulberry32）。同じ種なら同じ並びになる。 */
  util.rng = function (seed) {
    var a = seed >>> 0;
    var f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = function (n) { return Math.floor(f() * n); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    return f;
  };

  util.ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return t * (2 - t); },
    inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    outCubic: function (t) { var u = t - 1; return u * u * u + 1; },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; },
    outBack: function (t) { var c = 1.70158; var u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
    outBounce: function (t) {
      var n = 7.5625, d = 2.75;
      if (t < 1 / d) { return n * t * t; }
      if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75; }
      if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375; }
      t -= 2.625 / d; return n * t * t + 0.984375;
    }
  };

  /** '#rrggbb' → [r,g,b] */
  util.rgb = function (hex) {
    var h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  util.hex = function (r, g, b) {
    function h(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
    return '#' + h(r) + h(g) + h(b);
  };
  /** 2 色を混ぜる */
  util.mix = function (c1, c2, t) {
    var a = util.rgb(c1), b = util.rgb(c2);
    return util.hex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  };
  /** GBA の 15bit カラーに丸める（各色 5bit） */
  util.gba = function (hex) {
    var c = util.rgb(hex);
    function q(n) { var v = n >> 3; return (v << 3) | (v >> 2); }
    return util.hex(q(c[0]), q(c[1]), q(c[2]));
  };
  util.shade = function (hex, k) {
    var c = util.rgb(hex);
    return util.hex(c[0] * k, c[1] * k, c[2] * k);
  };

  util.DIRS = {
    up:    { x: 0, y: -1, opp: 'down' },
    down:  { x: 0, y: 1,  opp: 'up' },
    left:  { x: -1, y: 0, opp: 'right' },
    right: { x: 1, y: 0,  opp: 'left' }
  };
  util.DIR_KEYS = { u: 'up', d: 'down', l: 'left', r: 'right' };

  util.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  util.formatTime = function (sec) {
    sec = Math.floor(sec || 0);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h + ':' + util.pad2(m) + ':' + util.pad2(s);
  };

  util.deepCopy = function (o) { return JSON.parse(JSON.stringify(o)); };
})();
