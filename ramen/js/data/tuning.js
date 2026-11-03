/* 営業パートの調整値（数値バランスの正本）。 */
(function (RP) {
  'use strict';

  RP.TUNE = {
    daySec: 150,            // 営業時間（実時間の秒）= ゲーム内 18:00〜24:00
    openMin: 18 * 60,       // 開店時刻（分）
    dayMin: 360,            // 営業のゲーム内分数
    lastOrderSec: 136,      // これ以降は新規来店なし
    closeGraceSec: 28,      // 閉店後、居残りの客を待つ最大秒数

    enterSec: 0.7,          // 行列(ワイプ)から席へ移る時間
    orderWait: 15,          // 注文を聞いてもらえるまで我慢する秒数
    queueWait: 26,          // 行列で待ってくれる秒数
    autoAcceptDelay: 0.9,   // 券売機・注文係の受付遅延
    patBase: 38,            // 料理待ちの基本忍耐(秒)
    patPerItem: 7,          // 品数ごとの加算
    eat: [3.4, 5.2],        // 食べている秒数

    pour: {
      speed: 0.62,          // 1秒あたりの上昇量（満タン=1.0）
      soupMid: 0.80, soupHalf: 0.085, soupOkHalf: 0.19, ladleStep: 0.022,
      beerMid: 0.78, beerHalf: 0.075, beerOkHalf: 0.17
    },
    noodle: {
      perfTol: 0.70, okTol: 1.60, strainerStep: 0.25, stoveStep: 0.12, lock: 0.45
    },
    heat: {
      decay: 1.5,           // 丼の冷める速さ(1秒あたり)
      heaterStep: 0.28,     // 丼ウォーマー1Lvあたりの緩和
      cold: 25,             // これ未満で客が激怒
      warm: 50, hot: 70,
      noodleBoost: 10
    },
    gyoza: { cook1: 3.5, flipWindow: 3.2, flipGood: 1.7, cook2: 4.0, doneKeep: 5.5, stockDecay: 1.0, stockKeepStep: 0.35 },
    rice: { stock: 6, cookTime: 10 },
    staff: { delay: 1.1 },

    score: {
      soup:   { perfect: 1.0, ok: 0.75, low: 0.55, over: 0.6, wrong: 0.15 },
      noodle: { perfect: 1.0, ok: 0.72, bad: 0.35 },
      beer:   { perfect: 1.0, ok: 0.75, low: 0.5, over: 0.65 },
      starBad: 0.5, star1: 0.75, star2: 0.9
    },
    pay: { bad: 0.5, s1: 0.85, s2: 1.0, s3: 1.15, tip1: 0.0, tip2: 0.08, tip3: 0.20 },
    rep: { s3: 0.2, s2: 0.08, s1: 0.02, bad: -0.4, angry: -1.2, order: -0.7, queue: -0.15, critic3: 2.5, critic2: 0.25, critic1: -1.6 },
    cost: { material: 0.32, waste: 0.2 }   // 原価率（売値に対して）・捨てた時の損失率
  };
})(window.RP);
