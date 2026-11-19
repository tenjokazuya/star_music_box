/* コンビニ: 地形 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('konbini', {
    w: 12, h: 9, name: 'コンビニ', bgm: 'shop', amb: 'indoor', dark: false,
    build: function (M) {
      RR.MapKit.room(M, { w: 12, h: 9, floor: 'tile', wall: 'wall_blue', doorX: 5, exit: { map: 'town', x: 'konbini' } });
      M.prop('fridge_case', 1, 2); M.prop('fridge_case', 3, 2); M.prop('fridge_case', 5, 2);
      M.prop('shelf', 1, 4); M.prop('shelf', 4, 4, { goods: ['#f8e060', '#e85848', '#48a868', '#f8f8f8'] });
      M.prop('shelf', 1, 6, { goods: ['#c868c8', '#48a8e8', '#f8c838'] });
      M.prop('counter', 8, 5, { register: true });
      M.prop('shelf', 8, 2, { goods: ['#f8f8f8', '#e8c070', '#c84030'] });
      M.prop('poster', 10, 1, { c: '#30a060' });
    }
  });
})();
