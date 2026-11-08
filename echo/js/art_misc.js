/* art_misc.js ― ロゴ・惑星（地球）などの生成（ポートレートは portraits.js） */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var G = EB.Gfx, U = EB.U;

  // ================= ロゴ =================
  function makeLogo(text, scale, colTop, colBot) {
    var F = EB.Font.fonts, cw = 5 * scale + scale, w = text.length * cw + 8, h = 7 * scale + 8;
    var c = G.mkCanvas(w, h), x = c.getContext('2d');
    var mask = G.mkCanvas(w, h), m = mask.getContext('2d');
    m.fillStyle = '#fff';
    for (var i = 0; i < text.length; i++) {
      var rows = F[text.charAt(i)] || F[' '];
      for (var y = 0; y < 7; y++) for (var b = 0; b < 5; b++) if (rows[y] & (1 << (4 - b))) m.fillRect(4 + i * cw + b * scale, 4 + y * scale, scale, scale);
    }
    // 影・輪郭
    var o = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]];
    var dark = G.silhouette({ c: mask, w: w, h: h, ox: 0, oy: 0 }, '#0a1030');
    for (var k = 0; k < o.length; k++) x.drawImage(dark.c, o[k][0] * 2, o[k][1] * 2);
    x.drawImage(dark.c, 3, 4);
    // 本体（縦グラデーション）
    var grad = G.mkCanvas(w, h), gx = grad.getContext('2d');
    for (var yy = 0; yy < h; yy++) {
      var t = Math.max(0, Math.min(1, (yy - 4) / (7 * scale)));
      gx.fillStyle = U.mix(colTop, colBot, t);
      gx.fillRect(0, yy, w, 1);
    }
    var body = G.mkCanvas(w, h), bx = body.getContext('2d');
    bx.drawImage(mask, 0, 0);
    bx.globalCompositeOperation = 'source-in';
    bx.drawImage(grad, 0, 0);
    x.drawImage(body, 0, 0);
    // ハイライト線
    x.globalCompositeOperation = 'source-atop';
    return { c: c, w: w, h: h, ox: w / 2, oy: h / 2 };
  }
  var logos = {};
  EB.Logo = function (text, scale, top, bot) {
    var k = text + scale + top + bot;
    return logos[k] || (logos[k] = makeLogo(text, scale, top || '#ffffff', bot || '#5aa0ff'));
  };

  // ================= 惑星 =================
  function hash(ix, iy, seed) {
    var h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, seed) { return vnoise(x, y, seed) * 0.55 + vnoise(x * 2.1, y * 2.1, seed + 1) * 0.28 + vnoise(x * 4.3, y * 4.3, seed + 2) * 0.17; }

  // 惑星生成。opts: {ocean:[r,g,b], land:[r,g,b], land2:[...], cloud:bool, seed, bands:bool, atmo:[r,g,b], light:[x,y], sea:0.5}
  EB.Planet = function (R, o) {
    o = o || {};
    var S = R * 2 + 6, c = G.mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    var seed = o.seed || 7, L = o.light || [-0.55, -0.55], ll = Math.sqrt(L[0] * L[0] + L[1] * L[1] + 0.5);
    var lx = L[0] / ll, ly = L[1] / ll, lz = Math.sqrt(0.5) / ll;
    var ocean = o.ocean || [30, 80, 190], land = o.land || [60, 150, 70], land2 = o.land2 || [190, 170, 110], atmo = o.atmo || [120, 190, 255];
    var cx = S / 2, cy = S / 2;
    for (var y = 0; y < S; y++) for (var xx = 0; xx < S; xx++) {
      var dx = (xx + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R, dd = dx * dx + dy * dy, i = (y * S + xx) * 4;
      if (dd > 1) {
        var rim = Math.sqrt(dd) - 1;
        if (rim < 0.07 && o.atmo !== false) {
          var lit = Math.max(0, dx * lx + dy * ly + 0.3);
          if (lit > 0.3) { d[i] = atmo[0]; d[i + 1] = atmo[1]; d[i + 2] = atmo[2]; d[i + 3] = rim < 0.035 ? 200 : 90; }
        }
        continue;
      }
      var nz = Math.sqrt(1 - dd);
      var u = Math.atan2(dx, nz) / Math.PI, v = Math.asin(dy) / Math.PI;
      var col;
      if (o.bands) {
        var bn = Math.sin(v * 22 + fbm(u * 3, v * 6, seed) * 5) * 0.5 + 0.5;
        var k = Math.floor(bn * 4) / 4;
        col = [ocean[0] + (land[0] - ocean[0]) * k, ocean[1] + (land[1] - ocean[1]) * k, ocean[2] + (land[2] - ocean[2]) * k];
      } else {
        var n = fbm(u * 5 + 3, v * 5 + 1, seed);
        if (n > (o.sea || 0.52)) { var t2 = Math.abs(v) * 2; col = [land[0] + (land2[0] - land[0]) * t2, land[1] + (land2[1] - land[1]) * t2, land[2] + (land2[2] - land[2]) * t2]; }
        else { var depth = Math.max(0, n / (o.sea || 0.52)); col = [ocean[0] * (0.7 + 0.3 * depth), ocean[1] * (0.7 + 0.3 * depth), ocean[2] * (0.75 + 0.25 * depth)]; }
        if (o.cloud) {
          var cl = fbm(u * 6 + 11, v * 8 + 5, seed + 9);
          if (cl > 0.6) { var a = Math.min(1, (cl - 0.6) * 6); col = [col[0] + (245 - col[0]) * a, col[1] + (248 - col[1]) * a, col[2] + (255 - col[2]) * a]; }
        }
      }
      var sh = Math.max(0, dx * lx + dy * ly + nz * lz);
      sh = Math.floor(sh * 5) / 5;                 // 階調を落としてレトロに
      var f = 0.18 + sh * 0.95;
      d[i] = Math.min(255, col[0] * f); d[i + 1] = Math.min(255, col[1] * f); d[i + 2] = Math.min(255, col[2] * f); d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return { c: c, w: S, h: S, ox: S / 2, oy: S / 2 };
  };
  EB.Art = { hash: hash, vnoise: vnoise, fbm: fbm };
})();
