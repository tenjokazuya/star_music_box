/* RR.Gfx: 3D 用の手続き生成（テクスチャ・マテリアル・ジオメトリのバッチ・光の演出） */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U;
  var Gfx = RR.Gfx = {};

  // ---------- 色 ----------
  var colCache = {};
  Gfx.rgb = function (c) {
    if (typeof c !== 'string') return c;
    var v = colCache[c];
    if (!v) { var a = U.rgb(c); v = colCache[c] = [a[0] / 255, a[1] / 255, a[2] / 255]; }
    return v;
  };
  Gfx.color = function (c) { var a = Gfx.rgb(c); return new T.Color(a[0], a[1], a[2]); };

  // ---------- テクスチャ ----------
  var texCache = {};
  // キャンバスに描いてテクスチャにする。key が同じならキャッシュを返す
  Gfx.tex = function (key, w, h, draw, opt) {
    if (texCache[key]) return texCache[key];
    opt = opt || {};
    var c = U.canvas(w, h, true);
    draw(c.g, w, h);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = opt.clamp ? T.ClampToEdgeWrapping : T.RepeatWrapping;
    t.anisotropy = 4;
    t.magFilter = T.LinearFilter;
    t.minFilter = opt.noMip ? T.LinearFilter : T.LinearMipmapLinearFilter;
    t.generateMipmaps = !opt.noMip;
    t.userData = { canvas: c };
    texCache[key] = t;
    return t;
  };
  Gfx.texFromCanvas = function (c, opt) {
    opt = opt || {};
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = opt.repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping;
    t.anisotropy = 4;
    t.minFilter = opt.noMip ? T.LinearFilter : T.LinearMipmapLinearFilter;
    t.generateMipmaps = !opt.noMip;
    return t;
  };
  // 値ノイズ（0..1）。タイル可能にしたい時は period を渡す
  function vnoise(x, y, seed, period) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    function h(a, b) {
      if (period) { a = ((a % period) + period) % period; b = ((b % period) + period) % period; }
      return U.hash2(a, b, seed);
    }
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a0 = h(xi, yi), b0 = h(xi + 1, yi), c0 = h(xi, yi + 1), d0 = h(xi + 1, yi + 1);
    return a0 + (b0 - a0) * u + (c0 - a0) * v * (1 - u) + (d0 - b0) * u * v;
  }
  // fbm（タイル可能）: 周期 per（セル数）
  Gfx.fbm = function (x, y, seed, per, oct) {
    var s = 0, a = 0.5, f = 1, tot = 0;
    for (var i = 0; i < (oct || 3); i++) {
      s += a * vnoise(x * per * f, y * per * f, seed + i * 17, per * f);
      tot += a; a *= 0.5; f *= 2;
    }
    return s / tot;
  };
  // ノイズを使った塗り: base 色に ±amt の明暗むらを付けたタイル可能テクスチャ用の ImageData を作る
  Gfx.noiseFill = function (g, w, h, base, opt) {
    opt = opt || {};
    var amt = opt.amt == null ? 0.25 : opt.amt, per = opt.per || 6, seed = opt.seed || 1, oct = opt.oct || 3;
    var fine = opt.fine == null ? 0.08 : opt.fine;
    var c = U.rgb(base), c2 = opt.tint ? U.rgb(opt.tint) : null;
    var img = g.createImageData(w, h), d = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var n = Gfx.fbm(x / w, y / h, seed, per, oct);
        var f = (U.hash2(x, y, seed + 5) - 0.5) * fine;
        var k = (n - 0.5) * 2 * amt + f;
        var r = c[0], gg = c[1], b = c[2];
        if (c2) { var m = U.clamp((n - 0.35) * 2.2, 0, 1); r += (c2[0] - r) * m; gg += (c2[1] - gg) * m; b += (c2[2] - b) * m; }
        var i = (y * w + x) * 4;
        d[i] = U.clamp(r * (1 + k), 0, 255); d[i + 1] = U.clamp(gg * (1 + k), 0, 255); d[i + 2] = U.clamp(b * (1 + k), 0, 255); d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  };

  // ---------- マテリアル ----------
  var matCache = {};
  Gfx.lambert = function (key, o) {
    var k = 'L' + key;
    if (!matCache[k]) matCache[k] = new T.MeshLambertMaterial(o);
    return matCache[k];
  };
  Gfx.standard = function (key, o) {
    var k = 'S' + key;
    if (!matCache[k]) matCache[k] = new T.MeshStandardMaterial(o);
    return matCache[k];
  };
  // 頂点色のマテリアル
  Gfx.vcol = function () { return Gfx.lambert('vcol', { vertexColors: true }); };
  Gfx.vcolStd = function () { return Gfx.standard('vcolstd', { vertexColors: true, roughness: 0.55, metalness: 0.15 }); };
  Gfx.emissive = function () { return Gfx.basic('emit', { vertexColors: true, fog: true }); };
  Gfx.basic = function (key, o) {
    var k = 'B' + key;
    if (!matCache[k]) matCache[k] = new T.MeshBasicMaterial(o);
    return matCache[k];
  };

  // ---------- ジオメトリのバッチ（頂点色つき、1メッシュにまとめる） ----------
  function Batch() { this.pos = []; this.nor = []; this.col = []; this.uv = []; this.idx = []; this.n = 0; }
  var B = Batch.prototype;
  Gfx.Batch = Batch;
  // 4頂点の面（反時計回りが表）。p: [[x,y,z]x4]、c: 色または頂点ごとの色配列、uv: [[u,v]x4]
  B.quad = function (p, c, uv) {
    // 面の法線: 2つの三角形の法線の和（頂点が重なる退化した面でも壊れない）
    var a = p[0], b = p[1], e = p[2], d = p[3];
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    var wx = e[0] - a[0], wy = e[1] - a[1], wz = e[2] - a[2];
    var vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    var nx = (uy * wz - uz * wy) + (wy * vz - wz * vy), ny = (uz * wx - ux * wz) + (wz * vx - wx * vz), nz = (ux * wy - uy * wx) + (wx * vy - wy * vx);
    var l = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (l < 1e-9) { nx = 0; ny = 1; nz = 0; l = 1; }
    nx /= l; ny /= l; nz /= l;
    var cols = Array.isArray(c) && Array.isArray(c[0]) ? c : null;
    var base = cols ? null : Gfx.rgb(c);
    for (var i = 0; i < 4; i++) {
      this.pos.push(p[i][0], p[i][1], p[i][2]);
      this.nor.push(nx, ny, nz);
      var cc = cols ? cols[i] : base;
      this.col.push(cc[0], cc[1], cc[2]);
      var t = uv ? uv[i] : (i === 0 ? [0, 0] : i === 1 ? [1, 0] : i === 2 ? [1, 1] : [0, 1]);
      this.uv.push(t[0], t[1]);
    }
    var n = this.n;
    this.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    this.n += 4;
    return this;
  };
  function scaleC(c, k) { var r = Gfx.rgb(c); return [r[0] * k, r[1] * k, r[2] * k]; }
  // 軸並行の箱。cols: 色、または {top,side,front,back,left,right,bottom}。ao: 側面の下端の暗さ（0..1、既定0.8）
  B.box = function (x0, y0, z0, x1, y1, z1, cols, o) {
    o = o || {};
    var ao = o.ao == null ? 0.8 : o.ao;
    var c = typeof cols === 'string' ? { all: cols } : cols;
    function pick(k) { return c[k] || c.side || c.all; }
    function side(k, p) {
      var col = pick(k);
      this.quad(p, [scaleC(col, ao), scaleC(col, ao), scaleC(col, 1), scaleC(col, 1)], o.uvs && o.uvs[k]);
    }
    if (!o.noTop) this.quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], scaleC(c.top || c.all || c.side, 1), o.uvs && o.uvs.top);
    if (!o.noBottom) this.quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], scaleC(c.bottom || c.all || c.side, 0.5));
    if (!o.noFront) side.call(this, 'front', [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);   // +Z（南）
    if (!o.noBack) side.call(this, 'back', [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]);    // -Z（北）
    if (!o.noLeft) side.call(this, 'left', [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]);    // -X
    if (!o.noRight) side.call(this, 'right', [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]);  // +X
    return this;
  };
  B.boxC = function (cx, cy, cz, w, h, d, cols, o) { // 中心指定
    return this.box(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, cols, o);
  };
  // 垂直の円柱/円錐台（y0..y1、半径 r0(下)→r1(上)）
  B.cyl = function (cx, cz, y0, y1, r0, r1, col, seg, o) {
    o = o || {};
    seg = seg || 8;
    var ao = o.ao == null ? 0.85 : o.ao;
    var rgb = Gfx.rgb(col), slope = (r0 - r1) / Math.max(0.0001, y1 - y0);
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      var p = [[cx + c0 * r0, y0, cz + s0 * r0], [cx + c1 * r0, y0, cz + s1 * r0], [cx + c1 * r1, y1, cz + s1 * r1], [cx + c0 * r1, y1, cz + s0 * r1]];
      // 面の向きは外向き
      var shade = 0.82 + 0.18 * Math.cos((a0 + a1) / 2 - 0.9);
      var cc = [scaleC(col, ao * shade), scaleC(col, ao * shade), scaleC(col, shade), scaleC(col, shade)];
      this.quad([p[1], p[0], p[3], p[2]], cc);
      if (r1 > 0.001 && !o.noTop) {
        var A = [cx + c0 * r1, y1, cz + s0 * r1], Bp = [cx + c1 * r1, y1, cz + s1 * r1];
        this.quad([[cx, y1, cz], Bp, A, A], scaleC(col, 1.0));
      }
    }
    return this;
  };
  // 楕円体（簡易）
  B.sphere = function (cx, cy, cz, rx, ry, rz, col, ws, hs, o) {
    o = o || {};
    ws = ws || 8; hs = hs || 6;
    var rgb = Gfx.rgb(col);
    var self = this;
    function P(i, j) {
      var th = j / hs * Math.PI, ph = i / ws * Math.PI * 2;
      return [cx + Math.sin(th) * Math.cos(ph) * rx, cy + Math.cos(th) * ry, cz + Math.sin(th) * Math.sin(ph) * rz];
    }
    function C(p) {
      var k = o.flat ? 1 : 0.7 + 0.3 * U.clamp((p[1] - cy) / Math.max(0.0001, ry) * 0.5 + 0.5, 0, 1);
      return [rgb[0] * k, rgb[1] * k, rgb[2] * k];
    }
    for (var j = 0; j < hs; j++) {
      for (var i = 0; i < ws; i++) {
        var p0 = P(i, j), p1 = P(i + 1, j), p2 = P(i + 1, j + 1), p3 = P(i, j + 1);
        self.quad([p0, p1, p2, p3], [C(p0), C(p1), C(p2), C(p3)]);
      }
    }
    return this;
  };
  // 円錐（木の針葉など）
  B.cone = function (cx, cz, y0, y1, r, col, seg, o) { return this.cyl(cx, cz, y0, y1, r, 0, col, seg, o); };
  // 4つの角を指定した板（斜めの屋根など）。両面
  B.panel = function (p, col, uv, twoSided) {
    this.quad(p, col, uv);
    if (twoSided) this.quad([p[0], p[3], p[2], p[1]], scaleC(col, 0.7), uv ? [uv[0], uv[3], uv[2], uv[1]] : null);
    return this;
  };
  B.build = function (mat, o) {
    o = o || {};
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    var m = new T.Mesh(g, mat || Gfx.vcol());
    m.castShadow = o.cast !== false; m.receiveShadow = !!o.receive;
    return m;
  };
  B.empty = function () { return this.n === 0; };

  // ---------- 光の演出 ----------
  var glowTex = null;
  Gfx.glowTexture = function () {
    if (glowTex) return glowTex;
    glowTex = Gfx.tex('glow', 128, 128, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.12, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.22)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, { clamp: true, noMip: true });
    return glowTex;
  };
  // 地面に置く光だまり（加算合成）。r はユニット、y は高さ
  var poolMats = {};
  Gfx.lightPool = function (color, r, intensity) {
    var key = color + ':' + (intensity || 1);
    var m = poolMats[key];
    if (!m) {
      var c = Gfx.color(color).multiplyScalar(intensity || 1);
      m = poolMats[key] = new T.MeshBasicMaterial({ map: Gfx.glowTexture(), color: c, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    }
    var mesh = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), m);
    mesh.renderOrder = 2;
    mesh.userData.isPool = true;
    return mesh;
  };
  // 光の玉（ビルボード、加算）
  var sprMats = {};
  Gfx.glowSprite = function (color, size, intensity) {
    var key = color + ':' + (intensity || 1);
    var m = sprMats[key];
    if (!m) {
      var c = Gfx.color(color).multiplyScalar(intensity || 1);
      m = sprMats[key] = new T.SpriteMaterial({ map: Gfx.glowTexture(), color: c, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    }
    var s = new T.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  };

  // 文字の入った板（看板など）
  Gfx.textTexture = function (text, w, h, o) {
    o = o || {};
    var key = 'txt:' + text + ':' + w + 'x' + h + (o.bg || '') + (o.fg || '') + (o.border || '');
    return Gfx.tex(key, w, h, function (g) {
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(2, h * 0.06); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
      var fs = Math.min(h * 0.62, (w * 0.9) / Math.max(1, text.length) * (o.k || 1));
      g.font = 'bold ' + fs + 'px ' + (RR.FONT_STACK || 'sans-serif');
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.shadow) { g.fillStyle = o.shadow; g.fillText(text, w / 2 + fs * 0.04, h / 2 + fs * 0.06); }
      g.fillStyle = o.fg || '#f8f8f8';
      g.fillText(text, w / 2, h / 2 + fs * 0.04);
    }, { clamp: true });
  };

  // オブジェクトのリソース解放
  Gfx.dispose = function (obj) {
    obj.traverse(function (o) {
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
    });
  };
})();
