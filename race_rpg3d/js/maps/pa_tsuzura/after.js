/* ツヅラ パーキング: 2章以降 — サキと再戦できる */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  var TALK = {
    2: 'ヘビノセの ゴウは ストレートが ばかみたいに はやいよ。|コーナーで さを つけな。',
    3: 'キリガタニの シノブは しずかな ひと。|でも はしりは だれよりも こまかい。',
    4: 'ヤシャに いくんだって?|...クロサワさんは ほんものだよ。',
    5: 'ヌシに かったんだね。|ツヅラも にぎやかに なりそう。'
  };
  RR.Maps.layer('pa_tsuzura', 'after', {
    when: function (S) { return S.stage >= 2; },
    build: function (M) { M.prop('car', 13, 4, { model: 'hayate', color: 'black' }); },
    npcs: [{
      id: 'saki', x: 12, y: 6, dir: 'down', look: 'saki',
      talk: async function (E) {
        await E.say('サキ', TALK[Math.min(5, E.stage)]);
        var c = await E.ask('サキ', 'もういっかい はしる? かけきんは 5000。', ['はしる', 'やめておく']);
        if (c !== 0) return;
        if (E.money < 5000) { await E.say('サキ', 'かけきんが たりないよ。'); return; }
        var r = await E.race('saki_re');
        await E.say('サキ', r.win ? '...また まけた。あんた ほんとに はやく なった。' : 'ふふ、ツヅラは まだ あたしの ほうが くわしいね。');
      }
    }]
  });
})();
