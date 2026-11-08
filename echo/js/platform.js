/* platform.js ― プラットフォーム抽象化
 * Web / Electron(Steam) / Capacitor(Android, iPhone) の差異はここに閉じ込める。
 * ゲーム側は EB.Platform.* だけを使う。 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB;

  var mem = {};          // localStorage が使えない場合の保持領域
  var KEY = 'echo_beacon_v1_';
  var touchSeen = false;

  function hasLS() {
    try { var k = '__t'; root.localStorage.setItem(k, '1'); root.localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  }
  var useLS = false;
  try { useLS = hasLS(); } catch (e) { useLS = false; }

  EB.Platform = {
    name: 'web',
    storage: {
      get: function (k, def) {
        try {
          var s = useLS ? root.localStorage.getItem(KEY + k) : mem[k];
          if (s === null || s === undefined) return def;
          return JSON.parse(s);
        } catch (e) { return def; }
      },
      set: function (k, v) {
        try {
          var s = JSON.stringify(v);
          if (useLS) root.localStorage.setItem(KEY + k, s); else mem[k] = s;
        } catch (e) { /* 容量超過などは無視 */ }
      }
    },
    isTouchDevice: function () {
      if (touchSeen) return true;
      try {
        return ('ontouchstart' in root) || (root.navigator && root.navigator.maxTouchPoints > 0 && !root.matchMedia('(pointer:fine)').matches);
      } catch (e) { return false; }
    },
    markTouchSeen: function () { touchSeen = true; },
    requestFullscreen: function () {
      try {
        var el = root.document.documentElement;
        var f = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (f) f.call(el);
      } catch (e) { /* 無視 */ }
    },
    exitFullscreen: function () {
      try {
        var d = root.document;
        var f = d.exitFullscreen || d.webkitExitFullscreen || d.msExitFullscreen;
        if (f) f.call(d);
      } catch (e) { /* 無視 */ }
    },
    isFullscreen: function () {
      var d = root.document;
      return !!(d && (d.fullscreenElement || d.webkitFullscreenElement));
    },
    vibrate: function (ms) {
      try { if (root.navigator && root.navigator.vibrate) root.navigator.vibrate(ms); } catch (e) { /* 無視 */ }
    },
    // 可視状態の変化通知 (cb(hidden))
    onVisibility: function (cb) {
      try {
        root.document.addEventListener('visibilitychange', function () { cb(root.document.hidden); });
        root.addEventListener('blur', function () { cb(true); });
      } catch (e) { /* 無視 */ }
    },
    // アプリ終了（Electron などで差し替え）
    quit: function () { /* Web では何もしない */ }
  };
})();
