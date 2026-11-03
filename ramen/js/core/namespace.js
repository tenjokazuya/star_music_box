/* 名前空間・ログ・プラットフォーム判定。ES Modules不使用、file://動作が前提。 */
(function () {
  'use strict';
  var RP = window.RP = window.RP || {};

  RP.W = 384;          // 論理解像度（幅）
  RP.H = 216;          // 論理解像度（高さ）
  RP.VERSION = '0.1.0';
  RP.TITLE = 'ラーメンパニック';
  RP.SUBTITLE = '～屋台から天下一へ～';

  // ---- ログ（リングバッファ。画面に出さず落ちない設計） ----
  var buf = [];
  function push(level, args) {
    var msg = Array.prototype.slice.call(args).map(function (a) {
      if (a && a.stack) { return a.stack; }
      if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
      return String(a);
    }).join(' ');
    buf.push({ t: Date.now(), level: level, msg: msg });
    if (buf.length > 200) { buf.shift(); }
    if (typeof console !== 'undefined' && console[level]) { console[level]('[RP]', msg); }
  }
  RP.log = {
    info: function () { push('info', arguments); },
    warn: function () { push('warn', arguments); },
    error: function () { push('error', arguments); },
    dump: function () { return buf.slice(); },
    errorCount: function () { return buf.filter(function (l) { return l.level === 'error'; }).length; }
  };

  window.addEventListener('error', function (e) {
    RP.log.error('window.onerror', e.message, (e.filename || '') + ':' + (e.lineno || 0));
  });
  window.addEventListener('unhandledrejection', function (e) {
    RP.log.error('unhandledrejection', e.reason);
  });

  // ---- プラットフォーム ----
  var ua = (navigator.userAgent || '');
  RP.platform = {
    isElectron: /Electron/i.test(ua),
    isCapacitor: !!(window.Capacitor),
    isTouch: ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0,
    isFile: location.protocol === 'file:'
  };

  // ---- デバッグ（?debug=1） ----
  var q = (location.search || '');
  RP.debug = /[?&]debug=1/.test(q);
  RP.query = function (key) {
    var m = new RegExp('[?&]' + key + '=([^&]*)').exec(q);
    return m ? decodeURIComponent(m[1]) : null;
  };

  // ---- 共有ストア（モジュールが自分を登録する） ----
  RP.scenes = {};
})();
