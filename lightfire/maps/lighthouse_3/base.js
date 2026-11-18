/* lighthouse_3 — とうだい 3階: 手がかりを 読んで 4つの 燭台を 正しい順に ともす */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 2, 12, 9, '+'); m.rect(8, 0, 1, 2, '+'); m.rect(8, 11, 1, 1, '+'); m.set(8, 12, '/');
  [[6, 6], [9, 6], [6, 8], [9, 8]].forEach(function (p) { m.set(p[0], p[1], 'P'); });
  m.set(2, 2, 'Y'); m.set(13, 2, 'Y');
  PF.maps.base('lighthouse_3', {
    name: 'とうだい 3かい', area: 'みなとの とうだい', rows: m.rows(), bgm: 'lighthouse', ambience: ['sea', 'drip'], dark: 0.6, reset: true,
    encounter: { table: 'lighthouse' }, wingTo: { map: 'nagi', pos: { entry: 'lighthouse' } },
    hint: 'かべの もじを よもう。\nそれぞれの しょくだいの ちかくの ゆかに、もようが ほられている。',
    entries: { south: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 2, dir: 'd' } },
    objects: [
      h.warp(8, 12, 'lighthouse_2', 'north', 'stairs'), h.warp(8, 0, 'lighthouse_top', 'south', 'stairs'),
      h.light('l1', 2, 2, 28), h.light('l2', 13, 2, 28),
      h.brazier('umi', 3, 3, 's', { key: 'umi' }), h.brazier('kaze', 12, 3, 's', { key: 'kaze' }),
      h.brazier('tsuki', 3, 9, 's', { key: 'tsuki' }), h.brazier('hoshi', 12, 9, 's', { key: 'hoshi' }),
      h.hot(4, 3, 'ゆかに なみの もようが ほられている。'), h.hot(11, 3, 'ゆかに かざぐるまの もようが ほられている。'),
      h.hot(4, 9, 'ゆかに みかづきの もようが ほられている。'), h.hot(11, 9, 'ゆかに ほしの もようが ほられている。'),
      h.sign(8, 4, 'かべに ちいさな もじが きざまれている。\n「うみに いのり、かぜに いのり、\nつきに いのり、ほしに いのれ」', 'clue'),
      h.gate('gate_s', 8, 1), h.chest('c1', 13, 6, 'chain'), h.chest('c2', 2, 6, 'tea')
    ],
    puzzles: [{ kind: 'seq', group: 's', order: ['umi', 'kaze', 'tsuki', 'hoshi'], flag: 'c2.c_solved',
      failMsg: 'ひが いっせいに きえてしまった…。\nじゅんばんが ちがうようだ。', solved: async function (g) { await g.openGate('gate_s'); } }]
  });
})();
