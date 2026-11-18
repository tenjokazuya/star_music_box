/* nagi_house — ナミの いえ */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(10, 8, '=').room('=');
  m.set(2, 0, 'z'); m.set(7, 0, 'z'); m.set(1, 2, 'k'); m.set(1, 3, 'k'); m.set(8, 2, 'u'); m.set(5, 2, 'o');
  m.set(4, 4, 't'); m.set(5, 4, 't'); m.set(3, 4, 'h'); m.set(6, 4, 'h'); m.set(8, 5, 'p'); m.set(4, 7, '_');
  PF.maps.base('nagi_house', {
    name: 'ナミの いえ', showName: false, indoor: true, rows: m.rows(), bgm: 'port', ambience: ['fire'],
    entries: { door: { x: 4, y: 6, dir: 'u' } },
    objects: [
      h.warp(4, 7, 'nagi', 'house', 'door'),
      h.hot(5, 2, 'とうだいの もけいが かざって ある。\nてっぺんが すこし かけている。'),
      h.hot(8, 2, 'だんろの ひが ゆれている。'),
      h.chest('c1', 8, 6, 'herb2'),
      h.npc('granny', 'granny', 6, 5, 'l', async function (g, e, w) {
        if (g.flag('ch') < 3) await g.say(['とうだいの ひを ともす おまじないが あってね。', 'うみ、かぜ、つき、ほし…。むかしから ふなのりは', 'その じゅんに ほしを みあげるのさ。'], w);
        else await g.say('じいさんが かえって きて、ほんとうに よかった…。', w);
      }, 'ナミの おばあさん')
    ]
  });
})();
