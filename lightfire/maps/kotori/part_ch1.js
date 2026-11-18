/* kotori / 第1章（ch=1）: おおびが きえたあと。ヒダネを つれて もどると 話が すすむ */
(function () {
  'use strict';
  var L = PF.db.look;
  function npc(id, look, x, y, dir, lines, who) {
    return { type: 'npc', id: id, x: x, y: y, dir: dir, look: look, talk: async function (g) { await g.say(lines, who); } };
  }
  PF.maps.part('kotori', 'ch1', {
    when: { gte: ['ch', 1], lt: ['ch', 2] },
    dark: 0.32,
    objects: [
      { type: 'npc', id: 'granny', x: 15, y: 7, dir: 'd', look: L('granny'), talk: async function (g) {
        if (!g.flag('c1.cleared')) await g.say(['ヒダネは もりの ほらあなに いるはずだよ。', 'むらの きたの みちから いける。きを つけて おいき。'], 'おばあちゃん');
        else await g.say('ヒダネと いっしょに、よく もどったね。', 'おばあちゃん');
      } },
      npc('elder', L('elder'), 12, 6, 'r', ['さむい よるに なりそうだ。', 'ヒダネの ことは、おまえに まかせる。'], 'そんちょう'),
      npc('woman', L('woman'), 11, 8, 'r', ['ランプの ひが ひとつも のこっていないの。', '…さむいわね。']),
      npc('man', L('man'), 18, 6, 'l', ['ひうちいしで ひを おこしても、', 'すぐに かぜで きえちまう。']),
      npc('baker', L('baker'), 18, 8, 'l', ['かまどに ひが つかないんだ。', 'パンが やけない…。'], 'パンやの おじさん'),
      npc('kota', L('kota'), 12, 8, 'r', ['アカリ…。むらの ひが ぜんぶ きえるなんて、', 'ゆめを みてるみたいだ。'], 'コタ')
    ],
    onEnter: async function (g) {
      if (!g.flag('c1.cleared') || g.flag('c1.report')) return;
      g.set('c1.report');
      var pl = g.player, gr = g.npc('granny'), N = 'おばあちゃん';
      g.bgm('village');
      await g.walk(pl, 'dddddddddd', { dur: 7 }); await g.walk(pl, 'rrrrrrrrrrrr', { dur: 7 });
      await g.walk(pl, 'uuu', { dur: 7 }); await g.walkTo(pl, 15, 9, { dur: 7 }); await g.walk(pl, 'u', { dur: 9 });
      g.face(gr, 'd'); g.face(pl, 'u');
      await g.say(['アカリ…! もどったんだね。', 'その あとに ついている ひかりは…!'], N);
      g.sfx('magic');
      await PF.field.emberFly(14, 7);
      g.sfx('ignite'); g.set('fire.level', 1); g.spark(14, 7, 16, '#ffb030'); g.shake(1, 20);
      PF.field.map.dark = 0.3;
      await g.wait(50);
      await g.say('ヒダネが…おおびの ひを とりもどした!', 'そんちょう');
      g.emote('kota', '!', 50);
      await g.say('すげえ! ひが ついた! あったかい!', 'コタ');
      await g.say(['ヒダネ…。ほんとうに いたんだね。', 'ありがとう、アカリ。'], N);
      await g.say(['でも ひは まだ ちいさい。', 'おおびを もとの すがたに もどすには、もっと ちからが いる。'], N);
      await g.say(['むかし ひもりの ばあちゃんから きいた はなしだ。', 'おおびは とおくの ともしびと むすばれて いたと いう。'], N);
      await g.say(['みなとの とうだい。ゆきやまの ほこら。', 'かざんの いずみ。…そして きたの とおくの とう。'], N);
      await g.say(['ヒダネを つれて、その ともしびを たずねて おくれ。', 'ひとつ ともすたびに、おおびは ちからを とりもどすはずだよ。'], N);
      await g.say(['みなとまちなら、むらの みなみの みちを たどれば つくはずだ。', 'もう ゆきも ふさがって いないだろう。'], 'そんちょう');
      g.gold(100); g.jingle('item'); await g.say('おばあちゃんは 100ゴールドを わたしてくれた。');
      g.set('ch', 2);
      g.refresh();
      await g.say('むらの みなみの でぐちから、そとへ いける ように なった。');
    }
  });
})();
