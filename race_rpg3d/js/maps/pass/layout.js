/* とうげみち: 町と4つのパーキングエリアを結ぶ山道（地形） */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('pass', {
    w: 32, h: 40, name: 'とうげみち', bgm: 'pass', amb: 'pass', dark: true, ambient: '#5c6490', base: 'forest',
    build: function (M) {
      M.fill('forest');
      // 本線（南北）
      M.rect(11, 4, 9, 36, 'grass');
      M.rect(14, 0, 1, 40, 'road'); M.rect(15, 0, 1, 40, 'road_cv'); M.rect(16, 0, 1, 40, 'road');
      M.rect(13, 4, 1, 36, 'rail'); M.rect(17, 4, 1, 36, 'rail');
      // 西: ツヅラ（y30〜32）
      M.rect(0, 29, 14, 5, 'grass');
      M.rect(0, 30, 14, 3, 'road'); M.rect(0, 31, 13, 1, 'road_ch');
      M.rect(0, 29, 13, 1, 'rail'); M.rect(0, 33, 13, 1, 'rail');
      M.set(13, 30, 'road'); M.set(13, 31, 'road'); M.set(13, 32, 'road');
      // 東: ヘビノセ（y20〜22）
      M.rect(17, 19, 15, 5, 'grass');
      M.rect(17, 20, 15, 3, 'road'); M.rect(18, 21, 14, 1, 'road_ch');
      M.rect(18, 19, 14, 1, 'rail'); M.rect(18, 23, 14, 1, 'rail');
      M.set(17, 20, 'road'); M.set(17, 21, 'road'); M.set(17, 22, 'road');
      // 西: キリガタニ（y10〜12）
      M.rect(0, 9, 14, 5, 'grass');
      M.rect(0, 10, 14, 3, 'road'); M.rect(0, 11, 13, 1, 'road_ch');
      M.rect(0, 9, 13, 1, 'rail'); M.rect(0, 13, 13, 1, 'rail');
      M.set(13, 10, 'road'); M.set(13, 11, 'road'); M.set(13, 12, 'road');
      // 岩と木で山らしく
      M.rect(20, 4, 4, 14, 'rock'); M.rect(20, 25, 6, 13, 'rock'); M.rect(6, 15, 7, 13, 'rock'); M.rect(5, 35, 8, 4, 'rock');
      M.trees([[11, 6, 'pine'], [11, 16, 'pine'], [11, 24, 'pine'], [18, 6, 'pine'], [18, 14, 'pine'], [18, 26, 'pine'], [18, 34, 'pine'], [11, 36, 'pine']]);
      M.lamp(12, 29); M.lamp(18, 24); M.lamp(12, 9); M.lamp(18, 3); M.lamp(12, 38);
      // 看板
      M.prop('sign', 11, 34, { c: '#3858a0' }); M.prop('sign', 19, 24, { c: '#3858a0' }); M.prop('sign', 11, 14, { c: '#3858a0' }); M.prop('sign', 18, 2, { c: '#3858a0' });
      M.check(11, 34, async function (E) { await E.msg('{y}← ツヅラとうげ{w}'); });
      M.check(19, 24, async function (E) { await E.msg('{y}ヘビノセ →{w}'); });
      M.check(11, 14, async function (E) { await E.msg('{y}← キリガタニ{w}'); });
      M.check(18, 2, async function (E) { await E.msg('{y}↑ ヤシャだけ{w}'); });
      // ワープ
      for (var y = 30; y <= 32; y++) M.warp(0, y, { map: 'pa_tsuzura', x: 'entry' });
      for (y = 20; y <= 22; y++) M.warp(31, y, { map: 'pa_hebi', x: 'entry' });
      for (y = 10; y <= 12; y++) M.warp(0, y, { map: 'pa_kiri', x: 'entry' });
      for (var x = 14; x <= 16; x++) { M.warp(x, 0, { map: 'pa_yasha', x: 'entry' }); M.warp(x, 39, { map: 'town', x: 'north' }); }
      M.spot('south', 15, 38, 'up');
      M.spot('tsuzura', 1, 31, 'right');
      M.spot('hebi', 30, 21, 'left');
      M.spot('kiri', 1, 11, 'right');
      M.spot('yasha', 15, 1, 'down');
    }
  });
})();
