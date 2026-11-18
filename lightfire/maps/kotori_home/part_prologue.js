/* kotori_home / 序章（ch=0）: ともしびの よる。おばあちゃんが ランプを わたす */
(function () {
  'use strict';
  PF.maps.part('kotori_home', 'prologue', {
    when: { not: 'prologue.left' },
    objects: [
      { type: 'npc', id: 'granny', x: 8, y: 3, dir: 'l', look: PF.db.look('granny'), talk: async function (g) { await g.say('さあ、ランプを もって ほこらへ おいき。', 'おばあちゃん'); } }
    ],
    onEnter: async function (g) {
      if (g.flag('prologue.intro')) return;
      g.set('prologue.intro');
      g.stopBgm(0.1);
      await g.wait(30);
      await g.banner('ともしびの よる', 120);
      g.bgm('night');
      var gr = g.npc('granny'), N = 'おばあちゃん';
      g.face(gr, 'player');
      await g.say('アカリ、やっと おきたね。', N);
      await g.say(['きょうは ともしびの よるだろう?', 'むらじゅうの ひとが ほこらに あつまる ひだよ。'], N);
      await g.walkTo(gr, 7, 4);
      g.face(gr, 'player'); g.face(g.player, 'r');
      await g.say(['ほら、これを もっていきな。', 'おおびから ひを わけてもらう ランプだよ。'], N);
      await g.give('lamp');
      await g.say(['ばあちゃんは ひもりだからね、', 'さきに ほこらへ いっているよ。', 'あまり おそく なるんじゃ ないよ。'], N);
      await g.walk(gr, 'rdddllld', { dur: 12 });
      g.sfx('door'); g.hide('granny'); g.set('prologue.left');
      await g.wait(20);
      await g.say(['ほこらは むらの まんなかに ある。', 'そとへ でて いってみよう。']);
      await g.say(['【そうさ】\nうごく: ほうこうキー\nはなす・しらべる: Aボタン (Zキー)', 'はしる: Bボタンを おしながら いどう (Xキー)\nメニュー: STARTボタン (Escキー)']);
    }
  });
})();
