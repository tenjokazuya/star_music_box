/* harbor.js — みなと（ゲンさん、そうこの かぎ、エンディングの場面）
 * このマップのフラグ: gen_asked, got_store_key, store_open, star_3
 * エンディング: lamp_lit が立っていて cleared が立っていないとき、入場時に ending_scene が走る
 */
(function () {
  'use strict';

  var W = 30, H = 17;
  var g = Game.mapkit.grid(W, H, 'g');
  g.rect(0, 5, 30, 5, 's');
  g.rect(0, 10, 30, 7, 'w'); g.rect(0, 13, 30, 4, 'D');
  g.rect(26, 5, 4, 5, 'w');
  g.rect(0, 7, 26, 2, 'd');
  g.vline(5, 5, 2, 'd');
  g.rect(11, 9, 3, 5, 'p');
  g.rect(20, 9, 2, 3, 'p');
  g.scatter('f', 14, 3, { on: 'g' });
  g.rect(22, 0, 7, 5, 'g');

  var o = Game.mapkit.grid(W, H, '.');
  o.rect(0, 0, 30, 1, 'T'); o.rect(0, 1, 1, 4, 'T'); o.rect(29, 1, 1, 4, 'T');
  o.rect(1, 1, 3, 1, 'T'); o.rect(8, 1, 14, 1, 'T'); o.rect(10, 2, 12, 1, 'T'); o.rect(14, 3, 8, 1, 'T');
  o.rect(23, 1, 1, 3, 'T'); o.rect(25, 4, 4, 1, 'T');
  o.cellsAt([[24, 1], [26, 1], [28, 1], [25, 3], [27, 3]], 'B');
  o.cellsAt([[3, 4], [8, 4]], 'X');
  o.cellsAt([[3, 3], [9, 3]], 'N');
  o.set(3, 2, 'X'); o.set(10, 4, 'B'); o.set(11, 4, 'B');
  o.cellsAt([[9, 6], [18, 6], [24, 6]], 'L');
  o.set(6, 6, 'U'); o.set(10, 9, 'P'); o.set(14, 9, 'P'); o.set(19, 9, 'P'); o.set(22, 9, 'P');
  o.set(8, 5, 'Q'); o.set(13, 6, 'S'); o.set(22, 5, 'Y');
  g.cells.forEach(function (row, y) { row.forEach(function (c, x) { if ((c === 'd' || c === 'w' || c === 'D') && o.cells[y][x] !== '.' && o.cells[y][x] !== 'P') { o.cells[y][x] = '.'; } }); });

  function hasAllParts(S) { return S.flag('got_oil') && S.flag('got_lens') && S.flag('got_flint'); }
  var ENDING = { all: [{ flag: 'lamp_lit' }, { not: 'cleared' }] };
  var FOG = { dusk: 0.1, evening: 0.18, night: 0.26, deep: 0.3, dawn: 0.05, day: 0 };

  /* ================= エンディングの場面 ================= */
  async function endingScene(S) {
    await S.fade('in', 60);
    S.bgm('ending', { fade: 1.5 });
    S.ambient(['sea', 'gull']);
    await S.wait(40);
    await S.pan(15, 10, 0.05);
    await S.wait(60);
    await S.say(['…みえるか、 ミオ。', 'あの ひかりが、 うみを なでているぞ。'], 'ゲンさん');
    await S.say('ふねも きっと みている。', 'ゲンさん');
    S.sfx('horn_far');
    await S.wait(150);
    await S.say('…ボーッ。', null);
    S.sfx('horn');
    S.ev('fboat').show();
    await S.wait(30);
    var fb = S.move('fboat', 'llllllllllll', { speed: 0.8 });
    await S.wait(150);
    await S.say('あれは…！', 'ココ');
    await fb;
    S.sfx('horn');
    await S.wait(40);
    // おとうさんが ふなばしへ
    var father = S.ev('father');
    father.setPos(14, 12); father.show(); father.face('left');
    await S.wait(20);
    await S.move('father', 'luuuu', { speed: 1 });
    await S.unpan();
    await S.say('ただいま、 ミオ。', 'おとうさん');
    S.face('player', 'right');
    S.move('mother', 'r', { speed: 1.4 });
    await S.wait(30);
    await S.say(['あの ひかりが みえた。\nきりの なかでも、 まよわずに すんだ。', 'いったい だれが ともして くれたんだ？'], 'おとうさん');
    await S.say('ミオだ。 むらじゅうを かけまわって、\nとうだいまで やりとげた。', 'ゲンさん');
    await S.say('…ミオが。', 'おとうさん');
    await S.say('あなた…！ ぶじで…', 'おかあさん');
    var i = await S.ask('…ミオ。', ['おかえり！', '…こわかった']);
    if (i === 0) { await S.say('ああ、 ただいま。', 'おとうさん'); }
    else { await S.say(['すまなかった。 もう だいじょうぶだ。', 'ミオが、 ひを ともして くれたからな。'], 'おとうさん'); }
    S.move('grandpa', 'rr', { speed: 0.7 });
    await S.wait(60);
    await S.say(['…わしは なにも しとらん。', 'ミオが、 むらの みんなと ともした ひだ。\nひとりでは ない。'], 'おじいちゃん');
    await S.say('いい ひだったな。', 'ゲンさん');
    await S.say(['ミオ、 ありがとう。', 'おとうさんは ほこらしいぞ。'], 'おとうさん');
    await S.wait(30);
    S.flash('#fff6d0', 40, 0.35);
    if (S.count('star_') >= 5) {
      await S.say('ふと そらを みあげると、\nあさの そらに ほしが ひとつ ひかっていた。', null);
    }
    await S.fade('out', 50, '#000000');
    S.stopBgm(1.2);
    await S.narrate(['こうして、 しおかぜむらに あさが きた。', 'とうだいの あかりは、', 'これからも みなとを まもりつづける。'], { y: 52 });
    S.set('cleared');
    await S.ending();
  }

  Game.maps.register({
    id: 'harbor', name: 'みなと',
    legend: { g: 'grass', f: 'grass_f', s: 'sand', d: 'dirt', w: 'water', D: 'deep', p: 'plank' },
    ground: g.rows(),
    objLegend: { T: 'tree', B: 'bush', R: 'rock', L: 'lamppost', S: 'sign', X: 'crate', N: 'net', U: 'buoy', P: 'post', Q: 'barrel', Y: 'barrel' },
    objects: o.rows(),
    bgm: 'harbor', ambient: ['sea', 'gull'],
    fx: ['seaglint'],
    beam: { x: 9, y: -6 },
    fog: function () { return FOG[Game.field.timeOfDay()] || 0; },
    windowLights: [],

    props: [
      { type: 'hut', x: 4, y: 1 },
      { type: 'rowboat', x: 14, y: 11 },
      { type: 'rowboat', x: 1, y: 6 },
      { type: 'rowboat', x: 23, y: 11 }
    ],

    events: [
      /* ---- 出入口 ---- */
      { id: 'to_village', x: 0, y: 7, h: 2, warp: { map: 'village', x: 28, y: 12, dir: 'left', sfx: 'step_grass' } },
      {
        id: 'store_door', x: 5, y: 4, solid: true, trigger: 'touch', run: async function (S) {
          if (S.flag('store_open')) {
            await S.warp('storehouse', 4, 8, 'up', { sfx: 'door_open' });
          } else if (S.has('store_key')) {
            await S.say('そうこの かぎを つかう。', null);
            S.sfx('set_item'); await S.wait(16); S.sfx('door_open'); await S.wait(10);
            S.set('store_open');
            await S.say('…かちゃり。 とびらが ひらいた。', null);
            await S.warp('storehouse', 4, 8, 'up', { sfx: 'door_open' });
          } else {
            await S.say('そうこの とびらは かぎが かかっている。', null);
          }
        }
      },

      /* ---- ゲンさん ---- */
      {
        id: 'gen', name: 'ゲンさん', x: 12, y: 12, sprite: 'gen', dir: 'right', pages: [
          { if: ENDING, x: 12, y: 13, dir: 'right', run: async function (S) { await S.say('…ミオを みなさい。 りっぱな もんだ。'); } },
          {
            if: { flag: 'cleared' }, x: 12, y: 12, run: async function (S) {
              await S.say(['…いい ひかりだった。', 'うみの おとこは あの ひを わすれん。\nありがとうな、 ミオ。']);
            }
          },
          {
            if: { flag: 'got_oil' }, run: async function (S) {
              await S.say(['あぶらは もう もっていったか。', 'とうだいの ひを、 たのんだぞ。']);
            }
          },
          {
            if: { flag: 'got_store_key' }, run: async function (S) {
              await S.say(['かぎは みつかったか。 そうこは\nむこうの ちいさい いえだ。', 'あぶらだるは おくに ある。\nはこが じゃまを して いるはずだ。', 'おして どかせば いい。']);
            }
          },
          {
            if: { flag: 'gen_asked' }, run: async function (S) {
              await S.say(['かぎは すなはまの どこかだ。', 'さっき ころんだ ときに おとした。\nきらっと ひかる ものを さがせ。']);
            }
          },
          {
            run: async function (S) {
              await S.say(['…ミオか。 とうだいの ひは まだだな。']);
              var i = await S.ask('…どうした。', ['あぶらを もらいに きたの', 'なんでもない']);
              if (i === 1) { await S.say('そうか。 むりは するな。'); return; }
              await S.say(['あぶらか。 そうこに ある。', '…だが、 そうこの かぎを なくした。', 'すなはまで ころんだ ときに\nおとしたらしい。', 'すまんが さがして きて くれんか。']);
              S.set('gen_asked');
            }
          }
        ]
      },

      /* ---- ほかの ひと・どうぶつ ---- */
      {
        id: 'sailor', name: 'ふなのり', x: 18, y: 8, sprite: 'v_sailor', dir: 'down', pages: [
          { if: ENDING, hidden: true },
          { if: { flag: 'cleared' }, run: async function (S) { await S.say(['…あさだ。', 'ひさしぶりに いい あさだ。']); } },
          { run: async function (S) { await S.say(['きりが ふかくて ふねを だせん。', 'ゲンさんも ずっと うみを みてる。']); } }
        ]
      },
      {
        id: 'crab', x: 4, y: 9, sprite: 'crab', dir: 'left', wander: { radius: 1 }, noShadow: true, run: async function (S) {
          await S.emote('crab', '!');
          await S.say('かにが はさみを ふりあげた！\nすぐに すなの なかに もぐっていった。', null);
        }
      },
      {
        id: 'gull', x: 14, y: 9, sprite: 'gull', dir: 'left', noShadow: true, pages: [{
          run: async function (S) {
            S.sfx('emote');
            await S.say('かもめが こちらを じっと みている。', null);
            S.ev('gull').hide();
            S.sfx('splash', { vol: 0.3 });
            await S.say('…はばたいて とんでいった。', null);
          }
        }]
      },

      /* ---- 調べるもの ---- */
      {
        id: 'sign', x: 13, y: 6, trigger: 'talk', run: async function (S) { await S.say('みなと\nふねの のりば', null); }
      },
      { id: 'crates', x: 3, y: 3, trigger: 'talk', run: async function (S) { await S.say('つみあげた はこ。 さかなの においが する。', null); } },
      { id: 'crate2', x: 3, y: 2, trigger: 'talk', run: async function (S) { await S.say('おもくて びくともしない。', null); } },
      { id: 'barrel', x: 8, y: 4, trigger: 'talk', run: async function (S) { await S.say('しおづけの さかなが はいっている。', null); } },
      { id: 'net', x: 9, y: 3, trigger: 'talk', run: async function (S) { await S.say('ほしてある あみ。 まだ すこし ぬれている。', null); } },
      { id: 'buoy', x: 6, y: 6, trigger: 'talk', run: async function (S) { await S.say('あかい うき。', null); } },
      { id: 'barrel2', x: 8, y: 5, trigger: 'talk', run: async function (S) { await S.say('あめみずが たまっている。', null); } },
      { id: 'boat1', x: 14, y: 11, w: 2, trigger: 'talk', run: async function (S) { await S.say('ゲンさんの ふね。 ゆらゆらと ゆれている。', null); } },
      { id: 'boat2', x: 1, y: 6, w: 2, trigger: 'talk', run: async function (S) { await S.say('はまに あげられた ふるい ふね。', null); } },

      {
        id: 'key_spot', x: 2, y: 9, sparkle: true, trigger: 'talk', pages: [{
          if: { all: [{ flag: 'gen_asked' }, { not: 'got_store_key' }] }, run: async function (S) {
            S.sfx('sparkle');
            await S.say('すなの なかで なにかが ひかっている。', null);
            S.set('got_store_key');
            await S.give('store_key');
          }
        }]
      },
      {
        id: 'star3_spot', x: 28, y: 2, sparkle: true, trigger: 'talk', pages: [{
          if: { not: 'star_3' }, run: async function (S) {
            S.sfx('star'); Game.gfx.flash('#fff4b0', 20, 0.4);
            await S.wait(16);
            S.set('star_3');
            await S.say('ほしの かけらを みつけた！\n（' + S.count('star_') + ' / 5）', null);
          }
        }]
      },

      /* ---- エンディングの ようす ---- */
      { id: 'fboat', x: 26, y: 12, sprite: 'fishing_boat', dir: 'left', noShadow: true, solid: false, pages: [{ hidden: true }] },
      {
        id: 'father', name: 'おとうさん', x: 14, y: 12, sprite: 'father', dir: 'left', pages: [
          {
            if: { flag: 'cleared' }, x: 13, y: 10, dir: 'down', run: async function (S) {
              await S.say(['ただいま、 ミオ。', 'とうだいの ひは、 ほんとうに よく みえたぞ。']);
            }
          },
          { hidden: true }
        ]
      },
      {
        id: 'mother', name: 'おかあさん', x: 10, y: 8, sprite: 'mother', dir: 'right', pages: [
          { if: ENDING, run: async function (S) { await S.say('ミオ…。'); } },
          { hidden: true }
        ]
      },
      {
        id: 'grandpa', name: 'おじいちゃん', x: 8, y: 8, sprite: 'grandpa', dir: 'right', pages: [
          { if: ENDING, run: async function (S) { await S.say('…ふむ。'); } },
          { hidden: true }
        ]
      },
      {
        id: 'e_coco', name: 'ココ', x: 10, y: 7, sprite: 'coco', dir: 'right', pages: [
          { if: ENDING, run: async function (S) { await S.say('みて、 ミオ！ ふねが…！'); } },
          { hidden: true }
        ]
      },
      {
        id: 'e_woman', name: 'おばあさん', x: 8, y: 7, sprite: 'v_old', dir: 'right', pages: [
          { if: ENDING, run: async function (S) { await S.say('ああ、 よかった、 よかった…。'); } },
          { hidden: true }
        ]
      },
      {
        id: 'e_man', name: 'むらの おじさん', x: 7, y: 7, sprite: 'v_man', dir: 'right', pages: [
          { if: ENDING, run: async function (S) { await S.say('ミオが やりとげたんだ！'); } },
          { hidden: true }
        ]
      },
      {
        id: 'e_boy', name: 'おとこのこ', x: 7, y: 8, sprite: 'v_boy', dir: 'right', pages: [
          { if: ENDING, run: async function (S) { await S.say('すごいや、 ミオ！'); } },
          { hidden: true }
        ]
      },

      /* ---- エンディングの はじまり ---- */
      {
        id: 'ending_scene', x: 12, y: 8, trigger: 'auto', pages: [{ if: ENDING, run: endingScene }]
      }
    ]
  });
})();
