/* 店の背景（空・街並み・店構え）。ティアごとに作り、空と窓あかりは時間帯で毎フレーム変える。
 * 描画範囲は y=14..91（HUDとカウンターの間）。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, U = RP.util;
  var BG = RP.bg = {};
  var Y0 = 14, Y1 = 92, W = RP.W;

  // 空の色：夕暮れ(18:00)→深夜(24:00)
  var SKY = [
    { t: 0.0, top: '#5a3a7a', bot: '#e8805a' },
    { t: 0.25, top: '#2a2858', bot: '#a8506a' },
    { t: 0.55, top: '#141844', bot: '#4a3868' },
    { t: 1.0, top: '#080a26', bot: '#1a1c48' }
  ];
  function skyAt(p) {
    p = U.clamp(p, 0, 1);
    for (var i = 1; i < SKY.length; i++) {
      if (p <= SKY[i].t) {
        var a = SKY[i - 1], b = SKY[i], k = (p - a.t) / (b.t - a.t);
        return { top: U.mixHex(a.top, b.top, k), bot: U.mixHex(a.bot, b.bot, k) };
      }
    }
    return SKY[SKY.length - 1];
  }

  function Scene(tier, d, seed) {
    this.tier = tier; this.d = d;
    var r = new RP.Rng(seed || 1);
    this.stars = [];
    for (var i = 0; i < 40; i++) { this.stars.push({ x: r.int(0, W - 1), y: r.int(Y0, Y0 + 36), ph: r.next() * 6 }); }
    this.windows = [];
    this.layers = this.buildSkyline(r);
    this.t = 0;
  }

  // 街並みシルエット（静的キャンバス）＋窓リスト
  Scene.prototype.buildSkyline = function (r) {
    var tid = this.tier.id;
    var m = G.make(W, Y1 - Y0), cx = m.ctx, self = this;
    var base = Y1 - Y0;
    function building(x, w, h, col, win) {
      cx.fillStyle = G.color(col);
      cx.fillRect(x, base - h, w, h);
      cx.fillStyle = G.color('ink'); cx.globalAlpha = 0.25; cx.fillRect(x + w - 2, base - h, 2, h); cx.globalAlpha = 1;
      if (win) {
        for (var yy = base - h + 4; yy < base - 8; yy += 6) {
          for (var xx = x + 3; xx < x + w - 4; xx += 5) {
            if (r.next() < 0.7) { self.windows.push({ x: xx, y: yy + Y0, th: r.next(), c: r.chance(0.2) ? '#a8e0ff' : '#ffd870' }); }
          }
        }
      }
    }
    var layer = function (hMin, hMax, wMin, wMax, col, win) {
      var x = -4;
      while (x < W) {
        var w = r.int(wMin, wMax), h = r.int(hMin, hMax);
        building(x, w, h, col, win);
        x += w + r.int(0, 3);
      }
    };
    if (tid === 1) { layer(14, 30, 14, 30, '#1c1a3c', false); layer(10, 22, 12, 26, '#26224a', true); }
    else if (tid === 2) { layer(18, 34, 14, 28, '#1c1a3c', false); layer(10, 24, 12, 26, '#2a2650', true); }
    else if (tid === 3) { layer(24, 44, 16, 30, '#1c1a3c', true); layer(14, 30, 14, 28, '#2a2650', true); }
    else if (tid === 4) { layer(30, 56, 16, 30, '#201c46', true); layer(16, 36, 14, 28, '#2e2858', true); }
    else if (tid === 5) { layer(40, 74, 18, 34, '#201c46', true); layer(22, 50, 16, 30, '#2e2858', true); }
    else { layer(46, 76, 20, 36, '#241e50', true); layer(26, 54, 16, 32, '#322a60', true); }
    return m.canvas;
  };

  BG.create = function (tier, d, seed) { return new Scene(tier, d, seed); };

  // 構造物（ティア固有）。常に不変なので毎フレーム描く
  function drawStructure(s, t) {
    var tid = s.tier.id, d = s.d;
    // ---- ティア固有の背景物 ----
    if (tid === 1) {
      // ガード下：高架の梁とレンガ、頭上を電車が通る
      G.rect(0, Y0, W, 12, '#3a3248');
      for (var x = 0; x < W; x += 16) { G.rect(x, Y0, 1, 12, '#2a2438'); G.rect(x + 8, Y0 + 6, 1, 6, '#2a2438'); }
      G.rect(0, Y0 + 12, W, 2, '#14101c');
      G.rect(0, Y0 + 11, W, 1, '#5a5468');
      for (x = 6; x < W; x += 56) { G.rect(x, Y0 + 3, 3, 3, '#7c8aa0'); }
      // 電車（窓の光がときどき横切る）
      var tp = (t % 34) / 34;
      if (tp < 0.22) {
        var tx = Math.round(-120 + tp / 0.22 * (W + 240));
        for (var i = 0; i < 4; i++) {
          G.rect(tx + i * 30, Y0 + 1, 28, 8, '#9a96a8'); G.rect(tx + i * 30, Y0 + 6, 28, 1, '#d8382c');
          G.rect(tx + i * 30 + 3, Y0 + 2, 6, 3, '#ffd870'); G.rect(tx + i * 30 + 12, Y0 + 2, 6, 3, '#ffd870');
        }
      }
    } else if (tid === 2) {
      // 商店街アーケード
      G.rect(0, Y0, W, 8, '#4a566c'); G.rect(0, Y0 + 8, W, 2, '#2a2438');
      for (x = 0; x < W; x += 24) { G.rect(x, Y0, 2, 10, '#14101c'); G.rect(x + 11, Y0 + 2, 2, 6, '#7c8aa0'); }
      var flags = ['#d8382c', '#f8d848', '#48b04c', '#3c6cd0', '#f08ca8'];
      for (x = 4; x < W; x += 12) { G.rect(x, Y0 + 10, 8, 5, flags[(x / 12) % 5 | 0]); G.rect(x, Y0 + 10, 8, 1, '#14101c'); }
      G.rect(0, Y0 + 10, W, 1, '#14101c');
    } else if (tid === 3) {
      // 駅前：駅舎の庇と看板
      G.rect(0, Y0, W, 10, '#2e3a58'); G.rect(0, Y0 + 10, W, 2, '#14101c');
      G.rect(0, Y0 + 3, W, 1, '#7c8aa0');
      G.rect(150, Y0 + 14, 84, 12, '#14101c'); G.rect(151, Y0 + 15, 82, 10, '#2a8a4a');
      RP.text.draw('駅前', 192, Y0 + 14, 'white', { align: 'c' });
      for (x = 8; x < W; x += 40) { G.rect(x, Y0 + 12, 2, 6, '#14101c'); G.rect(x - 3, Y0 + 18, 8, 3, '#f8d848'); }
    } else if (tid === 4) {
      // 繁華街：ネオン看板がいくつも
      var neon = ['#ff4a8a', '#4ad8ff', '#ffd848', '#8aff4a', '#ff8a2c'];
      for (x = 6, i = 0; x < W - 24; x += 44, i++) {
        var c = neon[i % 5], bh = 14 + (i * 7) % 14;
        G.rect(x, Y0 + 2, 26, bh, '#14101c'); G.rect(x + 1, Y0 + 3, 24, bh - 2, c);
        G.alpha(0.55 + 0.45 * Math.sin(t * 5 + i)); G.rect(x + 3, Y0 + 5, 20, 2, '#ffffff'); G.rect(x + 3, Y0 + 9, 14, 2, '#ffffff'); G.alpha(1);
      }
    } else if (tid === 5) {
      // 大都会：巨大ビジョン
      G.rect(0, Y0, W, 6, '#14101c');
      var vx = 140, vw = 108;
      G.rect(vx, Y0 + 2, vw, 28, '#14101c'); G.rect(vx + 1, Y0 + 3, vw - 2, 26, '#101838');
      var ph = Math.floor(t * 1.5) % 4;
      G.rect(vx + 3 + ph * 24, Y0 + 5, 20, 22, ['#d8382c', '#f8d848', '#48b04c', '#3c6cd0'][ph]);
      RP.text.draw('RAMEN', vx + vw / 2, Y0 + 11, 'white', { align: 'c', outline: 'ink', size: 12 });
      for (x = 10; x < W; x += 30) { G.alpha(0.5); G.rect(x, Y0 + 32, 2, 20, '#ffffff'); G.alpha(1); }
    } else {
      // 本社：天下一の巨大看板と光の筋
      G.rect(0, Y0, W, 5, '#14101c');
      G.rect(92, Y0 + 2, 200, 26, '#14101c'); G.rect(93, Y0 + 3, 198, 24, '#8c1f2a');
      G.rect(93, Y0 + 3, 198, 3, '#d8382c');
      RP.text.draw('天下一ラーメン', 192, Y0 + 8, 'yellow', { align: 'c', outline: 'ink', size: 16, bold: true });
      for (x = 30; x < W; x += 60) { G.alpha(0.4 + 0.3 * Math.sin(t * 2 + x)); G.rect(x, Y0 + 30, 3, 30, '#f8d848'); G.alpha(1); }
    }

    // ---- 店構え：梁・暖簾・提灯 ----
    if (s.noFront) { return; }
    var by = tid === 1 ? Y0 + 24 : Y0 + 30;
    var span = Math.min(W - 10, 56 * s.tier.seats + 24);
    var bx = Math.round((W - span) / 2);
    G.rect(bx - 6, by, span + 12, 4, '#4e3020'); G.rect(bx - 6, by, span + 12, 1, '#a06a3c');
    G.rect(bx - 4, by + 4, 3, 62 - (by - Y0), '#4e3020'); G.rect(bx + span + 1, by + 4, 3, 62 - (by - Y0), '#4e3020');
    // 暖簾（のれん）
    var n = Math.max(3, s.tier.seats + 1), nw = Math.floor(span / n);
    var nc = d.decor.neon >= 3 ? ['#ffd848', '#d8382c'] : ['#d8382c', '#8c1f2a'];
    var kana = ['ら', 'ー', 'め', 'ん', '屋', '台', '天', '下', '一'];
    for (var k = 0; k < n; k++) {
      var nx = bx + k * nw, sway = Math.round(Math.sin(t * 1.3 + k * 0.7) * 1);
      G.rect(nx + 1, by + 4, nw - 2, 15, nc[k % 2]);
      G.rect(nx + 1, by + 17, nw - 2, 2, '#14101c');
      G.rect(nx + sway + nw - 3, by + 4, 1, 14, '#14101c');
      RP.text.draw(kana[(k + (tid - 1)) % kana.length], nx + nw / 2 + sway, by + 5, 'white', { align: 'c' });
    }
  }

  function drawDecor(s, t) {
    if (s.noFront) { return; }
    var d = s.d, tid = s.tier.id;
    var by = tid === 1 ? Y0 + 24 : Y0 + 30;
    var span = Math.min(W - 10, 56 * s.tier.seats + 24);
    var bx = Math.round((W - span) / 2), i;
    // 提灯
    var nl = d.decor.lantern || 0;
    for (i = 0; i < nl; i++) {
      var lx = i % 2 === 0 ? bx - 14 - Math.floor(i / 2) * 12 : bx + span + 6 + Math.floor(i / 2) * 12;
      var swing = Math.round(Math.sin(t * 1.6 + i) * 1);
      G.rect(lx + 3, by, 1, 4, 'ink');
      G.sprite('lantern', lx + swing, by + 4);
      G.glow(lx + 4 + swing, by + 9, 13, 'orange', 0.4 + 0.1 * Math.sin(t * 6 + i));
    }
    if (!nl) {
      // 標準の小さな提灯
      G.sprite('lantern', bx - 12, by + 4);
    }
    // 大漁旗
    if (d.decor.flag) {
      var fc = ['#d8382c', '#f8d848', '#3c6cd0', '#48b04c', '#f08ca8', '#ffffff'];
      for (i = 0; i < 12; i++) {
        var fx = 8 + i * 8, fy = Y0 + 20 + Math.round(Math.sin(i * 0.9 + t * 3) * 1);
        G.rect(fx, fy, 6, 7, fc[i % fc.length]); G.rect(fx, fy, 6, 1, 'ink'); G.rect(fx + 2, fy + 7, 2, 1, fc[i % fc.length]);
      }
      G.rect(6, Y0 + 19, W - 12, 1, 'ink');
    }
    // 花輪
    var nw2 = d.decor.wreath || 0;
    for (i = 0; i < nw2; i++) {
      var wx = W - 30 - i * 26, wy = Y0 + 44;
      G.rect(wx + 9, wy + 14, 2, 18, 'wood'); G.rect(wx + 4, wy + 31, 12, 2, 'wood');
      G.disc(wx + 10, wy + 8, 9, 'pink'); G.disc(wx + 10, wy + 8, 6, 'white'); G.disc(wx + 10, wy + 8, 3, ['yellow', 'red', 'cyan'][i % 3]);
      G.px(wx + 4, wy + 3, 'yellow'); G.px(wx + 16, wy + 12, 'lime');
    }
    // ネオン看板
    var nn = d.decor.neon || 0;
    if (nn > 0) {
      var cols = ['#ff4a8a', '#4ad8ff', '#ffd848', '#8aff4a', '#ff8a2c'];
      for (i = 0; i < nn; i++) {
        var ex = 6 + i * 20, ey = Y0 + 46 + (i % 2) * 10;
        var on = Math.sin(t * (3 + i) + i * 2) > -0.4;
        G.rect(ex, ey, 14, 5, '#14101c');
        if (on) { G.rect(ex + 1, ey + 1, 12, 3, cols[i % 5]); G.glow(ex + 7, ey + 2, 11, cols[i % 5], 0.4); }
      }
    }
    // LED電飾：梁に沿って流れる虹色
    if (d.decor.led) {
      var lc = ['#d8382c', '#f8d848', '#48b04c', '#4ad8ff', '#8a4aff'];
      var xs = bx - 6, xe = bx + span + 6;
      for (var lxx = xs; lxx < xe; lxx += 6) { G.rect(lxx, by + 5 + 0, 3, 3, lc[(((lxx - xs) / 6 | 0) + Math.floor(t * 6)) % 5]); }
    }
    // 招き猫・植物・看板犬は暖簾の脇（カウンターの上に）
    if (d.decor.cat) {
      var cc = d.decor.cat;
      var pal = cc === 1 ? null : (cc === 2 ? { w: '#f8d848', K: '#8a5a30' } : { w: '#ffffff', r: '#ff4a8a' });
      G.sprite('cat', 8, 76, { pal: pal, sx: cc === 3 ? 1 : 1 });
      var wave = Math.floor(t * 2) % 2;
      G.rect(18, 76 + wave, 2, 3, pal ? '#f8d848' : '#f6efdc');
    }
    if (d.decor.plant) { G.sprite('plant', W - 20, 74); }
    if (d.decor.dog) {
      var bob = Math.floor(t * 2.2) % 2;
      G.sprite('dog', W - 44, 78 + bob);
    }
    if (d.decor.sign) {
      for (i = 0; i < d.decor.sign; i++) {
        var sx = 30 + i * 12;
        G.rect(sx, Y0 + 56, 9, 11, '#e8dcc0'); G.rect(sx, Y0 + 56, 9, 1, '#14101c'); G.rect(sx, Y0 + 66, 9, 1, '#14101c');
        G.rect(sx + 2, Y0 + 59, 5, 1, '#8c1f2a'); G.rect(sx + 2, Y0 + 62, 4, 1, '#8c1f2a');
      }
    }
    if (d.decor.mascot) {
      // 着ぐるみ「ラーメンくん」
      var mx = W - 70, my = 56 + (Math.floor(t * 3) % 2);
      G.rect(mx, my, 14, 14, '#14101c'); G.rect(mx + 1, my + 1, 12, 12, '#f0d890');
      G.rect(mx + 3, my + 4, 2, 2, 'ink'); G.rect(mx + 9, my + 4, 2, 2, 'ink'); G.rect(mx + 5, my + 8, 4, 1, 'red');
      G.rect(mx + 2, my + 14, 10, 8, '#d8382c'); G.rect(mx + 5, my - 3, 4, 3, '#a8642c');
    }
  }

  // 描画。p: 営業の進行度 0..1
  BG.draw = function (s, p, rush, dt) {
    s.t += dt || 0;
    var t = s.t;
    var morning = p < 0;
    var sky = morning ? { top: '#6aa8e8', bot: '#fce6bc' } : skyAt(p);
    if (morning) { p = 0; }
    G.vgrad(0, Y0, W, Y1 - Y0, sky.top, sky.bot, 10);
    if (morning) {
      // 朝の雲
      for (var ci = 0; ci < 4; ci++) {
        var cxx = ((ci * 110 + t * (4 + ci)) % (W + 60)) - 30, cyy = Y0 + 8 + ci * 9;
        G.rect(cxx, cyy, 26, 5, '#ffffff'); G.rect(cxx + 5, cyy - 3, 14, 4, '#ffffff'); G.rect(cxx + 2, cyy + 4, 22, 2, '#e8e0f0');
      }
    }
    // 星
    if (p > 0.15) {
      var a = U.clamp((p - 0.15) * 2, 0, 1);
      for (var i = 0; i < s.stars.length; i++) {
        var st = s.stars[i];
        var tw = Math.sin(t * 2 + st.ph) > 0.2 ? 1 : 0.35;
        G.alpha(a * tw); G.px(st.x, st.y, 'white'); G.alpha(1);
      }
    }
    // 月
    if (p > 0.3) { G.alpha(U.clamp((p - 0.3) * 2, 0, 1)); G.disc(330, Y0 + 24, 6, '#f6efdc'); G.disc(328, Y0 + 23, 5, '#fff6d0'); G.alpha(1); }
    // 街並み
    G.ctx.drawImage(s.layers, 0, Y0);
    // 窓あかり：夜が深いほど灯る（朝は消灯）
    for (i = 0; i < s.windows.length && !morning; i++) {
      var w = s.windows[i];
      if (w.th < p * 1.2 + 0.1) { G.rect(w.x, w.y, 2, 3, w.c); }
    }
    drawStructure(s, t);
    drawDecor(s, t);
    // ミラーボール（ラッシュ中）
    if (s.d.decor.mirror && rush) {
      var mx2 = 192, my2 = Y0 + 8;
      G.rect(mx2, Y0, 1, 6, 'silver'); G.disc(mx2, my2 + 2, 5, '#c8c8d0'); G.disc(mx2 - 1, my2 + 1, 2, '#ffffff');
      var cols2 = ['#ff4a8a', '#4ad8ff', '#ffd848', '#8aff4a'];
      for (i = 0; i < 6; i++) {
        var ang = t * 1.5 + i, rx = 192 + Math.cos(ang) * 120, ry = 60 + Math.sin(ang * 1.3) * 22;
        G.alpha(0.22); G.disc(rx, ry, 8, cols2[i % 4]); G.alpha(1);
      }
    }
  };

  BG.Y0 = Y0; BG.Y1 = Y1;
})(window.RP);
