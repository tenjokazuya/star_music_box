/* cave.js — ほらあな（暗い洞窟、岩を押して板にのせるパズル、おじいちゃんの たからばこ）
 * このマップのフラグ: cave_seen, cave_solved, plate:p1..p3, got_flint, read_letter, star_5
 * パズル: tools/gen-puzzle.js で逆から作った（必ず解ける）。 tools/solve-puzzles.js で 39 手の解を確認済み。
 */
(function () {
  'use strict';

  var W = 16, H = 16;
  var g = Game.mapkit.grid(W, H, 'W');
  g.rect(5, 11, 1, 5, 'f');                 // 入口の通路
  g.hline(1, 13, 4, 'f');                   // 横道（ほしの かけら）
  g.rect(2, 5, 9, 6, 'f');                  // パズルの部屋
  // 部屋の中の柱（岩）
  [[5, 7], [8, 7], [4, 8], [5, 8], [8, 6], [9, 9], [6, 7], [4, 7], [7, 7]].forEach(function (p) { g.set(p[0], p[1], 'W'); });
  g.set(6, 4, 'f');                         // 門
  g.rect(4, 1, 5, 3, 'f');                  // たからの部屋

  var PLATES = [[8, 9], [2, 6], [9, 10]];

  Game.maps.register({
    id: 'cave', name: 'ほらあな', dark: true,
    bg: '#000000',
    legend: { W: 'cwall', f: 'cfloor' },
    ground: g.rows(),
    bgm: 'cave', ambient: ['cave'], tint: 'none', step: 'cave',
    puzzle: { solvedFlag: 'cave_solved', start: { x: 5, y: 10 }, afterReach: [[6, 5]] },

    reactions: [
      {
        id: 'solve', once: 'cave_solved',
        if: { all: ['plate:p1', 'plate:p2', 'plate:p3'] },
        run: async function (S) {
          await S.wait(16);
          await S.jingle('solve');
          await S.pan(6, 4, 0.1);
          S.sfx('gate');
          Game.gfx.shake(2, 60);
          await S.wait(70);
          S.set('cave_solved');
          await S.wait(30);
          await S.say('ごごご…。 おくの もんが ひらいた！', null);
          await S.unpan();
        }
      }
    ],

    events: [
      { id: 'exit', x: 5, y: 15, zone: true, run: async function (S) { await S.warp('forest', 4, 6, 'down', { sfx: 'step_cave' }); } },

      /* ---- 岩（さいしょの ばしょ）と板 ---- */
      { id: 'b1', x: 4, y: 9, sprite: 'boulder_dark', push: true, pages: [{ if: 'cave_solved', x: 8, y: 9, push: false }, { push: true }] },
      { id: 'b2', x: 3, y: 7, sprite: 'boulder_dark', push: true, pages: [{ if: 'cave_solved', x: 2, y: 6, push: false }, { push: true }] },
      { id: 'b3', x: 4, y: 10, sprite: 'boulder_dark', push: true, pages: [{ if: 'cave_solved', x: 9, y: 10, push: false }, { push: true }] },
      { id: 'p1', x: PLATES[0][0], y: PLATES[0][1], plate: true, sprite: 'plate', fx: 'plate', solid: false },
      { id: 'p2', x: PLATES[1][0], y: PLATES[1][1], plate: true, sprite: 'plate', fx: 'plate', solid: false },
      { id: 'p3', x: PLATES[2][0], y: PLATES[2][1], plate: true, sprite: 'plate', fx: 'plate', solid: false },

      /* ---- 門 ---- */
      {
        id: 'gate', x: 6, y: 4, sprite: 'gate', trigger: 'talk', pages: [
          { if: 'cave_solved', sprite: 'gate_open', solid: false },
          { solid: true, run: async function (S) { await S.say('おもい いしの もんが とじている。\nあしもとに ふしぎな いたが みっつ ある。', null); } }
        ]
      },

      /* ---- たからばこ ---- */
      {
        id: 'chest', x: 6, y: 1, sprite: 'chest', pages: [
          {
            if: 'got_flint', sprite: 'chest_open', run: async function (S) {
              await S.say('からっぽの はこ。 そこに ちいさく\nじが ほられている。', null);
              await S.say('「とうだいの ひを ともす ひとへ」', null);
            }
          },
          {
            run: async function (S) {
              await S.say('ほこりを かぶった ふるい はこだ。\nふたを あけてみる…。', null);
              S.sfx('chest');
              await S.wait(20);
              S.ev('chest').sprite('chest_open');
              S.set('got_flint');
              await S.give('flint', { text: 'ミオは ひうちいしを てにいれた！' });
              await S.give('letter', { text: 'はこの そこに、 てがみが ある。', jingle: 'solve' });
              S.set('read_letter');
              await S.say(['「この はこを あけた きみへ。', 'ぼくは いつか、 とうだいの ひを\nともす ひとに なる。', 'この ひうちいしは、 そのための\nおまもりだ。」'], null);
              await S.say('…おじいちゃんの じだ。 すこし わかい。', null);
            }
          }
        ]
      },

      /* ---- たいまつ（ぶたいの あかり） ---- */
      { id: 't1', x: 3, y: 4, sprite: 'torch', light: 46, solid: false, noShadow: true },
      { id: 't2', x: 9, y: 4, sprite: 'torch', light: 46, solid: false, noShadow: true },
      { id: 't3', x: 1, y: 8, sprite: 'torch', light: 40, solid: false, noShadow: true },
      { id: 't4', x: 11, y: 8, sprite: 'torch', light: 40, solid: false, noShadow: true },
      { id: 't5', x: 4, y: 1, sprite: 'torch', light: 40, solid: false, noShadow: true },
      { id: 't6', x: 8, y: 1, sprite: 'torch', light: 40, solid: false, noShadow: true },

      /* ---- 入ったとき ---- */
      {
        id: 'first', x: 5, y: 12, trigger: 'auto', pages: [{
          if: { not: 'cave_seen' }, run: async function (S) {
            S.set('cave_seen');
            await S.say('ひんやりした くうき。\nランプの あかりが あしもとを てらす。', null);
          }
        }]
      },

      {
        id: 'star5_spot', x: 1, y: 13, sparkle: true, trigger: 'talk', pages: [{
          if: { not: 'star_5' }, run: async function (S) {
            S.sfx('star'); Game.gfx.flash('#fff4b0', 20, 0.4);
            await S.wait(16);
            S.set('star_5');
            await S.say('ほしの かけらを みつけた！\n（' + S.count('star_') + ' / 5）', null);
            if (S.count('star_') >= 5) { await S.say('ぜんぶ そろった！ ふしぎと あたたかい。', null); }
          }
        }]
      }
    ]
  });
})();
