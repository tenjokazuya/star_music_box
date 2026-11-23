/* セーブデータ / 設定 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var PREFIX = 'tns3_save_', SKEY = 'tns3_settings';
  var mem = {};
  var store = {
    get: function (k) {
      try { var v = window.localStorage.getItem(k); if (v != null) return v; } catch (e) { }
      return mem.hasOwnProperty(k) ? mem[k] : null;
    },
    set: function (k, v) {
      mem[k] = v;
      try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; }
    },
    del: function (k) {
      delete mem[k];
      try { window.localStorage.removeItem(k); } catch (e) { }
    }
  };
  RR.Store = store;

  // ---------- 設定 ----------
  var Settings = RR.Settings = {
    // assist: 0=OFF 1=よわ 2=つよ（試遊の結果、標準は「つよ」）
    defaults: { sv: 2, bgm: 7, se: 8, mt: false, assist: 2, text: 1, pad: 'auto', scale: 'int', shake: true, gfx: 1, cam: 0 },
    data: null
  };
  Settings.load = function () {
    var d = U.deepCopy(Settings.defaults);
    try {
      var raw = store.get(SKEY);
      if (raw) {
        var o = JSON.parse(raw);
        for (var k in o) if (d.hasOwnProperty(k)) d[k] = o[k];
        // 旧版（標準が「よわ」だった頃）の設定は標準の「つよ」に合わせる
        if (!o.sv || o.sv < 2) { d.assist = Settings.defaults.assist; d.sv = Settings.defaults.sv; }
      }
    } catch (e) { }
    Settings.data = d;
    return d;
  };
  Settings.save = function () {
    store.set(SKEY, JSON.stringify(Settings.data));
    if (RR.Audio && RR.Audio.applyVolume) RR.Audio.applyVolume();
  };
  Settings.get = function (k) { return Settings.data[k]; };
  Settings.set = function (k, v) { Settings.data[k] = v; Settings.save(); };
  Settings.load();

  // ---------- ゲーム状態 ----------
  var State = RR.State = { S: null, slot: 0 };

  State.fresh = function (name, slot) {
    var S = {
      v: 1, slot: slot || 0, name: name || 'ソラ', stage: 0, flags: {}, money: 2000, playtime: 0,
      pos: { map: 'town', x: 'start', y: 0, dir: 'up' },
      carUid: null, cars: [], parts: [],
      furniture: { owned: {}, placed: [] },
      records: {}, best: {},
      stats: { races: 0, wins: 0, earned: 0, foods: {}, jobs: {}, washes: 0 },
      created: Date.now(), saved: 0, cleared: false
    };
    return S;
  };
  State.newGame = function (name, slot) {
    var S = State.fresh(name, slot);
    State.S = S;
    State.slot = slot || 0;
    if (RR.Data && RR.Data.initNewGame) RR.Data.initNewGame(S);
    return S;
  };
  State.save = function (slot) {
    var S = State.S;
    if (!S) return false;
    if (slot != null) { S.slot = slot; State.slot = slot; }
    S.saved = Date.now();
    return store.set(PREFIX + S.slot, JSON.stringify(S));
  };
  State.load = function (slot) {
    var raw = store.get(PREFIX + slot);
    if (!raw) return null;
    try {
      var S = JSON.parse(raw);
      State.migrate(S);
      State.S = S;
      State.slot = slot;
      return S;
    } catch (e) { return null; }
  };
  State.migrate = function (S) {
    var f = State.fresh(S.name, S.slot);
    for (var k in f) if (!S.hasOwnProperty(k)) S[k] = f[k];
    ['stats', 'furniture'].forEach(function (k) {
      for (var j in f[k]) if (!S[k].hasOwnProperty(j)) S[k][j] = f[k][j];
    });
  };
  State.info = function (slot) {
    var raw = store.get(PREFIX + slot);
    if (!raw) return null;
    try {
      var S = JSON.parse(raw);
      return { name: S.name, stage: S.stage, money: S.money, playtime: S.playtime, cleared: !!S.cleared, map: S.pos && S.pos.map };
    } catch (e) { return null; }
  };
  State.erase = function (slot) { store.del(PREFIX + slot); };
  State.anySave = function () {
    for (var i = 0; i < 3; i++) if (State.info(i)) return true;
    return false;
  };

  // 便利関数
  State.flag = function (k) { return !!(State.S && State.S.flags[k]); };
  State.setFlag = function (k, v) { if (State.S) State.S.flags[k] = v === undefined ? true : v; };
  State.num = function (k) { return (State.S && State.S.flags[k]) | 0; };
  State.addNum = function (k, n) { if (State.S) State.S.flags[k] = ((State.S.flags[k] | 0) + (n == null ? 1 : n)); };
  State.addMoney = function (n) {
    var S = State.S;
    if (!S) return;
    S.money = Math.max(0, Math.min(9999999, S.money + Math.round(n)));
    if (n > 0) S.stats.earned += Math.round(n);
  };
  State.playtimeText = function (ms) {
    var m = Math.floor((ms || 0) / 60000);
    return Math.floor(m / 60) + ':' + U.pad(m % 60, 2);
  };
})();
