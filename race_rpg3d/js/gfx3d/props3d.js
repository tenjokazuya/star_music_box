/* 配置物の3Dモデル（街灯・自販機・木・家具 ほか）。建物は buildings3d.js
 * RR.Props3D.build(prop, ctx): prop={type,x,y,...}。座標は 1タイル=1ユニット、(x,y) は左上のタイル
 * ctx: { b(通常の頂点色), e(発光), pool(x,z,r,color,k), light(x,y,z,color,dist,opt), group, fades, anim, map }
 */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U, Gfx = RR.Gfx;
  var P3D = RR.Props3D = { builders: {}, ICON_SCALE: 2 };
  var B = P3D.builders;

  // 中心指定の箱: (cx, 底面y, cz, 幅, 高さ, 奥行き)
  function bx(b, cx, y0, cz, w, h, d, col, o) { b.box(cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, col, o); }
  P3D.bx = bx;
  function pal(c) { return { base: c, hi: U.shade(c, 0.3), lt: U.shade(c, 0.15), sh: U.shade(c, -0.25), dk: U.shade(c, -0.5) }; }

  // 木（個別に半透明化できるグループ）
  B.tree = function (o, X, Z, ctx) {
    var kind = o.kind || 'round';
    var b = new Gfx.Batch();
    var cx = X + 1, cz = Z + 0.5;
    var k = 1.15, h = 3.3;
    if (kind === 'pine') RR.Tiles3D.treeShape(b, cx, cz, 3.8, 'pine', 1.25);
    else {
      var col = kind === 'sakura' ? '#e8a8c0' : kind === 'autumn' ? '#cc6a30' : '#2c6c34';
      var col2 = kind === 'sakura' ? '#f4c4d6' : kind === 'autumn' ? '#e08a40' : '#3a8444';
      var col3 = kind === 'sakura' ? '#d890ac' : kind === 'autumn' ? '#b45a28' : '#256030';
      b.cyl(cx, cz, 0, 1.7, 0.16, 0.1, '#5a3a1c', 6, { noTop: true });
      b.cyl(cx + 0.1, cz, 0.9, 1.9, 0.07, 0.04, '#5a3a1c', 5, { noTop: true });
      b.sphere(cx, 2.2, cz, 1.05 * k, 0.9 * k, 1.05 * k, col, 9, 6);
      b.sphere(cx - 0.7, 1.9, cz + 0.2, 0.7 * k, 0.62 * k, 0.7 * k, col3, 8, 5);
      b.sphere(cx + 0.72, 1.95, cz - 0.1, 0.72 * k, 0.64 * k, 0.72 * k, col2, 8, 5);
      b.sphere(cx + 0.1, 2.85, cz + 0.1, 0.7 * k, 0.55 * k, 0.7 * k, col2, 8, 5);
    }
    ctx.fadeMesh(b, { x0: cx - 1.4, x1: cx + 1.4, z0: cz - 1.4, z1: cz + 1.4, h: 3.8 }, true);
    ctx.pool(cx, cz + 0.1, 0.9, '#000000', 0, 'shadow');
  };
  B.bush = function (o, X, Z, ctx) {
    var c = o.c || '#347c3c';
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.sphere(cx, 0.28, cz, 0.42, 0.34, 0.42, c, 8, 5);
    ctx.b.sphere(cx - 0.22, 0.22, cz + 0.1, 0.26, 0.22, 0.26, U.shade(c, -0.15), 6, 4);
    ctx.b.sphere(cx + 0.2, 0.26, cz - 0.1, 0.24, 0.22, 0.24, U.shade(c, 0.12), 6, 4);
    if (o.flowers) [[-0.2, 0.42, 0.1], [0.18, 0.4, -0.1], [0.0, 0.5, 0.2]].forEach(function (p, i) { ctx.b.sphere(cx + p[0], p[1], cz + p[2], 0.06, 0.06, 0.06, i % 2 ? '#f8f8f8' : '#f890b0', 4, 3, { flat: true }); });
  };
  B.lamp = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5, b = ctx.b;
    var c = o.c || '#f8e0a0';
    b.cyl(cx, cz, 0, 0.12, 0.17, 0.14, '#383840', 8);
    b.cyl(cx, cz, 0.1, 2.5, 0.055, 0.04, '#585868', 8, { noTop: true });
    bx(b, cx, 2.46, cz, 0.42, 0.07, 0.3, '#404050');
    bx(b, cx, 2.34, cz, 0.3, 0.1, 0.2, '#fff8d0');
    ctx.e.box(cx - 0.14, 2.3, cz - 0.09, cx + 0.14, 2.42, cz + 0.09, '#fff4c0', { ao: 1 });
    ctx.glow(cx, 2.36, cz, c, 1.6, 0.9);
    var r = (o.r || 46) / 16;
    ctx.pool(cx, cz, r * 1.35, c, 0.7);
    ctx.light(cx, 2.1, cz, c, r * 2.2, { real: true, flicker: o.flicker });
  };
  B.vending = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.56, col = o.c || '#c83838', b = ctx.b;
    bx(b, cx, 0, cz, 0.86, 1.5, 0.66, col);
    ctx.e.box(cx - 0.34, 0.75, cz + 0.325, cx + 0.34, 1.35, cz + 0.34, '#f4f4ff', { ao: 1 });
    var dc = ['#e84848', '#4890e8', '#f8c838', '#48c868', '#f8f8f8', '#8848c8'];
    for (var i = 0; i < 5; i++) ctx.e.box(cx - 0.3 + i * 0.13, 0.95, cz + 0.34, cx - 0.2 + i * 0.13, 1.2, cz + 0.345, dc[i], { ao: 1 });
    bx(b, cx, 0.2, cz + 0.325, 0.5, 0.25, 0.02, '#14141a');
    ctx.e.box(cx + 0.22, 0.6, cz + 0.336, cx + 0.3, 0.64, cz + 0.34, '#40e060', { ao: 1 });
    ctx.pool(cx, cz + 0.9, 1.5, '#d0e8f8', 0.65);
  };
  B.car = function (o, X, Z, ctx) {
    if (o.dynamic) { ctx.dynamic.push({ prop: o, X: X, Z: Z }); return; }
    var car = RR.Cars3D.create(o.model || 'comet', o.color || 'white', { dirt: o.dirt || 0 });
    car.setLights(false);
    var s = 0.46;
    car.root.scale.setScalar(s);
    var cx, cz, rot;
    if (o.dir === 'h') { cx = X + 1; cz = Z + 0.5; rot = o.flip ? -Math.PI / 2 : Math.PI / 2; }
    else { cx = X + 0.5; cz = Z + 1; rot = o.flip ? Math.PI : 0; }
    car.root.rotation.y = rot;
    car.root.position.set(cx, 0, cz);
    ctx.group.add(car.root);
    ctx.pool(cx, cz, 1.2, '#000000', 0, 'shadow');
  };
  B.sign = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.08, 0.8, 0.08, '#5c3818');
    bx(ctx.b, cx, 0.66, cz + 0.02, 0.82, 0.58, 0.07, o.c || '#a07040');
    bx(ctx.b, cx, 0.9, cz + 0.06, 0.6, 0.05, 0.02, '#5c3818'); bx(ctx.b, cx, 0.78, cz + 0.06, 0.5, 0.05, 0.02, '#5c3818');
  };
  B.board = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx - 0.85, 0, cz, 0.1, 1.0, 0.1, '#5c3818'); bx(ctx.b, cx + 0.85, 0, cz, 0.1, 1.0, 0.1, '#5c3818');
    bx(ctx.b, cx, 0.45, cz, 1.9, 0.85, 0.08, '#7c5028');
    bx(ctx.b, cx, 0.5, cz + 0.05, 1.7, 0.7, 0.02, '#d8c8a0');
    [['#f8f8f0', -0.55], ['#f8d0d0', 0.0], ['#d0e0f8', 0.5]].forEach(function (n) { bx(ctx.b, cx + n[1], 0.6, cz + 0.065, 0.36, 0.32, 0.01, n[0]); });
  };
  B.bench = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5, b = ctx.b;
    bx(b, cx - 0.8, 0, cz, 0.1, 0.4, 0.5, '#383840'); bx(b, cx + 0.8, 0, cz, 0.1, 0.4, 0.5, '#383840');
    bx(b, cx, 0.4, cz + 0.05, 1.9, 0.08, 0.42, '#a06838');
    bx(b, cx, 0.62, cz - 0.17, 1.9, 0.34, 0.07, '#a06838');
    ctx.pool(cx, cz, 1.1, '#000000', 0, 'shadow');
  };
  B.pole = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 3.6, 0.1, 0.07, '#7c7468', 7, { noTop: true });
    bx(ctx.b, cx, 3.2, cz, 1.0, 0.07, 0.07, '#5c544c'); bx(ctx.b, cx, 3.0, cz, 0.8, 0.06, 0.06, '#5c544c');
    [-0.45, 0.45, -0.3, 0.3].forEach(function (x, i) { ctx.b.cyl(cx + x, cz, i < 2 ? 3.22 : 3.02, i < 2 ? 3.34 : 3.14, 0.04, 0.04, '#c8c8d0', 5); });
  };
  B.postbox = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.5, 0.86, 0.4, '#c83030');
    ctx.b.cyl(cx, cz, 0.84, 0.86, 0.26, 0.25, '#a02020', 8);
    bx(ctx.b, cx, 0.6, cz + 0.2, 0.3, 0.03, 0.01, '#401010');
    ctx.b.sphere(cx, 0.88, cz, 0.26, 0.12, 0.2, '#b02424', 8, 3);
  };
  B.trash = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 0.62, 0.24, 0.27, '#4c6c9c', 10);
    ctx.b.cyl(cx, cz, 0.62, 0.68, 0.29, 0.29, '#384c70', 10);
  };
  B.busstop = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 0.1, 0.25, 0.22, '#585868', 8);
    ctx.b.cyl(cx, cz, 0.1, 2.6, 0.05, 0.05, '#9898a8', 6, { noTop: true });
    ctx.b.cyl(cx, cz, 2.3, 2.34, 0.34, 0.34, '#e8e8f0', 14);
    ctx.e.cyl(cx, cz + 0.0, 2.34, 2.36, 0.3, 0.3, '#f4f8ff', 14);
    bx(ctx.b, cx, 2.5, cz + 0.02, 0.5, 0.08, 0.05, '#3858b0');
    ctx.pool(cx, cz + 0.4, 1.4, '#e8f0ff', 0.35);
  };
  B.phone = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.7, 0.2, 0.7, '#38a058');
    bx(ctx.b, cx - 0.33, 0.2, cz, 0.06, 1.4, 0.7, '#38a058'); bx(ctx.b, cx + 0.33, 0.2, cz, 0.06, 1.4, 0.7, '#38a058');
    bx(ctx.b, cx, 0.2, cz - 0.33, 0.7, 1.4, 0.06, '#38a058');
    bx(ctx.b, cx, 1.6, cz, 0.76, 0.1, 0.76, '#38a058');
    ctx.e.box(cx - 0.28, 0.4, cz + 0.28, cx + 0.28, 1.4, cz + 0.3, '#a8e8c0', { ao: 1 });
    ctx.pool(cx, cz + 0.8, 1.1, '#d8f8e0', 0.5);
  };
  B.barrier = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx - 0.4, 0, cz, 0.06, 0.55, 0.06, '#d0d0d8'); bx(ctx.b, cx + 0.4, 0, cz, 0.06, 0.55, 0.06, '#d0d0d8');
    for (var i = 0; i < 8; i++) bx(ctx.b, cx - 0.4 + i * 0.115, 0.4, cz, 0.115, 0.14, 0.04, i % 2 ? '#f8f8f8' : '#e03030');
    if (o.blink) ctx.glow(cx, 0.62, cz, '#f86040', 0.5, 0.9);
  };
  B.cone = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.5, 0.04, 0.5, '#c84818');
    ctx.b.cyl(cx, cz, 0.04, 0.56, 0.2, 0.04, '#f06828', 10);
    ctx.b.cyl(cx, cz, 0.27, 0.36, 0.13, 0.1, '#f4f4f4', 10);
  };
  B.drum = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5, c = o.c || '#3868a8';
    ctx.b.cyl(cx, cz, 0, 0.85, 0.3, 0.3, c, 12);
    ctx.b.cyl(cx, cz, 0.28, 0.33, 0.305, 0.305, U.shade(c, -0.4), 12, { noTop: true });
    ctx.b.cyl(cx, cz, 0.56, 0.61, 0.305, 0.305, U.shade(c, -0.4), 12, { noTop: true });
  };
  B.tires = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    for (var i = 0; i < 3; i++) {
      ctx.b.cyl(cx, cz, i * 0.22, i * 0.22 + 0.22, 0.34, 0.34, '#202024', 12);
      ctx.b.cyl(cx, cz, i * 0.22 + 0.2, i * 0.22 + 0.23, 0.2, 0.2, '#101014', 12);
    }
  };
  B.crate = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.8, 0.7, 0.8, '#a87c48');
    bx(ctx.b, cx, 0.32, cz, 0.82, 0.05, 0.82, '#6c4c28'); bx(ctx.b, cx, 0, cz, 0.82, 0.05, 0.82, '#6c4c28');
  };
  B.lantern = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5, st = '#8c8c98';
    bx(ctx.b, cx, 0, cz, 0.5, 0.2, 0.5, st); ctx.b.cyl(cx, cz, 0.2, 0.8, 0.12, 0.1, st, 8);
    bx(ctx.b, cx, 0.8, cz, 0.46, 0.08, 0.46, '#9c9ca8');
    bx(ctx.b, cx, 0.88, cz, 0.36, 0.36, 0.36, '#6c6c78');
    ctx.e.box(cx - 0.13, 0.93, cz - 0.185, cx + 0.13, 1.19, cz + 0.185, '#ffd880', { ao: 1 });
    ctx.e.box(cx - 0.185, 0.93, cz - 0.13, cx + 0.185, 1.19, cz + 0.13, '#ffd880', { ao: 1 });
    ctx.b.cone(cx, cz, 1.22, 1.55, 0.36, '#7c7c88', 4);
    ctx.glow(cx, 1.06, cz, '#f8c070', 1.1, 0.8);
    ctx.pool(cx, cz, 1.5, '#f8c070', 0.8);
    ctx.light(cx, 1.1, cz, '#f8c070', 3.5, { real: false });
  };
  B.torii = function (o, X, Z, ctx) {
    var red = '#c83828', b = ctx.b;
    [X + 0.5, X + 3.5].forEach(function (x) {
      ctx.b.cyl(x, Z + 0.5, 0, 2.9, 0.16, 0.13, red, 10);
      bx(b, x, 0, Z + 0.5, 0.42, 0.18, 0.42, '#303038');
    });
    bx(b, X + 2, 2.85, Z + 0.5, 4.6, 0.16, 0.3, '#282830');
    bx(b, X + 2, 2.7, Z + 0.5, 4.2, 0.2, 0.26, red);
    bx(b, X + 2, 2.15, Z + 0.5, 3.4, 0.14, 0.2, red);
    bx(b, X + 2, 2.4, Z + 0.5, 0.3, 0.3, 0.22, '#282830');
    ctx.fadeMesh(null);
  };
  B.pump = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.7, 1.4, 0.5, '#e8e8f0');
    bx(ctx.b, cx, 0.65, cz + 0.255, 0.5, 0.3, 0.02, '#203040');
    ctx.e.box(cx - 0.18, 0.78, cz + 0.268, cx + 0.18, 0.84, cz + 0.275, '#48e080', { ao: 1 });
    bx(ctx.b, cx, 0.3, cz + 0.26, 0.7, 0.2, 0.02, '#d83030');
    bx(ctx.b, cx, 1.4, cz, 0.74, 0.28, 0.54, '#d83030');
    bx(ctx.b, cx + 0.42, 0.5, cz, 0.06, 0.5, 0.08, '#2c2c34');
  };
  B.canopy = function (o, X, Z, ctx) {
    var w = o.w, d = o.h;
    var b = new Gfx.Batch();
    var y = 3.1;
    b.box(X, y, Z, X + w, y + 0.32, Z + d + 1, { all: '#e8e8f0', top: '#ffffff' }, { ao: 0.9 });
    b.box(X, y + 0.1, Z + d + 1, X + w, y + 0.2, Z + d + 1.01, '#d83030', { ao: 1 });
    b.box(X, y + 0.1, Z - 0.01, X + w, y + 0.2, Z, '#d83030', { ao: 1 });
    for (var i = 0; i < w; i += 3) b.cyl(X + i + 0.5, Z + d + 0.4, 0, y, 0.12, 0.12, '#c8ccd8', 8);
    ctx.fadeMesh(b, { x0: X, x1: X + w, z0: Z, z1: Z + d + 1, h: y + 0.4 }, true);
    for (var k = 0; k < w; k += 3) {
      ctx.e.box(X + k + 0.2, y - 0.02, Z + d * 0.4, X + k + 0.8, y, Z + d * 0.4 + 0.5, '#fff8e0', { ao: 1 });
      ctx.pool(X + k + 0.5, Z + d * 0.6 + 0.4, 2.2, '#f0f4ff', 0.85);
      ctx.light(X + k + 0.5, y - 0.2, Z + d * 0.6, '#f0f4ff', 5.5, { real: true });
    }
  };
  B.flowerbed = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 1.9, 0.3, 0.7, '#9c8c7c');
    bx(ctx.b, cx, 0.28, cz, 1.7, 0.06, 0.5, '#5c4024');
    var rng = U.rng(X * 31 + Z);
    for (var i = 0; i < 16; i++) {
      var fx = cx - 0.8 + rng() * 1.6, fz = cz - 0.2 + rng() * 0.4;
      ctx.b.cyl(fx, fz, 0.3, 0.46, 0.015, 0.015, '#307838', 4);
      ctx.b.sphere(fx, 0.5, fz, 0.07, 0.06, 0.07, ['#f87888', '#f8e060', '#f8f8f8', '#b088f0'][i % 4], 5, 3, { flat: true });
    }
  };
  B.statue = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.76, 0.5, 0.76, '#8c8c98');
    bx(ctx.b, cx, 0.5, cz, 0.36, 0.9, 0.3, '#a8a8b4');
    ctx.b.sphere(cx, 1.55, cz, 0.2, 0.22, 0.2, '#a8a8b4', 8, 6);
  };
  B.fountain = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 1;
    ctx.b.cyl(cx, cz, 0, 0.45, 0.95, 0.9, '#a0a0b0', 16);
    ctx.b.cyl(cx, cz, 0.44, 0.47, 0.82, 0.82, '#3868a8', 16);
    ctx.b.cyl(cx, cz, 0.3, 1.1, 0.12, 0.09, '#b0b0c0', 8);
    ctx.b.cyl(cx, cz, 1.0, 1.16, 0.34, 0.34, '#a8a8b8', 12);
    ctx.b.cyl(cx, cz, 1.15, 1.18, 0.3, 0.3, '#5898d8', 12);
    ctx.glow(cx, 1.4, cz, '#a8d0f8', 0.8, 0.5);
  };
  B.rocks = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.sphere(cx - 0.12, 0.2, cz, 0.3, 0.24, 0.28, '#8c8070', 7, 5);
    ctx.b.sphere(cx + 0.22, 0.14, cz + 0.1, 0.22, 0.17, 0.2, '#7c7060', 6, 4);
  };
  B.wire_gate = function (o, X, Z, ctx) {
    var cx = X + 1.5, cz = Z + 0.5;
    bx(ctx.b, X + 0.2, 0, cz, 0.16, 1.6, 0.16, '#707480'); bx(ctx.b, X + 2.8, 0, cz, 0.16, 1.6, 0.16, '#707480');
    for (var i = 0; i < 12; i++) bx(ctx.b, X + 0.4 + i * 0.2, 0, cz, 0.03, 1.4, 0.03, '#9ca0b0');
    for (var j = 0; j < 5; j++) bx(ctx.b, cx, 0.2 + j * 0.3, cz, 2.6, 0.03, 0.03, '#9ca0b0');
    bx(ctx.b, cx, 0.45, cz + 0.04, 1.0, 0.55, 0.03, '#f0e040');
    bx(ctx.b, cx, 0.6, cz + 0.06, 0.75, 0.1, 0.01, '#202020');
  };

  // ---------- 屋内 ----------
  var GOODS = ['#e85848', '#48a8e8', '#f8c838', '#58c858', '#f8f8f8', '#c868c8'];
  B.counter = function (o, X, Z, ctx) {
    var c = o.c || '#8c5c34', cx = X + 1.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 3, 0.9, 0.9, c);
    bx(ctx.b, cx, 0.9, cz, 3.04, 0.07, 0.96, U.shade(c, 0.2));
    bx(ctx.b, cx, 0.0, cz + 0.45, 3, 0.1, 0.02, '#201410');
    if (o.register) {
      bx(ctx.b, cx + 0.9, 0.97, cz, 0.5, 0.32, 0.4, '#383840');
      ctx.e.box(cx + 0.72, 1.18, cz + 0.18, cx + 1.08, 1.24, cz + 0.2, '#40e080', { ao: 1 });
    }
  };
  B.counter1 = function (o, X, Z, ctx) {
    var c = o.c || '#8c5c34', cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 1, 0.9, 0.9, c); bx(ctx.b, cx, 0.9, cz, 1.02, 0.07, 0.96, U.shade(c, 0.2));
  };
  B.shelf = function (o, X, Z, ctx) {
    var c = o.c || '#a07850', cx = X + 1, cz = Z + 0.5, cols = o.goods || GOODS;
    bx(ctx.b, cx, 0, cz, 1.9, 1.7, 0.5, c);
    for (var r = 0; r < 4; r++) {
      bx(ctx.b, cx, 0.1 + r * 0.42, cz + 0.02, 1.8, 0.04, 0.5, U.shade(c, -0.3));
      for (var i = 0; i < 7; i++) bx(ctx.b, cx - 0.78 + i * 0.26, 0.15 + r * 0.42, cz + 0.12, 0.18, 0.2 + (i % 2) * 0.07, 0.18, cols[(i + r * 2) % cols.length], { ao: 1 });
    }
  };
  B.fridge_case = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 1.9, 1.7, 0.6, '#d8dce8');
    ctx.e.box(cx - 0.85, 0.2, cz + 0.28, cx + 0.85, 1.5, cz + 0.3, '#a8d0f0', { ao: 1 });
    for (var r = 0; r < 3; r++) for (var i = 0; i < 7; i++) bx(ctx.b, cx - 0.78 + i * 0.26, 0.28 + r * 0.4, cz + 0.31, 0.16, 0.28, 0.02, ['#e85848', '#f8f8f8', '#48a868', '#f8c838'][(i + r) % 4], { ao: 1 });
    bx(ctx.b, cx, 0.2, cz + 0.31, 0.03, 1.3, 0.02, '#e8ecf8');
    ctx.pool(cx, cz + 0.9, 1.4, '#e0f0ff', 0.4);
  };
  B.table = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5, c = o.c || '#a87040';
    [[-0.85, -0.25], [0.85, -0.25], [-0.85, 0.25], [0.85, 0.25]].forEach(function (p) { bx(ctx.b, cx + p[0], 0, cz + p[1], 0.1, 0.66, 0.1, '#5c3818'); });
    bx(ctx.b, cx, 0.66, cz, 1.95, 0.1, 0.8, c);
    if (o.bowl) [-0.5, 0.5].forEach(function (x) { ctx.b.cyl(cx + x, cz, 0.76, 0.86, 0.2, 0.17, '#f0f0f0', 10); });
  };
  B.table1 = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 0.66, 0.06, 0.06, '#5c3818', 6);
    ctx.b.cyl(cx, cz, 0.66, 0.74, 0.42, 0.42, o.c || '#a87040', 12);
  };
  B.stool = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 0.5, 0.05, 0.05, '#707080', 6);
    ctx.b.cyl(cx, cz, 0.5, 0.6, 0.24, 0.24, o.c || '#c83838', 10);
  };
  B.chair = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5, c = o.c || '#8c5c34';
    bx(ctx.b, cx, 0.38, cz, 0.56, 0.08, 0.56, c);
    bx(ctx.b, cx, 0.46, cz - 0.25, 0.56, 0.5, 0.06, c);
    [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].forEach(function (p) { bx(ctx.b, cx + p[0], 0, cz + p[1], 0.06, 0.38, 0.06, '#4c2c14'); });
  };
  B.bed = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 1, c = o.c || '#4868b8';
    bx(ctx.b, cx, 0, cz, 0.96, 0.32, 1.96, '#7c5030');
    bx(ctx.b, cx, 0.32, cz, 0.86, 0.12, 1.84, '#f0f0f8');
    bx(ctx.b, cx, 0.44, cz + 0.28, 0.88, 0.1, 1.2, c);
    bx(ctx.b, cx, 0.44, cz - 0.62, 0.62, 0.12, 0.4, '#ffffff');
    bx(ctx.b, cx, 0, cz - 0.96, 0.96, 0.75, 0.08, '#6c4428');
  };
  B.tv = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.84, 0.5, 0.6, '#5c3c24');
    bx(ctx.b, cx, 0.5, cz, 0.78, 0.62, 0.5, '#282830');
    ctx.e.box(cx - 0.32, 0.58, cz + 0.25, cx + 0.32, 1.02, cz + 0.26, '#4878c8', { ao: 1 });
    ctx.e.box(cx - 0.28, 0.9, cz + 0.261, cx - 0.1, 0.96, cz + 0.265, '#a8d0f8', { ao: 1 });
    ctx.pool(cx, cz + 0.8, 1.1, '#b0d0ff', 0.4);
  };
  B.sofa = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5, c = o.c || '#a04848';
    bx(ctx.b, cx, 0, cz, 1.95, 0.4, 0.85, c);
    bx(ctx.b, cx, 0.4, cz - 0.32, 1.95, 0.5, 0.22, c);
    bx(ctx.b, cx - 0.9, 0.3, cz, 0.18, 0.4, 0.85, U.shade(c, -0.15)); bx(ctx.b, cx + 0.9, 0.3, cz, 0.18, 0.4, 0.85, U.shade(c, -0.15));
    bx(ctx.b, cx - 0.45, 0.4, cz + 0.08, 0.8, 0.12, 0.56, U.shade(c, 0.12)); bx(ctx.b, cx + 0.45, 0.4, cz + 0.08, 0.8, 0.12, 0.56, U.shade(c, 0.12));
  };
  B.plant = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 0.4, 0.2, 0.24, '#a85c38', 10);
    ctx.b.sphere(cx, 0.75, cz, 0.34, 0.34, 0.34, '#3c8c44', 8, 5);
    ctx.b.sphere(cx - 0.15, 1.0, cz + 0.05, 0.22, 0.22, 0.22, '#4ca054', 6, 4);
    ctx.b.sphere(cx + 0.15, 1.05, cz - 0.05, 0.2, 0.2, 0.2, '#348040', 6, 4);
  };
  B.bookshelf = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.96, 1.7, 0.45, '#7c5030');
    for (var r = 0; r < 4; r++) for (var i = 0; i < 6; i++) bx(ctx.b, cx - 0.36 + i * 0.145, 0.1 + r * 0.42, cz + 0.12, 0.1, 0.3 + (i % 3) * 0.03, 0.3, ['#c84040', '#4060c0', '#40a060', '#e0b040', '#8848a8'][(i + r) % 5], { ao: 1 });
  };
  B.desk = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx, 0.62, cz, 1.95, 0.1, 0.8, '#8c6440');
    [[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]].forEach(function (p) { bx(ctx.b, cx + p[0], 0, cz + p[1], 0.08, 0.62, 0.08, '#5c3818'); });
    if (o.pc) {
      bx(ctx.b, cx - 0.4, 0.72, cz - 0.1, 0.7, 0.5, 0.06, '#d0d0d8');
      ctx.e.box(cx - 0.72, 0.8, cz - 0.07, cx - 0.08, 1.16, cz - 0.065, '#3878c0', { ao: 1 });
      bx(ctx.b, cx - 0.4, 0.72, cz + 0.2, 0.55, 0.03, 0.22, '#c0c4cc');
    }
  };
  B.stove = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 1.95, 1.0, 0.85, '#b8bcc8');
    [-0.5, 0.5].forEach(function (x) { ctx.b.cyl(cx + x, cz, 1.0, 1.04, 0.27, 0.27, '#606470', 12); ctx.b.cyl(cx + x, cz, 1.04, 1.34, 0.22, 0.2, '#e8e8f0', 12); });
    ctx.glow(cx, 1.05, cz, '#f8a040', 1.0, 0.6);
  };
  B.lift = function (o, X, Z, ctx) {
    var cx = X + 1.5, cz = Z + 1;
    bx(ctx.b, cx, 0, cz, 2.9, 0.1, 1.9, '#4c4c58');
    [-1.0, 1.0].forEach(function (x) { bx(ctx.b, cx + x, 0.1, cz, 0.4, 0.14, 1.7, '#d8c040'); for (var k = 0; k < 6; k++) bx(ctx.b, cx + x, 0.245, cz - 0.7 + k * 0.28, 0.4, 0.01, 0.04, '#202020'); });
  };
  B.toolbox = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.8, 1.0, 0.55, '#c83030');
    for (var i = 0; i < 3; i++) { bx(ctx.b, cx, 0.2 + i * 0.28, cz + 0.28, 0.76, 0.03, 0.02, '#781818'); bx(ctx.b, cx, 0.3 + i * 0.28, cz + 0.29, 0.22, 0.03, 0.02, '#d0d0d8'); }
  };
  B.partsrack = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 1.9, 1.7, 0.5, '#707488');
    for (var r = 0; r < 4; r++) {
      bx(ctx.b, cx, 0.1 + r * 0.42, cz + 0.02, 1.8, 0.04, 0.5, '#383848');
      if (r < 3) { ctx.b.cyl(cx - 0.55, cz + 0.12, 0.16 + r * 0.42, 0.38 + r * 0.42, 0.17, 0.17, '#202024', 8); bx(ctx.b, cx + 0.1, 0.16 + r * 0.42, cz + 0.12, 0.4, 0.2, 0.3, ['#d83030', '#3060c8', '#e0b030'][r]); bx(ctx.b, cx + 0.62, 0.16 + r * 0.42, cz + 0.12, 0.4, 0.14, 0.2, '#c0c4d0'); }
    }
  };
  // 壁掛け
  function wallPlane(ctx, x, y, w, h, z, tex, emis) {
    var m = new T.Mesh(new T.PlaneGeometry(w, h), emis ? new T.MeshBasicMaterial({ map: tex, fog: false }) : new T.MeshLambertMaterial({ map: tex }));
    m.position.set(x, y, z);
    ctx.group.add(m);
    return m;
  }
  function wallZ(o) { return o.y + 1 - 0.02; }
  B.poster = function (o, X, Z, ctx) {
    var c = o.c || '#e85848', z = wallZ({ y: Z }), key = 'poster:' + c + (o.sticker ? 's' : '');
    var tex = Gfx.tex(key, 64, 96, function (g, w, h) {
      if (o.sticker) {
        g.fillStyle = '#181820'; g.fillRect(0, 24, w, 48); g.fillStyle = '#c83850'; g.fillRect(4, 28, w - 8, 40);
        g.fillStyle = '#f8f8f8'; g.font = 'bold 22px ' + RR.FONT_STACK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SAKI', w / 2, 48);
        return;
      }
      g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h);
      var gr = g.createLinearGradient(0, 6, 0, 66); gr.addColorStop(0, U.shade(c, 0.2)); gr.addColorStop(1, c);
      g.fillStyle = gr; g.fillRect(5, 6, w - 10, 60);
      g.fillStyle = '#202028'; g.beginPath(); g.moveTo(10, 56); g.lineTo(24, 30); g.lineTo(40, 36); g.lineTo(54, 56); g.fill();
      g.fillStyle = '#808088'; g.fillRect(8, 76, w - 16, 3); g.fillRect(8, 84, w - 28, 3);
    }, { clamp: true });
    wallPlane(ctx, X + 0.5, 1.5, o.sticker ? 0.7 : 0.62, o.sticker ? 0.5 : 0.92, z, tex);
  };
  B.window_in = function (o, X, Z, ctx) {
    var z = wallZ({ y: Z });
    var tex = Gfx.tex('winin', 96, 96, function (g, w, h) {
      g.fillStyle = '#e8ecf4'; g.fillRect(0, 0, w, h);
      var gr = g.createLinearGradient(0, 8, 0, h - 8); gr.addColorStop(0, '#0c1432'); gr.addColorStop(1, '#2a3c70');
      g.fillStyle = gr; g.fillRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#f8f8d0'; [[22, 24], [60, 18], [40, 42], [70, 52], [26, 60]].forEach(function (p) { g.fillRect(p[0], p[1], 2, 2); });
      g.fillStyle = '#e8ecf4'; g.fillRect(w / 2 - 2, 8, 4, h - 16); g.fillRect(8, h / 2 - 2, w - 16, 4);
    }, { clamp: true });
    wallPlane(ctx, X + 0.5, 1.6, 0.9, 0.9, z, tex, true);
    ctx.pool(X + 0.5, Z + 1.8, 1.3, '#6080c0', 0.25);
  };
  B.clock = function (o, X, Z, ctx) {
    var cx = X + 0.5, z = wallZ({ y: Z });
    ctx.b.cyl(cx, z - 0.05, 1.45, 1.5, 0.3, 0.3, '#d8b070', 14);
    var tex = Gfx.tex('clockface', 64, 64, function (g, w, h) {
      g.fillStyle = '#f8f8f0'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
      g.strokeStyle = '#202020'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 12); g.moveTo(32, 32); g.lineTo(44, 36); g.stroke();
    }, { clamp: true });
    var m = new T.Mesh(new T.PlaneGeometry(0.5, 0.5), new T.MeshLambertMaterial({ map: tex, transparent: true }));
    m.position.set(cx, 1.6, z + 0.01); ctx.group.add(m);
  };
  B.photo = function (o, X, Z, ctx) {
    var z = wallZ({ y: Z });
    var tex = Gfx.tex('photo', 64, 64, function (g, w, h) {
      g.fillStyle = '#7c5030'; g.fillRect(0, 0, w, h); g.fillStyle = '#f8c890'; g.fillRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#5c4870'; g.fillRect(5, 36, w - 10, 23); g.fillStyle = '#202028'; [16, 32, 48].forEach(function (x) { g.fillRect(x, 28, 5, 8); });
    }, { clamp: true });
    wallPlane(ctx, X + 0.5, 1.5, 0.6, 0.6, z, tex);
  };
  B.neon = function (o, X, Z, ctx) {
    var z = wallZ({ y: Z });
    var tex = Gfx.tex('neon', 128, 64, function (g, w, h) {
      g.fillStyle = '#181020'; g.fillRect(0, 0, w, h);
      g.lineWidth = 5; g.lineCap = 'round'; g.shadowBlur = 8;
      g.strokeStyle = '#f848a0'; g.shadowColor = '#f848a0'; g.beginPath(); g.moveTo(30, 14); g.lineTo(12, 14); g.lineTo(12, 32); g.lineTo(30, 32); g.lineTo(30, 50); g.lineTo(12, 50); g.stroke();
      g.strokeStyle = '#48f0f0'; g.shadowColor = '#48f0f0'; g.beginPath(); g.moveTo(52, 14); g.lineTo(52, 50); g.moveTo(52, 14); g.lineTo(80, 14); g.moveTo(98, 14); g.lineTo(98, 50); g.moveTo(98, 14); g.lineTo(116, 14); g.stroke();
    }, { clamp: true });
    wallPlane(ctx, X + 0.5, 1.6, 0.95, 0.5, z, tex, true);
    ctx.pool(X + 0.5, Z + 1.8, 1.5, '#f070c0', 0.45);
  };
  B.fridge = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.9, 1.7, 0.75, '#e8ecf4');
    bx(ctx.b, cx, 0.7, cz + 0.38, 0.9, 0.02, 0.02, '#9ca0b0');
    bx(ctx.b, cx + 0.3, 1.0, cz + 0.39, 0.04, 0.35, 0.03, '#9ca0b0'); bx(ctx.b, cx + 0.3, 0.3, cz + 0.39, 0.04, 0.3, 0.03, '#9ca0b0');
  };
  B.kitchen = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 1.95, 0.9, 0.85, '#e0e0e8'); bx(ctx.b, cx, 0.9, cz, 1.98, 0.06, 0.9, '#c8c8d0');
    bx(ctx.b, cx - 0.5, 0.92, cz, 0.6, 0.05, 0.5, '#9ca0b0');
    ctx.b.cyl(cx + 0.55, cz, 0.94, 0.98, 0.2, 0.2, '#606070', 10);
  };
  B.rug = function (o, X, Z, ctx) {
    var c = o.c || '#c05050';
    var b = ctx.b;
    b.box(X + 0.1, 0, Z + 0.1, X + 1.9, 0.03, Z + 1.9, { all: c, top: c }, { ao: 1 });
    b.box(X + 0.25, 0.031, Z + 0.25, X + 1.75, 0.04, Z + 1.75, { all: U.shade(c, 0.22), top: U.shade(c, 0.22) }, { ao: 1 });
    b.box(X + 0.4, 0.041, Z + 0.4, X + 1.6, 0.05, Z + 1.6, { all: c, top: c }, { ao: 1 });
  };
  B.lamp_in = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 0.06, 0.2, 0.18, '#404050', 8);
    ctx.b.cyl(cx, cz, 0.05, 1.35, 0.03, 0.03, '#606070', 6, { noTop: true });
    ctx.e.cyl(cx, cz, 1.3, 1.68, 0.3, 0.2, '#f8e0a0', 10);
    ctx.glow(cx, 1.5, cz, '#f8d890', 1.8, 0.8);
    ctx.pool(cx, cz, 2.2, '#f8d890', 0.65);
    ctx.light(cx, 1.5, cz, '#f8d890', 6, { real: true });
  };
  B.arcade = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.9, 1.8, 0.7, '#3040a0');
    ctx.e.box(cx - 0.33, 1.05, cz + 0.35, cx + 0.33, 1.55, cz + 0.36, ['#e04040', '#40c060', '#4080e0'][(X) % 3], { ao: 1 });
    bx(ctx.b, cx, 0.8, cz + 0.2, 0.7, 0.18, 0.4, '#202028');
    ctx.b.sphere(cx - 0.15, 1.0, cz + 0.2, 0.05, 0.05, 0.05, '#f8e040', 4, 3, { flat: true });
    ctx.pool(cx, cz + 0.8, 1.2, '#c0a0ff', 0.4);
  };
  B.pot = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    ctx.b.cyl(cx, cz, 0, 0.5, 0.3, 0.3, '#b8bcc8', 12);
    ctx.b.cyl(cx, cz, 0.5, 0.56, 0.33, 0.33, '#e8e8f0', 12);
  };
  B.trophy = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5, c = o.c || '#d0a030', k = o.big ? 1.25 : 1;
    bx(ctx.b, cx, 0, cz, 0.7, 0.4, 0.6, '#5c3818');
    ctx.b.cyl(cx, cz, 0.4, 0.62, 0.15 * k, 0.06 * k, c, 8);
    ctx.b.cyl(cx, cz, 0.62, 1.0 * k + 0.0, 0.1 * k, 0.28 * k, c, 10);
    ctx.b.sphere(cx - 0.3 * k, 0.88 * k, cz, 0.09, 0.09, 0.03, c, 6, 4, { flat: true });
    ctx.b.sphere(cx + 0.3 * k, 0.88 * k, cz, 0.09, 0.09, 0.03, c, 6, 4, { flat: true });
    if (o.big) ctx.pool(cx, cz + 0.4, 1.1, '#f8e0a0', 0.35);
  };
  B.helmet = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.7, 0.4, 0.6, '#5c3818');
    ctx.b.sphere(cx, 0.68, cz, 0.28, 0.26, 0.3, '#f0f0f8', 10, 7);
    bx(ctx.b, cx, 0.62, cz + 0.2, 0.4, 0.14, 0.12, '#283048');
    bx(ctx.b, cx, 0.76, cz, 0.56, 0.03, 0.58, '#c83838');
  };
  B.aquarium = function (o, X, Z, ctx) {
    var cx = X + 0.5, cz = Z + 0.5;
    bx(ctx.b, cx, 0, cz, 0.9, 0.5, 0.6, '#383848');
    ctx.e.box(cx - 0.4, 0.55, cz - 0.25, cx + 0.4, 1.05, cz + 0.25, '#2858a0', { ao: 1 });
    bx(ctx.b, cx - 0.2, 0.7, cz, 0.12, 0.08, 0.06, '#f88838'); bx(ctx.b, cx + 0.2, 0.85, cz + 0.05, 0.1, 0.07, 0.06, '#f8e040');
    ctx.pool(cx, cz + 0.8, 1.2, '#80c0f8', 0.45);
  };
  B.kotatsu = function (o, X, Z, ctx) {
    var cx = X + 1, cz = Z + 0.5;
    bx(ctx.b, cx, 0.1, cz, 1.9, 0.56, 0.95, '#b84848');
    bx(ctx.b, cx, 0.6, cz, 1.95, 0.09, 1.0, '#a87040');
    ctx.b.cyl(cx + 0.5, cz, 0.69, 0.78, 0.1, 0.09, '#f8a030', 8);
  };

  // ---------- 構築の入口 ----------
  P3D.build = function (prop, ctx) {
    var fn = B[prop.type];
    if (!fn) { RR.log('unknown prop3d', prop.type); bx(ctx.b, prop.x + 0.5, 0, prop.y + 0.5, 0.6, 0.6, 0.6, '#c040c0'); return; }
    fn(prop, prop.x, prop.y, ctx);
  };

  // アイコン（メニュー用の2D画像）。同じモデルを小さなシーンに置いて撮影する
  var iconCache = {};
  P3D.icon = function (type, o) {
    var key = type + JSON.stringify(o || {});
    if (iconCache[key]) return iconCache[key];
    var def = RR.Props.defs[type];
    if (!def || !B[type]) return null;
    var sz = def.size(o || {});
    var ctx = P3D.makeCtx(null);
    var prop = Object.assign({}, o || {}, { type: type, x: 0, y: 1 });
    if (def.wall) prop.y = 0;
    B[type](prop, prop.x, prop.y, ctx);
    var sc = new T.Scene();
    var meshes = ctx.finish(sc);
    sc.add(new T.HemisphereLight(0xffffff, 0x887766, 1.0));
    var dl = new T.DirectionalLight(0xffffff, 0.8); dl.position.set(-2, 5, 4); sc.add(dl);
    var w = Math.round(sz[0] * 24 + 10) * P3D.ICON_SCALE, h = Math.round(40) * P3D.ICON_SCALE;
    var aspect = w / h;
    var cam = new T.PerspectiveCamera(30, aspect, 0.1, 50);
    var cx = sz[0] / 2, cz = prop.y + sz[1] / 2;
    cam.position.set(cx, 3.6 + sz[1] * 0.6, cz + 5.2); cam.lookAt(cx, def.wall ? 1.4 : 0.55, cz);
    var cv = RR.GL.snapshot(sc, cam, w, h);
    iconCache[key] = cv;
    return cv;
  };

  // ビルダーに渡すコンテキストの生成（Field3D と icon で共用）
  P3D.makeCtx = function (map) {
    var ctx = {
      b: new Gfx.Batch(), e: new Gfx.Batch(), pools: new Gfx.Batch(), shadows: new Gfx.Batch(), group: new T.Group(),
      lights: [], fades: [], anim: [], glows: [], dynamic: [], map: map
    };
    ctx.pool = function (x, z, r, color, k, kind) {
      var tgt = kind === 'shadow' ? ctx.shadows : ctx.pools;
      var c = kind === 'shadow' ? [0, 0, 0] : Gfx.rgb(color);
      var s = kind === 'shadow' ? 0.5 : (k == null ? 1 : k);
      var col = [c[0] * s, c[1] * s, c[2] * s];
      tgt.quad([[x - r, 0.11, z + r], [x + r, 0.11, z + r], [x + r, 0.11, z - r], [x - r, 0.11, z - r]], [col, col, col, col], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    };
    ctx.light = function (x, y, z, color, dist, opt) { ctx.lights.push(Object.assign({ x: x, y: y, z: z, color: color, dist: dist }, opt || {})); };
    ctx.glow = function (x, y, z, color, size, k) { ctx.glows.push({ x: x, y: y, z: z, color: color, size: size, k: k }); };
    ctx.add = function (obj) { ctx.group.add(obj); };
    // 個別に半透明化するメッシュ。bounds: 遮蔽判定の範囲
    ctx.fadeMesh = function (batch, bounds, cast) {
      if (!batch || batch.empty()) return null;
      var mat = new T.MeshLambertMaterial({ vertexColors: true });
      var mesh = batch.build(mat, { cast: true });
      ctx.group.add(mesh);
      ctx.fades.push({ mats: [mat], bounds: bounds, mesh: mesh, a: 1 });
      return mesh;
    };
    // 静的な塊を3Dシーンに追加する
    ctx.finish = function (parent) {
      var out = [];
      if (!ctx.b.empty()) { var m = ctx.b.build(Gfx.vcol(), { cast: true }); m.receiveShadow = true; parent.add(m); out.push(m); }
      if (!ctx.e.empty()) { var me = ctx.e.build(Gfx.emissive(), { cast: false }); parent.add(me); out.push(me); }
      if (!ctx.shadows.empty()) {
        var smat = Gfx.basic('shadowpool', { map: Gfx.glowTexture(), vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false, fog: false });
        var sm = ctx.shadows.build(smat, { cast: false }); sm.renderOrder = 1; parent.add(sm); out.push(sm);
      }
      if (!ctx.pools.empty()) {
        var pmat = Gfx.basic('poolbatch', { map: Gfx.glowTexture(), vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
        var pm = ctx.pools.build(pmat, { cast: false }); pm.renderOrder = 2; parent.add(pm); out.push(pm);
      }
      parent.add(ctx.group);
      ctx.glows.forEach(function (g) {
        var s = Gfx.glowSprite(g.color, g.size, g.k || 1);
        s.position.set(g.x, g.y, g.z);
        parent.add(s);
      });
      return out;
    };
    return ctx;
  };
})();
