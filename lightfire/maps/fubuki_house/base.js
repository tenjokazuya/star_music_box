/* fubuki_house — むらおさの いえ（ほこらの はなし／あったかコート） */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(10, 8, '=').room('=');
  m.set(2, 0, 'z'); m.set(7, 0, 'z'); m.set(1, 2, 'o'); m.set(2, 2, 'o'); m.set(7, 2, 'u'); m.rect(3, 3, 4, 3, '%');
  m.set(4, 4, 't'); m.set(5, 4, 't'); m.set(3, 4, 'h'); m.set(6, 4, 'h'); m.set(8, 5, 'k'); m.set(8, 4, 'k'); m.set(4, 7, '_');
  PF.maps.base('fubuki_house', {
    name: 'むらおさの いえ', showName: false, indoor: true, rows: m.rows(), bgm: 'snow', ambience: [],
    entries: { door: { x: 4, y: 6, dir: 'u' } },
    objects: [
      h.warp(4, 7, 'fubuki', 'elder', 'door'),
      h.hot(1, 2, 'ふるい ほんが ならんでいる。\n「ほこらの ひは、おおきな ひと つながる」と かいてある。'),
      h.hot(2, 2, 'ふるい ほんが ならんでいる。'), h.hot(7, 2, 'だんろの ひは きえている。'),
      h.npc('elder', 'fur2', 5, 3, 'd', async function (g, e, w) {
        var ch = g.flag('ch');
        if (ch < 4) {
          await g.say(['ようこそ、ふぶきの さとへ。…ほう、ひを つれて きたか。', 'そのランプの ひは、ヒダネ だね?'], w);
          await g.say(['この さとの ほこらには、むかしから ひが ともっていた。', 'ひが きえた あと、とびらは こおりに とざされて しまった。'], w);
          await g.say(['ほこらの おくには、こおりの きしの かげが いると いわれて いる。', 'いのちが けずられる ばしょだよ。きを つけて おゆき。'], w);
          if (!g.flag('f.coat')) { g.set('f.coat'); await g.say('これを きて いきなさい。さむさを やわらげて くれる。', w); await g.give('warmcoat'); }
        } else await g.say(['ほこらに ひが もどった。ありがとう。', 'ひがしの かざんの ほのおの さとは あつい ところだ。みずを もって いきなさい。'], w);
      }, 'むらおさ'),
      h.chest('c1', 1, 5, 'herb2')
    ]
  });
})();
