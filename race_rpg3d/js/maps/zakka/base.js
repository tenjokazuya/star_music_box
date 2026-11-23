/* ざっか屋: 店員 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('zakka', 'base', {
    npcs: [
      { id: 'clerk', x: 9, y: 2, dir: 'down', look: 'clerk2', talk: async function (E) { await E.shop('zakka'); } },
      { id: 'cust', x: 4, y: 7, dir: 'up', look: 'woman1', wander: 1, talk: K.random('おきゃく', ['この ソファ、すわりごこちが いいの。', 'へやに おく ものを えらぶのって たのしいよね。']) }
    ],
    events: [
      { x: 1, y: 3, w: 2, on: 'talk', run: async function (E) { await E.msg('てんじひんの ソファだ。|ふかふか している。'); } }
    ]
  });
})();
