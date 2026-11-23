/* キリガタニ パーキング: 常駐の走り屋 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('pa_kiri', 'base', {
    npcs: [
      { id: 'tamaki', x: 7, y: 7, dir: 'down', look: 'racer4', talk: K.racer('タマキ', 'tamaki', { hello: 'きりの なかを はしる かくごは ある?', win: 'きりの むこうに きみの テールランプが きえて いった...', lose: 'みえない コーナーは こわいでしょ。' }) },
      { id: 'ta', x: 15, y: 11, dir: 'up', look: 'man1', talk: K.timeAttack('タイムキーパー', 'ta_kirigatani') },
      { id: 'photo', x: 20, y: 8, dir: 'left', look: 'woman2', talk: K.random('カメラマン', ['きりの よるの しゃしんを とりに きたの。', 'ヘッドライトが きりに とけて きれい なのよ。']) }
    ]
  });
})();
