/* キリハラ町: 地形（進行度で変化しない部分） */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('town', {
    w: 60, h: 46, name: 'キリハラ ちょう', bgm: 'town', amb: 'town', dark: true, ambient: '#6870a8',
    build: function (M) {
      M.fill('grass');
      // 外周の森
      M.border('forest', 2);
      // ---- 大通り（東西） ----
      M.rect(2, 19, 56, 1, 'walk');
      M.rect(2, 20, 56, 1, 'road');
      M.rect(2, 21, 56, 1, 'road_ch');
      M.rect(2, 22, 56, 1, 'road');
      M.rect(2, 23, 56, 1, 'walk');
      // ---- 峠へ向かう道（南北・北側） ----
      M.rect(28, 0, 1, 19, 'road'); M.rect(29, 0, 1, 19, 'road_cv'); M.rect(30, 0, 1, 19, 'road');
      M.rect(27, 3, 1, 16, 'walk'); M.rect(31, 3, 1, 16, 'walk');
      // ---- 南北・南側（バス停へ） ----
      M.rect(28, 23, 1, 21, 'road'); M.rect(29, 23, 1, 21, 'road_cv'); M.rect(30, 23, 1, 21, 'road');
      M.rect(27, 24, 1, 20, 'walk'); M.rect(31, 24, 1, 20, 'walk');
      // 交差点
      M.rect(28, 20, 3, 3, 'road');
      M.rect(32, 20, 1, 3, 'cross_h'); M.rect(26, 20, 1, 3, 'cross_h');
      M.rect(28, 24, 3, 1, 'cross_v'); M.rect(28, 18, 3, 1, 'cross_v');
      // ---- 住宅地の通り ----
      M.rect(2, 32, 25, 2, 'road'); M.rect(2, 34, 25, 1, 'walk');
      M.rect(32, 32, 26, 2, 'road'); M.rect(32, 34, 26, 1, 'walk');
      M.rect(27, 32, 1, 2, 'road'); M.rect(31, 32, 1, 2, 'road');

      // ---- 北側の店（ドアは大通りに面する） ----
      // 神社への参道
      M.rect(6, 4, 2, 15, 'stone');
      M.building(9, 14, 5, 5, { roof: 'red', wall: 'cream', door: 2, sign: 'ラーメン', signC: '#c83830', awning: '#c83830' });
      M.building(15, 14, 6, 5, { roof: 'brown', wall: 'wood', door: 2, sign: 'きっさ ゆうやけ', signC: '#c87830', awning: '#e08838', winOff: 1 });
      M.prop('vending', 22, 18, { c: '#c83838' });
      M.prop('vending', 23, 18, { c: '#3060c0' });
      M.prop('trash', 24, 18);
      M.prop('phone', 25, 17);
      M.building(33, 14, 7, 5, { flat: true, flatC: '#b0b4c0', wall: 'white', door: 3, glassDoor: true, shopWin: true, sign: 'コンビニ', signC: '#30a060', signGlow: '#a0f8c0', ac: true });
      M.prop('vending', 40, 18, { c: '#e0e0e8' });
      M.building(41, 14, 5, 5, { roof: 'teal', wall: 'pink', door: 2, sign: 'ざっか', signC: '#3870c0', awning: '#3870c0' });
      M.building(48, 14, 7, 5, { flat: true, flatC: '#707080', wall: 'dark', door: 1, glassDoor: true, shopWin: true, sign: 'パーツ ショップ', signC: '#e0a020', signT: '#202020', signGlow: '#f8d070' });
      M.prop('tires', 55, 18); M.prop('drum', 56, 18, { c: '#c83030' });
      // 北エリア: 神社
      M.building(4, 3, 6, 4, { roof: 'black', wall: 'wood', noWin: true, fakeDoor: [2, 3], lit: false });
      M.prop('lantern', 4, 8); M.prop('lantern', 9, 8);
      M.prop('torii', 5, 11);
      M.trees([[2, 3], [2, 6], [10, 4], [12, 7], [2, 10], [11, 11], [2, 14]], 'pine');
      M.prop('sign', 8, 17);
      // 旧道へ続く道（ふだんはゲートで封鎖。post レイヤーで開く）
      M.rect(12, 0, 2, 4, 'dirt'); M.rect(12, 4, 2, 2, 'dirt'); M.rect(8, 5, 4, 1, 'dirt');
      // 北の道の両側
      M.prop('sign', 32, 4, { c: '#3858a0' });
      M.trees([[24, 3], [24, 7], [24, 11], [33, 3], [33, 7], [36, 11], [20, 6], [16, 3], [16, 9], [20, 11]]);
      M.lamp(27, 8); M.lamp(31, 13);
      // 北東: 池と公園
      M.rect(40, 5, 7, 4, 'water'); M.rect(41, 9, 5, 1, 'water');
      M.rect(39, 4, 9, 1, 'walk'); M.rect(39, 10, 9, 1, 'walk'); M.rect(39, 4, 1, 7, 'walk'); M.rect(47, 4, 1, 7, 'walk');
      M.prop('bench', 42, 11); M.lamp(39, 11, { r: 40 });
      M.building(50, 6, 6, 5, { roof: 'gray', wall: 'white', fakeDoor: [2], winOff: 0 });
      M.trees([[48, 2], [52, 2], [55, 11], [36, 5], [44, 2]]);
      M.rect(51, 11, 2, 8, 'walk');

      // ---- 南西ブロック: 家・ガレージ ----
      M.building(5, 27, 5, 5, { roof: 'blue', wall: 'cream', door: 2 });
      M.prop('postbox', 4, 31);
      M.rect(10, 28, 1, 4, 'conc');
      M.prop('car', 10, 30, { dynamic: true, mine: true });
      M.building(12, 25, 7, 7, { roof: 'gray', wall: 'gray', wallRows: 3, door: 5, shutter: { x: 1, w: 3, open: true }, sign: 'ゲンゾウ じどうしゃ', signC: '#283868', signGlow: '#a0b8f8' });
      M.rect(13, 32, 3, 0, 'conc');
      M.prop('tires', 19, 30); M.prop('drum', 19, 31, { c: '#3868a8' }); M.prop('crate', 11, 26);
      M.building(21, 27, 5, 5, { roof: 'green', wall: 'white', fakeDoor: [2] });
      M.trees([[2, 24], [2, 28], [19, 24]]);
      M.prop('bush', 4, 25, { flowers: true }); M.prop('bush', 10, 25);
      M.lamp(4, 23); M.lamp(16, 23); M.lamp(24, 34); M.lamp(10, 34); M.lamp(40, 23); M.lamp(52, 23);
      // ---- 南東ブロック: ガソリンスタンド・中古車店 ----
      M.rect(32, 24, 13, 8, 'conc');
      M.prop('canopy', 33, 26, { w: 7, h: 2 });
      M.prop('pump', 34, 27); M.prop('pump', 38, 27);
      M.building(40, 27, 5, 4, { roof: 'flat', flatC: '#e0e0e8', wall: 'white', door: 1, glassDoor: true, shopWin: true, sign: 'ガソリン', signC: '#d83030' });
      M.prop('drum', 44, 31, { c: '#d83030' });
      M.rect(46, 24, 12, 8, 'gravel');
      M.building(52, 27, 5, 4, { roof: 'flat', flatC: '#c0c0cc', wall: 'blue', door: 2, glassDoor: true, shopWin: true, sign: 'ちゅうこしゃ', signC: '#3050a0' });
      M.prop('car', 47, 25, { model: 'hayate', color: 'white' });
      M.prop('car', 49, 25, { model: 'regulus', color: 'black' });
      M.prop('car', 51, 24, { model: 'sylph', color: 'yellow' });
      M.prop('car', 47, 28, { model: 'tsubame', color: 'pink' });
      M.prop('cone', 46, 31); M.prop('cone', 50, 31);
      M.lamp(46, 24, { r: 40 }); M.lamp(57, 24, { r: 40 });
      // ---- 南: 公園とバス停 ----
      M.rect(3, 35, 18, 8, 'grass');
      M.rect(4, 38, 16, 1, 'walk'); M.rect(11, 35, 2, 8, 'walk');
      M.prop('fountain', 11, 37);
      M.prop('bench', 5, 39); M.prop('bench', 15, 36);
      M.prop('flowerbed', 4, 36); M.prop('flowerbed', 15, 41);
      M.trees([[2, 40], [7, 41], [19, 39], [22, 36], [24, 40]], 'sakura');
      M.lamp(9, 36); M.lamp(14, 40);
      M.prop('busstop', 32, 41);
      M.prop('bench', 33, 40);
      // 畑
      M.rect(36, 36, 12, 6, 'dirt');
      for (var x = 36; x < 48; x++) { M.set(x, 35, 'fence'); M.set(x, 42, 'fence'); }
      for (var y = 35; y <= 42; y++) { M.set(35, y, 'fence'); M.set(48, y, 'fence'); }
      M.set(41, 35, 'grass');
      for (var r = 37; r < 42; r += 2) for (x = 37; x < 47; x++) if (x % 2) M.prop('bush', x, r, { c: '#4c8c3c', nosolid: false });
      M.trees([[50, 36], [54, 38], [51, 41], [56, 35]]);
      // ---- ワープ ----
      M.door(7, 31, { map: 'home', x: 'door' });
      M.door(17, 31, { map: 'garage', x: 'door' });
      M.door(11, 18, { map: 'ramen', x: 'door' });
      M.door(17, 18, { map: 'cafe', x: 'door' });
      M.door(36, 18, { map: 'konbini', x: 'door' });
      M.door(43, 18, { map: 'zakka', x: 'door' });
      M.door(49, 18, { map: 'parts', x: 'door' });
      M.door(41, 30, { map: 'gs', x: 'door' });
      M.door(54, 30, { map: 'dealer', x: 'door' });
      M.warp(28, 0, { map: 'pass', x: 'south' }); M.warp(29, 0, { map: 'pass', x: 'south' }); M.warp(30, 0, { map: 'pass', x: 'south' });
      // ---- 出入り口の位置 ----
      M.spot('start', 31, 41, 'up');
      M.spot('busstop', 31, 41, 'up');
      M.spot('home', 7, 32, 'down');
      M.spot('garage', 17, 32, 'down');
      M.spot('ramen', 11, 19, 'down');
      M.spot('cafe', 17, 19, 'down');
      M.spot('konbini', 36, 19, 'down');
      M.spot('zakka', 43, 19, 'down');
      M.spot('parts', 49, 19, 'down');
      M.spot('gs', 41, 31, 'down');
      M.spot('dealer', 54, 31, 'down');
      M.spot('north', 29, 2, 'down');
      M.spot('oldroad', 12, 1, 'down');
    }
  });
})();
