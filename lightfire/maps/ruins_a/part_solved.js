/* ruins_a / 解決ずみ */
(function () {
  'use strict';
  var objs = [{ type: 'gate', id: 'gate_a', x: 8, y: 1, open: true }], rm = ['gate_a'], xs = [4, 8, 12], ys = [3, 6, 9];
  for (var i = 0; i < 9; i++) { rm.push('f' + i); objs.push({ type: 'brazier', id: 'f' + i, x: xs[i % 3], y: ys[Math.floor(i / 3)], lit: true }); }
  PF.maps.part('ruins_a', 'solved', { when: PF.h.anyFlag(['r.a_solved', 'bonus.cleared']), remove: rm, objects: objs });
})();
