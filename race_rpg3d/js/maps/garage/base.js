/* ガレージ: 常駐のテツ（整備メニュー・バイト）。章ごとの会話は ch*.js 側で上書きする */
(function () {
  'use strict';
  var RR = window.RR;
  var CHAT = {
    0: 'ゲンゾウさんの コメットは いい くるまだ。|だいじに のって やってくれ。',
    1: 'ツヅラの サキは ヘアピンが うまい。|タイヤの ねつに きを つけな。',
    2: 'ヘビノセは はやい コーナーが つづく。|パワーと しっかりした あしまわりが いる。',
    3: 'キリガタニは きりで さきが みえない。|コースを おぼえるまで はしりこむ しか ない。',
    4: 'ヤシャは ながい。さいごまで タイヤが もつように|はしりかたを かんがえろ。',
    5: 'おまえの おかげで この ガレージは つづいていく。|ゲンゾウさんも きっと よろこんでる。'
  };
  RR.Garage.tetsuMenu = async function (E) {
    var opts = ['せいび', 'バイト', 'はなす', 'やめる'];
    var jobOk = E.stage >= 2;
    var c = await E.ask('テツ', 'どうする?', opts);
    if (c === 0) { await E.garage(); return; }
    if (c === 1) {
      if (!jobOk) { await E.say('テツ', 'いまは てが たりてる。|そのうち タイヤこうかんを てつだって もらうかもな。'); return; }
      var a = await E.ask('テツ', 'タイヤこうかんの てつだいか。|はやく ていねいに たのむぞ。', ['やる', 'やめる']);
      if (a !== 0) return;
      var r = await E.minigame('nut');
      await E.say('テツ', r.rank === 'S' ? 'みごとな てつきだ!' : r.rank === 'C' ? 'まあ、はじめは そんなもんだ。' : 'たすかったよ。');
      return;
    }
    if (c === 2) { await E.say('テツ', CHAT[Math.min(5, E.stage)]); }
  };
  RR.Maps.layer('garage', 'base', {
    npcs: [{ id: 'tetsu', x: 8, y: 5, dir: 'down', look: 'tetsu', talk: function (E) { return RR.Garage.tetsuMenu(E); } }],
    events: [
      { x: 10, y: 6, w: 2, on: 'talk', run: async function (E) { await E.msg('さぎょうだい。|せいびの きろくが ていねいに かかれている。'); } },
      { x: 5, y: 2, w: 2, on: 'talk', run: async function (E) { await E.msg('パーツの たなだ。|ゲンゾウさんの じだいの ぶひんも ある。'); } }
    ]
  });
})();
