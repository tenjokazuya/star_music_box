/* tower_top — きたのとうの いただき。ふゆのかげ との最終決戦 → エンディングへ */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(14, 12, 'X');
  m.rect(2, 2, 10, 8, '+'); m.rect(7, 10, 1, 1, '+'); m.set(7, 11, '/');
  m.set(2, 2, 'Y'); m.set(11, 2, 'Y'); m.set(2, 9, 'Y'); m.set(11, 9, 'Y'); m.set(4, 5, 'P'); m.set(9, 5, 'P'); m.set(4, 8, 'P'); m.set(9, 8, 'P');
  PF.maps.base('tower_top', {
    name: 'きたのとう いただき', area: 'きたの とう', rows: m.rows(), bgm: 'tower', ambience: ['wind', 'snow'], dark: 0.5,
    wingTo: { map: 'world', pos: { entry: 'tower' } },
    entries: { south: { x: 7, y: 9, dir: 'u' } },
    objects: [
      h.warp(7, 11, 'tower_3', 'north', 'stairs'),
      h.light('l1', 2, 2, 26), h.light('l2', 11, 2, 26), h.light('l3', 2, 9, 26), h.light('l4', 11, 9, 26),
      h.brazier('beacon', 7, 3, null, { light: 50, noFire: 'おおきな ひの うつわは こおりつき、ひは きえている。' }),
      h.npc('shadow', 'shadowman', 7, 4, 'd', async function (g) { await g.say('……。', 'かげ'); }, null, { when: { not: 't.boss' } }),
      { type: 'trigger', x: 5, y: 6, w: 4, h: 1, once: 't.boss_intro', run: async function (g) { await finalScene(g); } }
    ]
  });

  async function finalScene(g) {
    var S = 'かげ', K = 'ふるい ひもり';
    g.stopBgm(0.5);
    await g.walk(g.player, 'u', { dur: 14 });
    await g.cam(7, 4, 50);
    await g.say(['いただきの ひろま。', 'おおきな ひの うつわは こおりに とざされ、', 'その まえに ひとつの かげが すわっている。']);
    g.face('shadow', 'd');
    await g.say('……また ひとり。ひを たずさえて ここまで きたか。', S);
    await g.say(['ひを まもる ことは くるしい。', 'ひとり さむさに たえ、ひとり ひを たやさない。', 'わたしは ながい あいだ、そうして きた。'], S);
    await g.say(['だが ひとは わすれる。', 'ひを くべる ものは いなくなり、わたしは つかれた。', '……ひを けしたのは、わたしだ。'], S);
    await g.say(['もう ひは いらない。ねむれば いい。', '……かえれ。'], S);
    await g.camReset(30);
    await g.say(['ランプの なかで、ヒダネが ぱちぱちと はぜた。', 'アカリは ランプを かかげた。']);
    g.sfx('rumble'); PF.fx.shake(3, 50); g.flash('#a0e0ff'); await g.wait(40);
    await g.battle(['fuyunokage'], { bg: 'final', music: 'finalboss' });
    g.set('t.boss'); g.bgm('sad');
    // かげが やさしい 老人の すがたに もどる
    g.hide('shadow');
    g.spawn({ type: 'npc', id: 'keeper', x: 7, y: 4, dir: 'd', look: PF.db.look('spirit'), talk: async function (g2) { await g2.say('……ありがとう。', K); } });
    g.flash('#ffffff'); await g.wait(20);
    await g.say(['かげが ほどけて、ひとりの ろうじんの すがたに なった。', 'とても ちいさく、とても ふるい ひもりの ふくを きている。']);
    await g.say(['……なぜ たおれぬ。ひとりに なっても、わたしは……。'], K);
    await g.say(['ひとりじゃ ない。', '…ともしびの なかから、そんな こえが きこえた きがした。']);
    g.sfx('magic');
    g.dark(0.15);
    await g.banner('ランプの ひが ゆれる。\nほらあなの ひ。とうだいの ひ。', 120, '#ffe070');
    g.flash('#ffffff');
    await g.banner('こおりの ほこらの ひ。\nかざんの いずみの ひ。', 120, '#ffe070');
    g.flash('#ffffff');
    await g.banner('ぜんぶが ひとつに つながって かがやいた。', 120, '#ffe070');
    await g.say(['……これが ともしび。', 'ひとりで まもる ものでは なかったのか。'], K);
    await g.say(['みなの ひが つながって、あたたかい。', '……ありがとう。わたしは ようやく ねむれる。'], K);
    await g.say(['この ひを たのむ。', 'ひとりで まもるな。みなで まもれ。'], K);
    g.set('t.boss2');
    await g.walkTo(g.player, 7, 4, { dur: 12 }); g.face(g.player, 'u');
    await g.say('アカリは ひの うつわの まえに たった。ヒダネが ひを ともす。');
    await PF.field.emberFly(7, 3);
    g.sfx('ignite'); g.flash('#ffffff'); g.sfx('shine'); PF.fx.shake(3, 60);
    var b = g.obj('beacon'); if (b) { PF.field.setLit(b, true); }
    g.dark(0.0);
    g.stopBgm(0.1); await g.wait(60);
    await g.say('きたの とうの いただきに、おおきな ひが ともった!');
    g.hide('keeper'); g.spark(7, 4, 24, '#fff0a0'); g.sfx('magic'); await g.wait(50);
    g.set('t.cleared'); g.set('ch', 6); g.set('fire.level', 5);
    g.bgm('ending');
    await g.banner('とおく、みなとの とうだいが かがやいた。', 110, '#ffffff');
    await g.banner('ふぶきの さとの ほこらが かがやいた。', 110, '#ffffff');
    await g.banner('ほのおの さとの いずみが かがやいた。', 110, '#ffffff');
    await g.banner('そして、コトリむらの おおびが\nあかあかと もえあがった。', 130, '#ffe070');
    await g.warp('kotori', { entry: 'shrine' }, 'warp');
  }
})();
