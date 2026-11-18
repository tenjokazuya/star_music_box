/* lighthouse_2 — とうだい 2階: ブロックで穴を埋め、木のかこいを 燃やして 進む */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 2, 6, 9, '+'); m.rect(9, 2, 5, 9, '+'); m.rect(8, 6, 1, 2, '+'); m.set(8, 6, 'O'); m.set(8, 7, 'O');
  m.rect(4, 11, 1, 1, '+'); m.set(4, 12, '/'); m.rect(12, 0, 1, 2, '+');
  m.set(2, 2, 'Y'); m.set(13, 10, 'Y'); m.set(13, 2, 'Y');
  PF.maps.base('lighthouse_2', {
    name: 'とうだい 2かい', area: 'みなとの とうだい', rows: m.rows(), bgm: 'lighthouse', ambience: ['sea', 'drip'], dark: 0.6, reset: true,
    encounter: { table: 'lighthouse' }, wingTo: { map: 'nagi', pos: { entry: 'lighthouse' } },
    hint: 'ブロックを よこから おして あなに おとそう。\nあなの むこうの いたの かこいは ヒダネの ひで もやせそうだ。',
    entries: { south: { x: 4, y: 10, dir: 'u' }, north: { x: 12, y: 2, dir: 'd' } },
    objects: [
      h.warp(4, 12, 'lighthouse_1', 'north', 'stairs'), h.warp(12, 0, 'lighthouse_3', 'south', 'stairs'),
      h.light('l1', 2, 2, 28), h.light('l2', 13, 2, 28), h.light('l3', 13, 10, 28),
      h.block('blk1', 6, 6), h.block('blk2', 6, 7),
      { type: 'barrier', id: 'bar1', x: 12, y: 1, flag: 'c2.b_barrier', when: { not: 'c2.b_barrier' } },
      h.chest('c1', 3, 3, 'herb2'), h.chest('c2', 13, 9, 'wing', 2), h.chest('c3', 10, 3, 120)
    ],
    puzzles: [{ kind: 'fn', flag: 'c2.b_solved', check: function (F) { return !F.tile(8, 6).pit && !F.tile(8, 7).pit; }, solved: async function (g) { await g.say('みちが つながった!'); } }]
  });
})();
