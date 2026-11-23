/* RR.Race3D: レースの3D表示（路面・ガードレール・崖・森・街灯・空・車・ヘッドライト・煙・スキッドマーク）
 * 物理・AIは参照元と同じ（メートル、(x,y) → 3D の (X=x, Z=y)）。車は root.rotation.y = -ψ
 */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U, Gfx = RR.Gfx, C = RR.Course;
  var R3 = RR.Race3D = {};
  var DS = 0.5, STEP = 4; // 中心線は 0.5m 間隔。路面は 2m ごとに作る

  // ---------- テクスチャ ----------
  function roadTexture(kyudo) {
    return Gfx.tex('road' + (kyudo ? 'k' : ''), 256, 512, function (g, w, h) {
      // 幅方向 u: 0..1、長さ方向 v: 12m 分（2周期）
      Gfx.noiseFill(g, w, h, kyudo ? '#46423e' : '#3c3c48', { amt: 0.12, per: 8, seed: 3, fine: 0.2 });
      var rng = U.rng(7);
      g.fillStyle = 'rgba(20,20,26,0.5)';
      for (var i = 0; i < 260; i++) { g.beginPath(); g.arc(rng() * w, rng() * h, 0.6 + rng() * 1.2, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(120,120,135,0.3)';
      for (i = 0; i < 160; i++) { g.beginPath(); g.arc(rng() * w, rng() * h, 0.5 + rng(), 0, 7); g.fill(); }
      // 路面のつぎはぎ・タイヤ痕
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(w * 0.3, 0, w * 0.1, h); g.fillRect(w * 0.62, 0, w * 0.1, h);
      if (kyudo) {
        g.strokeStyle = 'rgba(10,10,12,0.7)'; g.lineWidth = 1.4;
        for (i = 0; i < 10; i++) { var x = rng() * w, y = rng() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 60, y + 20 + rng() * 40); g.lineTo(x + (rng() - 0.5) * 80, y + 60 + rng() * 40); g.stroke(); }
      } else {
        // 外側線（白）と中央線（黄の破線）
        g.fillStyle = '#d8d8e0'; g.fillRect(w * 0.035, 0, w * 0.02, h); g.fillRect(w * 0.945, 0, w * 0.02, h);
        g.fillStyle = '#d8c050';
        for (var k = 0; k < 2; k++) g.fillRect(w * 0.49, k * h / 2, w * 0.02, h / 4);
      }
    });
  }
  function terrainTexture() {
    return Gfx.tex('terrain', 256, 256, function (g, w, h) {
      Gfx.noiseFill(g, w, h, '#ffffff', { amt: 0.32, per: 6, seed: 9, fine: 0.25, oct: 4 });
      var rng = U.rng(11);
      for (var i = 0; i < 400; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.1 + rng() * 0.2) + ')'; g.beginPath(); g.arc(rng() * w, rng() * h, 1 + rng() * 3, 0, 7); g.fill(); }
    });
  }
  var smokeTex = null;
  function smokeTexture() {
    if (smokeTex) return smokeTex;
    smokeTex = Gfx.tex('smoke', 64, 64, function (g, w, h) {
      var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, { clamp: true, noMip: true });
    return smokeTex;
  }

  // ---------- 標高 ----------
  function buildElev(c) {
    var n = c.pts.length, e = new Float32Array(n);
    var ph = (c.id.length * 1.7) % 6.28;
    for (var i = 0; i < n; i++) {
      var s = c.pts[i].s;
      e[i] = c.grade * s * 0.75 + 2.4 * Math.sin(s / 110 + ph) + 1.2 * Math.sin(s / 47 + ph * 2);
    }
    // 先頭を 0 に
    var e0 = e[0];
    for (i = 0; i < n; i++) e[i] -= e0;
    c.elev = e;
  }
  R3.elevAt = function (c, s) {
    if (!c.elev) buildElev(c);
    var f = U.clamp(s / DS, 0, c.pts.length - 1.001), i = Math.floor(f), t = f - i;
    return c.elev[i] * (1 - t) + c.elev[i + 1] * t;
  };

  // ---------- 断面（中心からの距離 d と高さ y）----------
  function profiles(hw) {
    return {
      M: { d: [0, hw, hw + 0.7, hw + 1.0, hw + 1.15, hw + 2.6, hw + 6, hw + 26], y: [0, 0, -0.02, -0.14, -0.06, 3.2, 5.2, 22] },
      V: { d: [0, hw, hw + 0.7, hw + 1.0, hw + 1.5, hw + 3.2, hw + 9, hw + 32], y: [0, 0, -0.02, -0.02, -0.35, -4.5, -13, -27] }
    };
  }
  var COL = {
    M: [[0.9, 0.9, 0.95], [0.9, 0.9, 0.95], [0.5, 0.52, 0.55], [0.55, 0.5, 0.42], [0.62, 0.55, 0.45], [0.45, 0.42, 0.36], [0.38, 0.5, 0.34]],
    V: [[0.9, 0.9, 0.95], [0.5, 0.48, 0.44], [0.5, 0.48, 0.44], [0.3, 0.42, 0.3], [0.2, 0.34, 0.22], [0.14, 0.24, 0.16], [0.1, 0.18, 0.12]]
  };

  R3.create = function (course, R) {
    var c = course;
    buildElev(c);
    var hw = c.width / 2;
    var pts = c.pts, n = pts.length;
    var P = profiles(hw);
    var q = RR.GL.q();
    var scene = new T.Scene();
    var pal = c.pal || {};
    var dawn = !!c.def.dawn;
    var fogAmt = c.fog || 0;
    var self = { scene: scene, camera: new T.PerspectiveCamera(58, 16 / 9, 0.2, 1500), c: c };

    // ---- 光 ----
    var amb = new T.AmbientLight(0x2a3568, 0.9); scene.add(amb);
    var hemi = new T.HemisphereLight(0x404c88, 0x141420, 0.5); scene.add(hemi);
    var moon = new T.DirectionalLight(0x8090d8, 0.35); moon.position.set(-30, 60, 20); scene.add(moon);
    var headP = new T.SpotLight(0xfff0cc, 2.4, 70, 0.52, 0.55, 1.0); scene.add(headP); scene.add(headP.target);
    var headR = new T.SpotLight(0xfff0cc, 1.6, 55, 0.5, 0.6, 1.0); scene.add(headR); scene.add(headR.target);
    headR.visible = !!R.rival && q.lights >= 3;
    var lampLights = [];
    for (var li = 0; li < 2; li++) { var pl = new T.PointLight(0xffe0a0, 0, 16, 1.2); scene.add(pl); lampLights.push(pl); }
    self.amb = amb; self.hemi = hemi; self.moon = moon;

    // ---- 路面と地形（断面を並べた帯）----
    var sm = 6;
    function wV(i, side) { // 谷側の重み（左右ごと、なめらかに）
      var s = 0, cnt = 0;
      for (var k = -sm; k <= sm; k++) {
        var p = pts[U.clamp(i + k * STEP, 0, n - 1)];
        var sd = p.side;
        var v = (sd === 'B') || (side < 0 ? sd === 'L' : sd === 'R') ? 1 : 0;
        s += v; cnt++;
      }
      return s / cnt;
    }
    var idxs = [];
    for (var i = 0; i < n; i += STEP) idxs.push(i);
    if (idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1);
    var NS = idxs.length, NL = P.M.d.length; // 路面の左端〜右端
    // 頂点: 各サンプル × (左側 NL-1 + 中心 + 右側 NL-1) = 2*NL-1
    var NV = NL * 2 - 1;
    var pos = new Float32Array(NS * NV * 3), col = new Float32Array(NS * NV * 3), uv = new Float32Array(NS * NV * 2);
    var wvL = new Float32Array(NS), wvR = new Float32Array(NS);
    for (var a = 0; a < NS; a++) {
      var ip = idxs[a], p = pts[ip];
      var rx = Math.cos(p.psi), rz = Math.sin(p.psi);
      var y0 = c.elev[ip];
      var wl = wvL[a] = wV(ip, -1), wr = wvR[a] = wV(ip, 1);
      for (var j = 0; j < NV; j++) {
        var side = j < NL - 1 ? -1 : j === NL - 1 ? 0 : 1;
        var k = side < 0 ? (NL - 1 - j) : side === 0 ? 0 : (j - (NL - 1));
        var w = side < 0 ? wl : wr;
        var d, dy, cc;
        if (k === 0) { d = 0; dy = 0; cc = COL.M[0]; }
        else {
          d = U.lerp(P.M.d[k], P.V.d[k], w); dy = U.lerp(P.M.y[k], P.V.y[k], w);
          var cm = COL.M[k - 1] || COL.M[COL.M.length - 1], cv = COL.V[k - 1] || COL.V[COL.V.length - 1];
          cc = [U.lerp(cm[0], cv[0], w), U.lerp(cm[1], cv[1], w), U.lerp(cm[2], cv[2], w)];
        }
        var dd = side * d;
        var o = (a * NV + j);
        pos[o * 3] = p.x + rx * dd; pos[o * 3 + 1] = y0 + dy; pos[o * 3 + 2] = p.y + rz * dd;
        // 路面の内側は白(テクスチャ色そのまま)
        var inRoad = k <= 1;
        col[o * 3] = inRoad ? 1 : cc[0]; col[o * 3 + 1] = inRoad ? 1 : cc[1]; col[o * 3 + 2] = inRoad ? 1 : cc[2];
        if (inRoad) { uv[o * 2] = (side * d / hw + 1) / 2; uv[o * 2 + 1] = p.s / 12; }
        else { uv[o * 2] = (p.x + rx * dd) * 0.06; uv[o * 2 + 1] = (p.y + rz * dd) * 0.06; }
      }
    }
    // 道路面（中心の左右 hw の範囲 = 頂点 NL-2 .. NL .. ）と その外側の地形に分ける
    var roadIdx = [], terIdx = [];
    var cL = NL - 2, cC = NL - 1, cR = NL; // 左端(k=1) 中心 右端(k=1)
    for (a = 0; a < NS - 1; a++) {
      for (j = 0; j < NV - 1; j++) {
        var v0 = a * NV + j, v1 = a * NV + j + 1, v2 = (a + 1) * NV + j + 1, v3 = (a + 1) * NV + j;
        var isRoad = (j === cL || j === cC);
        // 三角形の向き: 上向きが表になるよう並べる
        var tgt = isRoad ? roadIdx : terIdx;
        tgt.push(v0, v1, v3, v1, v2, v3);
      }
    }
    function mkGeo(index, withUV) {
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    }
    var roadTex = roadTexture(c.def.pal === 'kyudo');
    roadTex.anisotropy = 8;
    var roadMat = new T.MeshPhongMaterial({ map: roadTex, shininess: 14, specular: 0x333340 });
    var roadMesh = new T.Mesh(mkGeo(roadIdx), roadMat);
    roadMesh.receiveShadow = false; scene.add(roadMesh);
    var terMat = new T.MeshPhongMaterial({ map: terrainTexture(), vertexColors: true, shininess: 2, specular: 0x000000 });
    var terMesh = new T.Mesh(mkGeo(terIdx), terMat);
    scene.add(terMesh);
    // 路肩とのつなぎ目の面（頂点色の白を避ける）: 路面の外側 2 帯は terMesh の頂点色 (0.5~) で描かれる

    // ---- ガードレール（谷側）と反射板 ----
    var rb = new Gfx.Batch(), eb = new Gfx.Batch();
    function sampleAt(a, side) { // 帯の頂点 (side=-1/1, k=3 → ガードレール位置)
      var kk = 3;
      var j = side < 0 ? (NL - 1 - kk) : (NL - 1 + kk);
      var o = a * NV + j;
      return [pos[o * 3], pos[o * 3 + 1], pos[o * 3 + 2]];
    }
    for (a = 0; a < NS - 1; a++) {
      [-1, 1].forEach(function (side) {
        var w0 = (side < 0 ? wvL : wvR)[a], w1 = (side < 0 ? wvL : wvR)[a + 1];
        if (w0 < 0.5 || w1 < 0.5) return;
        var A = sampleAt(a, side), B = sampleAt(a + 1, side);
        // 内側（道路側）を向く面
        var qA0 = [A[0], A[1] + 0.46, A[2]], qA1 = [A[0], A[1] + 0.84, A[2]], qB0 = [B[0], B[1] + 0.46, B[2]], qB1 = [B[0], B[1] + 0.84, B[2]];
        var inward = side < 0 ? [qB0, qA0, qA1, qB1] : [qA0, qB0, qB1, qA1];
        var outward = side < 0 ? [qA0, qB0, qB1, qA1] : [qB0, qA0, qA1, qB1];
        rb.quad(inward, [0.8, 0.82, 0.88]);
        rb.quad(outward, [0.45, 0.47, 0.55]);
        rb.quad([qA1, qB1, [B[0] + 0.001, B[1] + 0.84, B[2]], [A[0] + 0.001, A[1] + 0.84, A[2]]], [0.9, 0.9, 0.95]);
        if (a % 2 === 0) {
          rb.box(A[0] - 0.06, A[1] - 0.1, A[2] - 0.06, A[0] + 0.06, A[1] + 0.84, A[2] + 0.06, '#70748a', { ao: 1 });
          if (a % 8 === 0) {
            var rp = pts[idxs[a]], rxx = Math.cos(rp.psi) * -side * 0.07, rzz = Math.sin(rp.psi) * -side * 0.07;
            eb.box(A[0] + rxx - 0.05, A[1] + 0.6, A[2] + rzz - 0.05, A[0] + rxx + 0.05, A[1] + 0.72, A[2] + rzz + 0.05, '#ffb040', { ao: 1 });
          }
        }
      });
    }
    var railMesh = rb.build(new T.MeshPhongMaterial({ vertexColors: true, shininess: 40, side: T.DoubleSide }), { cast: false });
    scene.add(railMesh);
    scene.add(eb.build(Gfx.emissive(), { cast: false }));

    // ---- 路面の装飾: 反射板・スタートとゴールのライン・ゲート ----
    var lb = new Gfx.Batch(), mb = new Gfx.Batch(), gate = new Gfx.Batch();
    function onRoad(s, d, y) { var p = C.at(c, s), e = R3.elevAt(c, s); return [p.x + Math.cos(p.psi) * d, e + (y || 0), p.y + Math.sin(p.psi) * d, p]; }
    [c.startS, c.finishS].forEach(function (s, gi) {
      // チェッカー
      var cols = Math.round(c.width / 0.5), rows = 2;
      for (var rI = 0; rI < rows; rI++) for (var cI = 0; cI < cols; cI++) {
        var d0 = -hw + cI * c.width / cols, d1 = d0 + c.width / cols;
        var s0 = s - 0.5 + rI * 0.5, s1 = s0 + 0.5;
        var a1 = onRoad(s0, d0, 0.03), a2 = onRoad(s0, d1, 0.03), a3 = onRoad(s1, d1, 0.03), a4 = onRoad(s1, d0, 0.03);
        mb.quad([a1, a2, a3, a4], ((cI + rI) & 1) ? [0.95, 0.95, 0.95] : [0.08, 0.08, 0.08]);
      }
      // ゲート（支柱 + 横断幕）
      var sg = s + 3;
      var L = onRoad(sg, -hw - 0.9, 0), Rr = onRoad(sg, hw + 0.9, 0);
      [L, Rr].forEach(function (pp) { gate.box(pp[0] - 0.15, pp[1], pp[2] - 0.15, pp[0] + 0.15, pp[1] + 5.4, pp[2] + 0.15, '#9098a8', { ao: 1 }); });
      var bannerY = 4.2;
      self['banner' + gi] = { L: L, R: Rr, y: bannerY, s: sg, text: gi === 0 ? 'START' : 'GOAL' };
    });
    scene.add(mb.build(new T.MeshLambertMaterial({ vertexColors: true }), { cast: false }));
    var gateMesh = gate.build(Gfx.vcol(), { cast: false }); scene.add(gateMesh);
    [0, 1].forEach(function (gi) {
      var bn = self['banner' + gi];
      var tex = Gfx.textTexture(bn.text, 512, 96, { bg: gi === 0 ? '#c83030' : '#2858c0', fg: '#ffffff', border: '#ffffff', shadow: '#000000' });
      var wBan = Math.sqrt(Math.pow(bn.R[0] - bn.L[0], 2) + Math.pow(bn.R[2] - bn.L[2], 2));
      var m = new T.Mesh(new T.PlaneGeometry(wBan, 1.3), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide, fog: true }));
      var cx = (bn.L[0] + bn.R[0]) / 2, cz = (bn.L[2] + bn.R[2]) / 2;
      m.position.set(cx, bn.L[1] + bn.y, cz);
      m.rotation.y = -Math.atan2(bn.R[2] - bn.L[2], bn.R[0] - bn.L[0]);
      scene.add(m);
    });

    // ---- 街灯 ----
    var lampBatch = new Gfx.Batch(), lampE = new Gfx.Batch();
    self.lamps = [];
    (c.lamps || []).forEach(function (l) {
      var s = C.locate(c, l.x, l.y, null).s, e = R3.elevAt(c, s);
      var p = C.at(c, U.clamp(s, 0, c.len));
      var side = ((l.x - p.x) * Math.cos(p.psi) + (l.y - p.y) * Math.sin(p.psi)) > 0 ? 1 : -1;
      var base = onRoad(s, side * (hw + 1.6), 0);
      var x = base[0], y = base[1], z = base[2];
      lampBatch.cyl(x, z, y, y + 6.6, 0.1, 0.07, '#686878', 6, { noTop: true });
      // 道路側へ伸びるアーム
      var ax = -Math.cos(p.psi) * side * 1.5, az = -Math.sin(p.psi) * side * 1.5;
      lampBatch.box(Math.min(x, x + ax) - 0.05, y + 6.5, Math.min(z, z + az) - 0.05, Math.max(x, x + ax) + 0.05, y + 6.6, Math.max(z, z + az) + 0.05, '#585868', { ao: 1 });
      lampE.box(x + ax - 0.35, y + 6.38, z + az - 0.2, x + ax + 0.35, y + 6.5, z + az + 0.2, '#fff4c8', { ao: 1 });
      self.lamps.push({ x: x + ax, y: y + 6.2, z: z + az, s: s });
      var gs = Gfx.glowSprite('#ffe8b0', 3.2, 0.9); gs.position.set(x + ax, y + 6.3, z + az); scene.add(gs);
      // 路面の光だまり（路面に沿った帯）
      var pb = new Gfx.Batch();
      var seg = 12;
      for (var si = -seg; si < seg; si++) {
        var sA = s + si * 1.5, sB = sA + 1.5;
        var wAr = 7.2 * Math.max(0, 1 - Math.abs(si + 0.5) / seg);
        var o1 = onRoad(sA, -hw - 0.3, 0.05), o2 = onRoad(sA, hw + 0.3, 0.05), o3 = onRoad(sB, hw + 0.3, 0.05), o4 = onRoad(sB, -hw - 0.3, 0.05);
        var k1 = Math.max(0, 1 - Math.abs(si) / seg) * 0.55, k2 = Math.max(0, 1 - Math.abs(si + 1) / seg) * 0.55;
        var c1 = [1.0 * k1, 0.9 * k1, 0.62 * k1], c2 = [1.0 * k2, 0.9 * k2, 0.62 * k2];
        pb.quad([o1, o2, o3, o4], [c1, c1, c2, c2]);
      }
      var pm = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      var pmesh = pb.build(pm, { cast: false }); pmesh.renderOrder = 3; scene.add(pmesh);
    });
    scene.add(lampBatch.build(Gfx.vcol(), { cast: false }));
    scene.add(lampE.build(Gfx.emissive(), { cast: false }));

    // ---- 木と岩（インスタンス）----
    var treeB = new Gfx.Batch(), pineB = new Gfx.Batch();
    RR.Tiles3D.treeShape(pineB, 0, 0, 7.2, 'pine', 2.4);
    treeB.cyl(0, 0, 0, 3.4, 0.22, 0.15, '#5a3a1c', 6, { noTop: true });
    treeB.sphere(0, 4.6, 0, 2.1, 1.9, 2.1, '#2c6c34', 8, 5);
    treeB.sphere(1.1, 4.0, 0.2, 1.4, 1.2, 1.4, '#388040', 6, 4);
    treeB.sphere(-1.0, 3.7, -0.3, 1.3, 1.1, 1.3, '#256030', 6, 4);
    var treeMat = new T.MeshLambertMaterial({ vertexColors: true });
    var totalTrees = Math.round(1400 * q.trees * Math.min(1.4, c.len / 1500));
    var instPine = new T.InstancedMesh(pineB.buildGeometry ? pineB.buildGeometry() : pineB.build(treeMat).geometry, treeMat, totalTrees);
    var instRound = new T.InstancedMesh(treeB.build(treeMat).geometry, treeMat, totalTrees);
    var rng = U.rng(c.len | 0), dm = new T.Matrix4(), qt = new T.Quaternion(), ps = new T.Vector3(), sc3 = new T.Vector3(), eu = new T.Euler();
    var nP = 0, nR = 0;
    function terrainY(a, side, dist) { // サンプル a の side 側、中心から dist の地面の高さ
      var w = (side < 0 ? wvL : wvR)[a];
      var dm_ = P.M.d, ym = P.M.y, dv = P.V.d, yv = P.V.y;
      var best = 0;
      for (var k = 1; k < dm_.length; k++) {
        var d0 = U.lerp(dm_[k - 1], dv[k - 1], w), d1 = U.lerp(dm_[k], dv[k], w);
        if (dist <= d1 || k === dm_.length - 1) {
          var y0 = U.lerp(ym[k - 1], yv[k - 1], w), y1 = U.lerp(ym[k], yv[k], w);
          var t = U.clamp((dist - d0) / Math.max(0.001, d1 - d0), 0, 1);
          return c.elev[idxs[a]] + y0 + (y1 - y0) * t;
        }
      }
      return c.elev[idxs[a]];
    }
    for (var tI = 0; tI < totalTrees * 1.6 && (nP < totalTrees || nR < totalTrees); tI++) {
      var ta = Math.floor(rng() * (NS - 1));
      var tside = rng() < 0.5 ? -1 : 1;
      var w2 = (tside < 0 ? wvL : wvR)[ta];
      var minD = w2 > 0.5 ? hw + 3.6 : hw + 3.4; // ガードレールと岩壁の外側
      var dist = minD + rng() * (w2 > 0.5 ? 22 : 18);
      var tp = pts[idxs[ta]];
      var tx = tp.x + Math.cos(tp.psi) * tside * dist, tz = tp.y + Math.sin(tp.psi) * tside * dist;
      // 反対側の道路に近すぎる所は避ける（ヘアピンの内側など）
      var loc = C.locate(c, tx, tz, idxs[ta]);
      if (Math.abs(loc.d) < hw + 3.0) continue;
      var ty = terrainY(ta, tside, dist);
      var kS = 0.7 + rng() * 0.7;
      var isPine = rng() < 0.6;
      if (isPine ? nP >= totalTrees : nR >= totalTrees) continue;
      eu.set(0, rng() * 6.28, 0); qt.setFromEuler(eu);
      ps.set(tx, ty - 0.2, tz); sc3.set(kS, kS * (0.85 + rng() * 0.4), kS);
      dm.compose(ps, qt, sc3);
      if (isPine) instPine.setMatrixAt(nP++, dm); else instRound.setMatrixAt(nR++, dm);
    }
    instPine.count = nP; instRound.count = nR;
    instPine.instanceMatrix.needsUpdate = instRound.instanceMatrix.needsUpdate = true;
    instPine.frustumCulled = false; instRound.frustumCulled = false;
    scene.add(instPine); scene.add(instRound);

    // ---- 空（グラデーション + 星 + 月）、遠景の山 ----
    var skyU = { top: { value: new T.Color(0x04061a) }, mid: { value: new T.Color(0x101c4c) }, hor: { value: new T.Color(0x2a3868) } };
    var skyMat = new T.ShaderMaterial({
      uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(hor, mid, smoothstep(0.0, 0.35, h)) : hor; c = mix(c, top, smoothstep(0.3, 0.9, h)); gl_FragColor = vec4(c, 1.0); }'
    });
    var sky = new T.Mesh(new T.SphereGeometry(1200, 24, 14), skyMat); sky.renderOrder = -10; scene.add(sky);
    var starGeo = new T.BufferGeometry(), sp = [];
    var srng = U.rng(5);
    for (var si2 = 0; si2 < 500; si2++) { var th = srng() * 6.283, ph2 = Math.acos(0.05 + srng() * 0.95); sp.push(Math.sin(ph2) * Math.cos(th) * 1100, Math.cos(ph2) * 1100, Math.sin(ph2) * Math.sin(th) * 1100); }
    starGeo.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    var starMat = new T.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false, depthWrite: false });
    var stars = new T.Points(starGeo, starMat); scene.add(stars);
    var moonS = Gfx.glowSprite('#cfd8ff', 140, 1.0); moonS.position.set(-500, 520, -700); scene.add(moonS);
    var sunS = Gfx.glowSprite('#ffd890', 340, 1.0); sunS.visible = dawn; scene.add(sunS);
    // 遠景の山
    var mt = new Gfx.Batch();
    var mrng = U.rng(77);
    var cxm = c.W / 2, czm = c.H / 2;
    for (var mi = 0; mi < 18; mi++) {
      var ang = mi / 18 * 6.283 + mrng() * 0.2, rad = 800 + mrng() * 120, hgt = 110 + mrng() * 150, wd = 180 + mrng() * 140;
      var mx = cxm + Math.cos(ang) * rad, mz = czm + Math.sin(ang) * rad;
      mt.cyl(mx, mz, -40, hgt, wd, wd * 0.12, '#0e1a30', 7);
    }
    var mtMat = new T.MeshBasicMaterial({ vertexColors: true, fog: true });
    var mtMesh = mt.build(mtMat, { cast: false }); mtMesh.frustumCulled = false; scene.add(mtMesh);

    // ---- 車 ----
    function carFor(d, car, isPlayer) {
      var m = RR.Cars3D.create(d.model, d.color, { dirt: d.dirt || 0 });
      m.setLights(true);
      m.root.userData.player = isPlayer;
      scene.add(m.root);
      return m;
    }
    self.pc = carFor(R.carData, R.player, true);
    if (R.rival) self.rc = carFor(R.rv.car, R.rival.car, false);

    // ---- スキッドマーク ----
    var SK = 900;
    var skPos = new Float32Array(SK * 4 * 3), skAlpha = new Float32Array(SK * 4);
    var skGeo = new T.BufferGeometry();
    skGeo.setAttribute('position', new T.BufferAttribute(skPos, 3));
    skGeo.setAttribute('a', new T.BufferAttribute(skAlpha, 1));
    var ski = [];
    for (var sk = 0; sk < SK; sk++) ski.push(sk * 4, sk * 4 + 1, sk * 4 + 2, sk * 4, sk * 4 + 2, sk * 4 + 3);
    skGeo.setIndex(ski);
    var skMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: 'attribute float a; varying float vA; void main(){ vA = a; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.02,0.02,0.03, vA * 0.7); }'
    });
    var skMesh = new T.Mesh(skGeo, skMat); skMesh.frustumCulled = false; skMesh.renderOrder = 2; scene.add(skMesh);
    var skHead = 0, skLast = {};
    self.skid = function (key, x, z, y, k) {
      var last = skLast[key];
      skLast[key] = { x: x, z: z, y: y, t: RR.Game.frame };
      if (!last || RR.Game.frame - last.t > 4) return;
      var dx = x - last.x, dz = z - last.z, l = Math.sqrt(dx * dx + dz * dz);
      if (l < 0.05 || l > 3) return;
      var nx = -dz / l * 0.14, nz = dx / l * 0.14;
      var o = skHead * 12, ao = skHead * 4;
      var yy = y + 0.045;
      skPos[o] = last.x - nx; skPos[o + 1] = yy; skPos[o + 2] = last.z - nz;
      skPos[o + 3] = last.x + nx; skPos[o + 4] = yy; skPos[o + 5] = last.z + nz;
      skPos[o + 6] = x + nx; skPos[o + 7] = yy; skPos[o + 8] = z + nz;
      skPos[o + 9] = x - nx; skPos[o + 10] = yy; skPos[o + 11] = z - nz;
      skAlpha[ao] = skAlpha[ao + 1] = skAlpha[ao + 2] = skAlpha[ao + 3] = Math.min(1, 0.4 + k * 0.5);
      skHead = (skHead + 1) % SK;
      skGeo.attributes.position.needsUpdate = true; skGeo.attributes.a.needsUpdate = true;
    };

    // ---- パーティクル（煙・土煙・火花）----
    var NP = 90;
    var smokeMat = new T.SpriteMaterial({ map: smokeTexture(), transparent: true, depthWrite: false, color: 0xcfd2e0, opacity: 0 });
    var sparkMat = new T.SpriteMaterial({ map: Gfx.glowTexture(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: 0xffc060, opacity: 0, fog: false });
    var pool = [];
    for (var pi = 0; pi < NP; pi++) { var spr = new T.Sprite(smokeMat.clone()); spr.visible = false; scene.add(spr); pool.push(spr); }
    var sparkPool = [];
    for (pi = 0; pi < 40; pi++) { var sp2 = new T.Sprite(sparkMat.clone()); sp2.visible = false; scene.add(sp2); sparkPool.push(sp2); }

    // ---- カメラ ----
    var cam = self.camera;
    var camAng = R.view.ang;
    var camPosV = new T.Vector3(), camLook = new T.Vector3();
    var camY = 2.4;
    var smoothS = 0;
    self.setSky = function (prog) {
      // 夜明け: 進行度 0..1
      var t = U.smooth(U.clamp(prog * 1.15 - 0.1, 0, 1));
      var top0 = new T.Color(0x04061a), top1 = new T.Color(0x3a5890);
      var mid0 = new T.Color(0x101c4c), mid1 = new T.Color(0xe08868);
      var hor0 = new T.Color(0x2a3868), hor1 = new T.Color(0xffc890);
      skyU.top.value.copy(top0).lerp(top1, t); skyU.mid.value.copy(mid0).lerp(mid1, t); skyU.hor.value.copy(hor0).lerp(hor1, t);
      starMat.opacity = 0.9 * (1 - t);
      moonS.material.opacity = 1 - t;
      amb.color.setRGB(U.lerp(0.16, 0.55, t), U.lerp(0.21, 0.42, t), U.lerp(0.4, 0.5, t));
      hemi.intensity = U.lerp(0.5, 0.8, t);
      moon.color.setRGB(U.lerp(0.5, 1.0, t), U.lerp(0.56, 0.82, t), U.lerp(0.85, 0.6, t)); moon.intensity = U.lerp(0.35, 0.9, t);
      scene.fog.color.copy(hor0).lerp(hor1, t).multiplyScalar(U.lerp(0.6, 1, t));
      scene.background = scene.fog.color;
      mtMat.color.setRGB(U.lerp(0.9, 1.8, t), U.lerp(0.9, 1.1, t), U.lerp(1.0, 1.0, t));
    };
    var fogDen = 0.0048 + fogAmt * 0.026;
    scene.fog = new T.FogExp2(0x2a3868, fogDen);
    scene.background = new T.Color(0x2a3868);
    if (fogAmt > 0) { skyU.mid.value.set(0x20284a); skyU.hor.value.set(0x384468); }
    self.fogBase = new T.Color(fogAmt > 0 ? 0x344060 : 0x2a3868);

    function fogSky(prog) {
      if (dawn) { self.setSky(prog); return; }
      skyU.top.value.set(0x04061a); skyU.mid.value.set(fogAmt > 0 ? 0x20284a : 0x101c4c); skyU.hor.value.set(fogAmt > 0 ? 0x384468 : 0x2a3868);
      scene.fog.color.copy(self.fogBase).multiplyScalar(0.55); scene.background = scene.fog.color;
      mtMat.color.setRGB(0.9, 0.9, 1.0);
    }
    self.camMode = function () { var m = RR.Settings.data.cam; return m == null ? 0 : m; };

    // ---- 毎フレーム ----
    var tmp = new T.Vector3();
    self.update = function (R, dt) {
      var pl = R.player, st = R.state;
      var prog = U.clamp((pl.s - c.startS) / (c.finishS - c.startS), 0, 1);
      if (R.skyProg != null) prog = R.skyProg;
      fogSky(prog);
      // 車の姿勢
      function poseCar(m, car, isP) {
        var e = R3.elevAt(c, car.s == null ? 0 : car.s);
        var slope = (R3.elevAt(c, (car.s || 0) + 2) - R3.elevAt(c, (car.s || 0) - 2)) / 4;
        m.root.position.set(car.x, e, car.y);
        m.root.rotation.y = -car.psi;
        var rollK = isP ? 0.0075 : 0.006;
        var roll = U.clamp(car.ay * rollK, -0.12, 0.12);
        var pitch = U.clamp(car.ax * 0.004, -0.06, 0.06) + Math.atan(slope) * 0.8;
        // 動く方向へ車体を傾ける: 前進方向のピッチは +（機首上げ）なので勾配は下りで負
        m.pose(roll, pitch, car.delta, car.u / 0.3, dt);
        m.setBrake(car.brk > 0.2 || (st !== 'run' && st !== 'count' && car.u < 3));
      }
      poseCar(self.pc, pl, true);
      if (self.rc) poseCar(self.rc, R.rival.car, false);
      // ヘッドライト
      function aim(light, car, m) {
        var fx = Math.sin(car.psi), fz = -Math.cos(car.psi);
        var e = m.root.position.y;
        light.position.set(car.x + fx * 1.6, e + 0.7, car.y + fz * 1.6);
        light.target.position.set(car.x + fx * 22, e - 0.5, car.y + fz * 22);
      }
      aim(headP, pl, self.pc);
      if (self.rc) aim(headR, R.rival.car, self.rc);
      // 街灯の近い2つに実ライト
      var near = self.lamps.slice().sort(function (a, b) { return Math.abs(a.s - pl.s) - Math.abs(b.s - pl.s); });
      for (var i = 0; i < lampLights.length; i++) {
        var l = near[i], pL = lampLights[i];
        if (l && Math.abs(l.s - pl.s) < 70) { pL.position.set(l.x, l.y, l.z); pL.intensity = 1.1; } else pL.intensity = 0;
      }
      // カメラ
      var beta = U.clamp(Math.atan2(pl.v, Math.max(Math.abs(pl.u), 3)), -0.7, 0.7);
      var mode = self.camMode();
      var dist = [7.6, 5.4, 10.4][mode], height = [2.75, 1.95, 4.8][mode];
      var spd = pl.speed();
      var target = pl.psi + (spd > 3 ? beta * 0.55 : 0);
      var rate = st === 'intro' ? 0 : Math.min(1, dt * 5);
      camAng += U.wrapAngle(target - camAng) * rate;
      var e0 = self.pc.root.position.y;
      smoothS += (e0 - smoothS) * Math.min(1, dt * 6);
      var fx = Math.sin(camAng), fz = -Math.cos(camAng);
      var shake = Math.min(1, spd / 40) * 0.015;
      if (R.camFn) {
        R.camFn(camPosV, camLook, cam);
      } else if (st === 'intro') {
        // 発走前の演出: 車のまわりをゆっくり回る
        var t = R.t / 60;
        var a0 = pl.psi + 2.4 + t * 0.35, rr = 6.5;
        camPosV.set(pl.x + Math.sin(a0) * rr, e0 + 1.7 + Math.sin(t * 0.8) * 0.2, pl.y - Math.cos(a0) * rr);
        camLook.set(pl.x, e0 + 0.7, pl.y);
        cam.fov = 38;
      } else if (st === 'result' || (st === 'goal' && R.t > 50)) {
        var t2 = (R.t - (st === 'goal' ? 50 : 0)) / 60;
        var a1 = pl.psi + Math.PI * 0.75 + t2 * 0.25;
        camPosV.set(pl.x + Math.sin(a1) * 7.5, e0 + 2.0, pl.y - Math.cos(a1) * 7.5);
        camLook.set(pl.x, e0 + 0.8, pl.y);
        cam.fov = 40;
      } else {
        camPosV.set(pl.x - fx * dist, smoothS + height + shake * (Math.random() - 0.5), pl.y - fz * dist);
        camLook.set(pl.x + fx * 9, smoothS + 1.0, pl.y + fz * 9);
        var fovT = [50, 56, 48][mode] + U.clamp(spd / 38, 0, 1) * 14;
        cam.fov += (fovT - cam.fov) * Math.min(1, dt * 3);
      }
      cam.position.copy(camPosV);
      cam.up.set(0, 1, 0);
      cam.lookAt(camLook);
      cam.aspect = RR.GL.aspect();
      cam.updateProjectionMatrix();
      var sunT = U.smooth(U.clamp(prog * 1.15 - 0.1, 0, 1));
      sunS.position.set(cam.position.x + 900, cam.position.y + U.lerp(-80, 230, sunT), cam.position.z - 300);
      sunS.material.opacity = Math.min(1, prog * 2.2);
      sky.position.copy(cam.position); stars.position.copy(cam.position); moonS.position.set(cam.position.x - 500, cam.position.y + 520, cam.position.z - 700);
      // スキッドマーク
      [[pl, 'p', self.pc], [R.rival && R.rival.car, 'r', self.rc]].forEach(function (pr) {
        var car = pr[0]; if (!car) return;
        var spc = car.sp, fx2 = Math.sin(car.psi), fz2 = -Math.cos(car.psi), rx2 = Math.cos(car.psi), rz2 = Math.sin(car.psi);
        var WP = [[spc.a, -spc.tw / 2], [spc.a, spc.tw / 2], [-(spc.L - spc.a), -spc.tw / 2], [-(spc.L - spc.a), spc.tw / 2]];
        var ey = R3.elevAt(c, car.s || 0);
        for (var w = 0; w < 4; w++) {
          if (car.slide[w] > 0.65 && car.speed() > 4 && car.surf[w] < 2) {
            self.skid(pr[1] + w, car.x + fx2 * WP[w][0] + rx2 * WP[w][1], car.y + fz2 * WP[w][0] + rz2 * WP[w][1], ey, car.slide[w]);
          }
        }
      });
      // パーティクル
      var parts = R.parts, ns = 0, nk = 0;
      for (i = 0; i < parts.length; i++) {
        var p = parts[i], f = p.t / p.life;
        var ey2 = R3.elevAt(c, C.locate(c, p.x, p.y, null).s);
        if (p.kind === 'spark') {
          if (nk >= sparkPool.length) continue;
          var s2 = sparkPool[nk++]; s2.visible = true; s2.position.set(p.x, ey2 + 0.3 + p.t * 1.2 - p.t * p.t * 4, p.y);
          s2.scale.setScalar(0.5 * (1 - f)); s2.material.opacity = 1 - f;
        } else {
          if (ns >= pool.length) continue;
          var s3 = pool[ns++]; s3.visible = true; s3.position.set(p.x, ey2 + 0.25 + f * 1.1, p.y);
          var r = U.lerp(p.r0 || 1, p.r1 || 3, f) * 1.1;
          s3.scale.setScalar(r);
          s3.material.opacity = (p.kind === 'dust' ? 0.35 : 0.5) * (1 - f);
          s3.material.color.set(p.kind === 'dust' ? 0x8c7a5c : 0xcdd0de);
        }
      }
      for (; ns < pool.length; ns++) pool[ns].visible = false;
      for (; nk < sparkPool.length; nk++) sparkPool[nk].visible = false;
    };
    self.render = function () { RR.GL.render(scene, cam); };
    self.dispose = function () {
      scene.traverse(function (o) { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); });
      if (self.pc) self.pc.dispose(); if (self.rc) self.rc.dispose();
    };
    return self;
  };
})();
