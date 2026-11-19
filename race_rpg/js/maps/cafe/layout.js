/* きっさ ゆうやけ: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('cafe', {
    w: 12, h: 9, name: 'きっさ ゆうやけ', bgm: 'town', amb: 'indoor', dark: true, ambient: '#b8a090',
    build: function (M) {
      RR.MapKit.room(M, { w: 12, h: 9, floor: 'wood', wall: 'wall_wood', doorX: 5, exit: { map: 'town', x: 'cafe' } });
      M.prop('kitchen', 7, 2); M.prop('shelf', 9, 2, { c: '#7c5030', goods: ['#f0f0f0', '#a07040', '#e8c070', '#c84030'] });
      M.prop('counter', 7, 3, { c: '#6c4424' });
      M.prop('stool', 7, 4, { c: '#5c3c24' }); M.prop('stool', 8, 4, { c: '#5c3c24' }); M.prop('stool', 9, 4, { c: '#5c3c24' });
      M.prop('table1', 2, 4, { c: '#8c5c34' }); M.prop('chair', 1, 4, { c: '#6c4424' }); M.prop('chair', 3, 4, { c: '#6c4424' });
      M.prop('table1', 2, 6, { c: '#8c5c34' }); M.prop('chair', 1, 6, { c: '#6c4424' });
      M.prop('table1', 8, 6, { c: '#8c5c34' }); M.prop('chair', 9, 6, { c: '#6c4424' });
      M.prop('plant', 10, 7); M.prop('plant', 1, 2);
      M.prop('lamp_in', 4, 2);
      M.prop('window_in', 2, 1); M.prop('window_in', 4, 1); M.prop('clock', 6, 1);
      M.light(120, 48, 40, '#f8c890');
    }
  });
})();
