/* シード可能な乱数（mulberry32）。ゲームロジックは RP.rng、演出は RP.fxrng を使う。 */
(function (RP) {
  'use strict';

  function Rng(seed) {
    this.s = (seed >>> 0) || 1;
  }
  Rng.prototype.next = function () {
    var t = this.s = (this.s + 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  Rng.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  Rng.prototype.weighted = function (items, weightFn) {
    var total = 0, i;
    for (i = 0; i < items.length; i++) { total += weightFn(items[i]); }
    var r = this.next() * total;
    for (i = 0; i < items.length; i++) {
      r -= weightFn(items[i]);
      if (r <= 0) { return items[i]; }
    }
    return items[items.length - 1];
  };
  Rng.prototype.gauss = function () {
    var u = 0, v = 0;
    while (u === 0) { u = this.next(); }
    while (v === 0) { v = this.next(); }
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  RP.Rng = Rng;
  RP.rng = new Rng((Date.now() ^ 0x5bd1e995) >>> 0);   // ゲームロジック用
  RP.fxrng = new Rng((Date.now() ^ 0x1b873593) >>> 0); // 演出用（セーブ再現性に影響させない）
})(window.RP);
