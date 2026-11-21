/* tower_3 / 解決ずみ（またはボス撃破後＝帰り道） */
(function () {
  'use strict';
  PF.h.solvedPart('tower_3', 'solved', ['t.c_solved', 't.boss'], ['cave', 'light', 'ice', 'fire', 'gate_s'], [{ id: 'gate_s', x: 8, y: 1 }], {
    objects: [
      { type: 'gate', id: 'gate_s', x: 8, y: 1, open: true },
      { type: 'brazier', id: 'cave', x: 3, y: 3, lit: true }, { type: 'brazier', id: 'light', x: 12, y: 3, lit: true },
      { type: 'brazier', id: 'ice', x: 3, y: 9, lit: true }, { type: 'brazier', id: 'fire', x: 12, y: 9, lit: true }
    ]
  });
})();
