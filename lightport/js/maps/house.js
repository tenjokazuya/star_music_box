/* house.js — ミオの いえ（プロローグ、おかあさん、おじいちゃん）
 * このマップのフラグ: intro_done, talked_grandpa, star_1
 */
(function () {
  'use strict';

  var g = Game.mapkit.grid(12, 9, 'f');
  g.hline(0, 0, 12, 'W'); g.hline(0, 1, 12, 'B');
  g.vline(0, 2, 7, '#'); g.vline(11, 2, 7, '#');
  g.hline(0, 8, 12, '#'); g.set(5, 8, 'f'); g.set(6, 8, 'f');
  g.rect(4, 3, 4, 3, 'R');

  var PART_FLAGS = ['got_oil', 'got_lens', 'got_flint'];
  function partsCount(S) { return PART_FLAGS.filter(function (f) { return S.flag(f); }).length; }

  Game.maps.register({
    id: 'house', name: 'ミオの いえ', indoor: true,
    bg: '#120c18',
    legend: { f: 'floor', W: 'wall', B: 'wallb', '#': 'void', R: 'rug' },
    ground: g.rows(),
    bgm: 'home', ambient: ['indoor'], tint: 'none',

    props: [
      { type: 'hearth', x: 1, y: 1 }, { type: 'cupboard', x: 3, y: 1 },
      { type: 'window', x: 4, y: 0 }, { type: 'clock', x: 5, y: 0 },
      { type: 'stove', x: 6, y: 1 }, { type: 'window', x: 8, y: 0 },
      { type: 'shelf', x: 10, y: 1 },
      { type: 'table', x: 5, y: 4 }, { type: 'chair', x: 4, y: 4 }, { type: 'chair', x: 7, y: 4 },
      { type: 'bed_grandpa', x: 9, y: 2 }, { type: 'bed', x: 1, y: 3 },
      { type: 'plant', x: 10, y: 7 },
      { type: 'mat', x: 5, y: 7 }, { type: 'mat', x: 6, y: 7 }
    ],

    events: [
      /* ---- プロローグ ---- */
      {
        id: 'prologue', x: 6, y: 5, trigger: 'auto', pages: [{
          if: { not: 'intro_done' },
          run: async function (S) {
            Game.gfx.setFade(1, '#000000');
            S.ambient(['sea', 'night']);
            await S.wait(50);
            await S.narrate(['しおかぜむらの ゆうぐれ。', 'うみから ふかい きりが やってきた。', 'とうだいの あかりは あさから きえたまま。'], { y: 48 });
            S.ambient(['indoor']);
            S.bgm('home');
            await S.wait(20);
            await S.fade('in', 40);
            await S.wait(24);
            S.face('mother', 'player');
            await S.emote('mother', '!');
            await S.say(['ミオ…。 おとうさんの ふね、 まだ もどらないの。', 'おじいちゃんが ミオを よんでいたわ。\nはなしを きいてあげて。'], 'おかあさん');
            S.set('intro_done');
          }
        }]
      },

      /* ---- おかあさん ---- */
      {
        id: 'mother', name: 'おかあさん', x: 6, y: 2, sprite: 'mother', dir: 'up', pages: [
          {
            if: { flag: 'cleared' }, run: async function (S) {
              await S.say(['おかえり、 ミオ。', 'おとうさんも おじいちゃんも ぶじで…\nほんとうに よかった。', 'さあ、 ごはんに しましょう。']);
            }
          },
          { if: { flag: 'lamp_lit' }, hidden: true },
          {
            if: { all: [{ flag: 'got_oil' }, { flag: 'got_lens' }, { flag: 'got_flint' }] }, run: async function (S) {
              await S.say(['…とうだいへ いくのね。', 'おかあさんは ここで まっているわ。\nぜったい むりは しないで。']);
            }
          },
          {
            if: { fn: function (S) { return partsCount(S) > 0; } }, run: async function (S) {
              await S.say(['ずいぶん がんばっているのね。', 'ちゃんと ごはんは たべてね。\nあとで おにぎりを つくっておくわ。']);
            }
          },
          {
            if: { flag: 'talked_grandpa' }, run: async function (S) {
              await S.say(['きを つけてね。', 'あぶないと おもったら、 すぐ もどってらっしゃい。']);
            }
          },
          {
            run: async function (S) {
              await S.say('おじいちゃんが おくで まっているわ。\nはなしを きいてあげて。');
            }
          }
        ]
      },

      /* ---- おじいちゃん（ベッド） ---- */
      {
        id: 'grandpa', name: 'おじいちゃん', x: 9, y: 2, h: 2, trigger: 'talk', pages: [
          {
            if: { flag: 'cleared' }, run: async function (S) {
              await S.say(['ひかりは ここからも みえたぞ。', 'ふねは もどった。 …ミオ、\nおまえは わしの じまんだ。']);
            }
          },
          {
            if: { flag: 'lamp_lit' }, run: async function (S) {
              await S.say('あかりが みえた…。 ありがとうな、 ミオ。');
            }
          },
          {
            if: { all: [{ flag: 'got_oil' }, { flag: 'got_lens' }, { flag: 'got_flint' }] }, run: async function (S) {
              await S.say(['そろったか。 とうだいは むらの\nきたひがしの がけの うえだ。', 'あとは ひを ともすだけだ。\nたのんだぞ。']);
            }
          },
          {
            if: { flag: 'talked_grandpa' }, run: async function (S) {
              var n = partsCount(S);
              if (n === 0) {
                await S.say(['わからなく なったら、 めもを みろ。', 'もりの ガラスこうぼう、 みなとの そうこ、\nそれから ほらあなだ。']);
              } else {
                await S.say(['ほう、 もう ' + n + 'つ そろえたか。', 'のこりも きっと だいじょうぶだ。\nあせらずに いけ。']);
              }
            }
          },
          {
            run: async function (S) {
              await S.say(['…ミオか。 すまんな、 こんな かっこうで。',
                'あしを いためてしまった。\nとうだいの かいだんは のぼれん。',
                'あさから、 とうだいの あかりが\nきえたままだ。',
                'あれが ともらんと、 ふねは\nみなとが わからん。',
                'おとうさんの ふねも まだ もどらん。']);
              var i = await S.ask('…たのめるか、 ミオ。', ['まかせて！', '…こわいよ']);
              if (i === 0) {
                await S.say('…たのもしいな。 それでこそ わしの まごだ。');
              } else {
                await S.say(['こわいのは あたりまえだ。\nだから ひを ともしに いくんだ。', 'むらには ゲンも ハルも おる。\nひとりでは ない。']);
              }
              await S.say(['ひを ともすには みっつ いる。\nレンズと、 あぶらと、 ひうちいしだ。',
                'レンズは ガラスこうぼうの ハルに\nあずけてある。',
                'あぶらは みなとの そうこだ。\nゲンに きけば わかる。',
                'ひうちいしは… わしが わかい ころ、\nもりの ほらあなに かくした。']);
              await S.give('lh_key', { text: 'ミオは とうだいの かぎを てにいれた！' });
              await S.say('それと、 ランプだ。 ほらあなは くらいぞ。');
              await S.give('lantern');
              await S.say('わすれたら この めもを みるといい。');
              await S.give('memo');
              await S.say('きを つけてな、 ミオ。');
              S.set('talked_grandpa');
            }
          }
        ]
      },

      /* ---- 調べるもの ---- */
      {
        id: 'ob_window', x: 4, y: 1, trigger: 'talk', run: async function (S) {
          await S.say('そとは すっかり きりに つつまれている。\nとうだいの ほうは なにも みえない。', null);
        }
      },
      {
        id: 'ob_clock', x: 5, y: 1, trigger: 'talk', run: async function (S) {
          await S.say('ふるい はしらどけいが、\nゆっくり じかんを きざんでいる。', null);
        }
      },
      {
        id: 'ob_hearth', x: 1, y: 1, w: 2, trigger: 'talk', run: async function (S) {
          S.sfx('step_wood', { rate: 1.2 });
          await S.say('ぱちぱちと ひが はぜている。\nそばに いると あたたかい。', null);
        }
      },
      {
        id: 'ob_cupboard', x: 3, y: 1, trigger: 'talk', run: async function (S) {
          await S.say('おさらや コップが ならんでいる。', null);
        }
      },
      {
        id: 'ob_stove', x: 7, y: 1, trigger: 'talk', run: async function (S) {
          await S.say('なべが ことことと にえている。\nいい においが する。', null);
        }
      },
      {
        id: 'ob_shelf', x: 10, y: 1, trigger: 'talk', run: async function (S) {
          await S.say('うみの ほんが たくさん ならんでいる。\nどれも おじいちゃんの ものだ。', null);
        }
      },
      {
        id: 'ob_table', x: 5, y: 4, w: 2, trigger: 'talk', run: async function (S) {
          await S.say('ばんごはんが ならんでいる。\n…まだ だれも てを つけていない。', null);
        }
      },
      {
        id: 'ob_bed', x: 1, y: 3, h: 2, trigger: 'talk', run: async function (S) {
          await S.say('ミオの ベッド。\nいまは ねている ばあいじゃ ない。', null);
        }
      },
      {
        id: 'ob_plant', x: 10, y: 7, trigger: 'talk', pages: [
          {
            if: { not: 'star_1' }, run: async function (S) {
              await S.say('はちうえの つちの なかで\nなにかが ちいさく ひかっている。', null);
              S.sfx('star');
              Game.gfx.flash('#fff4b0', 20, 0.4);
              await S.wait(20);
              S.set('star_1');
              await S.say('ほしの かけらを みつけた！\n（' + S.count('star_') + ' / 5）', null);
            }
          },
          { run: async function (S) { await S.say('げんきな はっぱが ゆれている。', null); } }
        ]
      },

      /* ---- でぐち ---- */
      {
        id: 'exit', x: 5, y: 8, w: 2, zone: true, run: async function (S) {
          if (!S.flag('talked_grandpa')) {
            await S.say(['ミオ、 まって。', 'おじいちゃんの はなしを\nきいてからに しなさい。'], 'おかあさん');
            await S.move('player', 'u');
          } else {
            await S.warp('village', 5, 18, 'down', { sfx: 'door_open' });
          }
        }
      }
    ]
  });
})();
