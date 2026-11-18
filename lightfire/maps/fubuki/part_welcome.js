/* fubuki / 氷のほこらを 解放した直後: 村人が 出迎える（一度だけ） */
(function () {
  'use strict';
  PF.maps.part('fubuki', 'welcome', {
    when: { flag: 'f.cleared', not: 'f.welcome' },
    onEnter: async function (g) {
      g.set('f.welcome'); g.bgm('hope');
      await g.say('さとの ひとたちが、ほこらの まえに あつまって いる。');
      await g.say(['ひが…! ほこらに ひが ともったぞ!', 'ありがとう、ありがとう…!'], 'むらびと');
      await g.say(['さとじゅうの いろりに ひを わけよう。', 'あなたが ヒダネの ひもり なのだね。'], 'むらおさ');
      await g.say(['ひがしの かざんにも、おなじ ひが あると きく。', 'あの ほのおの さとの ひとたちにも、ひを とどけて おやり。'], 'むらおさ');
      await g.say('つぎは ひがしの かざんだ。ワールドマップの ひがしの みちへ むかおう。');
    }
  });
})();
