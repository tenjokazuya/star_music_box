/* 建物の3Dモデル: ファサードのテクスチャ（窓・ドア・看板）+ 切妻/陸屋根 + ドアの奥まり
 * 建物の足元は (x, y+h) の南面。奥行きは h-1 タイル。壁の高さは wallRows*1.1+0.2
 */
(function () {
  'use strict';
  var RR = window.RR, T = window.THREE, U = RR.U, Gfx = RR.Gfx, P3D = RR.Props3D;

  var ROOF = { red: '#a83c30', blue: '#3c5090', green: '#307048', gray: '#5c5c70', brown: '#7c4c30', black: '#303040', orange: '#c86830', teal: '#287878' };
  var WALL = { cream: '#e0d0a8', white: '#e8e8f0', brick: '#a85840', wood: '#9c6c40', gray: '#9c9cac', blue: '#90a8c8', pink: '#e8c0c0', green: '#a8c098', dark: '#585868' };
  var PX = 96;

  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  var roofTex = {};
  function roofTexture(color) {
    return Gfx.tex('roof:' + color, 64, 64, function (g, w, h) {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      for (var r = 0; r < 4; r++) {
        var y = r * 16;
        var gr = g.createLinearGradient(0, y, 0, y + 16);
        gr.addColorStop(0, U.shade(color, 0.18)); gr.addColorStop(0.7, color); gr.addColorStop(1, U.shade(color, -0.35));
        g.fillStyle = gr; g.fillRect(0, y, w, 16);
        g.strokeStyle = U.shade(color, -0.45); g.lineWidth = 1.5;
        var off = (r & 1) * 16;
        for (var x = off; x < w + 16; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 14); g.stroke(); }
      }
    });
  }

  function drawFacade(o, w, WH, wallRows, doors, fakes, wallC) {
    var Wp = w * PX, Hp = Math.round(WH * PX);
    var A = U.canvas(Wp, Hp, true), E = U.canvas(Wp, Hp, true);
    var g = A.g, e = E.g;
    e.fillStyle = '#000'; e.fillRect(0, 0, Wp, Hp);
    // 壁面
    Gfx.noiseFill(g, 96, 96, wallC, { amt: 0.07, per: 5, seed: 3, fine: 0.05 });
    var tile = U.canvas(96, 96, true); tile.g.putImageData(g.getImageData(0, 0, 96, 96), 0, 0);
    for (var x0 = 0; x0 < Wp; x0 += 96) for (var y0 = 0; y0 < Hp; y0 += 96) g.drawImage(tile, x0, y0);
    var wallName = o.wall;
    if (wallName === 'wood') {
      for (var y = 0; y < Hp; y += 14) { g.fillStyle = 'rgba(40,20,8,0.4)'; g.fillRect(0, y, Wp, 1.6); g.fillStyle = 'rgba(255,230,190,0.1)'; g.fillRect(0, y + 2, Wp, 1.5); }
    } else if (wallName === 'brick') {
      g.strokeStyle = 'rgba(50,20,14,0.55)'; g.lineWidth = 2;
      for (var r = 0; r * 16 < Hp; r++) {
        g.beginPath(); g.moveTo(0, r * 16); g.lineTo(Wp, r * 16); g.stroke();
        for (var bx = (r & 1) * 24; bx < Wp; bx += 48) { g.beginPath(); g.moveTo(bx, r * 16); g.lineTo(bx, r * 16 + 16); g.stroke(); }
      }
    }
    // 上端の影（軒）と基礎
    var gr = g.createLinearGradient(0, 0, 0, 22); gr.addColorStop(0, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, Wp, 22);
    g.fillStyle = U.shade(wallC, -0.4); g.fillRect(0, Hp - 18, Wp, 18);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, Hp - 18, Wp, 2);
    var lit = o.lit !== false;
    var winTop = Hp - Math.round(1.88 * PX), winH = Math.round(0.72 * PX);
    var shutter = o.shutter;
    for (var tx = 0; tx < w; tx++) {
      var cx = tx * PX + PX / 2;
      var isDoor = doors.indexOf(tx) >= 0, isFake = fakes.indexOf(tx) >= 0;
      var inShutter = shutter && tx >= shutter.x && tx < shutter.x + shutter.w;
      if (inShutter || o.noWin) { if (!isDoor && !isFake) continue; }
      if (isDoor || isFake) {
        var dw = 0.78 * PX, dh = Math.round(1.62 * PX), dx = cx - dw / 2, dy = Hp - dh;
        if (o.glassDoor) {
          g.fillStyle = '#c8ccd8'; g.fillRect(dx - 4, dy - 4, dw + 8, dh + 4);
          g.fillStyle = lit ? '#f0d878' : '#303848'; g.fillRect(dx, dy, dw, dh);
          g.fillStyle = '#a8acb8'; g.fillRect(cx - 2, dy, 4, dh);
          g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(dx + 6, dy + 6, 5, dh * 0.4);
          if (lit) { e.fillStyle = '#f0d070'; e.fillRect(dx, dy, dw, dh); }
        } else {
          g.fillStyle = '#3c2818'; g.fillRect(dx - 4, dy - 4, dw + 8, dh + 4);
          var dg = g.createLinearGradient(dx, 0, dx + dw, 0); dg.addColorStop(0, '#8c5c34'); dg.addColorStop(1, '#6c4424');
          g.fillStyle = dg; g.fillRect(dx, dy, dw, dh);
          g.fillStyle = lit ? '#f0d070' : '#283850'; rrect(g, dx + 10, dy + 10, dw - 20, dh * 0.34, 4); g.fill();
          if (lit) { e.fillStyle = '#d8a848'; rrect(e, dx + 10, dy + 10, dw - 20, dh * 0.34, 4); e.fill(); }
          g.strokeStyle = 'rgba(40,20,8,0.5)'; g.lineWidth = 2; g.strokeRect(dx + 8, dy + dh * 0.5, dw - 16, dh * 0.4);
          g.fillStyle = '#e8c860'; g.beginPath(); g.arc(dx + dw - 12, dy + dh * 0.55, 4, 0, 7); g.fill();
        }
        g.fillStyle = '#8c8c98'; g.fillRect(dx - 8, Hp - 4, dw + 16, 4);
        continue;
      }
      if (inShutter) continue;
      if (o.shopWin) {
        var gx = tx * PX + 8, gw = PX - 16, gy = Hp - Math.round(1.7 * PX), gh = Math.round(1.35 * PX);
        g.fillStyle = '#d8dce8'; g.fillRect(gx - 4, gy - 4, gw + 8, gh + 8);
        var sg = g.createLinearGradient(0, gy, 0, gy + gh); sg.addColorStop(0, lit ? '#fff0b0' : '#203048'); sg.addColorStop(1, lit ? '#e8c068' : '#142030');
        g.fillStyle = sg; g.fillRect(gx, gy, gw, gh);
        if (lit) {
          e.fillStyle = sg; e.fillRect(gx, gy, gw, gh);
          // 商品の棚
          g.fillStyle = '#d8b050'; g.fillRect(gx, gy + gh - 26, gw, 26);
          for (var k = 0; k < 5; k++) { g.fillStyle = ['#e85848', '#48a8e8', '#58c858', '#f8c838', '#c868c8'][k]; g.fillRect(gx + 8 + k * 14, gy + gh - 44, 9, 18); }
          e.fillStyle = 'rgba(0,0,0,0.5)'; e.fillRect(gx, gy + gh - 26, gw, 26);
        }
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(gx + 8, gy + 6, 4, gh * 0.4);
        continue;
      }
      if ((tx + (o.winOff || 0)) % 2 === 1 && w > 2) continue;
      var ww = 0.62 * PX, wx = cx - ww / 2;
      g.fillStyle = '#e8ecf4'; g.fillRect(wx - 5, winTop - 5, ww + 10, winH + 10);
      var wg = g.createLinearGradient(0, winTop, 0, winTop + winH);
      wg.addColorStop(0, lit ? '#fff0b8' : '#364a68'); wg.addColorStop(1, lit ? '#e0a850' : '#1e2c44');
      g.fillStyle = wg; g.fillRect(wx, winTop, ww, winH);
      if (lit) {
        e.fillStyle = wg; e.fillRect(wx, winTop, ww, winH);
        g.fillStyle = 'rgba(200,120,60,0.5)'; g.fillRect(wx, winTop + winH * 0.62, ww, winH * 0.38);
        e.fillStyle = 'rgba(0,0,0,0.35)'; e.fillRect(wx, winTop + winH * 0.62, ww, winH * 0.38);
      }
      g.fillStyle = '#c8ccd8'; g.fillRect(cx - 2, winTop, 4, winH); g.fillRect(wx, winTop + winH * 0.45, ww, 4);
      if (lit) { e.fillStyle = 'rgba(0,0,0,0.8)'; e.fillRect(cx - 2, winTop, 4, winH); e.fillRect(wx, winTop + winH * 0.45, ww, 4); }
      g.fillStyle = U.shade(wallC, -0.45); g.fillRect(wx - 7, winTop + winH + 5, ww + 14, 6);
    }
    // シャッター
    if (shutter) {
      var sx = shutter.x * PX + 8, sw = shutter.w * PX - 16, sh = Math.min(Hp - 20, Math.round(2.3 * PX)), sy = Hp - sh;
      g.fillStyle = '#303038'; g.fillRect(sx - 5, sy - 5, sw + 10, sh + 5);
      if (shutter.open) {
        var og = g.createLinearGradient(0, sy, 0, Hp); og.addColorStop(0, '#0c0c14'); og.addColorStop(1, '#3a3a46');
        g.fillStyle = og; g.fillRect(sx, sy, sw, sh);
        e.fillStyle = 'rgba(230,220,170,0.55)'; e.fillRect(sx, sy + 12, sw, sh - 12);
        for (var yy = 0; yy < 28; yy += 5) { g.fillStyle = yy % 10 ? '#a8acbc' : '#7c8090'; g.fillRect(sx, sy + yy, sw, 4); e.fillStyle = '#000'; e.fillRect(sx, sy + yy, sw, 4); }
      } else {
        for (var y2 = 0; y2 < sh; y2 += 6) { g.fillStyle = '#a8acbc'; g.fillRect(sx, sy + y2, sw, 4); g.fillStyle = '#707484'; g.fillRect(sx, sy + y2 + 4, sw, 2); }
      }
    }
    return { a: A, e: E };
  }

  function stripeTex(color) {
    return Gfx.tex('awn:' + color, 64, 32, function (g, w, h) {
      for (var i = 0; i < 8; i++) { g.fillStyle = i & 1 ? '#f4f4f4' : color; g.fillRect(i * 8, 0, 8, h); }
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }

  P3D.builders.building = function (o, X, Z, ctx) {
    var w = o.w, h = o.h;
    var wallRows = o.wallRows || Math.min(2, h - 1);
    var WH = wallRows * 1.1 + 0.2;
    var zF = Z + h, zB = Z + 1;
    var wallC = WALL[o.wall] || o.wall || WALL.cream;
    var roofC = ROOF[o.roof] || o.roof || ROOF.red;
    var doors = [].concat(o.door == null ? [] : o.door);
    var fakes = [].concat(o.fakeDoor || []);
    var DH = 1.7;
    var fm = [];
    var fac = drawFacade(o, w, WH, wallRows, doors, fakes, wallC);
    var texA = Gfx.texFromCanvas(fac.a, { noMip: false });
    var texE = Gfx.texFromCanvas(fac.e, { noMip: false });
    var facMat = new T.MeshLambertMaterial({ map: texA, emissive: new T.Color(0xffffff), emissiveMap: texE });
    fm.push(facMat);
    var fb = new Gfx.Batch();
    var white = [1, 1, 1];
    function colUV(c0, c1, v0, v1) { var u0 = c0 / w, u1 = c1 / w; return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; }
    // 正面（ドアの列は奥まった凹み）
    var run = null;
    function flush(upto) {
      if (run == null) return;
      fb.quad([[X + run, 0, zF], [X + upto, 0, zF], [X + upto, WH, zF], [X + run, WH, zF]], white, colUV(run, upto, 0, 1));
      run = null;
    }
    var wc = U.shade(wallC, -0.1);
    var sideB = new Gfx.Batch();
    for (var c = 0; c < w; c++) {
      if (doors.indexOf(c) >= 0) {
        flush(c);
        var x0 = X + c, x1 = X + c + 1, zr = zF - 0.85;
        var vd = DH / WH;
        fb.quad([[x0, 0, zr], [x1, 0, zr], [x1, DH, zr], [x0, DH, zr]], white, colUV(c, c + 1, 0, vd));
        fb.quad([[x0, DH, zF], [x1, DH, zF], [x1, WH, zF], [x0, WH, zF]], white, colUV(c, c + 1, vd, 1));
        // 左右の壁・天井・床（壁色）
        sideB.quad([[x0, 0, zr], [x0, 0, zF], [x0, DH, zF], [x0, DH, zr]], [[0.6, 0.6, 0.6], [0.6, 0.6, 0.6], [0.8, 0.8, 0.8], [0.8, 0.8, 0.8]].map(function (k) { return Gfx.rgb(wc).map(function (v, i) { return v * k[i]; }); }));
        sideB.quad([[x1, 0, zF], [x1, 0, zr], [x1, DH, zr], [x1, DH, zF]], [[0.6, 0.6, 0.6], [0.6, 0.6, 0.6], [0.8, 0.8, 0.8], [0.8, 0.8, 0.8]].map(function (k) { return Gfx.rgb(wc).map(function (v, i) { return v * k[i]; }); }));
        sideB.quad([[x0, DH, zF], [x1, DH, zF], [x1, DH, zr], [x0, DH, zr]], Gfx.rgb(wc).map(function (v) { return v * 0.5; }));
      } else if (run == null) run = c;
    }
    flush(w);
    var facMesh = fb.build(facMat, { cast: true });
    facMesh.receiveShadow = false;
    ctx.group.add(facMesh);
    // 側面・背面
    var wcol = Gfx.rgb(wallC);
    sideB.box(X, 0, zB, X + w, WH, zF, { all: wallC, side: wallC }, { noFront: true, noTop: true, noBottom: true });
    var roofM = [];
    // 屋根
    var rH = 0;
    var roofB = new Gfx.Batch(), flatB = new Gfx.Batch();
    var isFlat = o.roof === 'flat' || o.flat;
    var depth = zF - zB;
    if (isFlat) {
      var fc = o.flatC || '#a0a0b0';
      flatB.box(X - 0.12, WH, zB - 0.12, X + w + 0.12, WH + 0.16, zF + 0.16, { all: fc, top: U.shade(fc, 0.1) }, { ao: 0.9 });
      var pc = U.shade(fc, -0.15);
      flatB.box(X - 0.12, WH + 0.16, zB - 0.12, X + w + 0.12, WH + 0.38, zB - 0.04, pc, { ao: 1 });
      flatB.box(X - 0.12, WH + 0.16, zF + 0.08, X + w + 0.12, WH + 0.38, zF + 0.16, pc, { ao: 1 });
      flatB.box(X - 0.12, WH + 0.16, zB - 0.04, X - 0.04, WH + 0.38, zF + 0.08, pc, { ao: 1 });
      flatB.box(X + w + 0.04, WH + 0.16, zB - 0.04, X + w + 0.12, WH + 0.38, zF + 0.08, pc, { ao: 1 });
      if (o.ac) { flatB.box(X + w - 1.6, WH + 0.16, zB + 0.5, X + w - 0.6, WH + 0.62, zB + 1.1, '#c0c4cc', { ao: 0.9 }); flatB.cyl(X + w - 1.1, zB + 0.8, WH + 0.62, WH + 0.66, 0.26, 0.26, '#80848c', 10); }
      rH = 0.4;
    } else {
      var x0r = X - 0.28, x1r = X + w + 0.28;
      var zfe = zF + 0.32, zbe = zB - 0.22;
      rH = U.clamp(depth * 0.3, 0.75, 1.7);
      var yE = WH - 0.12, yR = WH + rH, zr2 = (zfe + zbe) / 2;
      var sl = Math.sqrt((zfe - zr2) * (zfe - zr2) + (yR - yE) * (yR - yE));
      var tilesU = (x1r - x0r) * 1.0, tilesV = sl * 1.0;
      roofB.quad([[x0r, yE, zfe], [x1r, yE, zfe], [x1r, yR, zr2], [x0r, yR, zr2]], white, [[0, 0], [tilesU, 0], [tilesU, tilesV], [0, tilesV]]);
      roofB.quad([[x1r, yE, zbe], [x0r, yE, zbe], [x0r, yR, zr2], [x1r, yR, zr2]], [0.85, 0.85, 0.85], [[0, 0], [tilesU, 0], [tilesU, tilesV], [0, tilesV]]);
      // 破風（切妻の壁）
      var gy = yR - 0.1;
      sideB.quad([[X, WH, zB], [X, WH, zF], [X, gy, zr2], [X, gy, zr2]], Gfx.rgb(wallC).map(function (v) { return v * 0.85; }));
      sideB.quad([[X + w, WH, zF], [X + w, WH, zB], [X + w, gy, zr2], [X + w, gy, zr2]], Gfx.rgb(wallC).map(function (v) { return v * 0.85; }));
      // 棟
      flatB.box(x0r, yR - 0.04, zr2 - 0.07, x1r, yR + 0.08, zr2 + 0.07, U.shade(roofC, -0.25), { ao: 1 });
    }
    var sideMat = new T.MeshLambertMaterial({ vertexColors: true });
    var sideMesh = sideB.build(sideMat, { cast: true }); ctx.group.add(sideMesh); fm.push(sideMat);
    if (!roofB.empty()) {
      var rm = new T.MeshLambertMaterial({ map: roofTexture(roofC), vertexColors: true, side: T.DoubleSide });
      var rmesh = roofB.build(rm, { cast: true }); ctx.group.add(rmesh); fm.push(rm);
    }
    if (!flatB.empty()) {
      var fmat = new T.MeshLambertMaterial({ vertexColors: true });
      var fmesh = flatB.build(fmat, { cast: true }); ctx.group.add(fmesh); fm.push(fmat);
    }
    // ひさし
    if (o.awning) {
      var am = new T.MeshLambertMaterial({ map: stripeTex(o.awning), side: T.DoubleSide });
      var ay = 1.95;
      var ag = new T.BufferGeometry();
      var ax0 = X + 0.1, ax1 = X + w - 0.1;
      ag.setAttribute('position', new T.Float32BufferAttribute([ax0, ay, zF + 0.02, ax1, ay, zF + 0.02, ax1, ay - 0.34, zF + 0.62, ax0, ay - 0.34, zF + 0.62], 3));
      ag.setAttribute('uv', new T.Float32BufferAttribute([0, 1, w * 2, 1, w * 2, 0, 0, 0], 2));
      ag.setIndex([0, 2, 1, 0, 3, 2]);
      ag.computeVertexNormals();
      var amesh = new T.Mesh(ag, am); amesh.castShadow = true; ctx.group.add(amesh); fm.push(am);
      // ひさしの縁
      var fr = new Gfx.Batch(); fr.box(ax0, ay - 0.4, zF + 0.6, ax1, ay - 0.32, zF + 0.64, U.shade(o.awning, -0.3), { ao: 1 });
      var fmat2 = new T.MeshLambertMaterial({ vertexColors: true }); ctx.group.add(fr.build(fmat2, { cast: false })); fm.push(fmat2);
    }
    // 看板: 軒先の手前に吊るす（ひさし・屋根のひさしに隠れない位置）
    if (o.sign) {
      var txt = String(o.sign);
      var sh = 0.5;
      var sw = Math.min(w - 0.4, Math.max(1.3, txt.length * 0.3 + 0.6));
      var sc = o.signC || '#c83830';
      var tw = Math.min(768, Math.round(sw / sh * 64));
      var tex = Gfx.textTexture(txt, tw, 64, { bg: sc, fg: o.signT || '#f8f8f8', border: '#181020', shadow: U.shade(sc, -0.5) });
      var sm = new T.MeshLambertMaterial({ map: tex, emissive: new T.Color(0xffffff), emissiveMap: tex, emissiveIntensity: 0.9 });
      var smesh = new T.Mesh(new T.PlaneGeometry(sw, sh), sm);
      var sxc = o.signX != null ? X + o.signX / 16 + sw / 2 : X + w / 2;
      var zS = zF + 0.42, yS = WH - 0.3;
      smesh.position.set(sxc, yS, zS + 0.032);
      ctx.group.add(smesh); fm.push(sm);
      var bk = new Gfx.Batch();
      bk.box(sxc - sw / 2 - 0.03, yS - sh / 2 - 0.03, zS - 0.02, sxc + sw / 2 + 0.03, yS + sh / 2 + 0.03, zS + 0.03, '#181020', { ao: 1 });
      [-1, 1].forEach(function (k) {
        var bx0 = sxc + k * (sw / 2 - 0.15);
        bk.box(bx0 - 0.03, yS + sh / 2 - 0.04, zF, bx0 + 0.03, yS + sh / 2 + 0.02, zS, '#383848', { ao: 1 });
      });
      var bkm = new T.MeshLambertMaterial({ vertexColors: true }); ctx.group.add(bk.build(bkm, { cast: false })); fm.push(bkm);
      ctx.pool(sxc, zF + 1.2, 1.8, o.signGlow || '#f8a080', 0.3);
    }
    // 光だまり（窓・ドア・シャッター）
    var lit = o.lit !== false;
    if (lit) {
      for (var t = 0; t < w; t++) {
        var isDoor = doors.indexOf(t) >= 0;
        if (isDoor) { if (o.glassDoor) ctx.pool(X + t + 0.5, zF + 0.9, 1.6, '#f8e0a0', 0.45); continue; }
        if (o.shutter && t >= o.shutter.x && t < o.shutter.x + o.shutter.w) continue;
        if (o.noWin || fakes.indexOf(t) >= 0) continue;
        if (!o.shopWin && (t + (o.winOff || 0)) % 2 === 1 && w > 2) continue;
        ctx.pool(X + t + 0.5, zF + 0.9, o.shopWin ? 1.9 : 1.3, o.shopWin ? '#f8e8b0' : '#f8d890', o.shopWin ? 0.4 : 0.32);
      }
    }
    if (o.shutter && o.shutter.open) {
      ctx.pool(X + o.shutter.x + o.shutter.w / 2, zF + 1.2, 2.9, '#f8f0d0', 0.6);
      ctx.light(X + o.shutter.x + o.shutter.w / 2, 1.6, zF - 0.3, '#f8f0d0', 6, { real: true });
    }
    // 遮蔽判定（足元から屋根まで）
    ctx.fades.push({ mats: fm, bounds: { x0: X - 0.3, x1: X + w + 0.3, z0: zB - 0.3, z1: zF + 0.65, h: WH + rH }, a: 1 });
    ctx.fadeBuilding = true;
  };
})();
