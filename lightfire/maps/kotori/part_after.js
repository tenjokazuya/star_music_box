/* kotori / 第2章以降（ch>=2）: ヒダネが もどり、むらに すこしずつ ひかりが もどる */
(function () {
  'use strict';
  var L = PF.db.look;
  function npc(id, look, x, y, dir, fn, who) {
    return { type: 'npc', id: id, x: x, y: y, dir: dir, look: look, talk: async function (g) { await fn(g, who); } };
  }
  function lv(g) { return g.flag('fire.level') || 0; }
  var common = {
    when: { gte: ['ch', 2], lt: ['ch', 6] },
    objects: [
      npc('granny', L('granny'), 15, 7, 'd', async function (g) {
        var l = lv(g);
        if (l <= 1) await g.say(['ともしびの とうだいは ひとつも ともって いない。', 'まずは みなとまちを たずねて おいで。'], 'おばあちゃん');
        else if (l === 2) await g.say(['とうだいの ひを ともして くれたんだね。', 'おおびが すこし つよく なったよ。ほら、あたたかい。'], 'おばあちゃん');
        else if (l === 3) await g.say(['ゆきの ほこらの ひも もどったんだね。', 'のこりは あと ふたつ。あせらず いくんだよ。'], 'おばあちゃん');
        else await g.say(['もう おおびは こんなに あかるい。', 'あとは きたの とうだけ。…かならず かえって おいで。'], 'おばあちゃん');
      }),
      npc('elder', L('elder'), 12, 6, 'r', async function (g, w) {
        if (lv(g) <= 1) await g.say('ヒダネが いる かぎり、むらは だいじょうぶだ。', w);
        else await g.say('むらの ひが すこしずつ もどって きている。…ありがたい ことだ。', w);
      }, 'そんちょう'),
      npc('woman', L('woman'), 11, 8, 'r', async function (g) {
        if (lv(g) <= 1) await g.say('ヒダネ…。ちいさいのに、あたたかいのね。');
        else await g.say(['ランプに ひが ともったわ。', 'おおびの ひを わけて もらったの。']);
      }),
      npc('man', L('man'), 18, 6, 'l', async function (g) {
        if (lv(g) <= 1) await g.say('ひうちいしでは だめだが、おおびの ひなら まきに うつる。');
        else await g.say('まきが よく もえる。ありがたい ありがたい。');
      }),
      npc('baker', L('baker'), 18, 8, 'l', async function (g, w) {
        if (lv(g) <= 1) await g.say(['おおびの ひを もらって かまどに ともした。', 'あしたから パンが やけるぞ。'], w);
        else await g.say(['やきたての パンは どうだい。', 'みせで いつでも かえるよ。'], w);
      }, 'パンやの おじさん'),
      npc('kota', L('kota'), 12, 8, 'r', async function (g, w) {
        await g.say(['アカリ! ヒダネと いっしょなら むてき だな!', 'おれは むらを まもって ここで まってる!'], w);
      }, 'コタ')
    ]
  };
  PF.maps.part('kotori', 'after', common);
  PF.maps.part('kotori', 'after_dark_a', { when: { gte: ['ch', 2], lt: ['ch', 4] }, dark: 0.2 });
  PF.maps.part('kotori', 'after_dark_b', { when: { gte: ['ch', 4], lt: ['ch', 6] }, dark: 0.1 });
})();
