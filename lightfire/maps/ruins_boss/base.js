/* ruins_boss — ひのいせきの おく。ふるきひのかげ（隠しボス） */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(14, 12, 'X');
  m.rect(2, 2, 10, 8, '+'); m.rect(7, 10, 1, 1, '+'); m.set(7, 11, '/');
  m.set(2, 2, 'Y'); m.set(11, 2, 'Y'); m.set(2, 9, 'Y'); m.set(11, 9, 'Y');
  PF.maps.base('ruins_boss', {
    name: 'ひのいせき おく', area: 'ひのいせき', rows: m.rows(), bgm: 'ruins', ambience: ['cave'], dark: 0.4,
    wingTo: { map: 'garden', pos: { entry: 'ruins' } },
    entries: { south: { x: 7, y: 9, dir: 'u' } },
    objects: [
      h.warp(7, 11, 'ruins_a', 'north', 'stairs'),
      h.light('l1', 2, 2, 28), h.light('l2', 11, 2, 28), h.light('l3', 2, 9, 28), h.light('l4', 11, 9, 28),
      { type: 'trigger', x: 5, y: 6, w: 4, h: 1, once: 'r.boss_intro', run: async function (g) { await scene(g); } }
    ]
  });
  async function scene(g) {
    g.stopBgm(0.4);
    await g.walk(g.player, 'u', { dur: 14 });
    await g.say(['いせきの おくで、おおきな ほのおの かげが', 'ゆらゆらと ゆれている。']);
    await g.say(['……ひを…まもれ……ひとりで……まもれ……。'], 'ふるきひのかげ');
    g.sfx('quake'); PF.fx.shake(3, 60); await g.wait(50);
    await g.battle(['furuki'], { bg: 'tower', music: 'boss' });
    g.set('bonus.cleared'); g.bgm('hope');
    await g.say(['ほのおの かげが ふっと ちいさく なって、', 'あたたかい ひかりに かわった。']);
    await g.say(['……ひとりでは……なかったのだな……。', 'ありがとう……ともしびの ひもり……。'], 'ふるきひのかげ');
    g.jingle('item');
    await g.give('ashrobe');
    await g.say(['ひは みなで まもる もの。', 'この せかいの ともしびは、もう だいじょうぶだ。']);
    g.refresh();
  }
})();
