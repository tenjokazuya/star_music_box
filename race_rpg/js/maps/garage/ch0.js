/* ガレージ: 序章 — テツからコメットを受け取る */
(function () {
  'use strict';
  var RR = window.RR;
  async function intro(E) {
    E.setFlag('got_car');
    await E.letterbox(true);
    await E.emote('tetsu', '!');
    await E.move('tetsu', 'D3L1');
    E.face('tetsu', 'player');
    await E.say('テツ', 'おう、{N}。おおきく なったな。');
    await E.say('テツ', 'おまえの じいさん... ゲンゾウさんが いなくなって|もう はんとし か。いえも ガレージも そのまま に してある。');
    await E.say('テツ', 'それと... こいつだ。');
    E.face('tetsu', 'left');
    await E.camera(3, 5, 2);
    await E.wait(30);
    await E.say('テツ', 'ゲンゾウさんの コメット。|おまえに のこすって いってた。');
    await E.say('{N}', 'じいちゃんの...');
    await E.cameraReset();
    E.face('tetsu', 'player');
    await E.say('テツ', 'ずっと ねむってたから あちこち へたってる。|せいびと しゅうりは おれに まかせな。');
    await E.say('テツ', 'パーツを かえたけりゃ まちの パーツ ショップで かってきな。|ここで つけてやる。');
    E.sfx('get');
    await E.msg('{y}コメット{w} を うけとった!');
    await E.say('テツ', '...それと ひとつ。この まちの よるは とうげが しゅやく だ。');
    await E.say('テツ', 'はしりやたちが あつまって かねを かけて しょうぶ してる。|ゲンゾウさんも むかしは そうだった。');
    await E.say('テツ', 'まずは まちを ひとまわり してみな。|よるの コンビニの まえには わかい れんちゅうが たむろ してるぞ。');
    await E.say('テツ', 'いえは となりだ。じいさんの いえ、そのまま つかって いい。');
    await E.move('tetsu', 'R1U3');
    E.face('tetsu', 'down');
    await E.letterbox(false);
    E.goal('コンビニに いってみよう');
  }
  RR.Maps.layer('garage', 'ch0', {
    when: function (S) { return S.stage === 0; },
    events: [{ id: 'intro', on: 'auto', once: true, when: function (S) { return !S.flags.got_car; }, run: intro }],
    npcs: [{
      id: 'tetsu', x: 8, y: 5, dir: 'down', look: 'tetsu', talk: async function (E) {
        if (E.flag('kenta_lost') && !E.flag('tetsu_hint0')) {
          E.setFlag('tetsu_hint0');
          await E.say('テツ', 'ケンタに まけたって? はは。|タイヤも ブレーキも へたってるからな。');
          await E.say('テツ', 'しゅうり すれば すこしは ましに なる。|おかねが ないなら ミオの ところで バイトでも してきな。');
        }
        return RR.Garage.tetsuMenu(E);
      }
    }]
  });
})();
