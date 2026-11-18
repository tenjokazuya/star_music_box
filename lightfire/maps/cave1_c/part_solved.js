/* cave1_c / 解決ずみ */
(function () {
  'use strict';
  PF.maps.part('cave1_c', 'solved', {
    when: { flag: 'c1.c_solved' },
    remove: ['blk1', 'blk2', 'pl1', 'pl2', 'gate_c'],
    objects: [{ type: 'gate', id: 'gate_c', x: 7, y: 1, open: true }]
  });
})();
