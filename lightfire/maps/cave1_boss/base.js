/* cave1_boss — ヒダネの いる おく。おおかげ との戦い → ヒダネが 仲間になる */
(function () {
  'use strict';
  var m = PF.mk.new(14, 12, 'X');
  m.rect(2, 2, 10, 8, '+'); m.rect(7, 10, 1, 1, '+'); m.set(7, 11, '/');
  m.set(2, 2, 'Y'); m.set(11, 2, 'Y'); m.set(2, 9, 'Y'); m.set(11, 9, 'Y');
  PF.maps.base('cave1_boss', {
    name: 'ひだねの ほらあな', area: 'ひだねの ほらあな', rows: m.rows(), bgm: 'cave', ambience: ['cave'], dark: 0.6,
    wingTo: { map: 'forest', pos: { entry: 'cave' } },
    entries: { south: { x: 7, y: 9, dir: 'u' } },
    objects: [
      { type: 'warp', x: 7, y: 11, to: 'cave1_c', entry: 'north', sfx: 'stairs' },
      { type: 'deco', id: 'l1', x: 2, y: 2, light: 30, solid: false }, { type: 'deco', id: 'l2', x: 11, y: 2, light: 30, solid: false },
      { type: 'deco', id: 'l3', x: 2, y: 9, light: 26, solid: false }, { type: 'deco', id: 'l4', x: 11, y: 9, light: 26, solid: false },
      { type: 'deco', id: 'spirit', sprite: 'ember', fast: true, x: 7, y: 3, light: 30, solid: false, when: { not: 'c1.boss' } },
      { type: 'trigger', x: 5, y: 7, w: 4, h: 1, once: 'c1.boss_intro', run: async function (g) { await bossScene(g); } }
    ]
  });

  async function bossScene(g) {
    g.stopBgm(0.5);
    await g.walk(g.player, 'u', { dur: 14 });
    await g.cam(7, 3, 50);
    await g.say(['おくの いわの ちかくで、ちいさな ひが', 'ふるえるように ゆれている。']);
    g.sfx('rumble'); g.dark(0.8); PF.fx.shake(2, 60); await g.wait(50);
    await g.say('その まわりを、おおきな かげが とりかこんでいる!');
    await g.camReset(40);
    var res = await g.battle(['ookage'], { bg: 'cave', music: 'boss' });
    g.set('c1.boss');
    g.dark(0.6); g.bgm('sad');
    await g.say(['かげは ちりぢりに なって、', 'くらやみの なかへ きえていった…。']);
    var sp = g.obj('spirit');
    await g.walk(sp, 'ddd', { dur: 16, ghost: true });
    await g.say('ちいさな ひが、ゆらゆらと ちかづいてくる。');
    g.face(g.player, 'u');
    await g.walk(sp, 'd', { dur: 16, ghost: true });
    await g.wait(20);
    await g.say(['ひは アカリの ランプの まわりを', 'くるりと まわった。']);
    g.sfx('magic'); g.hide('spirit'); await g.giveEmber();
    g.spark(g.player.x, g.player.y, 16, '#ffb030');
    g.stopBgm(0.1); await g.jingle('item'); g.bgm('hope');
    await g.say('ランプに あたたかい ひが ともった!');
    await g.say(['ヒダネは アカリに ついてくる ことに したようだ。', '…ぱち、ぱち。ちいさく ひが はぜる おとが した。']);
    await g.learn('flame');
    await g.say(['【ヒダネの ちから】\nひを つけられる ものの まえで、\nAボタンを おすと ヒダネが ひを ともす。']);
    g.refresh();
    await g.say(['…かえりみちの あなが、こおりで ふさがれている。', 'ヒダネの ひで とかして みよう。']);
  }
})();
