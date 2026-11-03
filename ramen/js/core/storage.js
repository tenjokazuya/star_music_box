/* セーブ用ストレージ抽象。localStorage を try/catch で包み、失敗時はメモリ保持で継続する。 */
(function (RP) {
  'use strict';

  var S = RP.storage = {};
  var mem = {};
  var ls = null;
  var PREFIX = 'ramen_panic.';

  try {
    ls = window.localStorage;
    var probe = PREFIX + 'probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch (e) {
    ls = null;
    RP.log.warn('localStorageが使えないためメモリ保持で動作します');
  }
  S.persistent = !!ls;

  S.get = function (key) {
    try {
      var raw = ls ? ls.getItem(PREFIX + key) : mem[key];
      return raw === null || raw === undefined ? null : raw;
    } catch (e) {
      RP.log.warn('storage.get失敗', key, e);
      return mem[key] === undefined ? null : mem[key];
    }
  };
  S.set = function (key, value) {
    mem[key] = value;
    if (!ls) { return true; }
    try { ls.setItem(PREFIX + key, value); return true; }
    catch (e) { RP.log.warn('storage.set失敗', key, e); return false; }
  };
  S.remove = function (key) {
    delete mem[key];
    if (!ls) { return; }
    try { ls.removeItem(PREFIX + key); } catch (e) { RP.log.warn('storage.remove失敗', key, e); }
  };

  // JSON用ヘルパ（壊れていたら null を返す）
  S.getJSON = function (key) {
    var raw = S.get(key);
    if (raw === null) { return null; }
    try { return JSON.parse(raw); } catch (e) { RP.log.warn('JSON破損', key); return null; }
  };
  S.setJSON = function (key, obj) { return S.set(key, JSON.stringify(obj)); };
})(window.RP);
