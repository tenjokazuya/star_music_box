/* ざっか屋（家具・置物）: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('zakka', {
    w: 12, h: 9, name: 'ざっか', bgm: 'shop', amb: 'indoor', dark: true, ambient: '#c8b8c0',
    build: function (M) {
      RR.MapKit.room(M, { w: 12, h: 9, floor: 'carpet_beige', wall: 'wall_pink', doorX: 5, exit: { map: 'town', x: 'zakka' } });
      M.prop('counter', 8, 3, { c: '#a07850' });
      M.prop('sofa', 1, 3, { c: '#a04848' }); M.prop('lamp_in', 3, 3); M.prop('tv', 4, 2);
      M.prop('aquarium', 1, 6); M.prop('plant', 2, 6); M.prop('kotatsu', 7, 6);
      M.prop('shelf', 5, 2, { goods: ['#f8d0d0', '#d0e0f8', '#f8f0c0', '#c0f0d0'] });
      M.prop('rug', 3, 5, { c: '#4060a8' });
      M.prop('poster', 2, 1, { c: '#48b8a8' }); M.prop('neon', 6, 1); M.prop('clock', 9, 1);
      M.light(96, 70, 60, '#f8d8c0');
    }
  });
})();
