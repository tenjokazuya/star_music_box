/* キリハラ町: 2章 — ガレージの前にクロサワが現れ、土地を賭けた勝負を持ちかける */
(function () {
  'use strict';
  var RR = window.RR;
  async function event(E) {
    E.setFlag('kurosawa_met');
    await E.letterbox(true);
    E.bgm('tension');
    await E.camera(16, 32, 2);
    await E.say('クロサワ', '...この とちの けいやくは ゲンゾウさんの だいで おわりだ。|わかって いるな、テツ。');
    await E.say('テツ', 'まってくれ、クロサワさん。|ゲンゾウさんは この ガレージを...');
    await E.emote('kurosawa', '!');
    E.face('kurosawa', 'player');
    await E.cameraReset();
    await E.say('クロサワ', '...おまえが ゲンゾウの まごか。');
    await E.say('クロサワ', 'わたしは クロサワ。この あたりの とちを もっている。|そして ヤシャだけで はしっている。');
    await E.say('クロサワ', 'サキに かったそうだな。|コメットが また とうげを はしっている と きいた。');
    await E.say('クロサワ', '...いいだろう。ヘビノセと キリガタニの かしらを たおして|ヤシャに こい。');
    await E.say('クロサワ', 'わたしに かてたら この とちの はなしは なかった ことに してやる。|まけたら ガレージは あけわたして もらう。');
    await E.move('kurosawa', 'L2');
    E.sfx('starter');
    await E.fadeOut(20);
    E.remove('kurosawa');
    E.S.flags.kurosawa_car_gone = true;
    E.reload();
    E.face('tetsu', 'player');
    await E.fadeIn(20);
    await E.say('テツ', '...すまない、{N}。|こんな ことに まきこんで。');
    await E.say('テツ', 'クロサワさんは ヤシャの ヌシ と よばれてる。|むかし ゲンゾウさんと なにか あったらしいが...');
    await E.say('テツ', 'やるなら しっかり じゅんびを しよう。|ヘビノセの ゴウは ターボの パワーで おしてくる。');
    await E.say('テツ', 'パーツ ショップにも あたらしい パーツが はいった らしい。|のぞいて みな。');
    await E.letterbox(false);
    E.bgm('town');
    E.goal('ヘビノセの ゴウに かつ');
  }
  RR.Maps.layer('town', 'ch2', {
    when: function (S) { return S.stage === 2 && !S.flags.kurosawa_met; },
    build: function (M) { M.prop('car', 12, 33, { model: 'orochi', color: 'black', dir: 'h' }); },
    npcs: [
      { id: 'kurosawa', x: 15, y: 32, dir: 'right', look: 'kurosawa', talk: async function (E) { await event(E); } },
      { id: 'tetsu', x: 17, y: 32, dir: 'left', look: 'tetsu', talk: async function (E) { await event(E); } }
    ],
    events: [{ id: 'kuro', x: 8, y: 32, w: 13, h: 2, on: 'step', once: true, run: event }]
  });
  // イベント後、テツがガレージ前に残る（入口はふさがない）
  RR.Maps.layer('town', 'ch2_after', {
    when: function (S) { return S.stage === 2 && S.flags.kurosawa_met; },
    npcs: [{ id: 'tetsu', x: 18, y: 32, dir: 'down', look: 'tetsu', talk: RR.MapKit.lines('テツ', ['ヘビノセは まちの きたの とうげみちを みぎだ。|ゴウは ストレートが はやい。コーナーで さを つけろ。']) }]
  });
})();
