/* RR.Sprites: 参照元の2Dスプライト API の互換層。中身は 3D モデルを撮影した高解像度の画像
 * 画像には論理サイズ lw, lh（基準 240x160 での大きさ）が付く。描画は RR.Sprites.blit(g, img, x, y) を使う
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var S = RR.Sprites = {};
  S.PAINT = RR.Cars3D.PAINT;
  S.PAINT_NAMES = RR.Cars3D.PAINT_NAMES;

  // 論理サイズ lw x lh で描く。flip=true で左右反転
  S.blit = function (g, img, x, y, flip, scale) {
    if (!img) return;
    var w = (img.lw || img.width) * (scale || 1), h = (img.lh || img.height) * (scale || 1);
    if (flip) {
      g.save(); g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); g.restore();
    } else g.drawImage(img, x, y, w, h);
  };
  var SS = 3; // 撮影の解像度倍率
  function tag(c, lw, lh) { c.lw = lw; c.lh = lh; return c; }
  // 真横（前が右）。論理 66x28
  S.carSide = function (model, color, dirt) {
    return tag(RR.Cars3D.snapshot(model, color, dirt, 'side', 66 * SS, 28 * SS), 66, 28);
  };
  // 斜め前から（大きめの表示用）。論理 w x h
  S.carView = function (model, color, dirt, w, h) {
    return tag(RR.Cars3D.snapshot(model, color, dirt, 'three', w * SS, h * SS), w, h);
  };
  // 回転展示用。k=0..15 で一周。論理 w x h
  S.carSpin = function (model, color, dirt, w, h, k) {
    return tag(RR.Cars3D.snapshot(model, color, dirt, 'spin' + (k & 15), w * 2, h * 2), w, h);
  };
  // 真上（前が上）。scale=1 で論理 10x19（参照元の2倍表示 scale=2 で 20x38）
  S.carTop = function (model, color, scale, dirt) {
    scale = scale || 1;
    return tag(RR.Cars3D.snapshot(model, color, dirt, 'top', Math.round(10 * scale * SS * 2), Math.round(19 * scale * SS * 2)), 10 * scale, 19 * scale);
  };
  // 人物の立ち絵。論理 16x24（look から生成）
  S.person = function (look) {
    return tag(RR.People3D.snapshot(look, 16 * SS * 3, 24 * SS * 3), 16, 24);
  };
  S.drawPerson = function (g, spr, dir, frame, x, y) { S.blit(g, spr, x, y); };
  S.shadow = function (g, x, y) {
    g.save(); g.fillStyle = 'rgba(0,0,20,0.3)'; g.beginPath(); g.ellipse(x, y, 5, 2.2, 0, 0, Math.PI * 2); g.fill(); g.restore();
  };
})();
