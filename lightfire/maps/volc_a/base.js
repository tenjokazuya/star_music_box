/* volc_a — かざんの ほらあな 1: 9つの 燭台の ライツアウト（ひを ともすと となりの ひも 反転する）。初期配置は「全点灯から 3回押した状態」なので 必ず解ける */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'V');
  m.rect(2, 2, 12, 9, 'a'); m.rect(8, 0, 1, 2, 'a'); m.rect(8, 11, 1, 1, 'a'); m.set(8, 12, '/');
  m.rect(2, 2, 1, 1, 'L'); m.rect(13, 2, 1, 1, 'L'); m.rect(2, 10, 1, 1, 'L'); m.rect(13, 10, 1, 1, 'L');
  // 3x3 の盤。番号:  0 1 2 / 3 4 5 / 6 7 8
  var xs = [4, 8, 12], ys = [3, 6, 9];
  function link(i) { var r = Math.floor(i / 3), c = i % 3, a = []; if (r > 0) a.push('f' + (i - 3)); if (r < 2) a.push('f' + (i + 3)); if (c > 0) a.push('f' + (i - 1)); if (c < 2) a.push('f' + (i + 1)); return a; }
  var lit = [true, true, true, true, true, true, true, true, true];
  [0, 4, 7].forEach(function (p) { lit[p] = !lit[p]; link(p).forEach(function (id) { var n = +id.slice(1); lit[n] = !lit[n]; }); }); // 初期配置
  var objs = [h.warp(8, 12, 'kazan', 'cave', 'stairs'), h.warp(8, 0, 'volc_b', 'south', 'stairs'), h.light('l1', 2, 2, 28), h.light('l2', 13, 2, 28), h.light('l3', 2, 10, 28), h.light('l4', 13, 10, 28), h.gate('gate_a', 8, 1)];
  for (var i = 0; i < 9; i++) objs.push(h.brazier('f' + i, xs[i % 3], ys[Math.floor(i / 3)], 'a', { toggle: true, link: link(i), lit: lit[i] }));
  objs.push(h.chest('c1', 2, 6, 'herb2', 2), h.chest('c2', 13, 6, 'tea2'));
  PF.maps.base('volc_a', {
    name: 'かざんの ほらあな', area: 'かざんの ほらあな', rows: m.rows(), bgm: 'volcano', ambience: ['lava', 'bubble'], dark: 0.3, reset: true,
    encounter: { table: 'volcano' }, wingTo: { map: 'kazan', pos: { entry: 'cave' } },
    hint: 'しょくだいは ひを つけると、ほかの しょくだいの ひも おなじように ゆれる。\nつけたり けしたり できるよ。\nぜんぶ ともせば とびらが ひらく。',
    entries: { door: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 2, dir: 'd' } },
    objects: objs,
    puzzles: [{ kind: 'all', group: 'a', needs: 'lit', flag: 'v.a_solved', solved: async function (g) { await g.openGate('gate_a'); } }]
  });
})();
