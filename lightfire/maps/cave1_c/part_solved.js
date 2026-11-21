/* cave1_c / 解決ずみ（またはボス撃破後＝帰り道） */
(function () {
  'use strict';
  PF.maps.part('cave1_c', 'solved', {
    when: PF.h.anyFlag(['c1.c_solved', 'c1.boss']),
    remove: ['blk1', 'blk2', 'pl1', 'pl2', 'gate_c'],
    objects: [{ type: 'gate', id: 'gate_c', x: 7, y: 1, open: true }]
  });
})();
