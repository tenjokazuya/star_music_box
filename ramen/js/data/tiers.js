/* 店舗ティア（出店・移転先）。cost はそこへ移る費用。最後のティアを手に入れるとエンディング。 */
(function (RP) {
  'use strict';

  RP.TIERS = [
    { id: 1, name: 'ガード下の屋台',         short: '屋台',     seats: 3, rent: 300,   base: 14, mult: 1.0, queue: 2, cost: 0,
      desc: '高架下に赤提灯をともす一台の屋台。すべてはここから。', bg: 'guard' },
    { id: 2, name: '商店街の小さなお店',     short: '商店街',   seats: 4, rent: 1500,  base: 20, mult: 1.25, queue: 3, cost: 25000,
      desc: '屋根のある商店街の一角。雨の日も安心。', bg: 'arcade' },
    { id: 3, name: '駅前ラーメン店',         short: '駅前',     seats: 5, rent: 4000,  base: 30, mult: 1.7, queue: 4, cost: 120000,
      desc: '人の波が絶えない駅前。行列ができはじめる。', bg: 'station' },
    { id: 4, name: '繁華街の人気店',         short: '繁華街',   seats: 6, rent: 9000,  base: 42, mult: 2.4, queue: 5, cost: 350000,
      desc: 'ネオンまたたく夜の繁華街。取材も来る。', bg: 'town' },
    { id: 5, name: '大都会ラーメンビル',     short: '大都会',   seats: 7, rent: 18000, base: 56, mult: 3.4, queue: 6, cost: 650000,
      desc: '摩天楼のふもとの自社ビル。世界が注目する一杯。', bg: 'city' },
    { id: 6, name: '全国チェーン「天下一」本社', short: '天下一本社', seats: 8, rent: 40000, base: 72, mult: 5.0, queue: 8, cost: 1800000,
      desc: '全国に名を轟かせるラーメン王国の本社。業界の頂点。', bg: 'hq' }
  ];
  RP.FINAL_TIER = RP.TIERS.length;
})(window.RP);
