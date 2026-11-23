/* 主人公の家（じいちゃんの家）: 部屋の外枠 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('home', {
    w: 12, h: 10, name: '', bgm: 'home', amb: 'indoor', dark: true, ambient: '#a8a0b8',
    build: function (M) {
      RR.MapKit.room(M, { w: 12, h: 10, floor: 'wood', wall: 'wall', doorX: 5, exit: { map: 'town', x: 'home' } });
      M.prop('window_in', 2, 1); M.prop('window_in', 10, 1);
      M.light(40, 24, 30, '#7890c0'); M.light(168, 24, 30, '#7890c0');
      M.light(96, 80, 60, '#d0c0a0');
    }
  });
})();
