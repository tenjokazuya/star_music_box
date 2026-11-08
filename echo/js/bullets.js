/* bullets.js ― 敵弾プール・弾幕パターン・ビーム
 * 座標はすべてプレイ空間ローカル(0..192, 0..224) */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, U = EB.U, Spr = EB.Spr, G = EB.Gfx;
  var FW = CFG.FW, FH = CFG.FH, TAU = U.TAU;

  var list = [], i;
  for (i = 0; i < CFG.MAX_BULLETS; i++) list.push({ on: false });
  var cursor = 0, count = 0;
  var D = CFG.DIFF.normal;          // 現在の難易度（Game が差し替える）
  var beams = [];

  function alloc() {
    for (var k = 0; k < list.length; k++) {
      cursor = (cursor + 1) % list.length;
      if (!list[cursor].on) return list[cursor];
    }
    return null;
  }

  var Bullets = {
    list: list, beams: beams,
    get count() { return count; },
    setDifficulty: function (d) { D = d; },
    reset: function () { for (var k = 0; k < list.length; k++) list[k].on = false; count = 0; beams.length = 0; },

    spawn: function (x, y, ang, spd, kind, color, o) {
      var b = alloc();
      if (!b) return null;
      var k = Spr.bullet(kind, color);
      spd *= D.spd;
      b.on = true; b.x = x; b.y = y; b.ang = ang; b.spd = spd;
      b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
      b.fr = k.fr; b.r = k.r; b.rot = k.rot; b.idx = k.rot ? ((Math.round(ang / TAU * k.rot) % k.rot) + k.rot) % k.rot : 0;
      b.grazed = false; b.age = 0; b.da = 0; b.ds = 0; b.smin = 0; b.smax = 99; b.hm = 0; b.fn = null; b.delay = 0; b.keep = false;
      if (o) {
        if (o.da) b.da = o.da; if (o.ds) b.ds = o.ds * 1; if (o.smin !== undefined) b.smin = o.smin; if (o.smax !== undefined) b.smax = o.smax;
        if (o.hm) b.hm = o.hm; if (o.fn) b.fn = o.fn; if (o.delay) b.delay = o.delay; if (o.keep) b.keep = true;
      }
      count++;
      return b;
    },

    update: function () {
      var P = EB.W.player, c = 0;
      for (var k = 0; k < list.length; k++) {
        var b = list[k];
        if (!b.on) continue;
        if (b.delay > 0) { b.delay--; b.age++; c++; continue; }
        if (b.ds || b.da) {
          b.spd = U.clamp(b.spd + b.ds, b.smin, b.smax); b.ang += b.da;
          b.vx = Math.cos(b.ang) * b.spd; b.vy = Math.sin(b.ang) * b.spd;
          if (b.rot) b.idx = ((Math.round(b.ang / TAU * b.rot) % b.rot) + b.rot) % b.rot;
        }
        if (b.hm > 0) {
          b.hm--;
          var ta = Math.atan2(P.y - b.y, P.x - b.x), d = U.wrapAng(ta - b.ang);
          b.ang += U.clamp(d, -0.035, 0.035);
          b.vx = Math.cos(b.ang) * b.spd; b.vy = Math.sin(b.ang) * b.spd;
          if (b.rot) b.idx = ((Math.round(b.ang / TAU * b.rot) % b.rot) + b.rot) % b.rot;
        }
        if (b.fn) b.fn(b);
        b.x += b.vx; b.y += b.vy; b.age++;
        if (b.x < -20 || b.x > FW + 20 || b.y < -20 || b.y > FH + 20) { if (!b.keep || b.age > 900) { b.on = false; continue; } }
        c++;
      }
      count = c;
      // ビーム
      for (var j = beams.length - 1; j >= 0; j--) {
        var bm = beams[j];
        bm.t++;
        if (bm.follow) bm.follow(bm);
        if (bm.t === bm.warn) EB.Audio.se('laser', bm.dur / 60);
        if (bm.t >= bm.warn + bm.dur) beams.splice(j, 1);
      }
    },

    draw: function (ctx) {
      for (var k = 0; k < list.length; k++) {
        var b = list[k];
        if (!b.on) continue;
        var s = b.fr[b.rot ? b.idx : (b.fr.length > 1 ? ((b.age >> 3) & 1) : 0)];
        ctx.drawImage(s.c, Math.round(b.x - s.ox), Math.round(b.y - s.oy));
      }
    },

    drawBeams: function (ctx) {
      for (var j = 0; j < beams.length; j++) {
        var bm = beams[j], ca = Math.cos(bm.ang), sa = Math.sin(bm.ang);
        var on = bm.t >= bm.warn, w = bm.w;
        var col = bm.color || '#ff4060';
        if (!on) {
          if ((bm.t >> 2) & 1) {
            ctx.fillStyle = col;
            for (var d = 0; d < bm.len; d += 6) ctx.fillRect(Math.round(bm.x + ca * d), Math.round(bm.y + sa * d), 1, 1);
          }
          continue;
        }
        var k = Math.min(1, (bm.t - bm.warn) / 6, (bm.warn + bm.dur - bm.t) / 6);
        var ww = Math.max(1, Math.round(w * k));
        for (var d2 = 0; d2 < bm.len; d2 += 2) {
          var px = bm.x + ca * d2, py = bm.y + sa * d2;
          ctx.fillStyle = col; ctx.fillRect(Math.round(px - ww), Math.round(py - ww), ww * 2 + 1, ww * 2 + 1);
        }
        ctx.fillStyle = '#ffffff';
        var cw = Math.max(0, Math.round(ww * 0.45));
        for (var d3 = 0; d3 < bm.len; d3 += 2) {
          ctx.fillRect(Math.round(bm.x + ca * d3 - cw), Math.round(bm.y + sa * d3 - cw), cw * 2 + 1, cw * 2 + 1);
        }
      }
    },

    // ビーム生成  warn:予告フレーム dur:照射フレーム w:半幅
    beam: function (x, y, ang, warn, dur, w, color, follow) {
      var bm = { x: x, y: y, ang: ang, warn: warn, dur: dur, w: w, len: 300, t: 0, color: color, follow: follow || null };
      beams.push(bm);
      EB.Audio.se('laserWarn', warn / 60);
      return bm;
    },
    // ビームとの当たり判定（円）
    hitBeam: function (px, py, pr) {
      for (var j = 0; j < beams.length; j++) {
        var bm = beams[j];
        if (bm.t < bm.warn + 4 || bm.t > bm.warn + bm.dur - 4) continue;
        var ca = Math.cos(bm.ang), sa = Math.sin(bm.ang), dx = px - bm.x, dy = py - bm.y;
        var along = dx * ca + dy * sa;
        if (along < 0 || along > bm.len) continue;
        var perp = Math.abs(-dx * sa + dy * ca);
        if (perp < bm.w * 0.8 + pr) return true;
      }
      return false;
    },

    // 弾消し。mode: 'gem'=スコアジェムに変換 / 'spark'=火花 / 'none'
    clear: function (mode, keepRadius) {
      var gems = 0, P = EB.W.player;
      for (var k = 0; k < list.length; k++) {
        var b = list[k];
        if (!b.on) continue;
        if (keepRadius && U.dist2(b.x, b.y, P.x, P.y) > keepRadius * keepRadius) continue;
        b.on = false;
        if (mode === 'gem' && gems < 60 && (k % 2 === 0)) { gems++; EB.Items.spawn('gem', b.x, b.y, { vy: -1.2 }); }
        else if (mode === 'spark' && (k % 3 === 0)) EB.FX.spark(b.x, b.y, 2, '#ffffff', 0.8);
      }
      beams.length = 0;
      count = 0;
    }
  };
  EB.Bullets = Bullets;

  // ================= 弾幕パターン =================
  function N(n) { return Math.max(1, Math.round(n * D.cnt)); }
  var Pat = {
    N: N,
    aimAng: function (x, y) { var P = EB.W.player; return Math.atan2(P.y - y, P.x - x); },
    // 自機狙い単発（ブレあり）
    aim: function (x, y, spd, kind, color, spread, o) {
      var a = Pat.aimAng(x, y) + (spread ? (U.rng.next() - 0.5) * spread : 0);
      return Bullets.spawn(x, y, a, spd, kind, color, o);
    },
    ring: function (x, y, n, spd, off, kind, color, o) {
      n = N(n);
      for (var k = 0; k < n; k++) Bullets.spawn(x, y, off + k / n * TAU, spd, kind, color, o);
    },
    // 扇状。ang 中心角, spread 全体角
    fan: function (x, y, ang, n, spread, spd, kind, color, o) {
      n = N(n);
      if (n === 1) { Bullets.spawn(x, y, ang, spd, kind, color, o); return; }
      for (var k = 0; k < n; k++) Bullets.spawn(x, y, ang - spread / 2 + spread * k / (n - 1), spd, kind, color, o);
    },
    aimFan: function (x, y, n, spread, spd, kind, color, o) { Pat.fan(x, y, Pat.aimAng(x, y), n, spread, spd, kind, color, o); },
    // 速度違いの連なり(n-way × 段)
    stack: function (x, y, ang, rows, spd, dspd, kind, color, o) {
      rows = N(rows);
      for (var k = 0; k < rows; k++) Bullets.spawn(x, y, ang, spd + dspd * k, kind, color, o);
    },
    // 画面上部から降る雨
    rain: function (n, spd, kind, color, o) {
      n = N(n);
      for (var k = 0; k < n; k++) Bullets.spawn(U.rng.range(4, FW - 4), -6, U.PI / 2 + U.rng.range(-0.12, 0.12), spd * U.rng.range(0.8, 1.2), kind, color, o);
    },
    // 画面幅を横切る弾の壁（隙間つき）
    wall: function (y, spd, gapX, gapW, kind, color, step) {
      step = step || 12;
      for (var x = 6; x < FW; x += step) {
        if (Math.abs(x - gapX) < gapW / 2) continue;
        Bullets.spawn(x, y, U.PI / 2, spd, kind, color);
      }
    },
    // 全方位ランダム
    burst: function (x, y, n, spdMin, spdMax, kind, color, o) {
      n = N(n);
      for (var k = 0; k < n; k++) Bullets.spawn(x, y, U.rng.range(0, TAU), U.rng.range(spdMin, spdMax), kind, color, o);
    },
    // 左右の壁から
    sides: function (n, spd, kind, color) {
      n = N(n);
      for (var k = 0; k < n; k++) {
        var y = U.rng.range(10, FH * 0.7), left = (k & 1) === 0;
        Bullets.spawn(left ? -4 : FW + 4, y, left ? 0.18 : U.PI - 0.18, spd, kind, color);
      }
    },
    // 曲がって加速する花弁
    flower: function (x, y, petals, n, spd, off, kind, color) {
      n = N(n);
      for (var p = 0; p < petals; p++) {
        for (var k = 0; k < n; k++) {
          Bullets.spawn(x, y, off + p / petals * TAU, spd * (0.55 + k * 0.28), kind, color, { da: (k % 2 ? 1 : -1) * 0.012, ds: 0.0, delay: 0 });
        }
      }
    }
  };
  EB.Pat = Pat;
})();
