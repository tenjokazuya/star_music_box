/* fubuki — ふぶきの さと。村の北に こおりの ほこらが ある */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(24, 20, 'n');
  m.scatter(0, 0, 24, 20, 'T', 0.1, 13, ['n']); m.border('T', 2);
  m.rect(8, 0, 8, 2, '^'); m.set(11, 1, ']');
  m.path([[11, 19], [11, 6]], ':', 2); m.path([[3, 9], [20, 9]], ':', 2); m.path([[11, 5], [11, 2]], ':', 1);
  var shop = m.house(4, 5, 5, { roof: 'blue' }), eld = m.house(15, 5, 5, { roof: 'red' });
  var a = m.house(4, 13, 3, { roof: 'red' }), b = m.house(17, 13, 3, { roof: 'blue' });
  m.set(shop.frontX, shop.frontY, ':'); m.set(eld.frontX, eld.frontY, ':');
  [[10, 8], [13, 8], [10, 16], [13, 16]].forEach(function (p) { m.set(p[0], p[1], 'l'); });
  m.rect(11, 18, 2, 2, ':');
  PF.maps.base('fubuki', {
    name: 'ふぶきの さと', area: 'ふぶきの さと', rows: m.rows(), bgm: 'snow', ambience: ['snow'], snow: true, fill: 'n',
    entries: { world: { x: 11, y: 18, dir: 'u' }, shop: { x: shop.frontX, y: shop.frontY, dir: 'd' }, elder: { x: eld.frontX, y: eld.frontY, dir: 'd' }, shrine: { x: 11, y: 2, dir: 'd' } },
    objects: [
      h.warp(11, 19, 'world', 'fubuki', 'door', 2, 1),
      h.warp(shop.doorX, shop.doorY, 'fubuki_shop', 'door', 'door'), h.warp(eld.doorX, eld.doorY, 'fubuki_house', 'door', 'door'),
      h.warp(11, 1, 'icecave_a', 'door', 'stairs'),
      { type: 'iceblock', id: 'ice1', x: 11, y: 2, flag: 'f.ice1', when: { not: 'f.ice1' } },
      { type: 'iceblock', id: 'ice2', x: 11, y: 4, flag: 'f.ice2', when: { not: 'f.ice2' } },
      h.sign(10, 6, '↑ こおりの ほこら\nむやみに ちかづくな'),
      h.sign(13, 17, '↓ むらの でぐち\nゆきみちに ちゅうい')
    ]
  });
})();
