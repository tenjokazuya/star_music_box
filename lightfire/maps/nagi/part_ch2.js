/* nagi / 第2章（ch=2）: とうだいの 火が きえ、船が 出られない */
(function () {
  'use strict';
  var h = PF.h;
  PF.maps.part('nagi', 'ch2', {
    when: { lt: ['ch', 3] },
    objects: [
      h.npc('sailor', 'sailor', 20, 10, 'l', ['とうだいの ひが きえてから、ふねが でられない。', 'みなとは しずかな ものだ。'], 'ふなのり'),
      h.npc('fishwife', 'woman', 6, 9, 'r', ['ゆきが ふかく なってから、さかなも とれなくて…。', 'こまった ことだよ。'], 'おかみさん'),
      h.npc('oldman', 'man2', 15, 10, 'd', ['とうだいの ひは ずっと きえた ことが なかった。', 'きえた ときは みなとが ほろびる ときだと いわれて いたんだ。'], 'ろうじん'),
      h.npc('nami', 'girl', 7, 16, 'u', async function (g, e, w) {
        if (!g.flag('c2.key')) await g.say(['おじいちゃんは とうだいもりなの。', 'とうだいの ひが きえた よる、ようすを みに いったきり…。'], w);
        else await g.say(['とうだいの かぎは さかばの ダイさんが もってたでしょ?', 'おじいちゃんを おねがい…!'], w);
      }, 'ナミ')
    ],
    onEnter: async function (g) {
      if (g.flag('c2.nagi_intro')) return;
      g.set('c2.nagi_intro');
      await g.say(['みなとの ふねは どれも ゆきを かぶって うごかない。', 'ここが みなとまち ナギ…。']);
    }
  });
})();
