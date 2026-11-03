/* ゲーム状態・店の能力値(derive)・セーブ/ロード・購入処理。
 * セーブ形式を変えたら SAVE_VER を上げて migrate に変換を書く（R8）。 */
(function (RP) {
  'use strict';

  var U = RP.util;
  var SAVE_KEY = 'save';
  var SAVE_VER = 1;
  var G = RP.game = {};

  G.state = null;

  function defaultState() {
    return {
      day: 1, money: 2500, tier: 1, rep: 15,
      items: {},
      bgmPick: 'auto',     // 営業中BGMの選択（'auto'=標準）
      stats: { sales: 0, served: 0, angry: 0, perfect: 0, bestCombo: 0, days: 0, bankrupt: 0,
               spent: 0, donate: 0, maxMoney: 0, endless: {}, startedAt: Date.now() },
      flags: { ending: false, endingSeen: false, hints: {} },
      tv: false, cm: 0,
      last: null,          // 前日の結果（朝画面で表示）
      seed: Math.floor(Math.random() * 1e9)
    };
  }

  G.newGame = function () {
    G.state = defaultState();
    return G.state;
  };

  // ---- セーブ ----
  function migrate(obj) {
    // 今はv1のみ。将来 v が上がったらここで順に変換する。
    var s = obj.state;
    var def = defaultState();
    Object.keys(def).forEach(function (k) { if (s[k] === undefined) { s[k] = def[k]; } });
    Object.keys(def.stats).forEach(function (k) { if (s.stats[k] === undefined) { s.stats[k] = def.stats[k]; } });
    Object.keys(def.flags).forEach(function (k) { if (s.flags[k] === undefined) { s.flags[k] = def.flags[k]; } });
    return s;
  }
  G.hasSave = function () {
    var o = RP.storage.getJSON(SAVE_KEY);
    return !!(o && o.state && typeof o.v === 'number');
  };
  G.saveInfo = function () {
    var o = RP.storage.getJSON(SAVE_KEY);
    if (!o || !o.state) { return null; }
    var t = RP.TIERS[(o.state.tier || 1) - 1];
    return { day: o.state.day, money: o.state.money, tier: o.state.tier, tierName: t ? t.short : '', savedAt: o.savedAt, ending: !!(o.state.flags && o.state.flags.ending) };
  };
  G.save = function () {
    if (!G.state) { return false; }
    return RP.storage.setJSON(SAVE_KEY, { v: SAVE_VER, savedAt: Date.now(), state: G.state });
  };
  G.load = function () {
    var o = RP.storage.getJSON(SAVE_KEY);
    if (!o || !o.state || typeof o.v !== 'number' || o.v > SAVE_VER) { return false; }
    try { G.state = migrate(o); return true; }
    catch (e) { RP.log.error('セーブ読込失敗', e); return false; }
  };
  G.deleteSave = function () { RP.storage.remove(SAVE_KEY); };

  // ---- 設定（セーブとは別） ----
  G.settings = { bgm: 0.7, sfx: 0.9, amb: 0.6, master: 0.8, mute: false };
  G.loadSettings = function () {
    var s = RP.storage.getJSON('settings');
    if (s) { Object.keys(G.settings).forEach(function (k) { if (s[k] !== undefined) { G.settings[k] = s[k]; } }); }
    G.applySettings();
  };
  G.saveSettings = function () { RP.storage.setJSON('settings', G.settings); };
  G.applySettings = function () {
    var s = G.settings;
    RP.audio.vol.master = s.master; RP.audio.vol.bgm = s.bgm; RP.audio.vol.sfx = s.sfx; RP.audio.vol.amb = s.amb;
    RP.audio.setMuted(s.mute);
    RP.audio.applyVolumes();
  };

  // ---- 店の能力値 ----
  G.level = function (id) { return (G.state && G.state.items[id]) || 0; };

  G.derive = function (st) {
    st = st || G.state;
    var d = {
      tier: st.tier, tierDef: RP.TIERS[st.tier - 1],
      pots: 1, slots: 2, soups: ['shoyu'], hards: ['futsu'], tops: ['negi'],
      grills: 0, stockCap: 1, stockKeep: 0, beer: false, rice: false,
      ladle: 0, strainer: 0, stove: 0, heater: 0, patBonus: 0, ticket: false,
      staff: {}, wage: 0, upkeep: 0, arrival: 0, priceMul: 1, tipBonus: 0, repBonus: 0,
      decor: {}, bgms: [], ambs: []
    };
    RP.ITEMS.forEach(function (it) {
      var lv = st.items[it.id] || 0;
      if (lv <= 0) { return; }
      if (it.apply) { it.apply(d, lv); }
      if (it.upkeep) { d.upkeep += it.upkeep * lv; }
      if (it.wage) { d.wage += it.wage; }
    });
    d.soups = RP.MENU.soups.map(function (s) { return s.id; }).filter(function (id) { return d.soups.indexOf(id) >= 0; });
    d.hards = RP.MENU.hards.map(function (s) { return s.id; }).filter(function (id) { return d.hards.indexOf(id) >= 0; });
    d.tops = RP.MENU.tops.map(function (s) { return s.id; }).filter(function (id) { return d.tops.indexOf(id) >= 0; });
    d.rent = d.tierDef.rent;
    d.potCount = Math.min(4, d.pots);
    d.slotCount = Math.min(6, d.slots);
    return d;
  };

  // ---- 購入 ----
  // 次のLvの価格。購入不可(最大)なら null
  G.itemCost = function (it) {
    var lv = G.level(it.id);
    if (it.endless) { return it.cost((G.state.stats.endless[it.id]) || 0); }
    if (lv >= it.max) { return null; }
    return it.costs[lv];
  };
  // 戻り値: { ok, reason }
  G.canBuy = function (it) {
    var st = G.state;
    if (!it.endless && G.level(it.id) >= it.max) { return { ok: false, reason: RP.TEXT.shop.owned }; }
    if (it.tierMin && st.tier < it.tierMin) { return { ok: false, reason: RP.TEXT.shop.locked.tier(RP.TIERS[it.tierMin - 1].short) }; }
    if (it.afterEnding && !st.flags.ending) { return { ok: false, reason: RP.TEXT.shop.locked.ending }; }
    if (it.need) {
      for (var i = 0; i < it.need.length; i++) {
        if (G.level(it.need[i]) < 1) { return { ok: false, reason: RP.TEXT.shop.locked.need(RP.item(it.need[i]).name) }; }
      }
    }
    var c = G.itemCost(it);
    if (c > st.money) { return { ok: false, reason: RP.TEXT.shop.short(U.yen(c - st.money, true)), short: true }; }
    return { ok: true };
  };
  G.buy = function (it) {
    var chk = G.canBuy(it);
    if (!chk.ok) { return chk; }
    var st = G.state, c = G.itemCost(it);
    st.money -= c; st.stats.spent += c;
    if (it.endless) {
      st.stats.endless[it.id] = (st.stats.endless[it.id] || 0) + 1;
      if (it.id === 'e_donate') { st.rep = U.clamp(st.rep + 0.6, 0, 100); st.stats.donate++; }
      if (it.id === 'e_tv') { st.tv = true; }
      if (it.id === 'e_cm') { st.cm = (st.cm || 0) + 3; }
    } else {
      st.items[it.id] = (st.items[it.id] || 0) + 1;
    }
    return { ok: true, cost: c };
  };

  // ---- 出店・移転 ----
  G.canMove = function (tierId) {
    var st = G.state, t = RP.TIERS[tierId - 1];
    if (!t) { return { ok: false, reason: '？' }; }
    if (tierId <= st.tier) { return { ok: false, reason: tierId === st.tier ? RP.TEXT.move.here : RP.TEXT.move.past }; }
    if (t.cost > st.money) { return { ok: false, reason: RP.TEXT.move.short(U.yen(t.cost - st.money, true)), short: true }; }
    return { ok: true };
  };
  G.move = function (tierId) {
    var chk = G.canMove(tierId);
    if (!chk.ok) { return chk; }
    var st = G.state, t = RP.TIERS[tierId - 1];
    st.money -= t.cost; st.stats.spent += t.cost;
    st.tier = tierId;
    return { ok: true, tier: t };
  };

  // デバッグ用の状態作成（?debug=1&scene=service&setup=t3 など）。
  // t<数字>=ティア, all=全設備, mid=中盤相当, rich=大金, ending=エンディング後
  G.debugSetup = function (spec) {
    var st = G.state;
    spec = String(spec);
    var m = /t(\d)/.exec(spec);
    if (m) { st.tier = Math.min(RP.TIERS.length, parseInt(m[1], 10)); }
    if (/all/.test(spec)) {
      RP.ITEMS.forEach(function (it) { if (!it.endless && !it.afterEnding) { st.items[it.id] = it.max; } });
    }
    if (/mid/.test(spec)) {
      ['pot', 'slot', 'gyoza', 'beer', 'cooker', 'soup_miso', 'hard_katame', 'top_nori', 'top_menma', 'top_egg', 'staff_part'].forEach(function (id) { st.items[id] = 1; });
    }
    if (/rich/.test(spec)) { st.money = 999999999; }
    if (/ending/.test(spec)) { st.flags.ending = true; st.stats.endless.e_world = 3; st.stats.endless.e_space = 1; }
    st.rep = Math.max(st.rep, 30);
  };

  // 天気（日付とシードから決定。予報として朝に見せる）
  G.weatherFor = function (day) {
    var st = G.state;
    var r = new RP.Rng((st.seed + day * 7919) >>> 0);
    r.next();
    return r.next() < 0.2 ? 'rain' : 'clear';
  };

  // 実績の判定。新しく解除されたものを返し、演出（トースト）も出す。
  G.achCheck = function (svc) {
    var st = G.state, fresh = [];
    if (!st) { return fresh; }
    if (!st.flags.ach) { st.flags.ach = {}; }
    RP.ACH.forEach(function (a) {
      if (st.flags.ach[a.id]) { return; }
      var ok = false;
      try { ok = !!a.check(st, svc); } catch (e) { RP.log.warn('実績判定失敗', a.id, e); }
      if (ok) { st.flags.ach[a.id] = st.day; fresh.push(a); }
    });
    fresh.forEach(function (a, i) {
      RP.fx.toast('実績解除！', a.name, 'yellow');
      setTimeout(function () { if (RP.se) { RP.se.play('star', { n: 3 }); } }, i * 300);
    });
    return fresh;
  };

  // 評判の★（1〜5）
  G.stars = function (rep) { return U.clamp(1 + Math.floor((rep === undefined ? G.state.rep : rep) / 20), 1, 5); };
})(window.RP);
