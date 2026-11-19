/* キリハラ町: 終章 — 町の人の応援 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('town', 'ch4', {
    when: function (S) { return S.stage === 4; },
    npcs: [
      { id: 'cheer1', x: 26, y: 22, dir: 'down', look: 'man1', talk: K.random('おとこ', ['ゲンゾウさんの まごが ヤシャに いどむって|まちじゅうの うわさ だよ。', 'ヤシャは ながい くだり だ。さいごまで きを ぬくなよ。']) },
      { id: 'cheer2', x: 9, y: 24, dir: 'down', look: 'oldwoman', talk: K.lines('おばあさん', ['ゲンゾウさんも むかし ヤシャで はしったの。|あの よるの ことは わすれられないわ。']) }
    ]
  });
})();
