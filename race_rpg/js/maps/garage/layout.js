/* ゲンゾウじどうしゃ（ガレージ）: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('garage', {
    w: 14, h: 11, name: 'ゲンゾウ じどうしゃ', bgm: 'shop', amb: 'indoor', dark: true, ambient: '#b0b0c0',
    build: function (M) {
      RR.MapKit.room(M, { w: 14, h: 11, floor: 'garage', wall: 'wall_gray', doorX: 7, exit: { map: 'town', x: 'garage' } });
      M.prop('lift', 2, 4);
      M.prop('car', 3, 4, { dynamic: true, mine: true });
      M.prop('partsrack', 5, 2); M.prop('toolbox', 8, 2); M.prop('tires', 10, 2); M.prop('tires', 11, 2);
      M.prop('poster', 3, 1, { c: '#e85848' }); M.prop('clock', 9, 1); M.prop('window_in', 12, 1);
      M.prop('desk', 10, 6); M.prop('drum', 12, 8, { c: '#3868a8' }); M.prop('drum', 1, 8, { c: '#c83030' }); M.prop('crate', 1, 7);
      M.prop('lamp_in', 12, 4);
      M.light(56, 72, 56, '#f8f0d8'); M.light(160, 60, 40, '#f8f0d8');
    }
  });
})();
