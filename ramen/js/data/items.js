/* ショップの品揃え（設備・メニュー・従業員・飾りと演出・無限の使い道）。
 * costs[現在Lv] = 次のLvへの価格 / upkeep = 1Lvあたりの1日の維持費 / wage = 従業員の日給
 * apply(d, lv) は店の能力値 d（js/game/state.js の derive）を更新する。 */
(function (RP) {
  'use strict';

  var I = [];
  function add(o) { I.push(o); }
  function listPush(d, key, v) { if (d[key].indexOf(v) < 0) { d[key].push(v); } }

  // ================= 設備 =================
  add({ id: 'pot', cat: 'equip', name: 'もう一台の釜', desc: '釜をもう一台据える。麺を先に茹でておけるぜ。',
    max: 3, costs: [1500, 12000, 90000], upkeep: 40, apply: function (d, lv) { d.pots += lv; } });
  add({ id: 'slot', cat: 'equip', name: '丼台の継ぎ足し', desc: '同時にさばける注文が増える。段取りは任せな。',
    max: 4, costs: [1200, 9000, 60000, 400000], upkeep: 30, apply: function (d, lv) { d.slots += lv; } });
  add({ id: 'ladle', cat: 'equip', name: '目盛りおたま', desc: 'スープの「ちょうど」が狙いやすくなる。',
    max: 3, costs: [2500, 25000, 220000], upkeep: 0, apply: function (d, lv) { d.ladle = lv; } });
  add({ id: 'strainer', cat: 'equip', name: '名人の湯切り網', desc: '麺の上がり頃に、少しばかり幅ができる。',
    max: 3, costs: [3000, 30000, 260000], upkeep: 0, apply: function (d, lv) { d.strainer = lv; } });
  add({ id: 'gyoza', cat: 'equip', name: '餃子の鉄板', desc: '餃子が焼けるようになる。Lv2で鉄板が二枚だ。',
    max: 2, costs: [6000, 80000], upkeep: 120, apply: function (d, lv) { d.grills = lv; } });
  add({ id: 'warmer', cat: 'equip', name: '保温ケース', desc: '焼いた餃子の置き場が増えて、冷めにくくなる。',
    max: 2, costs: [18000, 150000], upkeep: 80, need: ['gyoza'], apply: function (d, lv) { d.stockCap += lv * 2; d.stockKeep = lv; } });
  add({ id: 'beer', cat: 'equip', name: '生ビールのサーバー', desc: 'キンと冷えた一杯。泡の加減が腕の見せどころだ。',
    max: 1, costs: [12000], upkeep: 150, apply: function (d) { d.beer = true; } });
  add({ id: 'cooker', cat: 'equip', name: 'でかい炊飯ジャー', desc: 'ライスが出せるようになる。炊きたてが自慢だ。',
    max: 1, costs: [5000], upkeep: 60, apply: function (d) { d.rice = true; } });
  add({ id: 'stove', cat: 'equip', name: '強火のコンロ', desc: '麺が早く上がる。回転が段違いによくなる。',
    max: 2, costs: [40000, 500000], upkeep: 300, apply: function (d, lv) { d.stove = lv; } });
  add({ id: 'heater', cat: 'equip', name: '丼あたため器', desc: '丼が冷めにくくなる。熱いまま出せるぜ。',
    max: 2, costs: [35000, 350000], upkeep: 150, apply: function (d, lv) { d.heater = lv; } });
  add({ id: 'comfort', cat: 'equip', name: 'くつろぎ装備', desc: 'ストーブや扇風機。客が少し長く待ってくれる。',
    max: 3, costs: [8000, 80000, 700000], upkeep: 100, apply: function (d, lv) { d.patBonus += 0.1 * lv; } });
  add({ id: 'ticket', cat: 'equip', name: '券売機', desc: 'ポチッとな。注文を勝手に受けてくれる。',
    max: 1, costs: [60000], upkeep: 200, tierMin: 2, apply: function (d) { d.ticket = true; } });

  // ================= メニュー =================
  add({ id: 'soup_miso', cat: 'menu', name: '味噌ラーメン', desc: 'コクのある味噌を仕込む。寸胴がひとつ増える。',
    max: 1, costs: [3000], apply: function (d) { listPush(d, 'soups', 'miso'); } });
  add({ id: 'soup_shio', cat: 'menu', name: '塩ラーメン', desc: 'すっきり澄んだ塩の寸胴を仕込む。',
    max: 1, costs: [12000], apply: function (d) { listPush(d, 'soups', 'shio'); } });
  add({ id: 'soup_tonkotsu', cat: 'menu', name: '豚骨ラーメン', desc: 'とろっと濃厚な豚骨の寸胴を仕込む。',
    max: 1, costs: [60000], apply: function (d) { listPush(d, 'soups', 'tonkotsu'); } });
  add({ id: 'hard_katame', cat: 'menu', name: '麺・かため', desc: '「かため」の注文が入りはじめる。',
    max: 1, costs: [1500], apply: function (d) { listPush(d, 'hards', 'katame'); } });
  add({ id: 'hard_yawa', cat: 'menu', name: '麺・やわめ', desc: '「やわめ」好きの客も呼べる。',
    max: 1, costs: [3000], apply: function (d) { listPush(d, 'hards', 'yawa'); } });
  add({ id: 'hard_bari', cat: 'menu', name: '麺・バリカタ', desc: '歯ごたえ命。「バリカタ」の注文が入る。',
    max: 1, costs: [6000], apply: function (d) { listPush(d, 'hards', 'bari'); } });
  add({ id: 'top_nori', cat: 'menu', name: 'トッピング：のり', desc: '磯の香りをひとのせ。',
    max: 1, costs: [800], apply: function (d) { listPush(d, 'tops', 'nori'); } });
  add({ id: 'top_menma', cat: 'menu', name: 'トッピング：メンマ', desc: 'コリッと歯ごたえ、メンマをのせられる。',
    max: 1, costs: [2500], apply: function (d) { listPush(d, 'tops', 'menma'); } });
  add({ id: 'top_egg', cat: 'menu', name: 'トッピング：味玉', desc: 'とろっと半熟の味玉をのせられる。',
    max: 1, costs: [6000], apply: function (d) { listPush(d, 'tops', 'egg'); } });
  add({ id: 'top_chashu', cat: 'menu', name: 'トッピング：チャーシュー', desc: '分厚いチャーシューで勝負だ。',
    max: 1, costs: [15000], apply: function (d) { listPush(d, 'tops', 'chashu'); } });
  add({ id: 'special', cat: 'menu', name: '季節限定ラーメン', desc: '今だけの一杯で客単価が上がる。段階ごとに豪華になる。',
    max: 3, costs: [20000, 200000, 2000000], upkeep: 200, tierMin: 2, apply: function (d, lv) { d.priceMul += 0.07 * lv; } });

  // ================= 従業員 =================
  add({ id: 'staff_part', cat: 'staff', name: 'バイトくん', desc: '食べ終わった丼を、黙って下げてくれる。',
    max: 1, costs: [4000], wage: 300, apply: function (d) { d.staff.clear = true; } });
  add({ id: 'staff_gyoza', cat: 'staff', name: '餃子焼きの兄ちゃん', desc: '餃子を焼いて、保温ケースに用意してくれる。',
    max: 1, costs: [25000], wage: 1200, need: ['gyoza'], apply: function (d) { d.staff.gyoza = true; } });
  add({ id: 'staff_acc', cat: 'staff', name: '注文取りの達人', desc: '客の注文を聞いて回ってくれる。声がでかい。',
    max: 1, costs: [80000], wage: 3000, tierMin: 2, apply: function (d) { d.staff.accept = true; } });
  add({ id: 'staff_noodle', cat: 'staff', name: '麺上げ職人', desc: 'スープ入りの丼に麺を茹でて入れてくれる。俺の右腕だ。',
    max: 1, costs: [250000], wage: 9000, tierMin: 3, apply: function (d) { d.staff.noodle = true; } });
  add({ id: 'staff_serve', cat: 'staff', name: 'お運びさん', desc: '出来上がった丼を、客のもとへ運んでくれる。',
    max: 1, costs: [500000], wage: 14000, tierMin: 3, apply: function (d) { d.staff.serve = true; } });
  add({ id: 'staff_top', cat: 'staff', name: '具のせ名人', desc: '具をのせるのはお手のもの。任せて安心だ。',
    max: 1, costs: [1200000], wage: 24000, tierMin: 4, apply: function (d) { d.staff.topping = true; } });
  add({ id: 'staff_soup', cat: 'staff', name: 'スープ守り', desc: '丼にスープを注いでくれる。味は俺が保証する。',
    max: 1, costs: [2500000], wage: 40000, tierMin: 4, apply: function (d) { d.staff.soup = true; } });

  // ================= 飾り・演出（お金の使い道） =================
  add({ id: 'd_lantern', cat: 'decor', name: '赤提灯', desc: 'ぼうっと灯る赤提灯。客が寄ってくる。',
    max: 3, costs: [800, 6000, 40000], upkeep: 20, apply: function (d, lv) { d.decor.lantern = lv; d.arrival += 0.02 * lv; } });
  add({ id: 'd_chime', cat: 'decor', name: '風鈴', desc: 'チリン…と涼しげな音が店先に響く。',
    max: 1, costs: [1200], apply: function (d) { d.decor.chime = 1; d.ambs.push('chime'); } });
  add({ id: 'd_plant', cat: 'decor', name: '観葉植物', desc: 'ちょっとした緑。心が和む。',
    max: 1, costs: [2500], apply: function (d) { d.decor.plant = 1; } });
  add({ id: 'd_cat', cat: 'decor', name: '招き猫', desc: '白、金、巨大と育つ。心づけがはずむ。',
    max: 3, costs: [3000, 30000, 300000], apply: function (d, lv) { d.decor.cat = lv; d.tipBonus += 0.05 * lv; } });
  add({ id: 'd_confetti', cat: 'decor', name: '紙吹雪', desc: '★3の一杯を出すと、紙吹雪が舞う。',
    max: 1, costs: [18000], apply: function (d) { d.decor.confetti = 1; } });
  add({ id: 'd_flag', cat: 'decor', name: '大漁旗', desc: '威勢のいい旗で、店先を彩る。',
    max: 1, costs: [15000], apply: function (d) { d.decor.flag = 1; } });
  add({ id: 'd_neon', cat: 'decor', name: 'ネオン看板', desc: '光るほどに客が寄る。段階ごとに派手になる。',
    max: 5, costs: [10000, 60000, 400000, 3000000, 20000000], upkeep: 200,
    apply: function (d, lv) { d.decor.neon = lv; d.arrival += 0.03 * lv; } });
  add({ id: 'd_wreath', cat: 'decor', name: '開店祝いの花輪', desc: '祝いの花輪が、ずらりと並ぶ。',
    max: 3, costs: [20000, 200000, 2000000], apply: function (d, lv) { d.decor.wreath = lv; } });
  add({ id: 'd_dog', cat: 'decor', name: '看板犬ポチ', desc: '店先に居ついた人気者。ときどき吠える。',
    max: 1, costs: [50000], upkeep: 100, apply: function (d) { d.decor.dog = 1; d.patBonus += 0.04; } });
  add({ id: 'd_gold', cat: 'decor', name: '金の丼', desc: '出す丼が金色に輝く。心づけも増える。',
    max: 1, costs: [250000], apply: function (d) { d.decor.gold = 1; d.tipBonus += 0.1; } });
  add({ id: 'd_cracker', cat: 'decor', name: 'クラッカー', desc: 'コンボ5ごとに、パァン！と炸裂する。',
    max: 1, costs: [90000], apply: function (d) { d.decor.cracker = 1; } });
  add({ id: 'd_led', cat: 'decor', name: 'LED電飾', desc: '虹色の電飾で、夜の店先が華やぐ。',
    max: 1, costs: [150000], upkeep: 400, apply: function (d) { d.decor.led = 1; } });
  add({ id: 'd_sign', cat: 'decor', name: '有名人の色紙', desc: '飾るほどに評判が上がる。',
    max: 3, costs: [80000, 800000, 8000000], apply: function (d, lv) { d.decor.sign = lv; d.repBonus += 0.1 * lv; } });
  add({ id: 'd_fireworks', cat: 'decor', name: '花火', desc: '一日の終わりと大コンボに、花火が上がる。',
    max: 1, costs: [600000], apply: function (d) { d.decor.fireworks = 1; } });
  add({ id: 'd_mirror', cat: 'decor', name: 'ミラーボール', desc: 'ラッシュ中、店先がディスコになる。',
    max: 1, costs: [1200000], upkeep: 800, apply: function (d) { d.decor.mirror = 1; } });
  add({ id: 'd_taiko', cat: 'decor', name: '和太鼓ショー', desc: '店先でドンドコ太鼓が鳴り響く。',
    max: 1, costs: [4000000], upkeep: 2000, apply: function (d) { d.decor.taiko = 1; d.arrival += 0.05; } });
  add({ id: 'd_mascot', cat: 'decor', name: 'ラーメンくん着ぐるみ', desc: '呼び込みの人気者。客が自然と集まる。',
    max: 1, costs: [10000000], upkeep: 3000, apply: function (d) { d.decor.mascot = 1; d.arrival += 0.08; } });
  add({ id: 'd_bgm_enka', cat: 'decor', name: 'BGM：夜の屋台節', desc: '演歌風の店内BGM。しみるぜ。',
    max: 1, costs: [5000], apply: function (d) { d.bgms.push('enka'); } });
  add({ id: 'd_bgm_jazz', cat: 'decor', name: 'BGM：深夜ジャズ', desc: 'ジャズ風の店内BGM。大人の夜だ。',
    max: 1, costs: [30000], apply: function (d) { d.bgms.push('jazz'); } });
  add({ id: 'd_bgm_rock', cat: 'decor', name: 'BGM：替え玉ロック', desc: 'ロック調の店内BGM。ノリがいい。',
    max: 1, costs: [120000], apply: function (d) { d.bgms.push('rock'); } });
  add({ id: 'd_amb_river', cat: 'decor', name: '環境音：夜の虫', desc: '秋の虫の声が店先に響く。',
    max: 1, costs: [4000], apply: function (d) { d.ambs.push('cricket'); } });
  add({ id: 'd_amb_train', cat: 'decor', name: '環境音：高架の電車', desc: '頭上を、ときどき電車が通っていく。',
    max: 1, costs: [6000], apply: function (d) { d.ambs.push('train'); } });

  // ================= 無限の使い道（何度でも買える） =================
  add({ id: 'e_donate', cat: 'endless', name: '商店街へ寄付', desc: '寄付すれば花火大会だ！ 評判も少し上がる。',
    endless: true, cost: function (n) { return Math.round(5000 * Math.pow(1.8, n)); } });
  add({ id: 'e_tv', cat: 'endless', name: 'テレビ取材を呼ぶ', desc: '次の営業日に取材が来る。客が殺到して、評判も跳ねる。',
    endless: true, tierMin: 2, cost: function (n) { return Math.round(50000 * Math.pow(1.9, n)); } });
  add({ id: 'e_cm', cat: 'endless', name: '全国CMを打つ', desc: 'しばらく客足が大きく伸びる。',
    endless: true, tierMin: 4, cost: function (n) { return Math.round(1000000 * Math.pow(2.0, n)); } });
  add({ id: 'e_world', cat: 'endless', name: '海外に出店する', desc: '世界にラーメンを広める。名声と称号がついてくる。',
    endless: true, afterEnding: true, cost: function (n) { return Math.round(100000000 * Math.pow(2.5, n)); } });
  add({ id: 'e_space', cat: 'endless', name: '宇宙ラーメン計画', desc: '月面に一号店を。壮大な夢だ。',
    endless: true, afterEnding: true, cost: function (n) { return Math.round(1000000000 * Math.pow(3.0, n)); } });

  RP.ITEMS = I;
  RP.item = function (id) { return I.filter(function (x) { return x.id === id; })[0]; };
  RP.ITEM_CATS = [
    { id: 'equip',   name: '設備' },
    { id: 'menu',    name: 'メニュー' },
    { id: 'staff',   name: '従業員' },
    { id: 'decor',   name: '飾り・演出' },
    { id: 'endless', name: '大きな使い道' }
  ];
})(window.RP);
