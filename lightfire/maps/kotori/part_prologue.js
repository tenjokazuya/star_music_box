/* kotori / 序章（ch=0）: ともしびの よる。広場に 人が あつまり、おおびが きえる */
(function () {
  'use strict';
  var L = PF.db.look;
  function npc(id, look, x, y, dir, lines, who) {
    return { type: 'npc', id: id, x: x, y: y, dir: dir, look: look, talk: async function (g) { await g.say(lines, who); } };
  }
  PF.maps.part('kotori', 'prologue', {
    when: { lt: ['ch', 1] },
    objects: [
      { type: 'npc', id: 'granny', x: 15, y: 7, dir: 'd', look: L('granny'), talk: async function (g) { await g.say('おまちよ、アカリ。ランプを もって ここへ おいで。', 'おばあちゃん'); } },
      npc('elder', L('elder'), 12, 6, 'r', ['アカリか。ひもりどのが おまちかね。', 'おおびの ところへ いきなさい。'], 'そんちょう'),
      npc('woman', L('woman'), 11, 8, 'r', ['ともしびの よるは いつも わくわくするわ。', 'ランプの ひが ひとつずつ ふえて いくのよ。']),
      npc('man', L('man'), 18, 6, 'l', ['ことしも おおびが きれいに もえているな。']),
      npc('baker', L('baker'), 18, 8, 'l', ['パンも あたたかい うちに くばるぞ。', 'ともしびの よるの ごちそうだ。'], 'パンやの おじさん'),
      npc('kota', L('kota'), 12, 8, 'r', ['アカリ! おそいぞ!', 'おれは もう ひを もらったんだぜ。ほら!'], 'コタ'),
      { type: 'trigger', x: 13, y: 9, w: 4, h: 1, once: 'prologue.ceremony', run: async function (g) { await ceremony(g); } }
    ]
  });

  async function ceremony(g) {
    var pl = g.player, gr = g.npc('granny'), el = g.npc('elder'), ko = g.npc('kota'), N = 'おばあちゃん';
    await g.walkTo(pl, 15, 9, { dur: 12 }); await g.walk(pl, 'u', { dur: 12 });
    g.face(gr, 'd'); g.face(pl, 'u');
    await g.say('よく きたね、アカリ。さあ、ランプを。', N);
    await g.wait(10);
    g.sfx('ignite'); g.spark(15, 8, 12, '#ffb030'); await g.wait(40);
    await g.say(['ともしびは ひとの こころに ともる。', 'この ひを たやさない ことが、ひもりの つとめだよ。'], N);
    g.jingle('item'); await g.say('アカリの ランプに ひが ともった!');
    await g.say('みな、ともしびを かかげよ。', 'そんちょう');
    ['elder', 'woman', 'man', 'baker', 'kota'].forEach(function (id) { g.emote(id, '♪', 60); });
    await g.wait(60);
    await g.say('やったな、アカリ! これで おまえも いちにんまえだ!', 'コタ');
    // 風が吹く
    g.bgm('sad'); g.stopBgm(0.4);
    await g.wait(30);
    g.sfx('wind');
    await g.say('…そのとき、つめたい かぜが ふきぬけた。');
    g.set('fire.level', 2); g.shake(2, 40); await g.wait(40);
    g.set('fire.level', 1); g.sfx('thunder'); g.fade(0.6, 40, '#000010'); await g.wait(60);
    g.set('fire.level', 0); g.dark(0.85); g.fade(0, 1); await g.wait(30);
    PF.fx.fade(0, 1);
    await g.say('おおびが… きえた?', 'そんちょう');
    await g.say('ランプの ひも みんな…!', 'パンやの おじさん');
    g.face(gr, 'l');
    await g.say(['そんな…。おおびが きえた ことなど、', 'いちども なかった…。'], N);
    // ヒダネ
    var sp = g.spawn({ type: 'deco', id: 'spark', sprite: 'ember', fast: true, solid: false, x: 14, y: 7, light: 26 });
    g.sfx('magic'); g.spark(14, 7, 14, '#ffb030'); await g.wait(30);
    g.face(pl, 'l');
    await g.say('…ひが ひとつ、はいの なかに ゆれている。');
    await g.walk(sp, 'uuullllllllll', { dur: 7, ghost: true });
    await g.cam(2, 4, 40);
    await g.walk(sp, 'lluuuuu', { dur: 7, ghost: true });
    g.hide('spark'); g.spark(2, 0, 14, '#ffb030');
    await g.wait(40);
    await g.camReset(40);
    await g.say('いまの ひかりは…ヒダネ…?', N);
    await g.say('ヒダネだと? あれは おとぎばなしでは なかったのか。', 'そんちょう');
    g.face(gr, 'player');
    await g.say(['いいや。ヒダネは いる。', 'もりの ほらあなに すんでいると、むかしから いわれて きたんだ。'], N);
    await g.say(['おおびが きえた いま、のこる ともしびは', 'あの ヒダネだけだよ。'], N);
    while (true) {
      await g.say(['アカリ。ヒダネを おいかけて おくれ。', 'ヒダネが いきて いれば、ともしびは また ともせる。'], N);
      var c = await g.choice(['いく', 'こわい']);
      if (c === 0) break;
      await g.say(['…そうだね、こわいね。', 'それでも ばあちゃんは アカリを しんじているよ。'], N);
    }
    await g.say('おれも いく!', 'コタ');
    await g.say('コタ、あんたは むらに のこって ばあちゃんを たすけな。', N);
    await g.say('ちぇっ…。アカリ、ぜったい もどって こいよな!', 'コタ');
    await g.say(['もりへの みちは ゆきで ふさがれていることが ある。', 'ひを うしなわないよう きを つけなさい。'], 'そんちょう');
    g.give('bread', 2, { silent: true }); g.gold(50);
    g.jingle('item'); await g.say(['おばあちゃんは パンを ふたつ もたせてくれた。', 'ついでに 50ゴールドも わたされた。']);
    g.set('prologue.done'); g.set('ch', 1);
    g.refresh();
    g.bgm('village');
    await g.say('むらの きたの みちから もりへ いける。');
  }
})();
