/* 複数のマップにまたがる物語の処理（シノブのお守り、最終戦後の結末） */
(function () {
  'use strict';
  var RR = window.RR;
  var Story = RR.Story = {};

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
