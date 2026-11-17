/* lighthouse2.js — とうだい 2かい（おじいちゃんの むかしの へや、にっき）
 * このマップのフラグ: read_diary
 */
(function () {
  'use strict';

  var g = Game.mapkit.grid(10, 10, 'S');
  g.rect(0, 0, 10, 3, 'W');
  g.vline(0, 3, 7, '#'); g.vline(9, 3, 7, '#');
  g.hline(0, 9, 10, '#'); g.set(5, 9, 'S');
  g.set(4, 3, 'T'); g.set(5, 3, 'T');
  g.rect(2, 5, 4, 3, 'R');

  Game.maps.register({
    id: 'lighthouse2', name: 'とうだい 2かい', indoor: true,
    bg: '#0c0a14',
    legend: { S: 'floor', W: 'stonewall', '#': 'void', T: 'stairs', R: 'rug' },
    ground: g.rows(),
    bgm: 'lighthouse', ambient: ['windhigh'], tint: 'none',

    props: [
      { type: 'window_round', x: 2, y: 1 }, { type: 'window_round', x: 7, y: 1 },
      { type: 'torch', x: 3, y: 2 }, { type: 'torch', x: 6, y: 2 },
      { type: 'bed', x: 1, y: 3 }, { type: 'shelf', x: 8, y: 2 },
      { type: 'table_s', x: 8, y: 4 }, { type: 'diary', x: 8, y: 5 },
      { type: 'chair', x: 7, y: 4 },
      { type: 'plant', x: 8, y: 7 }
    ],

    events: [
      { id: 'down', x: 5, y: 9, zone: true, run: async function (S) { await S.warp('lighthouse1', 5, 4, 'down', { sfx: 'stairs', frames: 10 }); } },
      { id: 'up', x: 4, y: 3, w: 2, zone: true, run: async function (S) { await S.warp('lighthouse_top', 5, 7, 'up', { sfx: 'stairs', frames: 10 }); } },

      {
        id: 'diary', x: 8, y: 5, trigger: 'talk', run: async function (S) {
          await S.say('ふるい にっきが ひらいたまま おかれている。', null);
          await S.say(['「きょうも とうだいの ひを ともした。」', '「ひを ともす ことは、\nかえりを まつ ことだ。」', '「まっている ひとが いる かぎり、\nひは きえない。」'], null);
          if (!S.flag('read_diary')) {
            S.set('read_diary');
            await S.say('…おじいちゃんの にっきだ。\nさいごの ページに、 ちいさく かいてある。', null);
            await S.say('「ミオが うまれた よるも、\nこの ひを ともしていた。」', null);
          } else {
            await S.say('さいごの ページ:\n「ミオが うまれた よるも、 この ひを…」', null);
          }
        }
      },
      { id: 'ob_bed', x: 1, y: 3, h: 2, trigger: 'talk', run: async function (S) { await S.say('おじいちゃんが わかい ころ、 ここで\nねおきしていたのかな。', null); } },
      { id: 'ob_shelf', x: 8, y: 2, trigger: 'talk', run: async function (S) { await S.say('うみの ほんと、 とうだいの ほんが\nぎっしり ならんでいる。', null); } },
      { id: 'ob_plant', x: 8, y: 7, trigger: 'talk', run: async function (S) { await S.say('かれかけた はっぱ。\nみずを あげたら げんきに なるかな。', null); } },
      { id: 'ob_window', x: 2, y: 2, trigger: 'talk', run: async function (S) { await S.say('まどの そとは まっくら。\nうみの おとだけが きこえる。', null); } },
      { id: 'ob_window2', x: 7, y: 2, trigger: 'talk', run: async function (S) { await S.say('とおくで、 かすかに かなしい\nおとが きこえた。 …ふねの ふえ？', null); S.sfx('horn_far'); } }
    ]
  });
})();
