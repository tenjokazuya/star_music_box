/* volc_b / 解決ずみ（またはボス撃破後＝帰り道） */
(function () {
  'use strict';
  PF.maps.part('volc_b', 'solved', {
    when: PF.h.anyFlag(['v.b_solved', 'v.boss']),
    tiles: [{ x: 8, y: 4, ch: 'a' }, { x: 8, y: 5, ch: 'a' }, { x: 8, y: 6, ch: 'a' }],
    remove: ['blk1', 'blk2', 'blk3']
  });
})();
