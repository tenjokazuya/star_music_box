/* garden — はじまりの ひろま（クリア後の隠しエリア）。ひもりたちが 眠る 花の庭 */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(20, 16, '.');
  m.scatter(0, 0, 20, 16, '*', 0.14, 31, ['.']); m.scatter(0, 0, 20, 16, '#', 0.07, 32, ['.']);
  m.border('#', 1); m.rect(4, 10, 5, 3, '~'); m.rect(5, 9, 3, 1, '~');
  m.path([[10, 14], [10, 3]], ':', 2); m.path([[4, 7], [16, 7]], ':', 1);
  m.rect(8, 0, 4, 3, '^'); m.set(10, 2, ']');
  m.rect(9, 14, 2, 2, ':');
  m.set(10, 4, ':');
  PF.maps.base('garden', {
    name: 'はじまりの ひろま', area: 'はじまりの ひろま', rows: m.rows(), bgm: 'garden', ambience: ['birds', 'water'], fill: '.',
    entries: { stairs: { x: 10, y: 14, dir: 'u' }, ruins: { x: 10, y: 3, dir: 'd' } },
    objects: [
      h.warp(10, 15, 'kotori_shrine', 'stairs', 'stairs', 2, 1),
      { type: 'warp', x: 10, y: 2, to: 'ruins_a', entry: 'door', sfx: 'stairs' },
      h.sign(11, 12, 'はじまりの ひろま\nひもりたちが ねむる ばしょ'),
      h.chest('c1', 15, 4, 'herb3', 3), h.chest('c2', 3, 4, 'tea2', 3), h.chest('c3', 16, 11, 'charm'),
      h.npc('spirit', 'spirit', 7, 6, 'r', async function (g, e, w) {
        if (!g.flag('bonus.talked')) {
          g.set('bonus.talked');
          await g.say(['ここは はじまりの ひろま。', 'ひもりたちが ひを つぎ、ねむる ばしょ。'], w);
          await g.say(['わたしの なごりは あの いせきを さまよって いる。', 'ひとりで ひを まもろうと した かなしみの ざんしだ。'], w);
          await g.say(['おまえの ともしびで、あれを ねむらせて やって くれないか。', 'ひろまの おくの いせきだ。'], w);
        } else if (!g.flag('bonus.cleared')) await g.say('いせきは ひろまの きたの おくだよ。きを つけて おゆき。', w);
        else await g.say(['ありがとう。ようやく ほんとうに ねむれる。', 'ひは みなで まもる もの。…ずっと おぼえて いておくれ。'], w);
      }, 'ふるい ひもり')
    ]
  });
})();
