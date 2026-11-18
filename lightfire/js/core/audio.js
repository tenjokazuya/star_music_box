/* audio.js — WebAudio による チップチューン BGM / SE / 環境音（外部音声ファイル不使用） */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master, bgmG, sfxG, ambG, noiseBuf, waves = {};
  var vol = { bgm: 7, sfx: 8 };
  var pendingBGM = null, bgm = null, jingleSeq = null, curBGM = null, ambNow = {}, ambWant = [];
  var timer = null;

  /* ---------- ユーティリティ ---------- */
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function now() { return ctx.currentTime; }

  function makeWaves() {
    var duties = { p12: 0.125, p25: 0.25, p50: 0.5, p75: 0.75 };
    Object.keys(duties).forEach(function (k) {
      var N = 256, w = [], re = new Float32Array(64), im = new Float32Array(64);
      for (var i = 0; i < N; i++) w.push(i / N < duties[k] ? 1 : -1);
      for (var n = 1; n < 64; n++) {
        var a = 0, b = 0;
        for (var j = 0; j < N; j++) { a += w[j] * Math.cos(2 * Math.PI * n * j / N); b += w[j] * Math.sin(2 * Math.PI * n * j / N); }
        re[n] = a * 2 / N; im[n] = b * 2 / N;
      }
      waves[k] = ctx.createPeriodicWave(re, im);
    });
  }
  function makeNoise() {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function setWave(o, w) {
    if (waves[w]) o.setPeriodicWave(waves[w]);
    else o.type = (w === 'tri') ? 'triangle' : (w === 'saw' ? 'sawtooth' : (w === 'sine' ? 'sine' : 'square'));
  }

  /* ---------- 単発の音 ---------- */
  function tone(freq, dur, o) {
    if (!ctx) return;
    o = o || {};
    var t = now() + (o.delay || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    setWave(osc, o.w || 'p50');
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    var v = (o.v === undefined ? 0.3 : o.v);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || sfxG);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o) {
    if (!ctx) return;
    o = o || {};
    var t = now() + (o.delay || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1500, t);
    if (o.fto) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.fto), t + dur);
    f.Q.value = o.q || 0.8;
    var v = o.v === undefined ? 0.3 : o.v;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxG);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function seq(list) { // [[freq, dur, opts], ...] を順に鳴らす
    var d = 0;
    list.forEach(function (n) {
      var o = {}; var src = n[2] || {};
      for (var k in src) o[k] = src[k];
      o.delay = d + (o.delay || 0);
      if (n[0] > 0) tone(n[0], n[1], o);
      d += n[1] * (src.gap === undefined ? 0.92 : src.gap);
    });
  }
  function notes(arr, step, o) { // MIDI 番号配列
    var l = arr.map(function (m) { return [mtof(m), step * 1.4, o]; });
    seq(l.map(function (x) { x[1] = step * 1.3; return x; }));
  }

  /* ---------- SE 定義 ---------- */
  var SFX = {
    cursor: function () { tone(1318, 0.05, { w: 'p25', v: 0.18 }); },
    ok: function () { seq([[1046, 0.05, { w: 'p25', v: 0.22 }], [1568, 0.09, { w: 'p25', v: 0.22 }]]); },
    cancel: function () { seq([[784, 0.05, { w: 'p25', v: 0.2 }], [523, 0.09, { w: 'p25', v: 0.2 }]]); },
    error: function () { tone(180, 0.16, { w: 'p50', v: 0.25, to: 120 }); },
    text: function () { tone(880 + Math.random() * 60, 0.025, { w: 'p50', v: 0.07 }); },
    step: function () { noise(0.04, { f: 700, v: 0.08, type: 'lowpass' }); },
    bump: function () { tone(110, 0.07, { w: 'p50', v: 0.18, to: 70 }); },
    door: function () { noise(0.12, { f: 400, fto: 900, v: 0.2 }); tone(220, 0.1, { w: 'tri', v: 0.2, delay: 0.1, to: 330 }); },
    open: function () { notes([72, 76, 79, 84], 0.07, { w: 'p25', v: 0.22 }); },
    get: function () { notes([79, 83, 86, 91], 0.07, { w: 'p25', v: 0.22 }); },
    ignite: function () { noise(0.4, { f: 600, fto: 3500, q: 0.6, v: 0.28, a: 0.06 }); tone(330, 0.3, { w: 'tri', v: 0.12, to: 880 }); },
    flame: function () { noise(0.5, { f: 900, fto: 2000, q: 0.5, v: 0.22, a: 0.1 }); tone(220, 0.4, { w: 'saw', v: 0.06, to: 440 }); },
    extinguish: function () { noise(0.3, { f: 3000, fto: 500, v: 0.2 }); },
    push: function () { noise(0.18, { f: 250, fto: 150, v: 0.3, type: 'lowpass' }); },
    fall: function () { tone(500, 0.3, { w: 'p25', v: 0.2, to: 60 }); noise(0.25, { f: 300, v: 0.25, delay: 0.28, type: 'lowpass' }); },
    switch: function () { tone(800, 0.04, { w: 'p50', v: 0.2 }); tone(500, 0.06, { w: 'p50', v: 0.2, delay: 0.05 }); },
    solve: function () { notes([67, 71, 74, 79, 83, 86], 0.08, { w: 'p25', v: 0.24 }); tone(98, 0.6, { w: 'tri', v: 0.3, delay: 0.1 }); },
    rumble: function () { noise(0.9, { f: 120, fto: 70, v: 0.5, type: 'lowpass', a: 0.1 }); tone(60, 0.9, { w: 'tri', v: 0.25, to: 45 }); },
    hit: function () { noise(0.1, { f: 1800, fto: 400, v: 0.35 }); tone(220, 0.1, { w: 'p50', v: 0.22, to: 90 }); },
    crit: function () { noise(0.18, { f: 2500, fto: 300, v: 0.4 }); tone(440, 0.18, { w: 'p25', v: 0.3, to: 80 }); tone(660, 0.1, { w: 'p25', v: 0.2, delay: 0.05 }); },
    hurt: function () { noise(0.15, { f: 600, fto: 200, v: 0.35 }); tone(160, 0.2, { w: 'p50', v: 0.25, to: 60 }); },
    enemyhit: function () { noise(0.12, { f: 1000, fto: 300, v: 0.3 }); tone(300, 0.12, { w: 'p25', v: 0.2, to: 120 }); },
    magic: function () { seq([[523, 0.06, { w: 'p25', v: 0.18 }], [659, 0.06, { w: 'p25', v: 0.18 }], [784, 0.06, { w: 'p25', v: 0.18 }], [1046, 0.1, { w: 'p25', v: 0.18 }]]); noise(0.4, { f: 800, fto: 4000, v: 0.2, delay: 0.1 }); },
    fireball: function () { noise(0.5, { f: 500, fto: 2500, v: 0.32, a: 0.05 }); tone(220, 0.5, { w: 'saw', v: 0.1, to: 880 }); noise(0.3, { f: 2000, fto: 300, v: 0.4, delay: 0.45 }); },
    heal: function () { notes([72, 76, 79, 84, 88], 0.06, { w: 'tri', v: 0.3 }); },
    die: function () { tone(400, 0.5, { w: 'p25', v: 0.22, to: 50 }); noise(0.5, { f: 1200, fto: 100, v: 0.25 }); },
    flee: function () { noise(0.4, { f: 800, fto: 3000, v: 0.15 }); notes([60, 64, 67, 72], 0.05, { w: 'p50', v: 0.15 }); },
    warp: function () { tone(220, 0.5, { w: 'p25', v: 0.2, to: 1760 }); tone(330, 0.5, { w: 'tri', v: 0.2, to: 2200, delay: 0.1 }); },
    save: function () { notes([72, 79, 84, 91], 0.09, { w: 'p25', v: 0.22 }); },
    menu: function () { tone(988, 0.04, { w: 'p25', v: 0.18 }); tone(1318, 0.06, { w: 'p25', v: 0.18, delay: 0.04 }); },
    buy: function () { tone(1568, 0.05, { w: 'p25', v: 0.2 }); tone(2093, 0.1, { w: 'p25', v: 0.2, delay: 0.05 }); },
    wind: function () { noise(1.2, { f: 400, fto: 1600, q: 0.4, v: 0.3, a: 0.5 }); },
    thunder: function () { noise(1.2, { f: 300, fto: 60, q: 0.4, v: 0.6, type: 'lowpass', a: 0.01 }); },
    quake: function () { noise(1.4, { f: 90, fto: 50, v: 0.7, type: 'lowpass', a: 0.05 }); tone(50, 1.2, { w: 'tri', v: 0.3, to: 35 }); },
    shine: function () { notes([84, 88, 91, 96, 100, 103], 0.07, { w: 'tri', v: 0.28 }); },
    swing: function () { noise(0.1, { f: 2500, fto: 900, v: 0.18, type: 'highpass' }); },
    stairs: function () { seq([[300, 0.05, { w: 'p50', v: 0.15 }], [350, 0.05, { w: 'p50', v: 0.15 }], [400, 0.05, { w: 'p50', v: 0.15 }]]); },
    tick: function () { tone(1900, 0.02, { w: 'p50', v: 0.12 }); },
    glass: function () { notes([96, 100, 103, 108], 0.04, { w: 'p12', v: 0.2 }); noise(0.2, { f: 6000, v: 0.2, type: 'highpass' }); },
    fire_off: function () { noise(0.25, { f: 2500, fto: 400, v: 0.18 }); }
  };

  /* ---------- MML パーサ & シーケンサ ---------- */
  var NOTEIDX = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function expandLoops(s) {
    // [ ... ]n を展開（入れ子可）
    var guard = 0;
    while (guard++ < 50) {
      var m = /\[([^\[\]]*)\](\d+)/.exec(s);
      if (!m) break;
      var rep = ''; for (var i = 0; i < +m[2]; i++) rep += m[1] + ' ';
      s = s.slice(0, m.index) + rep + s.slice(m.index + m[0].length);
    }
    return s;
  }
  function parseMML(src, ch) {
    var s = expandLoops(src.replace(/\|/g, ' ')), i = 0, ev = [], tick = 0;
    var o = 4, l = 12, v = ch.v === undefined ? 12 : ch.v, gate = (ch.q || 6.4) / 8, wave = ch.w || 'p50', tempo = 0;
    var L = function (n, dots) { var t = 96 / n; if (dots) t *= 1.5; return t; };
    while (i < s.length) {
      var c = s.charAt(i++);
      if (c === ' ' || c === '\n' || c === '\t') continue;
      if (c === 't') { var m = /^\d+/.exec(s.slice(i)); tempo = +m[0]; i += m[0].length; continue; }
      if (c === 'o') { var mo = /^\d+/.exec(s.slice(i)); o = +mo[0]; i += mo[0].length; continue; }
      if (c === 'v') { var mv = /^\d+/.exec(s.slice(i)); v = +mv[0]; i += mv[0].length; continue; }
      if (c === 'q') { var mq = /^\d+/.exec(s.slice(i)); gate = +mq[0] / 8; i += mq[0].length; continue; }
      if (c === '@') { var mw = /^[a-z0-9]+/.exec(s.slice(i)); wave = mw[0]; i += mw[0].length; continue; }
      if (c === '<') { o--; continue; }
      if (c === '>') { o++; continue; }
      if (c === 'n') { // n<MIDI>:<長さ>
        var mm = /^(\d+)(?::(\d+)(\.?))?/.exec(s.slice(i)); i += mm[0].length;
        var ln = mm[2] ? L(+mm[2], mm[3]) : l;
        ev.push({ t: tick, d: ln, n: +mm[1], v: v, g: gate, w: wave, k: 'n' });
        tick += ln; continue;
      }
      if (c === 'l') { var ml = /^(\d+)(\.?)/.exec(s.slice(i)); l = L(+ml[1], ml[2]); i += ml[0].length; continue; }
      if ((c >= 'a' && c <= 'g') || c === 'r') {
        var semi = 0;
        while (s.charAt(i) === '+' || s.charAt(i) === '#' || s.charAt(i) === '-') { semi += s.charAt(i) === '-' ? -1 : 1; i++; }
        var mn = /^(\d+)?(\.?)/.exec(s.slice(i)); i += mn[0].length;
        var len = mn[1] ? L(+mn[1], mn[2]) : (mn[2] ? l * 1.5 : l);
        if (s.charAt(i) === '^') { // タイ（直後の音長を加算）
          while (s.charAt(i) === '^') { i++; var mt = /^(\d+)(\.?)/.exec(s.slice(i)); i += mt[0].length; len += L(+mt[1], mt[2]); }
        }
        if (c !== 'r') ev.push({ t: tick, d: len, n: (o + 1) * 12 + NOTEIDX[c] + semi, v: v, g: gate, w: wave, k: c });
        tick += len;
      }
    }
    return { ev: ev, len: tick, tempo: tempo };
  }
  function Seq(track, loop) {
    this.track = track; this.loop = loop !== false && track.loop !== false;
    this.tempo = track.tempo || 120;
    this.chs = track.ch.map(function (ch) { var p = parseMML(ch.m, ch); if (p.tempo) this.tempo = this.tempo || p.tempo; return { def: ch, p: p, i: 0, loops: 0 }; }, this);
    this.len = 0; this.chs.forEach(function (c) { if (c.p.len > this.len) this.len = c.p.len; }, this);
    this.spt = 60 / this.tempo / 24; // 1tick の秒数（4分音符=24tick）
    this.t0 = 0; this.started = false; this.done = false; this.gain = null;
  }
  Seq.prototype.start = function (dest) {
    this.gain = ctx.createGain(); this.gain.connect(dest);
    this.t0 = now() + 0.08; this.started = true;
  };
  Seq.prototype.pump = function () {
    if (!this.started || this.done) return;
    var horizon = now() + 0.25, allDone = true;
    for (var k = 0; k < this.chs.length; k++) {
      var ch = this.chs[k], p = ch.p;
      if (!p.ev.length) continue;
      while (true) {
        if (ch.i >= p.ev.length) {
          if (this.loop) { ch.i = 0; ch.loops++; } else break;
        }
        var e = p.ev[ch.i], at = this.t0 + (ch.loops * this.len + e.t) * this.spt;
        if (at > horizon) break;
        if (at >= now() - 0.05) this.note(ch.def, e, Math.max(at, now()));
        ch.i++;
      }
      if (ch.i < p.ev.length || this.loop) allDone = false;
    }
    if (allDone) {
      var endT = this.t0 + this.len * this.spt;
      if (now() > endT) { this.done = true; if (this.onend) this.onend(); }
    }
  };
  Seq.prototype.note = function (def, e, at) {
    var dur = e.d * this.spt, v = (e.v / 15) * 0.2 * (def.vol || 1);
    if (e.w === 'noise') return drum(this.gain, e, at, v * 2.2);
    var osc = ctx.createOscillator(), g = ctx.createGain();
    setWave(osc, e.w);
    osc.frequency.setValueAtTime(mtof(e.n), at);
    var gl = Math.max(0.03, dur * e.g), tri = e.w === 'tri';
    var sus = tri ? 1 : (def.sus === undefined ? 0.65 : def.sus);
    if (tri) v *= 1.5;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(v, at + 0.006);
    if (!tri) g.gain.setTargetAtTime(v * sus, at + 0.01, 0.07);
    g.gain.setValueAtTime(tri ? v : v * (sus + (1 - sus) * Math.exp(-Math.max(0, gl - 0.01) / 0.07)), at + gl);
    g.gain.linearRampToValueAtTime(0.0001, at + gl + 0.03);
    if (def.vib && dur > 0.2) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = def.vib;
      lfo.connect(lg); lg.connect(osc.detune); lfo.start(at + 0.12); lfo.stop(at + gl + 0.05);
    }
    osc.connect(g); g.connect(this.gain);
    osc.start(at); osc.stop(at + gl + 0.06);
  };
  function drum(dest, e, at, v) {
    var k = e.k;
    if (k === 'c') { // キック
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(170, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.12);
      g.gain.setValueAtTime(v * 1.6, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
      o.connect(g); g.connect(dest); o.start(at); o.stop(at + 0.16);
    } else {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g2 = ctx.createGain();
      var dur = (k === 'd') ? 0.13 : (k === 'f' ? 0.16 : 0.04);
      src.buffer = noiseBuf; src.loop = true;
      f.type = (k === 'd') ? 'bandpass' : 'highpass'; f.frequency.value = (k === 'd') ? 1900 : 7000; f.Q.value = 0.7;
      g2.gain.setValueAtTime(v * (k === 'e' ? 0.55 : 1), at); g2.gain.exponentialRampToValueAtTime(0.001, at + dur);
      src.connect(f); f.connect(g2); g2.connect(dest); src.start(at, Math.random()); src.stop(at + dur + 0.02);
    }
  }

  /* ---------- 環境音 ---------- */
  function loopNoise(freq, q, type, gainv) {
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = gainv;
    src.connect(f); f.connect(g); g.connect(ambG); src.start();
    return { src: src, f: f, g: g };
  }
  function lfo(rate, depth, param) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start();
    return o;
  }
  var AMB = {
    wind: function () { var n = loopNoise(500, 0.6, 'bandpass', 0.10); var l = lfo(0.13, 0.07, n.g.gain); var l2 = lfo(0.07, 250, n.f.frequency); return { stop: function () { n.src.stop(); l.stop(); l2.stop(); } }; },
    snow: function () { var n = loopNoise(900, 0.5, 'bandpass', 0.12); var l = lfo(0.1, 0.08, n.g.gain); var l2 = lfo(0.05, 400, n.f.frequency); return { stop: function () { n.src.stop(); l.stop(); l2.stop(); } }; },
    sea: function () { var n = loopNoise(450, 0.4, 'lowpass', 0.14); var l = lfo(0.11, 0.12, n.g.gain); return { stop: function () { n.src.stop(); l.stop(); } }; },
    water: function () { var n = loopNoise(1400, 1.2, 'bandpass', 0.05); var l = lfo(0.4, 0.03, n.g.gain); return { stop: function () { n.src.stop(); l.stop(); } }; },
    lava: function () { var n = loopNoise(110, 0.8, 'lowpass', 0.3); var l = lfo(0.2, 0.15, n.g.gain); return { stop: function () { n.src.stop(); l.stop(); } }; },
    cave: function () { var n = loopNoise(220, 0.5, 'lowpass', 0.07); return { stop: function () { n.src.stop(); } }; },
    fire: function () { return timerAmb(function () { noise(0.03 + Math.random() * 0.05, { f: 1500 + Math.random() * 3000, q: 1.5, v: 0.1 + Math.random() * 0.1, dest: ambG }); return 60 + Math.random() * 260; }); },
    drip: function () { return timerAmb(function () { var f = 900 + Math.random() * 700; tone(f, 0.12, { w: 'sine', v: 0.1, to: f * 0.6, dest: ambG }); tone(f * 0.9, 0.2, { w: 'sine', v: 0.04, to: f * 0.5, delay: 0.14, dest: ambG }); return 1200 + Math.random() * 2600; }); },
    crickets: function () { return timerAmb(function () { for (var i = 0; i < 3; i++) tone(4300 + Math.random() * 80, 0.04, { w: 'p50', v: 0.025, delay: i * 0.07, dest: ambG }); return 900 + Math.random() * 1500; }); },
    birds: function () { return timerAmb(function () { var f = 2200 + Math.random() * 1400, n = 1 + PF.rnd(3); for (var i = 0; i < n; i++) tone(f + i * 150, 0.09, { w: 'p50', v: 0.04, to: f * 1.4, delay: i * 0.11, dest: ambG }); return 1800 + Math.random() * 4500; }); },
    bubble: function () { return timerAmb(function () { var f = 120 + Math.random() * 120; tone(f, 0.15, { w: 'sine', v: 0.15, to: f * 2, dest: ambG }); return 400 + Math.random() * 1200; }); }
  };
  function timerAmb(fn) {
    var stop = false, h;
    (function loop() { if (stop || !ctx) return; var d = fn(); h = setTimeout(loop, d); })();
    return { stop: function () { stop = true; clearTimeout(h); } };
  }
  function applyAmb() {
    if (!ctx) return;
    Object.keys(ambNow).forEach(function (k) { if (ambWant.indexOf(k) < 0) { try { ambNow[k].stop(); } catch (e) { } delete ambNow[k]; } });
    ambWant.forEach(function (k) { if (!ambNow[k] && AMB[k]) ambNow[k] = AMB[k](); });
  }

  /* ---------- 公開 API ---------- */
  var A = PF.audio = {
    tracks: {}, jingles: {},
    get ready() { return !!ctx; },
    unlock: function () {
      if (!AC) return;
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        bgmG = ctx.createGain(); sfxG = ctx.createGain(); ambG = ctx.createGain();
        bgmG.connect(master); sfxG.connect(master); ambG.connect(master);
        makeWaves(); makeNoise(); A.setVolume(vol.bgm, vol.sfx);
        timer = setInterval(function () { if (bgm) bgm.pump(); if (jingleSeq) jingleSeq.pump(); }, 30);
        if (pendingBGM) { var p = pendingBGM; pendingBGM = null; A.playBGM(p); }
        applyAmb();
      }
      if (ctx.state === 'suspended') ctx.resume();
    },
    setVolume: function (b, s) {
      vol.bgm = b; vol.sfx = s;
      if (!ctx) return;
      bgmG.gain.value = Math.pow(b / 10, 1.5) * 0.9; sfxG.gain.value = Math.pow(s / 10, 1.5) * 1.0;
      ambG.gain.value = Math.pow(s / 10, 1.5) * 0.9;
    },
    getVolume: function () { return { bgm: vol.bgm, sfx: vol.sfx }; },
    playBGM: function (id) {
      if (!ctx) { pendingBGM = id; curBGM = id; return; }
      if (curBGM === id && bgm && !bgm.done) return;
      curBGM = id;
      var track = A.tracks[id];
      A.stopBGM(0.25);
      if (!track) return;
      var s = new Seq(track, true); s.start(bgmG); s.fade = null; bgm = s;
      s.gain.gain.setValueAtTime(0.0001, now()); s.gain.gain.linearRampToValueAtTime(1, now() + 0.2);
    },
    stopBGM: function (fade) {
      pendingBGM = null;
      if (!bgm) { curBGM = null; return; }
      var s = bgm; bgm = null; curBGM = null; fade = fade === undefined ? 0.5 : fade;
      if (ctx) {
        s.gain.gain.cancelScheduledValues(now()); s.gain.gain.setValueAtTime(s.gain.gain.value, now());
        s.gain.gain.linearRampToValueAtTime(0.0001, now() + fade);
        setTimeout(function () { try { s.gain.disconnect(); } catch (e) { } s.done = true; }, fade * 1000 + 100);
      }
      s.started = false;
    },
    duck: function (on) { if (ctx && bgm) { var g = bgm.gain.gain; g.cancelScheduledValues(now()); g.setValueAtTime(g.value, now()); g.linearRampToValueAtTime(on ? 0.08 : 1, now() + 0.15); } },
    jingle: function (id) { // 短いファンファーレ（BGMを一時的に下げる）
      if (!ctx) return Promise.resolve();
      var track = A.jingles[id]; if (!track) return Promise.resolve();
      return new Promise(function (res) {
        if (jingleSeq) { try { jingleSeq.gain.disconnect(); } catch (e) { } }
        var s = new Seq(track, false); s.start(sfxG); jingleSeq = s;
        A.duck(true);
        s.onend = function () { A.duck(false); res(); };
        setTimeout(function () { if (!s.done) { s.done = true; A.duck(false); res(); } }, (s.len * s.spt + 0.5) * 1000);
      });
    },
    sfx: function (n) { if (ctx && SFX[n]) { try { SFX[n](); } catch (e) { } } },
    ambience: function (list) { ambWant = list || []; applyAmb(); },
    currentBGM: function () { return curBGM; },
    _parse: parseMML,
    ctx: function () { return ctx; }
  };
  PF.sfx = function (n) { A.sfx(n); };
  PF.input && PF.input.onGesture(A.unlock);
})();
