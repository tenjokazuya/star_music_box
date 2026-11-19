/* ヘビノセ パーキング: 3章以降 — ゴウと再戦 */
(function () {
  'use strict';
  var RR = window.RR;
  var TALK = {
    3: 'シノブは きりの なかでも まっすぐ はしる。|あれは コースを からだで おぼえてるんだ。',
    4: 'クロサワさんの オロチは ばけものだ。|まけるなよ!',
    5: 'ヌシに かったって? さすが おれを たおした おとこだ!'
  };
  RR.Maps.layer('pa_hebi', 'after', {
    when: function (S) { return S.stage >= 3; },
    npcs: [{
      id: 'gou', x: 17, y: 6, dir: 'down', look: 'gou',
      talk: async function (E) {
        await E.say('ゴウ', TALK[Math.min(5, E.stage)]);
        var c = await E.ask('ゴウ', 'リベンジ させろ! かけきんは 10000!', ['うける', 'やめておく']);
        if (c !== 0) return;
        if (E.money < 10000) { await E.say('ゴウ', 'かけきんが たりねえな。'); return; }
        var r = await E.race('gou_re');
        await E.say('ゴウ', r.win ? 'くそー! つぎこそ!' : 'どうだ! ターボは さいこうだろ!');
      }
    }]
  });
})();
