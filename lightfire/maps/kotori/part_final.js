/* kotori / エンディング（ch>=6 かつ ending.done 前）: 広場に みんなが あつまり、おおびが もえあがる */
(function () {
  'use strict';
  var L = PF.db.look;
  function npc(id, look, x, y, dir, lines, who) {
    return { type: 'npc', id: id, x: x, y: y, dir: dir, look: look, talk: async function (g) { await g.say(lines, who); } };
  }
  PF.maps.part('kotori', 'final', {
    when: { gte: ['ch', 6], not: 'ending.done' },
    bgm: 'ending', dark: 0, ambience: ['wind'],
    entries: { shrine: { x: 14, y: 6, dir: 'd' } },
    objects: [
      npc('granny', L('granny'), 15, 7, 'l', ['アカリ…!'], 'おばあちゃん'),
      npc('elder', L('elder'), 12, 6, 'r', ['みなの ともしびが ふたたび…。'], 'そんちょう'),
      npc('woman', L('woman'), 11, 8, 'r', ['あたたかい…。']),
      npc('man', L('man'), 18, 6, 'l', ['ひが もどった。']),
      npc('baker', L('baker'), 18, 8, 'l', ['パンを やくぞ。'], 'パンやの おじさん'),
      npc('kota', L('kota'), 13, 8, 'u', ['アカリ!'], 'コタ')
    ],
    onEnter: async function (g) {
      var N = 'おばあちゃん', pl = g.player;
      g.face(pl, 'd');
      await g.wait(60);
      await g.say('…むらの みんなが、おおびの まわりに あつまっている。');
      g.face('granny', 'player'); g.face('kota', 'player');
      await g.say('アカリ! ヒダネ! ぶじだったんだね!', N);
      g.emote('kota', '!', 50);
      await g.say(['アカリ! みたか! おおびが いままでで いちばん あかるいぞ!', 'とうの ほうから、でっかい ひかりが ここまで とどいたんだ!'], 'コタ');
      await g.say(['みなの ともしびが ふたたび、おおびに あつまった。', 'ひとつ ひとつの ひが、あたたかい…。'], 'そんちょう');
      await g.say(['ばあちゃんは ひもりとして、ひとりで この ひを まもって きた。', 'それが ひもりの つとめだと おもって いたんだよ。'], N);
      await g.say(['でも ちがった。ひは ひとりで まもる ものじゃ ない。', 'みんなで たやさず まもる ものだった。'], N);
      await g.say(['これからは ひもりを むらみんなで うけつごう。', 'アカリ、おまえも いつでも ひを くべに おいで。'], N);
      g.jingle('item');
      await g.say('コタが じぶんの ランプの ひを、アカリの ランプに わけてくれた。');
      await g.say(['ヒダネが うれしそうに、おおびの まわりを くるくる まわっている。', 'ぱち、ぱち、ぱち。…ほのおの わらい声が きこえる。']);
      await g.say(['ゆきが ふりやみ、あさひが のぼる。', 'むらの ともしびが ひとつ、ふたつと ふえて いった。']);
      g.stopBgm(1.2); await g.fade(1, 60, '#000000');
      await PF.title.credits();
      // クリア後: 自動セーブして、春の ある世界へ
      g.set('clear'); g.set('ending.done'); PF.state.clear = true;
      var m = PF.maps.current, p = g.player; PF.state.map = { id: m.id, x: 14, y: 8, dir: 'd' };
      var slot = PF.save.lastUsed(); if (slot < 0) slot = 0; PF.save.write(slot);
      g.refresh(); g.place(g.player, 14, 8, 'd'); g.bgm('hope');
      await g.fade(0, 60);
      await g.say(['……ゆきが とけて、むらに はるが やってきた。', 'クリアの データを じどうで セーブしました。']);
      await g.say(['ほこらの おくから、ふしぎな ひかりが もれて いる。', 'あそんだ せかいを、もう すこし あるいて みよう。']);
    }
  });
})();
