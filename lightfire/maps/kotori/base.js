/* kotori — コトリむら 基本マップ（地形・建物・出入口・変わらない物体） */
(function () {
  'use strict';
  var m = PF.mk.new(28, 22, 'n');
  m.scatter(0, 0, 28, 22, 'T', 0.07, 7, ['n']);
  m.border('T', 2);
  // 広場（ほこらの まえ）
  m.rect(11, 5, 7, 6, ':');
  // 道
  m.path([[2, 0], [2, 19]], ',', 2);
  m.path([[13, 10], [13, 21]], ':', 2);
  m.path([[4, 12], [25, 12]], ':', 2);
  m.path([[4, 18], [25, 18]], ':', 2);
  // 建物
  var shrine = m.house(11, 2, 7, { roof: 'blue' });
  var home = m.house(6, 8, 5, { roof: 'red' });
  var elder = m.house(20, 8, 5, { roof: 'blue' });
  var kota = m.house(6, 15, 5, { roof: 'red' });
  var shop = m.house(20, 15, 5, { roof: 'blue' });
  m.set(home.frontX, home.frontY, ':'); m.set(elder.frontX, elder.frontY, ':');
  // 街灯
  [[12, 11], [15, 11], [12, 17], [15, 17], [10, 5], [18, 5]].forEach(function (p) { m.set(p[0], p[1], 'l'); });
  // 出入口の木を取り除く
  m.rect(2, 0, 2, 2, ','); m.rect(13, 20, 2, 2, ':');

  function door(d, to, entry) { return { type: 'warp', x: d.doorX, y: d.doorY, to: to, entry: entry, sfx: 'door' }; }
  PF.maps.base('kotori', {
    name: 'コトリむら', area: 'コトリむら', rows: m.rows(), bgm: 'village', ambience: ['wind'], snow: true, fill: 'n',
    entries: {
      home: { x: home.frontX, y: home.frontY, dir: 'd' }, elder: { x: elder.frontX, y: elder.frontY, dir: 'd' },
      kota: { x: kota.frontX, y: kota.frontY, dir: 'd' }, shop: { x: shop.frontX, y: shop.frontY, dir: 'd' },
      shrine: { x: shrine.frontX, y: shrine.frontY, dir: 'd' }, south: { x: 13, y: 20, dir: 'u' }, north: { x: 2, y: 2, dir: 'd' }
    },
    objects: [
      door(home, 'kotori_home', 'door'), door(elder, 'kotori_elder', 'door'), door(kota, 'kotori_kota', 'door'),
      door(shop, 'kotori_shop', 'door'), door(shrine, 'kotori_shrine', 'door'),
      { type: 'warp', x: 2, y: 0, w: 2, h: 1, to: 'forest', entry: 'south', needs: { flag: 'prologue.done' },
        deny: async function (g) { await g.deny('ばあちゃんが ほこらで まっている。\nさきに ほこらへ いこう。', 'd'); } },
      { type: 'warp', x: 13, y: 21, w: 2, h: 1, to: 'world', entry: 'kotori', needs: { gte: ['ch', 2] },
        deny: async function (g) { await g.deny('おおびが きえた いま、むらの そとは ゆきで あぶない。\nまだ いけない。', 'u'); } },
      { type: 'sign', id: 'sign1', x: 12, y: 19, text: 'ここは コトリむら。\nゆきと ともしびの むら。' },
      { type: 'sign', id: 'sign2', x: 4, y: 11, text: '← もりの みち\nほらあなへ つづく' },
      { type: 'deco', kind: 'greatfire', id: 'greatfire', x: 14, y: 7, solid: true, talk: async function (g) {
        var lv = g.flag('fire.level') || 0;
        if (lv === 0) await g.say(['おおびは きえている。', 'のこった はいが つめたい。']);
        else if (lv === 1) await g.say(['ちいさな ひが ゆれている。', 'ヒダネの ひだ。まだ よわよわしい。']);
        else if (lv < 5) await g.say(['おおびが すこしずつ つよさを とりもどしている。', 'あたたかい。']);
        else await g.say(['おおびが あかあかと もえている。', 'むらじゅうの ともしびが ここから ひろがる。']);
      } },
      { type: 'npc', id: 'cat', sprite: 'cat', x: 17, y: 14, wander: 3, talk: async function (g) { g.sfx('cursor'); await g.say('ミケ「にゃあ」'); } }
    ]
  });
})();
