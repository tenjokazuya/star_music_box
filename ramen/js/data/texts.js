/* ゲーム内の文言（UIの文字列）を集約する。文言の調整はこのファイルだけで済む（R6）。
 *
 * 【文言のトーン】プレイヤーは屋台の店主。一人称は「俺」、威勢のいい下町の口調で、短く、体言止めと命令形を混ぜる。
 *   ・説明は「ひとこと＋効果」。堅い説明文（〜できる。〜が増える。）をそのまま並べない。
 *   ・失敗の通知も店主のぼやき（「〜ねえぞ」「〜だ！」）にして、責める調子にしない。
 *   ・ゲーム用語（コンボ・PERFECT・固定費）は意味が通る範囲でそのまま使う。
 *   ・1行は全角で最大 17 文字程度（ダイアログ幅）。長い名前は短縮名を用意する。 */
(function (RP) {
  'use strict';

  var X = RP.TEXT = {};

  // ================= 営業中 =================
  X.err = {
    slotsFull: '手が回らねえ！ 丼台が満杯だ',
    pickSlot: 'まず丼台を選びな！',
    soupDone: 'スープはもう入ってるぜ',
    notBeer: 'ビールは頼まれてねえぞ',
    beerDone: 'ビールはもう注いだぜ',
    soupFirst: 'スープが先だ！',
    noodleDone: '麺はもう入ってるぜ',
    noodleFirst: '具は麺のあとだ。麺が先！',
    topDone: 'もうのっけたぜ',
    rawGyoza: 'まだ生焼けだ、もうちょい！',
    gyozaWait: 'じっくり焼くのがコツだ',
    stockFull: '餃子の置き場が満杯だ',
    notGyoza: '餃子は頼まれてねえぞ',
    gyozaDone: '餃子はもう出したぜ',
    riceWait: 'ご飯はまだ炊けてねえ',
    notRice: 'ライスは頼まれてねえぞ',
    riceDone: 'ライスはもう盛ったぜ',
    notReady: 'まだ仕上がってねえ！'
  };
  X.info = {
    riceCook: 'ご飯、炊くぜ！',
    riceReady: 'ご飯が炊けたぜ！',
    nobi: '麺がのびちまった！ 釜をタップして捨てろ',
    burn: '餃子が焦げた！ タップして捨てろ'
  };
  X.pop = {
    accept: 'あいよっ！',
    noodleBad: '茹で加減が違う…',
    extraTop: '頼まれてねえぞ',
    trash: 'やり直しだ！',
    cold: '冷めてる！',
    coldAngry: '冷めてる！！',
    angryOrder: 'まだ〜！？',
    angryWait: 'もう帰る！',
    closing: 'また来るね',
    wrongSoup: '頼んだのと違う！',
    tip: '心づけ+',
    serve: ['イマイチ…', 'OK', 'GOOD！', 'PERFECT！'],
    pour: { perfect: 'ぴったり！', ok: 'まずまず', low: 'すくない…', over: 'あふれた！' },
    queueGiveUp: 'あきらめた…',
    full: '満員か…'
  };
  X.banner = {
    open: ['のれんを出すぜ！', function (day, tier, rain) { return day + '日目・' + tier + (rain ? '・雨' : ''); }],
    rush: ['ラッシュタイム！', '客がどっと押し寄せるぞ！'],
    close: ['ラストオーダーだ！', '残ったお客を、最後までもてなせ'],
    done: ['のれんを下ろすぜ！', ''],
    combo: function (n) { return [n + 'コンボ！', '勢いが止まらねえ！']; },
    group: ['団体さん、ご来店！', 'まとめて面倒みてやる'],
    critic: ['鋭い目の客が来た…', '評論家だ。手は抜けねえぞ'],
    drunk: ['千鳥足の客が来たぞ', 'ビールを切らすな'],
    tv: ['テレビ取材だ！', '客が押し寄せるぞ！']
  };
  X.staff = { clear: '片付けときます', accept: 'へい、ご注文は？', soup: 'スープ、入りました', noodle: '麺、上がりました', serve: 'お待ち！', default: 'はいよ！' };
  X.pour = { now: '今だ！', hold: '注ぎ…' };
  X.cell = { boil: '茹でる', nobi: 'のびた！', gyoza: '餃子', flip: '返す！', take: '取る！', trash: '捨てる', frying: '焼き中', warm: '保温', cook: '炊' };
  X.slot = { empty: '空き', serve: '提供', clearDish: '片付け' };
  X.wipe = { label: '行列', count: function (n) { return n + '人'; } };
  X.hud = { day: '日目', combo: 'コンボ', softPause: 'ポーズ' };
  X.hint = {
    takeOrder: '客をタップして、ご注文をうかがえ！',
    pickSlot: '丼台をタップして、手をつける注文を選べ！',
    waiting: '客足を待つ間に、湯を沸かしておくか',
    serve: '「提供」だ！ 熱いうちに出せ！',
    soup: function (name) { return name + 'の寸胴を押し続けろ…今だ！で離せ'; },
    noodleStart: '釜に麺を放り込め！（釜をタップ）',
    noodleWait: '麺が泳いでる…上がり頃を待て',
    noodleLift: '上がり頃だ！ 今、釜をタップ！',
    noodleLate: '茹ですぎだ！ 急げ！',
    tops: function (names) { return '具をのせろ：' + names; },
    gyoza: '餃子をこんがり焼いて、取り出せ',
    beer: 'ビールは押し続けて…泡と相談だ',
    rice: 'ご飯をよそえ（炊飯器をタップ）'
  };
  X.pause = {
    title: 'ひと休み', text: '茶でも飲んで、ひと息つけ。',
    resume: 'つづける', giveUp: '今夜は店じまい（朝へ戻る）',
    confirmTitle: 'いいのかい？', confirmText: 'ここで店じまいして、朝からやり直すぜ。\n（今夜の売上と評判は、無かったことになる）',
    no: 'やっぱり続ける', yes: '朝へ戻る'
  };
  X.tipTitle = 'ヒント：';
  X.tipOk = 'おう！';

  // ヒント（新しい設備を初めて使う日に一度だけ。cond が true で、まだ見せていないものを営業開始時に出す）
  X.TIPS = [
    { id: 'basic', title: '店の回しかた',
      text: '①客をタップして、ご注文をうかがう\n②丼台をタップして、手をつける注文を選ぶ\n③寸胴を押し続けて、いい所で離す\n④釜で麺を茹で、上がり頃にタップ\n⑤「提供」！ 熱いうちに出すんだぜ。',
      cond: function () { return true; } },
    { id: 'gyoza', title: '餃子の焼きかた',
      text: '鉄板をタップで焼きはじめだ。「返す！」が出たらタップ、「取る！」でまたタップして丼へ。ほっとくと焦げるぞ。余った分は保温ケースへ。',
      cond: function (d) { return d.grills > 0; } },
    { id: 'beer', title: 'ビールの注ぎかた',
      text: 'サーバーを押し続けて注ぐ。泡と液の按配がいい所で離すのがコツだ。',
      cond: function (d) { return d.beer; } },
    { id: 'rice', title: 'ご飯のこと',
      text: 'ご飯は炊飯器をタップでよそう。空になると炊き直しだ、ちっと待たされるぜ。',
      cond: function (d) { return d.rice; } },
    { id: 'staff', title: '仲間のこと',
      text: '仲間は黙って手伝ってくれる。その代わり給料が毎日の固定費に乗る。財布には気をつけろよ。',
      cond: function (d) { return d.wage > 0; } },
    { id: 'pots', title: '釜が増えたな',
      text: '釜が2つありゃ、麺を先に茹でておける。ただし放っておくと伸びるぞ。',
      cond: function (d) { return d.pots >= 2; } },
    { id: 'tier2', title: '客が増える',
      text: 'でかい店ほど客は増える。丼台や釜、仲間を揃えて、さばききってみせろ。',
      cond: function (d) { return d.tier >= 2; } }
  ];
  RP.TIPS = X.TIPS;

  // ================= 精算 =================
  X.result = {
    title: '今夜の勘定',
    served: 'さばいたお客', angry: '怒って帰ったお客', lost: '席に着けなかったお客',
    stars: '満足度 ★3/★2/★1/×', combo: '最大コンボ',
    sales: '今夜の売上（心づけ込み）', material: '仕入れ・ロス', rent: '家賃', upkeep: '光熱費・設備の維持', wage: '給料',
    netPlus: '今夜の儲け', netMinus: '今夜の赤字', money: 'ふところ', grade: '今夜の出来',
    bankrupt: '…金が足りねえ。払いが回らねえ…！',
    nextOk: '明日へ ▶', nextBad: 'つぎへ ▶', tapNext: 'タップで次へ', tapSkip: 'タップで飛ばす',
    unit: function (n) { return n + '人'; },
    comment: {
      S: ['今夜は神が降りてきたぜ！ どの丼も会心の出来だ。', '客の笑顔が、何よりのご馳走だな。', 'こんな夜があるから、屋台はやめられねえ。'],
      A: ['悪くねえ夜だった。この調子で行くぜ！', '腕が上がってきたな、俺も。', 'いい匂いに釣られて客が集まってきたな。'],
      B: ['まずまずだ。明日はもっとやれる。', 'なんとか回したな。ふう、一杯やりてえ。', '可もなく不可もなく。だが悪くねえ。'],
      C: ['取りこぼしが多かった…。段取りを見直すか。', '手が足りねえ夜だった。明日は仕込みを工夫しよう。', 'あと一歩だった。悔しいぜ。'],
      D: ['散々な夜だったな…。屋台に雨はつきものだ。', '悔しいが、これも修行だ。明日また立つぜ。', '今夜は忘れよう。明日の湯を沸かすだけだ。']
    }
  };

  // ================= 朝 =================
  X.morning = {
    title: '朝の仕込み', plan: '今日の段取り', dayTitle: function (n) { return n + '日目の朝'; },
    menu: {
      open: 'のれんを出す（営業開始）', shop: '買い物（ショップ）', move: '店を構える（出店・移転）',
      records: '帳面（きろく）', ending: 'エンディングを見返す', settings: 'せってい', title: 'タイトルへ'
    },
    weather: '天気', clear: '晴れ', rain: '雨（客足減）', seats: '席', seatUnit: function (n) { return n + '席'; },
    fixed: '固定費', perDay: '/日', last: '昨夜', grade: function (g) { return '出来 ' + g; }, served: function (n) { return 'さばき' + n + '人'; },
    first: 'さあ、最初の営業だ！', warn: '※固定費が払えねえかも！', tv: '★テレビ取材の日', cm: function (n) { return 'CM放映中 あと' + n + '日'; },
    soft: 'どれにする？',
    quitTitle: 'タイトルへ', quitText: '朝の支度までは保存されてる。タイトルに戻るかい？', quitNo: 'やめとく', quitYes: 'タイトルへ'
  };

  // ================= ショップ =================
  X.shop = {
    title: 'ショップ', money: '所持金', detail: 'ひとこと', buy: '買う', done: '揃ってる', maxed: function (lv) { return 'Lv' + lv + ' MAX'; }, owned: '揃ってる',
    short: function (n) { return 'あと ' + n + ' 足りねえ'; },
    locked: { tier: function (t) { return t + 'に出てから'; }, need: function (n) { return 'まず「' + n + '」を'; }, ending: '？？？' },
    cats: { equip: '道具', menu: '品書き', staff: '仲間', decor: '飾り・演出', endless: '大勝負' },
    confirmTitle: 'どうする？', confirm: function (name, yen) { return '「' + name + '」か。' + yen + '、払うかい？'; }, confirmYes: 'よし、買った！', confirmNo: 'やめとく',
    hire: '採用！', back: 'もどる', soft: '◀ ▶ で棚を替える'
  };

  // ================= 出店・移転 =================
  X.move = {
    title: '出店・移転', money: '所持金', lead: 'どこで勝負する？ 腕に自信があるなら、どこへだって。',
    here: '今のお店', past: '移転ずみ', go: 'ここで勝負する', short: function (n) { return 'あと ' + n; },
    seats: '席', rent: '家賃', price: '客単価', flow: '客足の目安', perDay: '/日', pax: function (n) { return n + '人/日'; },
    confirm: function (name, cost, money, final) {
      return name + 'で一旗あげるぜ。\n費用 ' + cost + '（所持金 ' + money + '）' + (final ? '\nここが、業界の頂点だ。' : '\n道具も飾りも仲間も、みんな連れていく。');
    },
    confirmTitle: '店を構える', finalTitle: '最終決断', yes: '移ろう！', yesFinal: '天下を取る！', no: 'やめとく',
    moved: '新しい店だ！', movedFinal: 'ついに頂点へ！', carry: '道具も、飾りも、仲間も連れて――新たな舞台へ。'
  };

  // ================= せってい・きろく =================
  X.settings = {
    title: 'せってい', master: '全体の音量', bgm: 'BGM', sfx: '効果音', amb: '環境音', mute: '消音', muteOn: 'ミュート中', muteOff: 'オフ',
    bgmPick: '営業中のBGM', hint: '◀ ▶ キー / スライダーをなぞって調整', back: 'もどる',
    bgmNames: { auto: '標準', enka: '夜の屋台節', jazz: '深夜ジャズ', rock: '替え玉ロック' }
  };
  X.records = {
    title: 'きろく', achTitle: function (a, b) { return '実績 ' + a + ' / ' + b; },
    rows: { days: 'のれんを出した日数', tier: 'いまのお店', rep: '評判', sales: 'これまでの売上', served: '出した丼の数', perfect: 'PERFECT（★3）', angry: '怒らせたお客', combo: '最大コンボ',
            spent: '使ったお金', maxMoney: '最高のふところ', donate: '商店街への寄付', world: '海外店舗 / 宇宙', bankrupt: '倒産した回数', play: 'プレイ時間' },
    foot: 'ここまで引いてきた屋台の道のりだ。', recent: function (d) { return '最近：' + d; }, soft: '画面タップ / ◀▶ でページ切替', unlockedHide: '？？？？？'
  };

  // ================= タイトル周り =================
  X.boot = { tap: '画面をタップ（キーでも）', go: 'のれんを出します…' };
  X.title = {
    menu: { continue: 'つづきから', fresh: 'はじめから', howto: 'あそびかた', settings: 'せってい' },
    soft: '選んで決める',
    errTitle: 'おっと', errText: 'セーブデータが読み込めなかった。',
    newTitle: 'はじめから', newText: 'いまのセーブは消えちまうぜ。\n本当に最初からやるかい？', newNo: 'やめとく', newYes: '消してはじめる',
    save: function (day, tier, money) { return day + '日目・' + tier + '・' + money; }
  };
  X.opening = [
    { text: '会社が潰れた夜。\n退職金と、古びた一台の屋台だけが俺に残った。', mood: 'sour' },
    { text: 'ガード下の片隅。ここが俺の城だ。\n電車の轟音も、今夜はなんだか心地いい。', mood: 'normal' },
    { text: '小さな屋台だが、一杯のラーメンに\n全部を賭けてやる。', mood: 'normal' },
    { text: '目指すは――天下一！\nまずは今夜の一杯から、はじめようじゃねえか。', mood: 'happy' }
  ];
  X.howto = {
    title: 'あそびかた', back: 'もどる', soft: '画面の左右タップでページをめくる',
    pages: [
      { title: 'この商売', lines: [
        'ガード下の屋台から、全国チェーンの頂点を目指す。',
        '',
        '毎晩ラーメンを出して、銭を稼ぐ。',
        'その銭で道具を揃え、品書きを増やし、',
        '店をでかくしていくんだ。',
        '',
        '固定費（家賃や給料）が払えなくなったら、店じまい。',
        'セーブは「一日の終わり」に自動で入る。' ] },
      { title: '一杯の作りかた', lines: [
        '① 客をタップして、ご注文をうかがう',
        '② 丼台を選び、寸胴を押し続けてスープを注ぐ',
        '　（いい所で離す！）',
        '③ 釜に麺を入れ、上がり頃にもう一度タップ',
        '④ 具・餃子・ビール・ライスを揃える',
        '⑤ 「提供」をタップ！ 熱いうちに出せ',
        '',
        '食べ終わった丼は、タップして下げておけよ。' ] },
      { title: 'コツ', lines: [
        '・ 冷めた一杯を出すと、客は怒って帰る',
        '・ 麺は茹ですぎると伸びる。釜をタップして捨てろ',
        '・ 評判が上がるほど、客は増える',
        '・ ★3（PERFECT）が続けばコンボで心づけが増える',
        '・ 銭は道具・品書き・仲間・飾りに使える',
        '・ 出店・移転は朝の帳場からいつでも覗ける',
        '　どこを目指すかは、あんたの自由だ。' ] },
      { title: 'キーボード', lines: [
        '客 1〜8　丼台 Q W E R T Y　釜 A S D F',
        '寸胴 Z X C V（押し続ける）',
        '具 H J K L ;　餃子 G B　ライス M',
        'ビール ,（押し続ける）　取り出し N',
        '提供 Space / Enter　作り直し Backspace',
        'ポーズ Esc / P　フルスクリーン Alt+Enter',
        '',
        'ゲームパッドは十字キー＋Aボタンでメニュー操作。' ] }
    ]
  };
  X.gameover = {
    title: '倒産…', l1: '払いが回らず、のれんを下ろすことになった。', l2: 'それでも、屋台の灯は消えねえ。もう一度、火を入れよう。',
    retry: '朝からやり直す', fresh: '最初からはじめる', title2: 'タイトルへ'
  };

  RP.TEXT_VERSION = 1;
})(window.RP);
