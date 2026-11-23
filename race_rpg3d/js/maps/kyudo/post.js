/* きゅうどう: クリア後 — 「しろい カゲ」ハヤミとの勝負（祖父の好敵手） */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  async function hayami(E) {
    if (E.flag('hayami_beaten')) {
      await E.say('ハヤミ', '...また きたか。');
      var c2 = await E.ask('ハヤミ', 'もう いっぽん いくか? かけきんは 30000。', ['いく', 'やめておく']);
      if (c2 !== 0) return;
      if (E.money < 30000) { await E.say('ハヤミ', 'かけきんが たりないのう。'); return; }
      var r2 = await E.race('hayami_re');
      await E.say('ハヤミ', r2.win ? '...みごと じゃ。' : 'まだまだ わしも すてた ものでは ないのう。');
      return;
    }
    if (!E.flag('hayami_met')) {
      E.setFlag('hayami_met');
      await E.letterbox(true);
      await E.say('ハヤミ', '...その コメット。ゲンゾウの くるまだな。');
      await E.say('ハヤミ', 'わしは ハヤミ。|むかし この みちで ゲンゾウと きそいあった。');
      await E.say('ハヤミ', 'ゲンゾウが ヤシャで かち、わしは まちを でた。|...ヌシを たおした まごが いると きいてな。');
      await E.say('ハヤミ', 'さいごに この きゅうどうで|ひとつ はしって くれんか。');
      await E.letterbox(false);
    }
    var c = await E.ask('ハヤミ', 'かけるものは なにも いらん。どうじゃ?', ['はしる', 'まだ']);
    if (c !== 0) { await E.say('ハヤミ', '...まっておる。'); return; }
    var r = await E.race('hayami1');
    if (r.win) {
      await E.letterbox(true);
      E.bgm('event');
      await E.say('ハヤミ', '...みごとだ。|ゲンゾウの はしりが そこに あった。');
      await E.say('ハヤミ', 'これを わたそう。|ゲンゾウが まちを でる わしに あずけた ものだ。');
      await E.giveFurniture('helmet');
      await E.say('ハヤミ', '「いつか この ヘルメットを とりに いく」と いっておった。|...まごが きた わけじゃな。');
      await E.say('ハヤミ', 'いい まごを もったな、ゲンゾウ。');
      E.setFlag('hayami_beaten');
      E.S.flags.goal = '';
      await E.letterbox(false);
      E.bgm('pass');
      await E.msg('{y}じいちゃんの ヘルメット{w} は いえに かざろう。|...おめでとう! すべての かしらを たおした!');
    } else if (!r.retire) {
      await E.say('ハヤミ', 'まだまだ じゃな。だが すじは いい。|ゲンゾウも はじめは そうだった。');
    }
  }
  RR.Maps.layer('kyudo', 'post', {
    when: function (S) { return S.stage >= 5; },
    build: function (M) { M.prop('car', 12, 3, { model: 'comet', color: 'ghost' }); },
    npcs: [
      { id: 'hayami', x: 11, y: 5, dir: 'down', look: 'hayami', talk: hayami },
      { id: 'ta', x: 16, y: 4, dir: 'left', look: 'man1', when: function (S) { return S.flags.hayami_beaten; }, talk: K.timeAttack('タイムキーパー', 'ta_kyudo') }
    ]
  });
})();
