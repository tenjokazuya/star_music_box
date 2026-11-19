/* パーツショップ: てんちょう と 常連の走り屋（パーツの助言） */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('parts', 'base', {
    npcs: [
      { id: 'owner', x: 8, y: 3, dir: 'down', look: 'man2', talk: async function (E) { await E.shop('parts'); } },
      {
        id: 'adv', x: 4, y: 6, dir: 'up', look: 'racer4',
        talk: K.lines('はしりや', [
          'パーツは たかければ いいって もんじゃない。|ハイグリップは よく くいつくけど すぐ あつく なる。',
          'ハード コンパウンドは ながもち するし ねつにも つよい。|ながい コースなら こっちも ありだ。',
          'ターボは きくと すごいけど ふみはじめが おそい。|ヘアピンの おおい とうげだと つかいにくい ことも ある。',
          'あたらしい パーツは あとから にゅうか するらしいぜ。|かしらを たおすたびに みせの ひとが はりきってる。'
        ])
      }
    ]
  });
})();
