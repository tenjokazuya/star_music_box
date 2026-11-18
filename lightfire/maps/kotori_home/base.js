/* kotori_home — ひもりの いえ（アカリと おばあちゃんの いえ）基本マップ */
(function () {
  'use strict';
  var m = PF.mk.new(12, 9, '=').room('=');
  m.set(3, 0, 'z'); m.set(8, 0, 'z');
  m.set(6, 2, 'o'); m.set(7, 2, 'o');
  m.set(9, 2, 'u');
  m.set(2, 2, 'k'); m.set(2, 3, 'k');
  m.set(5, 5, 't'); m.set(6, 5, 't'); m.set(4, 5, 'h'); m.set(7, 5, 'h');
  m.set(10, 5, 'p'); m.set(10, 6, 'p');
  m.set(5, 8, '_');
  function hot(x, y, text) { return { type: 'sign', invisible: true, x: x, y: y, text: text }; }
  PF.maps.base('kotori_home', {
    name: 'ひもりの いえ', showName: false, indoor: true, rows: m.rows(), bgm: 'village', ambience: ['fire'],
    entries: { door: { x: 5, y: 7, dir: 'u' }, bed: { x: 3, y: 4, dir: 'd' } },
    objects: [
      { type: 'warp', x: 5, y: 8, to: 'kotori', entry: 'home', sfx: 'door' },
      hot(2, 2, 'じぶんの ベッドだ。\nきょうは すこし ねぼうを してしまった。'),
      hot(2, 3, 'じぶんの ベッドだ。'),
      hot(9, 2, 'だんろの ひが ぱちぱちと もえている。\nおおびから わけてもらった ひだ。'),
      hot(6, 2, 'ふるい ほんが ならんでいる。\nひの せわの しかたが かいてある。'),
      hot(7, 2, 'ふるい ほんが ならんでいる。\nひの せわの しかたが かいてある。'),
      hot(5, 5, 'テーブルの うえに パンと スープが ある。\nもう さめている。'),
      hot(6, 5, 'テーブルの うえに パンと スープが ある。\nもう さめている。'),
      hot(10, 5, 'まきが たくさん つまっている。'),
      hot(10, 6, 'まきが たくさん つまっている。'),
      { type: 'chest', id: 'c1', x: 1, y: 6, item: 'tea' }
    ]
  });
})();
