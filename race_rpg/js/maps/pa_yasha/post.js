/* ヤシャ パーキング: クリア後 — クロサワと再戦できる */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.layer('pa_yasha', 'post', {
    when: function (S) { return S.stage >= 5; },
    npcs: [{
      id: 'kurosawa', x: 17, y: 6, dir: 'down', look: 'kurosawa',
      talk: async function (E) {
        await E.say('クロサワ', E.won('hayami') ? 'ハヤミさんに あったか。|...ゲンゾウが ただひとり みとめた おとこだ。' : 'きゅうどうに しろい くるまが でる という うわさ...|きに なるなら たしかめて みることだ。');
        var c = await E.ask('クロサワ', 'もういちど はしるか? かけきんは 30000。', ['はしる', 'やめておく']);
        if (c !== 0) return;
        if (E.money < 30000) { await E.say('クロサワ', 'かけきんが たりないようだな。'); return; }
        var r = await E.race('kurosawa_re');
        await E.say('クロサワ', r.win ? '...やはり つよい。' : '...ヤシャは まだ わたしの やまだ。');
      }
    }]
  });
})();
