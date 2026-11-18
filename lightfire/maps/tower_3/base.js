/* tower_3 — きたのとう 3階: 4つの 燭台を「ヒダネと ともした ばしょ」の 順に ともす（これまでの たびを おもいだす パズル） */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 2, 12, 9, '+'); m.rect(8, 0, 1, 2, '+'); m.rect(8, 11, 1, 1, '+'); m.set(8, 12, '/');
  [[6, 6], [9, 6], [6, 8], [9, 8]].forEach(function (p) { m.set(p[0], p[1], 'P'); });
  m.set(2, 2, 'Y'); m.set(13, 2, 'Y');
  PF.maps.base('tower_3', {
    name: 'きたのとう 3かい', area: 'きたの とう', rows: m.rows(), bgm: 'tower', ambience: ['wind'], dark: 0.4, reset: true,
    encounter: { table: 'tower' }, wingTo: { map: 'world', pos: { entry: 'tower' } },
    hint: 'かべの もじを よもう。ヒダネと いっしょに ともしびを ともした ばしょを、\nともした じゅんに おもいだすんだ。',
    entries: { south: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 2, dir: 'd' } },
    objects: [
      h.warp(8, 12, 'tower_2', 'north', 'stairs'), h.warp(8, 0, 'tower_top', 'south', 'stairs'),
      h.light('l1', 2, 2, 26), h.light('l2', 13, 2, 26),
      h.brazier('cave', 3, 3, 's', { key: 'cave' }), h.brazier('light', 12, 3, 's', { key: 'light' }),
      h.brazier('ice', 3, 9, 's', { key: 'ice' }), h.brazier('fire', 12, 9, 's', { key: 'fire' }),
      h.hot(4, 3, 'ゆかに くらい ほらあなの もようが ほられている。'), h.hot(11, 3, 'ゆかに うみを てらす とうだいの もようが ほられている。'),
      h.hot(4, 9, 'ゆかに ゆきの けっしょうの もようが ほられている。'), h.hot(11, 9, 'ゆかに ほのおの もようが ほられている。'),
      h.sign(8, 4, 'かべに きざまれた もじ。\n「ともしびを ともした じゅんに ささげよ」', 'clue'),
      h.gate('gate_s', 8, 1), h.chest('c1', 13, 6, 'ring2'), h.chest('c2', 2, 6, 'herb3', 2)
    ],
    puzzles: [{ kind: 'seq', group: 's', order: ['cave', 'light', 'ice', 'fire'], flag: 't.c_solved',
      failMsg: 'ひが いっせいに きえてしまった…。\nじゅんばんが ちがうようだ。', solved: async function (g) { await g.openGate('gate_s'); } }]
  });
})();
