/* 人物の3Dモデル: RR.People3D.create(look) -> {root, face(dir), walk(t, moving), ...}
 * look: {skin, hair, hairC, top, bottom, shoes, style, accent, extra[], kid, blush, eyes}
 * モデルの前は +Z（南向き）。身長は約1.25（子供は約1.0）。
 */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U, Gfx = RR.Gfx;
  var P3 = RR.People3D = {};

  var SKIN = { pale: '#f8d8c0', light: '#f0c098', tan: '#d89868', dark: '#a06840' };
  var HAIR = { black: '#282030', brown: '#684028', red: '#a83820', blond: '#d8b050', gray: '#a0a0a8', white: '#e0e0e8', blue: '#284878', teal: '#207068', pink: '#c86890' };
  var YAW = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
  P3.YAW = YAW;

  var faceMats = {};
  function mat(key, color) {
    if (!faceMats[key]) faceMats[key] = new T.MeshLambertMaterial({ color: Gfx.color(color) });
    return faceMats[key];
  }

  P3.create = function (look) {
    look = look || {};
    var kid = !!look.kid;
    var sc = kid ? 0.82 : 1;
    var skin = SKIN[look.skin] || SKIN.light;
    var hairC = HAIR[look.hairC] || HAIR.black;
    var top = look.top || '#d04838', bottom = look.bottom || '#384068', shoes = look.shoes || '#242430';
    var accent = look.accent || '#f0f0f0';
    var style = look.style, extra = look.extra || [];
    var dress = style === 'dress', coat = style === 'coat', jacket = style === 'jacket';
    var root = new T.Group();
    var body = new T.Group(); root.add(body);
    var vcol = Gfx.vcol();

    // ---- 脚 ----
    function leg(sx) {
      var g = new T.Group(); g.position.set(sx * 0.09, 0.46, 0);
      var b = new Gfx.Batch();
      if (!dress) {
        b.box(-0.068, -0.4, -0.07, 0.068, 0, 0.07, dress ? skin : bottom, { ao: 0.9 });
        b.box(-0.075, -0.46, -0.07, 0.075, -0.38, 0.14, shoes, { ao: 1 });
      } else {
        b.box(-0.055, -0.4, -0.055, 0.055, 0, 0.055, skin, { ao: 0.9 });
        b.box(-0.065, -0.46, -0.06, 0.065, -0.38, 0.13, shoes, { ao: 1 });
      }
      var m = b.build(vcol, { cast: false }); g.add(m);
      body.add(g);
      return g;
    }
    var legL = leg(-1), legR = leg(1);

    // ---- 胴 ----
    var tb = new Gfx.Batch();
    var tH = coat ? 0.62 : 0.4, tBot = 0.46 - (coat ? 0.2 : 0);
    tb.box(-0.17, tBot, -0.1, 0.17, 0.46 + 0.4, 0.1, { all: top, front: top, top: U.shade(top, 0.15) }, { ao: 0.85 });
    if (dress) {
      tb.cyl(0, 0, 0.25, 0.5, 0.26, 0.17, bottom === '#f8f8f8' ? '#f8f8f8' : top, 10);
    }
    if (jacket || coat) {
      tb.box(-0.02, 0.5, 0.098, 0.02, 0.86, 0.108, accent, { ao: 1 });           // 前立て
      tb.box(-0.18, 0.82, -0.11, 0.18, 0.88, 0.11, U.shade(top, -0.2), { ao: 1 }); // 襟
    } else if (!dress) {
      tb.box(-0.17, 0.84, -0.1, 0.17, 0.87, 0.1, U.shade(top, 0.2), { ao: 1 });
    }
    if (extra.indexOf('apron') >= 0) {
      tb.box(-0.14, 0.4, 0.1, 0.14, 0.78, 0.115, accent === '#f0f0f0' ? '#f0f0f0' : accent, { ao: 1 });
    }
    // ベルト
    if (!dress && !coat) tb.box(-0.175, 0.44, -0.105, 0.175, 0.5, 0.105, bottom, { ao: 1 });
    var torso = tb.build(vcol, { cast: false }); body.add(torso);

    // ---- 腕 ----
    function arm(sx) {
      var g = new T.Group(); g.position.set(sx * 0.22, 0.84, 0);
      var b = new Gfx.Batch();
      b.box(-0.05, -0.34, -0.055, 0.05, 0.02, 0.055, top, { ao: 0.9 });
      b.sphere(0, -0.37, 0, 0.055, 0.055, 0.055, skin, 6, 4, { flat: true });
      var m = b.build(vcol, { cast: false }); g.add(m); body.add(g);
      return g;
    }
    var armL = arm(-1), armR = arm(1);

    // ---- 頭 ----
    var head = new T.Group(); head.position.set(0, 1.04, 0); body.add(head);
    var hb = new Gfx.Batch();
    hb.sphere(0, 0, 0, 0.21, 0.2, 0.2, skin, 10, 8, { flat: true });
    // 耳
    hb.sphere(-0.205, -0.01, 0, 0.035, 0.045, 0.03, skin, 5, 4, { flat: true });
    hb.sphere(0.205, -0.01, 0, 0.035, 0.045, 0.03, skin, 5, 4, { flat: true });
    // 目・口
    var eyeC = '#1c1824';
    if (look.eyes === 'closed') {
      hb.box(-0.095, -0.03, 0.185, -0.04, -0.015, 0.2, eyeC, { ao: 1 }); hb.box(0.04, -0.03, 0.185, 0.095, -0.015, 0.2, eyeC, { ao: 1 });
    } else {
      hb.sphere(-0.075, -0.015, 0.185, 0.026, 0.038, 0.02, eyeC, 6, 4, { flat: true });
      hb.sphere(0.075, -0.015, 0.185, 0.026, 0.038, 0.02, eyeC, 6, 4, { flat: true });
      hb.sphere(-0.068, -0.002, 0.2, 0.01, 0.012, 0.006, '#ffffff', 4, 3, { flat: true });
      hb.sphere(0.082, -0.002, 0.2, 0.01, 0.012, 0.006, '#ffffff', 4, 3, { flat: true });
    }
    hb.box(-0.03, -0.1, 0.188, 0.03, -0.088, 0.2, '#a05048', { ao: 1 });
    if (look.blush) {
      hb.sphere(-0.13, -0.065, 0.165, 0.035, 0.02, 0.012, '#f08890', 5, 3, { flat: true });
      hb.sphere(0.13, -0.065, 0.165, 0.035, 0.02, 0.012, '#f08890', 5, 3, { flat: true });
    }
    // 髪型
    var h = look.hair || 'short';
    function cap(col, ry) { hb.sphere(0, 0.045, -0.025, 0.228, ry || 0.2, 0.225, col, 10, 6, { flat: true }); }
    if (h !== 'bald') {
      if (h === 'old') {
        hb.sphere(-0.19, 0.03, -0.02, 0.05, 0.09, 0.1, hairC, 5, 4, { flat: true });
        hb.sphere(0.19, 0.03, -0.02, 0.05, 0.09, 0.1, hairC, 5, 4, { flat: true });
        hb.sphere(0, 0.04, -0.17, 0.15, 0.13, 0.06, hairC, 6, 4, { flat: true });
      } else {
        cap(hairC);
        hb.box(-0.17, 0.1, 0.12, 0.17, 0.17, 0.2, hairC, { ao: 1 });  // 前髪
        if (h === 'spiky') for (var i = 0; i < 5; i++) hb.cone(-0.15 + i * 0.075, -0.0 + (i % 2) * 0.02, 0.17, 0.33 + (i % 2) * 0.04, 0.06, hairC, 5);
        if (h === 'long') {
          hb.box(-0.21, -0.32, -0.19, 0.21, 0.08, -0.08, hairC, { ao: 0.8 });
          hb.box(-0.225, -0.2, -0.12, -0.19, 0.08, 0.12, hairC, { ao: 0.8 }); hb.box(0.19, -0.2, -0.12, 0.225, 0.08, 0.12, hairC, { ao: 0.8 });
        }
        if (h === 'bob') {
          hb.box(-0.23, -0.1, -0.2, 0.23, 0.08, -0.04, hairC, { ao: 0.8 });
          hb.box(-0.235, -0.1, -0.12, -0.195, 0.1, 0.13, hairC, { ao: 0.8 }); hb.box(0.195, -0.1, -0.12, 0.235, 0.1, 0.13, hairC, { ao: 0.8 });
        }
        if (h === 'pony') {
          hb.sphere(0, 0.05, -0.27, 0.07, 0.07, 0.07, hairC, 6, 4, { flat: true });
          hb.cyl(0, -0.26, -0.06, 0.13, 0.0, 0.075, hairC, 6);
          hb.box(-0.025, 0.04, -0.235, 0.025, 0.07, -0.205, accent, { ao: 1 });
        }
        if (h === 'bun') { hb.sphere(0, 0.25, -0.04, 0.1, 0.09, 0.1, hairC, 7, 5, { flat: true }); }
        if (h === 'cap') {
          hb.sphere(0, 0.07, 0, 0.235, 0.17, 0.23, accent, 10, 5, { flat: true });
          hb.box(-0.19, 0.04, 0.17, 0.19, 0.075, 0.34, U.shade(accent, -0.2), { ao: 1 });
        }
        if (h === 'band') hb.box(-0.225, 0.07, -0.2, 0.225, 0.125, 0.205, extra.indexOf('band') >= 0 ? accent : '#f0f0f0', { ao: 1 });
      }
    }
    if (extra.indexOf('band') >= 0 && h !== 'band') hb.box(-0.225, 0.07, -0.2, 0.225, 0.125, 0.205, '#f0f0f0', { ao: 1 });
    if (extra.indexOf('beard') >= 0) { hb.box(-0.13, -0.17, 0.08, 0.13, -0.08, 0.2, h === 'old' ? hairC : '#30241c', { ao: 1 }); }
    if (extra.indexOf('glasses') >= 0) {
      hb.box(-0.12, -0.04, 0.205, -0.03, 0.025, 0.215, '#101018', { ao: 1 }); hb.box(0.03, -0.04, 0.205, 0.12, 0.025, 0.215, '#101018', { ao: 1 });
      hb.box(-0.03, -0.005, 0.205, 0.03, 0.01, 0.215, '#101018', { ao: 1 });
    }
    var hm = hb.build(vcol, { cast: false }); head.add(hm);

    // ---- 影（丸い影）----
    var shadow = new T.Mesh(new T.PlaneGeometry(0.62, 0.62).rotateX(-Math.PI / 2), P3.shadowMat());
    shadow.position.y = 0.012; shadow.renderOrder = 1;
    root.add(shadow);

    body.scale.setScalar(sc);
    var api = {
      root: root, body: body, head: head, kid: kid, sc: sc, yaw: 0, targetYaw: 0, phase: 0,
      // 向き（滑らかに回る）
      face: function (dir, instant) {
        if (YAW[dir] == null) return;
        api.targetYaw = YAW[dir];
        if (instant) { api.yaw = api.targetYaw; root.rotation.y = api.yaw; }
      },
      // 歩行アニメ
      walk: function (dt, moving, speed) {
        var d = U.wrapAngle(api.targetYaw - api.yaw);
        api.yaw += d * Math.min(1, dt * 14);
        root.rotation.y = api.yaw;
        if (moving) api.phase += dt * (6 + speed * 3);
        else api.phase *= 0.85;
        var s = Math.sin(api.phase) * (moving ? 0.75 : 0.1 * Math.sign(api.phase));
        legL.rotation.x = s; legR.rotation.x = -s;
        armL.rotation.x = -s * 0.9; armR.rotation.x = s * 0.9;
        body.position.y = moving ? Math.abs(Math.cos(api.phase)) * 0.04 * sc : 0;
        head.rotation.z = moving ? Math.sin(api.phase) * 0.03 : 0;
      },
      dispose: function () { Gfx.dispose(root); }
    };
    return api;
  };

  var shMat = null;
  P3.shadowMat = function () {
    if (!shMat) {
      var tex = Gfx.tex('blobshadow', 64, 64, function (g, w, h) {
        var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }, { clamp: true, noMip: true });
      shMat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
      shMat.userData.keep = true;
    }
    return shMat;
  };

  // 吹き出し（!, ?, ♥, ♪ など）のスプライト
  var emoteTex = {};
  P3.emoteSprite = function (ch) {
    if (!emoteTex[ch]) {
      emoteTex[ch] = Gfx.tex('emote:' + ch, 128, 128, function (g, w, h) {
        g.fillStyle = '#181020'; UI_rr(g, 14, 10, 100, 84, 18); g.fill();
        g.fillStyle = '#fafafa'; UI_rr(g, 20, 16, 88, 72, 14); g.fill();
        g.fillStyle = '#181020'; g.beginPath(); g.moveTo(52, 90); g.lineTo(64, 116); g.lineTo(76, 90); g.fill();
        g.fillStyle = '#fafafa'; g.beginPath(); g.moveTo(56, 88); g.lineTo(64, 106); g.lineTo(72, 88); g.fill();
        var col = ch === '!' ? '#e03030' : ch === '♥' ? '#e05080' : ch === '♪' ? '#3060c0' : '#303030';
        g.fillStyle = col; g.font = 'bold 64px ' + RR.FONT_STACK; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(ch, 64, 54);
      }, { clamp: true, noMip: true });
    }
    var s = new T.Sprite(new T.SpriteMaterial({ map: emoteTex[ch], transparent: true, depthTest: false, fog: false }));
    s.scale.set(0.8, 0.8, 1);
    s.renderOrder = 10;
    return s;
  };
  function UI_rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // 撮影（顔の絵・立ち絵）
  var pcache = {};
  P3.snapshot = function (look, w, h) {
    w = w || 64; h = h || 96;
    var key = JSON.stringify(look) + w + 'x' + h;
    if (pcache[key]) return pcache[key];
    var sc = new T.Scene();
    var p = P3.create(look);
    p.root.children.forEach(function (c) { if (c.material === P3.shadowMat()) c.visible = false; });
    sc.add(p.root);
    sc.add(new T.HemisphereLight(0xffffff, 0x666677, 1.0));
    var dl = new T.DirectionalLight(0xffffff, 0.7); dl.position.set(1, 3, 4); sc.add(dl);
    var cam = new T.PerspectiveCamera(24, w / h, 0.1, 20);
    cam.position.set(0, 0.78, 4.2); cam.lookAt(0, 0.66, 0);
    var cv = RR.GL.snapshot(sc, cam, w, h);
    p.dispose();
    pcache[key] = cv;
    return cv;
  };
})();
