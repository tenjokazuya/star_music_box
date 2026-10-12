(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * ゲーム内の文言（すべて日本語）。画面に出す文字はここに集約する。
   * 方針（企画書 §7.1）: ひらがな中心・半角スペースで区切る・失敗を責めないやさしい口調。
   */
  var TEXT = {
    title: 'ほしのオルゴール',
    subtitle: 'かたむけて、ほしのこを おうちへ',

    boot: {
      tap: 'タップ（クリック）で はじめる',
      note: 'おとが でるよ。おんりょうに ちゅうい してね',
    },

    titleScreen: {
      eyebrow: 'かたむけ パズル',
      start: 'はじめる',
      continueGame: 'つづきから',
      select: 'ステージえらび',
      help: 'あそびかた',
      settings: 'せってい',
      ending: 'エンディングを みる',
      foot: 'やじるしキー・スワイプで うごかして、Enter・タップで きめてね',
    },

    select: {
      title: 'ステージえらび',
      back: 'もどる',
      locked: 'まえの ステージを クリアすると あそべるよ',
      stars: 'あつめた ★',
      worldLock: 'まえの ワールドを クリアしてね',
      best: 'ベスト',
      moves: 'て',
      cleared: 'クリアずみ',
    },

    hud: {
      moves: 'てすう',
      par: 'さいたん',
      undo: 'もどす',
      reset: 'やりなおし',
      hint: 'ヒント',
      menu: 'メニュー',
    },

    pause: {
      title: 'ポーズ',
      resume: 'つづける',
      restart: 'やりなおす',
      help: 'あそびかた',
      settings: 'せってい',
      select: 'ステージえらびへ',
      title2: 'タイトルへ',
    },

    clear: {
      title: 'ステージクリア！',
      moves: 'てすう',
      par: 'さいたん',
      next: 'つぎへ',
      retry: 'もういちど',
      select: 'ステージえらび',
      newBest: 'ベストこうしん！',
      first: 'はじめての クリア！',
      msg3: 'パーフェクト！ さいたんで おうちへ かえれたよ',
      msg2: 'とっても じょうず！ ★3は あと すこし',
      msg1: 'クリア！ もっと すくない てすうも あるかも',
    },

    worldClear: {
      title: 'ワールドクリア！',
      stars: 'このワールドの ★',
      next: 'つぎへ',
      // 次のワールドへの一言（添字は クリアしたワールド番号）
      lines: [
        '',
        'ゆうぐれの おかの ほしのこは ぜんいん おうちへ。つぎは ひかりの どうくつへ いこう',
        'どうくつの ほしのこも おうちへ かえったよ。つぎは つきよの うみへ',
        'うみの ほしのこも ぶじに おうちへ。つぎは くもの うえへ',
        'くもの うえの ほしのこも かえれたね。いよいよ ほしの ちゅうしんへ',
        '',
      ],
    },

    ending: {
      lines: [
        'ぜんぶの ほしのこが おうちに かえりました',
        'オルゴールが やさしい うたを かなではじめます',
        'よるが あけて、みんなは すやすや ねむっています',
        'ありがとう。また よるが きたら あそびに きてね',
      ],
      fin: 'おしまい',
      credit: 'ほしの オルゴール',
      stats: { stars: 'あつめた ★', moves: 'かたむけた かいすう', time: 'あそんだ じかん' },
      toTitle: 'タイトルへ',
    },

    settings: {
      title: 'せってい',
      bgm: 'おんがく（BGM）',
      sfx: 'こうかおん',
      amb: 'かんきょうおん',
      muted: 'おとを ぜんぶ けす',
      reduced: 'えんしゅつを ひかえめに（ゆれ・きらきらを へらす）',
      marks: 'いろの めじるしを いつも だす',
      erase: 'セーブデータを けす',
      close: 'とじる',
      eraseTitle: 'セーブデータを けしますか？',
      eraseBody: 'あつめた ★と クリアの きろくが ぜんぶ きえます。もとには もどせません。',
      eraseYes: 'けす',
      eraseNo: 'やめる',
      erased: 'セーブデータを けしました',
    },

    help: {
      title: 'あそびかた',
      close: 'とじる',
      basics: [
        { title: 'ほしのこを おうちへ', text: 'ほしのこは かたむけると いっせいに すべるよ。おなじ いろの おうちに はいると かえれる。ぜんいん かえれば クリア！' },
        { title: 'かたむけかた', text: 'パソコン: やじるしキー（WASD）。スマホ: がめんを スワイプ。まちがえても「もどす」「やりなおし」が なんども できるよ。' },
        { title: 'キーボード', text: 'Z もどす ／ R やりなおし ／ H ヒント ／ Esc ポーズ ／ M おとを けす' },
        { title: '★の あつめかた', text: '「さいたん」は ほしのこが ぜんいん かえれる いちばん すくない てすう。さいたんで クリアすると ★3、すこし おおくても ★2。' },
      ],
      gimmicks: [
        { world: 2, key: 'mud', title: 'ぬかるみ', text: 'はいると その ばしょで とまるよ' },
        { world: 2, key: 'flow', title: 'ながれ', text: 'やじるしの むきに ながされて、そのまま すべりつづけるよ' },
        { world: 3, key: 'portal', title: 'ワープ（うずしお）', text: 'ひとつの うずしおに はいると、おなじ いろの もうひとつから でてくるよ' },
        { world: 4, key: 'rev', title: 'さかさのこ', text: 'さかさまの かおの こは、かたむけた むきと ぎゃくに ころがるよ' },
        { world: 5, key: 'bud', title: 'つぼみ', text: 'とおりぬけると はなが さいて かべに なる。いちどしか とおれないよ' },
      ],
    },

    stuck: 'もう おうちに かえれないよ。「もどす」で ひとつ まえへ',
    hintStuck: 'この じょうたいでは かえれないよ。「もどす」を つかってね',
    hintBusy: 'かんがえちゅう… もうすこし まってね',
    muted: 'おとを けしたよ',
    unmuted: 'おとを だすよ',
  };

  Orgel.Text = TEXT;
  if (typeof module !== 'undefined' && module.exports) { module.exports = TEXT; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
