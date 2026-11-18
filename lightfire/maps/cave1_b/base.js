/* cave1_b — ブロックを穴に落として道を作る */
(function () {
  'use strict';
  var m = PF.mk.new(16, 13, 'X');
  m.rect(2, 9, 12, 3, '+'); m.rect(7, 5, 2, 4, '+'); m.rect(3, 2, 10, 3, '+');
  m.rect(7, 0, 1, 2, '+'); m.rect(7, 12, 1, 1, '/');
  m.set(7, 6, 'O'); m.set(8, 6, 'O');
  m.set(3, 2, 'Y'); m.set(12, 2, 'Y'); m.set(2, 11, 'Y');
  PF.maps.base('cave1_b', {
    name: 'ひだねの ほらあな', area: 'ひだねの ほらあな', rows: m.rows(), bgm: 'cave', ambience: ['cave', 'drip'], dark: 0.55, reset: true,
    encounter: { table: 'cave1' }, wingTo: { map: 'forest', pos: { entry: 'cave' } },
    hint: 'ブロックを あなに おとして うめよう。\nうしろから おせば まっすぐ すすむよ。',
    entries: { south: { x: 7, y: 11, dir: 'u' }, north: { x: 7, y: 2, dir: 'd' } },
    objects: [
      { type: 'warp', x: 7, y: 12, to: 'cave1_a', entry: 'north', sfx: 'stairs' },
      { type: 'warp', x: 7, y: 0, to: 'cave1_c', entry: 'south', sfx: 'stairs' },
      { type: 'deco', id: 'l1', x: 3, y: 2, light: 30, solid: false }, { type: 'deco', id: 'l2', x: 12, y: 2, light: 30, solid: false }, { type: 'deco', id: 'l3', x: 2, y: 11, light: 26, solid: false },
      { type: 'block', id: 'blk1', x: 7, y: 10 }, { type: 'block', id: 'blk2', x: 8, y: 10 },
      { type: 'chest', id: 'c1', x: 11, y: 3, item: 'tea' },
      { type: 'chest', id: 'c2', x: 3, y: 10, item: 'herb' }
    ],
    puzzles: [{ kind: 'fn', flag: 'c1.b_solved', check: function (F) { return !F.tile(7, 6).pit && !F.tile(8, 6).pit; },
      solved: async function (g) { await g.say('みちが つながった!'); } }]
  });
})();
