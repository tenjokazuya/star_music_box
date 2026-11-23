/* キリガタニ パーキング: 3章 — キリガタニの頭 シノブ。勝つと祖父とクロサワの過去を語る */
(function () {
  'use strict';
  var RR = window.RR;
  async function shinobu(E) {
    if (!E.flag('shinobu_met')) {
      await E.say('シノブ', '......');
      await E.say('シノブ', '...まちの きっさてんで いちど はなしましょう。|はしるのは それから。');
      return;
    }
    if (E.flag('shinobu_found') && !E.flag('shinobu_quest')) { await RR.Story.returnOmamori(E); }
    if (await RR.Story.gateCheck(E, 'shinobu', {
      first: ['...きりの キリガタニへ ようこそ。', '......でも まだ はやい。|{who}に かってから。', '...きりの みちに からだを ならす ため でも ある。'],
      again: ['...{who}が まってる。'],
      one: ['...{who}が まってる。']
    })) return;
    await E.say('シノブ', '...きりの キリガタニへ ようこそ。');
    var c = await E.ask('シノブ', 'かけきんは 15000。...はしる?', ['はしる', 'まだ']);
    if (c !== 0) { await E.say('シノブ', '...まってる。'); return; }
    if (E.money < 15000) { await E.say('シノブ', '...かけきんが たりない みたい。'); return; }
    var r = await E.race('shinobu1');
    if (r.win) {
      await E.say('シノブ', '...みごと。|きりの なかでも まよいが なかった。');
      await E.say('シノブ', 'ひとつ はなして おく。|クロサワさんは むかし ヤシャで ゲンゾウさんに まけた。');
      await E.say('シノブ', 'それから ずっと あの やまで まっている。|...ゲンゾウさんの はしりを もういちど みたいの かも しれない。');
      await E.giveFurniture('trophy_shinobu');
      await E.chapter(4, 'ヤシャの よあけ');
      E.bgm('pass');
      E.goal('ヤシャだけの クロサワに かつ');
      E.reload();
    } else if (!r.retire) {
      await E.say('シノブ', E.num('shino_lose') ? '...きりの むこうを みて。|よこくの ひょうじを しんじる こと。' : '...コースを おぼえる こと。|それが きりの なかの みちしるべ。');
      E.addNum('shino_lose');
    }
  }
  RR.Maps.layer('pa_kiri', 'ch3', {
    when: function (S) { return S.stage === 3; },
    build: function (M) { M.prop('car', 13, 4, { model: 'regulus', color: 'silver' }); },
    npcs: [{ id: 'shinobu', x: 12, y: 6, dir: 'down', look: 'shinobu', talk: shinobu }]
  });
})();
