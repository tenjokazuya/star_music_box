/* lighthouse1.js — とうだい 1かい（入口、ねむる ねこ、らせん階段）
 * このマップのフラグ: lh_seen
 */
(function () {
  'use strict';

  var g = Game.mapkit.grid(10, 10, 'S');
  g.rect(0, 0, 10, 3, 'W');
  g.vline(0, 3, 7, '#'); g.vline(9, 3, 7, '#');
  g.hline(0, 9, 10, '#'); g.set(5, 9, 'S');
  g.set(4, 3, 'T'); g.set(5, 3, 'T');

  var o = Game.mapkit.grid(10, 10, '.');
  o.cellsAt([[1, 3], [1, 4], [8, 4]], 'Q');
  o.cellsAt([[8, 3], [8, 5]], 'X');
  o.set(1, 7, 'P');

  Game.maps.register({
    id: 'lighthouse1', name: 'とうだい 1かい', indoor: true,
    bg: '#0c0a14',
    legend: { S: 'stone', W: 'stonewall', '#': 'void', T: 'stairs' },
    ground: g.rows(),
    objLegend: { Q: 'barrel', X: 'crate', P: 'pots' },
    objects: o.rows(),
    bgm: 'lighthouse', ambient: ['windhigh'], tint: 'none', step: 'stone',

    props: [
      { type: 'torch', x: 3, y: 2 }, { type: 'torch', x: 7, y: 2 },
      { type: 'window_round', x: 4, y: 1 }, { type: 'window_round', x: 5, y: 1 },
      { type: 'table_s', x: 2, y: 6 }, { type: 'chair', x: 3, y: 6 },
      { type: 'picture', x: 2, y: 1 }
    ],

    events: [
      { id: 'exit', x: 5, y: 9, zone: true, run: async function (S) { await S.warp('village', 26, 9, 'down', { sfx: 'door_close' }); } },
      { id: 'up', x: 4, y: 3, w: 2, zone: true, run: async function (S) { await S.warp('lighthouse2', 5, 8, 'up', { sfx: 'stairs', frames: 10 }); } },

      {
        id: 'cat', name: 'ねこ', x: 7, y: 6, sprite: 'cat2', dir: 'left', pages: [{
          run: async function (S) {
            S.sfx('meow', { rate: 0.8 });
            await S.say('ねこが まるくなって ねている。\nめを あけて、 またすぐ ねむった。', null);
          }
        }]
      },
      {
        id: 'first', x: 5, y: 8, trigger: 'auto', pages: [{
          if: { not: 'lh_seen' }, run: async function (S) {
            S.set('lh_seen');
            await S.say('とうだいの なかは しんと している。\nらせんかいだんが うえへ のびている。', null);
          }
        }]
      },
      { id: 'ob_pic', x: 2, y: 2, trigger: 'talk', run: async function (S) { await S.say('ふるい えが かざってある。\nとうだいの まえに わかい おとこが たっている。', null); } },
      { id: 'ob_table', x: 2, y: 6, trigger: 'talk', run: async function (S) { await S.say('ほこりを かぶった ランプの ほや。\nだれかが ていねいに みがいて いたようだ。', null); } },
      { id: 'ob_barrel', x: 1, y: 3, h: 2, trigger: 'talk', run: async function (S) { await S.say('からっぽの たる。', null); } },
      { id: 'ob_pots', x: 1, y: 7, trigger: 'talk', run: async function (S) { await S.say('つぼの なかには なにも ない。', null); } }
    ]
  });
})();
