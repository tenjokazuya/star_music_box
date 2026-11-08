/* enemies.js ― ザコ敵（機械生命体の子機）の定義と管理 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, U = EB.U, Spr = EB.Spr, G = EB.Gfx, FX = EB.FX, Pat = EB.Pat, Bullets = EB.Bullets;
  var FW = CFG.FW, FH = CFG.FH, TAU = U.TAU, PI = U.PI;

  function iv(W, base) { return Math.max(8, Math.round(base * W.diff.rate)); }
  function P0(p, k, d) { return (p && p[k] !== undefined) ? p[k] : d; }
  function aimAng(e) { return Pat.aimAng(e.x, e.y); }

  var K = {};

  K.scout = {
    spr: 'scout', hp: 3, r: 6, score: 100,
    init: function (e, p) { e.vy = P0(p, 'vy', 1.3); e.vx = P0(p, 'vx', 0); e.fireAt = P0(p, 'fire', 55); },
    update: function (e, W) {
      if (e.t === e.fireAt) Pat.aim(e.x, e.y + 4, 1.5, 'sm', 'red', 0.1);
      if (e.p && e.p.accel) e.vy += e.p.accel;
    }
  };
  K.drone = {
    spr: 'drone', hp: 4, r: 6, score: 120,
    init: function (e, p) { e.x0 = e.x; e.vy = P0(p, 'vy', 0.9); e.amp = P0(p, 'amp', 36); e.ph = P0(p, 'ph', 0); e.fireAt = P0(p, 'fire', 70); },
    update: function (e, W) {
      e.x = e.x0 + Math.sin(e.t * 0.045 + e.ph) * e.amp;
      if (e.t === e.fireAt) Pat.ring(e.x, e.y, 6, 1.0, e.t * 0.1, 'sm', 'blue');
    }
  };
  K.wing = {
    spr: 'wing', hp: 6, r: 8, score: 150,
    init: function (e, p) { e.dir = P0(p, 'dir', e.x < FW / 2 ? 1 : -1); e.vx = 1.6 * e.dir; e.vy = 0.5; },
    update: function (e, W) {
      if (e.t > 20 && e.t < 70) { e.vx *= 0.98; e.vy += 0.03; }
      if (e.t > 70) { e.vx += 0.02 * e.dir * -0.2; e.vy += 0.025; }
      if (e.t === 38 || e.t === 52) Pat.aimFan(e.x, e.y, 3, 0.5, 1.6, 'sm', 'orange');
    }
  };
  K.turret = {
    spr: 'turretBase', hp: 9, r: 9, score: 200, scroll: true,
    init: function (e, p) { e.vy = P0(p, 'vy', 0.55); e.ang = PI / 2; e.fireAt = P0(p, 'every', 100); e.off = P0(p, 'off', 0); },
    update: function (e, W) {
      e.ang = aimAng(e);
      if ((e.t + e.off) % iv(W, e.fireAt) === 20 && e.y > 10 && e.y < FH - 40) {
        Pat.fan(e.x + Math.cos(e.ang) * 9, e.y + Math.sin(e.ang) * 9, e.ang, 3, 0.3, 1.4, 'md', 'yellow');
        EB.Audio.se('enemyShot');
      }
    },
    draw: function (e, ctx) {
      var bs = Spr.turretBarrel(e.tone).fr;
      var idx = ((Math.round(e.ang / TAU * 24) % 24) + 24) % 24, s = bs[idx];
      ctx.drawImage(s.c, Math.round(e.x + Math.cos(e.ang) * 5 - s.ox), Math.round(e.y + Math.sin(e.ang) * 5 - s.oy));
    }
  };
  K.gunship = {
    spr: 'gunship', hp: 42, r: 13, score: 800, carry: 'p',
    init: function (e, p) { e.ty = P0(p, 'ty', 48); e.vy = 1.6; e.hold = P0(p, 'hold', 260); e.dirx = P0(p, 'dir', 1); },
    update: function (e, W) {
      if (e.t < 40) { e.vy *= 0.95; }
      else if (e.t < 40 + e.hold) {
        e.vy = 0; e.vx = Math.sin((e.t - 40) * 0.025) * 0.5 * e.dirx;
        var tt = e.t - 40;
        if (tt % iv(W, 50) === 10) { Pat.ring(e.x, e.y + 8, 12, 1.1, tt * 0.05, 'md', 'red'); EB.Audio.se('enemyShot'); }
        if (tt % iv(W, 50) === 30) { Pat.aimFan(e.x - 8, e.y + 10, 3, 0.4, 1.8, 'sm', 'yellow'); Pat.aimFan(e.x + 8, e.y + 10, 3, 0.4, 1.8, 'sm', 'yellow'); }
      } else { e.vy -= 0.04; e.vx = 0; }
    }
  };
  K.spinner = {
    spr: 'spinner', hp: 14, r: 8, score: 250,
    init: function (e, p) { e.vy = 0.65; e.vx = P0(p, 'vx', 0); e.dir = P0(p, 'dir', 1); },
    update: function (e, W) {
      if (e.t > 20 && e.t < 150 && e.t % 4 === 0) {
        var a = e.t * 0.17 * e.dir;
        Bullets.spawn(e.x, e.y, a, 1.5, 'rice', 'cyan');
        Bullets.spawn(e.x, e.y, a + PI, 1.5, 'rice', 'cyan');
        if (W.diff.cnt > 1.2) { Bullets.spawn(e.x, e.y, a + PI / 2, 1.5, 'rice', 'cyan'); Bullets.spawn(e.x, e.y, a - PI / 2, 1.5, 'rice', 'cyan'); }
      }
    }
  };
  K.diver = {
    spr: 'diver', hp: 4, r: 6, score: 130,
    init: function (e, p) { e.vy = 2.2; e.state = 0; e.hold = P0(p, 'hold', 30); },
    update: function (e, W) {
      if (e.state === 0) {
        e.vy *= 0.92;
        if (e.t > e.hold) { e.state = 1; var a = aimAng(e); e.ax = Math.cos(a) * 0.09; e.ay = Math.sin(a) * 0.09; e.vx = 0; e.vy = 0; EB.Audio.se('enemyShot'); }
      } else {
        e.vx += e.ax; e.vy += e.ay;
        var m = Math.sqrt(e.vx * e.vx + e.vy * e.vy); if (m > 4) { e.vx *= 4 / m; e.vy *= 4 / m; }
      }
    },
    draw: null
  };
  K.mine = {
    spr: 'mine', hp: 6, r: 7, score: 120,
    init: function (e, p) { e.vy = P0(p, 'vy', 0.55); e.vx = P0(p, 'vx', 0); },
    update: function (e, W) { if (e.t > 80 && U.dist2(e.x, e.y, W.player.x, W.player.y) < 40 * 40 && !e.armed) { e.armed = true; e.armT = 24; } if (e.armed) { e.armT--; if (e.armT <= 0) EB.Enemies.kill(e, W, true); } },
    onDeath: function (e, W) { Pat.ring(e.x, e.y, 8, 1.1, e.t * 0.1, 'sm', 'orange'); }
  };
  K.carrier = {
    spr: 'carrier', hp: 100, r: 19, score: 2000, carry: 'pl',
    init: function (e, p) { e.vy = 1.4; e.hold = P0(p, 'hold', 420); },
    update: function (e, W) {
      if (e.t < 50) e.vy *= 0.95;
      else if (e.t < 50 + e.hold) {
        e.vy = 0; e.vx = Math.sin((e.t - 50) * 0.02) * 0.6;
        var tt = e.t - 50;
        if (tt % iv(W, 90) === 20) EB.Enemies.spawn('drone', e.x - 14, e.y + 6, { tone: e.tone, amp: 24, ph: 0, fire: 50 });
        if (tt % iv(W, 90) === 50) EB.Enemies.spawn('drone', e.x + 14, e.y + 6, { tone: e.tone, amp: 24, ph: PI, fire: 50 });
        if (tt % iv(W, 70) === 35) { Pat.aimFan(e.x, e.y + 12, 5, 0.9, 1.5, 'md', 'red'); EB.Audio.se('enemyShotBig'); }
      } else { e.vy -= 0.035; e.vx = 0; }
    }
  };
  K.sub = {
    spr: 'sub', hp: 11, r: 9, score: 180,
    init: function (e, p) { e.vy = 1.0; e.vx = P0(p, 'vx', 0); },
    update: function (e, W) {
      if (e.t === 8) FX.ring(e.x, e.y + 6, 3, 22, 18, '#bfffff');
      if (e.t === 40 || e.t === 70) { Pat.aimFan(e.x, e.y + 8, 5, 0.9, 1.5, 'rice', 'cyan'); EB.Audio.se('enemyShot'); }
    }
  };
  K.beamer = {
    spr: 'beamer', hp: 22, r: 9, score: 400,
    init: function (e, p) { e.ty = P0(p, 'ty', 36); e.vy = 1.4; e.shotN = 0; },
    update: function (e, W) {
      if (e.t < 40) e.vy *= 0.94;
      else if (e.t < 340) {
        e.vy = 0;
        var tt = e.t - 40;
        if (tt % iv(W, 110) === 10) {
          var a = aimAng(e);
          Bullets.beam(e.x, e.y + 8, a, 40, 28, 3, '#c080ff');
        }
        if (tt % iv(W, 110) === 70) Pat.ring(e.x, e.y, 8, 1.2, 0.2, 'dia', 'purple');
      } else e.vy -= 0.04;
    }
  };
  K.flare = {
    spr: 'flare', hp: 5, r: 7, score: 140,
    init: function (e, p) { e.x0 = e.x; e.vy = P0(p, 'vy', 1.1); e.amp = P0(p, 'amp', 30); e.ph = P0(p, 'ph', 0); e.freq = P0(p, 'freq', 0.07); },
    update: function (e, W) {
      e.x = e.x0 + Math.sin(e.t * e.freq + e.ph) * e.amp;
      if (e.t % 6 === 0) FX.smoke(e.x, e.y - 3, 1);
      if (e.t === 50) Pat.aimFan(e.x, e.y, 3, 0.4, 1.4, 'md', 'orange');
    },
    onDeath: function (e, W) { Pat.ring(e.x, e.y, 6, 0.9, 0, 'sm', 'yellow'); }
  };
  K.warper = {
    spr: 'warper', hp: 10, r: 9, score: 220, appear: 24,
    init: function (e, p) { e.vy = 0; e.life = P0(p, 'life', 150); FX.ring(e.x, e.y, 20, 3, 24, '#ff80e0'); EB.Audio.se('warp'); },
    update: function (e, W) {
      if (e.t < 24) { e.hidden = true; e.targetable = false; return; }
      e.hidden = false;
      if (e.t === 36) Pat.ring(e.x, e.y, 10, 1.2, e.t * 0.1, 'md', 'pink');
      if (e.t === 66) Pat.aimFan(e.x, e.y, 5, 0.8, 1.7, 'sm', 'white');
      if (e.t === 96) Pat.ring(e.x, e.y, 10, 1.0, 0.3, 'md', 'pink');
      if (e.t >= e.life) { FX.ring(e.x, e.y, 3, 22, 16, '#ff80e0'); e.dead = true; e.silent = true; }
    }
  };

  var list = [];

  var Enemies = {
    list: list, K: K,
    reset: function () { list.length = 0; },
    spawn: function (kind, x, y, p) {
      var W = EB.W, k = K[kind];
      if (!k) throw new Error('enemy kind ' + kind);
      p = p || {};
      var tone = p.tone !== undefined ? p.tone : W.stageIdx;
      var s = Spr.enemy(k.spr, tone);
      var e = {
        kind: kind, k: k, x: x, y: y, vx: 0, vy: 0, t: 0, tone: tone, p: p,
        hp: Math.max(1, Math.round(k.hp * W.diff.hp * (p.hpMul || 1))), r: k.r, score: k.score, fr: s.fr, rotating: !!s.rotating,
        dead: false, flash: 0, targetable: false, carry: p.carry || k.carry || null, scroll: !!k.scroll, hidden: false, isBoss: false
      };
      e.maxhp = e.hp;
      if (k.init) k.init(e, p);
      list.push(e);
      return e;
    },
    update: function (W) {
      for (var i = list.length - 1; i >= 0; i--) {
        var e = list[i];
        if (e.dead) { list.splice(i, 1); continue; }
        e.t++;
        if (e.flash > 0) e.flash--;
        if (e.k.update) e.k.update(e, W);
        if (e.p && e.p.fn) e.p.fn(e, W);
        e.x += e.vx; e.y += e.vy;
        if (e.isBoss) continue;
        e.targetable = !e.hidden && e.y > 2 && e.y < FH - 2 && e.x > 0 && e.x < FW;
        if (e.t > 30 && (e.y > FH + 40 || e.y < -50 || e.x < -50 || e.x > FW + 50)) { e.dead = true; e.silent = true; list.splice(i, 1); }
      }
    },
    // 自機ショットなどによるダメージ
    damage: function (e, dmg, W) {
      if (e.dead) return;
      if (e.isBoss) { EB.Bosses.damage(e, dmg, W); return; }
      if (!e.targetable) return;
      e.hp -= dmg; e.flash = 2;
      if (e.hp <= 0) Enemies.kill(e, W, false);
      else { EB.Audio.se('hit'); W.addScore(1); }
    },
    kill: function (e, W, noScore) {
      if (e.dead) return;
      e.dead = true;
      if (e.k.onDeath) e.k.onDeath(e, W);
      FX.explode(e.x, e.y, e.r < 10 ? 0 : (e.r < 17 ? 1 : 2));
      if (!noScore) {
        W.addScore(Math.round(e.score * W.diff.score));
        W.kills++;
        if (e.carry) EB.Items.spawn(e.carry, e.x, e.y, { vy: -1.5 });
        EB.Items.spawn(e.r > 12 ? 'gemBig' : 'gem', e.x, e.y, { vy: -1.2, vx: U.rng.range(-0.4, 0.4) });
        if (e.r > 12) { EB.Items.spawn('gem', e.x - 8, e.y, { vy: -1.5, vx: -0.6 }); EB.Items.spawn('gem', e.x + 8, e.y, { vy: -1.5, vx: 0.6 }); }
      }
    },
    anyAlive: function () {
      for (var i = 0; i < list.length; i++) if (!list[i].dead) return true;
      return false;
    },
    // 全撃破（ボス撃破時など）
    killAll: function (W, mode) {
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e.dead || e.isBoss) continue;
        e.dead = true; FX.explode(e.x, e.y, 0, true);
        if (mode === 'gem') EB.Items.spawn('gem', e.x, e.y, { vy: -1 });
      }
    },
    draw: function (ctx) {
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e.dead || e.hidden) continue;
        var s;
        if (e.rotating) s = e.fr[((e.t >> 1) % e.fr.length)];
        else s = e.fr[(e.t >> 4) & 1 && e.fr.length > 1 ? 1 : 0];
        var dx0 = Math.round(e.x - s.ox), dy0 = Math.round(e.y - s.oy);
        ctx.drawImage(s.c, dx0, dy0);
        if (e.flash > 0) {           // 被弾の閃光：本体の上に白を重ねる（ボスは控えめ）
          ctx.globalAlpha = e.isBoss ? 0.3 : 0.65;
          ctx.drawImage(G.flashOf(s).c, dx0, dy0);
          ctx.globalAlpha = 1;
        }
        if (e.k.draw) e.k.draw(e, ctx);
      }
    }
  };
  EB.Enemies = Enemies;
})();
