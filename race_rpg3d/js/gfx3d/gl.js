/* RR.GL: three.js レンダラの管理（品質設定・リサイズ・オフスクリーン撮影） */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U;
  var GL = RR.GL = { renderer: null, off: null };

  // 品質: 0=ひくい 1=ふつう 2=たかい
  var Q = [
    { name: 'ひくい', ratio: 0.75, maxRatio: 1.0, shadow: false, shadowSize: 0, lights: 2, trees: 0.5, aa: false },
    { name: 'ふつう', ratio: 1.0, maxRatio: 1.5, shadow: true, shadowSize: 1024, lights: 3, trees: 1.0, aa: true },
    { name: 'たかい', ratio: 1.0, maxRatio: 2.0, shadow: true, shadowSize: 2048, lights: 4, trees: 1.5, aa: true }
  ];
  GL.QUALITY = Q;
  GL.q = function () {
    var v = RR.Settings && RR.Settings.data ? RR.Settings.data.gfx : null;
    return Q[v == null ? 1 : U.clamp(v | 0, 0, 2)];
  };

  GL.init = function (canvas) {
    if (!T) throw new Error('three.js が よみこめませんでした (vendor/three/three.min.js)');
    var q = GL.q();
    var r = GL.renderer = new T.WebGLRenderer({ canvas: canvas, antialias: q.aa, alpha: false, powerPreference: 'high-performance' });
    r.setClearColor(0x05060a, 1);
    r.shadowMap.enabled = q.shadow;
    r.shadowMap.type = T.PCFSoftShadowMap;
    GL.w = 320; GL.h = 180;
  };

  GL.pixelRatio = function () {
    var q = GL.q();
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    return Math.max(0.5, Math.min(dpr * q.ratio, q.maxRatio));
  };

  GL.resize = function (w, h) {
    GL.w = w; GL.h = h;
    if (!GL.renderer) return;
    GL.renderer.setPixelRatio(GL.pixelRatio());
    GL.renderer.setSize(w, h, false);
    GL.renderer.shadowMap.enabled = GL.q().shadow;
    if (GL.onResize) GL.onResize(w, h);
  };
  GL.aspect = function () { return GL.w / Math.max(1, GL.h); };

  GL.render = function (scene, camera) {
    GL.renderer.render(scene, camera);
  };

  // オフスクリーンで撮影して 2D キャンバスを返す（ガレージの車、ショップの商品など）
  GL.snapshot = function (scene, camera, w, h) {
    if (!GL.off || GL.off.w !== w || GL.off.h !== h) {
      if (GL.off) GL.off.r.dispose();
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var r = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(w, h, false);
      r.setClearColor(0x000000, 0);
      GL.off = { r: r, c: c, w: w, h: h };
    }
    GL.off.r.render(scene, camera);
    var out = U.canvas(w, h, true);
    out.g.drawImage(GL.off.c, 0, 0);
    return out;
  };
})();
