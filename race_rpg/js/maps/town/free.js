/* キリハラ町: 1章以降 — ケンタとの再戦、町の走り屋、ウラヤマ坂のタイムアタック */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  var KENTA = {
    1: 'ツヅラの サキさんに いどむのか?|ヘアピンで ブレーキが おそいと すぐ はみだすぞ。',
    2: 'クロサワさんが うごいたって ほんと?|ヤシャの ヌシ だぜ...',
    3: 'きりの キリガタニかあ。おれは こわくて いけないや。',
    4: 'いよいよ ヤシャだな! おれも おうえんに いくぜ!',
    5: 'おれも いつか ヌシに かつんだ!|そのときは しょうぶ してくれよな!'
  };
  RR.Maps.layer('town', 'free', {
    when: function (S) { return S.stage >= 1; },
    build: function (M) { M.prop('car', 33, 20, { model: 'tsubame', color: 'orange', dir: 'h' }); },
    npcs: [
      {
        id: 'kenta', x: 35, y: 19, dir: 'down', look: 'kenta',
        talk: async function (E) {
          var line = KENTA[Math.min(5, E.stage)];
          if (E.stage === 2 && !E.flag('kurosawa_met')) line = 'サキさんに かったって!? すげー!|ガレージの テツさんが さがしてたぜ。';
          await E.say('ケンタ', line);
          var c = await E.ask('ケンタ', 'リベンジ させてくれよ! かけきんは 1000!', ['うける', 'やめておく']);
          if (c !== 0) return;
          if (E.money < 1000) { await E.say('ケンタ', 'かけきん たりないじゃん!'); return; }
          var r = await E.race('kenta_re');
          await E.say('ケンタ', r.win ? 'また まけた... くっそー!' : 'へへっ! たまには かつんだよ!');
        }
      },
      { id: 'yasuo', x: 38, y: 20, dir: 'left', look: 'man2', talk: K.racer('ヤスオ', 'yasuo', { hello: 'コンビニうらの さかで いっぽん どうだい?', win: 'ちぇっ、まけたか。', lose: 'ジュース だい ゲット!' }) },
      { id: 'rin', x: 17, y: 38, dir: 'down', look: 'racer6', talk: K.racer('リン', 'rin', { hello: 'ウラヤマざか、ひさしぶりに はしりたいな。つきあって?', win: 'わあ、はやいね!', lose: 'えへへ、かっちゃった。' }) },
      { id: 'ta', x: 34, y: 23, dir: 'up', look: 'man1', talk: K.timeAttack('タイムキーパー', 'ta_urayama') }
    ]
  });
})();
