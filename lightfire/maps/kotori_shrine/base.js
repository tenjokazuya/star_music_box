/* kotori_shrine — ほこらの なか（おおびを まつる ばしょ） */
(function () {
  'use strict';
  var m = PF.mk.new(10, 8, '+').room('+');
  m.set(2, 0, 'z'); m.set(7, 0, 'z');
  m.rect(3, 2, 4, 5, '%');
  m.set(2, 3, 'P'); m.set(7, 3, 'P'); m.set(2, 5, 'P'); m.set(7, 5, 'P');
  m.set(4, 7, '_');
  function hot(x, y, text) { return { type: 'sign', invisible: true, x: x, y: y, text: text }; }
  PF.maps.base('kotori_shrine', {
    name: 'ほこら', showName: false, indoor: true, rows: m.rows(), bgm: 'night', ambience: ['wind'],
    entries: { door: { x: 4, y: 6, dir: 'u' }, stairs: { x: 4, y: 3, dir: 'd' } },
    objects: [
      { type: 'warp', x: 4, y: 7, to: 'kotori', entry: 'shrine', sfx: 'door' },
      { type: 'deco', id: 'altar', sprite: 'pedestal', x: 4, y: 2, solid: true, talk: async function (g) {
        await g.say(['おおびの ひを まつる いしの だい。', 'ほりこまれた もじは すりきれて よめない。']);
      } },
      hot(2, 3, 'つめたい いしの はしらだ。'), hot(7, 3, 'つめたい いしの はしらだ。'),
      hot(2, 5, 'はしらに ちいさな ひの もようが ほられている。'), hot(7, 5, 'はしらに ちいさな ひの もようが ほられている。')
    ]
  });
})();
