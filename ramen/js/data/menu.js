/* メニュー定義（スープ・麺の硬さ・具・サイド）。価格はティア倍率前の基準価格。 */
(function (RP) {
  'use strict';

  RP.MENU = {
    soups: [
      { id: 'shoyu',    name: '醤油',  price: 500, col: 'shoyu' },
      { id: 'miso',     name: '味噌',  price: 560, col: 'miso' },
      { id: 'shio',     name: '塩',    price: 530, col: 'shio' },
      { id: 'tonkotsu', name: '豚骨',  price: 640, col: 'tonkotsu' }
    ],
    // time: 釜に入れてから「ぴったり」になる秒数（高火力コンロで短縮）
    hards: [
      { id: 'bari',   name: 'バリカタ', time: 4.0,  col: 'red' },
      { id: 'katame', name: 'かため',   time: 6.0,  col: 'orange' },
      { id: 'futsu',  name: 'ふつう',   time: 8.0,  col: 'green' },
      { id: 'yawa',   name: 'やわめ',   time: 10.5, col: 'cyan' }
    ],
    nobiTime: 14.0,    // これを超えると麺が伸びて使えない（基準時間・コンロ前）
    tops: [
      { id: 'negi',   name: 'ねぎ',         price: 30,  col: 'lime' },
      { id: 'nori',   name: 'のり',         price: 50,  col: 'ink' },
      { id: 'menma',  name: 'メンマ',       price: 80,  col: 'noodle' },
      { id: 'egg',    name: '味玉',         price: 100, col: 'white' },
      { id: 'chashu', name: 'チャーシュー', price: 160, col: 'pink' }
    ],
    sides: {
      gyoza: { id: 'gyoza', name: '餃子',   price: 290 },
      beer:  { id: 'beer',  name: 'ビール', price: 400 },
      rice:  { id: 'rice',  name: 'ライス', price: 110 }
    }
  };

  RP.MENU.soup = function (id) { return RP.MENU.soups.filter(function (s) { return s.id === id; })[0]; };
  RP.MENU.hard = function (id) { return RP.MENU.hards.filter(function (s) { return s.id === id; })[0]; };
  RP.MENU.top = function (id) { return RP.MENU.tops.filter(function (s) { return s.id === id; })[0]; };
})(window.RP);
