/* きっさ ゆうやけ: マスターと客 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('cafe', 'base', {
    npcs: [
      {
        id: 'master', x: 8, y: 2, dir: 'down', look: 'cafe',
        talk: async function (E) {
          var c = await E.ask('マスター', 'いらっしゃい。', ['ちゅうもん', 'バイト', 'やめる']);
          if (c === 0) { await E.food('cafe', { noGreet: true }); return; }
          if (c !== 1) return;
          if (!E.flag('cafe_job')) {
            E.setFlag('cafe_job');
            await E.say('マスター', 'コーヒーを いれる てつだい かい。|...いいだろう。');
            await E.say('マスター', 'おゆは みどりの ところで そそぐ。|まんなか なら いちばん おいしく はいる。3かいで 1ぱいだ。');
          }
          var a = await E.ask('マスター', 'あわてず ていねいにね。', ['はじめる', 'やっぱり やめる']);
          if (a !== 0) return;
          var r = await E.minigame('cafe');
          await E.say('マスター', r.rank === 'S' || r.rank === 'A' ? '...いい うでだ。うちで はたらかないか?' : 'おつかれさま。いっぱい のんで いきなさい。');
        }
      },
      { id: 'cust1', x: 3, y: 6, dir: 'left', look: 'oldwoman', talk: K.lines('おばあさん', ['この みせは ずっと むかしから あるのよ。', 'あなたの おじいさん... ゲンゾウさんも よく ここで|コーヒーを のんでたわ。まどぎわの せきが すきでね。']) },
      { id: 'cust2', x: 7, y: 6, dir: 'right', look: 'woman2', talk: K.random('おきゃく', ['ここの ナポリタンは なつかしい あじ。', 'よるの きっさてんって おちつくよね。']) }
    ]
  });
})();
