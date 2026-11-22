/* コンビニ: 店員と客 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('konbini', 'base', {
    npcs: [
      {
        id: 'clerk', x: 9, y: 4, dir: 'down', look: 'clerk',
        talk: async function (E) {
          var c = await E.ask('てんいん', 'いらっしゃいませー。', ['かいもの', 'バイト', 'やめる']);
          if (c === 0) { await E.food('konbini', { noGreet: true }); return; }
          if (c !== 1) return;
          if (!E.flag('konbini_job')) {
            E.setFlag('konbini_job');
            await E.say('てんいん', 'しなだしを てつだって くれるんですか?|たすかりますー。');
            await E.say('てんいん', 'ながれてくる しょうひんを おなじ たなに|ならべて ください。ためすぎると おちちゃうので きを つけて。');
          }
          var a = await E.ask('てんいん', 'じゃあ おねがい しますー。', ['はじめる', 'やっぱり やめる']);
          if (a !== 0) return;
          var r = await E.minigame('konbini');
          await E.say('てんいん', r.rank === 'S' || r.rank === 'A' ? 'はやい! てんちょうより はやいかも。' : 'おつかれさまでしたー。');
        }
      },
      { id: 'mag', x: 7, y: 7, dir: 'up', look: 'boy', talk: K.random('こども', ['くるまの ざっし よんでるの。', 'おとなに なったら オロチに のるんだ!']) },
      { id: 'night', x: 3, y: 5, dir: 'left', look: 'man3', wander: 1, talk: K.random('おとこ', ['よなかの コンビニって なんか すき なんだよね。', 'エナジードリンクを のんで とうげに いくのさ。']) }
    ],
    events: [
      { x: 1, y: 2, w: 6, on: 'talk', run: async function (E) { await E.msg('のみものが ずらりと ならんでいる。|レジで かおう。'); } }
    ]
  });
})();
