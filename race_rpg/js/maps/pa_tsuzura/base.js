/* ツヅラ パーキング: 常駐の走り屋（フリー対戦・タイムアタック） */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('pa_tsuzura', 'base', {
    npcs: [
      { id: 'minato', x: 9, y: 6, dir: 'down', look: 'racer1', talk: K.racer('ミナト', 'minato', { hello: 'みない かおだな。いっぽん はしるか?', win: 'ちっ、ヘアピンで ぬかれるとは...', lose: 'まだまだ だな!' }) },
      { id: 'kaori', x: 5, y: 7, dir: 'right', look: 'racer3', talk: K.racer('カオリ', 'kaori', { hello: 'あたしの シルフは かるいよ。ついて こられる?', win: 'まけちゃった。くやしい!', lose: 'ふふ、かるさの かち ね。' }) },
      { id: 'ta', x: 15, y: 11, dir: 'up', look: 'man1', talk: K.timeAttack('タイムキーパー', 'ta_tsuzura') },
      { id: 'fan', x: 20, y: 8, dir: 'left', look: 'boy', wander: 1, talk: K.random('こども', ['サキさんの ドリフト、すごいんだよ!', 'ここの けしき すきなんだ。']) }
    ]
  });
})();
