/* 描画基盤：論理解像度・整数倍スケール・図形・スプライト焼き込み。 */
(function (RP) {
  'use strict';

  var G = RP.gfx = {};
  var canvas = null, ctx = null;
  var cssScale = 1;
  var sprites = {};      // name → { w, h, rows }
  var spriteCache = {};  // key → canvas

  // ---- 初期化・リサイズ -------------------------------------------------
  G.init = function (cv) {
    canvas = cv;
    canvas.width = RP.W;
    canvas.height = RP.H;
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    G.canvas = canvas;
    G.ctx = ctx;
    G.resize();
    window.addEventListener('resize', G.resize);
    window.addEventListener('orientationchange', function () { setTimeout(G.resize, 100); });
  };

  G.resize = function () {
    if (!canvas) { return; }
    var dpr = window.devicePixelRatio || 1;
    var aw = window.innerWidth, ah = window.innerHeight;
    var s = Math.min(aw / RP.W, ah / RP.H);   // CSS px / 論理px
    var phys = s * dpr;                       // 物理px / 論理px
    var use = phys;
    var ip = Math.floor(phys);
    if (ip >= 1 && ip / phys >= 0.8) { use = ip; }  // 余白が小さければ整数倍に揃える
    cssScale = use / dpr;
    canvas.style.width = (RP.W * cssScale) + 'px';
    canvas.style.height = (RP.H * cssScale) + 'px';
    G.scale = cssScale;
  };

  G.color = function (c) {
    if (!c) { return '#f0f'; }
    return RP.PAL.c[c] || c;
  };

  // オフスクリーンキャンバス
  G.make = function (w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    return { canvas: cv, ctx: cx, w: w, h: h };
  };

  // ---- プリミティブ -----------------------------------------------------
  G.clear = function (c) {
    ctx.fillStyle = G.color(c || 'ink');
    ctx.fillRect(0, 0, RP.W, RP.H);
  };
  G.rect = function (x, y, w, h, c) {
    ctx.fillStyle = G.color(c);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  G.px = function (x, y, c) {
    ctx.fillStyle = G.color(c);
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };
  G.hline = function (x, y, w, c) { G.rect(x, y, w, 1, c); };
  G.vline = function (x, y, h, c) { G.rect(x, y, 1, h, c); };
  G.frame = function (x, y, w, h, c) {
    G.rect(x, y, w, 1, c); G.rect(x, y + h - 1, w, 1, c);
    G.rect(x, y, 1, h, c); G.rect(x + w - 1, y, 1, h, c);
  };
  G.line = function (x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    ctx.fillStyle = G.color(c);
    for (var n = 0; n < 1000; n++) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) { break; }
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  // ドットの円（塗り）
  G.disc = function (cx0, cy0, r, c) {
    ctx.fillStyle = G.color(c);
    for (var y = -r; y <= r; y++) {
      var w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
      ctx.fillRect(Math.round(cx0) - w, Math.round(cy0) + y, w * 2 + 1, 1);
    }
  };
  // 角を1ドット欠いた矩形（ガラケーのウィンドウ風）
  G.rrect = function (x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = G.color(c);
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
  };
  // ぼんやりした光（同心円を薄く重ねる）。灯り・ネオンの演出用
  G.glow = function (cx, cy, r, c, a) {
    var prev = ctx.globalAlpha;
    ctx.globalAlpha = (a === undefined ? 0.2 : a) / 3;
    for (var i = 3; i >= 1; i--) { G.disc(cx, cy, Math.round(r * i / 3), c); }
    ctx.globalAlpha = prev;
  };
  G.alpha = function (a) { ctx.globalAlpha = a; };
  G.blend = function (mode) { ctx.globalCompositeOperation = mode || 'source-over'; };

  // 縦グラデーション（ディザ風に段階化したバンド）
  G.vgrad = function (x, y, w, h, c1, c2, steps) {
    steps = steps || 8;
    var bh = h / steps;
    for (var i = 0; i < steps; i++) {
      var t = steps === 1 ? 0 : i / (steps - 1);
      G.rect(x, y + Math.floor(i * bh), w, Math.ceil(bh), RP.util.mixHex(G.color(c1), G.color(c2), t));
    }
  };

  // ---- スプライト -------------------------------------------------------
  // rows: 文字列配列。'.'は透明、それ以外は RP.PAL.chars で色に解決。
  G.defSprite = function (name, rows) {
    var w = rows[0].length, ok = true;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].length !== w) { ok = false; RP.log.warn('sprite行幅不一致', name, i, rows[i].length, w); }
    }
    sprites[name] = { w: w, h: rows.length, rows: rows, ok: ok };
    // 差し替え時は派生キャッシュを捨てる
    Object.keys(spriteCache).forEach(function (k) { if (k.indexOf(name + '|') === 0) { delete spriteCache[k]; } });
  };
  G.hasSprite = function (name) { return !!sprites[name]; };
  G.spriteSize = function (name) { var s = sprites[name]; return s ? { w: s.w, h: s.h } : { w: 0, h: 0 }; };

  // pal: { 文字: 色名/hex } で一部色を差し替えた派生を作る（髪色・服色の着せ替え）
  function bake(name, pal, flip) {
    var s = sprites[name];
    if (!s) { return null; }
    var key = name + '|' + (pal ? JSON.stringify(pal) : '') + (flip ? '|f' : '');
    if (spriteCache[key]) { return spriteCache[key]; }
    var m = G.make(s.w, s.h);
    var chars = RP.PAL.chars;
    for (var y = 0; y < s.h; y++) {
      for (var x = 0; x < s.w; x++) {
        var ch = s.rows[y].charAt(x);
        if (ch === '.' || ch === ' ') { continue; }
        var col = (pal && pal[ch]) ? pal[ch] : (chars[ch] || null);
        if (!col) { continue; }
        m.ctx.fillStyle = G.color(col);
        m.ctx.fillRect(flip ? s.w - 1 - x : x, y, 1, 1);
      }
    }
    spriteCache[key] = m.canvas;
    return m.canvas;
  }
  G.bake = bake;

  // opts: { flip, pal, alpha, sx, sy(整数倍の拡大), ax, ay(アンカー 0..1) }
  G.sprite = function (name, x, y, opts) {
    var s = sprites[name];
    if (!s) { return; }
    opts = opts || {};
    var cv = bake(name, opts.pal, opts.flip);
    if (!cv) { return; }
    var sx = opts.sx || 1, sy = opts.sy || sx;
    var dx = x - (opts.ax ? s.w * sx * opts.ax : 0);
    var dy = y - (opts.ay ? s.h * sy * opts.ay : 0);
    if (opts.alpha !== undefined && opts.alpha < 1) { ctx.globalAlpha = opts.alpha; }
    if (sx === 1 && sy === 1) { ctx.drawImage(cv, Math.round(dx), Math.round(dy)); }
    else { ctx.drawImage(cv, Math.round(dx), Math.round(dy), s.w * sx, s.h * sy); }
    if (opts.alpha !== undefined && opts.alpha < 1) { ctx.globalAlpha = 1; }
  };

  // 単色シルエット（未解放・影・点滅用）
  G.silhouette = function (name, x, y, color, opts) {
    var s = sprites[name];
    if (!s) { return; }
    var pal = {};
    Object.keys(RP.PAL.chars).forEach(function (k) { pal[k] = color; });
    var o = opts ? Object.assign({}, opts) : {};
    o.pal = pal;
    G.sprite(name, x, y, o);
  };

  // 画面揺れ・フラッシュ等のため、描画開始時にオフセットを掛ける
  G.begin = function (ox, oy) {
    ctx.setTransform(1, 0, 0, 1, Math.round(ox || 0), Math.round(oy || 0));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  G.end = function () {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
})(window.RP);
