/* ガソリンスタンドの じむしょ: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('gs', {
    w: 10, h: 8, name: 'ガソリンスタンド', bgm: 'shop', amb: 'indoor', dark: false,
    build: function (M) {
      RR.MapKit.room(M, { w: 10, h: 8, floor: 'tile', wall: 'wall', doorX: 4, exit: { map: 'town', x: 'gs' } });
      M.prop('counter', 3, 3, { register: true, c: '#d83030' });
      M.prop('shelf', 1, 2, { goods: ['#e8c030', '#3868a8', '#f0f0f0'] }); M.prop('tires', 7, 2); M.prop('drum', 8, 2, { c: '#d83030' });
      M.prop('vending', 8, 5, { c: '#3060c0' });
      M.prop('poster', 3, 1, { c: '#d83030' }); M.prop('clock', 6, 1);
    }
  });
})();
