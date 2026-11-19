/* コンビニ: 店員と客 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('konbini', 'base', {
    npcs: [
      { id: 'clerk', x: 9, y: 4, dir: 'down', look: 'clerk', talk: async function (E) { await E.food('konbini'); } },
      { id: 'mag', x: 7, y: 7, dir: 'up', look: 'boy', talk: K.random('こども', ['くるまの ざっし よんでるの。', 'おとなに なったら オロチに のるんだ!']) },
      { id: 'night', x: 3, y: 5, dir: 'left', look: 'man3', wander: 1, talk: K.random('おとこ', ['よなかの コンビニって なんか すき なんだよね。', 'エナジードリンクを のんで とうげに いくのさ。']) }
    ],
    events: [
      { x: 1, y: 2, w: 6, on: 'talk', run: async function (E) { await E.msg('のみものが ずらりと ならんでいる。|レジで かおう。'); } }
    ]
  });
})();
