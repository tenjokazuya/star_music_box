(function (root) {
  'use strict';

  var Orgel = root.Orgel;

  /**
   * エントリポイント: ページが読み込まれたらアプリを作って起動する。
   */
  function boot() {
    var app = Orgel.App.create();
    Orgel.app = app;
    app.boot();
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
