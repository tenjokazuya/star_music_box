/* nagi — みなと町ナギ。東の岸壁から 桟橋が とうだいの 小島へ のびている */
(function () {
  'use strict';
  var h = PF.h;
  var m = PF.mk.new(32, 22, 's');
  m.rect(24, 0, 8, 22, '~'); m.vline(23, 0, 22, 's'); m.rect(0, 0, 32, 1, '^'); m.rect(0, 0, 1, 22, '^');
  m.scatter(1, 1, 22, 20, 'g', 0.03, 5, ['s']);
  m.path([[2, 8], [22, 8]], ':', 2); m.path([[10, 8], [10, 21]], ':', 2);
  var shop = m.house(4, 4, 5, { roof: 'red' }), tav = m.house(13, 4, 5, { roof: 'blue' });
  var nami = m.house(4, 12, 5, { roof: 'blue' }), hut = m.house(14, 12, 3, { roof: 'red' });
  [shop, tav].forEach(function (b) { m.set(b.frontX, b.frontY, ':'); });
  m.path([[nami.frontX, nami.frontY], [10, nami.frontY]], ':', 1); m.path([[hut.frontX, hut.frontY], [12, hut.frontY]], ':', 1);
  // 小島（とうだい）と桟橋
  m.rect(25, 2, 6, 5, 's'); var lh = m.house(26, 3, 5, { roof: 'blue' });
  m.path([[23, 8], [28, 8], [28, 6]], 'B', 2);
  m.rect(25, 6, 3, 1, 's'); m.set(lh.frontX, lh.frontY, 'B');
  m.set(23, 7, 'e'); m.set(23, 10, 'e');
  m.rect(10, 20, 2, 2, ':');
  PF.maps.base('nagi', {
    name: 'みなとまち ナギ', area: 'みなとまち ナギ', rows: m.rows(), bgm: 'port', ambience: ['sea', 'birds'], fill: 's',
    entries: {
      world: { x: 10, y: 20, dir: 'u' }, shop: { x: shop.frontX, y: shop.frontY, dir: 'd' }, tavern: { x: tav.frontX, y: tav.frontY, dir: 'd' },
      house: { x: nami.frontX, y: nami.frontY, dir: 'd' }, lighthouse: { x: lh.frontX, y: lh.frontY, dir: 'd' }
    },
    objects: [
      h.warp(10, 21, 'world', 'nagi', 'door', 2, 1),
      h.warp(shop.doorX, shop.doorY, 'nagi_shop', 'door', 'door'), h.warp(tav.doorX, tav.doorY, 'nagi_tavern', 'door', 'door'), h.warp(nami.doorX, nami.doorY, 'nagi_house', 'door', 'door'),
      { type: 'warp', x: lh.doorX, y: lh.doorY, to: 'lighthouse_1', entry: 'door', sfx: 'stairs', needs: { item: 'key2' },
        deny: async function (g) { await g.deny(['とうだいの とびらは かぎが かかっている。', 'かぎは だれかが あずかっている ようだ。'], 'd'); } },
      h.sign(9, 12, '↑ ナギの みなと\n→ さかばは ここの ひだり'),
      h.sign(24, 9, 'とうだいへ つづく さんばし\nあしもとに ちゅうい')
    ]
  });
})();
