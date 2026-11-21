/* tower_2 / 解決ずみ（穴と板は 別々に 解ける）。ボス撃破後は 帰り道のため どちらも解決ずみにする */
(function () {
  'use strict';
  PF.maps.part('tower_2', 'pits', { when: PF.h.anyFlag(['t.b_pits', 't.boss']), tiles: [{ x: 8, y: 6, ch: '+' }, { x: 8, y: 7, ch: '+' }], remove: ['blk1', 'blk2'] });
  PF.maps.part('tower_2', 'plates', { when: PF.h.anyFlag(['t.b_plates', 't.boss']), remove: ['blk3', 'blk4', 'pl1', 'pl2', 'gate_p'], objects: [{ type: 'gate', id: 'gate_p', x: 11, y: 2, open: true }] });
})();
