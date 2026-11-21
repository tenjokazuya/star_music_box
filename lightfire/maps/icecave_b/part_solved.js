/* icecave_b / 解決ずみ（またはボス撃破後＝帰り道）: 氷は とけ、燭台は ともり、とびらは 開いている */
(function () {
  'use strict';
  PF.h.solvedPart('icecave_b', 'solved', ['ic.b_solved', 'f.boss'], ['b1', 'b2', 'gate_b', 'ice1', 'ice2'], [{ id: 'gate_b', x: 8, y: 2 }], {
    objects: [
      { type: 'gate', id: 'gate_b', x: 8, y: 2, open: true },
      { type: 'brazier', id: 'b1', x: 4, y: 2, lit: true }, { type: 'brazier', id: 'b2', x: 11, y: 2, lit: true }
    ]
  });
})();
