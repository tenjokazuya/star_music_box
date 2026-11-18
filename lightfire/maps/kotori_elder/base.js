/* kotori_elder — そんちょうの いえ */
(function () {
  'use strict';
  var m = PF.mk.new(10, 8, '=').room('=');
  m.set(2, 0, 'z'); m.set(7, 0, 'z');
  m.set(1, 2, 'o'); m.set(2, 2, 'o'); m.set(7, 2, 'u');
  m.rect(3, 3, 4, 3, '%');
  m.set(4, 4, 't'); m.set(5, 4, 't'); m.set(3, 4, 'h'); m.set(6, 4, 'h');
  m.set(8, 5, 'k'); m.set(8, 4, 'k');
  m.set(4, 7, '_');
  function hot(x, y, text) { return { type: 'sign', invisible: true, x: x, y: y, text: text }; }
  PF.maps.base('kotori_elder', {
    name: 'そんちょうの いえ', showName: false, indoor: true, rows: m.rows(), bgm: 'village', ambience: ['fire'],
    entries: { door: { x: 4, y: 6, dir: 'u' } },
    objects: [
      { type: 'warp', x: 4, y: 7, to: 'kotori', entry: 'elder', sfx: 'door' },
      hot(1, 2, 'むらの きろくが ならんでいる。\nいちばん あたらしい ページに、おばあちゃんの なまえが ある。'),
      hot(2, 2, 'むらの きろくが ならんでいる。\nいちばん あたらしい ページに、おばあちゃんの なまえが ある。'),
      hot(7, 2, 'だんろの ひが あたたかい。'),
      { type: 'chest', id: 'c1', x: 1, y: 5, item: 'herb' },
      { type: 'npc', id: 'wife', x: 5, y: 5, dir: 'u', look: PF.db.look('woman2'), talk: async function (g) {
        if (g.flag('ch') < 1) await g.say(['うちの ひとは ほこらに いっていますよ。', 'ともしびの よるは とくべつですからね。'], 'そんちょうの おくさん');
        else await g.say(['おおびが きえてから、うちの ひとは', 'ずっと ひを みつめて ばかり…。', 'ヒダネの ことを たのみましたよ、アカリちゃん。'], 'そんちょうの おくさん');
      } }
    ]
  });
})();
