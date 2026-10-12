(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Util = Orgel.Util;
  var Rng = Orgel.Rng;
  var rgba = Util.rgba;
  var H = Orgel.Background.helpers;
  var TAU = H.TAU;
  var makeBuffer = H.makeBuffer;
  var skyGradient = H.skyGradient;
  var glow = H.glow;
  var makeStars = H.makeStars;
  var drawStars = H.drawStars;
  var glowFast = H.glowFast;
  var puffSprite = H.puffSprite;
  var hillPath = H.hillPath;
  var drawGear = H.drawGear;

  /**
   * ワールド6〜18の背景（すべてコードで描く）。仕様: managements/project/expansion.md §2・§7。
   * 作りは background.js の既存の背景と同じ: resize で静かな下地をバッファに描き、draw で下地を貼って、動くものを軽く重ねる。
   * 盤面が読みやすいよう、中央は暗めにおさえ、動きの大きなものは縁に寄せる。
   */

  function wrap01(v) { return ((v % 1) + 1) % 1; }

  /** ばらまく粒の配列を作る（座標は 0〜1 の割合） */
  function makeDots(rng, n, o) {
    var list = [];
    for (var i = 0; i < n; i++) {
      list.push({
        x: rng.next(), y: rng.next(),
        sp: (o.sp || 0.01) * (0.5 + rng.next()), sw: (o.sw || 0.02) * (0.4 + rng.next()),
        ph: rng.next() * TAU, size: (o.size || 1.5) * (0.6 + rng.next() * 0.8),
      });
    }
    return list;
  }

  /** 流れ星（背景ごとに1つ）。still のときは出さない */
  function makeShooter() {
    return { gap: 0, life: 0, x: 0, y: 0 };
  }
  function drawShooter(ctx, sh, w, h, t, still, color) {
    if (!still) {
      if (sh.life <= 0 && t > sh.gap) {
        sh.life = 1;
        sh.x = 0.1 + ((t * 7) % 60) / 100 * 0.8;
        sh.y = 0.04 + ((t * 3) % 25) / 100;
        sh.gap = t + 7000 + (t % 5000);
      }
    }
    if (sh.life <= 0) return;
    sh.life -= 0.012;
    var sx = sh.x * w + (1 - sh.life) * w * 0.25;
    var sy = sh.y * h + (1 - sh.life) * h * 0.14;
    var g = ctx.createLinearGradient(sx, sy, sx - w * 0.08, sy - h * 0.04);
    g.addColorStop(0, rgba(color || '#ffffff', Math.max(0, sh.life)));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - w * 0.08, sy - h * 0.04);
    ctx.stroke();
  }

  /** 縦に伸びる光の筋（上から差し込む光）を描く */
  function lightShafts(ctx, w, h, t, px, n, color, alpha, spread) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var s = 0; s < n; s++) {
      var sway = Math.sin(t * 0.00025 + s * 2.1) * 0.02;
      var x0 = (0.12 + (s + 0.5) * (0.76 / n) + sway) * w + px * 8;
      var g = ctx.createLinearGradient(x0, 0, x0 + w * spread, h);
      g.addColorStop(0, rgba(color, alpha));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + w * 0.06, 0);
      ctx.lineTo(x0 + w * (spread + 0.1), h);
      ctx.lineTo(x0 + w * (spread - 0.04), h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // ワールド6 もりの いずみ: 木のシルエット・ホタル・木もれび・泉の波紋
  // ---------------------------------------------------------------------------
  function makeForest(world) {
    var rng = Rng.create('bg-6');
    var th = world.theme;
    var stars = makeStars(rng, 50, 0.35);
    var flies = [];
    var i;
    for (i = 0; i < 26; i++) {
      flies.push({ x: rng.next(), y: 0.35 + rng.next() * 0.6, ax: 0.02 + rng.next() * 0.05, ay: 0.015 + rng.next() * 0.04,
        sp: 0.12 + rng.next() * 0.3, ph: rng.next() * TAU, size: 1.2 + rng.next() * 1.6 });
    }
    var trees = [];
    for (var side = 0; side < 2; side++) {
      for (i = 0; i < 6; i++) {
        trees.push({ x: side ? 0.84 + rng.next() * 0.2 : -0.04 + rng.next() * 0.2, h: 0.55 + rng.next() * 0.45,
          w: 0.02 + rng.next() * 0.016, tone: rng.next(), ang: rng.next() * 6 });
      }
    }
    trees.sort(function (a, b) { return a.tone - b.tone; });
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.5, h * 0.95, h * 0.8, '#58e0a0', 0.2);
        glow(c, w * 0.5, h * 0.05, h * 0.6, '#cfffb0', 0.08);
        trees.forEach(function (tr) {
          var tx = tr.x * w;
          var base = h * 1.02;
          var top = base - tr.h * h;
          var shade = Math.round(10 + tr.tone * 18);
          c.fillStyle = 'rgb(' + (shade - 4) + ',' + (shade + 14) + ',' + (shade + 4) + ')';
          c.fillRect(tx - tr.w * w * 0.5, top + h * 0.08, tr.w * w, base - top);
          for (var k = 0; k < 6; k++) {
            var ang = k * 1.7 + tr.ang;
            c.beginPath();
            c.arc(tx + Math.cos(ang) * h * 0.055, top + Math.sin(ang) * h * 0.04 + k * h * 0.012, h * (0.07 + 0.009 * ((k * 7) % 5)), 0, TAU);
            c.fill();
          }
        });
        c.fillStyle = '#04120c';
        hillPath(c, w, h, h * 0.96, h * 0.02, 1.6, 1.0, 0);
        c.fill();
      },
      draw: function (ctx, w, h, t, px) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, 0, 4, '#e8ffe8', 0.6);
        lightShafts(ctx, w, h, t, px, 3, '#bfffaa', 0.07, 0.12);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#f4ffc0';
        for (var fi = 0; fi < flies.length; fi++) {
          var f = flies[fi];
          var tt = t * 0.001 * f.sp + f.ph;
          var x = (f.x + Math.sin(tt) * f.ax) * w + px * 16;
          var y = (f.y + Math.cos(tt * 1.3) * f.ay) * h;
          var a = 0.5 + 0.5 * Math.sin(tt * 2.2);
          glowFast(ctx, x, y, 11 + f.size * 3, '#c8ff80', 0.6 * a);
          ctx.globalAlpha = 0.9 * a;
          ctx.beginPath();
          ctx.arc(x, y, f.size * 0.6, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // 泉の波紋
        ctx.save();
        ctx.strokeStyle = '#a8ffd8';
        ctx.lineWidth = 1.2;
        for (var r = 0; r < 3; r++) {
          var ph = (t * 0.00022 + r / 3) % 1;
          ctx.globalAlpha = 0.2 * (1 - ph);
          ctx.beginPath();
          ctx.ellipse(w * 0.5 + px * 6, h * 0.94, w * (0.05 + ph * 0.28), h * (0.012 + ph * 0.05), 0, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド7 こおりの ほこら: オーロラ・降る雪・氷の結晶
  // ---------------------------------------------------------------------------
  function makeIce(world) {
    var rng = Rng.create('bg-7');
    var th = world.theme;
    var stars = makeStars(rng, 90, 0.55);
    var snow = makeDots(rng, 70, { sp: 0.025, sw: 0.02, size: 1.8 });
    var ribbons = [
      { y: 0.2, amp: 0.045, hue: '#7ff5e0', ph: 0, sp: 0.0002 },
      { y: 0.3, amp: 0.05, hue: '#a8c8ff', ph: 2, sp: 0.00016 },
      { y: 0.13, amp: 0.035, hue: '#d4b8ff', ph: 4, sp: 0.00024 },
    ];
    var shards = [];
    function cluster(cx, n, dir) {
      for (var i = 0; i < n; i++) {
        shards.push({ x: cx + dir * (i * 0.03 + rng.next() * 0.02), h: 0.1 + rng.next() * 0.2, w: 0.025 + rng.next() * 0.02, lean: (rng.next() - 0.5) * 0.12, ph: rng.next() * TAU });
      }
    }
    cluster(0.0, 7, 1);
    cluster(1.0, 7, -1);
    cluster(0.5, 5, 1);
    var shooter = makeShooter();
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.2, h * 0.16, h * 0.5, '#cfeaff', 0.18);
        shards.forEach(function (s) {
          var x = s.x * w;
          var base = h * 1.02;
          var top = base - s.h * h;
          var ww = s.w * w;
          var g = c.createLinearGradient(0, base, 0, top);
          g.addColorStop(0, 'rgba(120,180,230,0.08)');
          g.addColorStop(1, 'rgba(210,245,255,0.34)');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(x - ww, base);
          c.lineTo(x + s.lean * w, top);
          c.lineTo(x + ww, base);
          c.closePath();
          c.fill();
          c.strokeStyle = 'rgba(235,252,255,0.38)';
          c.lineWidth = 1;
          c.stroke();
        });
      },
      draw: function (ctx, w, h, t, px, py, still) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 5, '#eaf6ff', 0.85);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ribbons.forEach(function (rb) {
          var g = ctx.createLinearGradient(0, rb.y * h - h * 0.12, 0, rb.y * h + h * 0.2);
          g.addColorStop(0, rgba(rb.hue, 0));
          g.addColorStop(0.5, rgba(rb.hue, 0.17));
          g.addColorStop(1, rgba(rb.hue, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          var x;
          for (x = 0; x <= w; x += 16) {
            var y = rb.y * h + Math.sin(x * 0.004 + t * rb.sp * 6 + rb.ph) * rb.amp * h + Math.sin(x * 0.011 + t * rb.sp * 4) * rb.amp * h * 0.4;
            if (x === 0) ctx.moveTo(x, y - h * 0.12); else ctx.lineTo(x, y - h * 0.12);
          }
          for (x = w; x >= 0; x -= 16) {
            var y3 = rb.y * h + Math.sin(x * 0.004 + t * rb.sp * 6 + rb.ph) * rb.amp * h + Math.sin(x * 0.011 + t * rb.sp * 4) * rb.amp * h * 0.4;
            ctx.lineTo(x + Math.sin(x * 0.02 + t * 0.0004) * 8, y3 + h * 0.2);
          }
          ctx.closePath();
          ctx.fill();
        });
        ctx.restore();
        drawShooter(ctx, shooter, w, h, t, still, '#dff6ff');
        // 降る雪
        ctx.fillStyle = '#f4fbff';
        for (var si = 0; si < snow.length; si++) {
          var s = snow[si];
          var sy = wrap01(s.y + t * 0.001 * s.sp);
          var sx = s.x + Math.sin(t * 0.0006 + s.ph) * s.sw;
          ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 0.002 + s.ph);
          ctx.beginPath();
          ctx.arc(sx * w + px * 10, sy * h, s.size * 0.7, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド8 さばくの よぞら: 大きな月・砂丘・流れ星・舞う砂
  // ---------------------------------------------------------------------------
  function makeDesert(world) {
    var rng = Rng.create('bg-8');
    var th = world.theme;
    var stars = makeStars(rng, 130, 0.5);
    var streaks = [];
    for (var i = 0; i < 12; i++) streaks.push({ y: 0.7 + rng.next() * 0.28, x: rng.next(), len: 0.05 + rng.next() * 0.1, sp: 0.02 + rng.next() * 0.03 });
    var shooter = makeShooter();
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.8, h * 0.22, h * 0.7, '#ffe8c0', 0.2);
        glow(c, w * 0.3, h * 0.86, h * 0.7, '#ff8a50', 0.18);
        var mg = c.createRadialGradient(w * 0.8, h * 0.22, 0, w * 0.8, h * 0.22, h * 0.11);
        mg.addColorStop(0, '#fff8e8');
        mg.addColorStop(0.75, '#ffe8c0');
        mg.addColorStop(1, '#ffd49a');
        c.fillStyle = mg;
        c.beginPath();
        c.arc(w * 0.8, h * 0.22, h * 0.1, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(200,150,110,0.25)';
        c.beginPath(); c.arc(w * 0.8 - h * 0.03, h * 0.22 - h * 0.02, h * 0.02, 0, TAU); c.fill();
        c.beginPath(); c.arc(w * 0.8 + h * 0.035, h * 0.22 + h * 0.03, h * 0.014, 0, TAU); c.fill();
      },
      draw: function (ctx, w, h, t, px, py, still) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 5, '#fff2dc', 0.9);
        drawShooter(ctx, shooter, w, h, t, still, '#fff0d0');
        // 砂丘（遠・中・近）
        ctx.fillStyle = '#6a3a52';
        hillPath(ctx, w, h, h * 0.78, h * 0.03, 0.8, 0.5, px * 6);
        ctx.fill();
        ctx.fillStyle = '#442443';
        hillPath(ctx, w, h, h * 0.86, h * 0.035, 1.1, 2.4, px * 12);
        ctx.fill();
        ctx.fillStyle = '#2a1430';
        hillPath(ctx, w, h, h * 0.94, h * 0.03, 0.9, 4.2, px * 20);
        ctx.fill();
        // 舞う砂
        ctx.save();
        ctx.strokeStyle = '#ffd9a0';
        ctx.lineWidth = 1;
        for (var si = 0; si < streaks.length; si++) {
          var s = streaks[si];
          var x = wrap01(s.x + t * 0.001 * s.sp) * (w * 1.2) - w * 0.1;
          ctx.globalAlpha = 0.07 + 0.05 * Math.sin(t * 0.0012 + si);
          ctx.beginPath();
          ctx.moveTo(x, s.y * h + Math.sin(t * 0.0008 + si) * 3);
          ctx.lineTo(x + s.len * w, s.y * h + 2 + Math.sin(t * 0.0008 + si) * 3);
          ctx.stroke();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド9 あかりの みなと: ちょうちんの列・水面・船の影
  // ---------------------------------------------------------------------------
  function makeHarbor(world) {
    var rng = Rng.create('bg-9');
    var th = world.theme;
    var stars = makeStars(rng, 70, 0.45);
    var strings = [
      { y0: 0.12, y1: 0.12, sag: 0.06, n: 9, ph: 0 },
      { y0: 0.24, y1: 0.2, sag: 0.05, n: 8, ph: 1.7 },
    ];
    var colors = ['#ffb35c', '#ff8a6a', '#ffd27a'];
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        var sea = c.createLinearGradient(0, h * 0.7, 0, h);
        sea.addColorStop(0, 'rgba(6,18,38,0.5)');
        sea.addColorStop(1, 'rgba(2,8,20,0.88)');
        c.fillStyle = sea;
        c.fillRect(0, h * 0.7, w, h * 0.3);
        // 港の影（水平線ぞいの家と帆柱）
        c.fillStyle = '#0a1830';
        for (var i = 0; i < 18; i++) {
          var x = (i / 18) * w + (i % 3) * 8;
          var bh = h * (0.03 + ((i * 37) % 7) * 0.008);
          c.fillRect(x, h * 0.7 - bh, w / 20, bh);
          if (i % 4 === 1) { c.fillRect(x + w / 40, h * 0.7 - bh - h * 0.1, 2, h * 0.1); }
        }
        c.beginPath();
        c.moveTo(w * 0.05, h * 0.7);
        c.lineTo(w * 0.05, h * 0.58);
        c.lineTo(w * 0.12, h * 0.7);
        c.closePath();
        c.fill();
        glow(c, w * 0.5, h * 0.7, h * 0.7, '#ff9a50', 0.1);
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 4, '#e8f0ff', 0.7);
        // ちょうちんの列
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(40,24,18,0.5)';
        ctx.lineWidth = 1;
        for (var si = 0; si < strings.length; si++) {
          var s = strings[si];
          ctx.beginPath();
          for (var k = 0; k <= 24; k++) {
            var u = k / 24;
            var x = u * w * 1.04 - w * 0.02 + px * 6;
            var y = (s.y0 + (s.y1 - s.y0) * u + Math.sin(u * Math.PI) * s.sag) * h;
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          for (var n = 0; n < s.n; n++) {
            var u2 = (n + 0.5) / s.n;
            var lx = u2 * w * 1.04 - w * 0.02 + px * 6 + Math.sin(t * 0.0007 + s.ph + n) * 3;
            var ly = (s.y0 + (s.y1 - s.y0) * u2 + Math.sin(u2 * Math.PI) * s.sag) * h + 8;
            var fl = 0.8 + 0.2 * Math.sin(t * 0.004 + n * 1.9 + s.ph);
            var col = colors[(n + si) % 3];
            glowFast(ctx, lx, ly, h * 0.085, col, 0.4 * fl);
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.ellipse(lx, ly, 4.5, 6, 0, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            // 水面にうつる光
            ctx.globalAlpha = 0.12 * fl;
            ctx.fillRect(lx - 1.5 + Math.sin(t * 0.002 + n) * 3, h * 0.72, 3, h * 0.26);
            ctx.globalAlpha = 1;
          }
        }
        ctx.restore();
        // 波
        ctx.strokeStyle = '#9fc4e8';
        ctx.lineWidth = 1.2;
        for (var r = 0; r < 6; r++) {
          var yy = h * (0.74 + r * 0.045);
          ctx.globalAlpha = 0.07 + r * 0.01;
          ctx.beginPath();
          for (var xx = 0; xx <= w; xx += 14) {
            var y2 = yy + Math.sin(xx * 0.014 + t * 0.0009 * (1 + r * 0.12) + r) * (1.5 + r * 0.7);
            if (xx === 0) ctx.moveTo(xx, y2); else ctx.lineTo(xx, y2);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド10 ほしぞらの とうだい: 灯台と、ゆっくり回る光の帯
  // ---------------------------------------------------------------------------
  function makeLighthouse(world) {
    var rng = Rng.create('bg-10');
    var th = world.theme;
    var stars = makeStars(rng, 150, 0.7);
    var shooter = makeShooter();
    var buf = null;
    var tower = { x: 0.14, y: 0.6 };
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        var sea = c.createLinearGradient(0, h * 0.78, 0, h);
        sea.addColorStop(0, 'rgba(8,20,60,0.55)');
        sea.addColorStop(1, 'rgba(2,6,24,0.9)');
        c.fillStyle = sea;
        c.fillRect(0, h * 0.78, w, h * 0.22);
        // 岬と灯台
        c.fillStyle = '#060c22';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(0, h * 0.74);
        c.quadraticCurveTo(w * 0.1, h * 0.7, w * 0.2, h * 0.78);
        c.quadraticCurveTo(w * 0.27, h * 0.86, w * 0.33, h);
        c.closePath();
        c.fill();
        var tx = w * tower.x;
        var ty = h * tower.y;
        c.beginPath();
        c.moveTo(tx - h * 0.026, h * 0.74);
        c.lineTo(tx - h * 0.016, ty);
        c.lineTo(tx + h * 0.016, ty);
        c.lineTo(tx + h * 0.026, h * 0.74);
        c.closePath();
        c.fill();
        c.fillRect(tx - h * 0.024, ty - h * 0.03, h * 0.048, h * 0.03);
        c.beginPath();
        c.moveTo(tx - h * 0.03, ty - h * 0.03);
        c.lineTo(tx, ty - h * 0.065);
        c.lineTo(tx + h * 0.03, ty - h * 0.03);
        c.closePath();
        c.fill();
      },
      draw: function (ctx, w, h, t, px, py, still) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 6, '#f0f4ff', 0.95);
        drawShooter(ctx, shooter, w, h, t, still, '#ffffff');
        // 光の帯（左右にゆっくり振れる）
        var lx = w * tower.x + px * 4;
        var ly = h * (tower.y - 0.016);
        var ang = Math.sin(t * 0.0004) * 0.5 - 0.05;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(lx, ly);
        ctx.rotate(ang);
        var g = ctx.createLinearGradient(0, 0, w * 1.1, 0);
        g.addColorStop(0, 'rgba(255,243,176,0.3)');
        g.addColorStop(1, 'rgba(255,243,176,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 1.1, -h * 0.1);
        ctx.lineTo(w * 1.1, h * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowFast(ctx, lx, ly, h * 0.12, '#fff3b0', 0.55 + 0.15 * Math.sin(t * 0.003));
        ctx.restore();
        // 波
        ctx.strokeStyle = '#8fa8e8';
        ctx.lineWidth = 1.2;
        for (var r = 0; r < 5; r++) {
          var yy = h * (0.8 + r * 0.04);
          ctx.globalAlpha = 0.07 + r * 0.012;
          ctx.beginPath();
          for (var x = 0; x <= w; x += 14) {
            var y2 = yy + Math.sin(x * 0.012 + t * 0.0008 * (1 + r * 0.15) + r) * (2 + r * 0.8);
            if (x === 0) ctx.moveTo(x, y2); else ctx.lineTo(x, y2);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド11 ふかい うみの そこ: ひかるクラゲ・あぶく・海藻・光の筋
  // ---------------------------------------------------------------------------
  function drawJelly(ctx, x, y, r, t, ph, color) {
    var pulse = 0.88 + 0.12 * Math.sin(t * 0.002 + ph);
    var rr = r * pulse;
    glowFast(ctx, x, y, r * 2.8, color, 0.28);
    ctx.beginPath();
    ctx.moveTo(x - rr, y);
    ctx.bezierCurveTo(x - rr, y - rr * 1.55, x + rr, y - rr * 1.55, x + rr, y);
    ctx.quadraticCurveTo(x, y + rr * 0.45, x - rr, y);
    ctx.closePath();
    ctx.fillStyle = rgba(color, 0.3);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (var k = 0; k < 5; k++) {
      var tx = x - rr * 0.7 + k * rr * 0.35;
      ctx.beginPath();
      ctx.moveTo(tx, y + rr * 0.1);
      for (var j = 1; j <= 6; j++) ctx.lineTo(tx + Math.sin(t * 0.002 + ph + j * 0.9 + k) * rr * 0.07 * j, y + rr * 0.1 + j * rr * 0.3);
      ctx.stroke();
    }
  }

  function makeDeepSea(world) {
    var rng = Rng.create('bg-11');
    var th = world.theme;
    var jellies = [];
    var palette = ['#68f0ff', '#b08aff', '#ff9ad8', '#8affc8'];
    for (var i = 0; i < 5; i++) {
      jellies.push({ x: rng.next(), y: rng.next(), r: 0.025 + rng.next() * 0.03, sp: 0.006 + rng.next() * 0.01, sw: 0.02 + rng.next() * 0.04,
        ph: rng.next() * TAU, color: palette[i % 4] });
    }
    var bubbles = makeDots(rng, 34, { sp: 0.05, sw: 0.015, size: 2.2 });
    var weeds = [];
    for (i = 0; i < 16; i++) weeds.push({ x: (i + rng.next() * 0.6) / 16, h: 0.08 + rng.next() * 0.16, ph: rng.next() * TAU });
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.5, h * 0.0, h * 0.9, '#3a9ab0', 0.16);
        glow(c, w * 0.5, h * 1.0, h * 0.6, '#0a3a58', 0.3);
      },
      draw: function (ctx, w, h, t, px) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        lightShafts(ctx, w, h, t, px, 4, '#7fe8ff', 0.06, 0.16);
        // 海藻
        ctx.strokeStyle = 'rgba(8,52,60,0.9)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (var wi = 0; wi < weeds.length; wi++) {
          var wd = weeds[wi];
          var x0 = wd.x * w;
          ctx.beginPath();
          ctx.moveTo(x0, h * 1.01);
          for (var k = 1; k <= 8; k++) {
            var u = k / 8;
            ctx.lineTo(x0 + Math.sin(t * 0.0009 + wd.ph + u * 3) * wd.h * h * 0.12 * u, h * 1.01 - u * wd.h * h);
          }
          ctx.stroke();
        }
        // あぶく
        ctx.save();
        ctx.strokeStyle = '#aef4ff';
        ctx.lineWidth = 1;
        for (var bi = 0; bi < bubbles.length; bi++) {
          var b = bubbles[bi];
          var by = 1 - wrap01(b.y + t * 0.001 * b.sp);
          ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 0.002 + b.ph);
          ctx.beginPath();
          ctx.arc((b.x + Math.sin(t * 0.0007 + b.ph) * b.sw) * w + px * 8, by * h, b.size, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        // クラゲ
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var ji = 0; ji < jellies.length; ji++) {
          var j = jellies[ji];
          var jy = 1.15 - wrap01(j.y + t * 0.001 * j.sp) * 1.3;
          var jx = (j.x + Math.sin(t * 0.0003 + j.ph) * j.sw) * w + px * 14;
          drawJelly(ctx, jx, jy * h, j.r * h * 1.3, t, j.ph, j.color);
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド12 からくりの まち: 真鍮の歯車・振り子・火花
  // ---------------------------------------------------------------------------
  function makeClockwork(world) {
    var rng = Rng.create('bg-12');
    var th = world.theme;
    var sparks = makeDots(rng, 40, { sp: 0.012, sw: 0.012, size: 1.8 });
    // 歯の数に反比例した速さで回る（かみ合って見える）
    var gears = [
      { x: 0.07, y: 0.2, r: 0.22, teeth: 18, dir: 1, a: 0.16, col: '#ffcf6b' },
      { x: 0.2, y: 0.41, r: 0.12, teeth: 10, dir: -1, a: 0.15, col: '#ffcf6b' },
      { x: 0.95, y: 0.78, r: 0.27, teeth: 22, dir: 1, a: 0.12, col: '#c8a0ff' },
      { x: 0.83, y: 0.5, r: 0.13, teeth: 11, dir: -1, a: 0.14, col: '#ffcf6b' },
      { x: 0.46, y: 1.06, r: 0.2, teeth: 16, dir: 1, a: 0.11, col: '#c8a0ff' },
      { x: 0.9, y: 0.12, r: 0.11, teeth: 9, dir: -1, a: 0.13, col: '#ffcf6b' },
      { x: 0.05, y: 0.8, r: 0.1, teeth: 9, dir: -1, a: 0.12, col: '#c8a0ff' },
    ];
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.5, h * 0.5, h * 0.9, '#a05a8a', 0.16);
        glow(c, w * 0.1, h * 0.2, h * 0.5, '#ffcf6b', 0.08);
      },
      draw: function (ctx, w, h, t, px) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        for (var gi = 0; gi < gears.length; gi++) {
          var g = gears[gi];
          drawGear(ctx, g.x * w + px * 10, g.y * h, g.r * h, g.teeth, g.dir * t * 0.0014 / g.teeth, g.col, g.a);
        }
        // 振り子
        var sw = Math.sin(t * 0.0026) * 0.32;
        var ox = w * 0.5 + px * 8;
        var len = h * 0.2;
        ctx.save();
        ctx.translate(ox, -h * 0.01);
        ctx.rotate(sw);
        ctx.strokeStyle = 'rgba(255,207,107,0.26)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, len);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,207,107,0.3)';
        ctx.beginPath();
        ctx.arc(0, len, h * 0.022, 0, TAU);
        ctx.fill();
        ctx.restore();
        // 火花
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffd98a';
        for (var si = 0; si < sparks.length; si++) {
          var s = sparks[si];
          var y = 1 - wrap01(s.y + t * 0.001 * s.sp);
          ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t * 0.0016 + s.ph);
          ctx.beginPath();
          ctx.arc((s.x + Math.sin(t * 0.0005 + s.ph) * s.sw) * w + px * 12, y * h, s.size * 0.8, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド13 にじの はし: にじ色の弧・雲・きらめき
  // ---------------------------------------------------------------------------
  function makeRainbow(world) {
    var rng = Rng.create('bg-13');
    var th = world.theme;
    var stars = makeStars(rng, 60, 0.4);
    var puffs = [];
    for (var i = 0; i < 22; i++) puffs.push({ x: rng.next(), y: 0.78 + rng.next() * 0.2, r: 0.06 + rng.next() * 0.08, sp: 0.004 + rng.next() * 0.006, tone: i % 2 });
    var glints = makeDots(rng, 36, { sp: 0.002, sw: 0.004, size: 1.8 });
    var BANDS = ['#ff7a8a', '#ffb070', '#ffe28a', '#8affb0', '#7fd8ff', '#9a9cff', '#d49aff'];
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.5, h * 0.9, h * 0.9, '#ffd6f5', 0.2);
        // にじ（うすく）
        var cx = w * 0.5;
        var cy = h * 1.25;
        var r0 = Math.max(w * 0.52, h * 1.05);
        for (var b = 0; b < BANDS.length; b++) {
          c.strokeStyle = rgba(BANDS[b], 0.2);
          c.lineWidth = h * 0.032;
          c.beginPath();
          c.arc(cx, cy, r0 - b * h * 0.03, Math.PI * 1.08, Math.PI * 1.92);
          c.stroke();
        }
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 5, '#fff4ff', 0.7);
        // きらめき
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        for (var gi = 0; gi < glints.length; gi++) {
          var g = glints[gi];
          var a = Math.max(0, Math.sin(t * 0.0015 + g.ph));
          if (a < 0.3) continue;
          var x = g.x * w + px * 10;
          var y = (0.1 + g.y * 0.6) * h;
          ctx.globalAlpha = a * 0.7;
          ctx.fillRect(x - g.size * 2.2 * a, y - 0.5, g.size * 4.4 * a, 1);
          ctx.fillRect(x - 0.5, y - g.size * 2.2 * a, 1, g.size * 4.4 * a);
        }
        ctx.restore();
        // 雲
        var tones = [puffSprite([255, 226, 244]), puffSprite([214, 232, 255])];
        for (var pi = 0; pi < puffs.length; pi++) {
          var p = puffs[pi];
          var px2 = ((p.x + t * 0.001 * p.sp) % 1.25 - 0.12) * w + px * 12;
          var r = p.r * h * 1.5;
          ctx.globalAlpha = 0.2;
          ctx.drawImage(tones[p.tone], px2 - r, p.y * h - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド14 かざんの ほし: 火山・溶岩・舞う火の粉
  // ---------------------------------------------------------------------------
  function makeVolcano(world) {
    var rng = Rng.create('bg-14');
    var th = world.theme;
    var stars = makeStars(rng, 40, 0.3);
    var embers = makeDots(rng, 60, { sp: 0.05, sw: 0.04, size: 1.9 });
    var smokes = [];
    for (var i = 0; i < 6; i++) smokes.push({ x: 0.4 + rng.next() * 0.2, r: 0.12 + rng.next() * 0.1, sp: 0.01 + rng.next() * 0.008, ph: rng.next() });
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.5, h * 0.62, h * 0.7, '#ff5a1a', 0.35);
        glow(c, w * 0.5, h * 1.0, h * 0.8, '#ff7a2a', 0.2);
        // 山のシルエット
        var pts = [[0, 1], [0.16, 0.88], [0.34, 0.68], [0.43, 0.6], [0.47, 0.625], [0.53, 0.625], [0.57, 0.6], [0.66, 0.68], [0.84, 0.88], [1, 1]];
        c.fillStyle = '#150808';
        c.beginPath();
        pts.forEach(function (p, k) { if (k === 0) c.moveTo(p[0] * w, p[1] * h); else c.lineTo(p[0] * w, p[1] * h); });
        c.closePath();
        c.fill();
        // 溶岩の筋
        c.save();
        c.lineCap = 'round';
        c.shadowColor = 'rgba(255,120,40,0.8)';
        c.shadowBlur = h * 0.02;
        c.strokeStyle = 'rgba(255,140,60,0.65)';
        [[0.49, 0.628, 0.44, 0.7, 0.4, 0.8, 0.34, 0.92], [0.51, 0.628, 0.56, 0.72, 0.6, 0.82, 0.66, 0.94], [0.5, 0.63, 0.5, 0.74, 0.49, 0.85, 0.5, 0.97]].forEach(function (l, k) {
          c.lineWidth = 2.5 - k * 0.4;
          c.beginPath();
          c.moveTo(l[0] * w, l[1] * h);
          c.bezierCurveTo(l[2] * w, l[3] * h, l[4] * w, l[5] * h, l[6] * w, l[7] * h);
          c.stroke();
        });
        c.restore();
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 4, '#ffd8c0', 0.5);
        // 火口のゆらぎ
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowFast(ctx, w * 0.5 + px * 4, h * 0.6, h * 0.45, '#ff8a3a', 0.2 + 0.1 * Math.sin(t * 0.0021) + 0.05 * Math.sin(t * 0.0057));
        ctx.restore();
        // けむり
        var sprite = puffSprite([86, 42, 42]);
        for (var si = 0; si < smokes.length; si++) {
          var s = smokes[si];
          var u = wrap01(s.ph + t * 0.001 * s.sp);
          var r = (s.r + u * 0.1) * h * 1.4;
          ctx.globalAlpha = 0.16 * Math.sin(u * Math.PI);
          ctx.drawImage(sprite, (s.x + Math.sin(t * 0.0004 + s.ph * 6) * 0.04) * w + px * 8 - r, (0.58 - u * 0.5) * h - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
        // 火の粉
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffb060';
        for (var ei = 0; ei < embers.length; ei++) {
          var e = embers[ei];
          var eu = wrap01(e.y + t * 0.001 * e.sp);
          var ex = 0.3 + e.x * 0.4 + Math.sin(t * 0.0009 + e.ph) * e.sw * 2 + (eu * (e.x - 0.5)) * 0.6;
          ctx.globalAlpha = Math.sin(eu * Math.PI) * 0.8;
          ctx.beginPath();
          ctx.arc(ex * w + px * 8, (0.62 - eu * 0.62) * h, e.size * 0.8, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド15 ゆめの ずかん: ただよう頁・すみれ色のもや・星
  // ---------------------------------------------------------------------------
  function makeDreamBook(world) {
    var rng = Rng.create('bg-15');
    var th = world.theme;
    var stars = makeStars(rng, 100, 0.9);
    var pages = [];
    for (var i = 0; i < 9; i++) {
      pages.push({ x: rng.next(), y: rng.next(), w: 0.06 + rng.next() * 0.05, rot: (rng.next() - 0.5) * 0.9, sp: 0.004 + rng.next() * 0.008, sw: 0.03 + rng.next() * 0.04, ph: rng.next() * TAU });
    }
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.2, h * 0.3, h * 0.8, '#a05ad8', 0.22);
        glow(c, w * 0.85, h * 0.7, h * 0.8, '#5a7ae8', 0.2);
        glow(c, w * 0.5, h * 0.05, h * 0.6, '#ffc8f0', 0.1);
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 6, '#fff0ff', 0.9);
        // ただよう頁
        for (var pi = 0; pi < pages.length; pi++) {
          var p = pages[pi];
          var y = 1.1 - wrap01(p.y + t * 0.001 * p.sp) * 1.25;
          var x = (p.x + Math.sin(t * 0.0004 + p.ph) * p.sw) * w + px * 14;
          var pw = p.w * h * 1.4;
          var ph = pw * 1.35;
          ctx.save();
          ctx.translate(x, y * h);
          ctx.rotate(p.rot + Math.sin(t * 0.0006 + p.ph) * 0.2);
          ctx.globalAlpha = 0.13;
          ctx.fillStyle = '#f2e8ff';
          ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = '#ffd0f4';
          ctx.lineWidth = 1;
          ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
          ctx.globalAlpha = 0.22;
          for (var l = 0; l < 4; l++) {
            ctx.beginPath();
            ctx.moveTo(-pw * 0.34, -ph * 0.3 + l * ph * 0.18);
            ctx.lineTo(pw * (0.34 - (l % 2) * 0.16), -ph * 0.3 + l * ph * 0.18);
            ctx.stroke();
          }
          ctx.restore();
        }
        // うずまきのかけら
        ctx.save();
        ctx.strokeStyle = '#ffc8f0';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.14;
        for (var s = 0; s < 2; s++) {
          ctx.beginPath();
          var cx = s ? w * 0.86 : w * 0.12;
          var cy = s ? h * 0.2 : h * 0.78;
          for (var k = 0; k < 80; k++) {
            var a = k * 0.18 + t * 0.0002 * (s ? -1 : 1);
            var rr = k * h * 0.0035;
            if (k === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          ctx.stroke();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド16 つきの うらがわ: 銀青のクレーター・天の川・静かな塵
  // ---------------------------------------------------------------------------
  function makeFarSide(world) {
    var rng = Rng.create('bg-16');
    var th = world.theme;
    var stars = makeStars(rng, 220, 0.8);
    var dust = makeDots(rng, 36, { sp: 0.004, sw: 0.01, size: 1.5 });
    var craters = [];
    for (var i = 0; i < 9; i++) craters.push({ x: rng.next(), y: 0.84 + rng.next() * 0.14, rx: 0.05 + rng.next() * 0.08, ry: 0.012 + rng.next() * 0.02 });
    var shooter = makeShooter();
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        // 天の川の帯
        c.save();
        c.translate(w * 0.5, h * 0.3);
        c.rotate(-0.45);
        var g = c.createLinearGradient(0, -h * 0.2, 0, h * 0.2);
        g.addColorStop(0, 'rgba(200,224,255,0)');
        g.addColorStop(0.5, 'rgba(200,224,255,0.1)');
        g.addColorStop(1, 'rgba(200,224,255,0)');
        c.fillStyle = g;
        c.fillRect(-w, -h * 0.2, w * 2, h * 0.4);
        c.restore();
        // 月面（下）
        var surf = c.createLinearGradient(0, h * 0.8, 0, h);
        surf.addColorStop(0, '#2a3848');
        surf.addColorStop(1, '#10161f');
        c.fillStyle = surf;
        hillPath(c, w, h, h * 0.84, h * 0.012, 1.2, 0.7, 0);
        c.fill();
        craters.forEach(function (cr) {
          c.strokeStyle = 'rgba(200,220,245,0.22)';
          c.lineWidth = 1.2;
          c.beginPath();
          c.ellipse(cr.x * w, cr.y * h, cr.rx * w * 0.5, cr.ry * h, 0, 0, TAU);
          c.stroke();
          c.fillStyle = 'rgba(8,12,18,0.4)';
          c.beginPath();
          c.ellipse(cr.x * w, cr.y * h + 1, cr.rx * w * 0.44, cr.ry * h * 0.8, 0, 0, TAU);
          c.fill();
        });
      },
      draw: function (ctx, w, h, t, px, py, still) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 5, '#e8f2ff', 0.9);
        drawShooter(ctx, shooter, w, h, t, still, '#dff0ff');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#c8e0ff';
        for (var di = 0; di < dust.length; di++) {
          var d = dust[di];
          var y = wrap01(d.y - t * 0.001 * d.sp);
          ctx.globalAlpha = 0.18 + 0.18 * Math.sin(t * 0.001 + d.ph);
          ctx.beginPath();
          ctx.arc((d.x + Math.sin(t * 0.0004 + d.ph) * d.sw) * w + px * 10, y * h, d.size * 0.8, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド17 ほしの うみ: 渦まく銀河・星くずの波
  // ---------------------------------------------------------------------------
  function makeStarSea(world) {
    var rng = Rng.create('bg-17');
    var th = world.theme;
    var stars = makeStars(rng, 200, 1);
    var arm = [];
    for (var i = 0; i < 170; i++) {
      var u = rng.next();
      arm.push({ u: u, a: (i % 2) * Math.PI, jit: (rng.next() - 0.5) * 0.18, jr: (rng.next() - 0.5) * 0.04, size: 0.7 + rng.next() * 1.3, ph: rng.next() * TAU });
    }
    var shooter = makeShooter();
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.78, h * 0.28, h * 0.6, '#7ff5e0', 0.14);
        glow(c, w * 0.2, h * 0.75, h * 0.7, '#a03ad0', 0.2);
        glow(c, w * 0.55, h * 1.0, h * 0.7, '#3a5ad8', 0.22);
      },
      draw: function (ctx, w, h, t, px, py, still) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 7, '#f0eaff', 1);
        drawShooter(ctx, shooter, w, h, t, still, '#ffffff');
        // 銀河のうず
        var gx = w * 0.78 + px * 8;
        var gy = h * 0.28;
        var R = h * 0.26;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(gx, gy);
        ctx.rotate(-0.4);
        ctx.scale(1, 0.55);
        ctx.fillStyle = '#d8d0ff';
        for (var ai = 0; ai < arm.length; ai++) {
          var p = arm[ai];
          var rad = p.u * R;
          var ang = p.a + p.u * 4.4 + p.jit + t * 0.00008;
          ctx.globalAlpha = (0.25 + 0.5 * (1 - p.u)) * (0.7 + 0.3 * Math.sin(t * 0.0015 + p.ph));
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * (rad + p.jr * R), Math.sin(ang) * (rad + p.jr * R), p.size, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        glowFast(ctx, 0, 0, R * 0.55, '#fff0d0', 0.4);
        ctx.restore();
        // 星くずの波
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#9ff5ff';
        for (var r = 0; r < 4; r++) {
          var yy = h * (0.84 + r * 0.045);
          for (var x = 0; x <= w; x += 22) {
            var y2 = yy + Math.sin(x * 0.012 + t * 0.0009 * (1 + r * 0.2) + r * 2) * (3 + r);
            ctx.globalAlpha = 0.12 + 0.2 * Math.max(0, Math.sin(x * 0.05 + t * 0.002 + r));
            ctx.fillRect(x, y2, 2, 2);
          }
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド18 ほしの たまてばこ: 金色の光の筋・宝石・歯車
  // ---------------------------------------------------------------------------
  function makeTreasure(world) {
    var rng = Rng.create('bg-18');
    var th = world.theme;
    var stars = makeStars(rng, 140, 0.8);
    var gems = [];
    var palette = ['#ffe08a', '#ffb3e0', '#9ff5ff', '#d4b8ff'];
    for (var i = 0; i < 14; i++) {
      gems.push({ x: rng.next(), y: rng.next(), r: 0.012 + rng.next() * 0.014, sp: 0.006 + rng.next() * 0.01, sw: 0.02 + rng.next() * 0.03, ph: rng.next() * TAU, color: palette[i % 4], kind: i % 2 });
    }
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.5, h * 1.0, h * 1.0, '#ffd070', 0.32);
        glow(c, w * 0.5, h * 0.0, h * 0.7, '#a05ad8', 0.16);
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 6, '#fff4d8', 0.9);
        // 金色の光の筋（ゆっくり回る）
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(w * 0.5 + px * 6, h * 1.08);
        ctx.rotate(t * 0.00003);
        var len = Math.max(w, h) * 1.3;
        var g = ctx.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, 'rgba(255,220,130,0.12)');
        g.addColorStop(1, 'rgba(255,220,130,0)');
        ctx.fillStyle = g;
        for (var k = 0; k < 14; k++) {
          ctx.save();
          ctx.rotate((k / 14) * TAU);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-len * 0.06, -len);
          ctx.lineTo(len * 0.06, -len);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        drawGear(ctx, w * 0.06 + px * 10, h * 0.86, h * 0.26, 16, t * 0.00008, '#ffe08a', 0.14);
        drawGear(ctx, w * 0.95 + px * 10, h * 0.16, h * 0.22, 13, -t * 0.0001, '#ffe08a', 0.13);
        // ただよう宝石
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var gi = 0; gi < gems.length; gi++) {
          var gm = gems[gi];
          var y = 1.08 - wrap01(gm.y + t * 0.001 * gm.sp) * 1.2;
          var x = (gm.x + Math.sin(t * 0.0005 + gm.ph) * gm.sw) * w + px * 14;
          var r = gm.r * h * 1.4;
          var tw = 0.6 + 0.4 * Math.sin(t * 0.002 + gm.ph);
          glowFast(ctx, x, y * h, r * 3.4, gm.color, 0.3 * tw);
          ctx.save();
          ctx.translate(x, y * h);
          ctx.rotate(t * 0.0006 + gm.ph);
          ctx.globalAlpha = 0.75 * tw;
          ctx.fillStyle = gm.color;
          ctx.beginPath();
          if (gm.kind) {
            ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0);
          } else {
            for (var s = 0; s < 8; s++) {
              var a = (s / 8) * TAU;
              var rr = s % 2 ? r * 0.4 : r;
              ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      },
    };
  }

  var B = Orgel.Background;
  B.register(6, makeForest);
  B.register(7, makeIce);
  B.register(8, makeDesert);
  B.register(9, makeHarbor);
  B.register(10, makeLighthouse);
  B.register(11, makeDeepSea);
  B.register(12, makeClockwork);
  B.register(13, makeRainbow);
  B.register(14, makeVolcano);
  B.register(15, makeDreamBook);
  B.register(16, makeFarSide);
  B.register(17, makeStarSea);
  B.register(18, makeTreasure);

  if (typeof module !== 'undefined' && module.exports) { module.exports = { registered: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] }; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
