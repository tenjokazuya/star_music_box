/* 地形タイルの定義（当たり判定・分類）。見た目は js/gfx3d/tiles3d.js が生成する
 * solid: 通れない / tall: 背の高いもの（壁・崖・森）/ group: 同じ種類として繋がる / anim: 水など動くもの
 */
(function () {
  'use strict';
  var RR = window.RR;
  var T = RR.Tiles = { defs: {} };
  T.SIZE = 16;
  function def(id, o) { o.id = id; T.defs[id] = o; }
  T.def = def;

  ['grass', 'flower', 'brick', 'gravel', 'conc', 'step', 'wood', 'tile', 'tatami', 'garage', 'mat'].forEach(function (k) { def(k, {}); });
  def('dirt', { group: 'dirt' });
  ['road', 'road_ch', 'road_cv', 'road_wh', 'cross_h', 'cross_v', 'park', 'park_t'].forEach(function (k) { def(k, { group: 'road' }); });
  def('walk', { group: 'walk' });
  def('stone', { group: 'stone' });
  def('water', { solid: true, anim: 2, group: 'water' });
  def('rock', { solid: true, tall: true, group: 'rock' });
  def('forest', { solid: true, tall: true, group: 'forest' });
  def('fence', { solid: true, group: 'fence' });
  def('rail', { solid: true, group: 'rail' });
  def('hedge', { solid: true, tall: true, group: 'hedge' });
  def('void', { solid: true });
  def('sky', { solid: true });
  ['red', 'blue', 'green', 'beige'].forEach(function (k) { def('carpet_' + k, {}); });
  ['wall', 'wall_blue', 'wall_green', 'wall_pink', 'wall_gray', 'wall_wood'].forEach(function (k) {
    def(k, { solid: true, tall: true, group: 'wall' });
  });
})();
