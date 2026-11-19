/* ヤシャ パーキング: 終章 — ヤシャのヌシ クロサワとの最終決戦（負けるとゲームオーバー） */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  async function kurosawa(E) {
    if (!E.flag('kuro_ready')) {
      E.setFlag('kuro_ready');
      E.bgm('tension');
      await E.say('クロサワ', '...きたか。');
      await E.say('クロサワ', 'サキ ゴウ シノブを たおして|ここまで きたか。');
      await E.say('クロサワ', 'やくそくは おぼえて いるな。|かてば ガレージは そのまま。まければ あけわたして もらう。');
    }
    var s = await E.ask('', 'しょうぶの まえに きろく しますか?', ['きろく する', 'しない']);
    if (s === 0) E.save();
    var c = await E.ask('クロサワ', 'じゅんびは いいか?', ['いく', 'まだだ']);
    if (c !== 0) { await E.say('クロサワ', '...まっている。'); E.bgm('pass'); return; }
    await E.say('クロサワ', 'ヤシャの くだりだ。|さきに ふもとに ついた ほうが かち。');
    var r = await E.race('kurosawa1');
    if (r.win) { await RR.Story.finale(E); return; }
    await E.say('クロサワ', r.retire ? '...とちゅうで おりるか。それも まけ だ。' : '...ここまで だな。');
    await E.gameOver('ヤシャの よあけは とおかった。|ガレージは クロサワの ものに なった...');
  }
  RR.Maps.layer('pa_yasha', 'ch4', {
    when: function (S) { return S.stage === 4; },
    npcs: [
      { id: 'kurosawa', x: 17, y: 6, dir: 'down', look: 'kurosawa', talk: kurosawa },
      { id: 'tetsu', x: 4, y: 9, dir: 'right', look: 'tetsu', talk: K.lines('テツ', [['みに きたぞ。|ゲンゾウさんの コメットが ヤシャを はしるのを な。', 'タイヤの ねつと ブレーキの いたみに きを つけろ。|ながい コースだ。'], 'しゅうりが ひつような ときは まちに もどれ。']) },
      { id: 'mio', x: 5, y: 9, dir: 'right', look: 'mio', talk: K.lines('ミオ', [['おうえんに きたよ!|...これ、じんじゃの おまもり。もってて。', 'きっと だいじょうぶ。'], '{N}の はしり、ちゃんと みてるからね。']) },
      { id: 'saki', x: 9, y: 7, dir: 'down', look: 'saki', talk: K.random('サキ', ['ヤシャは さいごの ヘアピンが いちばん きつい。|タイヤを のこして おきな。', 'まけたら ゆるさないよ。']) },
      { id: 'gou', x: 11, y: 7, dir: 'down', look: 'gou', talk: K.random('ゴウ', ['ストレートで まけるなよ!', 'おれを たおした おとこだ。じしんを もて!']) },
      { id: 'kenta', x: 14, y: 9, dir: 'up', look: 'kenta', talk: K.random('ケンタ', ['がんばれー! コメットー!', 'おれ、さいしょに たたかった あいてだからな!']) },
      { id: 'shinobu', x: 21, y: 8, dir: 'left', look: 'shinobu', when: function (S) { return S.flags.shinobu_quest; }, talk: K.random('シノブ', ['...きりの なかの ことを おもいだして。|みえない さきを よむの。', '...いってらっしゃい。']) }
    ]
  });
})();
