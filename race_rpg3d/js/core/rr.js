/* RR: トウゲ・ナイトストーリー 名前空間と汎用ユーティリティ */
(function () {
  'use strict';
  var RR = window.RR = window.RR || {};
  // 論理座標の基準は 240x160（UI の設計単位）。実画面の論理サイズは VW x VH、基準領域の左上は (OX, OY)
  RR.W = 240;
  RR.H = 160;
  RR.VW = 240; RR.VH = 160; RR.OX = 0; RR.OY = 0;
  RR.VERSION = '3.0.0';
  RR.DEBUG = /debug/.test(location.hash || '');

  var U = RR.U = {};
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.sign = function (v) { return v > 0 ? 1 : v < 0 ? -1 : 0; };
  U.approach = function (v, target, step) {
    if (v < target) return Math.min(v + step, target);
    return Math.max(v - step, target);
  };
  U.wrapAngle = function (a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  U.smooth = function (t) { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.easeOut = function (t) { t = U.clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); };
  U.easeIn = function (t) { t = U.clamp(t, 0, 1); return t * t; };
  U.easeOutBack = function (t) {
    t = U.clamp(t, 0, 1);
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  U.dist = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); };

  // 決定的な乱数（mulberry32）
  U.rng = function (seed) {
    var s = (seed >>> 0) || 1;
    var f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = function (a, b) { return a + Math.floor(f() * (b - a + 1)); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    return f;
  };
  // 座標ハッシュ（テクスチャのノイズ用）
  U.hash2 = function (x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + (seed || 0) * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  U.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  // 金額表示: 12345 -> "12,345"
  U.money = function (n) {
    n = Math.floor(n);
    var s = String(Math.abs(n)), out = '';
    while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3); }
    return (n < 0 ? '-' : '') + s + out;
  };
  U.pad = function (n, len, ch) {
    var s = String(n);
    while (s.length < len) s = (ch || '0') + s;
    return s;
  };
  // ミリ秒 -> "1'23\"45"
  U.time = function (ms) {
    if (ms == null || !isFinite(ms)) return "-'--\"--";
    var cs = Math.floor(ms / 10);
    var m = Math.floor(cs / 6000), s = Math.floor(cs / 100) % 60, c = cs % 100;
    return m + "'" + U.pad(s, 2) + '"' + U.pad(c, 2);
  };
  U.deepCopy = function (o) { return JSON.parse(JSON.stringify(o)); };
  U.uid = function () { return 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); };

  // オフスクリーンキャンバス（smooth=true で補間あり）
  U.canvas = function (w, h, smooth) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = !!smooth;
    c.g = g;
    return c;
  };
  // 色: '#rrggbb' → [r,g,b]（0..255）
  U.rgb = function (h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.hex = function (r, g, b) {
    r = Math.round(U.clamp(r, 0, 255)); g = Math.round(U.clamp(g, 0, 255)); b = Math.round(U.clamp(b, 0, 255));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };
  U.mix = function (a, b, t) {
    var x = U.rgb(a), y = U.rgb(b);
    return U.hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  };
  // 明るく(amt>0) / 暗く(amt<0)
  U.shade = function (c, amt) {
    var x = U.rgb(c);
    if (amt >= 0) return U.hex(x[0] + (255 - x[0]) * amt, x[1] + (255 - x[1]) * amt, x[2] + (255 - x[2]) * amt);
    var k = 1 + amt;
    return U.hex(x[0] * k, x[1] * k, x[2] * k);
  };

  RR.log = function () {
    if (RR.DEBUG && window.console) console.log.apply(console, arguments);
  };

  // プラットフォーム連携用フック（Electron / Capacitor から上書きできる）
  RR.platform = {
    toggleFullscreen: function () {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      } catch (e) { /* 非対応 */ }
    },
    onAchievement: function (id) { RR.log('achievement', id); },
    isTouch: function () {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }
  };
})();
