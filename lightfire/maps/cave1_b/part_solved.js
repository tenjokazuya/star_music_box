/* cave1_b / 解決ずみ: 穴は うまった状態にする */
(function () {
  'use strict';
  PF.maps.part('cave1_b', 'solved', {
    when: { flag: 'c1.b_solved' },
    tiles: [{ x: 7, y: 6, ch: '+' }, { x: 8, y: 6, ch: '+' }],
    remove: ['blk1', 'blk2']
  });
})();
