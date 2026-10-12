(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Util = Orgel.Util;
  var Rng = Orgel.Rng;
  var rgba = Util.rgba;

  /**
   * ワールド別の背景（すべてコードで描く）。
   *   var bg = Background.create(worldId);
   *   bg.resize(w, h, dpr);                       // サイズ変更時
   *   bg.draw(ctx, w, h, timeMs, px, py);         // 毎フレーム。px,py は -1〜1 の視差入力（ポインタ位置など）
   *   bg.reduced = true;                          // 演出ひかえめ（動きを止める）
   * 色調は Worlds[n].theme。仕様: managements/project/game-design.md §8.3。
   */

  var TAU = Math.PI * 2;

  function makeBuffer(w, h, dpr) {
    var c = root.document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx: g };
  }

  function skyGradient(ctx, h, stops) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    stops.forEach(function (c, i) { g.addColorStop(i / (stops.length - 1), c); });
    return g;
  }

  function glow(ctx, x, y, r, color, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** 星の配列を作る（座標は 0〜1 の割合） */
  function makeStars(rng, n, yMax) {
    var stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: rng.next(),
        y: Math.pow(rng.next(), 1.3) * yMax,
        r: 0.5 + rng.next() * 1.3,
        ph: rng.next() * TAU,
        sp: 0.4 + rng.next() * 1.4,
        bright: rng.chance(0.12),
      });
    }
    return stars;
  }

  /**
   * 星を描く。毎フレームの文字列確保を避けるため、色は固定して globalAlpha で明るさを変える。
   * 小さな星は四角（fillRect）、明るい星は十字と丸で描く。
   */
  function drawStars(ctx, stars, w, h, t, px, py, depth, color, amount) {
    var ox = px * depth;
    var oy = py * depth * 0.6;
    ctx.save();
    ctx.fillStyle = color;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.55 + 0.45 * Math.sin(t * 0.001 * s.sp + s.ph);
      var a = tw * amount;
      if (a < 0.02) continue;
      var x = s.x * w + ox;
      var y = s.y * h + oy;
      ctx.globalAlpha = a;
      if (s.bright) {
        // 明るい星は十字に光らせる
        var l = s.r * 3.2 * tw;
        ctx.fillRect(x - l, y - 0.5, l * 2, 1);
        ctx.fillRect(x - 0.5, y - l, 1, l * 2);
        ctx.beginPath();
        ctx.arc(x, y, s.r * 0.9, 0, TAU);
        ctx.fill();
      } else {
        var r = s.r * 0.75;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  }

  var glowSprites = {};
  var puffSprites = {};

  /** 光の玉を描く（色ごとに事前描画したスプライトを拡大縮小して使う。毎フレーム呼んでも軽い） */
  function glowFast(ctx, x, y, r, color, alpha) {
    var sp = glowSprites[color];
    if (!sp) sp = glowSprites[color] = Orgel.Particles.glowSprite(color);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  /** やわらかい雲のかたまりのスプライト。rgb は [r,g,b]（中心の色。外側へ透明に消える） */
  function puffSprite(rgb) {
    var key = rgb.join(',');
    if (puffSprites[key]) return puffSprites[key];
    var c = root.document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(' + key + ',1)');
    grad.addColorStop(1, 'rgba(' + key + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    puffSprites[key] = c;
    return c;
  }

  /** ワールド4の雲海の色（奥→手前）。明るすぎて盤面と競合しないよう、淡い紫〜桃色に抑える */
  var PUFF_TONES = [[140, 112, 200], [176, 140, 222], [212, 168, 232]];

  /** 丘のシルエットを描く */
  function hillPath(ctx, w, h, baseY, amp, freq, phase, shift) {
    ctx.beginPath();
    ctx.moveTo(-10, h + 10);
    for (var x = -10; x <= w + 10; x += 12) {
      var u = (x + shift) / w;
      var y = baseY + Math.sin(u * freq * TAU + phase) * amp + Math.sin(u * freq * 2.3 * TAU + phase * 1.7) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + 10, h + 10);
    ctx.closePath();
  }

  // ---------------------------------------------------------------------------
  // ワールド1 ゆうぐれの おか
  // ---------------------------------------------------------------------------
  function makeDusk(world) {
    var rng = Rng.create('bg-1');
    var th = world.theme;
    var stars = makeStars(rng, 120, 0.62);
    var flies = [];
    for (var i = 0; i < 16; i++) {
      flies.push({ x: rng.next(), y: 0.62 + rng.next() * 0.34, ax: 0.02 + rng.next() * 0.05, ay: 0.01 + rng.next() * 0.03,
        sp: 0.15 + rng.next() * 0.35, ph: rng.next() * TAU, size: 1.4 + rng.next() * 1.6 });
    }
    var clouds = [];
    for (i = 0; i < 5; i++) {
      clouds.push({ x: rng.next(), y: 0.22 + rng.next() * 0.3, w: 0.18 + rng.next() * 0.22, sp: 0.004 + rng.next() * 0.006 });
    }
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.32, h * 0.8, h * 0.75, '#ffb070', 0.5);
        glow(c, w * 0.32, h * 0.8, h * 0.28, '#ffe0a0', 0.45);
      },
      draw: function (ctx, w, h, t, px, py, still) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 6, '#fff4e0', 0.9);
        // 夕焼け雲
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var ci = 0; ci < clouds.length; ci++) {
          var cl = clouds[ci];
          var cx = ((cl.x + t * 0.001 * cl.sp) % 1.3 - 0.15) * w + px * 10;
          // 細長い雲: 光の玉のスプライトを横に引き伸ばして描く
          glowFast(ctx, 0, 0, 0, '#ffaa8c', 0);   // スプライトを用意しておく
          ctx.save();
          ctx.translate(cx, cl.y * h);
          ctx.scale(1, 0.12);
          ctx.globalAlpha = 0.16;
          ctx.drawImage(glowSprites['#ffaa8c'], -cl.w * w * 0.9, -cl.w * w * 0.9, cl.w * w * 1.8, cl.w * w * 1.8);
          ctx.restore();
        }
        ctx.restore();
        // 丘（遠・中・近）
        ctx.fillStyle = '#4b2a73';
        hillPath(ctx, w, h, h * 0.74, h * 0.03, 1.1, 0.5, px * 6);
        ctx.fill();
        ctx.fillStyle = '#331a58';
        hillPath(ctx, w, h, h * 0.82, h * 0.035, 0.9, 2.1, px * 12);
        ctx.fill();
        ctx.fillStyle = '#1d0f3b';
        hillPath(ctx, w, h, h * 0.91, h * 0.03, 1.3, 4.0, px * 20);
        ctx.fill();
        // ホタル
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#f4ffc0';
        for (var fi = 0; fi < flies.length; fi++) {
          var f = flies[fi];
          var tt = t * 0.001 * f.sp + f.ph;
          var x = (f.x + Math.sin(tt) * f.ax) * w + px * 18;
          var y = (f.y + Math.cos(tt * 1.3) * f.ay) * h;
          var a = 0.5 + 0.5 * Math.sin(tt * 2.2);
          glowFast(ctx, x, y, 12 + f.size * 3, '#d8ff7a', 0.6 * a);
          ctx.globalAlpha = 0.9 * a;
          ctx.beginPath();
          ctx.arc(x, y, f.size * 0.6, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド2 ひかりの どうくつ
  // ---------------------------------------------------------------------------
  function makeCave(world) {
    var rng = Rng.create('bg-2');
    var th = world.theme;
    var crystals = [];
    // 左右と下の縁に水晶の群れ
    function cluster(cx, base, dirX, dirY, n) {
      for (var i = 0; i < n; i++) {
        crystals.push({
          cx: cx + (rng.next() - 0.5) * 0.12, cy: base + (rng.next() - 0.5) * 0.08,
          len: 0.08 + rng.next() * 0.16, wid: 0.015 + rng.next() * 0.02,
          ang: Math.atan2(dirY, dirX) + (rng.next() - 0.5) * 0.9, ph: rng.next() * TAU,
        });
      }
    }
    cluster(0.02, 0.95, 0.5, -1, 7);
    cluster(0.98, 0.95, -0.5, -1, 7);
    cluster(0.0, 0.3, 1, 0.2, 4);
    cluster(1.0, 0.25, -1, 0.3, 4);
    cluster(0.5, 1.02, 0, -1, 6);
    var spores = [];
    for (var i = 0; i < 46; i++) {
      spores.push({ x: rng.next(), y: rng.next(), sp: 0.01 + rng.next() * 0.025, sw: 0.01 + rng.next() * 0.02,
        ph: rng.next() * TAU, size: 1 + rng.next() * 2.2 });
    }
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.5, h * 0.45, h * 0.9, '#1a8a8a', 0.22);
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        // 光の筋
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var s = 0; s < 3; s++) {
          var sway = Math.sin(t * 0.0003 + s * 2) * 0.03;
          var x0 = (0.18 + s * 0.3 + sway) * w + px * 10;
          var g = ctx.createLinearGradient(x0, 0, x0 + w * 0.22, h);
          g.addColorStop(0, 'rgba(127,245,224,0.10)');
          g.addColorStop(1, 'rgba(127,245,224,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x0, 0);
          ctx.lineTo(x0 + w * 0.1, 0);
          ctx.lineTo(x0 + w * 0.34, h);
          ctx.lineTo(x0 + w * 0.12, h);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        // 水晶
        ctx.strokeStyle = '#b8fff2';
        ctx.lineWidth = 1;
        for (var ci = 0; ci < crystals.length; ci++) {
          var cr = crystals[ci];
          var x = cr.cx * w + px * 14;
          var y = cr.cy * h;
          var len = cr.len * h;
          var wid = cr.wid * h;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(cr.ang + Math.PI / 2);
          var pulse = 0.55 + 0.45 * Math.sin(t * 0.0012 + cr.ph);
          ctx.beginPath();
          ctx.moveTo(-wid, 0);
          ctx.lineTo(0, -len);
          ctx.lineTo(wid, 0);
          ctx.closePath();
          // グラデーションは水晶ごとに1度だけ作って使い回す（明るさの脈動は globalAlpha で表す）
          if (cr.gradH !== h) {
            cr.grad = ctx.createLinearGradient(0, 0, 0, -len);
            cr.grad.addColorStop(0, '#0d3b44');
            cr.grad.addColorStop(1, 'rgba(63,224,204,0.9)');
            cr.gradH = h;
          }
          ctx.fillStyle = cr.grad;
          ctx.globalAlpha = 0.78 + pulse * 0.22;
          ctx.fill();
          ctx.globalAlpha = 0.35 * pulse;
          ctx.stroke();
          ctx.restore();
        }
        // 光の粒
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#9ffff0';
        for (var si = 0; si < spores.length; si++) {
          var sp = spores[si];
          var sy = (((sp.y - t * 0.001 * sp.sp) % 1) + 1) % 1;
          var sx = sp.x + Math.sin(t * 0.0006 + sp.ph) * sp.sw;
          ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.0015 + sp.ph);
          ctx.beginPath();
          ctx.arc(sx * w + px * 8, sy * h, sp.size, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド3 つきよの うみ
  // ---------------------------------------------------------------------------
  function makeSea(world) {
    var rng = Rng.create('bg-3');
    var th = world.theme;
    var stars = makeStars(rng, 130, 0.55);
    var glints = [];
    for (var i = 0; i < 40; i++) {
      glints.push({ x: 0.62 + (rng.next() - 0.5) * 0.18, y: 0.6 + rng.next() * 0.38, ph: rng.next() * TAU, sp: 0.6 + rng.next() * 1.6 });
    }
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        // 海面（水平線より下を少し暗く）
        var sea = c.createLinearGradient(0, h * 0.6, 0, h);
        sea.addColorStop(0, 'rgba(8,24,70,0.55)');
        sea.addColorStop(1, 'rgba(2,8,30,0.85)');
        c.fillStyle = sea;
        c.fillRect(0, h * 0.6, w, h * 0.4);
        // 月明かり
        glow(c, w * 0.72, h * 0.2, h * 0.5, '#bcd4ff', 0.28);
        // 月
        var mg = c.createRadialGradient(w * 0.72, h * 0.2, 0, w * 0.72, h * 0.2, h * 0.07);
        mg.addColorStop(0, '#ffffff');
        mg.addColorStop(0.7, '#e8f0ff');
        mg.addColorStop(1, '#bcd4ff');
        c.fillStyle = mg;
        c.beginPath();
        c.arc(w * 0.72, h * 0.2, h * 0.065, 0, TAU);
        c.fill();
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 5, '#e6f0ff', 0.85);
        // 月の道（海面に伸びる光）
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var mx = w * 0.72 + px * 6;
        var path = ctx.createLinearGradient(0, h * 0.6, 0, h);
        path.addColorStop(0, 'rgba(190,215,255,0.28)');
        path.addColorStop(1, 'rgba(190,215,255,0)');
        ctx.fillStyle = path;
        ctx.beginPath();
        ctx.moveTo(mx - w * 0.015, h * 0.6);
        ctx.lineTo(mx + w * 0.015, h * 0.6);
        ctx.lineTo(mx + w * 0.11, h);
        ctx.lineTo(mx - w * 0.11, h);
        ctx.closePath();
        ctx.fill();
        // きらめき
        ctx.fillStyle = '#e8f2ff';
        for (var gi = 0; gi < glints.length; gi++) {
          var gl = glints[gi];
          var a = Math.max(0, Math.sin(t * 0.001 * gl.sp + gl.ph));
          if (a < 0.2) continue;
          var gx = gl.x * w + px * 6 + Math.sin(t * 0.0004 + gl.ph) * 6;
          var gy = gl.y * h;
          ctx.globalAlpha = a * 0.7;
          ctx.fillRect(gx - 6 * a, gy - 0.8, 12 * a, 1.6);
        }
        ctx.globalAlpha = 1;
        // 波の線
        ctx.strokeStyle = '#9fc7ff';
        ctx.lineWidth = 1.2;
        for (var r = 0; r < 7; r++) {
          var yy = h * (0.64 + r * 0.05);
          ctx.globalAlpha = 0.07 + r * 0.012;
          ctx.beginPath();
          for (var x = 0; x <= w; x += 14) {
            var y2 = yy + Math.sin(x * 0.012 + t * 0.0009 * (1 + r * 0.15) + r) * (2 + r * 0.8) + px * 2;
            if (x === 0) ctx.moveTo(x, y2); else ctx.lineTo(x, y2);
          }
          ctx.stroke();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド4 くもの うえ
  // ---------------------------------------------------------------------------
  function makeClouds(world) {
    var rng = Rng.create('bg-4');
    var th = world.theme;
    var stars = makeStars(rng, 90, 0.5);
    var puffs = [];
    for (var layer = 0; layer < 3; layer++) {
      for (var i = 0; i < 14; i++) {
        puffs.push({ layer: layer, x: rng.next(), y: 0.72 + layer * 0.07 + rng.next() * 0.1, r: 0.07 + rng.next() * 0.1 + layer * 0.02, sp: 0.004 + layer * 0.004 + rng.next() * 0.003 });
      }
    }
    var ribbons = [
      { y: 0.2, amp: 0.05, hue: '#6ee7c8', ph: 0, sp: 0.00022 },
      { y: 0.3, amp: 0.06, hue: '#ff9be0', ph: 2, sp: 0.00017 },
      { y: 0.14, amp: 0.04, hue: '#9b8cff', ph: 4, sp: 0.00026 },
    ];
    var shooting = { t: 0, x: 0, y: 0, life: 0 };
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
      },
      draw: function (ctx, w, h, t, px, py, still) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 5, '#ffeefc', 0.85);
        // オーロラ
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ribbons.forEach(function (rb) {
          var g = ctx.createLinearGradient(0, rb.y * h - h * 0.12, 0, rb.y * h + h * 0.2);
          g.addColorStop(0, rgba(rb.hue, 0));
          g.addColorStop(0.5, rgba(rb.hue, 0.2));
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
        // 流れ星
        if (!still) {
          shooting.t += 16;
          if (shooting.life <= 0 && shooting.t > 7000 + (t % 5000)) {
            shooting.life = 1; shooting.t = 0; shooting.x = 0.15 + ((t * 7) % 60) / 100 * 0.7; shooting.y = 0.05 + ((t * 3) % 25) / 100;
          }
        }
        if (shooting.life > 0) {
          shooting.life -= 0.012;
          var sx = shooting.x * w + (1 - shooting.life) * w * 0.25;
          var sy = shooting.y * h + (1 - shooting.life) * h * 0.14;
          var sg = ctx.createLinearGradient(sx, sy, sx - w * 0.08, sy - h * 0.04);
          sg.addColorStop(0, rgba('#ffffff', Math.max(0, shooting.life)));
          sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = sg;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - w * 0.08, sy - h * 0.04);
          ctx.stroke();
        }
        // 雲海（奥→手前）
        for (var layer = 0; layer < 3; layer++) {
          var sprite = puffSprite(PUFF_TONES[layer]);
          ctx.globalAlpha = 0.2 + layer * 0.06;
          for (var pi = 0; pi < puffs.length; pi++) {
            var p = puffs[pi];
            if (p.layer !== layer) continue;
            var x = ((p.x + t * 0.001 * p.sp) % 1.25 - 0.12) * w + px * (8 + layer * 8);
            var y = p.y * h;
            var r = p.r * h * 1.5;
            ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
          }
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ワールド5 ほしの ちゅうしん
  // ---------------------------------------------------------------------------
  function drawGear(ctx, x, y, r, teeth, rot, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = Math.max(1.5, r * 0.02);
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a0 = (i / teeth) * TAU;
      var a1 = ((i + 0.25) / teeth) * TAU;
      var a2 = ((i + 0.5) / teeth) * TAU;
      var a3 = ((i + 0.75) / teeth) * TAU;
      var ri = r * 0.86;
      if (i === 0) ctx.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri); else ctx.lineTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      ctx.lineTo(Math.cos(a3) * ri, Math.sin(a3) * ri);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, TAU);
    ctx.stroke();
    for (var s = 0; s < 4; s++) {
      ctx.beginPath();
      ctx.moveTo(Math.cos((s / 4) * TAU) * r * 0.12, Math.sin((s / 4) * TAU) * r * 0.12);
      ctx.lineTo(Math.cos((s / 4) * TAU) * r * 0.55, Math.sin((s / 4) * TAU) * r * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  function makeCosmos(world) {
    var rng = Rng.create('bg-5');
    var th = world.theme;
    var stars = makeStars(rng, 230, 1);
    var dust = [];
    for (var i = 0; i < 50; i++) {
      dust.push({ x: rng.next(), y: rng.next(), sp: 0.006 + rng.next() * 0.02, ph: rng.next() * TAU, size: 0.8 + rng.next() * 2 });
    }
    var buf = null;
    return {
      resize: function (w, h, dpr) {
        buf = makeBuffer(w, h, dpr);
        var c = buf.ctx;
        c.fillStyle = skyGradient(c, h, th.sky);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.2, h * 0.3, h * 0.8, '#b03aa8', 0.28);
        glow(c, w * 0.85, h * 0.7, h * 0.9, '#3a4ad8', 0.26);
        glow(c, w * 0.55, h * 0.1, h * 0.6, '#ffc870', 0.16);
        glow(c, w * 0.4, h * 0.95, h * 0.7, '#7a2ad8', 0.3);
      },
      draw: function (ctx, w, h, t, px, py) {
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 8, '#fff6dc', 1);
        // オルゴールの歯車
        drawGear(ctx, w * 0.1 + px * 10, h * 0.85, h * 0.32, 18, t * 0.00007, '#ffe08a', 0.16);
        drawGear(ctx, w * 0.9 + px * 10, h * 0.18, h * 0.26, 14, -t * 0.00009, '#ffe08a', 0.14);
        drawGear(ctx, w * 0.62 + px * 14, h * 1.02, h * 0.2, 11, t * 0.00012, '#ffcf70', 0.12);
        // きらめく塵
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffe9b0';
        for (var di = 0; di < dust.length; di++) {
          var d = dust[di];
          var y = (((d.y - t * 0.001 * d.sp) % 1) + 1) % 1;
          ctx.globalAlpha = 0.3 + 0.4 * Math.sin(t * 0.0013 + d.ph);
          ctx.beginPath();
          ctx.arc(d.x * w + px * 12, y * h, d.size, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // エンディング 夜明け（bg.progress が 0→1 で、夜から朝へ）
  // ---------------------------------------------------------------------------
  function makeDawn() {
    var rng = Rng.create('bg-dawn');
    var stars = makeStars(rng, 140, 0.7);
    var NIGHT = ['#0b0720', '#1b1440', '#3a2a78'];
    var DAWN = ['#3b3a8c', '#d97ab5', '#ffc08a'];
    var STEPS = 240;                  // 夜明けの進み具合を何段階に分けるか（段階が変わったときだけ空を描き直す）
    var self = { progress: 0 };
    var buf = null;                   // 空（グラデーションと太陽の光）を描いたバッファ
    var bufStep = -1;
    var size = { w: 0, h: 0, dpr: 1 };

    /** 空と太陽の光をバッファに描く。全面に重ねる大きな光の玉は塗る面積が広く重いので、毎フレームは描かない */
    function paintSky(w, h, dpr, step) {
      if (!buf || size.w !== w || size.h !== h || size.dpr !== dpr) {
        buf = makeBuffer(w, h, dpr);
        size.w = w; size.h = h; size.dpr = dpr;
      }
      var c = buf.ctx;
      var k = step / STEPS;
      var g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, Util.mix(NIGHT[0], DAWN[0], k));
      g.addColorStop(0.55, Util.mix(NIGHT[1], DAWN[1], k));
      g.addColorStop(1, Util.mix(NIGHT[2], DAWN[2], k));
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      // 昇る太陽（光の玉のスプライトを大きく拡大して使う）
      var sy = h * (1.05 - 0.3 * k);
      glowFast(c, w * 0.5, sy, h * 1.1, '#ffb070', 0.15 + 0.5 * k);
      glowFast(c, w * 0.5, sy, h * 0.4, '#fff0c0', 0.1 + 0.55 * k);
      bufStep = step;
    }

    var dprNow = 1;
    return {
      resize: function (w, h, dpr) { dprNow = dpr || 1; bufStep = -1; },
      draw: function (ctx, w, h, t, px, py) {
        var p = Util.clamp(self.progress, 0, 1);
        var k = Util.range01(p, 0, 1);
        var step = Math.round(k * STEPS);
        if (step !== bufStep || !buf || size.w !== w || size.h !== h) paintSky(w, h, dprNow, step);
        ctx.drawImage(buf.canvas, 0, 0, w, h);
        drawStars(ctx, stars, w, h, t, px, py, 6, '#fff4e0', 0.95 * (1 - k * 0.85));
        // 丘
        ctx.fillStyle = Util.mix('#331a58', '#6a3a78', k);
        hillPath(ctx, w, h, h * 0.84, h * 0.03, 0.9, 2.1, px * 10);
        ctx.fill();
        ctx.fillStyle = Util.mix('#1d0f3b', '#40285f', k);
        hillPath(ctx, w, h, h * 0.92, h * 0.028, 1.3, 4.0, px * 18);
        ctx.fill();
      },
      setProgress: function (v) { self.progress = v; },
    };
  }

  var MAKERS = [null, makeDusk, makeCave, makeSea, makeClouds, makeCosmos];
  var EXTRA = {};   // ワールド6〜18の背景（background-extra.js が register で登録する）

  /**
   * @param {number} worldId 1〜18、または 'dawn'（エンディング）
   * @returns {{resize:function, draw:function, reduced:boolean}}
   */
  function create(worldId) {
    var isDawn = worldId === 'dawn';
    var world = isDawn ? Orgel.Worlds[0] : (Orgel.Worlds[worldId - 1] || Orgel.Worlds[0]);
    var maker = isDawn ? makeDawn : (MAKERS[world.id] || EXTRA[world.id] || makeDusk);
    var inner = maker(world);
    var size = { w: 0, h: 0, dpr: 1 };
    var bg = {
      worldId: isDawn ? 'dawn' : world.id,
      reduced: false,
      /** 夜明けの進み具合（'dawn' のときだけ有効） */
      setProgress: function (v) { if (inner.setProgress) inner.setProgress(v); },
      resize: function (w, h, dpr) {
        size.w = w; size.h = h; size.dpr = dpr;
        inner.resize(w, h, dpr);
      },
      draw: function (ctx, w, h, t, px, py) {
        if (w !== size.w || h !== size.h) bg.resize(w, h, size.dpr);
        // 演出ひかえめのときは時間を止め、視差も無効にする
        inner.draw(ctx, w, h, bg.reduced ? 0 : t, bg.reduced ? 0 : (px || 0), bg.reduced ? 0 : (py || 0), bg.reduced);
      },
    };
    return bg;
  }

  /** ワールド6以降の背景を登録する（maker は makeDusk などと同じ形: world を受けて { resize, draw } を返す関数） */
  function register(id, maker) { EXTRA[id] = maker; }

  var Background = {
    create: create,
    register: register,
    // 背景の部品（background-extra.js で使い回す）
    helpers: {
      TAU: TAU, makeBuffer: makeBuffer, skyGradient: skyGradient, glow: glow, makeStars: makeStars, drawStars: drawStars,
      glowFast: glowFast, puffSprite: puffSprite, hillPath: hillPath, drawGear: drawGear,
    },
  };

  Orgel.Background = Background;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Background; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
