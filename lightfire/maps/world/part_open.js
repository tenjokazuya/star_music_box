/* world / 進行による変化: 塔へ光の橋が かかる(ch>=5)、クリア後は 雪が とけて 春になる */
(function () {
  'use strict';
  PF.maps.part('world', 'bridge', {
    when: { gte: ['ch', 5] },
    tiles: [28, 29].reduce(function (a, x) { for (var y = 5; y <= 10; y++) a.push({ x: x, y: y, ch: 'B' }); return a; }, []),
    objects: [{ type: 'trigger', x: 28, y: 10, w: 2, h: 1, once: 'world.bridge_seen', run: async function (g) { g.sfx('shine'); await g.say(['みずうみの うえに、ひかりの はしが かかっている。', 'ともしびが きたの とうへ みちびいて いる…。']); } }]
  });
  PF.maps.part('world', 'spring', {
    when: { flag: 'clear' },
    convert: { n: '.', T: '#', G: '#', i: '~', I: '~', a: ',' },
    bgm: 'hope', ambience: ['birds'], snow: false
  });
})();
