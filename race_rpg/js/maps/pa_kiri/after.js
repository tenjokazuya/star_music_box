/* キリガタニ パーキング: 終章以降 — シノブと再戦 */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.layer('pa_kiri', 'after', {
    when: function (S) { return S.stage >= 4; },
    build: function (M) { M.prop('car', 13, 4, { model: 'regulus', color: 'silver' }); },
    npcs: [{
      id: 'shinobu', x: 12, y: 6, dir: 'down', look: 'shinobu',
      talk: async function (E) {
        await E.say('シノブ', E.stage >= 5 ? '...よあけの ヤシャ、きれい だった でしょう。' : '...ヤシャは ながい。さいごの ヘアピンまで あきらめないで。');
        var c = await E.ask('シノブ', '...もういちど はしる? かけきんは 15000。', ['はしる', 'やめておく']);
        if (c !== 0) return;
        if (E.money < 15000) { await E.say('シノブ', '...かけきんが たりない。'); return; }
        var r = await E.race('shinobu_re');
        await E.say('シノブ', r.win ? '...また つよく なった。' : '...きりは まだ わたしの みかた。');
      }
    }]
  });
})();
