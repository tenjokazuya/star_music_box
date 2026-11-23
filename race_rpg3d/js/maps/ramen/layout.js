/* ラーメン屋: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('ramen', {
    w: 12, h: 9, name: 'ラーメン', bgm: 'shop', amb: 'indoor', dark: true, ambient: '#c0b0a0',
    build: function (M) {
      RR.MapKit.room(M, { w: 12, h: 9, floor: 'tile', wall: 'wall', doorX: 6, exit: { map: 'town', x: 'ramen' } });
      M.prop('stove', 3, 2); M.prop('pot', 6, 2); M.prop('fridge', 8, 2);
      M.prop('counter', 2, 4); M.prop('counter', 5, 4); M.prop('counter1', 8, 4);
      for (var x = 2; x <= 8; x++) M.prop('stool', x, 5, { c: '#c83838' });
      M.prop('table', 1, 6); M.prop('table', 9, 6, { bowl: true });
      M.prop('poster', 2, 1, { c: '#f8d040' }); M.prop('poster', 9, 1, { c: '#e85848' });
      M.light(80, 48, 50, '#f8c890');
    }
  });
})();
