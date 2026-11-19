/* ツヅラ パーキング: 1章 — ツヅラの頭 サキとの勝負 */
(function () {
  'use strict';
  var RR = window.RR;
  async function saki(E) {
    if (!E.flag('saki_met')) {
      E.setFlag('saki_met');
      await E.say('サキ', '...あんたが ケンタに かった コメット?');
      await E.say('サキ', 'ふうん。ゲンゾウさんの くるま だね。|この あたりの はしりやで しらない ひとは いないよ。');
      await E.say('サキ', 'あたしは サキ。|ツヅラの かしら ってことに なってる。');
    }
    await E.say('サキ', 'ツヅラの くだりで しょうぶ しよう。|かけきんは 5000。');
    var c = await E.ask('サキ', 'どうする?', ['しょうぶ!', 'まだ やめておく']);
    if (c !== 0) { await E.say('サキ', 'じゅんびが できたら おいで。'); return; }
    if (E.money < 5000) { await E.say('サキ', 'かけきんが たりない みたいね。|バイトでも して きたら?'); return; }
    var r = await E.race('saki1');
    if (r.win) {
      await E.say('サキ', '...やるじゃない。|ヘアピンの ぬけかたが ゲンゾウさんに にてた。');
      if (!E.flag('saki_lost')) {
        await E.say('サキ', 'いっかいで まけるなんて ひさしぶり。|これ あげる。あたしたちの ステッカー。');
        await E.giveFurniture('sticker_saki');
      }
      await E.giveFurniture('trophy_saki');
      await E.say('サキ', 'ツヅラは あんたに ゆずるよ。|...つぎは ヘビノセ だね。ゴウは パワーが すごいよ。');
      await E.chapter(2, 'ヘビノセの けもの');
      E.bgm('pass');
      E.goal('まちに もどって テツに ほうこく しよう');
      E.reload();
    } else {
      var n = E.num('saki_lose');
      E.addNum('saki_lose');
      E.setFlag('saki_lost');
      if (r.retire) { await E.say('サキ', 'にげるの? ...まあ いいけど。'); return; }
      if (n === 0) await E.say('サキ', 'タイヤが たれてたよ。|ヘアピンで ふみすぎると すべって かえって おそくなる。');
      else if (n === 1) await E.say('サキ', 'ブレーキで はなさきを いれて|まがりおわって から ふむ。それだけ。');
      else await E.say('サキ', 'タイヤか サスを かえて みたら?|テツさんに そうだん してみな。');
    }
  }
  RR.Maps.layer('pa_tsuzura', 'ch1', {
    when: function (S) { return S.stage === 1; },
    npcs: [{ id: 'saki', x: 12, y: 6, dir: 'down', look: 'saki', talk: saki }],
    build: function (M) { M.prop('car', 13, 4, { model: 'hayate', color: 'black' }); }
  });
})();
