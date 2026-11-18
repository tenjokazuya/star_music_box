/* volc_boss — いずみの ひろま。ようがんゴーレム との戦い → いずみに ひを ともす */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(14, 12, 'V');
  m.rect(2, 2, 10, 8, 'a'); m.rect(7, 10, 1, 1, 'a'); m.set(7, 11, '/');
  m.set(2, 2, 'L'); m.set(11, 2, 'L'); m.set(2, 9, 'L'); m.set(11, 9, 'L'); m.rect(4, 5, 1, 1, 'R'); m.rect(9, 5, 1, 1, 'R');
  PF.maps.base('volc_boss', {
    name: 'ほのおの いずみ', area: 'ほのおの いずみ', rows: m.rows(), bgm: 'volcano', ambience: ['lava'], dark: 0.25,
    wingTo: { map: 'kazan', pos: { entry: 'cave' } },
    entries: { south: { x: 7, y: 9, dir: 'u' } },
    objects: [
      h.warp(7, 11, 'volc_b', 'north', 'stairs'),
      h.light('l1', 2, 2, 28), h.light('l2', 11, 2, 28), h.light('l3', 2, 9, 28), h.light('l4', 11, 9, 28),
      h.brazier('beacon', 7, 3, null, { light: 46, onLit: async function (g) { await beaconLit(g); }, noFire: 'いずみの うつわだ。ひは ほとんど きえている。' }),
      { type: 'trigger', x: 5, y: 6, w: 4, h: 1, once: 'v.boss_intro', run: async function (g) { await bossScene(g); } }
    ]
  });

  async function bossScene(g) {
    g.stopBgm(0.5);
    await g.walk(g.player, 'u', { dur: 14 });
    await g.cam(7, 3, 50);
    await g.say(['いずみの うつわの まえで、くろく かたまった', 'ようがんの かたまりが ゆっくりと おきあがる。']);
    g.sfx('quake'); PF.fx.shake(3, 60); await g.wait(50);
    await g.say('ひを まもる ばんにんが、あれて いる!');
    await g.camReset(30);
    await g.battle(['yogangolem'], { bg: 'volcano', music: 'boss' });
    g.set('v.boss'); g.bgm('sad');
    await g.say(['ゴーレムの からだの ひびわれから、', 'あかい ひかりが すうっと きえて いった。']);
    await g.say('……ねむ…かった……。', 'ようがんゴーレム');
    await g.walkTo(g.player, 7, 4, { dur: 12 }); g.face(g.player, 'u');
    await g.say('ヒダネが ちいさな ほのおを ゆらした。');
  }

  async function beaconLit(g) {
    g.set('v.cleared');
    g.stopBgm(0.1); g.sfx('shine'); g.flash('#ffffff'); PF.fx.shake(3, 50);
    g.dark(0.05); await g.wait(30);
    g.bgm('hope');
    await g.say(['いずみに ひが ともり、あかい ようがんが', 'ごうごうと ながれはじめた!']);
    await g.give('stone4');
    await g.say(['ひの なかから、あつく もえる いしが うかびあがった。', 'ヒダネが ひとまわり おおきく なった ような きがする。']);
    g.set('ch', 5); g.set('fire.level', 4);
    await g.say(['おおびの ひが また つよく なった。', 'これで よっつの ともしびの うち みっつが もどった…。']);
    await g.say('かざんを でて、さとへ もどろう。');
    await g.warp('kazan', { entry: 'cave' }, 'stairs');
  }
})();
