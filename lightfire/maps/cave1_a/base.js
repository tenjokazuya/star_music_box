/* cave1_a — ひだねの ほらあな 入口の ひろま（押しブロックの入門） */
(function () {
  'use strict';
  var m = PF.mk.new(16, 13, 'X');
  m.rect(2, 2, 12, 9, '+'); m.rect(7, 0, 1, 2, '+');
  m.set(7, 11, '/');
  [[4, 4], [11, 4], [4, 8], [11, 8]].forEach(function (p) { m.set(p[0], p[1], 'P'); });
  m.set(2, 2, 'Y'); m.set(13, 2, 'Y');
  PF.maps.base('cave1_a', {
    name: 'ひだねの ほらあな', area: 'ひだねの ほらあな', rows: m.rows(), bgm: 'cave', ambience: ['cave', 'drip'], dark: 0.55, reset: true,
    encounter: { table: 'cave1' }, wingTo: { map: 'forest', pos: { entry: 'cave' } },
    hint: 'ブロックを おして ゆかの いたの うえに のせよう。\nそうすれば とびらが ひらきそうだ。',
    entries: { door: { x: 7, y: 10, dir: 'u' }, north: { x: 7, y: 2, dir: 'd' } },
    objects: [
      { type: 'warp', x: 7, y: 11, to: 'forest', entry: 'cave', sfx: 'stairs' },
      { type: 'warp', x: 7, y: 0, to: 'cave1_b', entry: 'south', sfx: 'stairs' },
      { type: 'deco', id: 'l1', x: 2, y: 2, light: 30, solid: false }, { type: 'deco', id: 'l2', x: 13, y: 2, light: 30, solid: false },
      { type: 'block', id: 'blk1', x: 5, y: 6 },
      { type: 'plate', id: 'pl1', x: 9, y: 6, group: 'a' },
      { type: 'gate', id: 'gate_a', x: 7, y: 1, text: 'いわの とびらが ぴったり とじている。' },
      { type: 'chest', id: 'c1', x: 12, y: 3, item: 'herb' }
    ],
    puzzles: [{ kind: 'all', group: 'a', needs: 'pressed', flag: 'c1.a_solved', solved: async function (g) { await g.openGate('gate_a'); } }]
  });
})();
