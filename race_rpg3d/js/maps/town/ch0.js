/* キリハラ町: 序章（stage 0）— 帰郷、ミオとの再会、ケンタとの勝負 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;

  async function arrival(E) {
    E.setFlag('intro');
    await E.letterbox(true);
    var bus = E.spawn({ id: 'bus', x: 29, y: 39, dir: 'down', solid: false, model: 'bus' });
    E.stopBgm(0);
    E.sfx('horn');
    await E.wait(30);
    await E.msg('やまあいの ちいさな まち キリハラ。');
    await E.msg('{N}は じいちゃんが のこした いえに すむため|この まちに もどってきた。');
    E.sfx('rev');
    await E.move('bus', 'D6', { speed: 1.2, force: true });
    E.remove('bus');
    E.bgm('town');
    await E.say('{N}', '...ひさしぶりの キリハラだ。');
    E.spawn({ id: 'mio', x: 31, y: 33, dir: 'down', look: 'mio' });
    await E.move('mio', 'D7', { speed: 2.2 });
    await E.emote('mio', '!');
    await E.say('ミオ', '{N}! やっぱり {N}だ! おかえり!');
    await E.say('ミオ', 'おぼえてる? ミオだよ。|こどもの ころ よく いっしょに あそんだ でしょ。');
    await E.say('{N}', 'ミオ! ひさしぶり。');
    await E.say('ミオ', 'テツさんが ガレージで まってるよ。|じいちゃんの くるまの ことで はなしが あるって。');
    await E.say('ミオ', 'ひさしぶりで みちも わすれてる でしょ?|ついてきて!');
    E.setFlag('met_mio');
    E.S.flags.goal = 'ガレージに いこう';
    // ミオが先導し、主人公は1歩うしろを ついていく（バス停 → 住宅地の通り → ガレージの前）
    await Promise.all([
      E.move('mio', 'U7L15U1', { speed: 1.6 }),
      E.move('player', 'U8L14', { speed: 1.6 })
    ]);
    E.face('mio', 'player');
    E.face('player', 'up');
    await E.say('ミオ', 'ここが じいちゃんの ガレージ。|テツさんは なかに いるよ。');
    await E.say('ミオ', 'あたしは そこの ガソリンスタンドで バイト してるの。|こまったら いつでも きてね!');
    E.move('mio', 'D1R14', { speed: 1.6 });
    await E.move('player', 'U1');
    await E.letterbox(false);
    await E.warp('garage', 'door', 0, 'up', true);
  }

  async function kenta(E) {
    if (!E.flag('got_car')) {
      await E.say('ケンタ', 'なんだよ。くるまも もってない やつに|ようは ないね。');
      return;
    }
    if (!E.flag('kenta_met')) {
      E.setFlag('kenta_met');
      await E.emote('kenta', '!');
      await E.say('ケンタ', 'あ! おまえ ゲンゾウじいさんの まごだろ。|コメットを うけついだって もう うわさに なってるぜ。');
      await E.say('ケンタ', 'おれは ケンタ。この へんじゃ いちばん はやいんだ。');
      await E.say('ケンタ', 'ちょうどいい。うらやまの さかで しょうぶ しようぜ。|まけたら 1000えん な!');
    } else {
      await E.say('ケンタ', E.flag('kenta_lost') ? 'なんだ、また まけに きたのか?' : 'どうした? にげるのかと おもったぜ。');
    }
    var c = await E.ask('ケンタ', 'うらやまざかで しょうぶ だ!', ['うける', 'やめておく']);
    if (c !== 0) { await E.say('ケンタ', 'へっ、こしぬけ!'); return; }
    if (E.money < 1000) { await E.say('ケンタ', 'かけきんの 1000えんも ないのかよ。|バイトでも して でなおしな。'); return; }
    await E.say('ケンタ', 'ついてこい!');
    var r = await E.race('kenta1');
    if (r.win) {
      await E.say('ケンタ', 'う、うそだろ...|コメットに まけるなんて...');
      await E.say('ケンタ', '...ちぇっ、やるじゃん。|これ やるよ。はじめて かった きねんに な。');
      await E.giveFurniture('trophy_kenta');
      await E.say('ケンタ', 'とうげに いくなら ツヅラの サキさんに きを つけな。|ヘアピンが とにかく はやいんだ。');
      await E.say('ケンタ', 'ツヅラとうげは まちの きたから とうげみちを|のぼった さき だよ。');
      await E.chapter(1, 'ツヅラの ヘアピン');
      E.bgm('town');
      E.goal('ツヅラとうげの サキに かつ');
      E.reload();
    } else {
      E.setFlag('kenta_lost');
      if (r.retire) await E.say('ケンタ', 'とちゅうで やめるなんて なさけないぜ!');
      await E.say('ケンタ', 'へへっ、いただき!|コメットが ないてるぜ。');
      E.goal('ケンタに リベンジ しよう');
    }
  }

  RR.Maps.layer('town', 'ch0', {
    when: function (S) { return S.stage === 0; },
    build: function (M) {
      M.prop('car', 33, 20, { model: 'tsubame', color: 'orange', dir: 'h' });
    },
    npcs: [
      { id: 'kenta', x: 35, y: 19, dir: 'down', look: 'kenta', talk: kenta },
      { id: 'yan', x: 37, y: 19, dir: 'left', look: 'man2', talk: K.lines('わかもの', ['ケンタは この へんじゃ はやい ほう だぜ。', 'まちの わかい やつらは みんな とうげに あこがれてる。']) }
    ],
    events: [
      { id: 'arrival', on: 'auto', once: true, when: function (S) { return !S.flags.intro; }, run: arrival },
      {
        x: 28, y: 1, w: 3, h: 2, on: 'step', when: function (S) { return !S.flags.got_car; }, run: async function (E) {
          await E.say('{N}', '(この さきは とうげみち...|まずは ガレージに いかないと)');
          await E.move('player', 'D2');
        }
      }
    ]
  });
})();
