/* キリハラ町: 全進行度で共通のNPC・看板・調べられる物 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  function vending(E) { return E.food('vending'); }
  RR.Maps.layer('town', 'base', {
    npcs: [
      { id: 'oldman', x: 7, y: 37, dir: 'down', look: 'oldman', wander: 1, talk: K.lines('おじいさん', ['わしが わかい ころは この みちも じゃりみち だった。', 'あんたの じいさん... ゲンゾウさんの コメットの おとは|とおくからでも わかったもんじゃ。', 'よるの とうげは しずかで いい。...はしりやが いなければ な。']) },
      { id: 'girl', x: 14, y: 39, dir: 'left', look: 'girl', wander: 2, talk: K.random('おんなのこ', ['ふんすいの みず つめたいよ!', 'よるに こうえんで あそぶの ないしょ なんだ。']) },
      { id: 'woman', x: 45, y: 19, dir: 'down', look: 'woman1', wander: 2, talk: K.random('おねえさん', ['ざっかやさんの ソファ、ほしいなあ。', 'この まちの よるは しずか だけど とうげは にぎやか なのよ。']) },
      { id: 'worker', x: 37, y: 30, dir: 'left', look: 'worker', talk: K.random('さぎょういん', ['ガソリンスタンドの ミオちゃん、ひとりで よく がんばってるよ。', 'スタンドで せんしゃの バイトが できるらしいぜ。']) },
      { id: 'monk', x: 8, y: 7, dir: 'down', look: 'monk', talk: K.lines('かんぬし', ['ここは キリハラじんじゃ。|とうげを はしる ものの あんぜんを いのる ばしょ です。', 'おまいりを していきなさい。']) },
      { id: 'boy', x: 22, y: 35, dir: 'up', look: 'boy', wander: 1, talk: K.random('おとこのこ', ['いつか オロチに のるのが ゆめ!', 'ガレージの おじさん こわそう だけど やさしいんだよ。']) }
    ],
    events: [
      { x: 22, y: 18, on: 'talk', run: vending }, { x: 23, y: 18, on: 'talk', run: vending }, { x: 40, y: 18, on: 'talk', run: vending },
      { x: 25, y: 17, on: 'talk', run: async function (E) { await E.msg('こうしゅう でんわだ。|かける あいては いない。'); } },
      { x: 4, y: 31, on: 'talk', run: async function (E) { await E.msg('ポストだ。|ゆうびんは まだ きていない。'); } },
      { x: 8, y: 17, on: 'talk', run: async function (E) { await E.msg('{y}キリハラ じんじゃ{w}|とうげの あんぜんを いのりましょう'); } },
      { x: 32, y: 4, on: 'talk', run: async function (E) { await E.msg('{y}↑ とうげみち{w}|ツヅラ / ヘビノセ / キリガタニ / ヤシャ'); } },
      { x: 32, y: 41, on: 'talk', run: async function (E) { await E.msg('{y}キリハラ バスてい{w}|さいしゅうびんは もう でてしまった。'); } },
      { x: 11, y: 37, w: 2, h: 2, on: 'talk', run: async function (E) { E.sfx('splash'); await E.msg('ふんすいの みずが つきあかりで ひかっている。'); } },
      {
        x: 6, y: 6, w: 2, on: 'talk', run: async function (E) {
          E.sfx('bubble');
          await E.wait(10);
          E.sfx('coin');
          await E.msg('さいせんを いれて てを あわせた。');
          await E.say('{N}', U_pray(E));
        }
      },
      { x: 52, y: 11, on: 'talk', run: async function (E) { await E.msg('ここは だれかの いえ だ。|かぎが かかっている。'); } },
      { x: 23, y: 31, on: 'talk', run: async function (E) { await E.msg('となりの いえ だ。|へやの あかりが ついている。'); } }
    ]
  });
  function U_pray(E) {
    var list = ['...みんなが ぶじに はしれますように。', '...じいちゃん、みててね。', '...あしたも はれますように。'];
    return list[Math.min(list.length - 1, E.num('pray'))] + (E.addNum('pray'), '');
  }
})();
