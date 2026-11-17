/* store.js — 保存先の抽象化と設定。
 * 既定は localStorage。使えない（プライベートモード等）ときはメモリだけに保存する。
 * Steam / Android / iOS 版では Game.store.backend を差し替えればよい:
 *   Game.store.backend = { get: function(k){...}, set: function(k,v){...}, remove: function(k){...} };
 * （同期 API。非同期の保存先は起動時に preload() で読み込んでおく）
 */
(function () {
  'use strict';

  var PREFIX = 'tomoshibi.';
  var mem = {};

  var store = Game.store = {
    backend: null,

    _raw: function (op, key, val) {
      var k = PREFIX + key;
      if (store.backend) {
        try {
          if (op === 'get') { return store.backend.get(k); }
          if (op === 'set') { return store.backend.set(k, val); }
          return store.backend.remove(k);
        } catch (e) { /* メモリへ */ }
      }
      try {
        var ls = window.localStorage;
        if (op === 'get') { return ls.getItem(k); }
        if (op === 'set') { ls.setItem(k, val); return; }
        ls.removeItem(k);
        return;
      } catch (e2) { /* メモリへ */ }
      if (op === 'get') { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; }
      if (op === 'set') { mem[k] = val; return; }
      delete mem[k];
    },

    get: function (key, def) {
      var raw = store._raw('get', key);
      if (raw === null || raw === undefined) { return def === undefined ? null : def; }
      try { return JSON.parse(raw); } catch (e) { return def === undefined ? null : def; }
    },
    set: function (key, value) {
      store._raw('set', key, JSON.stringify(value));
    },
    remove: function (key) { store._raw('remove', key); },

    /** 非同期の保存先の内容を先に流し込む（キー → JSON 文字列） */
    preload: function (obj) {
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) { mem[PREFIX + k] = obj[k]; }
      }
    }
  };

  /** ユーザー設定 */
  var DEFAULTS = {
    bgm: 7,          // 0〜10
    sfx: 8,
    amb: 7,
    textSpeed: 2,    // 1:ゆっくり 2:ふつう 3:はやい
    softkeys: 'auto',// 'auto' | 'on' | 'off'
    lcd: false,      // 液晶風のすじ
    vibrate: true
  };

  var settings = Game.settings = {};
  settings.load = function () {
    var s = store.get('settings', {});
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        settings[k] = (s && s[k] !== undefined) ? s[k] : DEFAULTS[k];
      }
    }
  };
  settings.save = function () {
    var o = {};
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) { o[k] = settings[k]; }
    }
    store.set('settings', o);
  };
  settings.load();
})();
