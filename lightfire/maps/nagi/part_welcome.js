/* nagi / 灯台を 解放した直後: 桟橋で 出迎える（ch>=3 になった最初の入場で一度だけ） */
(function () {
  'use strict';
  PF.maps.part('nagi', 'welcome', {
    when: { flag: 'c2.cleared', not: 'c2.welcome' },
    onEnter: async function (g) {
      g.set('c2.welcome');
      g.bgm('hope');
      await g.say('さんばしに ひとが あつまっている。');
      var nami = g.npc('nami'), keeper = g.npc('keeper');
      if (nami && keeper) { g.place(nami, 23, 9, 'r'); g.place(keeper, 24, 8, 'l'); await g.wait(20); }
      await g.say('おじいちゃん!', 'ナミ');
      await g.say(['ナミ…。しんぱいを かけたな。', 'この ひとが とうだいの ひを ともして くれたんだ。'], 'とうだいもり');
      await g.say(['アカリおねえちゃん、ありがとう!', 'ヒダネも ありがとう!'], 'ナミ');
      await g.say(['うみを てらす ひかりが、とおくの そらまで のびていく。', 'あの ひかりは コトリの おおびと つながっている のだろうか。']);
      await g.say('つぎは ゆきやまの ほこらを めざそう。さかばの ダイさんに あいさつして いこう。');
      // 桟橋は 2マス幅。ふたりが 桟橋に立ったままだと 灯台から町へ戻れなくなる（詰み防止）。町側へ 歩いて どく
      if (keeper) { await g.walkTo(keeper, 22, 10, { dur: 12 }); g.face(keeper, 'r'); }
      if (nami) { await g.walkTo(nami, 21, 10, { dur: 12 }); g.face(nami, 'u'); }
    }
  });
})();
