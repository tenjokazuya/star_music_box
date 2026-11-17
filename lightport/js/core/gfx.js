/* gfx.js — 画面（240×160）、ドット絵の補助関数、フェードなどの画面効果 */
(function () {
  'use strict';

  var W = Game.W, H = Game.H;
  var gfx = Game.gfx = {
    canvas: null,
    g: null,
    shakeX: 0, shakeY: 0
  };

  /* ---- 初期化 ---- */
  gfx.init = function (canvas) {
    gfx.canvas = canvas;
    gfx.g = canvas.getContext('2d', { alpha: false });
    gfx.g.imageSmoothingEnabled = false;
    return gfx.g;
  };

  /** 小さなオフスクリーンキャンバスを作る */
  gfx.create = function (w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { canvas: c, g: g };
  };

  /** 描画関数でキャンバスを作る: gfx.make(16, 16, function (g) { ... }) */
  gfx.make = function (w, h, fn) {
    var o = gfx.create(w, h);
    fn(o.g, o.canvas);
    return o.canvas;
  };

  /** 左右反転したコピー */
  gfx.flipH = function (cv) {
    var o = gfx.create(cv.width, cv.height);
    o.g.translate(cv.width, 0); o.g.scale(-1, 1);
    o.g.drawImage(cv, 0, 0);
    return o.canvas;
  };

  /** 文字の絵（パレットの文字 → 色）からキャンバスを作る。'.' は透明 */
  gfx.fromRows = function (rows, pal) {
    var h = rows.length, w = 0;
    rows.forEach(function (r) { if (r.length > w) { w = r.length; } });
    return gfx.make(w, h, function (g) {
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < rows[y].length; x++) {
          var c = pal[rows[y].charAt(x)];
          if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
        }
      }
    });
  };

  gfx.px = function (g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  gfx.rect = function (g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); };

  /** ドットで円を塗る（アンチエイリアスなし） */
  gfx.disc = function (g, cx, cy, r, c) {
    g.fillStyle = c;
    for (var y = -r; y <= r; y++) {
      var w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };

  /** 不透明なドットのまわりに 1 ドットの輪郭線をつける（canvas を直接書き換える） */
  gfx.outline = function (cv, color) {
    var w = cv.width, h = cv.height, g = cv.getContext('2d');
    var src = g.getImageData(0, 0, w, h), d = src.data;
    var o = g.createImageData(w, h), od = o.data;
    var rgb = Game.util.rgb(color);
    function a(x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[(y * w + x) * 4 + 3]; }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (d[i + 3] > 0) { od[i] = d[i]; od[i + 1] = d[i + 1]; od[i + 2] = d[i + 2]; od[i + 3] = 255; }
        else if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
          od[i] = rgb[0]; od[i + 1] = rgb[1]; od[i + 2] = rgb[2]; od[i + 3] = 255;
        }
      }
    }
    g.putImageData(o, 0, 0);
    return cv;
  };

  /** 全体の色を変える（シルエットなど）。透明部分はそのまま */
  gfx.recolor = function (cv, color) {
    var o = gfx.create(cv.width, cv.height);
    o.g.drawImage(cv, 0, 0);
    o.g.globalCompositeOperation = 'source-in';
    o.g.fillStyle = color; o.g.fillRect(0, 0, cv.width, cv.height);
    return o.canvas;
  };

  /* ---- 画面効果（フェード、フラッシュ、揺れ、アイリス） ---- */
  var fx = {
    fade: 0, fadeColor: '#000000', fadeFrom: 0, fadeTo: 0, fadeT: 0, fadeN: 0, fadeRes: null,
    flashA: 0, flashColor: '#ffffff', flashDec: 0,
    shakeP: 0, shakeT: 0, shakeN: 0,
    iris: null   // { cx, cy, r, from, to, t, n, res }
  };
  gfx.fx = fx;

  /** 暗転・明転。stepped: GBA の画面のように段階的に変わる */
  gfx.fadeTo = function (alpha, frames, color) {
    return new Promise(function (resolve) {
      if (color) { fx.fadeColor = color; }
      if (!frames) { fx.fade = alpha; fx.fadeN = 0; resolve(); return; }
      fx.fadeFrom = fx.fade; fx.fadeTo = alpha; fx.fadeT = 0; fx.fadeN = frames;
      if (fx.fadeRes) { fx.fadeRes(); }
      fx.fadeRes = resolve;
    });
  };
  gfx.fadeOut = function (frames, color) { return gfx.fadeTo(1, frames === undefined ? 24 : frames, color); };
  gfx.fadeIn = function (frames) { return gfx.fadeTo(0, frames === undefined ? 24 : frames); };
  gfx.setFade = function (a, color) {
    fx.fade = a; fx.fadeN = 0;
    if (color) { fx.fadeColor = color; }
    if (fx.fadeRes) { var r = fx.fadeRes; fx.fadeRes = null; r(); }
  };

  gfx.flash = function (color, frames, alpha) {
    fx.flashColor = color || '#ffffff';
    fx.flashA = alpha === undefined ? 1 : alpha;
    fx.flashDec = fx.flashA / (frames || 18);
  };

  gfx.shake = function (power, frames) { fx.shakeP = power; fx.shakeT = frames; fx.shakeN = frames; };

  /** 円形に開く・閉じる（GBA の場面転換）。center は画面上の座標 */
  gfx.irisClose = function (cx, cy, frames) { return irisAnim(cx, cy, 1, 0, frames); };
  gfx.irisOpen = function (cx, cy, frames) { return irisAnim(cx, cy, 0, 1, frames); };
  function irisAnim(cx, cy, from, to, frames) {
    return new Promise(function (resolve) {
      var maxR = Math.ceil(Math.sqrt(Math.max(cx, W - cx) * Math.max(cx, W - cx) + Math.max(cy, H - cy) * Math.max(cy, H - cy))) + 2;
      if (fx.iris && fx.iris.res) { fx.iris.res(); }
      fx.iris = { cx: cx, cy: cy, maxR: maxR, from: from, to: to, t: 0, n: frames || 20, res: resolve, r: from * maxR };
    });
  }
  gfx.clearIris = function () { if (fx.iris && fx.iris.res) { fx.iris.res(); } fx.iris = null; };

  gfx.update = function () {
    if (fx.fadeN > 0) {
      fx.fadeT++;
      var k = Math.min(1, fx.fadeT / fx.fadeN);
      fx.fade = fx.fadeFrom + (fx.fadeTo - fx.fadeFrom) * k;
      if (fx.fadeT >= fx.fadeN) {
        fx.fadeN = 0; fx.fade = fx.fadeTo;
        if (fx.fadeRes) { var r = fx.fadeRes; fx.fadeRes = null; r(); }
      }
    }
    if (fx.flashA > 0) { fx.flashA = Math.max(0, fx.flashA - fx.flashDec); }
    if (fx.shakeT > 0) {
      fx.shakeT--;
      var p = fx.shakeP * (fx.shakeT / fx.shakeN);
      gfx.shakeX = Math.round((Math.random() * 2 - 1) * p);
      gfx.shakeY = Math.round((Math.random() * 2 - 1) * p);
    } else { gfx.shakeX = 0; gfx.shakeY = 0; }
    var ir = fx.iris;
    if (ir && ir.t < ir.n) {
      ir.t++;
      var kk = Math.min(1, ir.t / ir.n);
      var e = Game.util.ease.inOutQuad(kk);
      ir.r = (ir.from + (ir.to - ir.from) * e) * ir.maxR;
      if (ir.t >= ir.n) { var rs = ir.res; ir.res = null; if (ir.to >= 1) { fx.iris = null; } if (rs) { rs(); } }
    }
  };

  /** 画面効果を重ねて描く（シーンの描画のあとに呼ぶ） */
  gfx.drawOverlay = function (g) {
    var ir = fx.iris;
    if (ir) {
      g.fillStyle = '#000';
      var r = Math.round(ir.r);
      if (r <= 0) { g.fillRect(0, 0, W, H); }
      else {
        for (var y = 0; y < H; y++) {
          var dy = y + 0.5 - ir.cy;
          var d = r * r - dy * dy;
          if (d <= 0) { g.fillRect(0, y, W, 1); continue; }
          var w = Math.floor(Math.sqrt(d));
          if (ir.cx - w > 0) { g.fillRect(0, y, ir.cx - w, 1); }
          if (ir.cx + w < W) { g.fillRect(ir.cx + w, y, W - (ir.cx + w), 1); }
        }
      }
    }
    if (fx.flashA > 0.02) {
      g.globalAlpha = Math.min(1, Math.round(fx.flashA * 8) / 8);
      g.fillStyle = fx.flashColor; g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    if (fx.fade > 0.01) {
      g.globalAlpha = Math.min(1, Math.ceil(fx.fade * 8) / 8);   // 8 段階のステップ
      g.fillStyle = fx.fadeColor; g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  };
})();
