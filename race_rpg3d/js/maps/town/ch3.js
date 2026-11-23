/* キリハラ町: 3章 — 神社でシノブのお守りを見つける */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.layer('town', 'ch3', {
    when: function (S) { return S.stage === 3; },
    events: [{
      id: 'omamori', x: 6, y: 9, w: 2, on: 'step', once: true,
      when: function (S) { return S.flags.shinobu_ask && !S.flags.shinobu_found; },
      run: async function (E) {
        E.sfx('exclaim');
        await E.msg('いしだたみの すきまで なにかが ひかっている...');
        E.sfx('get');
        await E.msg('ちいさな {y}おまもり{w} を ひろった!|シノブに とどけよう。');
        E.setFlag('shinobu_found');
      }
    }],
    npcs: [
      { id: 'cafe_rumor', x: 19, y: 20, dir: 'up', look: 'woman2', talk: RR.MapKit.random('おんな', ['きっさてんに ぎんいろの かみの ひとが よく いるよ。|しずかな ひと。', 'キリガタニの きりは よるに なると ますます こく なるの。']) }
    ]
  });
})();
