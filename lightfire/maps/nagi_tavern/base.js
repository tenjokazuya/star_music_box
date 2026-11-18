/* nagi_tavern — さかば。せんちょうダイが とうだいの 鍵を あずかっている */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(12, 9, '=').room('=');
  m.set(3, 0, 'z'); m.set(8, 0, 'z'); m.hline(2, 3, 7, 'c'); m.set(10, 2, 'p'); m.set(1, 2, 'p');
  m.set(3, 5, 't'); m.set(2, 5, 'h'); m.set(4, 5, 'h'); m.set(8, 5, 't'); m.set(7, 5, 'h'); m.set(9, 5, 'h'); m.set(5, 8, '_');
  PF.maps.base('nagi_tavern', {
    name: 'さかば', showName: false, indoor: true, rows: m.rows(), bgm: 'port', ambience: [],
    entries: { door: { x: 5, y: 7, dir: 'u' } },
    objects: [
      h.warp(5, 8, 'nagi', 'tavern', 'door'),
      h.hot(3, 5, 'ジョッキが のこっている。まだ あたたかい。'), h.hot(8, 5, 'ふるい かいずが ひろげて ある。'),
      h.npc('bartender', 'man', 5, 2, 'd', ['いらっしゃい。…といっても、', 'さいきんは ふなのりが こなくて ひまだよ。'], 'マスター'),
      h.npc('drunk', 'sailor', 3, 6, 'r', ['ふねが でられないから ひるまから のんでるのさ…。'], 'ふなのり'),
      h.npc('captain', 'captain', 8, 6, 'l', async function (g, e, w) {
        var ch = g.flag('ch');
        if (!g.flag('c2.key')) {
          await g.say(['おお、めずらしい。コトリむらの ものか。', 'ずいぶん ちいさい ふなのりだな。'], w);
          await g.say(['…まて。そのランプの ひは。'], w);
          await g.say(['ヒダネ…か。コトリの ひもりの はなしは きいている。', 'わしは せんちょうの ダイ。とうだいの かぎを あずかっておる。'], w);
          await g.say(['とうだいもりの じいさんが ようすを みに いったきり もどらん。', 'わしも いこうとしたが、かげの ばけものに はねかえされた。'], w);
          await g.say(['ヒダネの ひが あるなら あるいは…。', 'たのむ。とうだいの ひを ともして くれ。'], w);
          await g.give('key2'); g.set('c2.key');
          await g.say('とうだいは さんばしの さきだ。きを つけてな。', w);
        } else if (ch < 3) await g.say(['かぎは わたした。とうだいを たのむぞ。', 'さんばしの さきだ。ほねの おれる ばしょだと おもう。'], w);
        else if (!g.flag('c2.reward')) {
          g.set('c2.reward');
          await g.say(['とうだいが ひかったのを みたぞ!', 'ふなのりの みんなが なみだを ながした。'], w);
          await g.say('これは おれいだ。うけとって くれ。', w);
          g.gold(200); await g.give('ring1');
          await g.say(['ゆきやまの ほうの みちも、とうだいの ひが ともった いまなら', 'ふぶきが おさまったはずだ。いって みるが いい。'], w);
        } else await g.say('ふねが でられる! さけが うまい!', w);
      }, 'せんちょう ダイ')
    ]
  });
})();
