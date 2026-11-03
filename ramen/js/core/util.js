/* 汎用ユーティリティ。 */
(function (RP) {
  'use strict';

  var U = RP.util = {};

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.sign = function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); };
  U.approach = function (v, target, step) {
    if (v < target) { return Math.min(v + step, target); }
    return Math.max(v - step, target);
  };
  U.inRect = function (px, py, x, y, w, h) { return px >= x && px < x + w && py >= y && py < y + h; };
  U.dist = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); };

  // イージング（t: 0..1）
  U.ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return 1 - (1 - t) * (1 - t); },
    inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inCubic: function (t) { return t * t * t; },
    outBack: function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outBounce: function (t) {
      var n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) { return n1 * t * t; }
      if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
      if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
      t -= 2.625 / d1; return n1 * t * t + 0.984375;
    },
    outElastic: function (t) {
      if (t === 0 || t === 1) { return t; }
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    }
  };

  U.pad = function (n, len, ch) {
    var s = String(n); ch = ch || '0';
    while (s.length < len) { s = ch + s; }
    return s;
  };

  // 3桁区切り
  U.comma = function (n) {
    n = Math.floor(n);
    var neg = n < 0; if (neg) { n = -n; }
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return neg ? '-' + s : s;
  };

  // 円表記。大きい金額は万/億で短縮して画面幅に収める。
  U.yen = function (n, compact) {
    n = Math.floor(n);
    var neg = n < 0; if (neg) { n = -n; }
    var s;
    if (compact && n >= 100000000) {
      s = (Math.floor(n / 1000000) / 100).toFixed(2).replace(/\.?0+$/, '') + '億';
    } else if (compact && n >= 10000000) {
      s = (Math.floor(n / 100) / 100).toFixed(1).replace(/\.?0+$/, '') + '万';
    } else {
      s = U.comma(n);
    }
    return (neg ? '-' : '') + '¥' + s;
  };

  // 短い金額表記（HUDなど狭い場所向け）：9,999 / 12.3万 / 1.23億
  U.yenShort = function (n) {
    n = Math.floor(n);
    var neg = n < 0; if (neg) { n = -n; }
    var s;
    if (n >= 100000000) { s = (Math.floor(n / 1000000) / 100).toFixed(2).replace(/\.?0+$/, '') + '億'; }
    else if (n >= 10000) { s = (Math.floor(n / 1000) / 10).toFixed(1).replace(/\.0$/, '') + '万'; }
    else { s = U.comma(n); }
    return (neg ? '-' : '') + s;
  };

  // 時刻（ゲーム内分→"HH:MM"）
  U.clock = function (min) {
    min = Math.floor(min) % (24 * 60);
    return U.pad(Math.floor(min / 60), 2) + ':' + U.pad(min % 60, 2);
  };

  U.copy = function (o) { return JSON.parse(JSON.stringify(o)); };

  U.shuffle = function (arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor((rng ? rng.next() : Math.random()) * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  U.hexToRgb = function (hex) {
    var h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) { h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2); }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  U.rgbToHex = function (r, g, b) {
    function c(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + c(r) + c(g) + c(b);
  };
  U.mixHex = function (a, b, t) {
    var A = U.hexToRgb(a), B = U.hexToRgb(b);
    return U.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
})(window.RP);
