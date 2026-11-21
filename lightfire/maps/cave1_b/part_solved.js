/* cave1_b / 解決ずみ（またはボス撃破後＝帰り道）: 穴は うまった状態にする */
(function () {
  'use strict';
  PF.maps.part('cave1_b', 'solved', {
    when: PF.h.anyFlag(['c1.b_solved', 'c1.boss']),
    tiles: [{ x: 7, y: 6, ch: '+' }, { x: 8, y: 6, ch: '+' }],
    remove: ['blk1', 'blk2']
  });
})();
