/* 車種（見た目のみ。性能はすべてパーツで決まる） */
(function () {
  'use strict';
  var RR = window.RR;
  var D = RR.Data = RR.Data || {};
  D.cars = {
    comet: { name: 'コメット', price: 0, desc: 'じいちゃんの ふるい クーペ。リトラクタブル ライトが じまん' },
    tsubame: { name: 'ツバメ', price: 18000, desc: 'ちいさな まるい ハッチバック。まちのりの あいぼう' },
    hayate: { name: 'ハヤテ', price: 45000, desc: 'うつくしい ラインの 2ドア クーペ' },
    sylph: { name: 'シルフ', price: 52000, desc: 'かぜを かんじる ちいさな オープンカー' },
    regulus: { name: 'レグルス', price: 60000, desc: 'しかくい 4ドア セダン。おとなの はしりや むけ' },
    raiden: { name: 'ライデン', price: 85000, desc: 'おおきな ウイングの ラリー セダン' },
    orochi: { name: 'オロチ', price: 120000, desc: 'ながい はなさきの スポーツカー。まちの あこがれ' }
  };
  D.carOrder = ['comet', 'tsubame', 'hayate', 'sylph', 'regulus', 'raiden', 'orochi'];
  D.paints = ['red', 'white', 'black', 'blue', 'yellow', 'green', 'silver', 'orange', 'purple', 'panda', 'navy', 'pink', 'teal', 'gold'];
  D.PAINT_PRICE = 3000;
})();
