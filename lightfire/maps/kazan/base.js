/* kazan — ほのおの さと。かじやの むら。北に かざんの ほらあなが ある */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(20, 16, 'a');
  m.scatter(0, 0, 20, 16, 'R', 0.05, 19, ['a']); m.border('V', 2);
  m.rect(7, 0, 6, 2, 'V'); m.set(10, 1, ']');
  m.rect(14, 10, 4, 3, 'L'); m.rect(2, 12, 3, 2, 'L');
  m.path([[10, 15], [10, 2]], ':', 2); m.path([[3, 8], [17, 8]], ':', 2);
  var forge = m.house(3, 4, 5, { roof: 'red' }), inn = m.house(13, 4, 5, { roof: 'red' });
  m.house(3, 11, 3, { roof: 'blue' }).doorX;
  m.set(forge.frontX, forge.frontY, ':'); m.set(inn.frontX, inn.frontY, ':');
  [[9, 7], [12, 7], [9, 13], [12, 13]].forEach(function (p) { m.set(p[0], p[1], 'q'); });
  m.rect(10, 14, 2, 2, ':');
  PF.maps.base('kazan', {
    name: 'ほのおの さと', area: 'ほのおの さと', rows: m.rows(), bgm: 'volcano', ambience: ['lava', 'fire'], fill: 'a',
    entries: { world: { x: 10, y: 14, dir: 'u' }, forge: { x: forge.frontX, y: forge.frontY, dir: 'd' }, inn: { x: inn.frontX, y: inn.frontY, dir: 'd' }, cave: { x: 10, y: 2, dir: 'd' } },
    objects: [
      h.warp(10, 15, 'world', 'kazan', 'door', 2, 1),
      h.warp(forge.doorX, forge.doorY, 'kazan_forge', 'door', 'door'), h.warp(inn.doorX, inn.doorY, 'kazan_inn', 'door', 'door'),
      { type: 'warp', x: 10, y: 1, to: 'volc_a', entry: 'door', sfx: 'stairs', needs: { gte: ['ch', 4] }, deny: async function (g) { await g.deny('あつい くうきが ふきだして いる。\nいまは ちかづけない。', 'd'); } },
      h.sign(8, 7, '↑ かざんの ほらあな\nゆうがいな ガスに ちゅうい'),
      h.sign(11, 12, '↓ むらの でぐち')
    ]
  });
})();
