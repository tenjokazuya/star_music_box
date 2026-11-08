/* util.js ― 数学・PRNG・補助関数 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;

  var PI = Math.PI, TAU = Math.PI * 2;

  // シード付き乱数 (mulberry32)
  function makeRng(seed) {
    var s = seed >>> 0;
    function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,
      range: function (a, b) { return a + (b - a) * next(); },
      int: function (a, b) { return Math.floor(a + (b - a + 1) * next()); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      sign: function () { return next() < 0.5 ? -1 : 1; },
      seed: function (v) { s = v >>> 0; }
    };
  }

  EB.U = {
    PI: PI, TAU: TAU,
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    sign: function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); },
    rad: function (d) { return d * PI / 180; },
    dist: function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); },
    dist2: function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
    angTo: function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
    wrapAng: function (a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; },
    easeOut: function (t) { return 1 - (1 - t) * (1 - t); },
    easeIn: function (t) { return t * t; },
    easeInOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    easeOutBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    pad: function (n, w, ch) { var s = String(n); ch = ch || '0'; while (s.length < w) s = ch + s; return s; },
    commas: function (n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
    // ゲーム進行用乱数（再現性あり）
    rng: makeRng(12345),
    // 演出用乱数
    fxRng: makeRng(987654321),
    makeRng: makeRng,
    hex: function (c) {
      // '#rrggbb' → [r,g,b]
      if (c.charAt(0) === '#') c = c.slice(1);
      if (c.length === 3) c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
      return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
    },
    rgb: function (r, g, b) {
      r = Math.max(0, Math.min(255, r | 0)); g = Math.max(0, Math.min(255, g | 0)); b = Math.max(0, Math.min(255, b | 0));
      return '#' + (r < 16 ? '0' : '') + r.toString(16) + (g < 16 ? '0' : '') + g.toString(16) + (b < 16 ? '0' : '') + b.toString(16);
    },
    mix: function (c1, c2, t) {
      var a = EB.U.hex(c1), b = EB.U.hex(c2);
      return EB.U.rgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    },
    shade: function (c, k) {
      // k>0 明るく / k<0 暗く
      var a = EB.U.hex(c);
      if (k >= 0) return EB.U.rgb(a[0] + (255 - a[0]) * k, a[1] + (255 - a[1]) * k, a[2] + (255 - a[2]) * k);
      return EB.U.rgb(a[0] * (1 + k), a[1] * (1 + k), a[2] * (1 + k));
    }
  };
})();
