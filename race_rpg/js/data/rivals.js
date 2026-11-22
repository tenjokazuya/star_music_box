/* ライバル（相手の車とパーツ・腕前）とレース設定
 * parts: スロット→パーツID（省略はノーマル）。skill: 限界の何割で走るか（0.8〜1.0）
 */
(function () {
  'use strict';
  var RR = window.RR;
  var D = RR.Data = RR.Data || {};

  D.rivals = {
    // ---- ストーリー ----
    kenta: { name: 'ケンタ', look: 'kenta', car: { model: 'tsubame', color: 'orange' }, skill: 0.82, line: 0.5, wobble: 0.6,
      parts: { tire: 'tire_sport' } },
    saki: { name: 'サキ', look: 'saki', car: { model: 'hayate', color: 'black' }, skill: 0.9, line: 0.8,
      parts: { engine: 'eng_cam', tire: 'tire_drift', susp: 'susp_rear', brake: 'brake_pad', diff: 'diff_2way', light: 'light_interior' } },
    gou: { name: 'ゴウ', look: 'gou', car: { model: 'raiden', color: 'yellow' }, skill: 0.88, line: 0.6, aggr: 1.05,
      parts: { engine: 'eng_turbo', tire: 'tire_high', susp: 'susp_damper', brake: 'brake_4pot', trans: 'trans_close', diff: 'diff_1way', aero: 'aero_wing' } },
    shinobu: { name: 'シノブ', look: 'shinobu', car: { model: 'regulus', color: 'silver' }, skill: 0.92, line: 0.85,
      parts: { engine: 'eng_hicomp', tire: 'tire_hard', susp: 'susp_coil', brake: 'brake_4pot', trans: 'trans_close', diff: 'diff_15', light: 'light_seat', aero: 'aero_lip' } },
    kurosawa: { name: 'クロサワ', look: 'kurosawa', car: { model: 'orochi', color: 'black' }, skill: 0.9, line: 0.8,
      parts: { engine: 'eng_full', tire: 'tire_semi', susp: 'susp_coil', brake: 'brake_race', trans: 'trans_6', diff: 'diff_15', light: 'light_interior', aero: 'aero_wing' } },
    hayami: { name: 'ハヤミ', look: 'hayami', car: { model: 'comet', color: 'ghost' }, skill: 0.93, line: 0.95,
      parts: { engine: 'eng_full', tire: 'tire_semi', susp: 'susp_coil', brake: 'brake_race', trans: 'trans_6', diff: 'diff_2way', light: 'light_full', aero: 'aero_gt' } },
    // ---- フリー対戦（町・各パーキング） ----
    yasuo: { name: 'ヤスオ', look: 'man2', car: { model: 'tsubame', color: 'blue' }, skill: 0.8, line: 0.4, wobble: 0.8, parts: {} },
    rin: { name: 'リン', look: 'racer6', car: { model: 'sylph', color: 'pink' }, skill: 0.84, parts: { tire: 'tire_sport', susp: 'susp_down' } },
    minato: { name: 'ミナト', look: 'racer1', car: { model: 'hayate', color: 'red' }, skill: 0.86, parts: { tire: 'tire_sport', brake: 'brake_pad' } },
    kaori: { name: 'カオリ', look: 'racer3', car: { model: 'sylph', color: 'white' }, skill: 0.88, parts: { tire: 'tire_sport', brake: 'brake_pad', light: 'light_interior' } },
    ryu: { name: 'リュウ', look: 'racer5', car: { model: 'regulus', color: 'purple' }, skill: 0.87, parts: { engine: 'eng_bore', tire: 'tire_high', susp: 'susp_front', diff: 'diff_1way', trans: 'trans_short' } },
    nobu: { name: 'ノブヒコ', look: 'racer2', car: { model: 'raiden', color: 'blue' }, skill: 0.9, parts: { engine: 'eng_turbo', tire: 'tire_sport', susp: 'susp_down', aero: 'aero_wing' } },
    tamaki: { name: 'タマキ', look: 'racer4', car: { model: 'hayate', color: 'green' }, skill: 0.92, parts: { engine: 'eng_bore', tire: 'tire_hard', susp: 'susp_damper', diff: 'diff_15', brake: 'brake_4pot' } },
    jin: { name: 'ジン', look: 'man3', car: { model: 'regulus', color: 'white' }, skill: 0.93, parts: { engine: 'eng_turbo', tire: 'tire_high', susp: 'susp_coil', brake: 'brake_4pot', diff: 'diff_1way', aero: 'aero_full' } },
    kai: { name: 'カイ', look: 'racer1', car: { model: 'orochi', color: 'red' }, skill: 0.95, parts: { engine: 'eng_full', tire: 'tire_semi', susp: 'susp_damper', brake: 'brake_race', trans: 'trans_close', diff: 'diff_15', aero: 'aero_wing' } },
    sora2: { name: 'アカネ', look: 'woman1', car: { model: 'orochi', color: 'gold' }, skill: 0.96, parts: { engine: 'eng_full', tire: 'tire_semi', susp: 'susp_coil', brake: 'brake_race', trans: 'trans_6', diff: 'diff_15', light: 'light_bonnet', aero: 'aero_full' } }
  };

  // ※ 各パーキングの走り屋は、その場の頭より少しだけ弱く調整（tools/balance.js 0.9 pa で確認）
  // レース設定: course, rival(省略でタイムアタック), stake(賭け金), target(タイムアタックの目標ms)
  D.races = {
    kenta1: { course: 'urayama', rival: 'kenta', stake: 1000, title: 'ウラヤマざか バトル' },
    kenta_re: { course: 'urayama', rival: 'kenta', stake: 1000, title: 'ケンタと さいせん' },
    yasuo: { course: 'urayama', rival: 'yasuo', stake: 800, title: 'コンビニうらの しょうぶ' },
    rin: { course: 'urayama', rival: 'rin', stake: 1500, title: 'ウラヤマざか バトル' },
    ta_urayama: { course: 'urayama', target: 44000, stake: 0, prize: 2000, title: 'タイムアタック' },
    saki1: { course: 'tsuzura', rival: 'saki', stake: 5000, title: 'ツヅラの かしら', story: true },
    saki_re: { course: 'tsuzura', rival: 'saki', stake: 5000, title: 'サキと さいせん' },
    minato: { course: 'tsuzura', rival: 'minato', stake: 2500, title: 'ツヅラとうげ バトル' },
    kaori: { course: 'tsuzura', rival: 'kaori', stake: 4000, title: 'ツヅラとうげ バトル' },
    ta_tsuzura: { course: 'tsuzura', target: 72000, stake: 0, prize: 5000, title: 'タイムアタック' },
    gou1: { course: 'hebinose', rival: 'gou', stake: 10000, title: 'ヘビノセの かしら', story: true },
    gou_big: { course: 'hebinose', rival: 'gou', stake: 30000, title: 'ゴウとの おおきな かけ', story: true },
    gou_re: { course: 'hebinose', rival: 'gou', stake: 10000, title: 'ゴウと さいせん' },
    ryu: { course: 'hebinose', rival: 'ryu', stake: 6000, title: 'ヘビノセ バトル' },
    nobu: { course: 'hebinose', rival: 'nobu', stake: 8000, title: 'ヘビノセ バトル' },
    ta_hebinose: { course: 'hebinose', target: 82000, stake: 0, prize: 8000, title: 'タイムアタック' },
    shinobu1: { course: 'kirigatani', rival: 'shinobu', stake: 15000, title: 'キリガタニの かしら', story: true },
    shinobu_re: { course: 'kirigatani', rival: 'shinobu', stake: 15000, title: 'シノブと さいせん' },
    tamaki: { course: 'kirigatani', rival: 'tamaki', stake: 12000, title: 'キリガタニ バトル' },
    ta_kirigatani: { course: 'kirigatani', target: 66000, stake: 0, prize: 10000, title: 'タイムアタック' },
    kurosawa1: { course: 'yasha', rival: 'kurosawa', stake: 0, title: 'ヤシャの ヌシ', story: true, final: true },
    kurosawa_re: { course: 'yasha', rival: 'kurosawa', stake: 30000, title: 'クロサワと さいせん' },
    jin: { course: 'yasha', rival: 'jin', stake: 18000, title: 'ヤシャだけ バトル' },
    kai: { course: 'yasha', rival: 'kai', stake: 24000, title: 'ヤシャだけ バトル' },
    akane: { course: 'yasha', rival: 'sora2', stake: 25000, title: 'ヤシャだけ バトル' },
    ta_yasha: { course: 'yasha', target: 112000, stake: 0, prize: 15000, title: 'タイムアタック' },
    hayami1: { course: 'kyudo', rival: 'hayami', stake: 0, title: 'しろい カゲ', story: true },
    hayami_re: { course: 'kyudo', rival: 'hayami', stake: 30000, title: 'ハヤミと さいせん' },
    ta_kyudo: { course: 'kyudo', target: 70000, stake: 0, prize: 12000, title: 'タイムアタック' }
  };

  D.rivalSpec = function (rv) {
    var map = {};
    D.SLOTS.forEach(function (slot) { map[slot] = { id: (rv.parts && rv.parts[slot]) || D.stockParts[slot], dur: 100 }; });
    return D.buildSpec(map);
  };
  D.rivalRating = function (id) { return D.ratingOfSpec(D.rivalSpec(D.rivals[id])); };
})();
