/* glasshut.js — ガラスこうぼう（ハルばあさん、レンズの しあげ）
 * このマップのフラグ: haru_asked, got_glasses(forest で立つ), got_lens
 */
(function () {
  'use strict';

  var g = Game.mapkit.grid(10, 9, 'f');
  g.rect(0, 0, 10, 1, 'W'); g.rect(0, 1, 10, 1, 'B');
  g.vline(0, 2, 7, '#'); g.vline(9, 2, 7, '#');
  g.hline(0, 8, 10, '#'); g.set(4, 8, 'f');
  g.rect(3, 4, 4, 2, 'R');

  Game.maps.register({
    id: 'glasshut', name: 'ガラスこうぼう', indoor: true,
    bg: '#120c18',
    legend: { f: 'floor', W: 'wall', B: 'wallb', '#': 'void', R: 'rug' },
    ground: g.rows(),
    bgm: 'home', ambient: ['indoor'], tint: 'none',

    props: [
      { type: 'kiln', x: 1, y: 1 }, { type: 'window', x: 4, y: 0 },
      { type: 'glassware', x: 3, y: 1 }, { type: 'glassware', x: 6, y: 1 },
      { type: 'workbench', x: 7, y: 1 }, { type: 'window', x: 8, y: 0 },
      { type: 'table_s', x: 8, y: 5 }, { type: 'chair', x: 7, y: 5 },
      { type: 'plant', x: 1, y: 6 }, { type: 'mat', x: 4, y: 7 }
    ],

    events: [
      { id: 'exit', x: 4, y: 8, zone: true, run: async function (S) { await S.warp('forest', 21, 20, 'down', { sfx: 'door_open' }); } },

      {
        id: 'haru', name: 'ハルばあさん', x: 5, y: 3, sprite: 'haru', dir: 'down', pages: [
          {
            if: { flag: 'cleared' }, sprite: 'haru_g', run: async function (S) {
              await S.say(['ひかりは よく とどいたでしょう。', 'わたしの レンズも ほこらしげ だったわ。']);
            }
          },
          { if: { flag: 'got_lens' }, sprite: 'haru_g', run: async function (S) { await S.say(['レンズは だいじに つかっておくれ。', 'ミオちゃんなら ちゃんと ともせるわ。']); } },
          {
            if: { item: 'glasses' }, run: async function (S) {
              await S.say(['あら、 ミオちゃん。\nそれは…わたしの めがね！', 'みつけて くれたのね。 ありがとう。']);
              S.take('glasses');
              S.sfx('ok');
              S.ev('haru').sprite('haru_g');
              await S.wait(20);
              await S.say(['ああ、 よく みえる。\nミオちゃんの かおも はっきり。', 'さあ、 レンズを しあげましょう。\nちょっと まっててね。']);
              await S.fade('out', 24);
              S.sfx('glass');
              await S.wait(40);
              S.sfx('polish');
              await S.wait(50);
              S.sfx('polish');
              await S.wait(50);
              S.sfx('glass');
              Game.gfx.flash('#e8fbff', 30, 0.6);
              await S.fade('in', 30);
              await S.say('…できたわ。');
              S.set('lens_done');
              await S.give('lens', { text: 'ミオは レンズを てにいれた！\nひかりを あつめる、 きれいな レンズだ。' });
              S.set('got_lens');
              await S.say(['これを とうだいに はめるのね。\nおじいさんに よろしくね。', 'きを つけて いきなさい。']);
            }
          },
          {
            if: { flag: 'haru_asked' }, run: async function (S) {
              await S.say(['めがねが みつかれば、 すぐ しあがるのよ。', 'もりの きたの みちに ありそうな\nきが するのだけれど…']);
            }
          },
          {
            run: async function (S) {
              await S.say(['あら、 ミオちゃん？\nごめんなさいね、 ぼんやりして…', 'とうだいの レンズなら、 あとは\nしあげるだけ なのよ。']);
              await S.say(['でも めがねが ないと、\nこまかい ところが みえなくて。', 'さっき もりで ひとやすみ した ときに、\nとりが くわえて いってしまったの。', 'ぼうやが いうには、 きたの ほうの\nおおきな きの あたりらしいわ。\nおねがい できるかしら？']);
              S.set('haru_asked');
            }
          }
        ]
      },

      /* ---- 調べるもの ---- */
      { id: 'ob_kiln', x: 1, y: 1, w: 2, trigger: 'talk', run: async function (S) { await S.say('かまどの なかで ひが ゆらめいている。\nちかづくと あつい。', null); } },
      { id: 'ob_glass1', x: 3, y: 1, trigger: 'talk', run: async function (S) { await S.say('いろとりどりの ガラスの びんが\nならんでいる。', null); } },
      { id: 'ob_glass2', x: 6, y: 1, trigger: 'talk', run: async function (S) { await S.say('おさらや コップ。 どれも すきとおって\nきれいだ。', null); } },
      { id: 'ob_bench', x: 7, y: 1, w: 2, trigger: 'talk', run: async function (S) { await S.say('ガラスを ふくらます ながい くだが\nおいてある。', null); } },
      { id: 'ob_table', x: 8, y: 5, trigger: 'talk', run: async function (S) { await S.say('おちゃが ひとつ、 つめたく なっている。', null); } },
      {
        id: 'ob_plant', x: 1, y: 6, trigger: 'talk', run: async function (S) { await S.say('ガラスの はちに はいった みどり。', null); }
      }
    ]
  });
})();
