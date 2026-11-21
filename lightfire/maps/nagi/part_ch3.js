/* nagi / 第3章以降（ch>=3）: とうだいに 火が もどり、みなとが 動き出す */
(function () {
  'use strict';
  var h = PF.h;
  // とうだいもりは 桟橋(2マス幅・看板あり)の上に 立たせない。桟橋の入口をふさぐと 灯台から町へ戻れなくなる（check_flow が検査）
  PF.maps.part('nagi', 'ch3', {
    when: { gte: ['ch', 3] },
    ambience: ['sea', 'birds'],
    objects: [
      h.npc('sailor', 'sailor', 20, 10, 'l', ['とうだいの ひが ともったぞ!', 'あした あさ いちばんで ふねを だす!'], 'ふなのり'),
      h.npc('fishwife', 'woman', 6, 9, 'r', ['さかなが また とれそうだよ。', 'あんた、とうだいの ひを ともして くれたんだってね。'], 'おかみさん'),
      h.npc('oldman', 'man2', 15, 10, 'd', ['ひが もどった みなとは いいもんだ。', 'ふぶきの さとの ほこらにも おなじ ひが あると きいた。'], 'ろうじん'),
      h.npc('nami', 'girl', 7, 16, 'u', async function (g, e, w) {
        if (g.flag('ch') < 6) await g.say(['おじいちゃんが かえって きたの!', 'ありがとう、アカリおねえちゃん! ヒダネも ありがとう!'], w);
        else await g.say('はるが きたら、ふねに のせて もらうの!', w);
      }, 'ナミ'),
      h.npc('keeper', 'monk', 22, 10, 'r', async function (g, e, w) {
        await g.say(['とうだいの ひを また ともせる とはの…。', 'まいにち ひを あおぐのが わしの つとめだ。'], w);
      }, 'とうだいもり')
    ]
  });
  PF.maps.part('nagi', 'ch6', { when: { flag: 'clear' }, convert: {}, bgm: 'hope' });
})();
