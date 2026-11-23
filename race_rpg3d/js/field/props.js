/* 配置物の定義（サイズ・当たり判定）。見た目は js/gfx3d/props3d.js が生成する
 * size(o)->[w,h]（タイル）、solid(o)->[[dx,dy],..]（省略するとサイズ全体が通れない）
 * wall: 壁に掛かるもの / floor: 床に敷くもの
 */
(function () {
  'use strict';
  var RR = window.RR;
  var Props = RR.Props = { defs: {} };
  function def(type, o) {
    o.type = type;
    if (!o.size) o.size = function () { return [1, 1]; };
    Props.defs[type] = o;
  }
  Props.def = def;
  function sized(w, h, extra) {
    var o = { size: function () { return [w, h]; } };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  var NONE = function () { return []; };

  // 建物: 上の行は屋根（歩けない行は 1 行目以降）、最下行のドアだけ通れる
  def('building', {
    size: function (o) { return [o.w, o.h]; },
    solid: function (o) {
      var s = [], doors = [].concat(o.door == null ? [] : o.door);
      for (var y = 1; y < o.h; y++) for (var x = 0; x < o.w; x++) {
        if (y === o.h - 1 && doors.indexOf(x) >= 0) continue;
        s.push([x, y]);
      }
      return s;
    }
  });
  def('tree', sized(2, 1));
  ['bush', 'lamp', 'vending', 'sign', 'pole', 'postbox', 'trash', 'busstop', 'phone', 'barrier', 'cone', 'drum', 'tires', 'crate',
    'lantern', 'pump', 'statue', 'rocks'].forEach(function (t) { def(t, {}); });
  def('car', { size: function (o) { return o.dir === 'h' ? [2, 1] : [1, 2]; } });
  def('board', sized(2, 1));
  def('bench', sized(2, 1));
  def('torii', sized(4, 1, { solid: function () { return [[0, 0], [3, 0]]; } }));
  def('canopy', { size: function (o) { return [o.w, o.h]; }, solid: NONE });
  def('flowerbed', sized(2, 1));
  def('fountain', sized(2, 2));
  def('wire_gate', sized(3, 1));
  // 屋内
  def('counter', sized(3, 1)); def('counter1', {});
  def('shelf', sized(2, 1)); def('fridge_case', sized(2, 1));
  def('table', sized(2, 1)); def('table1', {});
  def('stool', sized(1, 1, { solid: NONE })); def('chair', {});
  def('bed', sized(1, 2)); def('tv', {}); def('sofa', sized(2, 1)); def('plant', {}); def('bookshelf', {});
  def('desk', sized(2, 1)); def('stove', sized(2, 1));
  def('lift', sized(3, 2, { solid: NONE }));
  def('toolbox', {}); def('partsrack', sized(2, 1));
  def('poster', sized(1, 1, { solid: NONE, wall: true }));
  def('window_in', sized(1, 1, { solid: NONE, wall: true }));
  def('clock', sized(1, 1, { solid: NONE, wall: true }));
  def('photo', sized(1, 1, { solid: NONE, wall: true }));
  def('neon', sized(1, 1, { solid: NONE, wall: true }));
  def('fridge', {}); def('kitchen', sized(2, 1));
  def('rug', sized(2, 2, { solid: NONE, floor: true }));
  def('lamp_in', {}); def('arcade', {}); def('pot', {});
  def('trophy', {}); def('helmet', {}); def('aquarium', {});
  def('kotatsu', sized(2, 1));

  // 2D の立体風の箱（ミニゲームなどの描画用）。d は rect(x,y,w,h,色) を持つもの
  Props.box = function (d, x, y, w, h, col, topH) {
    var r = RR.Pal.ramp(col);
    topH = topH == null ? Math.min(4, h >> 2) : topH;
    d.rect(x, y, w, h, r.base); d.rect(x, y, w, topH, r.lt); d.rect(x, y, w, 1, r.hi); d.rect(x, y + topH, w, 1, r.sh);
    d.rect(x + w - 1, y + topH, 1, h - topH, r.sh); d.rect(x, y + h - 1, w, 1, r.dk); d.rect(x, y, 1, h, r.lt);
  };

  // メニュー用の小さな絵（3D モデルを撮影して返す）
  Props.drawIcon = function (g, type, o, x, y) {
    if (!RR.Props3D || !RR.Props3D.icon) return;
    var c = RR.Props3D.icon(type, o || {});
    if (c) g.drawImage(c, x - c.width / 2 / (RR.Props3D.ICON_SCALE || 1), y - c.height / (RR.Props3D.ICON_SCALE || 1) + 6, c.width / (RR.Props3D.ICON_SCALE || 1), c.height / (RR.Props3D.ICON_SCALE || 1));
  };
})();
