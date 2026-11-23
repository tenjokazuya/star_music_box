/* きっさ ゆうやけ: 3章 — シノブとの出会いと、お守りの頼みごと */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.layer('cafe', 'ch3', {
    when: function (S) { return S.stage === 3; },
    npcs: [{
      id: 'shinobu', x: 4, y: 4, dir: 'left', look: 'shinobu',
      talk: async function (E) {
        if (!E.flag('shinobu_met')) {
          E.setFlag('shinobu_met');
          await E.say('シノブ', '......');
          await E.say('シノブ', '...あなたが ゲンゾウさんの まご。');
          await E.say('シノブ', 'わたしは シノブ。|キリガタニを はしっている。');
          await E.say('シノブ', 'ゴウを たおしたのね。|...キリガタニは きりの たに。みえない さきを よむ ちからが いる。');
          await E.say('シノブ', '...ひとつ たのんで いい?|じんじゃで だいじな おまもりを おとしたの。');
          await E.say('シノブ', 'みつけたら とどけて ほしい。|...わたしは キリガタニで まってる。');
          E.setFlag('shinobu_ask');
          return;
        }
        if (E.flag('shinobu_found') && !E.flag('shinobu_quest')) { await RR.Story.returnOmamori(E); return; }
        await E.say('シノブ', E.flag('shinobu_quest') ? '...ありがとう。キリガタニで まってる。' : '...おまもりは じんじゃの いしだたみの あたり だと おもう。');
      }
    }]
  });
  RR.Maps.layer('cafe', 'post', {
    when: function (S) { return S.stage >= 5 && S.flags.shinobu_quest; },
    npcs: [{ id: 'shinobu', x: 4, y: 4, dir: 'left', look: 'shinobu', talk: RR.MapKit.random('シノブ', ['...ここの コーヒーは ゲンゾウさんも すきだった らしい。', '...きりの ない よるも わるくない。']) }]
  });
})();
