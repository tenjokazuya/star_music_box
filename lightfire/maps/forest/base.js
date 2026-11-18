/* forest — ふゆのもり（コトリむらの北。ほらあなへ続く一本道） */
(function () {
  'use strict';
  var m = PF.mk.new(22, 30, 'n');
  m.scatter(0, 0, 22, 30, 'T', 0.16, 21, ['n']);
  m.scatter(0, 0, 22, 30, 'G', 0.04, 5, ['n']);
  m.rect(0, 0, 22, 3, '^');
  m.border('T', 1); m.rect(0, 0, 22, 3, '^');
  m.path([[10, 29], [10, 22], [5, 22], [5, 15], [14, 15], [14, 8], [10, 8], [10, 3]], ',', 2);
  m.set(10, 2, ']');
  [[7, 18], [3, 14], [17, 12], [8, 26]].forEach(function (p) { m.set(p[0], p[1], 'n'); });
  m.set(12, 20, 'n'); m.set(9, 25, 'n');
  PF.maps.base('forest', {
    name: 'ふゆの もり', area: 'ふゆの もり', rows: m.rows(), bgm: 'forest', ambience: ['wind'], snow: true, fill: 'n',
    encounter: { table: 'forest' },
    entries: { south: { x: 10, y: 28, dir: 'u' }, cave: { x: 10, y: 3, dir: 'd' } },
    objects: [
      { type: 'warp', x: 10, y: 29, w: 2, h: 1, to: 'kotori', entry: 'north' },
      { type: 'warp', x: 10, y: 2, to: 'cave1_a', entry: 'door', sfx: 'stairs' },
      { type: 'sign', id: 'sign1', x: 8, y: 26, text: 'この さきに ふるい ほらあなが ある。\nヒダネの すみかと いわれて いる。' },
      { type: 'chest', id: 'c1', x: 7, y: 18, item: 'herb' },
      { type: 'chest', id: 'c2', x: 3, y: 14, item: 'tea' },
      { type: 'chest', id: 'c3', x: 17, y: 12, gold: 60 },
      { type: 'npc', id: 'hunter', x: 12, y: 20, dir: 'l', look: PF.db.look('fur'), talk: async function (g) {
        if (!g.flag('c1.boss')) await g.say(['きょうの もりは ようすが おかしい。', 'みなれない かげのような ものが うろついている。', 'ほらあなは まっくらだ。ランプが なければ すすめないぞ。'], 'かりうど');
        else await g.say('かげが おとなしく なったな。…おまえの おかげか?', 'かりうど');
      } }
    ]
  });
})();
