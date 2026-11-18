/* kazan_forge — かじや。ようがんのいしで ひだねのけんを うってもらう */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(12, 9, '+').room('+');
  m.set(3, 0, 'z'); m.set(8, 0, 'z'); m.set(2, 2, 'u'); m.set(3, 2, 'u'); m.hline(5, 4, 5, 'c'); m.set(9, 2, 'o'); m.set(10, 2, 'o'); m.set(10, 6, 'p'); m.set(1, 6, 'p'); m.set(5, 8, '_');
  PF.maps.base('kazan_forge', {
    name: 'かじや', showName: false, indoor: true, rows: m.rows(), bgm: 'volcano', ambience: ['fire'],
    entries: { door: { x: 5, y: 7, dir: 'u' } },
    objects: [
      h.warp(5, 8, 'kazan', 'forge', 'door'),
      h.hot(2, 2, 'ごうごうと ひが もえて いる。…すこし よわい。'), h.hot(3, 2, 'ごうごうと ひが もえて いる。…すこし よわい。'),
      h.hot(9, 2, 'うちかけの けんが ならんでいる。'), h.hot(10, 2, 'うちかけの けんが ならんでいる。'),
      h.npc('shop', 'smith2', 6, 3, 'd', async function (g) { await g.shop('kazan'); }, null),
      h.npc('smith', 'smith', 4, 5, 'r', async function (g, e, w) {
        var ch = g.flag('ch');
        if (ch < 5) await g.say(['ひが よわくて けんが うてねえ。', 'いずみの ひさえ もどれば…むすめにも すまねえ。'], w);
        else if (!g.flag('k.sword')) {
          g.set('k.sword');
          await g.say(['いずみの ひが もどったな! ありがてえ!', 'ようがんの いしと ヒダネの ひ。…よし、うたせて くれ!'], w);
          g.sfx('ignite'); await g.wait(30); g.sfx('hit'); await g.wait(20); g.sfx('hit'); await g.wait(20); g.sfx('hit'); await g.wait(30);
          await g.say('おまちどう! ほのおを まとう けんだ。', w);
          await g.give('emsw');
          await g.say('ヒダネと いっしょなら、きっと すごい ちからが でる。', w);
        } else await g.say('どうだ、いい けんだろう!', w);
      }, 'かじやの テツ')
    ]
  });
})();
