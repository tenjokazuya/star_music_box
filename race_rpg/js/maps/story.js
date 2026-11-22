/* 複数のマップにまたがる物語の処理（シノブのお守り、最終戦後の結末） */
(function () {
  'use strict';
  var RR = window.RR;
  var Story = RR.Story = {};

  // ---- 頭（かしら）に挑む条件: そのパーキングの走り屋に全員勝っていること ----
  Story.GATES = {
    saki: { stage: 1, need: ['minato', 'kaori'], goal: 'ツヅラとうげの サキに かつ' },
    gou: { stage: 2, need: ['ryu', 'nobu'], goal: 'ヘビノセの ゴウに かつ', when: function (S) { return S.flags.kurosawa_met; } },
    shinobu: { stage: 3, need: ['tamaki'], goal: 'キリガタニの シノブに かつ' },
    kurosawa: { stage: 4, need: ['jin', 'kai'], goal: 'ヤシャだけの クロサワに かつ' }
  };
  // まだ勝っていない走り屋の名前
  Story.remaining = function (E, boss) {
    return Story.GATES[boss].need.filter(function (id) { return !E.won(id); }).map(function (id) { return RR.Data.rivals[id].name; });
  };
  Story.names = function (list) { return list.join('と '); };
  // 走り屋に勝った後: その場の全員に勝ったら知らせて、目的を頭に戻す
  Story.afterFreeWin = async function (E, rivalId) {
    for (var boss in Story.GATES) {
      var g = Story.GATES[boss];
      if (g.stage !== E.stage || g.need.indexOf(rivalId) < 0) continue;
      if (Story.remaining(E, boss).length || E.flag('gate_' + boss)) continue;
      if (g.when && !g.when(E.S)) continue;
      E.setFlag('gate_' + boss);
      E.sfx('get');
      await E.msg('{y}ここの はしりやに みとめられた!{w}|' + RR.Data.rivals[boss].name + 'に いどもう。');
      E.goal(g.goal);
    }
  };
  // 頭の断り台詞。まだ挑めないなら true を返す
  Story.gateCheck = async function (E, boss, lines) {
    var rest = Story.remaining(E, boss);
    if (!rest.length) return false;
    var key = 'gate_told_' + boss;
    var list = E.flag(key) ? (rest.length === 1 ? lines.one : lines.again) : lines.first;
    E.setFlag(key);
    var nm = Story.names(rest);
    for (var i = 0; i < list.length; i++) await E.say(RR.Data.rivals[boss].name, list[i].split('{who}').join(nm));
    E.goal(nm + 'に かつ');
    return true;
  };

  // シノブにお守りを返す（喫茶店・キリガタニのどちらでも）
  Story.returnOmamori = async function (E) {
    E.setFlag('shinobu_quest');
    await E.say('{N}', '(じんじゃで ひろった おまもりを わたした)');
    await E.say('シノブ', '......!|...ありがとう。だいじな ものなの。');
    await E.say('シノブ', 'おれいに これを。|つかいかけ だけど まだ はしれる。');
    RR.Data.addPart('tire_hard', 85);
    E.sfx('get');
    await E.msg('{y}ハード コンパウンド{w} を もらった!|(テツさんに つけて もらおう)');
  };

  // クロサワに勝った後の結末 → エンディング → クリア後の世界へ
  Story.finale = async function (E) {
    await E.letterbox(true);
    E.bgm('event');
    await E.say('クロサワ', '...まけた か。');
    await E.say('クロサワ', 'ゲンゾウに まけた よるも|こんな ふうに そらが しろんで いた。');
    await E.say('クロサワ', 'やくそくだ。|ガレージの はなしは なかった ことに しよう。');
    await E.say('クロサワ', '...いい はしりだった。|また いつでも ヤシャに こい。');
    await E.say('テツ', '{N}! やったな...!|ゲンゾウさんに みせて やりたかったよ。');
    await E.say('ミオ', 'かった...! ほんとに かったんだね!');
    if (E.flag('shinobu_quest')) await E.say('シノブ', '...おめでとう。|きりの よるに また はしりましょう。');
    await E.say('サキ', 'まったく... とんでもない やつが でてきた もんだね。');
    await E.say('ゴウ', 'うおお! さいこうの しょうぶ だったぜ!');
    await E.say('ケンタ', 'おれが さいしょに しょうぶ した あいて なんだぜ!|みんなに じまん しちゃおう!');
    await E.giveFurniture('trophy_kurosawa');
    RR.Data.giveFurniture('photo', 1);
    await E.msg('みんなで よあけの そらを みあげた。');
    await E.letterbox(false);
    await E.ending();
    // ---- クリア後 ----
    var S = E.S;
    S.stage = 5;
    S.cleared = true;
    S.flags.ending = true;
    S.flags.goal = 'きゅうどうの うわさを たしかめる';
    await RR.Field.warpTo({ map: 'home', x: 5, y: 5, dir: 'down' });
    E.save(true);
    await E.msg('{N}は いえに かえってきた。|(クリアご の きろくを セーブ しました)');
    await E.msg('へやに {y}みんなの しゃしん{w} と {y}ヤシャの トロフィー{w} が とどいている。|もようがえ で かざろう。');
  };
})();
