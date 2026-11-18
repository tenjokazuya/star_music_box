/* volc_b — かざんの ほらあな 2: ようがんの 川に ブロックを 3つ 落として 橋にする */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'V');
  m.rect(2, 8, 12, 3, 'a'); m.rect(8, 2, 1, 6, 'a'); m.rect(4, 2, 9, 1, 'a');
  m.set(8, 4, 'L'); m.set(8, 5, 'L'); m.set(8, 6, 'L');
  m.rect(8, 11, 1, 1, 'a'); m.set(8, 12, '/'); m.rect(11, 0, 1, 2, 'a'); m.rect(11, 2, 1, 1, 'a');
  m.set(2, 8, 'R'); m.set(13, 8, 'R'); m.set(2, 10, 'R'); m.set(13, 10, 'R');
  PF.maps.base('volc_b', {
    name: 'かざんの ほらあな', area: 'かざんの ほらあな', rows: m.rows(), bgm: 'volcano', ambience: ['lava', 'bubble'], dark: 0.3, reset: true,
    encounter: { table: 'volcano' }, wingTo: { map: 'kazan', pos: { entry: 'cave' } },
    hint: 'ようがんの かわに ブロックを おとすと、かたまって ゆかに なる。\nブロックを まんなかの みちの したから うえへ おしあげよう。',
    entries: { south: { x: 8, y: 10, dir: 'u' }, north: { x: 11, y: 2, dir: 'd' } },
    objects: [
      h.warp(8, 12, 'volc_a', 'north', 'stairs'), h.warp(11, 0, 'volc_boss', 'south', 'stairs'),
      h.light('l1', 2, 8, 26), h.light('l2', 13, 8, 26), h.light('l3', 2, 10, 26), h.light('l4', 13, 10, 26),
      h.block('blk1', 8, 9), h.block('blk2', 5, 9), h.block('blk3', 11, 9),
      h.chest('c1', 4, 2, 'herb3'), h.chest('c2', 12, 2, 200)
    ],
    puzzles: [{ kind: 'fn', flag: 'v.b_solved', check: function (F) { return !F.tile(8, 4).lava && !F.tile(8, 5).lava && !F.tile(8, 6).lava; }, solved: async function (g) { await g.say('かわが かたまって みちに なった!'); } }]
  });
})();
