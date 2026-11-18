/* lighthouse_1 — とうだい 1階: 時間内に 3つの 燭台に火を ともす */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 2, 12, 9, '+'); m.rect(8, 0, 1, 2, '+'); m.rect(8, 11, 1, 1, '+'); m.set(8, 12, '/');
  [[5, 5], [10, 5], [5, 8], [10, 8]].forEach(function (p) { m.set(p[0], p[1], 'P'); });
  m.set(2, 2, 'Y'); m.set(13, 2, 'Y');
  PF.maps.base('lighthouse_1', {
    name: 'とうだい 1かい', area: 'みなとの とうだい', rows: m.rows(), bgm: 'lighthouse', ambience: ['sea', 'drip'], dark: 0.6, reset: true,
    encounter: { table: 'lighthouse' }, wingTo: { map: 'nagi', pos: { entry: 'lighthouse' } },
    hint: 'みっつの しょくだいに ひを ともそう。\nひは しばらくすると きえるから、はやく ぜんぶ ともすんだ。\nBボタンを おしながら いどうすると はしれるよ。',
    entries: { door: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 2, dir: 'd' } },
    objects: [
      h.warp(8, 12, 'nagi', 'lighthouse', 'stairs'), h.warp(8, 0, 'lighthouse_2', 'south', 'stairs'),
      h.light('l1', 2, 2, 28), h.light('l2', 13, 2, 28),
      h.brazier('b1', 3, 3, 'a', { timer: 520 }), h.brazier('b2', 12, 3, 'a', { timer: 520 }), h.brazier('b3', 8, 8, 'a', { timer: 520 }),
      h.gate('gate_a', 8, 1),
      h.chest('c1', 13, 10, 'herb'), h.chest('c2', 2, 10, 'tea')
    ],
    puzzles: [{ kind: 'all', group: 'a', needs: 'lit', flag: 'c2.a_solved', solved: async function (g) { await g.openGate('gate_a'); } }]
  });
})();
