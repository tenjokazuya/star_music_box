/* props.js — 木・家・家具・仕掛けなど、タイルより大きな物のドット絵（実行時に生成）
 *
 * Game.props.get(名前, 引数) → { w, h, fw, fh, solid, frames:[canvas...], rate }
 *   w,h: 絵の大きさ(px)   fw,fh: 地面に接するタイル数（当たり判定の大きさ。左下をそろえて置く）
 *   frames が複数ならアニメ（rate フレームごとに切り替え）
 * 絵はすべて「下端を足もとのタイルの下端にそろえる」。
 */
(function () {
  'use strict';

  var P = Game.pal;
  var INK = '#241a2e';
  var props = Game.props = { defs: {}, cache: {} };

  function def(name, spec, build) { props.defs[name] = { spec: spec, build: build }; }

  function mk(w, h, fn, noOutline, ink) {
    var cv = Game.gfx.make(w, h, fn);
    if (!noOutline) { Game.gfx.outline(cv, ink || INK); }
    return cv;
  }
  function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

  /** 左上から光が当たる球の陰影 */
  function ball(g, cx, cy, r, cols) {
    for (var y = -r; y <= r; y++) {
      for (var x = -r; x <= r; x++) {
        var d = Math.sqrt(x * x + y * y);
        if (d > r + 0.2) { continue; }
        var t = (x * 0.55 + y * 0.8) / r;          // -1(明) 〜 1(暗)
        var k = d / r > 0.9 ? 3 : (t < -0.45 ? 0 : (t < 0.2 ? 1 : (t < 0.62 ? 2 : 3)));
        px(g, cx + x, cy + y, cols[Math.min(k, cols.length - 1)]);
      }
    }
  }

  /* ================= 木・草木・岩 ================= */
  function treeBuild(cols, trunk) {
    return mk(16, 32, function (g) {
      // みき
      rect(g, 6, 20, 4, 10, trunk[1]); rect(g, 6, 20, 1, 10, trunk[0]); rect(g, 9, 20, 1, 10, trunk[2]);
      rect(g, 5, 28, 6, 2, trunk[1]); px(g, 5, 29, trunk[2]); px(g, 10, 29, trunk[2]);
      // はっぱ
      ball(g, 8, 9, 7, cols);
      ball(g, 4, 13, 4, cols);
      ball(g, 12, 13, 4, cols);
      ball(g, 8, 16, 5, cols);
      px(g, 5, 6, cols[0]); px(g, 6, 5, cols[0]); px(g, 7, 4, cols[0]);
      px(g, 10, 13, cols[3]); px(g, 6, 15, cols[3]); px(g, 11, 9, cols[3]);
    });
  }
  def('tree', { w: 16, h: 32, fw: 1, fh: 1, solid: true }, function () {
    return [treeBuild(['#9ae27c', '#62c05e', '#3f9650', '#2a7444'], [P.k2, P.k3, P.k4])];
  });
  def('tree_dark', { w: 16, h: 32, fw: 1, fh: 1, solid: true }, function () {
    return [treeBuild(['#5cae6c', '#3a8a58', '#2a6a4c', '#1c4c3e'], ['#8a6a46', '#664a32', '#463222'])];
  });
  def('pine', { w: 16, h: 32, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 32, function (g) {
      rect(g, 7, 26, 2, 4, P.k3); rect(g, 7, 26, 1, 4, P.k2);
      var cols = ['#4cae6a', '#2f8a58', '#1f6a4c'];
      var tiers = [[8, 3, 4], [8, 8, 6], [8, 14, 7], [8, 20, 8]];
      tiers.forEach(function (t) {
        for (var i = 0; i < 6; i++) {
          var w = Math.round(t[2] * (i + 1) / 6);
          rect(g, t[0] - w, t[1] + i, w * 2, 1, i < 2 ? cols[0] : (i < 4 ? cols[1] : cols[2]));
        }
      });
      for (var y = 5; y < 25; y += 3) { px(g, 4 + (y % 5), y, cols[0]); }
    })];
  });
  def('bush', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      var c = ['#9ae27c', '#62c05e', '#3f9650', '#2a7444'];
      ball(g, 5, 10, 4, c); ball(g, 11, 10, 4, c); ball(g, 8, 8, 5, c);
      px(g, 10, 6, '#ff9ac0'); px(g, 5, 9, '#ff9ac0'); px(g, 12, 10, '#ffffff');
    })];
  });
  def('rock', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      ball(g, 8, 9, 6, ['#d0d0dc', '#a8a8bc', '#7e7e98', '#5c5c78']);
      px(g, 6, 5, '#f4f4fa'); px(g, 7, 5, '#f4f4fa'); px(g, 5, 6, '#e0e0ec');
    })];
  });
  def('boulder', { w: 16, h: 16, fw: 1, fh: 1, solid: true, pushable: true }, function () {
    return [mk(16, 16, function (g) {
      ball(g, 8, 8, 7, ['#e0dccc', '#b8b0a0', '#8a8272', '#625a50']);
      px(g, 5, 4, '#fffef4'); px(g, 6, 3, '#fffef4'); px(g, 7, 3, '#fffef4');
      px(g, 10, 9, '#625a50'); px(g, 9, 10, '#625a50'); px(g, 4, 10, '#8a8272');
    })];
  });
  def('boulder_dark', { w: 16, h: 16, fw: 1, fh: 1, solid: true, pushable: true }, function () {
    return [mk(16, 16, function (g) {
      ball(g, 8, 8, 7, ['#9a8aa4', '#766a84', '#58506a', '#3c3650']);
      px(g, 5, 4, '#cfc4d8'); px(g, 6, 3, '#cfc4d8'); px(g, 7, 3, '#cfc4d8');
      px(g, 10, 9, '#3c3650'); px(g, 9, 10, '#3c3650');
    })];
  });
  def('crate', { w: 16, h: 16, fw: 1, fh: 1, solid: true, pushable: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 1, 1, 14, 14, P.k2);
      rect(g, 1, 1, 14, 2, P.k1); rect(g, 1, 13, 14, 2, P.k3);
      rect(g, 1, 1, 2, 14, P.k1); rect(g, 13, 1, 2, 14, P.k3);
      rect(g, 3, 3, 10, 10, '#c89a60');
      for (var i = 0; i < 4; i++) { px(g, 3 + i, 3 + i, P.k3); px(g, 12 - i, 3 + i, P.k3); px(g, 3 + i, 12 - i, P.k3); px(g, 12 - i, 12 - i, P.k3); }
      rect(g, 3, 7, 10, 2, P.k3); rect(g, 3, 7, 10, 1, P.k2);
      px(g, 2, 2, P.k5); px(g, 13, 2, P.k5); px(g, 2, 13, P.k5); px(g, 13, 13, P.k5);
    })];
  });
  def('barrel', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 2, 2, 12, 13, P.k2);
      rect(g, 3, 1, 10, 1, P.k1);
      rect(g, 2, 3, 2, 11, P.k1); rect(g, 12, 3, 2, 11, P.k3);
      rect(g, 4, 3, 8, 11, '#c89a60');
      for (var x = 5; x < 12; x += 3) { rect(g, x, 3, 1, 11, P.k3); }
      rect(g, 2, 4, 12, 2, '#7a7a90'); rect(g, 2, 11, 12, 2, '#7a7a90');
      rect(g, 2, 4, 12, 1, '#b4b4c8'); rect(g, 2, 11, 12, 1, '#b4b4c8');
      rect(g, 4, 14, 8, 1, P.k4);
    })];
  });
  def('barrel_oil', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 2, 2, 12, 13, '#3a4a6a');
      rect(g, 3, 1, 10, 1, '#6a7aa0');
      rect(g, 2, 3, 2, 11, '#5a6a90'); rect(g, 12, 3, 2, 11, '#2a3450');
      rect(g, 4, 3, 8, 11, '#46587c');
      rect(g, 2, 4, 12, 2, '#8a8aa0'); rect(g, 2, 11, 12, 2, '#8a8aa0');
      rect(g, 2, 4, 12, 1, '#c4c4d8'); rect(g, 2, 11, 12, 1, '#c4c4d8');
      // しずくのしるし
      rect(g, 7, 6, 2, 1, '#f6d04a'); rect(g, 6, 7, 4, 3, '#f6d04a'); px(g, 6, 7, '#fff0a0');
      rect(g, 4, 14, 8, 1, '#1a2238');
    })];
  });
  def('sign', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 7, 9, 2, 6, P.k3); rect(g, 7, 9, 1, 6, P.k2);
      rect(g, 2, 2, 12, 8, P.k1); rect(g, 2, 2, 12, 1, '#f0c88a'); rect(g, 2, 9, 12, 1, P.k3);
      rect(g, 3, 4, 7, 1, P.k4); rect(g, 3, 6, 9, 1, P.k4); rect(g, 3, 8, 5, 1, P.k4);
      px(g, 3, 3, P.k5); px(g, 12, 3, P.k5);
    })];
  });
  def('fence', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 0, 7, 16, 2, P.k2); rect(g, 0, 7, 16, 1, P.k1); rect(g, 0, 12, 16, 2, P.k2); rect(g, 0, 12, 16, 1, P.k1);
      [1, 11].forEach(function (x) { rect(g, x, 4, 3, 11, P.k2); rect(g, x, 4, 1, 11, P.k1); rect(g, x + 2, 4, 1, 11, P.k3); rect(g, x, 3, 3, 1, P.k1); });
    })];
  });
  def('lamppost', { w: 16, h: 32, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 32, function (g) {
      rect(g, 7, 10, 2, 20, '#4a4a62'); rect(g, 7, 10, 1, 20, '#6a6a84');
      rect(g, 5, 28, 6, 2, '#3a3a52');
      rect(g, 4, 2, 8, 9, '#6a6a84'); rect(g, 5, 3, 6, 7, '#fff2a8'); rect(g, 6, 4, 2, 3, '#ffffff');
      rect(g, 3, 1, 10, 2, '#4a4a62'); rect(g, 5, 10, 6, 2, '#4a4a62');
    })];
  });
  def('buoy', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 7, 2, 2, 3, '#4a4a62');
      ball(g, 8, 10, 5, ['#f68870', '#e4503c', '#b83a32', '#862a2e']);
      rect(g, 3, 9, 10, 2, '#f6f4ee'); rect(g, 4, 9, 4, 1, '#ffffff');
    })];
  });
  def('post', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 5, 3, 6, 11, P.k2); rect(g, 5, 3, 2, 11, P.k1); rect(g, 9, 3, 2, 11, P.k3);
      rect(g, 4, 2, 8, 2, P.k1); rect(g, 4, 3, 8, 1, P.k3);
      rect(g, 5, 8, 6, 1, '#c8c0a0'); rect(g, 5, 9, 6, 1, '#8a8068');
    })];
  });
  def('rowboat', { w: 32, h: 24, fw: 2, fh: 1, solid: true }, function () {
    return [mk(32, 24, function (g) {
      // 船体
      for (var y = 0; y < 8; y++) {
        var inset = Math.round(Math.pow(y / 7, 2) * 3);
        rect(g, 1 + (7 - y > 0 ? Math.round((7 - y) / 7 * 1) : 0), 8 + y, 30 - 2 * inset - 1, 1, y < 2 ? '#d8604a' : (y < 6 ? '#b84840' : '#8a3036'));
      }
      rect(g, 1, 8, 30, 2, '#f0e6d0'); rect(g, 1, 8, 30, 1, '#ffffff');
      rect(g, 3, 6, 26, 2, '#a07040'); rect(g, 3, 6, 26, 1, '#c89a60');
      rect(g, 6, 3, 20, 4, '#7a5430'); rect(g, 6, 3, 20, 1, '#a07040');
      rect(g, 8, 4, 1, 3, '#5a3a22'); rect(g, 16, 4, 1, 3, '#5a3a22'); rect(g, 23, 4, 1, 3, '#5a3a22');
      rect(g, 3, 17, 26, 1, '#6a2a30');
    }, false)];
  });
  def('bench', { w: 32, h: 16, fw: 2, fh: 1, solid: true }, function () {
    return [mk(32, 16, function (g) {
      rect(g, 2, 3, 28, 3, P.k1); rect(g, 2, 3, 28, 1, '#f0c88a'); rect(g, 2, 5, 28, 1, P.k3);
      rect(g, 2, 7, 28, 3, P.k2); rect(g, 2, 7, 28, 1, P.k1); rect(g, 2, 9, 28, 1, P.k4);
      rect(g, 3, 10, 3, 5, P.k3); rect(g, 26, 10, 3, 5, P.k3);
      rect(g, 3, 3, 3, 7, P.k3); rect(g, 26, 3, 3, 7, P.k3);
    })];
  });
  def('well', { w: 32, h: 32, fw: 2, fh: 1, solid: true }, function () {
    return [mk(32, 32, function (g) {
      rect(g, 4, 18, 24, 12, P.r2);
      for (var y = 18; y < 30; y += 4) { rect(g, 4, y + 3, 24, 1, P.r4); for (var x = 4 + (y % 8 ? 0 : 4); x < 28; x += 8) { rect(g, x, y, 1, 4, P.r4); } }
      rect(g, 4, 18, 24, 2, P.r1); rect(g, 6, 20, 20, 3, '#2a4a8a');
      rect(g, 6, 4, 2, 16, P.k3); rect(g, 24, 4, 2, 16, P.k3);
      rect(g, 3, 2, 26, 3, '#c85048'); rect(g, 3, 2, 26, 1, '#e87868'); rect(g, 3, 4, 26, 1, '#8a3036');
      rect(g, 15, 6, 2, 8, P.k4);
    })];
  });

  /* ================= 建物 ================= */
  var ROOFS = {
    red: ['#e86a54', '#c84a40', '#9a3236'], blue: ['#6a98e8', '#4a72c4', '#34549a'],
    green: ['#6cc27a', '#48a05a', '#32784a'], brown: ['#c89260', '#a2703e', '#7a5230'],
    grey: ['#a8a8c0', '#84849e', '#5e5e7c']
  };
  /** 家。tw×th タイル。door = 戸口の列（左から 0 起点）、roof/wall 色 */
  function houseBuild(a) {
    var tw = a.tw, th = a.th, W = tw * 16, H = th * 16;
    var rc = ROOFS[a.roof || 'red'], wall = a.wall || '#f2e6cc', wallD = Game.util.shade(wall, 0.86), wallL = Game.util.shade(wall, 1.04);
    return mk(W, H, function (g) {
      var roofH = H - 32;
      // 屋根（よこ向きの瓦）
      for (var y = 4; y < roofH + 2; y++) {
        var row = Math.floor((y - 4) / 4);
        var c = ((y - 4) % 4 === 3) ? rc[2] : ((y - 4) % 4 === 0 ? rc[0] : rc[1]);
        rect(g, 0, y, W, 1, c);
        var off = row % 2 ? 4 : 0;
        for (var x = off; x < W; x += 8) { px(g, x, y, rc[2]); }
      }
      rect(g, 0, roofH + 2, W, 2, rc[2]);               // のき先の影
      rect(g, 0, 3, W, 1, rc[0]); rect(g, 1, 2, W - 2, 1, rc[0]);
      // えんとつ
      if (a.chimney) {
        var cx = W - 20;
        rect(g, cx, 0, 8, 12, '#a8a8bc'); rect(g, cx, 0, 8, 2, '#d0d0dc'); rect(g, cx, 0, 2, 12, '#c4c4d4'); rect(g, cx + 6, 0, 2, 12, '#84849e');
        for (var yy = 4; yy < 12; yy += 4) { rect(g, cx, yy, 8, 1, '#84849e'); }
      }
      // かべ
      var wy = H - 32;
      rect(g, 1, wy + 4, W - 2, 28, wall);
      rect(g, 1, wy + 4, W - 2, 2, wallL);
      rect(g, 1, wy + 30, W - 2, 2, wallD);
      rect(g, 1, wy + 4, 1, 28, wallD); rect(g, W - 2, wy + 4, 1, 28, wallD);
      // 梁
      rect(g, 1, wy + 4, W - 2, 1, '#8a5c34');
      for (var bx = 1; bx < W; bx += 16) { rect(g, bx, wy + 4, 2, 28, '#9a6a3c'); rect(g, bx, wy + 4, 1, 28, '#c08a54'); }
      rect(g, W - 3, wy + 4, 2, 28, '#9a6a3c');
      // 窓
      var wins = a.windows || [];
      wins.forEach(function (wx) {
        var x0 = wx * 16 + 3, y0 = wy + 10;
        rect(g, x0 - 1, y0 - 1, 12, 14, '#7a5430'); rect(g, x0, y0, 10, 12, '#9ad0f4'); rect(g, x0, y0, 10, 4, '#c8ecff');
        rect(g, x0 + 4, y0, 1, 12, '#7a5430'); rect(g, x0 + 5, y0, 1, 12, '#7a5430'); rect(g, x0, y0 + 5, 10, 1, '#7a5430');
        px(g, x0 + 1, y0 + 1, '#ffffff'); px(g, x0 + 6, y0 + 1, '#ffffff');
        rect(g, x0 - 2, y0 + 13, 14, 2, '#7a5430'); rect(g, x0 - 2, y0 + 13, 14, 1, '#a07040');
      });
      // 戸口
      var dx = a.door * 16;
      rect(g, dx + 1, wy + 10, 14, 22, '#5a3a22'); rect(g, dx + 2, wy + 11, 12, 21, '#a2703e');
      rect(g, dx + 2, wy + 11, 12, 2, '#c8945a');
      rect(g, dx + 4, wy + 14, 3, 7, '#8a5c34'); rect(g, dx + 9, wy + 14, 3, 7, '#8a5c34');
      rect(g, dx + 4, wy + 23, 3, 7, '#8a5c34'); rect(g, dx + 9, wy + 23, 3, 7, '#8a5c34');
      rect(g, dx + 12, wy + 22, 2, 2, '#f6d04a');
      rect(g, dx, wy + 30, 16, 2, '#8a8aa0'); rect(g, dx, wy + 30, 16, 1, '#b4b4c8');
      if (a.sign) { rect(g, dx + 4, wy + 5, 8, 4, '#f0c88a'); rect(g, dx + 4, wy + 5, 8, 1, '#ffe8b8'); rect(g, dx + 5, wy + 7, 6, 1, '#6a4a2a'); }
      // 土台
      rect(g, 0, H - 3, W, 3, '#84849e'); rect(g, 0, H - 3, W, 1, '#b0b0c4');
    });
  }
  function houseDef(name, a) {
    def(name, { w: a.tw * 16, h: a.th * 16, fw: a.tw, fh: a.th, solid: true, doorX: a.door, shape: 'house' }, function () { return [houseBuild(a)]; });
  }
  houseDef('house_red',   { tw: 6, th: 5, roof: 'red', door: 2, windows: [0, 4], chimney: true, wall: '#f4e8cc' });
  houseDef('house_blue',  { tw: 5, th: 5, roof: 'blue', door: 2, windows: [0, 3], wall: '#f2ecd6' });
  houseDef('house_green', { tw: 5, th: 5, roof: 'green', door: 1, windows: [3], chimney: true, wall: '#efe0c0' });
  houseDef('house_brown', { tw: 4, th: 4, roof: 'brown', door: 1, windows: [2], wall: '#f0e2c4' });
  houseDef('hut',         { tw: 4, th: 4, roof: 'grey', door: 1, windows: [3], wall: '#d8c6a4', chimney: true });

  /** 灯台（外観）: 3 タイル幅 × 9 タイル。赤白のしま模様 */
  def('lighthouse', { w: 48, h: 144, fw: 3, fh: 2, solid: true, doorX: 1, shape: 'house' }, function () {
    return [mk(48, 144, function (g) {
      var cx = 24;
      // とうしん（下が広い台形）
      for (var y = 28; y < 144; y++) {
        var t = (y - 28) / 116;
        var half = Math.round(9 + t * 10);
        var band = Math.floor((y - 28) / 16) % 2;
        var base = band ? '#d8d4d0' : '#e24c46', lit = band ? '#f8f6f2' : '#f48a7c', dk = band ? '#a8a4b0' : '#a42e38';
        rect(g, cx - half, y, half * 2, 1, base);
        rect(g, cx - half, y, 3, 1, lit); rect(g, cx - half + 3, y, 2, 1, lit);
        rect(g, cx + half - 4, y, 4, 1, dk);
        if ((y - 28) % 16 === 15) { rect(g, cx - half, y, half * 2, 1, '#6a6a84'); }
      }
      // まど
      [[48, 'a'], [80, 'b']].forEach(function (w) {
        var y = w[0];
        rect(g, cx - 3, y, 6, 9, '#3a3a52'); rect(g, cx - 2, y + 1, 4, 7, '#7ab4e8'); rect(g, cx - 2, y + 1, 4, 2, '#bce2ff');
      });
      // ろうか（てっぺんの回廊）
      rect(g, cx - 16, 24, 32, 4, '#4a4a62'); rect(g, cx - 16, 24, 32, 1, '#7a7a94');
      for (var x = cx - 15; x < cx + 16; x += 4) { rect(g, x, 20, 1, 4, '#4a4a62'); }
      rect(g, cx - 16, 19, 32, 1, '#4a4a62');
      // とうろう室
      rect(g, cx - 10, 8, 20, 12, '#3a3a52');
      rect(g, cx - 9, 9, 18, 10, '#fff4b0'); rect(g, cx - 9, 9, 18, 3, '#ffffff');
      rect(g, cx - 1, 9, 2, 10, '#3a3a52');
      rect(g, cx - 12, 6, 24, 3, '#c84040'); rect(g, cx - 12, 6, 24, 1, '#f08070');
      rect(g, cx - 8, 3, 16, 3, '#a03030'); rect(g, cx - 4, 0, 8, 3, '#7a2a30');
      px(g, cx - 1, 0, '#4a4a62'); px(g, cx, 0, '#4a4a62');
      // 戸口
      rect(g, cx - 7, 126, 14, 18, '#5a3a22'); rect(g, cx - 6, 127, 12, 17, '#a2703e'); rect(g, cx - 6, 127, 12, 2, '#c8945a');
      rect(g, cx - 1, 127, 2, 17, '#5a3a22'); rect(g, cx + 3, 135, 2, 2, '#f6d04a'); rect(g, cx - 5, 135, 2, 2, '#f6d04a');
      rect(g, cx - 8, 142, 16, 2, '#8a8aa0');
    })];
  });

  /* ================= 屋内の家具 ================= */
  def('bed', { w: 16, h: 32, fw: 1, fh: 2, solid: true }, function () {
    return [mk(16, 32, function (g) {
      rect(g, 1, 1, 14, 30, '#8a5c34'); rect(g, 1, 1, 14, 3, '#a2703e');
      rect(g, 2, 4, 12, 26, '#f2eee4'); rect(g, 2, 4, 12, 2, '#ffffff');
      rect(g, 3, 5, 10, 7, '#e8f0fa'); rect(g, 3, 5, 10, 1, '#ffffff'); rect(g, 3, 11, 10, 1, '#c8d4e4');
      rect(g, 2, 14, 12, 15, '#5c8ce0'); rect(g, 2, 14, 12, 2, '#82a8f0'); rect(g, 2, 28, 12, 2, '#4068bc');
      for (var x = 4; x < 14; x += 4) { rect(g, x, 17, 1, 11, '#4a78d0'); }
      rect(g, 1, 29, 14, 2, '#8a5c34'); rect(g, 1, 30, 14, 1, '#6a4426');
    })];
  });
  def('bed_grandpa', { w: 16, h: 32, fw: 1, fh: 2, solid: true }, function () {
    return [mk(16, 32, function (g) {
      rect(g, 1, 1, 14, 30, '#8a5c34'); rect(g, 1, 1, 14, 3, '#a2703e');
      rect(g, 2, 4, 12, 26, '#f2eee4');
      rect(g, 3, 5, 10, 7, '#e8f0fa'); rect(g, 3, 5, 10, 1, '#ffffff');
      // 寝ているおじいちゃん
      rect(g, 5, 6, 6, 6, '#efc59c'); rect(g, 4, 6, 8, 2, '#eeeef4'); rect(g, 5, 8, 1, 1, '#2a2030'); rect(g, 9, 8, 1, 1, '#2a2030');
      rect(g, 5, 10, 6, 2, '#f0f0f6'); rect(g, 6, 9, 4, 1, '#f0f0f6');
      rect(g, 2, 13, 12, 17, '#c8883c'); rect(g, 2, 13, 12, 2, '#e4a85a'); rect(g, 2, 28, 12, 2, '#9a6228');
      for (var x = 4; x < 14; x += 4) { rect(g, x, 16, 1, 12, '#b07830'); }
      rect(g, 1, 29, 14, 2, '#8a5c34'); rect(g, 1, 30, 14, 1, '#6a4426');
    })];
  });
  def('table', { w: 32, h: 24, fw: 2, fh: 1, solid: true }, function () {
    return [mk(32, 24, function (g) {
      rect(g, 3, 14, 3, 9, P.k3); rect(g, 26, 14, 3, 9, P.k3);
      rect(g, 1, 4, 30, 11, '#f2eee4'); rect(g, 1, 4, 30, 2, '#ffffff');
      rect(g, 1, 12, 30, 3, '#c85048'); rect(g, 1, 12, 30, 1, '#e87868');
      for (var x = 3; x < 30; x += 4) { px(g, x, 14, '#8a3036'); }
      rect(g, 1, 4, 30, 1, '#ffffff');
    })];
  });
  def('table_s', { w: 16, h: 24, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 24, function (g) {
      rect(g, 6, 14, 4, 9, P.k3);
      rect(g, 1, 6, 14, 9, P.k1); rect(g, 1, 6, 14, 2, '#f0c88a'); rect(g, 1, 13, 14, 2, P.k3);
      rect(g, 6, 2, 4, 4, '#f6d04a'); rect(g, 6, 2, 4, 1, '#fff0a0');
    })];
  });
  def('chair', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 4, 1, 8, 7, P.k2); rect(g, 4, 1, 8, 1, P.k1); rect(g, 5, 2, 6, 5, P.k1);
      rect(g, 3, 8, 10, 4, P.k1); rect(g, 3, 8, 10, 1, '#f0c88a'); rect(g, 3, 11, 10, 1, P.k3);
      rect(g, 4, 12, 2, 3, P.k3); rect(g, 10, 12, 2, 3, P.k3);
    })];
  });
  def('shelf', { w: 16, h: 32, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 32, function (g) {
      rect(g, 1, 2, 14, 29, P.k3); rect(g, 2, 3, 12, 27, P.k4);
      [3, 12, 21].forEach(function (y) {
        rect(g, 2, y + 7, 12, 2, P.k2); rect(g, 2, y + 7, 12, 1, P.k1);
        var cols = ['#d85a4a', '#58a0e0', '#f0c84a', '#5ab868', '#a070c8', '#e8e0d0'];
        var x = 3;
        for (var i = 0; i < 5; i++) { var w = 2 + ((i + y) % 2); rect(g, x, y + 1 + ((i + y) % 3), w, 6 - ((i + y) % 3), cols[(i + y) % 6]); rect(g, x, y + 1 + ((i + y) % 3), 1, 6 - ((i + y) % 3), '#ffffff'); x += w; }
      });
    })];
  });
  def('cupboard', { w: 16, h: 32, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 32, function (g) {
      rect(g, 1, 4, 14, 27, '#9a6a3c'); rect(g, 1, 4, 14, 2, '#c08a54');
      rect(g, 2, 7, 12, 9, '#b07a46'); rect(g, 2, 18, 12, 11, '#b07a46');
      rect(g, 2, 7, 12, 1, '#d8a468'); rect(g, 2, 18, 12, 1, '#d8a468');
      rect(g, 7, 7, 1, 9, '#7a5030'); rect(g, 7, 18, 1, 11, '#7a5030');
      px(g, 6, 11, '#f6d04a'); px(g, 9, 11, '#f6d04a'); px(g, 6, 23, '#f6d04a'); px(g, 9, 23, '#f6d04a');
      rect(g, 4, 1, 3, 3, '#e8e0d0'); rect(g, 9, 1, 4, 3, '#5ab868');
    })];
  });
  def('stove', { w: 32, h: 32, fw: 2, fh: 1, solid: true }, function () {
    return [mk(32, 32, function (g) {
      rect(g, 1, 8, 30, 23, '#8a8aa0'); rect(g, 1, 8, 30, 3, '#c4c4d8'); rect(g, 1, 28, 30, 3, '#5c5c78');
      rect(g, 3, 14, 12, 12, '#3a3a52'); rect(g, 5, 16, 8, 8, '#e87030'); rect(g, 7, 18, 4, 5, '#f6d04a');
      rect(g, 18, 14, 11, 12, '#a2703e'); rect(g, 19, 15, 9, 10, '#b88450'); px(g, 23, 19, '#f6d04a');
      rect(g, 3, 1, 12, 8, '#7a7a90'); rect(g, 3, 1, 12, 2, '#a8a8bc'); rect(g, 15, 3, 3, 2, '#7a7a90');
      rect(g, 20, 4, 8, 4, '#d85a4a'); rect(g, 20, 4, 8, 1, '#f08070');
    })];
  });
  def('plant', { w: 16, h: 24, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 24, function (g) {
      rect(g, 4, 15, 8, 8, '#c8643c'); rect(g, 4, 15, 8, 2, '#e88660'); rect(g, 5, 21, 6, 2, '#8a3a24');
      var c = ['#9ae27c', '#62c05e', '#3f9650', '#2a7444'];
      ball(g, 8, 9, 5, c); ball(g, 4, 12, 3, c); ball(g, 12, 12, 3, c);
      px(g, 8, 6, '#ff9ac0'); px(g, 9, 6, '#ff9ac0'); px(g, 8, 7, '#ffd23c');
    })];
  });
  def('window', { w: 16, h: 16, fw: 1, fh: 1, solid: false, deco: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 2, 1, 12, 13, '#7a5430'); rect(g, 3, 2, 10, 11, '#9ad0f4'); rect(g, 3, 2, 10, 4, '#c8ecff');
      rect(g, 7, 2, 2, 11, '#7a5430'); rect(g, 3, 7, 10, 1, '#7a5430');
      px(g, 4, 3, '#ffffff'); px(g, 10, 3, '#ffffff');
      rect(g, 1, 13, 14, 2, '#a07040'); rect(g, 1, 13, 14, 1, '#c89a60');
    }, true)];
  });
  def('window_night', { w: 16, h: 16, fw: 1, fh: 1, solid: false, deco: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 2, 1, 12, 13, '#7a5430'); rect(g, 3, 2, 10, 11, '#2c3a78'); rect(g, 3, 2, 10, 4, '#3c4c94');
      rect(g, 7, 2, 2, 11, '#7a5430'); rect(g, 3, 7, 10, 1, '#7a5430');
      px(g, 4, 4, '#fff6b0'); px(g, 11, 10, '#fff6b0'); px(g, 5, 10, '#d8e4ff');
      rect(g, 1, 13, 14, 2, '#a07040'); rect(g, 1, 13, 14, 1, '#c89a60');
    }, true)];
  });
  def('clock', { w: 16, h: 16, fw: 1, fh: 1, solid: false, deco: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 4, 1, 8, 14, '#7a5430'); rect(g, 5, 2, 6, 6, '#f6f0e0'); rect(g, 5, 2, 6, 1, '#ffffff');
      rect(g, 7, 3, 1, 3, '#2a2030'); rect(g, 8, 5, 2, 1, '#2a2030');
      rect(g, 7, 9, 2, 4, '#c8a050'); rect(g, 7, 12, 2, 2, '#f6d04a');
    }, true)];
  });
  def('picture', { w: 16, h: 16, fw: 1, fh: 1, solid: false, deco: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 2, 2, 12, 11, '#7a5430'); rect(g, 3, 3, 10, 9, '#8ad0f4'); rect(g, 3, 8, 10, 4, '#3c8edc');
      rect(g, 3, 3, 10, 1, '#c8ecff'); rect(g, 10, 4, 2, 2, '#fff4b0'); rect(g, 5, 6, 5, 2, '#f6f4ee'); rect(g, 6, 5, 3, 1, '#f6f4ee');
    }, true)];
  });
  def('hearth', { w: 32, h: 32, fw: 2, fh: 1, solid: true, rate: 8 }, function () {
    var frames = [];
    for (var f = 0; f < 3; f++) {
      frames.push((function (f) {
        return mk(32, 32, function (g) {
          rect(g, 1, 2, 30, 29, '#8a8aa0');
          for (var y = 2; y < 30; y += 4) { rect(g, 1, y + 3, 30, 1, '#5c5c78'); for (var x = 1 + ((y >> 2) % 2) * 4; x < 31; x += 8) { rect(g, x, y, 1, 4, '#5c5c78'); } }
          rect(g, 1, 2, 30, 2, '#c4c4d8'); rect(g, 0, 0, 32, 3, '#6a4426'); rect(g, 0, 0, 32, 1, '#a2703e');
          rect(g, 6, 9, 20, 21, '#241a2e'); rect(g, 7, 10, 18, 20, '#34243c');
          rect(g, 8, 25, 16, 4, '#6a4426'); rect(g, 9, 24, 14, 1, '#8a5c34');
          var fx = [[0, 0], [1, -1], [-1, 1]][f];
          rect(g, 11 + fx[0], 17 - f, 10, 8 + f, '#e86030'); rect(g, 12 + fx[0], 15 - f, 8, 8, '#f08a3c');
          rect(g, 13, 15 - f, 6, 9, '#f6c84a'); rect(g, 14, 18 - f, 4, 6, '#fff4b0');
          px(g, 10 + fx[1], 20, '#e86030'); px(g, 21 - fx[1], 19, '#e86030'); px(g, 15 + fx[0], 13 - f, '#f08a3c');
        }, true);
      })(f));
    }
    return frames;
  });
  def('mat', { w: 16, h: 16, fw: 1, fh: 1, solid: false, floor: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 1, 4, 14, 9, '#a85a3c'); rect(g, 2, 5, 12, 7, '#c8785a'); rect(g, 2, 5, 12, 1, '#e8a080');
      for (var x = 3; x < 13; x += 2) { px(g, x, 8, '#8a3a28'); }
    }, true)];
  });

  /* ================= 港・倉庫・工房 ================= */
  def('chest', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 1, 6, 14, 9, '#8a5c34'); rect(g, 1, 6, 14, 2, '#b07a46');
      rect(g, 1, 2, 14, 5, '#a2703e'); rect(g, 2, 1, 12, 1, '#c8945a'); rect(g, 1, 2, 14, 1, '#d8a468');
      rect(g, 1, 6, 14, 1, '#4a321e');
      rect(g, 1, 3, 2, 12, '#7a7a90'); rect(g, 13, 3, 2, 12, '#5c5c78'); rect(g, 1, 3, 2, 1, '#b4b4c8');
      rect(g, 6, 6, 4, 4, '#f6d04a'); rect(g, 6, 6, 4, 1, '#fff0a0'); px(g, 7, 8, '#241a2e'); px(g, 8, 8, '#241a2e');
    })];
  });
  def('chest_open', { w: 16, h: 24, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 24, function (g) {
      rect(g, 1, 14, 14, 9, '#8a5c34'); rect(g, 1, 14, 14, 2, '#b07a46');
      rect(g, 1, 3, 14, 10, '#7a4e2c'); rect(g, 2, 4, 12, 8, '#5a3a22');
      rect(g, 1, 3, 2, 11, '#7a7a90'); rect(g, 13, 3, 2, 11, '#5c5c78');
      rect(g, 3, 13, 10, 3, '#241a2e'); rect(g, 3, 13, 10, 1, '#f6d04a');
      rect(g, 1, 14, 2, 9, '#7a7a90'); rect(g, 13, 14, 2, 9, '#5c5c78');
    })];
  });
  def('plate', { w: 16, h: 16, fw: 1, fh: 1, solid: false, floor: true }, function () {
    return [mk(16, 16, function (g) {   // 押される前
      rect(g, 2, 2, 12, 12, '#463a3c'); rect(g, 3, 3, 10, 10, '#a89030'); rect(g, 3, 3, 10, 1, '#f6e070'); rect(g, 3, 3, 1, 10, '#d8c050');
      rect(g, 3, 12, 10, 1, '#6a5a20'); rect(g, 12, 3, 1, 10, '#6a5a20');
      rect(g, 6, 6, 4, 4, '#6a5a20'); rect(g, 7, 7, 2, 2, '#f6e070');
    }, true), mk(16, 16, function (g) {   // 押されている
      rect(g, 2, 2, 12, 12, '#463a3c'); rect(g, 4, 4, 8, 8, '#6a5a20'); rect(g, 5, 5, 6, 6, '#8a7828');
      rect(g, 6, 6, 4, 4, '#f6e070'); rect(g, 7, 7, 2, 2, '#ffffff');
    }, true)];
  });
  def('gate', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 0, 0, 16, 16, '#3e3446');
      rect(g, 1, 1, 14, 15, '#7a6a82'); rect(g, 1, 1, 14, 2, '#a89aae');
      rect(g, 2, 3, 5, 12, '#5a4c62'); rect(g, 9, 3, 5, 12, '#5a4c62');
      rect(g, 7, 2, 2, 14, '#3a3040');
      rect(g, 4, 7, 2, 2, '#f6d04a'); rect(g, 10, 7, 2, 2, '#f6d04a');
      rect(g, 2, 14, 12, 1, '#463a52');
    }, true)];
  });
  def('gate_open', { w: 16, h: 16, fw: 1, fh: 1, solid: false, floor: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 0, 0, 16, 16, '#3e3446'); rect(g, 2, 2, 12, 14, '#241a2e'); rect(g, 3, 4, 10, 12, '#6e5e5c');
      rect(g, 0, 2, 3, 14, '#7a6a82'); rect(g, 13, 2, 3, 14, '#7a6a82'); rect(g, 0, 2, 16, 1, '#a89aae');
    }, true)];
  });
  def('torch', { w: 16, h: 24, fw: 1, fh: 1, solid: false, deco: true, rate: 6 }, function () {
    var fr = [];
    for (var f = 0; f < 3; f++) {
      fr.push((function (f) {
        return mk(16, 24, function (g) {
          rect(g, 7, 10, 2, 8, '#6a4426'); rect(g, 5, 8, 6, 3, '#4a4a62'); rect(g, 5, 8, 6, 1, '#7a7a94');
          rect(g, 6, 3 + (f === 1 ? 1 : 0), 4, 6, '#e86030'); rect(g, 7, 1 + f % 2, 2, 7, '#f6c84a'); px(g, 7, 5, '#fff4b0'); px(g, 8, 6, '#fff4b0');
          px(g, 5, 5 + f, '#f08a3c'); px(g, 10, 4 - f % 2, '#f08a3c');
        }, true);
      })(f));
    }
    return fr;
  });
  def('kiln', { w: 32, h: 32, fw: 2, fh: 1, solid: true, rate: 8 }, function () {
    var fr = [];
    for (var f = 0; f < 3; f++) {
      fr.push((function (f) {
        return mk(32, 32, function (g) {
          rect(g, 2, 6, 28, 25, '#b85a3c'); rect(g, 2, 6, 28, 3, '#e08a68'); rect(g, 2, 27, 28, 4, '#8a3a24');
          for (var y = 9; y < 27; y += 4) { rect(g, 2, y, 28, 1, '#8a3a24'); for (var x = 4 + ((y >> 2) % 2) * 5; x < 30; x += 10) { rect(g, x, y, 1, 4, '#8a3a24'); } }
          rect(g, 8, 13, 16, 12, '#241a2e'); rect(g, 9, 14, 14, 11, '#5a1a1a');
          rect(g, 11, 17 - f % 2, 10, 8 + f % 2, '#e86030'); rect(g, 12, 15, 8, 9, '#f6a03c'); rect(g, 14, 18, 4, 6, '#fff4b0');
          rect(g, 12, 0, 8, 7, '#7a7a90'); rect(g, 12, 0, 8, 2, '#b4b4c8'); rect(g, 12, 0, 2, 7, '#a8a8bc');
        }, true);
      })(f));
    }
    return fr;
  });
  def('workbench', { w: 32, h: 24, fw: 2, fh: 1, solid: true }, function () {
    return [mk(32, 24, function (g) {
      rect(g, 2, 14, 3, 9, P.k3); rect(g, 27, 14, 3, 9, P.k3);
      rect(g, 0, 6, 32, 9, P.k2); rect(g, 0, 6, 32, 2, P.k1); rect(g, 0, 13, 32, 2, P.k4);
      // ガラスの道具
      rect(g, 4, 1, 3, 6, '#a8e4f8'); rect(g, 4, 1, 1, 6, '#e8f8ff'); rect(g, 12, 3, 5, 4, '#f4a0bc'); rect(g, 12, 3, 5, 1, '#ffd0e0');
      rect(g, 22, 0, 2, 7, '#c8d4e4'); rect(g, 25, 2, 4, 5, '#9ad0f4'); rect(g, 25, 2, 1, 5, '#e8f8ff');
    })];
  });
  def('glassware', { w: 16, h: 32, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 32, function (g) {
      rect(g, 1, 2, 14, 29, P.k3); rect(g, 2, 3, 12, 27, P.k4);
      [3, 12, 21].forEach(function (y) {
        rect(g, 2, y + 7, 12, 2, P.k2); rect(g, 2, y + 7, 12, 1, P.k1);
        var cols = ['#a8e4f8', '#f4a0bc', '#c8f0a8', '#f6d878', '#c8b0f0'];
        for (var i = 0; i < 4; i++) { var x = 3 + i * 3, h = 4 + ((i + y) % 3); rect(g, x, y + 7 - h, 2, h, cols[(i + y) % 5]); rect(g, x, y + 7 - h, 1, h, '#ffffff'); }
      });
    })];
  });
  def('lens', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      ball(g, 8, 8, 6, ['#f4fcff', '#c0e8f8', '#8cc8e8', '#5a9cc8']);
      px(g, 5, 4, '#ffffff'); px(g, 6, 4, '#ffffff'); px(g, 5, 5, '#ffffff');
      rect(g, 3, 13, 10, 2, '#8a5c34');
    })];
  });

  /* ================= 灯台の中 ================= */
  def('lamp_big', { w: 32, h: 48, fw: 2, fh: 1, solid: true }, function () {
    return [mk(32, 48, function (g) {
      rect(g, 4, 34, 24, 13, '#5c5c78'); rect(g, 4, 34, 24, 3, '#a8a8bc'); rect(g, 4, 45, 24, 2, '#3c3c56');
      rect(g, 8, 28, 16, 7, '#7a7a90'); rect(g, 8, 28, 16, 2, '#b4b4c8');
      // レンズのかご
      rect(g, 6, 4, 20, 25, '#3a3a52');
      rect(g, 8, 6, 16, 21, '#7a6a52'); rect(g, 8, 6, 16, 2, '#a89070');
      ball(g, 16, 17, 8, ['#d8eef8', '#a8cce0', '#78a4c4', '#58849e']);
      rect(g, 15, 6, 2, 21, '#3a3a52'); rect(g, 8, 16, 16, 2, '#3a3a52');
      // ほぞ（はめこみ口）
      rect(g, 5, 36, 6, 4, '#241a2e'); rect(g, 13, 36, 6, 4, '#241a2e'); rect(g, 21, 36, 6, 4, '#241a2e');
    })];
  });
  def('lamp_lit', { w: 32, h: 48, fw: 2, fh: 1, solid: true, rate: 6 }, function () {
    var fr = [];
    for (var f = 0; f < 3; f++) {
      fr.push((function (f) {
        return mk(32, 48, function (g) {
          rect(g, 4, 34, 24, 13, '#5c5c78'); rect(g, 4, 34, 24, 3, '#a8a8bc'); rect(g, 4, 45, 24, 2, '#3c3c56');
          rect(g, 8, 28, 16, 7, '#7a7a90'); rect(g, 8, 28, 16, 2, '#b4b4c8');
          rect(g, 6, 4, 20, 25, '#3a3a52');
          rect(g, 8, 6, 16, 21, '#fff4b0'); rect(g, 9, 7, 14, 19, '#ffffff');
          ball(g, 16, 17, 8, ['#ffffff', '#fff4b0', '#ffe070', '#f6c84a']);
          rect(g, 15, 6, 2, 21, '#3a3a52'); rect(g, 8, 16, 16, 2, '#3a3a52');
          rect(g, 5, 36, 6, 4, '#f6c84a'); rect(g, 13, 36, 6, 4, '#f6c84a'); rect(g, 21, 36, 6, 4, '#f6c84a');
          px(g, 4 + f * 9, 3, '#ffffff'); px(g, 27 - f * 7, 5, '#fff4b0');
        }, true);
      })(f));
    }
    return fr;
  });
  def('diary', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 1, 7, 14, 8, '#8a5c34'); rect(g, 1, 7, 14, 2, '#b07a46');
      rect(g, 4, 3, 8, 6, '#a03038'); rect(g, 4, 3, 8, 1, '#d86060'); rect(g, 5, 4, 1, 4, '#f4e8cc'); rect(g, 6, 5, 4, 1, '#f4e8cc'); rect(g, 6, 7, 4, 1, '#f4e8cc');
    })];
  });
  def('rail', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 0, 9, 16, 2, '#4a4a62'); rect(g, 0, 9, 16, 1, '#7a7a94');
      [1, 8, 14].forEach(function (x) { rect(g, x, 9, 1, 6, '#4a4a62'); });
    })];
  });
  def('window_round', { w: 16, h: 16, fw: 1, fh: 1, solid: false, deco: true }, function () {
    return [mk(16, 16, function (g) {
      g.fillStyle = '#4a4a62';
      Game.gfx.disc(g, 8, 8, 7, '#4a4a62'); Game.gfx.disc(g, 8, 8, 5, '#2c3a78');
      rect(g, 3, 6, 10, 1, '#3c4c94'); px(g, 6, 5, '#fff6b0'); px(g, 10, 9, '#d8e4ff');
      rect(g, 7, 2, 2, 12, '#4a4a62'); rect(g, 2, 7, 12, 2, '#4a4a62');
    }, true)];
  });
  def('hay', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      ball(g, 8, 9, 6, ['#f6e08a', '#e8c860', '#c8a040', '#8a6a28']);
      for (var i = 0; i < 6; i++) { px(g, 3 + i * 2, 5 + (i % 3) * 3, '#8a6a28'); }
    })];
  });
  def('net', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      rect(g, 1, 2, 2, 13, P.k3); rect(g, 13, 2, 2, 13, P.k3);
      rect(g, 2, 3, 12, 1, P.k2);
      for (var y = 4; y < 14; y += 3) { for (var x = 3; x < 13; x += 3) { px(g, x, y, '#c8d8e0'); px(g, x + 1, y + 1, '#c8d8e0'); px(g, x + 1, y, '#8aa0b0'); px(g, x, y + 1, '#8aa0b0'); } }
    })];
  });
  def('pots', { w: 16, h: 16, fw: 1, fh: 1, solid: true }, function () {
    return [mk(16, 16, function (g) {
      ball(g, 5, 10, 4, ['#f0a878', '#d87a50', '#b05a38', '#843c28']);
      ball(g, 11, 11, 3, ['#f0a878', '#d87a50', '#b05a38', '#843c28']);
      rect(g, 4, 5, 3, 2, '#843c28'); rect(g, 10, 7, 3, 2, '#843c28');
    })];
  });

  /** 漁船（エンディングで沖から戻ってくる）。左向き */
  def('fishing_boat', { w: 48, h: 32, fw: 3, fh: 1, solid: false, rate: 14 }, function () {
    var fr = [];
    for (var f = 0; f < 2; f++) {
      fr.push((function (f) {
        return mk(48, 32, function (g) {
          var bob = f;
          // 船体
          for (var y = 0; y < 10; y++) {
            var inset = Math.round(Math.pow(y / 9, 2) * 5);
            var c = y < 2 ? '#f6f4ee' : (y < 7 ? '#2c4a8c' : '#b83a32');
            rect(g, 1 + inset, 16 + y + bob, 46 - inset * 2, 1, c);
          }
          rect(g, 0, 15 + bob, 8, 2, '#f6f4ee'); rect(g, 0, 15 + bob, 48, 1, '#ffffff');
          rect(g, 4, 18 + bob, 40, 1, '#4a6cb4');
          // 船室
          rect(g, 18, 5 + bob, 16, 11, '#f0e8d4'); rect(g, 18, 5 + bob, 16, 1, '#ffffff'); rect(g, 33, 5 + bob, 1, 11, '#c8bca4');
          rect(g, 16, 3 + bob, 20, 3, '#c84040'); rect(g, 16, 3 + bob, 20, 1, '#f08070');
          rect(g, 21, 8 + bob, 4, 4, '#7ab4e8'); rect(g, 21, 8 + bob, 4, 1, '#cce8ff'); rect(g, 27, 8 + bob, 4, 4, '#7ab4e8'); rect(g, 27, 8 + bob, 4, 1, '#cce8ff');
          // マストとあかり
          rect(g, 38, 1 + bob, 2, 16, P.k3); rect(g, 38, 1 + bob, 1, 16, P.k2);
          rect(g, 36, 0 + bob, 6, 3, '#ffe070'); rect(g, 37, 0 + bob, 3, 1, '#ffffff');
          rect(g, 10, 10 + bob, 6, 6, '#8a5c34'); rect(g, 10, 10 + bob, 6, 1, '#b07a46');
          // あわ
          rect(g, 2, 26 + (1 - bob), 44, 1, '#c4e6ff'); rect(g, 6, 27, 36, 1, '#8cc8f0');
        });
      })(f));
    }
    return fr;
  });

  /** 絵を得る（初回に生成）。fw/fh/w/h など仕様も返す */
  props.get = function (name) {
    var c = props.cache[name];
    if (c) { return c; }
    var d = props.defs[name];
    if (!d) { throw new Error('プロップがない: ' + name); }
    var frames = d.build();
    c = {
      name: name, w: d.spec.w, h: d.spec.h, fw: d.spec.fw, fh: d.spec.fh, solid: d.spec.solid !== false,
      pushable: !!d.spec.pushable, deco: !!d.spec.deco, floor: !!d.spec.floor, rate: d.spec.rate || 10,
      doorX: d.spec.doorX, shape: d.spec.shape, frames: frames
    };
    props.cache[name] = c;
    return c;
  };
  props.has = function (name) { return !!props.defs[name]; };
})();
