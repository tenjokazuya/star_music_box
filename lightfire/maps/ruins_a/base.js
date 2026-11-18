/* ruins_a — ひのいせき: 3x3 ライツアウト（かなり むずかしい配置。「全点灯から 4回押した状態」なので 必ず解ける） */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 2, 12, 9, '+'); m.rect(8, 0, 1, 2, '+'); m.rect(8, 11, 1, 1, '+'); m.set(8, 12, '/');
  m.set(2, 2, 'Y'); m.set(13, 2, 'Y'); m.set(2, 10, 'Y'); m.set(13, 10, 'Y');
  var xs = [4, 8, 12], ys = [3, 6, 9];
  function link(i) { var r = Math.floor(i / 3), c = i % 3, a = []; if (r > 0) a.push('f' + (i - 3)); if (r < 2) a.push('f' + (i + 3)); if (c > 0) a.push('f' + (i - 1)); if (c < 2) a.push('f' + (i + 1)); return a; }
  var lit = [true, true, true, true, true, true, true, true, true];
  [1, 2, 3, 8].forEach(function (p) { lit[p] = !lit[p]; link(p).forEach(function (id) { var n = +id.slice(1); lit[n] = !lit[n]; }); });
  var objs = [h.warp(8, 12, 'garden', 'ruins', 'stairs'), h.warp(8, 0, 'ruins_boss', 'south', 'stairs'), h.light('l1', 2, 2, 28), h.light('l2', 13, 2, 28), h.light('l3', 2, 10, 28), h.light('l4', 13, 10, 28), h.gate('gate_a', 8, 1)];
  for (var i = 0; i < 9; i++) objs.push(h.brazier('f' + i, xs[i % 3], ys[Math.floor(i / 3)], 'a', { toggle: true, link: link(i), lit: lit[i] }));
  PF.maps.base('ruins_a', {
    name: 'ひのいせき', area: 'ひのいせき', rows: m.rows(), bgm: 'ruins', ambience: ['cave'], dark: 0.4, reset: true,
    encounter: { table: 'ruins' }, wingTo: { map: 'garden', pos: { entry: 'ruins' } },
    hint: 'しょくだいに ひを つけると、となりの しょくだいも ゆれる。\nぜんぶ ともせば とびらが ひらく。\nつけて けして、じゅんばんを かんがえよう。',
    entries: { door: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 2, dir: 'd' } },
    objects: objs,
    puzzles: [{ kind: 'all', group: 'a', needs: 'lit', flag: 'r.a_solved', solved: async function (g) { await g.openGate('gate_a'); } }]
  });
})();
