/* icecave_boss — こおりの ほこらの おく。こおりのきし との戦い → ほこらに 火を ともす */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(14, 12, 'X');
  m.rect(2, 2, 10, 8, '+'); m.rect(7, 10, 1, 1, '+'); m.set(7, 11, '/');
  m.set(2, 2, 'Y'); m.set(11, 2, 'Y'); m.set(2, 9, 'Y'); m.set(11, 9, 'Y'); m.set(4, 5, 'P'); m.set(9, 5, 'P');
  PF.maps.base('icecave_boss', {
    name: 'こおりの ほこら', area: 'こおりの ほこら', rows: m.rows(), bgm: 'ice', ambience: ['snow'], dark: 0.35,
    wingTo: { map: 'fubuki', pos: { entry: 'shrine' } },
    entries: { south: { x: 7, y: 9, dir: 'u' } },
    objects: [
      h.warp(7, 11, 'icecave_b', 'north', 'stairs'),
      h.light('l1', 2, 2, 24), h.light('l2', 11, 2, 24), h.light('l3', 2, 9, 24), h.light('l4', 11, 9, 24),
      h.brazier('beacon', 7, 3, null, { light: 44, onLit: async function (g) { await beaconLit(g); }, noFire: 'おおきな ひの うつわだ。ひは きえている。' }),
      { type: 'trigger', x: 5, y: 6, w: 4, h: 1, once: 'f.boss_intro', run: async function (g) { await bossScene(g); } }
    ]
  });

  async function bossScene(g) {
    g.stopBgm(0.5);
    await g.walk(g.player, 'u', { dur: 14 });
    await g.cam(7, 3, 50);
    await g.say(['こおりに おおわれた ひの うつわの まえに、', 'こおりの よろいを まとった かげが たっている。']);
    await g.say(['……ここは ひを まもる ばしょ……。', 'ひを……うばう ものは……ゆるさぬ……。'], 'こおりのきし');
    g.sfx('rumble'); PF.fx.shake(2, 40); await g.wait(30);
    await g.camReset(30);
    await g.battle(['koorikishi'], { bg: 'ice', music: 'boss' });
    g.set('f.boss'); g.bgm('sad');
    await g.say(['きしの よろいが からんと くずれ、', 'ふぶきのような かぜが ふきぬけた。']);
    await g.say(['……ひを……ともして……くれ……。', 'ながい……さむい……ねむりだった……。'], 'こおりのきし');
    await g.walkTo(g.player, 7, 4, { dur: 12 }); g.face(g.player, 'u');
    await g.say('ヒダネが ちいさな ほのおを ゆらした。');
  }

  async function beaconLit(g) {
    g.set('f.cleared');
    g.stopBgm(0.1); g.sfx('shine'); g.flash('#ffffff'); PF.fx.shake(2, 40);
    g.dark(0.1); await g.wait(30);
    g.bgm('hope');
    await g.say(['ほこらの ひが、あおじろく もえあがった!', 'こおりが とけて、ひかりが あふれだす。']);
    await g.give('stone3');
    await g.say(['…ふぶきの ような いろの いしが、ひの なかで かがやいた。', 'ヒダネが くるくると ほのおを まわしている。']);
    g.set('ch', 4); g.set('fire.level', 3);
    await g.say(['おおびの ひが また つよく なった きがする。', 'ほこらを でて、さとへ もどろう。']);
    await g.warp('fubuki', { entry: 'shrine' }, 'stairs');
  }
})();
