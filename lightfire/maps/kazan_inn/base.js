/* kazan_inn — やどや */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(10, 8, '=').room('=');
  m.set(2, 0, 'z'); m.set(7, 0, 'z'); m.set(1, 2, 'k'); m.set(1, 3, 'k'); m.set(8, 2, 'u'); m.hline(3, 4, 4, 'c'); m.set(8, 5, 'p'); m.set(4, 7, '_');
  PF.maps.base('kazan_inn', {
    name: 'やどや', showName: false, indoor: true, rows: m.rows(), bgm: 'volcano', ambience: ['fire'],
    entries: { door: { x: 4, y: 6, dir: 'u' } },
    objects: [
      h.warp(4, 7, 'kazan', 'inn', 'door'),
      h.hot(1, 2, 'ふかふかの ベッドだ。\nあたたかくて すぐに ねむれそう。'), h.hot(8, 2, 'だんろの ひが あかあかと もえている。'),
      h.npc('inn', 'woman', 5, 3, 'd', async function (g) { await g.inn(80, 'やどの おかみ'); }, null),
      h.npc('old', 'man2', 3, 6, 'r', ['かざんの おくの いずみには、むかしから ひを まもる ばんにんが いると いわれて いる。', 'ひが ねむると、ばんにんも あれるのかもな。'], 'ろうじん')
    ]
  });
})();
