/* 中古車店: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('dealer', {
    w: 12, h: 9, name: 'ちゅうこしゃ', bgm: 'shop', amb: 'indoor', dark: false,
    build: function (M) {
      RR.MapKit.room(M, { w: 12, h: 9, floor: 'tile', wall: 'wall', doorX: 5, exit: { map: 'town', x: 'dealer' } });
      M.prop('desk', 5, 3, { pc: true }); M.prop('chair', 4, 3);
      M.prop('car', 1, 4, { model: 'hayate', color: 'red' });
      M.prop('car', 9, 4, { model: 'orochi', color: 'black' });
      M.prop('poster', 2, 1, { c: '#4878d8' }); M.prop('poster', 9, 1, { c: '#e85848' }); M.prop('clock', 5, 1);
      M.prop('plant', 1, 2); M.prop('plant', 10, 2);
    }
  });
})();
