/* レース描画: 画面の各画素を逆回転してワールドテクスチャを引く（GBA のアフィンBGと同じ考え方）
 * 照明（アンビエント+ヘッドライト+街灯）と霧は LUT で一括変換する
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, P = RR.Pal, C = RR.Course;
  var W = 240, H = 160;
  var R = RR.RaceRender = {};
  var img = null, buf32 = null, lightBuf = new Float32Array(W * H);
  var LUT = null, lutKey = '';
  var NL = 8, NF = 4, NI = 40;
  var BAY = P.BAYER;
  R.ANCHOR_X = 120; R.ANCHOR_Y = 112;

  function rgbOf(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  // LUT[(idx*NL + light)*NF + fog] = ABGR
  function buildLUT(course, ambTint, fogCol, fogDen) {
    var key = course.id + ambTint.join(',') + fogCol + fogDen;
    if (key === lutKey) return;
    lutKey = key;
    LUT = new Uint32Array(NI * NL * NF);
    var pal = course.pal, idx = C.IDX;
    var fc = rgbOf(fogCol);
    for (var name in idx) {
      var i = idx[name];
      var col = rgbOf(pal[name] || '#ff00ff');
      for (var l = 0; l < NL; l++) {
        var lf = l / (NL - 1);
        // 暗部は青く、明部は暖色寄り
        var k = 0.1 + lf * 0.95;
        var r = col[0] * k * U.lerp(ambTint[0], 1.05, lf), g = col[1] * k * U.lerp(ambTint[1], 1.0, lf), b = col[2] * k * U.lerp(ambTint[2], 0.92, lf);
        for (var f = 0; f < NF; f++) {
          var ff = f / (NF - 1) * fogDen;
          var fr = fc[0] * (0.25 + lf * 0.6), fg = fc[1] * (0.25 + lf * 0.6), fb = fc[2] * (0.25 + lf * 0.6);
          var rr = U.lerp(r, fr, ff), gg = U.lerp(g, fg, ff), bb = U.lerp(b, fb, ff);
          // 15bit カラーに丸める
          rr = Math.min(248, Math.round(rr / 8) * 8); gg = Math.min(248, Math.round(gg / 8) * 8); bb = Math.min(248, Math.round(bb / 8) * 8);
          LUT[(i * NL + l) * NF + f] = (255 << 24) | (bb << 16) | (gg << 8) | rr;
        }
      }
    }
  }

  // view: {x,y (カメラ基準=自車ワールド座標), ang(カメラ向き), k(px/m), amb(0..1), tint, fog, cars:[..], lamps}
  R.draw = function (g, course, view) {
    if (!img) { img = g.createImageData(W, H); buf32 = new Uint32Array(img.data.buffer); }
    var fogDen = course.fog || 0;
    buildLUT(course, view.tint || [0.55, 0.65, 1.15], view.fogCol || '#9098a8', fogDen);
    // ---- 照明バッファ ----
    var amb = view.amb;
    lightBuf.fill(amb);
    var ax = R.ANCHOR_X, ay = R.ANCHOR_Y, k = view.k;
    (view.cars || []).forEach(function (c) {
      if (!c.lightsOn) return;
      var sp = R.toScreen(view, c.x, c.y);
      var ang = c.psi - view.ang;
      headlight(sp[0], sp[1], ang, k, c.player ? 1 : 0.8);
    });
    (course.lamps || []).forEach(function (L) {
      var sp = R.toScreen(view, L.x, L.y);
      var r = L.r * k;
      if (sp[0] < -r || sp[0] > W + r || sp[1] < -r || sp[1] > H + r) return;
      addRadial(sp[0], sp[1], r, 0.75);
    });
    // ---- テクスチャ参照 ----
    var cs = Math.cos(view.ang), sn = Math.sin(view.ang);
    var ppm = C.PPM;
    var sx = ppm / k;
    var dxx = cs * sx, dxy = sn * sx;        // 画面x方向への1px
    var dyx = -sn * sx, dyy = cs * sx;       // 画面y方向への1px
    var ox = view.x * ppm, oy = view.y * ppm;
    var tx0 = ox - ax * dxx - ay * dyx, ty0 = oy - ax * dxy - ay * dyy;
    var chunks = course.chunks, CW = course.CW, TW = course.TW, TH = course.TH;
    var BG = C.bgTex();
    var fogOn = fogDen > 0;
    var p = 0;
    for (var y = 0; y < H; y++) {
      var tx = tx0 + y * dyx, ty = ty0 + y * dyy;
      var brow = (y & 3) * 4;
      for (var x = 0; x < W; x++, p++) {
        var ix = tx | 0, iy = ty | 0;
        var v;
        if (ix >= 0 && iy >= 0 && ix < TW && iy < TH) {
          var ch = chunks[(iy >> 6) * CW + (ix >> 6)];
          v = ch ? ch[((iy & 63) << 6) | (ix & 63)] : BG[((iy & 127) << 7) | (ix & 127)];
        } else v = BG[((iy & 127) << 7) | (ix & 127)];
        var lv = lightBuf[p] * 7 + BAY[brow + (x & 3)] - 0.5;
        lv = lv < 0 ? 0 : lv > 7 ? 7 : lv | 0;
        var f = 0;
        if (fogOn) {
          var ddx = x - ax, ddy = (y - ay) * 1.2;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          f = (dist - 22) / 38 + BAY[brow + (x & 3)] - 0.5;
          f = f < 0 ? 0 : f > 3 ? 3 : f | 0;
        }
        buf32[p] = LUT[(v * NL + lv) * NF + f];
        tx += dxx; ty += dxy;
      }
    }
    g.putImageData(img, 0, 0);
  };

  function headlight(cx, cy, ang, k, power) {
    // 車の前端から前方へ扇形
    var fx = Math.sin(ang), fy = -Math.cos(ang);
    var ox = cx + fx * 2.0 * k, oy = cy + fy * 2.0 * k;
    var reach = 30 * k, reach2 = reach * reach;
    var x0 = Math.max(0, Math.floor(Math.min(ox, ox + fx * reach) - reach * 0.7)), x1 = Math.min(W - 1, Math.ceil(Math.max(ox, ox + fx * reach) + reach * 0.7));
    var y0 = Math.max(0, Math.floor(Math.min(oy, oy + fy * reach) - reach * 0.7)), y1 = Math.min(H - 1, Math.ceil(Math.max(oy, oy + fy * reach) + reach * 0.7));
    for (var y = y0; y <= y1; y++) {
      var dy = y - oy;
      for (var x = x0; x <= x1; x++) {
        var dx = x - ox;
        var fwd = dx * fx + dy * fy;
        var lat = dx * fy - dy * fx;
        var d2 = dx * dx + dy * dy;
        var p = y * W + x;
        if (fwd > -2 && d2 < reach2) {
          var w = fwd * 0.42 + 5;
          var la = lat < 0 ? -lat : lat;
          if (la < w) {
            var t = 1 - Math.sqrt(d2) / reach;
            var e = 1 - la / w;
            lightBuf[p] += power * t * (0.35 + 0.65 * e) * 0.95;
          }
        }
        // 車体周りのほのかな光
        if (d2 < 260) lightBuf[p] += (1 - d2 / 260) * 0.25 * power;
      }
    }
  }
  function addRadial(cx, cy, r, s) {
    var x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
    var y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / r;
      if (d < 1) lightBuf[y * W + x] += (1 - d) * s;
    }
  }

  // ワールド座標 → 画面座標
  R.toScreen = function (view, wx, wy) {
    var dx = wx - view.x, dy = wy - view.y;
    var cs = Math.cos(view.ang), sn = Math.sin(view.ang);
    var rx = dx * cs + dy * sn;          // カメラ右方向
    var fw = dx * sn - dy * cs;          // カメラ前方向
    return [R.ANCHOR_X + rx * view.k, R.ANCHOR_Y - fw * view.k];
  };

  // 車のスプライト（回転）
  R.drawCar = function (g, view, car, spr, opt) {
    var sp = R.toScreen(view, car.x, car.y);
    if (sp[0] < -30 || sp[0] > W + 30 || sp[1] < -30 || sp[1] > H + 30) return;
    var ang = car.psi - view.ang;
    var sc = view.k / C.PPM;
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(Math.round(sp[0]), Math.round(sp[1]));
    g.rotate(ang);
    g.scale(sc, sc);
    // 影
    g.globalAlpha = 0.45; g.fillStyle = '#000008';
    g.fillRect(-spr.width / 2 + 2, -spr.height / 2 + 2, spr.width - 2, spr.height - 2);
    g.globalAlpha = 1;
    g.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
    // ブレーキランプ
    if (opt && opt.brake) {
      g.fillStyle = '#ff4030';
      g.fillRect(-spr.width / 2 + 1, spr.height / 2 - 3, 3, 2);
      g.fillRect(spr.width / 2 - 4, spr.height / 2 - 3, 3, 2);
      g.globalAlpha = 0.22;
      g.fillRect(-spr.width / 2, spr.height / 2 - 1, spr.width, 3);
      g.globalAlpha = 1;
    }
    if (opt && opt.lights) {
      g.fillStyle = '#fff8d0';
      g.fillRect(-spr.width / 2 + 2, -spr.height / 2 + 1, 2, 1);
      g.fillRect(spr.width / 2 - 4, -spr.height / 2 + 1, 2, 1);
    }
    g.restore();
  };

  // 煙・火花
  R.drawParticles = function (g, view, parts) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var sp = R.toScreen(view, p.x, p.y);
      if (sp[0] < -10 || sp[0] > W + 10 || sp[1] < -10 || sp[1] > H + 10) continue;
      var t = p.t / p.life;
      if (p.kind === 'spark') {
        g.fillStyle = t < 0.5 ? '#fff8a0' : '#f89838';
        g.fillRect(Math.round(sp[0]), Math.round(sp[1]), 1, 1);
        continue;
      }
      var r = Math.max(1, Math.round((p.r0 + t * p.r1) * view.k / 4));
      var a = (1 - t) * (p.kind === 'dust' ? 0.5 : 0.42);
      g.globalAlpha = a;
      g.fillStyle = p.kind === 'dust' ? '#8c7c60' : '#c8c8d0';
      var cx = Math.round(sp[0]), cy = Math.round(sp[1]);
      g.fillRect(cx - r, cy - r + 1, r * 2, r * 2 - 2);
      g.fillRect(cx - r + 1, cy - r, r * 2 - 2, r * 2);
      g.globalAlpha = 1;
    }
  };
})();
