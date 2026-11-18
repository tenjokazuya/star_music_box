/* cave1_boss / ボス撃破後: 帰り道が氷でふさがれる（火の力のチュートリアル） */
(function () {
  'use strict';
  PF.maps.part('cave1_boss', 'after', {
    when: { flag: 'c1.boss', not: 'c1.cleared' },
    dark: 0.45,
    objects: [{ type: 'iceblock', id: 'ice1', x: 7, y: 10, flag: 'c1.cleared', then: async function (g) {
      g.jingle('solve'); await g.say('ヒダネの ひで こおりが とけた!');
    } }]
  });
  PF.maps.part('cave1_boss', 'cleared', { when: { flag: 'c1.cleared' }, dark: 0.35, bgm: 'hope' });
})();
