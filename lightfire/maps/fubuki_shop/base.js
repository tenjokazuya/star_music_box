/* fubuki_shop — どうぐや と やどや */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(12, 9, '=').room('=');
  m.set(3, 0, 'z'); m.set(8, 0, 'z'); m.set(2, 2, 'o'); m.set(3, 2, 'o'); m.set(8, 2, 'o'); m.set(9, 2, 'o');
  m.hline(2, 4, 5, 'c'); m.set(10, 3, 'k'); m.set(10, 4, 'k'); m.set(1, 6, 'p'); m.rect(4, 6, 3, 1, '%'); m.set(8, 2, 'u'); m.set(5, 8, '_');
  PF.maps.base('fubuki_shop', {
    name: 'どうぐや', showName: false, indoor: true, rows: m.rows(), bgm: 'snow', ambience: ['fire'],
    entries: { door: { x: 5, y: 7, dir: 'u' } },
    objects: [
      h.warp(5, 8, 'fubuki', 'shop', 'door'),
      h.hot(2, 2, 'ふるい どうぐが ならんでいる。'), h.hot(3, 2, 'ふるい どうぐが ならんでいる。'), h.hot(9, 2, 'けがわの ふくが つるされている。'),
      h.hot(8, 2, 'だんろは つめたい。ひが ないのだ。'),
      h.npc('shopkeeper', 'fur', 4, 3, 'd', async function (g) { await g.shop('yukisato'); }, null),
      h.npc('inn', 'fur2', 9, 5, 'l', async function (g) { await g.inn(60, 'やどの おばあさん'); }, null)
    ]
  });
})();
