/* fx.js ― 爆発・粒子・浮遊テキスト・画面効果、およびアイテム */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, U = EB.U, Spr = EB.Spr, G = EB.Gfx;
  var FW = CFG.FW, FH = CFG.FH, TAU = U.TAU;

  var parts = [], i;
  for (i = 0; i < CFG.MAX_PARTICLES; i++) parts.push({ on: false });
  var cur = 0;
  var rng = U.fxRng;

  function alloc() {
    for (var k = 0; k < parts.length; k++) {
      cur = (cur + 1) % parts.length;
      if (!parts[cur].on) return parts[cur];
    }
    return null;
  }

  var FX = {
    parts: parts,
    reset: function () { for (var k = 0; k < parts.length; k++) parts[k].on = false; },

    // 爆発。size: 0小 1中 2大
    explode: function (x, y, size, quiet) {
      var p = alloc();
      var fr = Spr.expl[size];
      if (p) { p.on = true; p.type = 'expl'; p.x = x; p.y = y; p.fr = fr; p.age = 0; p.life = fr.length * (size === 2 ? 4 : 3); p.step = size === 2 ? 4 : 3; p.vx = 0; p.vy = 0; p.gy = 0; }
      FX.spark(x, y, size === 0 ? 5 : (size === 1 ? 10 : 22), '#ffd060', 1 + size * 0.5);
      if (size >= 1) FX.ring(x, y, 4, 16 + size * 14, 16 + size * 6, '#ffe8a0');
      if (!quiet) EB.Audio.se(size === 0 ? 'exp1' : (size === 1 ? 'exp2' : 'exp3'));
      if (size === 1) FX.shake(2, 10); else if (size === 2) FX.shake(4, 26);
    },
    spark: function (x, y, n, color, spd) {
      spd = spd || 1;
      for (var k = 0; k < n; k++) {
        var p = alloc(); if (!p) return;
        var a = rng.range(0, TAU), v = rng.range(0.4, 2.2) * spd;
        p.on = true; p.type = 'spark'; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.gy = 0.02;
        p.age = 0; p.life = Math.round(rng.range(14, 34)); p.color = color || '#ffffff'; p.size = rng.next() < 0.3 ? 2 : 1;
      }
    },
    smoke: function (x, y, n) {
      for (var k = 0; k < n; k++) {
        var p = alloc(); if (!p) return;
        p.on = true; p.type = 'smoke'; p.x = x + rng.range(-4, 4); p.y = y + rng.range(-4, 4); p.vx = rng.range(-0.3, 0.3); p.vy = rng.range(-0.5, 0.1); p.gy = 0;
        p.age = 0; p.life = Math.round(rng.range(20, 40)); p.size = Math.round(rng.range(2, 4)); p.color = '#605a70';
      }
    },
    ring: function (x, y, r0, r1, life, color) {
      var p = alloc(); if (!p) return;
      p.on = true; p.type = 'ring'; p.x = x; p.y = y; p.r0 = r0; p.r1 = r1; p.age = 0; p.life = life; p.color = color || '#ffffff'; p.vx = 0; p.vy = 0; p.gy = 0;
    },
    text: function (x, y, str, color) {
      var p = alloc(); if (!p) return;
      p.on = true; p.type = 'text'; p.x = x; p.y = y; p.vx = 0; p.vy = -0.5; p.gy = 0; p.age = 0; p.life = 38; p.str = str; p.color = color || '#ffffff';
    },
    // 軌跡（ボム・ショット用の細かな光）
    glow: function (x, y, color) {
      var p = alloc(); if (!p) return;
      p.on = true; p.type = 'spark'; p.x = x; p.y = y; p.vx = rng.range(-0.2, 0.2); p.vy = rng.range(-0.2, 0.2); p.gy = 0; p.age = 0; p.life = 10; p.color = color; p.size = 1;
    },
    shake: function (mag, frames) {
      var W = EB.W;
      if (mag >= W.shakeMag || W.shakeT <= 0) { W.shakeMag = mag; W.shakeT = frames; }
    },
    flash: function (color, frames, alpha) {
      var W = EB.W; W.flashColor = color; W.flashT = frames; W.flashMax = frames; W.flashA = alpha === undefined ? 0.8 : alpha;
    },

    update: function () {
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        if (!p.on) continue;
        p.age++;
        if (p.age >= p.life) { p.on = false; continue; }
        p.x += p.vx; p.y += p.vy; p.vy += p.gy;
        if (p.type === 'spark') { p.vx *= 0.97; p.vy *= 0.97; }
      }
    },
    draw: function (ctx) {
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        if (!p.on) continue;
        var t = p.age / p.life;
        switch (p.type) {
          case 'expl':
            var s = p.fr[Math.min(p.fr.length - 1, Math.floor(p.age / p.step))];
            ctx.drawImage(s.c, Math.round(p.x - s.ox), Math.round(p.y - s.oy));
            break;
          case 'spark':
            ctx.fillStyle = t > 0.7 ? '#ff8040' : p.color;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
            break;
          case 'smoke':
            ctx.globalAlpha = 1 - t; ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); ctx.globalAlpha = 1;
            break;
          case 'ring':
            var r = U.lerp(p.r0, p.r1, U.easeOut(t));
            ctx.globalAlpha = 1 - t; ctx.fillStyle = p.color;
            var steps = Math.max(12, Math.round(r * 1.6));
            for (var a = 0; a < steps; a++) {
              var an = a / steps * TAU;
              ctx.fillRect(Math.round(p.x + Math.cos(an) * r), Math.round(p.y + Math.sin(an) * r), 1, 1);
            }
            ctx.globalAlpha = 1;
            break;
          case 'text':
            G.text(p.str, p.x, p.y, p.color, { align: 'c', shadow: '#000', a: t > 0.7 ? (1 - t) / 0.3 : 1 });
            break;
        }
      }
    }
  };
  EB.FX = FX;

  // ================= アイテム =================
  var items = [];
  var IT = {
    p:   { spr: 'p',   r: 7 },
    pl:  { spr: 'pl',  r: 9 },
    b:   { spr: 'b',   r: 8 },
    up:  { spr: 'up',  r: 9 },
    gem: { spr: 'gem', r: 6 },
    gemBig: { spr: 'gemBig', r: 8 }
  };
  var Items = {
    list: items,
    reset: function () { items.length = 0; },
    spawn: function (kind, x, y, o) {
      if (items.length > 160 && kind === 'gem') return null;
      var it = { kind: kind, x: x, y: y, vx: (o && o.vx) || 0, vy: (o && o.vy) || -1.6, age: 0, magnet: false, spr: Spr.items[IT[kind].spr], r: IT[kind].r };
      if (o && o.vx === undefined && kind !== 'gem') it.vx = U.rng.range(-0.5, 0.5);
      items.push(it);
      return it;
    },
    update: function (W) {
      var P = W.player, auto = P.alive && (P.y < 56 || W.bombT > 0);
      for (var k = items.length - 1; k >= 0; k--) {
        var it = items[k];
        it.age++;
        if (!P.alive) it.magnet = false;
        else if (auto) it.magnet = true;
        else if (W.power >= 4 && (it.kind === 'gem' || it.kind === 'gemBig')) it.magnet = true;
        if (it.magnet && P.alive) {
          var a = Math.atan2(P.y - it.y, P.x - it.x), sp = Math.min(6.5, 2.5 + it.age * 0.04);
          it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp;
        } else {
          it.vy += 0.045; if (it.vy > 1.3) it.vy = 1.3;
          it.vx *= 0.97;
        }
        it.x += it.vx; it.y += it.vy;
        // 画面端で反射
        if (it.x < 4) { it.x = 4; it.vx = Math.abs(it.vx); } else if (it.x > FW - 4) { it.x = FW - 4; it.vx = -Math.abs(it.vx); }
        if (it.y > FH + 12) { items.splice(k, 1); continue; }
        if (P.alive && U.dist2(it.x, it.y, P.x, P.y) < (it.r + 7) * (it.r + 7)) {
          Items.collect(it, W);
          items.splice(k, 1);
        }
      }
    },
    collect: function (it, W) {
      var A = EB.Audio;
      switch (it.kind) {
        case 'p': W.addPower(0.25); W.addScore(10); A.se('item'); break;
        case 'pl': W.addPower(1); W.addScore(100); A.se('power'); FX.text(it.x, it.y - 8, 'POWER UP', '#ffe060'); break;
        case 'b': if (W.bombs < 7) W.bombs++; A.se('bombItem'); FX.text(it.x, it.y - 8, 'BOMB +1', '#80d8ff'); break;
        case 'up': W.addLife(); break;
        case 'gem': case 'gemBig': {
          var v = (it.kind === 'gem' ? 100 : 500) * (1 + Math.floor(W.graze / 100) * 0.1);
          W.addScore(Math.round(v)); A.se('gem', Math.min(6, W.gemChain++)); W.gemChainT = 20;
          break;
        }
      }
      FX.spark(it.x, it.y, 3, '#ffffff', 0.8);
    },
    draw: function (ctx) {
      for (var k = 0; k < items.length; k++) {
        var it = items[k], s = it.spr;
        var bob = (it.kind === 'gem' || it.kind === 'gemBig') ? 0 : Math.round(Math.sin(it.age * 0.15) * 1);
        ctx.drawImage(s.c, Math.round(it.x - s.ox), Math.round(it.y - s.oy + bob));
      }
    }
  };
  EB.Items = Items;
})();
