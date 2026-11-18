/* icecave_b — こおりの ほこら 2: 氷を とかして 奥の しょくだいに ひを ともす */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 3, 12, 8, '+'); m.rect(8, 0, 1, 3, '+'); m.rect(8, 11, 1, 1, '+'); m.set(8, 12, '/');
  m.set(4, 2, '+'); m.set(11, 2, '+');
  m.set(2, 3, 'Y'); m.set(13, 3, 'Y'); m.set(6, 7, 'P'); m.set(9, 7, 'P');
  PF.maps.base('icecave_b', {
    name: 'こおりの ほこら', area: 'こおりの ほこら', rows: m.rows(), bgm: 'ice', ambience: ['snow', 'cave'], dark: 0.4, reset: true,
    encounter: { table: 'ice' }, wingTo: { map: 'fubuki', pos: { entry: 'shrine' } },
    hint: 'しょくだいの まえの こおりを ヒダネの ひで とかそう。\nふたつの しょくだいに ひを ともすと とびらが ひらく。\nひは すぐ きえるから はやく!',
    entries: { south: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 3, dir: 'd' } },
    objects: [
      h.warp(8, 12, 'icecave_a', 'north', 'stairs'), h.warp(8, 0, 'icecave_boss', 'south', 'stairs'),
      h.light('l1', 2, 3, 24), h.light('l2', 13, 3, 24),
      h.brazier('b1', 4, 2, 'b', { timer: 600 }), h.brazier('b2', 11, 2, 'b', { timer: 600 }),
      { type: 'iceblock', id: 'ice1', x: 4, y: 3, flag: 'ic.ice1', when: { not: 'ic.ice1' } },
      { type: 'iceblock', id: 'ice2', x: 11, y: 3, flag: 'ic.ice2', when: { not: 'ic.ice2' } },
      h.gate('gate_b', 8, 2), h.chest('c1', 2, 10, 'tea2'), h.chest('c2', 13, 10, 'herb2', 2)
    ],
    puzzles: [{ kind: 'all', group: 'b', needs: 'lit', flag: 'ic.b_solved', solved: async function (g) { await g.openGate('gate_b'); } }]
  });
})();
