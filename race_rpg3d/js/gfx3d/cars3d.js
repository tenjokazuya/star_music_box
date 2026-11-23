/* 車の3Dモデル（7車種）: RR.Cars3D.create(model, color, {dirt}) -> {root, body, wheels, setBrake, setLights, ...}
 * モデルの前方は -Z、上は +Y、右は +X。単位はメートル（ホイールベース約2.4m）。
 * レースのヨー角 ψ に対しては root.rotation.y = -ψ。
 */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U, Gfx = RR.Gfx;
  var C3 = RR.Cars3D = {};

  var PAINT = {
    red: '#c82828', white: '#e4e8f0', black: '#2c2c3a', blue: '#2858c0', yellow: '#e8c030',
    green: '#30904c', silver: '#a4acbc', orange: '#e87028', purple: '#7840a8', panda: '#e4e8f0',
    navy: '#203070', pink: '#e070a0', teal: '#209898', gold: '#c8a040', brown: '#7c4c2c', ghost: '#f0f4fc'
  };
  var PAINT_NAMES = {
    red: 'レッド', white: 'ホワイト', black: 'ブラック', blue: 'ブルー', yellow: 'イエロー', green: 'グリーン',
    silver: 'シルバー', orange: 'オレンジ', purple: 'パープル', panda: 'パンダ', navy: 'ネイビー', pink: 'ピンク',
    teal: 'ティール', gold: 'ゴールド', brown: 'ブラウン', ghost: 'ゴースト'
  };
  C3.PAINT = PAINT; C3.PAINT_NAMES = PAINT_NAMES;

  // 車種ごとの形（u は前=0 → 後=1 の割合、高さはメートル）
  var SPEC = {
    comet:   { L: 4.0, W: 1.64, hood: 0.62, belt: 0.84, roof: 1.26, ws: 0.40, wst: 0.49, rt: 0.76, rb: 0.88, trunk: 0.80, popup: true },
    tsubame: { L: 3.4, W: 1.56, hood: 0.64, belt: 0.88, roof: 1.42, ws: 0.27, wst: 0.36, rt: 0.86, rb: 0.94, trunk: 0.92 },
    hayate:  { L: 4.2, W: 1.70, hood: 0.54, belt: 0.78, roof: 1.22, ws: 0.38, wst: 0.53, rt: 0.71, rb: 0.84, trunk: 0.76, popup: true, lip: true },
    sylph:   { L: 3.8, W: 1.66, hood: 0.54, belt: 0.76, roof: 1.02, ws: 0.40, wst: 0.45, rt: 0.9, rb: 0.9, trunk: 0.76, open: true },
    regulus: { L: 4.5, W: 1.72, hood: 0.70, belt: 0.92, roof: 1.40, ws: 0.31, wst: 0.41, rt: 0.69, rb: 0.80, trunk: 0.94 },
    orochi:  { L: 4.4, W: 1.82, hood: 0.50, belt: 0.72, roof: 1.14, ws: 0.47, wst: 0.58, rt: 0.76, rb: 0.86, trunk: 0.74, wing: 'gt' },
    raiden:  { L: 4.3, W: 1.76, hood: 0.66, belt: 0.90, roof: 1.38, ws: 0.33, wst: 0.43, rt: 0.69, rb: 0.79, trunk: 0.92, wing: 'big', scoop: true }
  };
  C3.SPEC = SPEC;

  // ---------- 環境マップ（夜の空の反射） ----------
  var env = null;
  C3.envMap = function () {
    if (env) return env;
    var faces = [];
    function face(kind) {
      var c = U.canvas(64, 64, true), g = c.g;
      var gr = g.createLinearGradient(0, 0, 0, 64);
      if (kind === 'top') { gr.addColorStop(0, '#202c58'); gr.addColorStop(1, '#2c3c70'); }
      else if (kind === 'bottom') { gr.addColorStop(0, '#0a0a12'); gr.addColorStop(1, '#14141c'); }
      else { gr.addColorStop(0, '#26356a'); gr.addColorStop(0.5, '#6878a8'); gr.addColorStop(0.52, '#222633'); gr.addColorStop(1, '#0c0e16'); }
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      if (kind === 'side') {
        g.fillStyle = '#fff4c8'; g.globalAlpha = 0.9;
        for (var i = 0; i < 3; i++) { g.beginPath(); g.arc(10 + i * 22, 34, 2.4, 0, 7); g.fill(); }
        g.globalAlpha = 1;
      }
      return c;
    }
    faces = [face('side'), face('side'), face('top'), face('bottom'), face('side'), face('side')];
    env = new T.CubeTexture(faces);
    env.needsUpdate = true;
    return env;
  };

  // ---------- 形状の補助 ----------
  function C(c) { return Gfx.rgb(c); }
  function mul(c, k) { var a = C(c); return [a[0] * k, a[1] * k, a[2] * k]; }
  // 断面を並べた立体。secs: {z, y0, y1, w0, w1}（前から後ろ）。colors: {top, side, bottom, front, back} は面ごと（関数 i→色 も可）
  function loft(b, secs, col) {
    function pick(k, i) { var v = col[k]; return typeof v === 'function' ? v(i) : v; }
    for (var i = 0; i < secs.length - 1; i++) {
      var A = secs[i], B = secs[i + 1];
      var top = pick('top', i), side = pick('side', i);
      // 上面
      b.quad([[-B.w1, B.y1, B.z], [B.w1, B.y1, B.z], [A.w1, A.y1, A.z], [-A.w1, A.y1, A.z]], top);
      // 右面 / 左面
      b.quad([[B.w0, B.y0, B.z], [A.w0, A.y0, A.z], [A.w1, A.y1, A.z], [B.w1, B.y1, B.z]], [mul(side, 0.8), mul(side, 0.8), mul(side, 1), mul(side, 1)]);
      b.quad([[-A.w0, A.y0, A.z], [-B.w0, B.y0, B.z], [-B.w1, B.y1, B.z], [-A.w1, A.y1, A.z]], [mul(side, 0.8), mul(side, 0.8), mul(side, 1), mul(side, 1)]);
    }
    var F0 = secs[0], R0 = secs[secs.length - 1];
    b.quad([[F0.w0, F0.y0, F0.z], [-F0.w0, F0.y0, F0.z], [-F0.w1, F0.y1, F0.z], [F0.w1, F0.y1, F0.z]], pick('front', 0));
    b.quad([[-R0.w0, R0.y0, R0.z], [R0.w0, R0.y0, R0.z], [R0.w1, R0.y1, R0.z], [-R0.w1, R0.y1, R0.z]], pick('back', 0));
  }
  function smooth(t) { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  var wheelGeo = null, rimGeo = null;
  function geos() {
    if (!wheelGeo) {
      wheelGeo = new T.CylinderGeometry(0.3, 0.3, 0.21, 20).rotateZ(Math.PI / 2);
      wheelGeo.userData.keep = true;
      rimGeo = new T.CylinderGeometry(0.205, 0.205, 0.225, 12).rotateZ(Math.PI / 2);
      rimGeo.userData.keep = true;
    }
  }
  var tireMat = null, rimMat = null, glassMat = null, blackMat = null;
  function mats() {
    if (tireMat) return;
    tireMat = new T.MeshStandardMaterial({ color: 0x15151a, roughness: 0.9, metalness: 0 });
    rimMat = new T.MeshStandardMaterial({ color: 0xc8ccd8, roughness: 0.3, metalness: 0.8, envMap: C3.envMap(), envMapIntensity: 0.9 });
    glassMat = new T.MeshStandardMaterial({ color: 0x0c1424, roughness: 0.08, metalness: 0.7, envMap: C3.envMap(), envMapIntensity: 1.1 });
    blackMat = new T.MeshStandardMaterial({ color: 0x18181e, roughness: 0.6, metalness: 0.2 });
  }

  // ---------- 生成 ----------
  C3.create = function (model, color, opt) {
    opt = opt || {};
    geos(); mats();
    var sp = SPEC[model] || SPEC.comet;
    var base = PAINT[color] || color || PAINT.red;
    var dirt = U.clamp((opt.dirt || 0) / 100, 0, 1);
    if (dirt > 0) base = U.mix(base, '#6c5a44', dirt * 0.55);
    var panda = color === 'panda';
    var dark = panda ? '#16161c' : U.shade(base, -0.55);
    var trim = '#16161c';
    var L = sp.L, W = sp.W, hw = W / 2;
    var root = new T.Group(), body = new T.Group();
    root.add(body);
    var z0 = -L / 2;
    function zu(u) { return z0 + L * u; }
    var gnd = 0.2;

    // ---- 車体（下半身） ----
    var bb = new Gfx.Batch();
    var secs = [];
    function addSec(u, y1, wk, lower) {
      secs.push({ z: zu(u), y0: lower == null ? gnd : lower, y1: y1, w0: hw * wk, w1: hw * wk * 0.93 });
    }
    addSec(0, sp.hood - 0.16, 0.86, gnd + 0.08);
    addSec(0.025, sp.hood - 0.04, 0.95);
    addSec(0.09, sp.hood, 1.0);
    addSec(sp.ws - 0.02, sp.hood + (sp.belt - sp.hood) * 0.8, 1.0);
    addSec(sp.ws, sp.belt, 1.0);
    if (sp.open) {
      addSec(sp.ws + 0.04, sp.belt - 0.14, 1.0);
      addSec(sp.rb - 0.06, sp.belt - 0.14, 1.0);
      addSec(sp.rb - 0.02, sp.belt, 1.0);
    } else addSec(sp.rb, sp.belt, 1.0);
    addSec(sp.rb + (1 - sp.rb) * 0.55, sp.trunk, 1.0);
    addSec(0.975, sp.trunk - 0.02, 0.96);
    addSec(1, sp.trunk - 0.14, 0.9, gnd + 0.06);
    var cockpit = sp.open ? sp.ws + 0.04 : -1;
    loft(bb, secs, {
      top: function (i) {
        if (panda && (i <= 2 || i >= secs.length - 3)) return panda ? C('#e4e8f0') : C(base);
        if (sp.open && secs[i].z > zu(cockpit) - 0.01 && secs[i + 1].z < zu(sp.rb - 0.05) + 0.01) return C('#1c1c24');
        return C(base);
      },
      side: function (i) { return panda ? C('#16161c') : C(base); },
      front: C(base), back: C(base)
    });
    // バンパー（黒い樹脂）
    bb.box(-hw * 0.86, gnd, zu(0) - 0.05, hw * 0.86, gnd + 0.16, zu(0.05), { all: trim, top: '#22222a' }, { ao: 1 });
    bb.box(-hw * 0.92, gnd, zu(0.96), hw * 0.92, gnd + 0.15, zu(1) + 0.05, { all: trim, top: '#22222a' }, { ao: 1 });
    // フロントグリル
    bb.box(-hw * 0.4, gnd + 0.2, zu(0) - 0.03, hw * 0.4, gnd + 0.38, zu(0.03), { all: '#0c0c12' }, { ao: 1 });
    // ドアの線とミラー、ナンバー
    [-1, 1].forEach(function (s) {
      var x = s * (hw + 0.004);
      bb.box(s > 0 ? x : x - 0.01, gnd + 0.14, zu(sp.ws + 0.02), s > 0 ? x + 0.01 : x, sp.belt - 0.04, zu(sp.ws + 0.022), '#0a0a10', { ao: 1 });
      bb.box(s > 0 ? x : x - 0.01, gnd + 0.14, zu(sp.rb - 0.04), s > 0 ? x + 0.01 : x, sp.belt - 0.04, zu(sp.rb - 0.038), '#0a0a10', { ao: 1 });
      // サイドミラー
      var mx = s * (hw * 0.93);
      bb.box(mx - 0.1, sp.belt + 0.02, zu(sp.ws + 0.02), mx + 0.1, sp.belt + 0.14, zu(sp.ws + 0.045), base, { ao: 1 });
    });
    bb.box(-0.26, gnd + 0.14, zu(1) + 0.0, 0.26, gnd + 0.28, zu(1) + 0.02, '#e8e8f0', { ao: 1 });
    // ボンネットのダクト（レイデン）
    if (sp.scoop) bb.box(-hw * 0.28, sp.hood, zu(0.18), hw * 0.28, sp.hood + 0.1, zu(0.34), { all: trim, top: '#20202a' }, { ao: 1 });
    // ---- キャビン ----
    var cab = new Gfx.Batch();
    var roofY = sp.roof, bY = sp.belt;
    if (sp.open) {
      // ウインドシールドの枠のみ
      cab.box(-hw * 0.84, bY, zu(sp.ws), hw * 0.84, bY + 0.26, zu(sp.ws + 0.012), '#0c1424', { ao: 1 });
      cab.box(-hw * 0.88, bY + 0.24, zu(sp.ws - 0.01), hw * 0.88, bY + 0.28, zu(sp.ws + 0.02), base, { ao: 1 });
      // シート
      [-0.4, 0.4].forEach(function (x) {
        cab.box(x - 0.24, bY - 0.18, zu(sp.ws + 0.2), x + 0.24, bY + 0.02, zu(sp.ws + 0.3), '#20202c', { ao: 1 });
        cab.box(x - 0.22, bY - 0.1, zu(sp.ws + 0.3), x + 0.22, bY + 0.46, zu(sp.ws + 0.33), '#2c2c3a', { ao: 1 });
      });
    } else {
      var cs = [
        { z: zu(sp.ws), y0: bY, y1: bY + 0.02, w0: hw * 0.9, w1: hw * 0.84 },
        { z: zu(sp.wst), y0: bY, y1: roofY, w0: hw * 0.9, w1: hw * 0.72 },
        { z: zu(sp.rt), y0: bY, y1: roofY, w0: hw * 0.9, w1: hw * 0.72 },
        { z: zu(sp.rb), y0: bY, y1: bY + 0.04, w0: hw * 0.9, w1: hw * 0.82 }
      ];
      loft(cab, cs, {
        top: function (i) { return i === 1 ? C(base) : C('#0c1424'); },
        side: function (i) { return i === 2 ? C(base) : C('#0e1626'); },
        front: C('#0c1424'), back: C('#0c1424')
      });
      // 屋根のパンダ配色
      if (panda) cab.box(-hw * 0.7, roofY, zu(sp.wst), hw * 0.7, roofY + 0.02, zu(sp.rt), '#e4e8f0', { ao: 1 });
    }
    // ---- スポイラー ----
    var sb = new Gfx.Batch();
    if (sp.wing) {
      var big = sp.wing === 'big';
      var wy = sp.trunk + (big ? 0.42 : 0.3), wz = zu(1) - 0.3;
      sb.box(-hw * 0.9, wy, wz - 0.16, hw * 0.9, wy + 0.05, wz + 0.16, { all: trim, top: '#20202a' }, { ao: 1 });
      [-0.55, 0.55].forEach(function (x) { sb.box(x * hw - 0.03, sp.trunk - 0.04, wz - 0.03, x * hw + 0.03, wy, wz + 0.03, trim, { ao: 1 }); });
      sb.box(-hw * 0.92, wy - 0.02, wz - 0.17, -hw * 0.9, wy + 0.14, wz + 0.17, trim, { ao: 1 });
      sb.box(hw * 0.9, wy - 0.02, wz - 0.17, hw * 0.92, wy + 0.14, wz + 0.17, trim, { ao: 1 });
    }
    if (sp.lip) sb.box(-hw * 0.8, sp.trunk, zu(1) - 0.16, hw * 0.8, sp.trunk + 0.07, zu(1) - 0.04, { all: base, top: base }, { ao: 1 });

    var bodyMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.45, envMap: C3.envMap(), envMapIntensity: 1.0 });
    var bodyMesh = bb.build(bodyMat);
    body.add(bodyMesh);
    var cabMesh = cab.build(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.14, metalness: 0.6, envMap: C3.envMap(), envMapIntensity: 1.15 }));
    body.add(cabMesh);
    if (!sb.empty()) body.add(sb.build(bodyMat));

    // ---- ライト ----
    var headMat = new T.MeshBasicMaterial({ color: 0x5c5848 });
    var tailMat = new T.MeshBasicMaterial({ color: 0x5a0e0e });
    var hz = zu(0.0) - 0.04;
    [-1, 1].forEach(function (s) {
      var h;
      if (sp.popup) {
        h = new T.Mesh(new T.BoxGeometry(0.34, 0.14, 0.16), headMat);
        h.position.set(s * hw * 0.62, sp.hood + 0.05, zu(0.12));
        var housing = new T.Mesh(new T.BoxGeometry(0.4, 0.06, 0.22), blackMat);
        housing.position.set(s * hw * 0.62, sp.hood + 0.0, zu(0.12));
        body.add(housing);
      } else {
        h = new T.Mesh(new T.BoxGeometry(0.4, 0.13, 0.08), headMat);
        h.position.set(s * hw * 0.68, sp.hood - 0.1, hz);
      }
      body.add(h);
      var t = new T.Mesh(new T.BoxGeometry(0.42, 0.1, 0.06), tailMat);
      t.position.set(s * hw * 0.68, sp.trunk - 0.12, zu(1) + 0.03);
      body.add(t);
    });
    var tbar = new T.Mesh(new T.BoxGeometry(hw * 0.7, 0.04, 0.05), tailMat);
    tbar.position.set(0, sp.trunk - 0.12, zu(1) + 0.03);
    body.add(tbar);
    body.userData.headMat = headMat; body.userData.tailMat = tailMat;

    // ---- ホイール ----
    var wheels = [];
    var axF = -1.19, axR = 1.21, track = hw - 0.06;
    var pos = [[-track, axF], [track, axF], [-track, axR], [track, axR]];
    pos.forEach(function (p, i) {
      var steer = new T.Group();
      steer.position.set(p[0], 0.3, p[1]);
      var spin = new T.Group();
      var tire = new T.Mesh(wheelGeo, tireMat);
      var rim = new T.Mesh(rimGeo, rimMat);
      rim.position.x = p[0] < 0 ? -0.006 : 0.006;
      spin.add(tire); spin.add(rim);
      // スポーク
      for (var k = 0; k < 5; k++) {
        var sk = new T.Mesh(new T.BoxGeometry(0.235, 0.04, 0.34), rimMat);
        sk.rotation.x = k / 5 * Math.PI;
        sk.position.x = p[0] < 0 ? -0.006 : 0.006;
        spin.add(sk);
      }
      steer.add(spin);
      root.add(steer);
      wheels.push({ steer: steer, spin: spin });
    });

    var obj = {
      root: root, body: body, wheels: wheels, spec: sp, model: model,
      bodyMat: bodyMat, headMat: headMat, tailMat: tailMat,
      setBrake: function (on) { tailMat.color.setHex(on ? 0xff2a1a : 0x5a0e0e); },
      setLights: function (on) { headMat.color.setHex(on ? 0xfff2c0 : 0x5c5848); if (!on) tailMat.color.setHex(0x3a0808); },
      // 走行の見た目: 車体のロール/ピッチ、操舵、ホイール回転
      pose: function (roll, pitch, steer, spinRate, dt) {
        body.rotation.z = roll; body.rotation.x = pitch;
        wheels[0].steer.rotation.y = wheels[1].steer.rotation.y = -steer;
        for (var i = 0; i < 4; i++) wheels[i].spin.rotation.x += spinRate * dt;
      },
      dispose: function () {
        bodyMesh.geometry.dispose(); cabMesh.geometry.dispose(); bodyMat.dispose();
      }
    };
    root.userData.car = obj;
    root.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
    return obj;
  };

  // ---------- 撮影（メニュー用の2D画像） ----------
  var snapCache = {};
  // view: 'side'（真横、前が右）/ 'three'（斜め前）/ 'top'（真上、前が上）
  C3.snapshot = function (model, color, dirt, view, w, h) {
    view = view || 'three'; w = w || 192; h = h || 96;
    var key = [model, color, Math.round((dirt || 0) / 20), view, w, h].join(':');
    if (snapCache[key]) return snapCache[key];
    var sc = new T.Scene();
    var car = C3.create(model, color, { dirt: dirt });
    car.setLights(true);
    sc.add(car.root);
    sc.add(new T.HemisphereLight(0xc8d8ff, 0x303040, 0.9));
    var dl = new T.DirectionalLight(0xffffff, 0.9); dl.position.set(-3, 5, 4); sc.add(dl);
    var cam;
    var L = car.spec.L;
    if (view === 'top') {
      cam = new T.OrthographicCamera(-L * 0.35, L * 0.35, L * 0.55 * (h / w) * (w / h) * 1.0, -L * 0.55, 0.1, 30);
      cam.left = -2.0 * (w / h) * 0.5; cam.right = 2.0 * (w / h) * 0.5; cam.top = 2.9; cam.bottom = -2.9;
      cam.position.set(0, 10, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
    } else if (view === 'side') {
      var vh = L * 0.5 * (h / w) * 2;
      cam = new T.OrthographicCamera(-L * 0.58, L * 0.58, vh / 2 + 0.25, -vh / 2 + 0.25, 0.1, 30);
      cam.position.set(10, 0.7, 0); cam.lookAt(0, 0.7, 0);
      car.root.rotation.y = Math.PI; // 前を右に
    } else if (view.indexOf('spin') === 0) {
      // 回転展示: spin<k> は k/16 周ぶん回った角度から見る
      var ang = (parseInt(view.slice(4), 10) || 0) / 16 * Math.PI * 2 + 0.6;
      cam = new T.PerspectiveCamera(26, w / h, 0.1, 40);
      cam.position.set(Math.sin(ang) * 5.6, 1.9, Math.cos(ang) * 5.6); cam.lookAt(0, 0.55, 0);
    } else {
      cam = new T.PerspectiveCamera(28, w / h, 0.1, 40);
      cam.position.set(-4.3, 1.8, -4.6); cam.lookAt(0, 0.5, 0);
    }
    var cv = RR.GL.snapshot(sc, cam, w, h);
    car.dispose();
    snapCache[key] = cv;
    return cv;
  };
})();
