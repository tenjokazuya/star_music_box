/* 車のドット絵生成: 真上（レース/フィールド）と横（メニュー用） */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, P = RR.Pal;
  var Sprites = RR.Sprites = RR.Sprites || {};

  // 車種の形（見た目のみ。性能はパーツで決まる）
  // top: L,W(レース時ピクセル) / 窓位置 u: h1..h4 / side: プロファイル
  var SHAPES = {
    comet:   { L: 16, W: 7, h1: 0.36, h2: 0.47, h3: 0.74, h4: 0.86, popup: true, hatch: true,
      side: { hood: 9, roof: 17, ws: 0.36, rs: 0.48, re: 0.74, tr: 0.86, tail: 10, nose: 8, boxy: true } },
    hayate:  { L: 17, W: 7, h1: 0.38, h2: 0.5, h3: 0.7, h4: 0.82, popup: true, spoiler: 'lip',
      side: { hood: 9, roof: 16, ws: 0.38, rs: 0.5, re: 0.7, tr: 0.82, tail: 10, nose: 7 } },
    sylph:   { L: 15, W: 7, h1: 0.4, h2: 0.48, h3: 0.62, h4: 0.66, open: true,
      side: { hood: 9, roof: 13, ws: 0.4, rs: 0.46, re: 0.62, tr: 0.66, tail: 10, nose: 7, open: true } },
    regulus: { L: 18, W: 7, h1: 0.34, h2: 0.44, h3: 0.68, h4: 0.78,
      side: { hood: 10, roof: 17, ws: 0.33, rs: 0.43, re: 0.68, tr: 0.78, tail: 11, nose: 9, boxy: true } },
    orochi:  { L: 17, W: 8, h1: 0.44, h2: 0.55, h3: 0.74, h4: 0.84, spoiler: 'wing',
      side: { hood: 8, roof: 15, ws: 0.44, rs: 0.55, re: 0.72, tr: 0.84, tail: 10, nose: 6 } },
    tsubame: { L: 13, W: 6, h1: 0.24, h2: 0.36, h3: 0.82, h4: 0.9, hatch: true,
      side: { hood: 10, roof: 19, ws: 0.24, rs: 0.36, re: 0.84, tr: 0.9, tail: 13, nose: 9, boxy: true, short: true } },
    raiden:  { L: 17, W: 7, h1: 0.34, h2: 0.45, h3: 0.68, h4: 0.78, spoiler: 'wing', scoop: true,
      side: { hood: 10, roof: 17, ws: 0.33, rs: 0.45, re: 0.68, tr: 0.78, tail: 11, nose: 9, boxy: true } },
    truck:   { L: 18, W: 7, h1: 0.2, h2: 0.3, h3: 0.42, h4: 0.44, bed: true,
      side: { hood: 11, roof: 19, ws: 0.2, rs: 0.28, re: 0.42, tr: 0.44, tail: 12, nose: 10, boxy: true } }
  };
  Sprites.CAR_SHAPES = SHAPES;

  var PAINT = {
    red: '#c82828', white: '#e0e4ec', black: '#303040', blue: '#2858c0', yellow: '#e8c030',
    green: '#30904c', silver: '#9ca4b4', orange: '#e87028', purple: '#7840a8', panda: '#e0e4ec',
    navy: '#203070', pink: '#e070a0', teal: '#209898', gold: '#c8a040', brown: '#7c4c2c', ghost: '#f0f4fc'
  };
  Sprites.PAINT = PAINT;
  Sprites.PAINT_NAMES = {
    red: 'レッド', white: 'ホワイト', black: 'ブラック', blue: 'ブルー', yellow: 'イエロー', green: 'グリーン',
    silver: 'シルバー', orange: 'オレンジ', purple: 'パープル', panda: 'パンダ', navy: 'ネイビー', pink: 'ピンク',
    teal: 'ティール', gold: 'ゴールド', brown: 'ブラウン', ghost: 'ゴースト'
  };

  var topCache = {};
  // scale: 1(レース) / 2(フィールド)。返すキャンバスは前方が上
  Sprites.carTop = function (model, color, scale, dirt, lights) {
    scale = scale || 1;
    dirt = Math.round((dirt || 0) / 20);
    var key = [model, color, scale, dirt, lights ? 1 : 0].join(':');
    if (topCache[key]) return topCache[key];
    var sh = SHAPES[model] || SHAPES.comet;
    var L = sh.L * scale, W = sh.W * scale;
    var pad = 1 + scale;
    var p = new RR.Painter(W + pad * 2, L + pad * 2);
    var base = PAINT[color] || color || PAINT.red;
    var r = P.ramp(base);
    var glass = '#182438', glassHi = '#5878a0';
    var panda = color === 'panda';
    var tire = '#141418';
    var cx = (W - 1) / 2;
    // タイヤ
    [0.2, 0.78].forEach(function (u) {
      var ty = Math.round(u * (L - 1)) - scale;
      p.rect(pad - Math.max(1, scale >> 1) , pad + ty, Math.max(1, scale >> 1) + scale - 1, scale * 3, tire);
      p.rect(pad + W - scale + 1, pad + ty, Math.max(1, scale >> 1) + scale - 1, scale * 3, tire);
    });
    for (var y = 0; y < L; y++) {
      var u = y / (L - 1);
      for (var x = 0; x < W; x++) {
        var v = (x - cx) / (cx || 1);
        var av = Math.abs(v);
        // 角を丸める
        if (u < 0.07 && av > 0.62) continue;
        if (u < 0.03 && av > 0.35) continue;
        if (u > 0.95 && av > 0.7) continue;
        var col = r.base;
        if (v < -0.55) col = r.lt;
        if (v > 0.55) col = r.sh;
        if (av > 0.92) col = v < 0 ? r.base : r.dk;
        var inCabin = u >= sh.h1 && u < sh.h4;
        if (panda && !inCabin && (u < 0.2 || u > 0.9)) col = v > 0.55 ? '#404050' : '#303040';
        if (inCabin && av < 0.8) {
          if (u < sh.h2) col = glass;                 // フロントガラス
          else if (u < sh.h3) col = sh.open ? (av < 0.5 ? '#383038' : '#585058') : (v < -0.3 ? r.hi : r.lt);   // ルーフ / 座席
          else col = sh.bed ? '#404048' : glass;       // リアガラス / 荷台
          if (col === glass && v < -0.3 && ((y + x) % 3 === 0)) col = glassHi;
        } else if (!inCabin && av < 0.25 && u < sh.h1) {
          col = (v <= 0) ? r.lt : r.base; // ボンネットの稜線
        }
        if (sh.scoop && u > 0.15 && u < 0.26 && av < 0.3) col = '#202028';
        p.px(pad + x, pad + y, col);
      }
    }
    // ライト
    var lw = Math.max(1, scale);
    if (sh.popup && !lights) {
      p.rect(pad + 1, pad + scale, lw * 2, 1, r.dk); p.rect(pad + W - 1 - lw * 2, pad + scale, lw * 2, 1, r.dk);
    } else {
      var hl = lights ? '#fff8d0' : '#f0e8b0';
      p.rect(pad + 1, pad + (scale > 1 ? 1 : 0), lw + (scale > 1 ? 1 : 0), lw, hl);
      p.rect(pad + W - 1 - lw - (scale > 1 ? 1 : 0), pad + (scale > 1 ? 1 : 0), lw + (scale > 1 ? 1 : 0), lw, hl);
    }
    p.rect(pad + 0, pad + L - lw, lw + 1, lw, '#d82020');
    p.rect(pad + W - lw - 1, pad + L - lw, lw + 1, lw, '#d82020');
    // ミラー
    var my = Math.round(sh.h1 * (L - 1));
    p.rect(pad - 1, pad + my, 1, scale, r.base); p.rect(pad + W, pad + my, 1, scale, r.sh);
    // スポイラー
    if (sh.spoiler === 'wing') { p.rect(pad - 1, pad + L - 2 * scale, W + 2, scale, '#202028'); }
    else if (sh.spoiler === 'lip') { p.rect(pad + 1, pad + L - scale - 1, W - 2, 1, r.dk); }
    // 汚れ
    if (dirt > 0) {
      var rnd = U.rng(97 + dirt);
      for (var i = 0; i < dirt * W * L / 18; i++) {
        var dx = Math.floor(rnd() * W), dy = Math.floor(rnd() * L);
        if (rnd() < 0.6) p.px(pad + dx, pad + dy, rnd() < 0.5 ? '#6c5434' : '#8c7048');
      }
    }
    p.outline(0.25);
    var c = p.c;
    c.cx = (W + pad * 2) / 2; c.cy = (L + pad * 2) / 2;
    topCache[key] = c;
    return c;
  };

  // 横から見た車（右向き）64x28
  var sideCache = {};
  Sprites.carSide = function (model, color, dirt) {
    dirt = Math.round((dirt || 0) / 20);
    var key = [model, color, dirt].join(':');
    if (sideCache[key]) return sideCache[key];
    var shp = SHAPES[model] || SHAPES.comet, s = shp.side;
    var Wd = s.short ? 52 : 64, Hd = 28;
    var p = new RR.Painter(Wd + 2, Hd);
    var base = PAINT[color] || color || PAINT.red;
    var r = P.ramp(base);
    var panda = color === 'panda';
    var ground = Hd - 2;     // 接地ライン
    var bottom = ground - 4; // ボディ下端
    var wr = 5;
    var wheelX = [Math.round(Wd * 0.2), Math.round(Wd * 0.8)];
    // 上辺の高さ関数（右がフロント）
    function topAt(fx) {
      // fx: 0=リア, 1=フロント
      var q = 1 - fx; // 0=フロント
      var nose = s.nose, hood = s.hood, roof = s.roof, tail = s.tail;
      if (q < 0.04) return U.lerp(nose - 2, nose, q / 0.04);
      if (q < s.ws) return U.lerp(nose, hood, (q - 0.04) / (s.ws - 0.04));
      if (q < s.rs) return U.lerp(hood, roof, (q - s.ws) / (s.rs - s.ws));
      if (q < s.re) return roof;
      if (q < s.tr) return U.lerp(roof, tail + 1, (q - s.re) / (s.tr - s.re));
      if (q < 0.97) return U.lerp(tail + 1, tail, (q - s.tr) / (0.97 - s.tr));
      return tail - 1;
    }
    for (var x = 0; x < Wd; x++) {
      var fx = x / (Wd - 1), q = 1 - fx;
      var top = Math.round(topAt(fx));
      var yTop = bottom - top;
      for (var y = yTop; y <= bottom; y++) {
        var hy = bottom - y; // 下からの高さ
        var col = r.base;
        if (y === yTop) col = r.hi;
        else if (y === yTop + 1) col = r.lt;
        if (hy <= 2) col = r.sh;
        if (hy === 0) col = r.dk;
        // サイドのプレスライン
        if (hy === 4) col = r.lt;
        // 窓
        var inWin = q > s.ws + 0.025 && q < s.tr - 0.02 && hy > s.hood - 1 && y > yTop + 1;
        if (s.open) inWin = inWin && hy < s.hood + 2;
        if (inWin) {
          col = '#1c2840';
          if ((x + y) % 5 === 0 || (x + y) % 5 === 1) col = '#3c5478';
          // ピラー
          if (Math.abs(q - (s.rs + s.re) / 2) < 0.012) col = '#181820';
        }
        if (panda && !inWin && hy < s.hood - 1) col = hy <= 2 ? '#202028' : '#303040';
        p.px(x + 1, y, col);
      }
    }
    // ホイールアーチを削ってタイヤ
    wheelX.forEach(function (wx) {
      for (var yy = -wr - 1; yy <= wr + 1; yy++) for (var xx = -wr - 1; xx <= wr + 1; xx++) {
        var d = Math.sqrt(xx * xx + yy * yy);
        var px = wx + xx + 1, py = ground - wr + yy;
        if (d <= wr + 1.2 && py <= bottom + 1) p.g.clearRect(px, py, 1, 1);
      }
      for (yy = -wr; yy <= wr; yy++) for (xx = -wr; xx <= wr; xx++) {
        var dd = Math.sqrt(xx * xx + yy * yy);
        var c = null;
        if (dd <= wr + 0.3) c = '#18181c';
        if (dd <= wr - 1.6) c = '#7c8090';
        if (dd <= wr - 2.6) c = '#b8bcc8';
        if (dd <= 1.1) c = '#404048';
        if (c) p.px(wx + xx + 1, ground - wr + yy, c);
      }
    });
    // ライト類
    var fy = bottom - s.nose + 2;
    p.rect(Wd - 2, fy, 2, 2, shp.popup ? r.dk : '#f8f0c0');
    p.rect(1, bottom - s.tail + 2, 2, 2, '#d02020');
    if (shp.spoiler === 'wing') { p.rect(1, bottom - s.tail - 3, 8, 2, '#202028'); p.rect(4, bottom - s.tail - 1, 1, 2, '#202028'); }
    if (dirt > 0) {
      var rnd = U.rng(31 + dirt);
      for (var i = 0; i < dirt * 30; i++) {
        var dx = Math.floor(rnd() * Wd), dy = bottom - Math.floor(rnd() * 7);
        var d0 = p.g.getImageData(dx + 1, dy, 1, 1).data;
        if (d0[3] > 0) p.px(dx + 1, dy, rnd() < 0.5 ? '#6c5434' : '#8c7048');
      }
    }
    p.outline(0.25, true);
    sideCache[key] = p.c;
    return p.c;
  };
})();
