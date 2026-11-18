/* mapkit.js — マップ作成補助（矩形・道・家・部屋・散布）。マップは「コードで組み立てたデータ」 */
(function () {
  'use strict';
  function Grid(w, h, fill) {
    this.w = w; this.h = h; this.g = [];
    for (var y = 0; y < h; y++) { var r = []; for (var x = 0; x < w; x++) r.push(fill); this.g.push(r); }
    this.fill = fill;
  }
  var P = Grid.prototype;
  P.inb = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; };
  P.set = function (x, y, ch) { if (this.inb(x, y)) this.g[y][x] = ch; return this; };
  P.get = function (x, y) { return this.inb(x, y) ? this.g[y][x] : null; };
  P.rect = function (x, y, w, h, ch) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, ch); return this; };
  P.hline = function (x, y, len, ch) { return this.rect(x, y, len, 1, ch); };
  P.vline = function (x, y, len, ch) { return this.rect(x, y, 1, len, ch); };
  P.border = function (ch, t) { t = t || 1; for (var i = 0; i < t; i++) { this.hline(0, i, this.w, ch); this.hline(0, this.h - 1 - i, this.w, ch); this.vline(i, 0, this.h, ch); this.vline(this.w - 1 - i, 0, this.h, ch); } return this; };
  P.stamp = function (x, y, rows) { for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) if (rows[j][i] !== ' ') this.set(x + i, y + j, rows[j][i]); return this; };
  // 折れ線の道。ブラシ幅 bw
  P.path = function (pts, ch, bw) {
    bw = bw || 1;
    for (var k = 0; k + 1 < pts.length; k++) {
      var a = pts[k], b = pts[k + 1], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), x = a[0], y = a[1];
      while (true) { this.rect(x, y, bw, bw, ch); if (x === b[0] && y === b[1]) break; if (x !== b[0]) x += dx; else y += dy; }
    }
    return this;
  };
  // 建物 (屋根2段 + 壁1段)。戻り値: 扉の位置
  P.house = function (x, y, w, o) {
    o = o || {}; var blue = o.roof === 'blue';
    this.hline(x, y, w, blue ? '3' : '1'); this.hline(x, y + 1, w, blue ? '4' : '2');
    for (var i = 0; i < w; i++) this.set(x + i, y + 2, (w >= 5 && (i === 1 || i === w - 2)) ? 'N' : (w === 3 && i !== 1 ? 'N' : 'D'));
    var dx = x + (o.door !== undefined ? o.door : (w >> 1)); this.set(dx, y + 2, '0');
    return { x: x, y: y, w: w, doorX: dx, doorY: y + 2, frontX: dx, frontY: y + 3 };
  };
  // ランダム散布: onlyOn に含まれるタイルの上にだけ置く
  P.scatter = function (x, y, w, h, ch, prob, seed, onlyOn) {
    var R = PF.seeded(seed || 1);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var c = this.get(x + i, y + j);
      if (c !== null && (!onlyOn || onlyOn.indexOf(c) >= 0) && R() < prob) this.set(x + i, y + j, ch);
    }
    return this;
  };
  // 屋内の部屋。上壁2段 + 左右下の壁。
  P.room = function (floor, o) {
    o = o || {};
    this.rect(0, 0, this.w, this.h, floor || '=');
    this.hline(0, 0, this.w, 'W'); this.hline(0, 1, this.w, 'W');
    this.vline(0, 0, this.h, 'W'); this.vline(this.w - 1, 0, this.h, 'W'); this.hline(0, this.h - 1, this.w, 'W');
    return this;
  };
  P.rows = function () { return this.g.map(function (r) { return r.join(''); }); };
  P.dump = function () { return this.rows().join('\n'); };

  PF.mk = { new: function (w, h, fill) { return new Grid(w, h, fill || '.'); } };
})();
