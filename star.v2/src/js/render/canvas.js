(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * キャンバス基盤: 画面サイズへの追従（高解像度対応）と描画ループ（requestAnimationFrame）。
   * 論理座標は CSS ピクセル。ctx には dpr を掛けた変換が毎フレーム設定される。
   */

  var CONFIG = {
    MAX_DPR: 2,    // 実解像度の倍率の上限（重くなりすぎないように）
    MAX_DT: 50,    // 1フレームの最大経過時間(ms)。タブ復帰直後などの飛びを抑える
  };

  /**
   * @param {HTMLCanvasElement} canvas 描画先
   * @returns {object} api  width/height（CSSピクセル）, dpr, time（経過ms）, dt, fps,
   *                        add(fn), on('resize', fn), start(), stop()
   */
  function create(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var api = { canvas: canvas, ctx: ctx, width: 0, height: 0, dpr: 1, time: 0, dt: 16, fps: 60 };
    var resizeListeners = [];
    var drawers = [];
    var running = false;
    var last = 0;
    var errored = false;

    function resize() {
      var dpr = Math.min(root.devicePixelRatio || 1, CONFIG.MAX_DPR);
      var w = Math.max(1, Math.floor(root.innerWidth));
      var h = Math.max(1, Math.floor(root.innerHeight));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      api.width = w;
      api.height = h;
      api.dpr = dpr;
      for (var i = 0; i < resizeListeners.length; i++) resizeListeners[i](api);
    }

    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(now - last, CONFIG.MAX_DT) : 16;
      last = now;
      api.dt = dt;
      api.time += dt;
      api.fps = api.fps * 0.95 + (1000 / Math.max(dt, 1)) * 0.05;
      ctx.setTransform(api.dpr, 0, 0, api.dpr, 0, 0);
      try {
        for (var i = 0; i < drawers.length; i++) drawers[i](ctx, api);
      } catch (e) {
        // 描画の例外でループを止めない（最初の1回だけ報告する）
        if (!errored) {
          errored = true;
          console.error('描画中にエラーが発生しました:', e);
        }
      }
      root.requestAnimationFrame(frame);
    }

    /**
     * ゲーム内の時計を ms ミリ秒ぶん、1/60秒ずつ進めてフレーム処理を回す（実時間を待たない）。
     * 内蔵ブラウザなど描画ループが止まる環境での確認・自動テスト用。演出・入力受付・クリア判定は実際と同じ動きをする。
     */
    api.advance = function (ms, step) {
      var dt = step || 16;
      var n = Math.max(1, Math.round(ms / dt));
      for (var i = 0; i < n; i++) {
        api.dt = dt;
        api.time += dt;
        ctx.setTransform(api.dpr, 0, 0, api.dpr, 0, 0);
        for (var j = 0; j < drawers.length; j++) drawers[j](ctx, api);
      }
    };

    api.add = function (fn) { drawers.push(fn); };
    api.on = function (name, fn) {
      if (name === 'resize') resizeListeners.push(fn);
    };
    api.start = function () {
      if (running) return;
      running = true;
      last = 0;
      root.requestAnimationFrame(frame);
    };
    api.stop = function () { running = false; };

    root.addEventListener('resize', resize);
    resize();
    return api;
  }

  var Canvas = { CONFIG: CONFIG, create: create };

  Orgel.Canvas = Canvas;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Canvas; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
