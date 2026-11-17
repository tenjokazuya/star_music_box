/* village.js — しおかぜむら（広場、友だちのココ、各地への分かれ道）
 * このマップのフラグ: met_coco, lh_open, star_2
 */
(function () {
  'use strict';

  var W = 30, H = 24;
  var g = Game.mapkit.grid(W, H, 'g');
  // 北東の岬（海と、灯台の立つ岩場）
  g.rect(21, 0, 9, 6, 'w'); g.rect(23, 0, 7, 4, 'D');
  g.rect(21, 6, 9, 6, 'r');
  // 南東の浜
  g.rect(23, 19, 7, 5, 's'); g.rect(26, 20, 4, 4, 'w'); g.rect(28, 21, 2, 3, 'D');
  g.hline(24, 19, 5, 's');
  // 広場
  g.rect(12, 10, 7, 4, 'c');
  // 道
  g.rect(14, 0, 2, 10, 'd');            // 北（もりの みち）
  g.rect(19, 12, 11, 2, 'd');           // 東（みなと）
  g.vline(23, 6, 7, 'd'); g.hline(23, 9, 4, 'd');   // 灯台へ
  g.hline(5, 18, 8, 'd'); g.vline(12, 14, 5, 'd'); // ミオの家
  g.vline(14, 14, 7, 'd'); g.hline(14, 20, 10, 'd'); // 南の道
  g.vline(22, 19, 1, 'd');
  // 草の変化
  g.scatter('f', 26, 5, { on: 'g' });
  g.scatter('t', 14, 11, { on: 'g' });

  var o = Game.mapkit.grid(W, H, '.');
  // 北の森の縁
  o.rect(0, 0, 14, 2, 'T'); o.rect(16, 0, 5, 2, 'T');
  o.rect(0, 2, 10, 1, 'T'); o.rect(0, 3, 5, 1, 'T'); o.rect(17, 2, 3, 1, 'T');
  o.rect(10, 3, 3, 1, 'T');
  // 左の縁（ほしの かけらの場所は (1,20)(1,21) だけ あけておく）
  o.rect(0, 2, 1, 20, 'T'); o.rect(1, 2, 1, 18, 'T');
  // 南の縁
  o.rect(0, 22, 23, 2, 'T');
  o.set(21, 21, 'B'); o.set(20, 22, 'T');
  // 東の端
  o.rect(28, 14, 2, 5, 'B');
  // ところどころの木と低木
  o.cellsAt([[9, 6], [11, 5], [18, 5], [19, 7], [8, 9], [10, 8], [3, 10], [6, 10], [20, 9]], 'T');
  o.cellsAt([[17, 4], [12, 7], [7, 8], [4, 11], [9, 11], [26, 16], [27, 16], [11, 20], [10, 21], [4, 21], [3, 20]], 'B');
  o.cellsAt([[8, 20], [2, 12], [27, 13]], 'R');
  // 街灯
  o.cellsAt([[13, 8], [16, 8], [11, 13], [19, 14], [13, 18]], 'L');
  // かんばん
  o.set(13, 6, 'S');
  // 草の上に出ている木を、道の上には置かない
  g.cells.forEach(function (row, y) { row.forEach(function (c, x) { if ((c === 'd' || c === 'c' || c === 'r' || c === 'w' || c === 'D') && o.cells[y][x] !== '.') { o.cells[y][x] = '.'; } }); });

  function hasAllParts(S) { return S.flag('got_oil') && S.flag('got_lens') && S.flag('got_flint'); }

  async function topics(S) {
    var done = false;
    while (!done) {
      var i = await S.ask(['なにを しりたい？'], ['みなとの こと', 'もりの こと', 'とうだいの こと', 'ほしの かけらの こと', 'もういい']);
      if (i === 0) {
        await S.say(['むらの ひがしの みちを いくと みなとだよ。', 'ゲンさんが いつも ふねの そばに いるの。\nちょっと こわい かおだけど、 やさしいよ。']);
      } else if (i === 1) {
        await S.say(['むらの きたの みちが もりの みち。\nおくに ガラスこうぼうが あるよ。', 'ハルばあさんは のんびりやさん。\nもりは まよいやすいから きを つけてね。']);
      } else if (i === 2) {
        await S.say(['きたひがしの がけの うえに たってるよ。', 'あの ひが きえてから、 うみが\nなんだか さみしいの。']);
      } else if (i === 3) {
        if (S.count('star_') >= 5) {
          await S.say(['ぜんぶ あつめたの！？ すごい！', 'ねえ、 ぜんぶ おわったら\nよるの そらを みあげて みて。']);
        } else {
          await S.say(['ほしの かけらって しってる？\nむらの あちこちに おちてるの。', 'ちいさな ほしの かたちの いしでね、\n5つ あつめると いいことが あるって うわさ。',
            'わたしは まだ ふたつしか みつけて ないんだ。']);
        }
      } else { done = true; }
    }
  }

  var NIGHT_FOG = { dusk: 0.08, evening: 0.14, night: 0.2, deep: 0.24, dawn: 0, day: 0 };

  Game.maps.register({
    id: 'village', name: 'しおかぜむら',
    legend: { g: 'grass', f: 'grass_f', t: 'grass_t', d: 'dirt', c: 'cobble', s: 'sand', w: 'water', D: 'deep', r: 'rockfloor' },
    ground: g.rows(),
    objLegend: { T: 'tree', B: 'bush', R: 'rock', L: 'lamppost', S: 'sign', F: 'fence' },
    objects: o.rows(),
    bgm: 'village', ambient: ['sea', 'night'],
    fx: ['seaglint', 'leaves'],
    beam: { x: 26, y: 0 },
    fog: function () { return NIGHT_FOG[Game.field.timeOfDay()] || 0; },
    windowLights: [{ x: 3, y: 16.5, r: 13 }, { x: 7, y: 16.5, r: 13 }, { x: 18, y: 18.5, r: 13 }, { x: 24, y: 17.5, r: 13 }],

    props: [
      { type: 'house_red', x: 3, y: 13 },
      { type: 'house_blue', x: 15, y: 15 },
      { type: 'house_green', x: 21, y: 14 },
      { type: 'lighthouse', x: 25, y: 7 },
      { type: 'well', x: 14, y: 11 },
      { type: 'bench', x: 17, y: 11 },
      { type: 'rowboat', x: 24, y: 20 },
      { type: 'pots', x: 9, y: 19 }, { type: 'pots', x: 12, y: 15 },
      { type: 'barrel', x: 20, y: 19 }
    ],

    events: [
      /* ---- 出入口 ---- */
      { id: 'to_house', x: 5, y: 17, warp: { map: 'house', x: 5, y: 7, dir: 'up', sfx: 'door_open' } },
      { id: 'to_forest', x: 14, y: 0, w: 2, warp: { map: 'forest', x: 12, y: 27, dir: 'up', sfx: 'step_grass' } },
      { id: 'to_harbor', x: 29, y: 12, h: 2, warp: { map: 'harbor', x: 1, y: 9, dir: 'right', sfx: 'step_grass' } },
      {
        id: 'lh_door', x: 26, y: 8, solid: true, trigger: 'touch', run: async function (S) {
          if (S.flag('lh_open')) {
            await S.warp('lighthouse1', 5, 8, 'up', { sfx: 'door_open' });
          } else if (!hasAllParts(S)) {
            await S.say(['とびらには かぎが かかっている。', 'ひを ともす どうぐが そろってから\nもう いちど こよう。'], null);
          } else {
            await S.say('おじいちゃんの かぎで とびらを あける。', null);
            S.sfx('set_item');
            await S.wait(16);
            S.sfx('door_open');
            await S.wait(10);
            S.set('lh_open');
            await S.say('…かちゃり。 とびらが ひらいた。', null);
            await S.warp('lighthouse1', 5, 8, 'up', { sfx: 'stairs' });
          }
        }
      },
      {
        id: 'coco_door', x: 17, y: 19, solid: true, trigger: 'touch', run: async function (S) {
          await S.say('ココの いえの とびらは しまっている。', null);
        }
      },
      {
        id: 'green_door', x: 22, y: 18, solid: true, trigger: 'touch', run: async function (S) {
          await S.say('とびらを たたいたが へんじは ない。\nるすの ようだ。', null);
        }
      },

      /* ---- ひとびと ---- */
      {
        id: 'coco', name: 'ココ', x: 17, y: 13, sprite: 'coco', dir: 'left', wander: { radius: 1 }, pages: [
          {
            if: { flag: 'cleared' }, run: async function (S) {
              await S.say(['ミオ、 すごかったね！\nとうだいの ひ、 むらじゅうが みてたよ。', 'わたし、 なみだが でちゃった。']);
              await topics(S);
            }
          },
          {
            if: { flag: 'met_coco' }, run: async function (S) {
              if (hasAllParts(S)) { await S.say(['あっ、 ぜんぶ そろったんだ！\nとうだいは きたひがしの がけだよ。', 'ミオなら きっと できる。']); }
              else { await S.say('あっ、 ミオ！ どうしたの？'); }
              await topics(S);
            }
          },
          {
            run: async function (S) {
              S.set('met_coco');
              await S.emote('coco', '!');
              await S.say(['あっ、 ミオ！ ちょうど いえに\nいこうと おもってたの。',
                'ふね、 まだ もどらないんでしょ？\nうちの おとうさんも しんぱいしてた。',
                'なにか てつだえること ある？\nむらの ことなら なんでも しってるよ。']);
              await topics(S);
            }
          }
        ]
      },
      {
        id: 'old_woman', name: 'おばあさん', x: 9, y: 20, sprite: 'v_old', dir: 'down', wander: { radius: 1 }, pages: [
          { if: { flag: 'cleared' }, run: async function (S) { await S.say(['あさの ひかりは いいねえ。', 'ミオちゃん、 ありがとうよ。']); } },
          {
            if: { fn: function (S) { return hasAllParts(S); } }, run: async function (S) {
              await S.say(['ミオちゃんの ランプが、 まるで ちいさな とうだいだね。', 'きを つけて いっておいで。']);
            }
          },
          {
            run: async function (S) {
              await S.say(['きょうは きりが ふかいねえ。', 'ミオちゃん、 ひとりで あるいて だいじょうぶかい？']);
            }
          }
        ]
      },
      {
        id: 'man', name: 'むらの おじさん', x: 20, y: 11, sprite: 'v_man', dir: 'down', pages: [
          { if: { flag: 'cleared' }, run: async function (S) { await S.say(['ゆうべの ひかりは すごかった。', 'むらの みんなが でてきて\nみあげていたぞ。']); } },
          {
            run: async function (S) {
              await S.say(['とうだいが くらいと、 ふねは みなとの\nばしょが わからなく なるんだ。', 'こんな きりの よるは とくにな。']);
            }
          }
        ]
      },
      {
        id: 'boy', name: 'おとこのこ', x: 10, y: 11, sprite: 'v_boy', dir: 'right', wander: { radius: 2 }, pages: [
          { if: { flag: 'cleared' }, run: async function (S) { await S.say('もう すっかり あかるいや！'); } },
          {
            run: async function (S) {
              await S.say(['ミケが また たかい ところに のぼってる。', 'ミオ、 むこうの ねこを みてやって！']);
            }
          }
        ]
      },
      {
        id: 'mike', name: 'ミケ', x: 7, y: 19, sprite: 'cat', dir: 'right', pages: [{
          run: async function (S) {
            S.sfx('meow');
            await S.emote('mike', '♪');
            var n = S.random(3);
            await S.say(n === 0 ? 'にゃあ。' : (n === 1 ? 'にゃーん。' : 'ごろごろ…。'), null);
          }
        }]
      },

      /* ---- 調べるもの ---- */
      {
        id: 'sign', x: 13, y: 6, trigger: 'talk', run: async function (S) {
          await S.say(['ひがし: みなと', 'きた: もりの みち\nきたひがし: とうだい'], null);
        }
      },
      {
        id: 'well', x: 14, y: 11, w: 2, trigger: 'talk', run: async function (S) {
          await S.say('ふるい いど。 そこの ほうで\nみずの おとが する。', null);
        }
      },
      {
        id: 'boat', x: 24, y: 20, w: 2, trigger: 'talk', run: async function (S) {
          await S.say('はまに ひきあげられた ちいさな ふね。', null);
        }
      },
      {
        id: 'star2_spot', x: 1, y: 20, sparkle: true, trigger: 'talk', pages: [
          {
            if: { not: 'star_2' }, run: async function (S) {
              S.sfx('star'); Game.gfx.flash('#fff4b0', 20, 0.4);
              await S.wait(16);
              S.set('star_2');
              await S.say('ほしの かけらを みつけた！\n（' + S.count('star_') + ' / 5）', null);
            }
          }
        ]
      }
    ]
  });
})();
