/* main.js ― 起動・メインループ（固定タイムステップ 60Hz） */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB, CFG = EB.CFG;

  var STEP = 1000 / CFG.FPS, last = 0, acc = 0, errCount = 0, fpsCount = 0, fpsT = 0;
  EB.fps = 60;
  EB.lastError = null;

  function report(e) {
    EB.lastError = e;
    if (errCount++ < 5 && root.console) root.console.error(e && e.stack ? e.stack : e);
  }

  var Main = {
    boot: function () {
      EB.touchUI = EB.Platform.isTouchDevice();
      EB.Gfx.init();
      // 同梱日本語ドットフォント(DotGothic16, base64埋め込み)を読み込み、完了後にグリフキャッシュを作り直す（ISS-001）
      // 失敗してもシステムフォントで動作を続ける。
      try {
        if (EB.FontData && root.FontFace && root.document.fonts) {
          var ff = new root.FontFace(EB.FontData.family, 'url(data:' + EB.FontData.mime + ';base64,' + EB.FontData.b64 + ')');
          ff.load().then(function (f) { root.document.fonts.add(f); EB.Font.clearCache(); }, function () { /* システムフォントのまま */ });
        }
      } catch (e) { /* 無視 */ }
      EB.Input.init();
      if (EB.Portrait && EB.Portrait.loadExternal) EB.Portrait.loadExternal();   // assets/portraits/ に画像があれば優先
      EB.Settings.load();
      var unlock = function () { EB.Audio.unlock(); };
      ['keydown', 'pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (ev) { root.addEventListener(ev, unlock, { passive: true }); });
      EB.Platform.onVisibility(function (hidden) {
        if (hidden) { EB.Audio.suspend(); if (EB.Game && EB.Scene.name === 'game') EB.Game.autoPause(); }
        else EB.Audio.resume();
      });
      EB.Scene.start('boot');
      if (root.requestAnimationFrame) root.requestAnimationFrame(Main.frame);
    },
    step: function () {
      try { EB.Input.update(); EB.Scene.update(); } catch (e) { report(e); }
    },
    draw: function () {
      try { EB.Scene.draw(EB.Gfx.ctx); } catch (e) { report(e); }
      if (EB.lastError && errCount < 3000) {
        var c = EB.Gfx.ctx;
        c.fillStyle = 'rgba(160,0,0,0.85)'; c.fillRect(0, 0, 320, 12);
        EB.Gfx.text('ERR ' + String(EB.lastError.message || EB.lastError).substring(0, 48), 2, 2, '#ffffff');
      }
    },
    frame: function (ts) {
      root.requestAnimationFrame(Main.frame);
      if (!last) last = ts;
      var dt = ts - last; last = ts;
      if (dt > 100) dt = 100;
      acc += dt;
      var n = 0;
      while (acc >= STEP && n < 4) { Main.step(); acc -= STEP; n++; }
      if (n >= 4) acc = 0;
      Main.draw();
      fpsCount++; fpsT += dt;
      if (fpsT >= 500) { EB.fps = fpsCount * 1000 / fpsT; fpsCount = 0; fpsT = 0; }
    }
  };
  EB.Main = Main;
  Main.boot();
})();
