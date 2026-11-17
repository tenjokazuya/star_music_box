/* storehouse.js — そうこ（木箱をおして、あぶらだるまでの道をつくる押し物パズル）
 * このマップのフラグ: store_seen, got_oil
 * パズルの解き方: 下の木箱を よこへどかし、 まんなかの木箱を うえへ 2回おす。 tools/solve-puzzles.js で確認済み
 */
(function () {
  'use strict';

  var g = Game.mapkit.grid(10, 10, 'S');
  g.rect(0, 0, 10, 3, 'W');
  g.vline(0, 3, 7, '#'); g.vline(9, 3, 7, '#');
  g.hline(0, 9, 10, '#'); g.set(4, 9, 'S');

  var o = Game.mapkit.grid(10, 10, '.');
  // うごかせない木箱（かべの代わり）
  o.cellsAt([[5, 3], [5, 4], [7, 5], [8, 5]], 'X');
  // かざり
  o.cellsAt([[1, 3], [1, 4], [2, 3]], 'Q');
  o.cellsAt([[1, 7], [2, 8], [8, 8]], 'X');
  o.set(1, 8, 'Q');

  Game.maps.register({
    id: 'storehouse', name: 'そうこ', indoor: true,
    bg: '#0c0a12',
    legend: { S: 'stone', W: 'stonewall', '#': 'void' },
    ground: g.rows(),
    objLegend: { X: 'crate', Q: 'barrel' },
    objects: o.rows(),
    bgm: 'harbor', ambient: ['indoor'], tint: 'none',
    puzzle: { start: { x: 4, y: 8 }, reach: [[7, 3], [8, 4]] },

    props: [
      { type: 'shelf', x: 2, y: 2 }, { type: 'shelf', x: 3, y: 2 },
      { type: 'torch', x: 4, y: 2 }, { type: 'net', x: 7, y: 2 }, { type: 'shelf', x: 8, y: 2 },
      { type: 'torch', x: 6, y: 2 }
    ],

    events: [
      { id: 'exit', x: 4, y: 9, zone: true, run: async function (S) { await S.warp('harbor', 5, 5, 'down', { sfx: 'door_open' }); } },

      /* ---- うごかせる木箱（さいしょの ばしょが home になる） ---- */
      { id: 'c1', x: 6, y: 5, sprite: 'crate', push: true },
      { id: 'c2', x: 6, y: 6, sprite: 'crate', push: true },

      /* ---- あぶらだる ---- */
      {
        id: 'oil_barrel', x: 8, y: 3, sprite: 'barrel_oil', pages: [
          {
            if: { not: 'got_oil' }, run: async function (S) {
              await S.say('ふるい にもつの おくに、\nあぶらだるが ひとつ ある。', null);
              S.sfx('chest');
              await S.wait(10);
              S.set('got_oil');
              await S.give('oil', { text: 'ミオは あぶらを てにいれた！\nふたを あけて、 かんの なかに うつした。' });
            }
          },
          { run: async function (S) { await S.say('もう からっぽだ。', null); } }
        ]
      },

      /* ---- さいしょに はいったとき ---- */
      {
        id: 'first', x: 4, y: 8, trigger: 'auto', pages: [{
          if: { not: 'store_seen' }, run: async function (S) {
            S.set('store_seen');
            await S.say('くらい そうこの おくに、\nあぶらだるが みえる。', null);
            await S.pan(8, 3, 0.1);
            await S.wait(24);
            await S.say('でも、 きの はこが じゃまを している。\nおして どかせそうだ。', null);
            await S.unpan();
          }
        }]
      },
      { id: 'ob_shelf', x: 2, y: 2, w: 2, trigger: 'talk', run: async function (S) { await S.say('つなや ぬのが しまってある。', null); } },
      { id: 'ob_net', x: 7, y: 2, trigger: 'talk', run: async function (S) { await S.say('つかいこまれた あみ。', null); } }
    ]
  });
})();
