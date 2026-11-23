/* キリハラ町: クリア後 — 町の反応と旧道のうわさ */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('town', 'post', {
    when: function (S) { return S.stage >= 5; },
    npcs: [
      { id: 'fan1', x: 26, y: 22, dir: 'down', look: 'man1', talk: K.random('おとこ', ['きいたよ! ヌシに かったんだって!', 'こんどの まつりで コメットを かざりたいって はなしが でてるらしい。']) },
      { id: 'rumor', x: 10, y: 9, dir: 'down', look: 'man3', talk: K.lines('はしりや', ['じんじゃの うらの きゅうどう、さくが はずされたんだ。', 'よなかに しろい くるまが はしってる って うわさ だぜ。|ゴーストだって いう やつも いる。']) },
      { id: 'kurosawa_town', x: 24, y: 19, dir: 'down', look: 'kurosawa', when: function (S) { return !S.flags.hayami_beaten; }, talk: K.lines('クロサワ', [['...ここで あうとは な。', 'ゲンゾウには むかし もうひとり ライバルが いた。|ハヤミという おとこだ。', 'まちを でた はずだが... きゅうどうの うわさが ほんとう なら。'], '...きゅうどうは じんじゃの うらから いける。']) }
    ]
  });
})();
