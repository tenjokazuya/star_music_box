/* パーツショップ: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('parts', {
    w: 12, h: 9, name: 'パーツ ショップ', bgm: 'shop', amb: 'indoor', dark: true, ambient: '#b8b8c8',
    build: function (M) {
      RR.MapKit.room(M, { w: 12, h: 9, floor: 'garage', wall: 'wall_gray', doorX: 5, exit: { map: 'town', x: 'parts' } });
      M.prop('partsrack', 1, 2); M.prop('partsrack', 3, 2); M.prop('partsrack', 5, 2);
      M.prop('tires', 1, 4); M.prop('tires', 1, 5); M.prop('drum', 2, 6, { c: '#e0a020' });
      M.prop('counter', 7, 4, { register: true, c: '#585868' });
      M.prop('toolbox', 10, 2); M.prop('partsrack', 8, 2);
      M.prop('poster', 7, 1, { c: '#e0a020' }); M.prop('neon', 10, 1);
      M.light(96, 60, 60, '#f8f0d8');
    }
  });
})();
