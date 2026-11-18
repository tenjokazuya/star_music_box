/* volc_a / 解決ずみ: 全部の燭台が ともったまま */
(function () {
  'use strict';
  var objs = [{ type: 'gate', id: 'gate_a', x: 8, y: 1, open: true }], rm = ['gate_a'], xs = [4, 8, 12], ys = [3, 6, 9];
  for (var i = 0; i < 9; i++) { rm.push('f' + i); objs.push({ type: 'brazier', id: 'f' + i, x: xs[i % 3], y: ys[Math.floor(i / 3)], lit: true }); }
  PF.maps.part('volc_a', 'solved', { when: { flag: 'v.a_solved' }, remove: rm, objects: objs });
})();
