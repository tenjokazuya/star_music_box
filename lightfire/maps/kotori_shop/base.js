/* kotori_shop — よろずや と やどや */
(function () {
  'use strict';
  var m = PF.mk.new(12, 9, '=').room('=');
  m.set(3, 0, 'z'); m.set(8, 0, 'z');
  m.set(2, 2, 'o'); m.set(3, 2, 'o'); m.set(8, 2, 'o'); m.set(9, 2, 'o');
  m.hline(2, 4, 5, 'c');
  m.set(10, 3, 'k'); m.set(10, 4, 'k'); m.set(10, 6, 'p'); m.set(1, 6, 'p');
  m.rect(4, 6, 3, 1, '%');
  m.set(5, 8, '_');
  function hot(x, y, text) { return { type: 'sign', invisible: true, x: x, y: y, text: text }; }
  PF.maps.base('kotori_shop', {
    name: 'よろずや', showName: false, indoor: true, rows: m.rows(), bgm: 'village', ambience: ['fire'],
    entries: { door: { x: 5, y: 7, dir: 'u' } },
    objects: [
      { type: 'warp', x: 5, y: 8, to: 'kotori', entry: 'shop', sfx: 'door' },
      hot(2, 2, 'くすりや どうぐが ならんでいる。'), hot(3, 2, 'くすりや どうぐが ならんでいる。'),
      hot(8, 2, 'ふるい けんと よろいが かざってある。'), hot(9, 2, 'ふるい けんと よろいが かざってある。'),
      { type: 'npc', id: 'shopkeeper', x: 4, y: 3, dir: 'd', look: PF.db.look('woman2', { apron: true }), talk: async function (g) { await g.shop('kotori'); } },
      { type: 'npc', id: 'inn', x: 9, y: 5, dir: 'l', look: PF.db.look('man2'), talk: async function (g) { await g.inn(20, 'やどの おじいさん'); } }
    ]
  });
})();
