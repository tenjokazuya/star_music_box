/* 中古車店: てんちょう */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('dealer', 'base', {
    npcs: [
      { id: 'owner', x: 6, y: 2, dir: 'down', look: 'man1', talk: async function (E) { await E.dealer(); } }
    ],
    events: [
      { x: 1, y: 4, h: 2, on: 'talk', run: async function (E) { await E.msg('あかい ハヤテが ならんでいる。|みがきあげられて ピカピカだ。'); } },
      { x: 9, y: 4, h: 2, on: 'talk', run: async function (E) { await E.msg('くろい オロチだ。|ながい はなさきが かっこいい。'); } }
    ]
  });
})();
