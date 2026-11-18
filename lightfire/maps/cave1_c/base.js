/* cave1_c — 二つの板に ブロックを載せる */
(function () {
  'use strict';
  var m = PF.mk.new(16, 13, 'X');
  m.rect(2, 2, 12, 9, '+'); m.rect(7, 0, 1, 2, '+'); m.set(7, 11, '/');
  [[5, 5], [10, 5], [7, 4]].forEach(function (p) { m.set(p[0], p[1], 'P'); });
  m.set(2, 2, 'Y'); m.set(13, 2, 'Y'); m.set(2, 10, 'Y'); m.set(13, 10, 'Y');
  PF.maps.base('cave1_c', {
    name: 'ひだねの ほらあな', area: 'ひだねの ほらあな', rows: m.rows(), bgm: 'cave', ambience: ['cave', 'drip'], dark: 0.55, reset: true,
    encounter: { table: 'cave1' }, wingTo: { map: 'forest', pos: { entry: 'cave' } },
    hint: 'ブロックを よこに おしてから、うえへ おしあげよう。\nふたつの いたを どちらも ふむと とびらが ひらく。',
    entries: { south: { x: 7, y: 10, dir: 'u' }, north: { x: 7, y: 2, dir: 'd' } },
    objects: [
      { type: 'warp', x: 7, y: 11, to: 'cave1_b', entry: 'north', sfx: 'stairs' },
      { type: 'warp', x: 7, y: 0, to: 'cave1_boss', entry: 'south', sfx: 'stairs' },
      { type: 'deco', id: 'l1', x: 2, y: 2, light: 30, solid: false }, { type: 'deco', id: 'l2', x: 13, y: 2, light: 30, solid: false },
      { type: 'deco', id: 'l3', x: 2, y: 10, light: 26, solid: false }, { type: 'deco', id: 'l4', x: 13, y: 10, light: 26, solid: false },
      { type: 'block', id: 'blk1', x: 6, y: 8 }, { type: 'block', id: 'blk2', x: 9, y: 8 },
      { type: 'plate', id: 'pl1', x: 3, y: 3, group: 'c' }, { type: 'plate', id: 'pl2', x: 12, y: 3, group: 'c' },
      { type: 'gate', id: 'gate_c', x: 7, y: 1, text: 'いわの とびらが ぴったり とじている。' },
      { type: 'chest', id: 'c1', x: 3, y: 9, item: 'rustsw' },
      { type: 'chest', id: 'c2', x: 12, y: 9, item: 'herb2' }
    ],
    puzzles: [{ kind: 'all', group: 'c', needs: 'pressed', flag: 'c1.c_solved', solved: async function (g) { await g.openGate('gate_c'); } }]
  });
})();
