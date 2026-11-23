/* ヘビノセ パーキング: 常駐の走り屋 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('pa_hebi', 'base', {
    npcs: [
      { id: 'ryu', x: 5, y: 7, dir: 'right', look: 'racer5', talk: K.racer('リュウ', 'ryu', { hello: 'ヘビノセの ながい コーナーを ぬけられるか?', win: 'いい ライン だった...', lose: 'あしまわりが あまいぜ。' }) },
      { id: 'nobu', x: 7, y: 7, dir: 'left', look: 'racer2', talk: K.racer('ノブヒコ', 'nobu', { hello: 'ターボの おとを きかせて やるよ。', win: 'ブーストが かかる まえに ぬかれた...', lose: 'ストレートは もらった!' }) },
      { id: 'ta', x: 15, y: 11, dir: 'up', look: 'man1', talk: K.timeAttack('タイムキーパー', 'ta_hebinose') },
      { id: 'mech', x: 21, y: 7, dir: 'left', look: 'worker', talk: K.lines('メカニック', ['ヘビノセは スピードが のる。|ダウンフォースが あると こうそくで あんてい するよ。', 'ロング ファイナルで さいこうそくを のばす てもある。'] ) }
    ]
  });
})();
