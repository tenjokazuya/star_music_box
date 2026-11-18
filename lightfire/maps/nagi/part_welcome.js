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
      if (nami && keeper) { g.place(nami, 23, 9, 'r'); g.face(keeper, 'l'); await g.wait(20); }
      await g.say('おじいちゃん!', 'ナミ');
      await g.say(['ナミ…。しんぱいを かけたな。', 'この ひとが とうだいの ひを ともして くれたんだ。'], 'とうだいもり');
      await g.say(['アカリおねえちゃん、ありがとう!', 'ヒダネも ありがとう!'], 'ナミ');
      await g.say(['うみを てらす ひかりが、とおくの そらまで のびていく。', 'あの ひかりは コトリの おおびと つながっている のだろうか。']);
      await g.say('つぎは ゆきやまの ほこらを めざそう。さかばの ダイさんに あいさつして いこう。');
    }
  });
})();
