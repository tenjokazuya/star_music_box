/* Field3D: フィールド（町・屋内・峠みち）の3D表示。論理は RR.Field（16pxグリッド）、ここは見た目だけ
 * RR.Field3D.setMap(map) / sync() / render()
 */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U, Gfx = RR.Gfx;
  var F3 = RR.Field3D = {
    scene: null, camera: null, world: null, models: [], fades: [], lights: [], anim: [], map: null,
    cam: { x: 0, z: 0 }, shake: 0, zoom: 1, dist: 12, pitch: 0.95
  };

  var camera = new T.PerspectiveCamera(32, 16 / 9, 0.1, 140);
  F3.camera = camera;
  var scene = F3.scene = new T.Scene();

  // ライト（常設。マップごとに色を変える）
  var amb = new T.AmbientLight(0xffffff, 0.9); scene.add(amb);
  var hemi = new T.HemisphereLight(0x8090d0, 0x302838, 0.35); scene.add(hemi);
  var sun = new T.DirectionalLight(0xaabaff, 0.45); sun.position.set(-8, 14, 10); scene.add(sun); scene.add(sun.target);
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 50; sun.shadow.bias = -0.0006;
  var points = [];
  for (var i = 0; i < 4; i++) { var pl = new T.PointLight(0xffe0a0, 0, 6, 1.2); pl.visible = false; scene.add(pl); points.push(pl); }
  var playerLight = new T.PointLight(0x8890c0, 0.0, 5, 1.4); scene.add(playerLight);

  var worldGroup = new T.Group(); scene.add(worldGroup);
  var actorGroup = new T.Group(); scene.add(actorGroup);
  var tilesObj = null;
  var curKey = '';

  function disposeWorld() {
    while (worldGroup.children.length) {
      var c = worldGroup.children.pop();
      Gfx.dispose(c);
    }
    if (tilesObj) { tilesObj.dispose(); tilesObj = null; }
  }

  F3.clearActors = function () {
    F3.models.forEach(function (m) { actorGroup.remove(m.root); if (m.api && m.api.dispose) m.api.dispose(); else Gfx.dispose(m.root); });
    F3.models = [];
  };

  // ---------- マップの構築 ----------
  F3.setMap = function (map) {
    disposeWorld();
    F3.clearActors();
    F3.map = map;
    F3.fades = []; F3.lights = []; F3.anim = []; F3.dynCars = [];
    var indoor = map.amb === 'indoor' || !map.amb;
    map.indoor = indoor;
    // ---- 地形 ----
    tilesObj = RR.Tiles3D.build(map);
    worldGroup.add(tilesObj.group);
    // ---- 配置物 ----
    var ctx = RR.Props3D.makeCtx(map);
    map.props.forEach(function (p) {
      try { RR.Props3D.build(p, ctx); } catch (e) { RR.reportError(e); }
    });
    // マップ側の明示的な光（屋内の天井灯など）
    (map.lights || []).forEach(function (l) {
      var x = l.x / 16, z = l.y / 16, r = l.r / 16;
      ctx.pool(x, z, r * 1.2, l.c || '#f8e0a0', indoor ? 0.55 : 0.6);
      ctx.light(x, indoor ? 2.0 : 1.8, z, l.c || '#f8e0a0', Math.max(3, r * 2.4), { real: true, flicker: l.flicker });
    });
    ctx.finish(worldGroup);
    F3.fades = ctx.fades; F3.lights = ctx.lights; F3.dyn = ctx.dynamic;
    // ---- 動的な車（自分の愛車） ----
    F3.dynCars = [];
    ctx.dynamic.forEach(function (d) { F3.dynCars.push({ d: d, key: '', car: null }); });
    // ---- 空気 ----
    var ambient = map.ambient || (indoor ? '#d8d8e0' : '#4a5488');
    var bg = indoor ? '#0a0a12' : '#080c20';
    scene.background = Gfx.color(bg);
    scene.fog = indoor ? null : new T.FogExp2(Gfx.color(bg), 0.014);
    amb.color.copy(Gfx.color(ambient)); amb.intensity = indoor ? 0.85 : 1.12;
    hemi.color.copy(Gfx.color(indoor ? '#fff4e0' : '#6a7cc8')); hemi.groundColor.copy(Gfx.color(indoor ? '#605040' : '#282038')); hemi.intensity = indoor ? 0.35 : 0.4;
    sun.color.copy(Gfx.color(indoor ? '#fff0d8' : '#98a8ff')); sun.intensity = indoor ? 0.42 : 0.5;
    var q = RR.GL.q();
    sun.castShadow = q.shadow && !indoor;
    sun.shadow.mapSize.set(q.shadowSize || 1024, q.shadowSize || 1024);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    playerLight.intensity = indoor ? 0 : 0.5;
    points.forEach(function (p, i) { p.visible = i < q.lights; });
    F3.snapCam();
  };

  // ---------- アクター（人物・NPC・車）----------
  function modelFor(a) {
    var def = a.def || {};
    if (def.model === 'bus') return { root: RR.Props3D.makeBus(), kind: 'bus' };
    if (!a.look) return null;
    var api = RR.People3D.create(a.look);
    api.face(a.dir, true);
    return { root: api.root, api: api, kind: 'person' };
  }
  F3.sync = function (actors, player) {
    var list = [player].concat(actors);
    var i, m;
    // 消えたものを外す
    for (i = F3.models.length - 1; i >= 0; i--) {
      m = F3.models[i];
      if (list.indexOf(m.actor) < 0 || m.look !== m.actor.look) {
        actorGroup.remove(m.root); if (m.api && m.api.dispose) m.api.dispose(); else Gfx.dispose(m.root);
        F3.models.splice(i, 1);
      }
    }
    // 増えたものを作る
    list.forEach(function (a) {
      if (!a) return;
      for (var k = 0; k < F3.models.length; k++) if (F3.models[k].actor === a) return;
      var mm = modelFor(a);
      if (!mm) return;
      mm.actor = a; mm.look = a.look; mm.emoteSpr = null; mm.emoteCh = null;
      actorGroup.add(mm.root);
      F3.models.push(mm);
    });
  };

  var yawTmp = 0;
  F3.updateActors = function (dt) {
    F3.models.forEach(function (m) {
      var a = m.actor;
      m.root.visible = !!a.visible;
      if (!a.visible) return;
      var x = a.px / 16 + 0.5, z = a.py / 16 + 0.5;
      if (m.kind === 'bus') { m.root.position.set(x, 0, z); return; }
      m.root.position.set(x, 0, z);
      m.api.face(a.dir);
      m.api.walk(dt, a.moving, a.speed || 1);
      // 吹き出し
      var e = a.emote;
      if (e) {
        if (m.emoteCh !== e.ch) {
          if (m.emoteSpr) m.root.remove(m.emoteSpr);
          m.emoteSpr = RR.People3D.emoteSprite(e.ch); m.emoteCh = e.ch;
          m.root.add(m.emoteSpr);
        }
        var pop = e.t > e.max - 6 ? (e.max - e.t) / 6 : 1;
        m.emoteSpr.position.set(0, (m.api.kid ? 1.6 : 1.85) + (1 - pop) * 0.2, 0);
        m.emoteSpr.scale.setScalar(0.8 * (0.5 + 0.5 * pop));
        m.emoteSpr.visible = true;
        m.root.rotation.y = m.api.yaw;
      } else if (m.emoteSpr) { m.emoteSpr.visible = false; m.emoteCh = null; }
    });
    // 自分の車（ガレージの前など）
    var car = RR.Data && RR.Data.currentCar ? RR.Data.currentCar() : null;
    F3.dynCars.forEach(function (dc) {
      if (!car) return;
      var key = car.model + ':' + car.color + ':' + Math.round((car.dirt || 0) / 20);
      if (dc.key !== key) {
        if (dc.car) { worldGroup.remove(dc.car.root); Gfx.dispose(dc.car.root); }
        dc.car = RR.Cars3D.create(car.model, car.color, { dirt: car.dirt });
        dc.car.setLights(false);
        var p = dc.d.prop;
        dc.car.root.scale.setScalar(0.46);
        var h = p.dir === 'h';
        dc.car.root.position.set(h ? dc.d.X + 1 : dc.d.X + 0.5, 0, h ? dc.d.Z + 0.5 : dc.d.Z + 1);
        dc.car.root.rotation.y = h ? (p.flip ? -Math.PI / 2 : Math.PI / 2) : (p.flip ? Math.PI : 0);
        worldGroup.add(dc.car.root);
        dc.key = key;
      }
    });
  };

  // ---------- カメラ ----------
  F3.snapCam = function () {
    var f = RR.Field;
    if (!f || !f.player) return;
    var c = F3.camGoal();
    F3.cam.x = c.x; F3.cam.z = c.z;
  };
  F3.camGoal = function () {
    var f = RR.Field, m = F3.map, p = f.player;
    var tx, tz;
    if (f.camTarget) { tx = f.camTarget.x; tz = f.camTarget.z; }
    else { tx = p.px / 16 + 0.5; tz = p.py / 16 + 0.5; }
    var asp = RR.GL.aspect();
    var hw = Math.max(3, Math.min(7.2, 7.2 * Math.min(1, asp / 1.7))), hh = 4.2;
    if (m.w <= hw * 2) tx = m.w / 2; else tx = U.clamp(tx, hw, m.w - hw);
    if (m.h <= hh * 2) tz = m.h / 2 + 0.6; else tz = U.clamp(tz, hh, m.h - hh - 0.6);
    return { x: tx, z: tz };
  };
  var tmpV = new T.Vector3(), camPos = new T.Vector3();
  function placeCamera(dt) {
    var f = RR.Field;
    var asp = RR.GL.aspect();
    camera.aspect = asp;
    // 横に約13タイル見える距離
    var hfovT = Math.tan(camera.fov * Math.PI / 360) * asp;
    var want = U.clamp((asp >= 1 ? 13 : 9.5) / (2 * hfovT), 9, 26);
    if (F3.map && F3.map.indoor) want *= 0.9;
    F3.dist += (want * F3.zoom - F3.dist) * Math.min(1, dt * 4);
    var d = F3.dist, el = F3.pitch;
    var tx = F3.cam.x, tz = F3.cam.z;
    camPos.set(tx, 0.4 + Math.sin(el) * d, tz + Math.cos(el) * d);
    // 画面ゆれ
    var sk = RR.FX.shakeT > 0 ? RR.FX.shakeMag * 0.015 : 0;
    camera.position.copy(camPos);
    if (sk) camera.position.add(tmpV.set((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk, 0));
    camera.lookAt(tx, 0.4, tz);
    camera.updateProjectionMatrix();
  }

  // 遮蔽物の半透明化（カメラとプレイヤーの間にある建物・木）
  var ray = new T.Ray(), box = new T.Box3(), hit = new T.Vector3(), dirV = new T.Vector3(), headV = new T.Vector3();
  function fadeOccluders(dt) {
    var p = RR.Field.player;
    headV.set(p.px / 16 + 0.5, 0.8, p.py / 16 + 0.5);
    dirV.copy(headV).sub(camera.position);
    var dist = dirV.length();
    dirV.normalize();
    ray.set(camera.position, dirV);
    F3.fades.forEach(function (f) {
      var b = f.bounds;
      box.min.set(b.x0, 0, b.z0); box.max.set(b.x1, b.h, b.z1);
      var h = ray.intersectBox(box, hit);
      var occl = h && hit.distanceTo(camera.position) < dist - 0.2;
      var goal = occl ? 0.22 : 1;
      f.a += (goal - f.a) * Math.min(1, dt * 9);
      var on = f.a < 0.985;
      for (var i = 0; i < f.mats.length; i++) {
        var m = f.mats[i];
        if (m.opacity !== f.a) { m.opacity = f.a; }
        if (m.transparent !== on) { m.transparent = on; m.depthWrite = !on; m.needsUpdate = true; }
      }
    });
  }

  // 近くの光源を実際のポイントライトに割り当てる
  var cand = [];
  function assignLights(frame, px, pz) {
    cand.length = 0;
    F3.lights.forEach(function (l) {
      if (!l.real) return;
      var dx = l.x - px, dz = l.z - pz;
      l.d2 = dx * dx + dz * dz;
      cand.push(l);
    });
    cand.sort(function (a, b) { return a.d2 - b.d2; });
    var q = RR.GL.q();
    for (var i = 0; i < points.length; i++) {
      var pl = points[i];
      if (i >= q.lights || i >= cand.length) { pl.intensity = 0; continue; }
      var l = cand[i];
      pl.position.set(l.x, l.y, l.z);
      pl.color.copy(Gfx.color(l.color));
      pl.distance = l.dist;
      var fl = 1;
      if (l.flicker && ((frame + i * 13) % 97) < 3) fl = 0.3;
      pl.intensity = (F3.map.indoor ? 1.0 : 1.35) * fl;
    }
    playerLight.position.set(px, 1.6, pz + 0.4);
  }

  F3.render = function () {
    var f = RR.Field;
    if (!F3.map || !f.player) return;
    var dt = 1 / 60;
    // カメラの追従
    var g = F3.camGoal();
    var sp = f.camTarget ? (f.camTarget.speed || 2) * 0.03 : 0.2;
    F3.cam.x += (g.x - F3.cam.x) * Math.min(1, f.camTarget ? sp : 0.18);
    F3.cam.z += (g.z - F3.cam.z) * Math.min(1, f.camTarget ? sp : 0.18);
    // 会話中は少し寄る
    var zt = (f.zoomTarget || 1) * (f.running > 0 && RR.UI.busy() ? 0.9 : 1);
    F3.zoom += (zt - F3.zoom) * 0.06;
    F3.sync(f.actors, f.player);
    F3.updateActors(dt);
    placeCamera(dt);
    fadeOccluders(dt);
    assignLights(f.frame, f.player.px / 16 + 0.5, f.player.py / 16 + 0.5);
    if (tilesObj) tilesObj.update(f.frame);
    // 影を追従させる
    var px = f.player.px / 16 + 0.5, pz = f.player.py / 16 + 0.5;
    sun.position.set(px - 8, 15, pz + 10); sun.target.position.set(px, 0, pz);
    RR.GL.render(scene, camera);
  };
  F3.camTargetFixed = function () { return F3.cam; };
  // 3D の座標を UI の論理座標（基準領域の座標系）へ投影する
  var pv = new T.Vector3();
  F3.project = function (x, y, z) {
    pv.set(x, y, z).project(camera);
    return { x: (pv.x * 0.5 + 0.5) * RR.VW - RR.OX, y: (-pv.y * 0.5 + 0.5) * RR.VH - RR.OY };
  };
  // 自由カメラで町を映す（デモ・エンディング用）
  F3.renderFree = function (tx, tz, dist, el, fov, frame) {
    if (!F3.map) return;
    camera.aspect = RR.GL.aspect();
    camera.fov = fov || 32;
    camera.position.set(tx, 0.4 + Math.sin(el) * dist, tz + Math.cos(el) * dist);
    camera.lookAt(tx, 0.4, tz);
    camera.updateProjectionMatrix();
    assignLights(frame || 0, tx, tz);
    if (tilesObj) tilesObj.update(frame || 0);
    sun.position.set(tx - 8, 15, tz + 10); sun.target.position.set(tx, 0, tz);
    F3.models.forEach(function (m) { m.root.visible = false; });
    RR.GL.render(scene, camera);
  };

  // バスのモデル
  RR.Props3D.makeBus = function () {
    var g = new T.Group();
    var b = new Gfx.Batch();
    var body = '#e8e8ec', stripe = '#3868c0';
    b.box(-0.55, 0.18, -2.0, 0.55, 1.75, 2.0, { all: body, top: '#f4f4f8' }, { ao: 0.85 });
    b.box(-0.56, 0.5, -1.99, 0.56, 0.78, 1.99, stripe, { ao: 1 });
    for (var i = 0; i < 4; i++) { b.box(-0.565, 1.0, -1.7 + i * 0.85, -0.55, 1.5, -1.0 + i * 0.85 - 0.05, '#2a3c58', { ao: 1 }); b.box(0.55, 1.0, -1.7 + i * 0.85, 0.565, 1.5, -1.0 + i * 0.85 - 0.05, '#2a3c58', { ag: 1, ao: 1 }); }
    b.box(-0.5, 1.0, -2.01, 0.5, 1.55, -1.99, '#2a3c58', { ao: 1 });
    var m = b.build(Gfx.vcol(), { cast: true }); g.add(m);
    var e = new Gfx.Batch();
    e.box(-0.45, 0.45, -2.02, -0.25, 0.6, -2.0, '#fff4c0', { ao: 1 }); e.box(0.25, 0.45, -2.02, 0.45, 0.6, -2.0, '#fff4c0', { ao: 1 });
    g.add(e.build(Gfx.emissive(), { cast: false }));
    [[-0.55, -1.2], [0.55, -1.2], [-0.55, 1.2], [0.55, 1.2]].forEach(function (p) {
      var w = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.2, 14).rotateZ(Math.PI / 2), new T.MeshLambertMaterial({ color: 0x18181c }));
      w.position.set(p[0], 0.3, p[1]); g.add(w);
    });
    var s = new T.Mesh(new T.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), RR.People3D.shadowMat()); s.position.y = 0.02; g.add(s);
    g.scale.setScalar(0.9); g.rotation.y = Math.PI;
    return g;
  };
})();
