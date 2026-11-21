/* lighthouse_1 / 解決ずみ（またはボス撃破後＝帰り道）: 燭台は ともったまま、とびらは 開いている */
(function () {
  'use strict';
  PF.h.solvedPart('lighthouse_1', 'solved', ['c2.a_solved', 'c2.boss'], ['b1', 'b2', 'b3'], [{ id: 'gate_a', x: 8, y: 1 }], {
    objects: [
      { type: 'gate', id: 'gate_a', x: 8, y: 1, open: true },
      { type: 'brazier', id: 'b1', x: 3, y: 3, lit: true }, { type: 'brazier', id: 'b2', x: 12, y: 3, lit: true }, { type: 'brazier', id: 'b3', x: 8, y: 8, lit: true }
    ]
  });
})();
