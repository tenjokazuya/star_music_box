/* ラーメン屋: おやじ（食事・バイト）と常連 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('ramen', 'base', {
    npcs: [
      {
        id: 'chef', x: 5, y: 3, dir: 'down', look: 'chef',
        talk: async function (E) {
          var c = await E.ask('おやじ', 'へい らっしゃい! なんに する?', ['たべる', 'バイト', 'やめる']);
          if (c === 0) { await E.food('ramen'); return; }
          if (c === 1) {
            if (!E.flag('ramen_job')) { await E.say('おやじ', 'もりつけを てつだって くれるのか?|ちゅうもんを よく おぼえて のせて くれよ。'); E.setFlag('ramen_job'); }
            var a = await E.ask('おやじ', 'じゃあ たのむぜ!', ['やる', 'やっぱり やめる']);
            if (a !== 0) return;
            var r = await E.minigame('ramen');
            await E.say('おやじ', r.rank === 'S' || r.rank === 'A' ? 'いい うでだ! また たのむぜ!' : 'おつかれさん。まかないも たべていきな。');
          }
        }
      },
      { id: 'reg1', x: 3, y: 5, dir: 'up', look: 'man1', face: true, solid: true, talk: K.lines('じょうれん', ['ここの みそは よるに しみるんだ。', 'とうげ がえりの はしりやも よく くるよ。']) },
      { id: 'reg2', x: 10, y: 7, dir: 'left', look: 'worker', talk: K.random('さぎょういん', ['しごと あがりの ラーメンは さいこう だね。', 'ガソリンスタンドの こが まじめに はたらいてたよ。']) }
    ],
    events: [
      { x: 6, y: 2, on: 'talk', run: async function (E) { await E.msg('ぐつぐつと スープが にえている。'); E.sfx('bubble'); } }
    ]
  });
})();
