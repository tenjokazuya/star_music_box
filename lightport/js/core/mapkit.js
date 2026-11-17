/* mapkit.js — マップ作りの道具。文字のマス目を矩形・線・散らしで作り、ground / objects の行配列にする
 *
 *   var g = Game.mapkit.grid(30, 24, 'g');       // 30×24 を 'g' で埋める
 *   g.rect(22, 0, 8, 6, 'D'); g.hline(0, 12, 30, 'd'); g.scatter('f', 12, 7, { on: 'g' });
 *   ground: g.rows()                              // ['gggg...', ...]
 * 小物のマス目は '.' を空きとして使う: Game.mapkit.grid(30, 24, '.')
 */
(function () {
  'use strict';

  function grid(w, h, ch) {
    var cells = [];
    for (var y = 0; y < h; y++) { cells.push(new Array(w).fill(ch)); }
    var g = {
      w: w, h: h, cells: cells,
      get: function (x, y) { return (cells[y] && cells[y][x] !== undefined) ? cells[y][x] : null; },
      set: function (x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) { cells[y][x] = c; } return g; },
      fill: function (c) { for (var y = 0; y < h; y++) { for (var x = 0; x < w; x++) { cells[y][x] = c; } } return g; },
      rect: function (x, y, rw, rh, c) { for (var yy = y; yy < y + rh; yy++) { for (var xx = x; xx < x + rw; xx++) { g.set(xx, yy, c); } } return g; },
      hline: function (x, y, len, c) { return g.rect(x, y, len, 1, c); },
      vline: function (x, y, len, c) { return g.rect(x, y, 1, len, c); },
      frame: function (x, y, rw, rh, c) { g.hline(x, y, rw, c); g.hline(x, y + rh - 1, rw, c); g.vline(x, y, rh, c); g.vline(x + rw - 1, y, rh, c); return g; },
      /** 指定の場所だけ書き換える。list: [[x,y],...] */
      cellsAt: function (list, c) { list.forEach(function (p) { g.set(p[0], p[1], c); }); return g; },
      /** 種つき乱数で n 個散らす。opt.on: この文字の上だけ、opt.avoid: 近づかない文字 */
      scatter: function (c, n, seed, opt) {
        opt = opt || {};
        var r = Game.util.rng(seed), tries = 0, put = 0;
        while (put < n && tries++ < n * 40) {
          var x = r.int(w), y = r.int(h);
          if (opt.on && cells[y][x] !== opt.on) { continue; }
          if (opt.region && !(x >= opt.region[0] && y >= opt.region[1] && x < opt.region[0] + opt.region[2] && y < opt.region[1] + opt.region[3])) { continue; }
          g.set(x, y, c); put++;
        }
        return g;
      },
      rows: function () { return cells.map(function (r) { return r.join(''); }); }
    };
    return g;
  }

  Game.mapkit = { grid: grid };
})();
