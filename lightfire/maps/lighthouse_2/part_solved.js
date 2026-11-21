/* lighthouse_2 / 解決ずみ（またはボス撃破後＝帰り道）: 穴は うまった状態、木のかこいは なくなっている */
(function () {
  'use strict';
  PF.maps.part('lighthouse_2', 'solved', {
    when: PF.h.anyFlag(['c2.b_solved', 'c2.boss']),
    tiles: [{ x: 8, y: 6, ch: '+' }, { x: 8, y: 7, ch: '+' }],
    remove: ['blk1', 'blk2', 'bar1']
  });
})();
