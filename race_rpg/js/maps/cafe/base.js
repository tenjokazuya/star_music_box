/* きっさ ゆうやけ: マスターと客 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('cafe', 'base', {
    npcs: [
      { id: 'master', x: 8, y: 2, dir: 'down', look: 'cafe', talk: async function (E) { await E.food('cafe'); } },
      { id: 'cust1', x: 3, y: 6, dir: 'left', look: 'oldwoman', talk: K.lines('おばあさん', ['この みせは ずっと むかしから あるのよ。', 'あなたの おじいさん... ゲンゾウさんも よく ここで|コーヒーを のんでたわ。まどぎわの せきが すきでね。']) },
      { id: 'cust2', x: 7, y: 6, dir: 'right', look: 'woman2', talk: K.random('おきゃく', ['ここの ナポリタンは なつかしい あじ。', 'よるの きっさてんって おちつくよね。']) }
    ]
  });
})();
