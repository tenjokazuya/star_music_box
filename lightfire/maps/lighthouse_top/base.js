/* lighthouse_top — とうだいの 頂上。しずくのヌシ との戦い → 灯台に火をともす */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(12, 10, 'X');
  m.rect(2, 2, 8, 6, '+'); m.rect(6, 8, 1, 1, '+'); m.set(6, 9, '/');
  m.set(2, 2, 'Y'); m.set(9, 2, 'Y'); m.set(2, 7, 'Y'); m.set(9, 7, 'Y');
  PF.maps.base('lighthouse_top', {
    name: 'とうだい ちょうじょう', area: 'みなとの とうだい', rows: m.rows(), bgm: 'lighthouse', ambience: ['sea', 'wind'], dark: 0.55,
    wingTo: { map: 'nagi', pos: { entry: 'lighthouse' } },
    entries: { south: { x: 6, y: 7, dir: 'u' } },
    objects: [
      h.warp(6, 9, 'lighthouse_3', 'north', 'stairs'),
      h.light('l1', 2, 2, 26), h.light('l2', 9, 2, 26), h.light('l3', 2, 7, 26), h.light('l4', 9, 7, 26),
      h.brazier('beacon', 6, 3, null, { light: 40, onLit: async function (g) { await beaconLit(g); }, noFire: 'おおきな しょくだいだ。まだ ひは ともっていない。' }),
      h.npc('keeper', 'monk', 3, 4, 'r', async function (g, e, w) {
        if (!g.flag('c2.boss')) await g.say(['う…うう…。そいつは うみの しずくを あつめて、', 'とうだいの ひを けして いる…。にげろ…。'], w);
        else await g.say('あの ひを…どうか ともして くれ。ヒダネの ひなら…。', w);
      }, 'とうだいもり'),
      { type: 'trigger', x: 4, y: 6, w: 5, h: 1, once: 'c2.boss_intro', run: async function (g) { await bossScene(g); } }
    ]
  });

  async function bossScene(g) {
    g.stopBgm(0.5);
    await g.walk(g.player, 'u', { dur: 14 });
    await g.cam(6, 3, 50);
    await g.say(['てっぺんの おおきな しょくだいの まえに、', 'しずくの かたまりが うずくまっている。']);
    g.sfx('rumble'); PF.fx.shake(2, 50); await g.wait(40);
    await g.say('しずくが ふくれあがり、こちらを むいた!');
    await g.camReset(30);
    await g.battle(['shizuku'], { bg: 'lighthouse', music: 'boss' });
    g.set('c2.boss'); g.bgm('sad');
    await g.say(['しずくの かたまりは ぱちんと はじけて、', 'ただの みずに なって ゆかに ひろがった。']);
    g.face('keeper', 'player');
    await g.say(['す…すまん。たすかった…。', 'わしは とうだいもりだ。ひを まもれなんだ…。'], 'とうだいもり');
    await g.say(['あの ひを、もういちど ともして くれんか。', 'そのランプの ひなら きっと…。'], 'とうだいもり');
    await g.walkTo(g.player, 6, 4, { dur: 12 }); g.face(g.player, 'u');
    await g.say('ヒダネが ちいさな ほのおを ゆらした。');
  }

  async function beaconLit(g) {
    g.set('c2.cleared');
    g.stopBgm(0.1); g.sfx('shine'); g.flash('#ffffff'); PF.fx.shake(2, 40);
    g.dark(0.2); await g.wait(30);
    g.bgm('hope');
    await g.say(['とうだいの ひが、おおきく もえあがった!', 'ひかりが うみの むこうまで のびていく。']);
    await g.give('stone2');
    await g.say(['…ひの なかから、あおく ひかる いしが うかびあがった。', 'ヒダネが うれしそうに ぱちぱちと はぜている。']);
    await g.say(['ありがとう…。ひが もどった。', 'この ひは むかしから けっして きえなかった。', 'なぜ きえたのか…わしにも わからん。'], 'とうだいもり');
    g.set('ch', 3); g.set('fire.level', 2);
    await g.say(['おおびの ひが すこし つよく なったような きがした。', 'とうだいを でて みなとへ もどろう。']);
    await g.warp('nagi', { entry: 'lighthouse' }, 'stairs');
  }
})();
