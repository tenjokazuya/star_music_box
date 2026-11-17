/* forest.js — もりの みち（ガラスこうぼうへの道、ほらあなの入口、めがねの場所、タケ）
 * このマップのフラグ: rock_moved, haru_asked(ガラスこうぼう側で立つ), got_glasses, star_4
 */
(function () {
  'use strict';

  var W = 26, H = 30;
  var g = Game.mapkit.grid(W, H, 'g');
  g.scatter('t', 90, 21, { on: 'g' });
  // 道
  g.rect(12, 4, 2, 26, 'd');          // まんなかの道（南から北）
  g.rect(12, 20, 10, 2, 'd');         // ガラスこうぼうへ（東）
  g.rect(4, 11, 10, 2, 'd');          // 西の枝
  g.rect(4, 8, 2, 3, 'd');            // ほらあなへ
  g.rect(3, 6, 4, 2, 'd');            // ほらあなの前
  g.rect(2, 12, 2, 5, 'd');           // 西のゆきどまり（ほしの かけら）
  g.rect(12, 4, 11, 2, 'd');          // 北の枝（めがね）
  g.rect(21, 20, 1, 1, 'd');
  // 岩山とほらあなの入口
  g.rect(3, 2, 4, 4, 'C'); g.set(4, 5, 'e');

  var protectedCells = {};
  function protect(x, y) { protectedCells[x + ',' + y] = true; }
  // 木をおかない場所
  [[4, 6], [3, 6], [5, 6], [2, 16], [22, 4], [11, 24], [11, 23], [12, 27], [10, 24]].forEach(function (p) { protect(p[0], p[1]); });

  var o = Game.mapkit.grid(W, H, '.');
  var rnd = Game.util.rng(404);
  function nearPath(x, y) {
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var c = g.get(x + dx, y + dy);
        if (c === 'd' || c === 'e') { return true; }
      }
    }
    return false;
  }
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var c = g.get(x, y);
      if (c === 'd' || c === 'C' || c === 'e') { continue; }
      var border = x < 2 || y < 2 || x > W - 3 || y > H - 3;
      if (protectedCells[x + ',' + y]) { continue; }
      if (border) { o.set(x, y, rnd() < 0.5 ? 'P' : 'T'); continue; }
      if (nearPath(x, y)) {
        if (rnd() < 0.10) { o.set(x, y, rnd() < 0.5 ? 'B' : 'R'); }
        continue;
      }
      var r = rnd();
      if (r < 0.62) { o.set(x, y, r < 0.35 ? 'T' : 'P'); }
      else if (r < 0.70) { o.set(x, y, 'B'); }
    }
  }
  // 小屋（20〜23, 16〜19）のまわりをあける
  for (var yy = 15; yy <= 20; yy++) { for (var xx = 19; xx <= 24; xx++) { if (yy >= 15 && !(yy >= 16 && yy <= 19 && xx >= 20 && xx <= 23)) { o.set(xx, yy, '.'); } else { o.set(xx, yy, '.'); } } }
  // 出入口のまわり
  o.rect(12, 28, 2, 2, '.');

  function tintDark() {
    var t = Game.field.TOD[Game.field.timeOfDay()];
    return [t[0] * 0.86, t[1] * 0.9, t[2] * 0.94];
  }

  Game.maps.register({
    id: 'forest', name: 'もりの みち',
    legend: { g: 'grass', t: 'grass_t', d: 'dirt', C: 'cliff', e: 'cave_door' },
    ground: g.rows(),
    objLegend: { T: 'tree_dark', P: 'pine', B: 'bush', R: 'rock' },
    objects: o.rows(),
    bgm: 'forest', ambient: ['forest', 'night'],
    fx: ['fireflies', 'leaves'],
    tint: tintDark,
    props: [{ type: 'hut', x: 20, y: 16 }],

    reactions: [
      {
        id: 'rock', once: 'rock_moved',
        if: { fn: function (S) { var b = S.ev('boulder'); return b.x !== 4 || b.y !== 6; } },
        run: async function (S) {
          S.sfx('thump');
          await S.say('ごろり…。 いわが うごいた！\nほらあなの いりぐちが ひらいた。', null);
        }
      }
    ],

    events: [
      /* ---- 出入口 ---- */
      { id: 'to_village', x: 12, y: 29, w: 2, warp: { map: 'village', x: 14, y: 1, dir: 'down', sfx: 'step_grass' } },
      { id: 'to_hut', x: 21, y: 19, warp: { map: 'glasshut', x: 4, y: 7, dir: 'up', sfx: 'door_open' } },
      { id: 'to_cave', x: 4, y: 5, warp: { map: 'cave', x: 5, y: 12, dir: 'up', sfx: 'step_cave' } },

      /* ---- ほらあなの いり口をふさぐ岩 ---- */
      {
        id: 'boulder', x: 4, y: 6, sprite: 'boulder', push: true, pages: [
          { if: 'rock_moved', x: 3, y: 6, push: false },
          { push: true }
        ]
      },
      {
        id: 'boulder_look', x: 4, y: 6, trigger: 'talk', pages: [
          { if: 'rock_moved', hidden: true },
          { run: async function (S) { await S.say('おおきな いわが ほらあなの いりぐちを\nふさいでいる。', null); } }
        ]
      },

      /* ---- タケ ---- */
      {
        id: 'take', name: 'タケ', x: 11, y: 25, sprite: 'take', dir: 'right', wander: { radius: 1 }, pages: [
          { if: { flag: 'cleared' }, run: async function (S) { await S.say(['あさの もりは きもちいいや。', 'ホタルも まだ すこし のこってる！']); } },
          {
            if: { all: [{ flag: 'haru_asked' }, { not: 'got_glasses' }] }, run: async function (S) {
              await S.say(['ハルばあさんの めがね？\nしってる しってる！', 'おおきな とりが くわえて、\nきたの ほうへ とんでいったんだ。', 'きたの みちの いきどまりに、\nおおきな きが あるよ。']);
            }
          },
          {
            if: { flag: 'rock_moved' }, run: async function (S) {
              await S.say(['ほらあなの いわ、 うごかせたの！？\nミオ、 ちからもち だね。', 'なかは まっくらだよ。 ランプを わすれずにね。']);
            }
          },
          {
            if: { flag: 'talked_grandpa' }, run: async function (S) {
              await S.say(['ホタルを さがしてたら、\nひが くれちゃった。', 'ミオも ひとりで もりに きたの？', 'ほらあなの いりぐちには おおきな いわが あるよ。\nよこから おしたら うごくかも。']);
            }
          },
          { run: async function (S) { await S.say('ホタルを さがしてるんだ。'); } }
        ]
      },

      /* ---- かんばん・調べるもの ---- */
      {
        id: 'sign', x: 11, y: 23, trigger: 'talk', run: async function (S) {
          await S.say(['ひがし: ガラスこうぼう', 'にし: ほらあな（きけん）\nきた: いきどまり'], null);
        }
      },
      {
        id: 'star4_spot', x: 2, y: 16, sparkle: true, trigger: 'talk', pages: [{
          if: { not: 'star_4' }, run: async function (S) {
            S.sfx('star'); Game.gfx.flash('#fff4b0', 20, 0.4);
            await S.wait(16);
            S.set('star_4');
            await S.say('ほしの かけらを みつけた！\n（' + S.count('star_') + ' / 5）', null);
          }
        }]
      },
      {
        id: 'glasses_spot', x: 22, y: 4, sparkle: true, trigger: 'talk', pages: [{
          if: { all: [{ flag: 'haru_asked' }, { not: 'got_glasses' }] }, run: async function (S) {
            S.sfx('sparkle');
            await S.say('おおきな きの ねもとに、\nなにかが ひかっている。', null);
            S.set('got_glasses');
            await S.give('glasses', { text: 'めがねを みつけた！\nとりが おとして いったらしい。' });
          }
        }]
      }
    ]
  });
})();
