/* パーツ定義と、装着パーツから物理パラメータ・性能レベルを計算する処理
 * mods: power(倍) curve turbo lag redline(+rpm) mass(+kg) mu muF muR(倍) heatOpt heatRange(値) heatRate(倍)
 *       brake(倍) bias(値) rollF(値) susp steerQ steerRate(倍) gears final(値) lsd(値) down drag(+) offroad(値)
 * degrade: 耐久度0の時に性能が何割落ちるか / wear: 消耗の速さ
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var D = RR.Data = RR.Data || {};

  D.SLOTS = ['engine', 'tire', 'susp', 'brake', 'trans', 'diff', 'light', 'aero'];
  D.SLOT_NAMES = { engine: 'エンジン', tire: 'タイヤ', susp: 'サスペンション', brake: 'ブレーキ', trans: 'ミッション', diff: 'デフ', light: 'けいりょうか', aero: 'エアロ' };

  var P = D.parts = {};
  function part(id, slot, name, price, desc, mods, o) {
    o = o || {};
    P[id] = { id: id, slot: slot, name: name, price: price, desc: desc, mods: mods || {}, degrade: o.degrade == null ? 0.18 : o.degrade, wear: o.wear || 1, stock: !!o.stock, shop: o.shop !== false && !o.stock, rank: o.rank || 0 };
  }
  // ---- エンジン ----
  part('eng_stock', 'engine', 'ノーマル エンジン', 3000, 'じいちゃんの くるまの まま。くせは ない', {}, { stock: true, degrade: 0.2 });
  part('eng_cam', 'engine', 'スポーツ カム', 9000, 'こうかいてんで よく のびる。ていそくは すこし よわい', { power: 1.1, curve: 'high', redline: 400 }, { wear: 1.2 });
  part('eng_bore', 'engine', 'ボアアップ', 16000, 'ていそくから ちからづよい。こうかいてんは のびない', { power: 1.18, curve: 'low', mass: 8, redline: -300 }, { wear: 1.4 });
  part('eng_turbo', 'engine', 'ターボ キット', 34000, 'きけば ばくはつてき。ふみはじめに ラグが ある', { power: 0.96, turbo: 0.45, lag: 0.6, curve: 'turbo', mass: 25 }, { wear: 1.5, rank: 1 });
  part('eng_hicomp', 'engine', 'ハイコンプ チューン', 42000, 'するどい ふけあがり。そのぶん いたみやすい', { power: 1.3, redline: 600 }, { wear: 2.2, degrade: 0.24, rank: 1 });
  part('eng_full', 'engine', 'フルチューン エンジン', 72000, 'すべてに てを いれた とっておき', { power: 1.32, turbo: 0.22, lag: 0.3, redline: 500, mass: 10 }, { wear: 1.3, rank: 2 });
  // ---- タイヤ ----
  part('tire_stock', 'tire', 'ノーマル タイヤ', 2000, 'ふつうの タイヤ。グリップは ひかえめ', { mu: 1.0, heatOpt: 72, heatRange: 42 }, { stock: true, degrade: 0.22 });
  part('tire_sport', 'tire', 'スポーツ タイヤ', 5000, 'バランスの いい スポーツ タイヤ', { mu: 1.07, heatOpt: 78, heatRange: 38 }, { wear: 1.1, degrade: 0.22 });
  part('tire_hard', 'tire', 'ハード コンパウンド', 13000, 'ねつに つよく ながもち。さいこうの グリップは ほどほど', { mu: 1.11, heatOpt: 85, heatRange: 56, heatRate: 0.8 }, { wear: 0.6, degrade: 0.2 });
  part('tire_high', 'tire', 'ハイグリップ タイヤ', 12000, 'よく くいつく。あつく なりやすく へりも はやい', { mu: 1.17, heatOpt: 84, heatRange: 30, heatRate: 1.25 }, { wear: 1.7, degrade: 0.24 });
  part('tire_drift', 'tire', 'ドリフト スペック', 8000, 'リアが ながれやすい。すべらせて まわる ひと むけ', { mu: 1.07, muF: 1.06, muR: 0.94 }, { wear: 1.4, degrade: 0.2 });
  part('tire_semi', 'tire', 'セミスリック', 26000, 'あたたまれば さいきょう。ひえていると すべる', { mu: 1.28, heatOpt: 95, heatRange: 24, heatRate: 1.45 }, { wear: 2.4, degrade: 0.26, rank: 2 });
  // ---- サスペンション ----
  part('susp_stock', 'susp', 'ノーマル サス', 3000, 'やわらかく のりごこち じゅうし', {}, { stock: true });
  part('susp_down', 'susp', 'ダウンサス', 6000, 'すこし ひくく かたく。はんのうが よくなる', { susp: 1.15, steerQ: 1.04 }, { wear: 1.0 });
  part('susp_front', 'susp', 'フロント かため', 9000, 'あんていして はしれる。まがりにくく なる', { susp: 1.2, rollF: 0.6, steerQ: 1.0 }, {});
  part('susp_rear', 'susp', 'リア かため', 9000, 'よく まわる。すべりだしが はやい', { susp: 1.2, rollF: 0.44, steerQ: 1.06 }, {});
  part('susp_rally', 'susp', 'ラリー サス', 11000, 'あれた みちに つよい。ほそうでは ほどほど', { susp: 1.08, offroad: 0.55, steerQ: 1.02 }, { wear: 0.6 });
  part('susp_damper', 'susp', 'スポーツ ダンパー', 14000, 'かたく するどい。こまめな せいびが いる', { susp: 1.32, steerQ: 1.08 }, { wear: 1.3 });
  part('susp_coil', 'susp', 'しゃこうちょう', 28000, 'ちょうせいしきの さいじょうきゅう サス', { susp: 1.45, steerQ: 1.12, rollF: 0.5 }, { wear: 1.2, rank: 2 });
  // ---- ブレーキ ----
  part('brake_stock', 'brake', 'ノーマル ブレーキ', 2000, 'ふつうの ブレーキ', {}, { stock: true, degrade: 0.2 });
  part('brake_pad', 'brake', 'スポーツ パッド', 3000, 'やすくて よく きく。へりは はやい', { brake: 1.12 }, { wear: 1.5 });
  part('brake_bias', 'brake', 'リア よせ バランス', 8000, 'ブレーキで リアが ながれる。ふりだし むき', { brake: 1.14, bias: 0.54 }, {});
  part('brake_4pot', 'brake', '4ポット キャリパー', 15000, 'しっかり とまる。すこし おもい', { brake: 1.28, mass: 5 }, { wear: 0.9 });
  part('brake_race', 'brake', 'レーシング キット', 28000, 'さいきょうの せいどうりょく', { brake: 1.42 }, { wear: 1.5, rank: 2 });
  // ---- ミッション ----
  part('trans_stock', 'trans', 'ノーマル ミッション', 3000, '5そく。ギアの あいだが ひろい', {}, { stock: true, degrade: 0.1 });
  part('trans_short', 'trans', 'ショート ファイナル', 7000, 'かそくが いい。さいこうそくは おちる', { final: 4.85 }, {});
  part('trans_long', 'trans', 'ロング ファイナル', 7000, 'さいこうそくが のびる。かそくは にぶい', { final: 3.9 }, {});
  part('trans_close', 'trans', 'クロス ミッション', 14000, 'ギアが つまって パワーバンドを はずさない', { gears: [3.0, 2.15, 1.62, 1.28, 1.04] }, {});
  part('trans_6', 'trans', '6そく クロス', 26000, '6だんで どこでも おいしい ところを つかう', { gears: [3.1, 2.25, 1.7, 1.36, 1.12, 0.94] }, { wear: 0.9, rank: 2 });
  // ---- デフ ----
  part('diff_stock', 'diff', 'オープン デフ', 2000, 'うちがわが すべると ちからが にげる', { lsd: 0.12 }, { stock: true, degrade: 0.1 });
  part('diff_1way', 'diff', '1WAY LSD', 9000, 'たちあがりで ちからが かかる', { lsd: 0.5 }, {});
  part('diff_15', 'diff', '1.5WAY LSD', 14000, 'かそくも げんそくも あんてい', { lsd: 0.68 }, {});
  part('diff_2way', 'diff', '2WAY LSD', 19000, 'ドリフト むき。はいりは まがりにくい', { lsd: 0.9, steerQ: 0.96 }, { rank: 1 });
  // ---- 軽量化 ----
  part('light_stock', 'light', 'ノーマル ボディ', 0, 'かるくは ない', {}, { stock: true, degrade: 0 });
  part('light_seat', 'light', 'バケット シート', 6000, 'からだが うごかず ハンドルが するどく', { mass: -12, steerRate: 1.1 }, { degrade: 0 });
  part('light_interior', 'light', 'ないそう はがし', 3000, 'いらない ものを はずして -35KG', { mass: -35 }, { degrade: 0 });
  part('light_bonnet', 'light', 'カーボン ボンネット', 11000, 'はなさきが かるく まがりやすい', { mass: -18, steerQ: 1.04 }, { degrade: 0 });
  part('light_full', 'light', 'フル けいりょうか', 28000, '-95KG。ボディが よわり ほかの ぶひんが いたむ', { mass: -95, steerQ: 1.03 }, { degrade: 0, rank: 2 });
  // ---- エアロ ----
  part('aero_stock', 'aero', 'ノーマル', 0, 'なにも ついていない', {}, { stock: true, degrade: 0 });
  part('aero_lip', 'aero', 'フロント リップ', 4000, 'すこし おさえが きく', { down: 0.25, drag: 0.015, aeroBal: 0.6 }, { degrade: 0.3 });
  part('aero_wing', 'aero', 'リア ウイング', 9000, 'こうそくで リアが あんてい', { down: 0.5, drag: 0.035, aeroBal: 0.3 }, { degrade: 0.3 });
  part('aero_full', 'aero', 'フル エアロ', 24000, 'ぜんたいに おさえが きく。くうきていこうも ふえる', { down: 0.8, drag: 0.05, aeroBal: 0.45 }, { degrade: 0.3, rank: 1 });
  part('aero_gt', 'aero', 'GT ウイング', 34000, 'すごい おさえ。ちょくせんは のびない', { down: 1.25, drag: 0.09, aeroBal: 0.35 }, { degrade: 0.3, rank: 2 });

  D.stockParts = { engine: 'eng_stock', tire: 'tire_stock', susp: 'susp_stock', brake: 'brake_stock', trans: 'trans_stock', diff: 'diff_stock', light: 'light_stock', aero: 'aero_stock' };

  // ---------- 物理パラメータの計算 ----------
  // parts: {slot: {id, dur}}  (dur 0..100)
  D.buildSpec = function (parts) {
    var sp = U.deepCopy(RR.Phys.BASE);
    var extraWear = 1;
    D.SLOTS.forEach(function (slot) {
      var pi = parts[slot] || { id: D.stockParts[slot], dur: 100 };
      var def = P[pi.id] || P[D.stockParts[slot]];
      var m = def.mods;
      var dur = pi.dur == null ? 100 : pi.dur;
      var q = 1 - def.degrade * (1 - dur / 100); // 劣化係数
      if (m.power) sp.power *= m.power;
      if (m.curve) sp.curve = m.curve;
      if (m.turbo) sp.turbo += m.turbo;
      if (m.lag != null) sp.lag = m.lag;
      if (m.redline) sp.redline += m.redline;
      if (m.mass) sp.mass += m.mass;
      if (m.mu) sp.mu *= m.mu;
      if (m.muF) sp.muF *= m.muF;
      if (m.muR) sp.muR *= m.muR;
      if (m.heatOpt) sp.heatOpt = m.heatOpt;
      if (m.heatRange) sp.heatRange = m.heatRange;
      if (m.heatRate) sp.heatRate *= m.heatRate;
      if (m.brake) sp.brake *= m.brake;
      if (m.bias) sp.bias = m.bias;
      if (m.rollF) sp.rollF = m.rollF;
      if (m.susp) sp.susp *= m.susp;
      if (m.steerQ) sp.steerQ *= m.steerQ;
      if (m.steerRate) sp.steerRate *= m.steerRate;
      if (m.gears) sp.gears = m.gears.slice();
      if (m.final) sp.final = m.final;
      if (m.lsd != null) sp.lsd = m.lsd;
      if (m.down) sp.down += m.down;
      if (m.drag) sp.drag += m.drag;
      if (m.aeroBal) sp.aeroBal = m.aeroBal;
      if (m.offroad) sp.offroad = m.offroad;
      // 劣化
      if (slot === 'engine') sp.power *= q;
      if (slot === 'tire') sp.mu *= q;
      if (slot === 'brake') sp.brake *= q;
      if (slot === 'susp') { sp.susp *= q; sp.steerQ *= (1 - (1 - q) * 0.5); }
      if (slot === 'trans') sp.power *= (1 - (1 - q) * 0.5);
      if (slot === 'diff') sp.lsd *= q;
      if (slot === 'aero') sp.down *= q;
      var wk = slot === 'light' ? 'susp' : slot;
      sp.wear[wk] = (sp.wear[wk] || 1) * def.wear;
      if (pi.id === 'light_full') extraWear = 1.15;
    });
    if (extraWear !== 1) for (var k in sp.wear) sp.wear[k] *= extraWear;
    return sp;
  };

  // 性能レベル（ノーマル=100）
  D.ratingOfSpec = function (sp) {
    var pw = sp.torque * sp.power * (1 + sp.turbo * 0.75) / sp.mass;
    var pw0 = 170 / 1080;
    var grip = sp.mu * (sp.muF + sp.muR) / 2 * (1 + sp.down * 0.04);
    var r = 100 * (0.45 * pw / pw0 + 0.35 * grip / 1.04 + 0.1 * sp.brake + 0.1 * sp.susp * sp.steerQ);
    return Math.round(r);
  };
})();
