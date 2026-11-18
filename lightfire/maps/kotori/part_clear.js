/* kotori / クリア後（ending.done）: 春の むら。みんなの 会話が かわる */
(function () {
  'use strict';
  var L = PF.db.look;
  function npc(id, look, x, y, dir, lines, who, o) {
    var n = { type: 'npc', id: id, x: x, y: y, dir: dir, look: look, talk: async function (g) { await g.say(lines, who); } };
    if (o) for (var k in o) n[k] = o[k]; return n;
  }
  PF.maps.part('kotori', 'spring', { when: { flag: 'clear' }, convert: { n: '.', T: '#', G: '#', l: 'y' }, snow: false, bgm: 'village', ambience: ['birds'], dark: 0 });
  PF.maps.part('kotori', 'clear', {
    when: { flag: 'ending.done' },
    objects: [
      npc('granny', L('granny'), 15, 7, 'l', async function (g) {
        if (!g.flag('bonus.cleared')) await g.say(['はるが きたねえ。ひは みんなで まもって いるから、', 'ばあちゃんも ひさしぶりに ゆっくり できるよ。'], 'おばあちゃん');
        else await g.say(['アカリ、ほんとうに ありがとう。', 'ひは もう だいじょうぶ。むらの みんなが まもって くれる。'], 'おばあちゃん');
      }, 'おばあちゃん'),
      npc('elder', L('elder'), 12, 6, 'r', ['ほこらの おくに あたらしい かいだんが できた。', 'あれは むかしの ひもりたちの ねむる ばしょかも しれん。'], 'そんちょう'),
      npc('woman', L('woman'), 11, 8, 'r', ['はなが さいたわ。ともしびの よるに ふゆを こえられて よかった。']),
      npc('man', L('man'), 18, 6, 'l', ['おおびの ひで まきを くべる。みんな こうして ひを まもるんだ。']),
      npc('baker', L('baker'), 18, 8, 'l', ['やきたての パンだ。みんなで たべよう!'], 'パンやの おじさん'),
      npc('kota', L('kota'), 12, 8, 'r', async function (g) {
        await g.say(['アカリ! おれ、つぎの ひもりを めざす ことに した!', 'ほこらの おくの かいだん、いっしょに いこうぜ!'], 'コタ');
      }, 'コタ')
    ]
  });
})();
