/* scenario.js ― 会話・ストーリー文（日本語）
 * 話者: luca=ルカ(主人公) noa=ノア(ナビAI) voice=救難信号の声 machine=機械生命体 mother=マザー機
 * 1画面最大3行・1行 約20文字 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;

  var SPEAKERS = {
    luca:    { name: 'ルカ',         portrait: 'luca',    blip: 520, kind: 'voice', color: '#ffe8a0' },
    noa:     { name: 'ノア',         portrait: 'noa',     blip: 700, kind: 'ai',    color: '#a0f0ff' },
    voice:   { name: '？？？',       portrait: 'voice',   blip: 380, kind: 'static', color: '#d0d0ff' },
    machine: { name: '機械生命体',   portrait: 'machine', blip: 240, kind: 'machine', color: '#ff9090' },
    mother:  { name: 'マザー機',     portrait: 'mother',  blip: 170, kind: 'machine', color: '#ff80d0' }
  };

  // 各エントリ: [話者, 文, (任意)表示名上書き]
  var D = {
    st1_intro: [
      ['noa', '救難信号を受信しました。\nケフェウス採掘コロニーから。\n座標は、前方です。'],
      ['voice', 'こちらケフェウス採掘コロニー……。\n機械の群れが……誰か、聞こえますか。', 'コロニーの声'],
      ['luca', '聞こえてる。今、向かってる。\nあと少しだけ、持ちこたえて。'],
      ['noa', '敵影を多数確認。機械生命体です。\nルカ、ご武運を。']
    ],
    st1_mid: [
      ['machine', 'ミツケタ。チシテキセイメイタイ。\nカイセキ ヲ カイシ。'],
      ['noa', '通信を傍受しています。\nこの偵察機が、母艦へ報告を……！'],
      ['luca', '報告させるもんか。落とす！']
    ],
    st1_boss: [
      ['machine', 'ホウコク カンリョウ。\nセンメツ ジュンビ。'],
      ['voice', '……ザザ……また、ひとり……。\nこどもたちを、はやく……', 'コロニーの声'],
      ['luca', '待って、まだ間に合う！\nノア、全速力で——！']
    ],
    st1_end: [
      ['voice', '……だれか、いますか。', 'コロニーの声'],
      ['luca', 'ここにいる。聞こえてる、ここに——'],
      ['noa', '……通信、途絶しました。\nコロニーの灯が、消えていきます。'],
      ['luca', '間に合わなかった……。\n次の信号を、探そう。']
    ],

    st2_intro: [
      ['noa', '新たな救難信号です。海洋惑星リュミエ。\n避難船団からの発信です。'],
      ['voice', 'おそらが、おかしいの。\nおかあさんが、ずっとこわいかおをしてる。', '少女の声'],
      ['luca', '大丈夫。お姉さんが行くから。\n窓から離れて、毛布をかぶって待ってて。'],
      ['noa', '機械生命体は海中に潜行しているようです。\n足元にも注意を。']
    ],
    st2_mid: [
      ['machine', 'スイチュウ ニ ハンノウ。\nショウキョ ヲ カイシ。'],
      ['luca', '海の中から……！\nそこをどいて。あの子が待ってるの！']
    ],
    st2_boss: [
      ['voice', 'おねえさん、そとからおおきなおとが。\n……こわいよう。', '少女の声'],
      ['luca', '大丈夫！\nお姉さんがすぐに行くからね！'],

      ['machine', 'ボカン ショウキ。 アイテ ハ イチ。\nソウコウゲキ ヲ ジッシ。'],
      ['noa', '巨大な母艦反応。リヴァイアサン級です。\n避難船団の座標と重なっています！'],
      ['luca', 'やらせない……！\nこの海には、あの子がいるんだ！']
    ],
    st2_end: [
      ['noa', '避難船団の位置に生体反応……ありません。\n発信は、数分前に止まっていました。'],
      ['luca', 'あと数分、早ければ……。\nあの子の声、まだ耳に残ってるのに。'],
      ['noa', 'ルカ。あなたの責任では——'],
      ['luca', '……わかってる。次に行こう。']
    ],

    st3_intro: [
      ['noa', '小惑星帯の研究基地アステリアから、\n暗号化された信号を受信しました。'],
      ['voice', '落ち着いて聞いてほしい。\n彼らは、私たちを憎んではいない。', '研究員の声'],
      ['voice', 'ただ、命令に従っているだけだ。\n「知的生命体を殲滅せよ」\n——それだけの存在だ。', '研究員の声'],
      ['luca', '命令……？ 意思が、ないってこと？']
    ],
    st3_mid: [
      ['machine', 'ゲイゲキ ジュンビ。\nリョウイキ ニ シンニュウ。'],
      ['noa', '迎撃機です。光学反射による多重照射、\n来ます！']
    ],
    st3_boss: [
      ['machine', 'シレイ ハ ヒトツ。 ショウキョ セヨ。'],
      ['luca', '憎しみもない。怒りもない。\n……それでも、あなたたちは奪うんだね。'],
      ['noa', 'アーセナル級母艦、火器管制オンライン。\nルカ、来ます！']
    ],
    st3_end: [
      ['noa', '基地の記録を回収しました。\n機械生命体は、一つの存在から\n命令を受けています。'],
      ['noa', 'その名は「マザー機」。\n全艦隊へ命令を送り続ける中枢です。'],
      ['luca', 'そいつを止めれば、終わるんだね。\n……でも、間に合わなかった人たちは……。']
    ],

    st4_intro: [
      ['noa', '恒星環状都市ソレイユより救難信号。\n……ですが、様子がおかしいです。'],
      ['voice', 'こちら、ソレイユ。\n救難信号を発信しています。\n繰り返します。救難信号を、発信しています。', '自動音声'],
      ['noa', '信号の発信日時を解析しました。\n……百年前から、繰り返されています。'],
      ['luca', '……百年。\n誰も、聞いてくれなかったんだ。']
    ],
    st4_mid: [
      ['machine', 'ネンショウ ロ ニ ハンノウ。\nセイメイタイ ノ コンセキ ナシ。'],
      ['luca', '都市はもう、ないんだね。\n……それでも信号は、まだ燃えてる。']
    ],
    st4_boss: [
      ['noa', '母艦ソーラーイーターが、\n恒星を吸収しています。\n都市の残骸ごと……！'],
      ['luca', '誰もいなくても、ここは誰かの家だった。\n……もう、これ以上壊させない！']
    ],
    st4_end: [
      ['voice', '救難信号を発信しています。\n繰り返します……', '自動音声'],
      ['luca', 'もう、いいよ。\n私がちゃんと、聞いたから。'],
      ['noa', '……信号、停止しました。\nルカ、少し休みましょう。'],
      ['luca', 'ううん。行く。\nまだ、間に合う場所があるかもしれない。']
    ],

    st5_intro: [
      ['noa', '機械生命体の艦隊が、一つの方向へ\n進んでいます。その先は——\n星図上、未踏の銀河系です。'],
      ['luca', '天の川銀河……。\nそこにも知的生命体が！？'],
      ['noa', 'まだ、彼らは見つけていません。\nですが、母艦が通信を試みています。'],
      ['luca', 'ここで止める。\nこれ以上の惨劇は起こさせない。']
    ],
    st5_mid: [
      ['machine', 'ゲート ヲ ケンシュツ。\nシンニュウシャ ヲ ハイジョ。'],
      ['noa', 'ワープゲートの門番です。\n突破しなければ、母艦には届きません！']
    ],
    st5_boss: [
      ['mother', 'チシテキセイメイタイ ヲ ハッケン。\nセンメツ ヲ ゾッコウ。'],
      ['luca', 'あなたが、マザー機。\n何も望まず、何も憎まず、\nただ消し続けてきた。'],
      ['noa', 'ルカ。あなたの背後には、\nまだ守れる光があります。'],
      ['luca', 'ええ。——この先には、誰も行かせない！']
    ],
    st5_end: [
      ['mother', 'メイレイ ……ケンシュツ ……フノウ……'],
      ['noa', '艦隊の動きが止まりました。\n命令の送信が、途絶えています。'],
      ['luca', 'やっと……始まるんだ。\n誰もが夢見る宇宙が。']
    ],
    // 通常エンディング（暗い結末）へ向かう場合の差し替え。最後のルカの台詞だけが違う（resolve 参照）
    st5_end_dark: [
      ['mother', 'メイレイ ……ケンシュツ ……フノウ……'],
      ['noa', '艦隊の動きが止まりました。\n命令の送信が、途絶えています。'],
      ['luca', '……止まった。\n……ただ、それだけ。']
    ],

    ending: [
      ['noa', 'ルカ、前方に小さな惑星反応です。\n……青い星。恒星の第三惑星。'],
      ['luca', '……きれい。\n誰にも見つかっていない、生命の星。'],
      ['luca', '間に合わなかった。何度も。\nでも——ここには、まだ間に合う星がある。'],
      ['noa', '残存機は、まだ宇宙に散っています。\n進路を変えましょう。彼らに、\nあの星を見つけさせないために。'],
      ['luca', 'うん。いつか、あの星が宇宙へ出る日まで。\n私が護る。']
    ],

    // 通常エンディング（暗い結末）。地球は現れない。希望はなく、機械生命体を殲滅するためだけに進む覚悟
    ending_dark: [
      ['noa', '周辺宙域の走査、完了しました。\n……応答する者は、いません。'],
      ['luca', '誰も……助けられなかった。\n一人も、間に合わなかった。'],
      ['noa', 'あなたが応えた声は、無駄では\nありませんでした。……きっと。'],
      ['luca', 'ねえノア、私はなんのために……'],
      ['luca', 'ううん、まだ残存機は宇宙に\n散っているんだ。行こう……']
    ]
  };

  // 表情タグ（各セリフの 4 番目に付与）。normal / worry / sad / smile / determined / surprise
  var TAGS = {
    st1_intro: ['normal', 'normal', 'determined', 'normal'], st1_mid: ['normal', 'worry', 'determined'], st1_boss: ['normal', 'worry', 'surprise'],
    st1_end: ['sad', 'sad', 'worry', 'sad'],
    st2_intro: ['normal', 'normal', 'smile', 'normal'], st2_mid: ['normal', 'determined'], st2_boss: ['normal', 'smile', 'normal', 'surprise', 'determined'],
    st2_end: ['worry', 'sad', 'worry', 'sad'],
    st3_intro: ['normal', 'normal', 'normal', 'surprise'], st3_mid: ['normal', 'worry'], st3_boss: ['normal', 'sad', 'normal'],
    st3_end: ['normal', 'normal', 'sad'],
    st4_intro: ['normal', 'normal', 'worry', 'sad'], st4_mid: ['normal', 'sad'], st4_boss: ['surprise', 'determined'],
    st4_end: ['normal', 'sad', 'worry', 'determined'],
    st5_intro: ['normal', 'worry', 'normal', 'determined'], st5_mid: ['normal', 'normal'], st5_boss: ['normal', 'determined', 'normal', 'determined'],
    st5_end: ['normal', 'normal', 'smile'], st5_end_dark: ['normal', 'normal', 'sad'],
    ending: ['normal', 'smile', 'sad', 'smile', 'smile'],
    ending_dark: ['worry', 'sad', 'worry', 'sad', 'determined']
  };
  Object.keys(TAGS).forEach(function (id) {
    D[id].forEach(function (line, i) { line[2] = line[2] || null; line[3] = TAGS[id][i] || 'normal'; });
  });

  // 到達ルートに応じて会話を差し替える。最終ステージ撃破後の会話は、エンディングの分岐（EB.isTrueEnding）に合わせる。
  // 実行時に EB.W（game.js が定義）を参照するため、読み込み順の影響を受けない
  function resolve(id) {
    var W = EB.W;
    if (id === 'st5_end' && W && !EB.isTrueEnding(W.diffKey, W.continues)) return 'st5_end_dark';
    return id;
  }

  EB.Scenario = { speakers: SPEAKERS, scenes: D, resolve: resolve };
})();
