/* kotori_shrine / クリア後: ほこらの おくに 地下への階段が あらわれる（隠しエリアの入口） */
(function () {
  'use strict';
  PF.maps.part('kotori_shrine', 'secret', {
    when: { flag: 'ending.done' },
    tiles: [{ x: 5, y: 2, ch: 'v' }],
    objects: [{ type: 'warp', x: 5, y: 2, to: 'garden', entry: 'stairs', sfx: 'stairs' }],
    onEnter: async function (g) {
      if (g.flag('secret.seen')) return;
      g.set('secret.seen');
      await g.say(['いしの だいの よこに、あたらしい かいだんが ひらいている。', 'したから あたたかい かぜが ふきあげて くる。']);
    }
  });
})();
