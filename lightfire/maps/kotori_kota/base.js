/* kotori_kota — コタの いえ */
(function () {
  'use strict';
  var m = PF.mk.new(10, 8, '=').room('=');
  m.set(3, 0, 'z'); m.set(6, 0, 'z');
  m.set(1, 2, 'k'); m.set(1, 3, 'k'); m.set(8, 2, 'u'); m.set(5, 2, 'o');
  m.set(4, 4, 't'); m.set(5, 4, 't'); m.set(3, 4, 'h'); m.set(6, 4, 'h');
  m.set(8, 5, 'p'); m.set(8, 6, 'p');
  m.set(4, 7, '_');
  function hot(x, y, text) { return { type: 'sign', invisible: true, x: x, y: y, text: text }; }
  PF.maps.base('kotori_kota', {
    name: 'コタの いえ', showName: false, indoor: true, rows: m.rows(), bgm: 'village', ambience: ['fire'],
    entries: { door: { x: 4, y: 6, dir: 'u' } },
    objects: [
      { type: 'warp', x: 4, y: 7, to: 'kotori', entry: 'kota', sfx: 'door' },
      hot(1, 2, 'コタの ベッドだ。まくらの したから\nおもちゃの けんが はみでている。'),
      hot(1, 3, 'コタの ベッドだ。'),
      hot(5, 2, 'えほんが ならんでいる。\n「ひだねの おはなし」と いう ほんが ある。\nなかは すこし やぶれている。'),
      hot(8, 2, 'だんろの ひは きえて、はいが ひんやり している。'),
      { type: 'npc', id: 'mother', x: 5, y: 5, dir: 'u', look: PF.db.look('woman'), talk: async function (g) {
        if (g.flag('ch') < 1) await g.say(['コタは ともしびの よるを たのしみに していたの。', 'ほこらへ いったかしら?'], 'コタの おかあさん');
        else if (!g.flag('kota.mother_gift')) {
          g.set('kota.mother_gift');
          await g.say(['アカリちゃん、ひを うしなって こわかったでしょう。', 'これを もって おいき。'], 'コタの おかあさん');
          await g.give('herb', 3);
        } else await g.say('ぶじに かえって きてね。', 'コタの おかあさん');
      } }
    ]
  });
})();
