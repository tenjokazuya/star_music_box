/* util.js — 名前空間・共通ユーティリティ・フレーム待機 */
(function () {
  'use strict';
  var PF = window.PF = { W: 240, H: 160, T: 16, VERSION: '1.0.0', debug: false };

  PF.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  PF.rnd = function (n) { return Math.floor(Math.random() * n); };
  PF.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  PF.chance = function (p) { return Math.random() < p; };
  // 位置から決まる擬似乱数（タイルの揺らぎ用）
  PF.hash = function (x, y, s) {
    var h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  PF.seeded = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  PF.DIRS = { u: { x: 0, y: -1 }, d: { x: 0, y: 1 }, l: { x: -1, y: 0 }, r: { x: 1, y: 0 } };
  PF.OPP = { u: 'd', d: 'u', l: 'r', r: 'l' };
  PF.LEFTOF = { u: 'l', l: 'd', d: 'r', r: 'u' };
  PF.dirFromDelta = function (dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'r' : 'l';
    return dy > 0 ? 'd' : 'u';
  };
  PF.copy = function (o) { return JSON.parse(JSON.stringify(o)); };
  PF.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---- フレーム待機（ゲームループに紐づく Promise） ---- */
  var waiters = [];
  PF.wait = function (frames) {
    return new Promise(function (res) { waiters.push({ t: frames | 0, res: res }); });
  };
  PF.waitUntil = function (fn) {
    return new Promise(function (res) { waiters.push({ t: -1, fn: fn, res: res }); });
  };
  PF.updateWaiters = function () {
    for (var i = waiters.length - 1; i >= 0; i--) {
      var w = waiters[i];
      if (w.fn ? w.fn() : (--w.t <= 0)) { waiters.splice(i, 1); w.res(); }
    }
  };
  PF.clearWaiters = function () { waiters.length = 0; };

  /* ---- 小さなイベント発行 ---- */
  PF.events = {};
  PF.on = function (n, f) { (PF.events[n] = PF.events[n] || []).push(f); };
  PF.emit = function (n, a, b) { (PF.events[n] || []).forEach(function (f) { f(a, b); }); };

  PF.makeCanvas = function (w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    return c;
  };
  PF.ctx = function (c) { var x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x; };

  // 色ユーティリティ
  PF.rgb = function (hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  PF.hex = function (r, g, b) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };
  PF.shade = function (hex, f) { // f<1 暗く f>1 明るく
    var c = PF.rgb(hex);
    return PF.hex(PF.clamp(Math.round(c[0] * f), 0, 255), PF.clamp(Math.round(c[1] * f), 0, 255), PF.clamp(Math.round(c[2] * f), 0, 255));
  };
  PF.mix = function (a, b, t) {
    var p = PF.rgb(a), q = PF.rgb(b);
    return PF.hex(Math.round(p[0] + (q[0] - p[0]) * t), Math.round(p[1] + (q[1] - p[1]) * t), Math.round(p[2] + (q[2] - p[2]) * t));
  };
})();
