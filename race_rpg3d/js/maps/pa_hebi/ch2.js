/* ヘビノセ パーキング: 2章 — ヘビノセの頭 ゴウ（賭け金の大きさを選べる分岐） */
(function () {
  'use strict';
  var RR = window.RR;
  async function gou(E) {
    if (!E.flag('kurosawa_met')) {
      await E.say('ゴウ', 'おまえが サキを たおした やつか!|...ん? まだ まちで やることが あるんじゃ ないのか?');
      await E.say('ゴウ', 'テツさんが さがしてたぜ。いちど まちに もどりな。');
      return;
    }
    if (!E.flag('gou_met')) {
      E.setFlag('gou_met');
      await E.say('ゴウ', 'おまえが サキを たおした やつか!');
      await E.say('ゴウ', 'おれは ゴウ。|ヘビノセは パワーの みち だ!');
      await E.say('ゴウ', 'クロサワさんと やりあう つもり らしいな。|だったら まずは おれを こえて いけ!');
    }
    if (await RR.Story.gateCheck(E, 'gou', {
      first: ['...と いいたい ところだが!|いきなり おれに いどむとは ヘビノセを なめてんのか!', 'まずは {who}を ぶっちぎって こい!|はなしは それからだ!'],
      again: ['{who}は どうした!|おれと やりたきゃ さきに かってこい!'],
      one: ['{who}が まだ のこってるぞ!|さっさと かって もどってこい!']
    })) return;
    var c = await E.ask('ゴウ', 'かけきんは 10000...|いや、もっと おおきく いくか? 30000 だ!', ['10000で', '30000で', 'やめておく']);
    if (c === 2) { await E.say('ゴウ', 'にげるなよ!'); return; }
    var id = c === 1 ? 'gou_big' : 'gou1';
    var stake = c === 1 ? 30000 : 10000;
    if (E.money < stake) { await E.say('ゴウ', 'かけきんが たりねえぞ!'); return; }
    if (c === 1) { E.setFlag('gou_big_bet'); await E.say('ゴウ', 'いいね! そうこなくっちゃ!'); }
    var r = await E.race(id);
    if (r.win) {
      await E.say('ゴウ', c === 1 ? 'ぐおお... 30000 もってけ!|おとこに にごんは ねえ!' : 'まいった!|おまえの はしり、ほんもの だ。');
      await E.giveFurniture('trophy_gou');
      await E.say('ゴウ', 'つぎは キリガタニの シノブか。|あいつは まちの きっさてんに よく いるらしいぜ。');
      await E.chapter(3, 'きりの なかで');
      E.bgm('pass');
      E.goal('キリガタニの シノブに かつ');
      E.reload();
    } else {
      E.addNum('gou_lose');
      if (r.retire) { await E.say('ゴウ', 'なんだ、エンジンでも ふいたか?'); return; }
      await E.say('ゴウ', E.num('gou_lose') < 2 ? 'パワーが たりねえよ!|エンジンを いじって でなおしな!' : 'ストレートで まけるなら こうそく コーナーで さを つけな。|サスと エアロを みなおしてみろ。');
    }
  }
  RR.Maps.layer('pa_hebi', 'ch2', {
    when: function (S) { return S.stage === 2; },
    npcs: [{ id: 'gou', x: 17, y: 6, dir: 'down', look: 'gou', talk: gou }]
  });
})();
