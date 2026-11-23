/* ガソリンスタンド: ミオ（洗車のバイト）と てんちょう */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  var MIO = {
    0: 'テツさんの ところには いった?|じいちゃんの ガレージ、なつかしいでしょ。',
    1: 'ツヅラとうげは ヘアピンが つづくんだって。|サキさんって ひとが すごく はやいらしいよ。',
    2: 'クロサワさんが ガレージに きたって ほんと?|...あたしも できることは てつだうからね。',
    3: 'キリガタニは きりが こくて あぶないよ。|むりは しないでね。',
    4: 'いよいよ ヤシャ だね。|{N}なら だいじょうぶ。しんじてる。',
    5: 'ガレージ、まもれて よかったね!|これからも ここで まってるから。'
  };
  RR.Maps.layer('gs', 'base', {
    npcs: [
      {
        id: 'mio', x: 4, y: 2, dir: 'down', look: 'mio', when: function (S) { return S.flags.met_mio; },
        talk: async function (E) {
          var c = await E.ask('ミオ', 'いらっしゃい、{N}!', ['せんしゃの バイト', 'はなす', 'やめる']);
          if (c === 0) {
            if (!E.flag('wash_job')) {
              await E.say('ミオ', 'スタンドの せんしゃを てつだって くれるの?|たすかる! てんちょうには はなして おくね。');
              await E.say('ミオ', 'スポンジで よごれを こするの。|じかん ないに なんだい あらえるか だよ!');
              E.setFlag('wash_job');
            }
            var r = await E.minigame('wash');
            await E.say('ミオ', r.rank === 'S' || r.rank === 'A' ? 'すごい! プロみたい!' : 'おつかれさま! また おねがいね。');
            return;
          }
          if (c === 1) {
            var line = MIO[Math.min(5, E.stage)];
            if (E.stage === 2 && !E.flag('kurosawa_met')) line = 'サキさんに かったの!? すごい!|テツさんにも はやく おしえて あげて。';
            await E.say('ミオ', line);
          }
        }
      },
      { id: 'boss', x: 7, y: 5, dir: 'left', look: 'worker', talk: K.lines('てんちょう', ['ミオちゃんは よく はたらく いい こだよ。', 'せんしゃの バイトは いつでも だいかんげい だ。']) }
    ],
    events: [
      { x: 8, y: 5, on: 'talk', run: async function (E) { await E.food('vending'); } }
    ]
  });
})();
