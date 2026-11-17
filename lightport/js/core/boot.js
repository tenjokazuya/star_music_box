/* boot.js — Game 名前空間と共通定数。最初に読み込む。 */
(function (global) {
  'use strict';

  var Game = global.Game = {
    TITLE: 'ともしびの みなと',
    VERSION: '1.0.0',
    W: 240,          // 内部解像度（GBA と同じ）
    H: 160,
    T: 16,           // タイルの大きさ
    VW: 15,          // 画面に入るタイル数（横）
    VH: 10,          // 画面に入るタイル数（縦）
    debug: /[?&]debug\b/.test(global.location ? global.location.search : ''),
    errors: [],      // 実行中に起きたエラー（検証用）
    frame: 0         // 経過フレーム
  };

  Game.log = function () {
    if (Game.debug && global.console) { global.console.log.apply(global.console, arguments); }
  };

  Game.fail = function (where, err) {
    var msg = where + ': ' + (err && err.stack ? err.stack : String(err));
    Game.errors.push(msg);
    if (global.console) { global.console.error(msg); }
    if (Game.debug && global.document) {
      var el = global.document.getElementById('errlog');
      if (!el) {
        el = global.document.createElement('pre');
        el.id = 'errlog';
        el.style.cssText = 'position:fixed;left:0;top:0;right:0;max-height:40%;overflow:auto;margin:0;padding:4px;' +
          'background:rgba(120,0,0,.85);color:#fff;font:11px monospace;z-index:99;white-space:pre-wrap;pointer-events:none';
        global.document.body.appendChild(el);
      }
      el.textContent += msg + '\n';
    }
  };

  global.addEventListener('error', function (e) {
    Game.fail('window.onerror', e.error || e.message);
  });
  global.addEventListener('unhandledrejection', function (e) {
    Game.fail('unhandledrejection', e.reason);
  });

  /** シーンスタック。シーンは enter/update/draw/exit を持つ。 */
  Game.scenes = {
    stack: [],
    top: function () { return this.stack[this.stack.length - 1] || null; },
    push: function (s, arg) { this.stack.push(s); if (s.enter) { s.enter(arg); } },
    pop: function () {
      var s = this.stack.pop();
      if (s && s.exit) { s.exit(); }
      var t = this.top();
      if (t && t.resume) { t.resume(); }
      return s;
    },
    replace: function (s, arg) {
      while (this.stack.length) {
        var o = this.stack.pop();
        if (o.exit) { o.exit(); }
      }
      this.push(s, arg);
    },
    update: function () {
      var t = this.top();
      if (t && t.update) { t.update(); }
    },
    draw: function (g) {
      // 最下層から順に描く（透過シーンは overlay: true）
      var i = this.stack.length - 1;
      while (i > 0 && this.stack[i].overlay) { i--; }
      for (; i < this.stack.length; i++) {
        if (this.stack[i].draw) { this.stack[i].draw(g); }
      }
    }
  };

  /** 各種レジストリ（データファイルが登録する） */
  Game.registry = { scenes: {}, maps: {} };
})(window);
