/* cave1_a / 解決ずみ（またはボス撃破後＝帰り道）: ブロックと板を消し、とびらを開いたままにする */
(function () {
  'use strict';
  PF.maps.part('cave1_a', 'solved', {
    when: PF.h.anyFlag(['c1.a_solved', 'c1.boss']),
    remove: ['blk1', 'pl1', 'gate_a'],
    objects: [{ type: 'gate', id: 'gate_a', x: 7, y: 1, open: true }]
  });
})();
