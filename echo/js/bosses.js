/* bosses.js ― 中ボス/大ボス：多段フェーズ制。攻撃は宣言的データ(atk)で記述 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, U = EB.U, FX = EB.FX, Pat = EB.Pat, Bullets = EB.Bullets;
  var FW = CFG.FW, FH = CFG.FH, TAU = U.TAU, PI = U.PI;

  function iv(W, base) { return Math.max(4, Math.round(base * W.diff.rate)); }

  // ---- 攻撃ショートカット ----
  function A(p, o) { o.p = p; return o; }
  var D = {};

  // ================= 中ボス =================
  D.picket = {
    name: '偵察母機「ピケット」', art: 'picket', r: 20, mid: true, y: 44, bgm: 'midboss',
    phases: [
      { hp: 240, name: '', move: { t: 'sway', cx: 96, ax: 50, ay: 4, w: 0.02 }, atk: [
        A('aim', { every: 44, n: 3, spread: 0.5, spd: 1.6, kind: 'md', col: 'red' }),
        A('ring', { every: 90, start: 30, n: 10, spd: 1.0, kind: 'sm', col: 'blue', rot: 0.2 })] },
      { hp: 300, time: 1500, name: '警報シーケンス', move: { t: 'wander', x0: 40, x1: 152, y0: 34, y1: 66, every: 120 }, atk: [
        A('spiral', { every: 4, arms: 2, rate: 0.23, spd: 1.3, kind: 'rice', col: 'orange', cycle: [100, 160] }),
        A('aim', { every: 60, start: 20, n: 5, spread: 1.0, spd: 1.9, kind: 'sm', col: 'yellow' })] }
    ]
  };
  D.deepwalker = {
    name: '潜行機「ディープウォーカー」', art: 'deepwalker', r: 22, mid: true, y: 46, bgm: 'midboss',
    phases: [
      { hp: 280, name: '', move: { t: 'sway', cx: 96, ax: 58, ay: 6, w: 0.018 }, atk: [
        A('rain', { every: 22, n: 3, spd: 1.4, kind: 'rice', col: 'cyan' }),
        A('aim', { every: 70, start: 20, n: 5, spread: 0.9, spd: 1.5, kind: 'md', col: 'cyan' })] },
      { hp: 340, time: 1500, name: '深海圧殺', move: { t: 'wander', x0: 40, x1: 152, y0: 36, y1: 70, every: 110 }, atk: [
        A('ring', { every: 62, n: 16, spd: 1.1, kind: 'sm', col: 'cyan', rot: 0.12 }),
        A('sides', { every: 26, n: 2, spd: 1.4, kind: 'rice', col: 'blue' })] }
    ]
  };
  D.mirrorray = {
    name: '迎撃機「ミラーレイ」', art: 'mirrorray', r: 22, mid: true, y: 48, bgm: 'midboss',
    phases: [
      { hp: 300, name: '', move: { t: 'hold', x: 96, y: 48 }, atk: [
        A('beam', { every: 120, start: 30, aim: true, warn: 45, dur: 28, w: 3, col: '#c080ff' }),
        A('ring', { every: 60, start: 10, n: 8, spd: 1.2, kind: 'dia', col: 'purple', rot: 0.3 })] },
      { hp: 360, time: 1500, name: '反射陣', move: { t: 'sway', cx: 96, ax: 44, ay: 8, w: 0.02 }, atk: [
        A('beam', { every: 150, start: 20, ang: PI / 2, spread: 0.45, count: 2, warn: 40, dur: 30, w: 3, col: '#c080ff' }),
        A('aim', { every: 36, n: 3, spread: 0.6, spd: 1.7, kind: 'dia', col: 'pink' }),
        A('rain', { every: 40, n: 2, spd: 1.3, kind: 'md', col: 'purple' })] }
    ]
  };
  D.flarecore = {
    name: '炉心機「フレアコア」', art: 'flarecore', r: 22, mid: true, y: 48, bgm: 'midboss',
    phases: [
      { hp: 320, name: '', move: { t: 'wander', x0: 50, x1: 142, y0: 36, y1: 64, every: 100 }, atk: [
        A('flower', { every: 70, petals: 5, n: 3, spd: 1.0, kind: 'md', col: 'orange' }),
        A('ring', { every: 100, start: 40, n: 12, spd: 1.2, kind: 'sm', col: 'yellow', rot: 0.1 })] },
      { hp: 380, time: 1500, name: 'コロナ放出', move: { t: 'sway', cx: 96, ax: 52, ay: 6, w: 0.022 }, atk: [
        A('spiral', { every: 3, arms: 3, rate: 0.15, spd: 1.3, kind: 'sm', col: 'yellow', cycle: [120, 180] }),
        A('burst', { every: 50, start: 15, n: 10, smin: 0.9, smax: 1.8, kind: 'md', col: 'red' })] }
    ]
  };
  D.gatekeeper = {
    name: '門番機「ゲートキーパー」', art: 'gatekeeper', r: 24, mid: true, y: 50, bgm: 'midboss',
    phases: [
      { hp: 360, name: '', move: { t: 'hold', x: 96, y: 50 }, atk: [
        A('ring', { every: 50, n: 14, spd: 1.3, kind: 'dia', col: 'pink', rot: 0.3 }),
        A('aim', { every: 44, start: 20, n: 3, spread: 0.5, spd: 1.9, kind: 'rice', col: 'white' })] },
      { hp: 420, time: 1500, name: '転送封鎖', move: { t: 'wander', x0: 44, x1: 148, y0: 36, y1: 70, every: 100 }, atk: [
        A('summon', { every: 150, start: 20, kind: 'warper', spread: 80, hold: 110 }),
        A('spiral', { every: 4, arms: 4, rate: 0.12, spd: 1.2, kind: 'sm', col: 'pink', cycle: [100, 150] })] }
    ]
  };

  // ================= 大ボス =================
  D.bulwark = {
    name: '母艦「ブルワーク」', art: 'bulwark', r: 28, y: 52, bgm: 'boss1',
    phases: [
      { hp: 560, name: '', move: { t: 'sway', cx: 96, ax: 42, ay: 6, w: 0.015 }, atk: [
        A('aim', { every: 36, n: 5, spread: 0.8, spd: 1.7, kind: 'md', col: 'red', ox: 22, mirror: true }),
        A('ring', { every: 72, start: 20, n: 14, spd: 1.0, kind: 'sm', col: 'orange', rot: 0.15 }),
        A('rain', { every: 50, n: 2, spd: 1.3, kind: 'rice', col: 'yellow' })] },
      { hp: 680, time: 1800, name: '装甲砲塔「連装」', move: { t: 'wander', x0: 52, x1: 140, y0: 40, y1: 72, every: 120 }, atk: [
        A('wall', { every: 100, start: 20, spd: 1.3, kind: 'sm', col: 'yellow' }),
        A('needle', { every: 24, n: 2, spd: 2.5, kind: 'ndl', col: 'red', ox: 20, mirror: true })] },
      { hp: 800, time: 2000, name: '決戦機動「ブルワーク」', move: { t: 'hold', x: 96, y: 50 }, atk: [
        A('spiral', { every: 3, arms: 3, rate: 0.13, spd: 1.4, kind: 'rice', col: 'red', cycle: [150, 210] }),
        A('ring', { every: 90, start: 30, n: 20, spd: 1.2, kind: 'md', col: 'orange', rot: 0.2 }),
        A('sides', { every: 40, n: 3, spd: 1.5, kind: 'sm', col: 'yellow' })] }
    ]
  };
  D.leviathan = {
    name: '母艦「リヴァイアサン」', art: 'leviathan', r: 30, y: 56, bgm: 'boss2',
    phases: [
      { hp: 620, name: '', move: { t: 'sway', cx: 96, ax: 50, ay: 6, w: 0.016 }, atk: [
        A('rain', { every: 14, n: 4, spd: 1.6, kind: 'rice', col: 'blue' }),
        A('aim', { every: 64, start: 10, n: 7, spread: 1.3, spd: 1.6, kind: 'md', col: 'cyan' })] },
      { hp: 720, time: 1900, name: '渦潮「ヴォルテクス」', move: { t: 'wander', x0: 56, x1: 136, y0: 44, y1: 74, every: 120 }, atk: [
        A('flower', { every: 80, petals: 6, n: 2, spd: 1.1, kind: 'md', col: 'cyan' }),
        A('sides', { every: 22, n: 2, spd: 1.6, kind: 'rice', col: 'blue' })] },
      { hp: 840, time: 2100, name: '海淵の咆哮', move: { t: 'hold', x: 96, y: 52 }, atk: [
        A('beam', { every: 170, start: 30, ang: PI / 2, spread: 0.8, count: 3, warn: 50, dur: 36, w: 3, col: '#60e0ff' }),
        A('ring', { every: 55, n: 16, spd: 1.2, kind: 'dia', col: 'cyan', rot: 0.21 }),
        A('rain', { every: 30, n: 3, spd: 1.4, kind: 'sm', col: 'white' })] }
    ]
  };
  D.arsenal = {
    name: '母艦「アーセナル」', art: 'arsenal', r: 30, y: 54, bgm: 'boss3',
    phases: [
      { hp: 640, name: '', move: { t: 'sway', cx: 96, ax: 44, ay: 6, w: 0.015 }, atk: [
        A('aim', { every: 30, n: 3, spread: 0.5, spd: 2.0, kind: 'ndl', col: 'yellow', ox: 24, mirror: true }),
        A('homing', { every: 80, start: 20, n: 3, spd: 1.2, hm: 90, kind: 'md', col: 'red' }),
        A('ring', { every: 100, start: 50, n: 12, spd: 1.0, kind: 'sm', col: 'purple', rot: 0.2 })] },
      { hp: 760, time: 2000, name: '全砲門開放', move: { t: 'wander', x0: 50, x1: 142, y0: 40, y1: 76, every: 120 }, atk: [
        A('beam', { every: 160, start: 20, ang: PI / 2, spread: 1.0, count: 3, warn: 45, dur: 30, w: 3, col: '#ff8040' }),
        A('wall', { every: 110, start: 40, spd: 1.2, kind: 'dia', col: 'orange' })] },
      { hp: 860, time: 2200, name: '無限弾倉「アーセナル」', move: { t: 'hold', x: 96, y: 50 }, atk: [
        A('spiral', { every: 3, arms: 4, rate: 0.1, spd: 1.4, kind: 'sm', col: 'yellow', cycle: [160, 220] }),
        A('homing', { every: 90, n: 5, spd: 1.1, hm: 100, kind: 'md', col: 'red' }),
        A('ring', { every: 80, start: 30, n: 18, spd: 1.2, kind: 'dia', col: 'purple', rot: 0.17 })] }
    ]
  };
  D.solareater = {
    name: '母艦「ソーラーイーター」', art: 'solareater', r: 30, y: 58, bgm: 'boss4',
    phases: [
      { hp: 700, name: '', move: { t: 'sway', cx: 96, ax: 46, ay: 8, w: 0.017 }, atk: [
        A('flower', { every: 72, petals: 5, n: 3, spd: 1.0, kind: 'md', col: 'orange' }),
        A('aim', { every: 40, n: 5, spread: 0.9, spd: 1.8, kind: 'sm', col: 'yellow' })] },
      { hp: 800, time: 2000, name: '紅炎放射', move: { t: 'wander', x0: 56, x1: 136, y0: 42, y1: 76, every: 110 }, atk: [
        A('burst', { every: 30, n: 9, smin: 0.9, smax: 2.0, kind: 'md', col: 'red' }),
        A('rain', { every: 24, n: 3, spd: 1.5, kind: 'rice', col: 'orange' })] },
      { hp: 900, time: 2200, name: '恒星捕食', move: { t: 'hold', x: 96, y: 52 }, atk: [
        A('spiral', { every: 3, arms: 5, rate: 0.11, spd: 1.35, kind: 'rice', col: 'yellow', cycle: [160, 230] }),
        A('ring', { every: 70, n: 18, spd: 1.1, kind: 'md', col: 'red', rot: 0.19 }),
        A('beam', { every: 190, start: 60, aim: true, warn: 50, dur: 34, w: 4, col: '#ff7030' })] },
      { hp: 800, time: 2000, name: '超新星', move: { t: 'sway', cx: 96, ax: 36, ay: 6, w: 0.02 }, atk: [
        A('flower', { every: 54, petals: 7, n: 3, spd: 1.2, kind: 'md', col: 'yellow' }),
        A('sides', { every: 30, n: 3, spd: 1.6, kind: 'sm', col: 'orange' }),
        A('aim', { every: 44, start: 12, n: 3, spread: 0.4, spd: 2.2, kind: 'ndl', col: 'red' })] }
    ]
  };
  D.origin = {
    name: 'マザー機「ORIGIN」', art: 'origin', r: 34, y: 58, bgm: 'boss5',
    phases: [
      { hp: 760, name: '', move: { t: 'sway', cx: 96, ax: 44, ay: 6, w: 0.015 }, atk: [
        A('ring', { every: 60, n: 18, spd: 1.2, kind: 'dia', col: 'pink', rot: 0.13 }),
        A('aim', { every: 36, n: 3, spread: 0.5, spd: 2.0, kind: 'ndl', col: 'white' })] },
      { hp: 880, time: 2000, name: '殲滅命令', move: { t: 'wander', x0: 52, x1: 140, y0: 42, y1: 76, every: 110 }, atk: [
        A('spiral', { every: 3, arms: 4, rate: 0.12, spd: 1.4, kind: 'rice', col: 'pink', cycle: [150, 220] }),
        A('wall', { every: 110, start: 30, spd: 1.2, kind: 'sm', col: 'white' }),
        A('summon', { every: 240, start: 60, kind: 'warper', spread: 80, hold: 110 })] },
      { hp: 960, time: 2200, name: '増殖艦隊', move: { t: 'hold', x: 96, y: 50 }, atk: [
        A('flower', { every: 60, petals: 6, n: 3, spd: 1.1, kind: 'md', col: 'pink' }),
        A('rain', { every: 18, n: 3, spd: 1.5, kind: 'rice', col: 'purple' }),
        A('homing', { every: 100, start: 40, n: 4, spd: 1.1, hm: 110, kind: 'md', col: 'red' })] },
      { hp: 960, time: 2200, name: '星系消却', move: { t: 'sway', cx: 96, ax: 40, ay: 8, w: 0.018 }, atk: [
        A('beam', { every: 170, start: 30, ang: PI / 2, spread: 1.2, count: 4, warn: 50, dur: 34, w: 3, col: '#ff60d0' }),
        A('ring', { every: 56, n: 20, spd: 1.2, kind: 'md', col: 'purple', rot: 0.21 }),
        A('sides', { every: 28, n: 2, spd: 1.6, kind: 'dia', col: 'pink' })] },
      { hp: 1100, time: 2600, name: '最終命令「知的生命体ヲ殲滅セヨ」', move: { t: 'hold', x: 96, y: 52 }, atk: [
        A('spiral', { every: 2, arms: 3, rate: 0.14, spd: 1.5, kind: 'sm', col: 'white', cycle: [140, 200] }),
        A('ring', { every: 66, n: 24, spd: 1.2, kind: 'dia', col: 'pink', rot: 0.11 }),
        A('flower', { every: 90, start: 40, petals: 8, n: 3, spd: 1.2, kind: 'md', col: 'red' }),
        A('aim', { every: 30, start: 10, n: 3, spread: 0.3, spd: 2.3, kind: 'ndl', col: 'white' })] }
    ]
  };

  // ============== 実行系 ==============
  function runAtk(e, W, a, pt) {
    var st = a.start || 0;
    if (pt < st) return;
    var k = pt - st;
    if (a.cycle && (k % a.cycle[1]) >= a.cycle[0]) return;
    var every = iv(W, a.every);
    if (k % every !== 0) return;
    var c = Math.floor(k / every), ox = a.ox || 0, oy = a.oy || 0;
    var kind = a.kind, col = a.col, x = e.x, y = e.y + 8;
    var A_ = EB.Audio;
    var offs = a.mirror ? [-ox, ox] : [ox];
    switch (a.p) {
      case 'aim':
        for (var i = 0; i < offs.length; i++) Pat.aimFan(x + offs[i], y + oy, a.n || 1, a.spread || 0, a.spd, kind, col);
        A_.se('enemyShot'); break;
      case 'needle':
        for (var j = 0; j < offs.length; j++) Pat.stack(x + offs[j], y + oy, Pat.aimAng(x + offs[j], y), a.n || 2, a.spd, 0.35, kind, col);
        A_.se('enemyShot'); break;
      case 'ring':
        Pat.ring(x, y, a.n, a.spd, (a.off || 0) + c * (a.rot || 0), kind, col); A_.se('enemyShotBig'); break;
      case 'spiral': {
        var base = (k % 1000) * a.rate, arms = Math.max(1, Math.round(a.arms * Math.min(1.3, W.diff.cnt)));
        for (var q = 0; q < arms; q++) Bullets.spawn(x, y, base + q / arms * TAU, a.spd, kind, col);
        if (k % (every * 8) === 0) A_.se('enemyShot'); break;
      }
      case 'rain': Pat.rain(a.n, a.spd, kind, col); break;
      case 'burst': {
        var n = Pat.N(a.n);
        for (var z = 0; z < n; z++) Bullets.spawn(x, y, U.rng.range(0, TAU), U.rng.range(a.smin, a.smax), kind, col);
        A_.se('enemyShot'); break;
      }
      case 'wall': Pat.wall(-4, a.spd, FW / 2 + Math.sin(c * 1.1) * 70, 34, kind, col, 12); A_.se('enemyShotBig'); break;
      case 'sides': Pat.sides(a.n, a.spd, kind, col); break;
      case 'flower': Pat.flower(x, y, a.petals, a.n, a.spd, c * 0.2, kind, col); A_.se('enemyShotBig'); break;
      case 'homing': {
        var nn = Pat.N(a.n);
        for (var h = 0; h < nn; h++) Bullets.spawn(x, y, PI / 2 + (h - (nn - 1) / 2) * 0.5, a.spd, kind, col, { hm: a.hm });
        A_.se('enemyShotBig'); break;
      }
      case 'beam': {
        var cnt = a.count || 1;
        for (var b = 0; b < cnt; b++) {
          var ang = a.aim ? Pat.aimAng(x, y) : (a.ang + (cnt === 1 ? 0 : (b / (cnt - 1) - 0.5) * 2 * a.spread) + Math.sin(c) * 0.1);
          Bullets.beam(x, y, ang, a.warn, a.dur, a.w, a.col);
        }
        break;
      }
      case 'summon': {
        if (EB.Enemies.list.length < 12) {
          EB.Enemies.spawn(a.kind, U.clamp(e.x + U.rng.range(-a.spread, a.spread), 20, FW - 20), U.rng.range(70, 130), { tone: e.tone, life: a.hold, fn: null });
        }
        break;
      }
    }
  }

  function moveTarget(e, ph, pt) {
    var m = ph.move;
    switch (m.t) {
      case 'hold': e.tx = m.x; e.ty = m.y; break;
      case 'sway': e.tx = m.cx + Math.sin(pt * m.w) * m.ax; e.ty = e.def.y + Math.sin(pt * m.w * 1.7) * m.ay; break;
      case 'wander':
        if (pt % m.every === 0) { e.tx = U.rng.range(m.x0, m.x1); e.ty = U.rng.range(m.y0, m.y1); }
        break;
    }
  }

  var Bosses = {
    defs: D,
    spawn: function (id, W) {
      var d = D[id]; if (!d) throw new Error('boss ' + id);
      var art = EB.BossArt.get(d.art, W.stageIdx);
      var e = {
        kind: 'boss', k: { update: Bosses.tick }, def: d, id: id, x: FW / 2, y: -50, vx: 0, vy: 0, t: 0, tone: W.stageIdx, p: {},
        fr: art, r: d.r, hp: 1, maxhp: 1, score: d.mid ? 20000 : 80000, dead: false, flash: 0, targetable: false, isBoss: true,
        state: 'enter', pi: 0, pt: 0, inv: 999, tx: FW / 2, ty: d.y, mid: !!d.mid, deathT: 0, rotating: false, hidden: false, carry: null
      };
      EB.Enemies.list.push(e);
      W.boss = e;
      Bosses.beginPhase(e, W, true);
      return e;
    },
    beginPhase: function (e, W, first) {
      var ph = e.def.phases[e.pi];
      e.pt = 0;
      e.maxhp = Math.round(ph.hp * W.diff.hp);
      e.hp = e.maxhp;
      e.phaseName = ph.name || '';
      e.timeLeft = ph.time ? Math.round(ph.time) : 0;
      if (!first) { e.inv = 70; e.nameT = 120; }
      if (ph.name && !first) EB.Audio.se('phase');
    },
    damage: function (e, dmg, W) {
      if (e.state !== 'fight' || e.inv > 0) { return; }
      var d = dmg;
      e.hp -= d; e.flash = 2;
      EB.Audio.se('hitBoss');
      W.addScore(2);
      if (e.hp <= 0) Bosses.endPhase(e, W, true);
    },
    endPhase: function (e, W, byDamage) {
      var d = e.def;
      Bullets.clear(byDamage ? 'gem' : 'spark');
      FX.ring(e.x, e.y, 6, 100, 30, '#ffffff');
      FX.flash('#ffffff', 8, 0.45); FX.shake(3, 14);
      if (byDamage && e.pi < d.phases.length - 1) { W.addScore(5000 * (e.pi + 1)); FX.text(e.x, e.y + 20, '+' + (5000 * (e.pi + 1)), '#ffe060'); }
      e.pi++;
      if (e.pi >= d.phases.length) { Bosses.startDying(e, W); return; }
      Bosses.beginPhase(e, W, false);
    },
    startDying: function (e, W) {
      e.state = 'dying'; e.deathT = 0; e.inv = 9999; e.targetable = false;
      W.hitstop = 10;
      Bullets.clear('gem');
      EB.Audio.se('bossDying');
      FX.flash('#ffffff', 16, 0.9);
      if (EB.Audio.current() && !e.mid) EB.Audio.stop(0.8);
      e.dyingLen = e.mid ? 70 : 170;
    },
    tick: function (e, W) {
      var d = e.def;
      if (e.flash > 0) { /* Enemies側で減算 */ }
      if (e.state === 'enter') {
        e.y += (e.ty - e.y) * 0.035 + 0.1;
        if (e.t > 20 && Math.abs(e.y - e.ty) < 1.5) { e.state = 'fight'; e.inv = 40; e.nameT = 140; if (e.pi === 0) EB.Audio.se('bossIn'); }
        return;
      }
      if (e.state === 'dying') {
        e.deathT++;
        e.x += Math.sin(e.deathT * 1.7) * 0.6;
        if (e.deathT % 5 === 0) {
          var rx = e.x + U.rng.range(-e.r, e.r) * 1.1, ry = e.y + U.rng.range(-e.r, e.r) * 0.9;
          FX.explode(rx, ry, e.deathT % 15 === 0 ? 1 : 0, e.deathT % 10 !== 0);
        }
        if (e.deathT % 20 === 0) FX.shake(3, 10);
        if (e.deathT >= e.dyingLen) {
          FX.explode(e.x, e.y, 2, true); EB.Audio.se(e.mid ? 'midDie' : 'bossDie'); FX.explode(e.x - 14, e.y + 6, 2, true); FX.explode(e.x + 14, e.y - 6, 2, true);
          FX.flash('#ffffff', 40, 1);
          EB.FX.shake(8, 50);
          e.dead = true;
          W.addScore(e.score);
          for (var g = 0; g < (e.mid ? 8 : 18); g++) EB.Items.spawn('gem', e.x + U.rng.range(-20, 20), e.y + U.rng.range(-14, 14), { vy: U.rng.range(-2.4, -0.6), vx: U.rng.range(-1.2, 1.2) });
          if (e.mid) EB.Items.spawn('pl', e.x, e.y, { vy: -1.5 });
          else { EB.Items.spawn('b', e.x - 10, e.y, { vy: -1.5 }); }
          W.boss = null;
          W.onBossDefeated(e);
        }
        return;
      }
      // fight
      var ph = d.phases[e.pi];
      e.pt++;
      if (e.inv > 0) { e.inv--; }
      if (e.nameT > 0) e.nameT--;
      e.targetable = e.inv <= 0;
      moveTarget(e, ph, e.pt);
      e.x += U.clamp((e.tx - e.x) * 0.05, -2.2, 2.2);
      e.y += U.clamp((e.ty - e.y) * 0.05, -1.6, 1.6);
      if (e.inv < 30 || e.pt > 30) { for (var i = 0; i < ph.atk.length; i++) runAtk(e, W, ph.atk[i], e.pt); }
      if (ph.time) {
        e.timeLeft--;
        if (e.timeLeft <= 0 && e.state === 'fight') Bosses.endPhase(e, W, false);
      }
      // 被ダメージ時の煙
      if (e.hp < e.maxhp * 0.3 && e.t % 12 === 0) FX.smoke(e.x + U.rng.range(-e.r, e.r), e.y + U.rng.range(-e.r, e.r), 1);
    }
  };
  EB.Bosses = Bosses;
})();
