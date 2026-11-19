/* オーディオ: GBA風の矩形波/三角波/ノイズ音源、効果音、MMLシーケンサ、環境音、エンジン音 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var A = RR.Audio = { ctx: null, ready: false, cur: null, curId: null };
  var ctx, master, comp, bus = {}, waves = {}, noiseBuf, metalBuf;

  A.unlock = function () {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = A.ctx = new AC();
        build();
      }
      if (ctx.state === 'suspended') ctx.resume();
      A.ready = true;
      if (A._pending) { var p = A._pending; A._pending = null; A.bgm(p); }
      if (A._pendingAmb) { var q = A._pendingAmb; A._pendingAmb = null; A.ambient(q); }
    } catch (e) { RR.log('audio unlock failed', e); }
  };

  function build() {
    master = ctx.createGain();
    master.gain.value = 0.9;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.15;
    master.connect(comp); comp.connect(ctx.destination);
    ['bgm', 'sfx', 'amb', 'eng'].forEach(function (k) {
      bus[k] = ctx.createGain();
      bus[k].connect(master);
    });
    A.applyVolume();
    // 矩形波（デューティ比）
    [0.125, 0.25, 0.5].forEach(function (d) {
      var n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (var i = 1; i < n; i++) {
        re[i] = (2 / (i * Math.PI)) * Math.sin(2 * Math.PI * i * d);
        im[i] = (2 / (i * Math.PI)) * (1 - Math.cos(2 * Math.PI * i * d));
      }
      waves['p' + Math.round(d * 1000)] = ctx.createPeriodicWave(re, im);
    });
    // 4bit風の三角波（GBAのウェーブメモリ風に段差を持たせる）
    var n2 = 32, re2 = new Float32Array(n2), im2 = new Float32Array(n2);
    for (var i = 1; i < n2; i += 2) im2[i] = (8 / (Math.PI * Math.PI)) * Math.pow(-1, (i - 1) / 2) / (i * i);
    im2[3] *= 1.15; im2[5] *= 1.3;
    waves.tri = ctx.createPeriodicWave(re2, im2);
    // ノイズ
    var len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d0 = noiseBuf.getChannelData(0);
    for (i = 0; i < len; i++) d0[i] = Math.random() * 2 - 1;
    // 周期ノイズ（金属的な音）
    metalBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d1 = metalBuf.getChannelData(0), lfsr = 0x7f;
    for (i = 0; i < d1.length; i++) {
      if (i % 6 === 0) { var bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 6); }
      d1[i] = (lfsr & 1) ? 0.8 : -0.8;
    }
  }

  A.applyVolume = function () {
    if (!ctx) return;
    var s = (RR.Settings && RR.Settings.data) || {};
    var bv = (s.bgm == null ? 7 : s.bgm) / 10, sv = (s.se == null ? 8 : s.se) / 10;
    bus.bgm.gain.value = bv * 0.55;
    bus.sfx.gain.value = sv * 0.7;
    bus.amb.gain.value = sv * 0.5;
    bus.eng.gain.value = sv * 0.55;
  };

  function setWave(osc, w) {
    if (waves[w]) osc.setPeriodicWave(waves[w]);
    else osc.type = w === 'saw' ? 'sawtooth' : w === 'sine' ? 'sine' : 'square';
  }

  // ---------- 基本音 ----------
  // o: {w, f, f2, t, d, v, a, r, bus, vib, pan}
  function tone(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0);
    var d = o.d || 0.1, v = o.v == null ? 0.3 : o.v;
    var osc = ctx.createOscillator();
    setWave(osc, o.w || 'p250');
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + d);
    var g = ctx.createGain();
    var a = o.a || 0.004, r = o.r || 0.03;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    if (o.sus != null) g.gain.linearRampToValueAtTime(v * o.sus, t0 + a + (o.dec || 0.05));
    g.gain.setValueAtTime(o.sus != null ? v * o.sus : v, t0 + Math.max(a, d - r));
    g.gain.linearRampToValueAtTime(0.0001, t0 + d);
    osc.connect(g);
    var out = g;
    if (o.pan && ctx.createStereoPanner) {
      var p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p;
    }
    out.connect(o.bus || bus.sfx);
    if (o.vib) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vibRate || 5.5;
      lg.gain.setValueAtTime(0, t0);
      lg.gain.linearRampToValueAtTime(o.f * o.vib, t0 + Math.min(0.25, d * 0.5));
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t0); lfo.stop(t0 + d + 0.05);
    }
    osc.start(t0);
    osc.stop(t0 + d + 0.05);
  }
  // o: {f, f2, q, d, v, type, t, bus, metal}
  function noise(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0);
    var d = o.d || 0.1, v = o.v == null ? 0.3 : o.v;
    var src = ctx.createBufferSource();
    src.buffer = o.metal ? metalBuf : noiseBuf;
    src.loop = true;
    var flt = ctx.createBiquadFilter();
    flt.type = o.type || 'bandpass';
    flt.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    flt.Q.value = o.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.a || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + d);
    src.connect(flt); flt.connect(g); g.connect(o.bus || bus.sfx);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + d + 0.05);
  }
  A.tone = tone; A.noise = noise;

  // ---------- 効果音 ----------
  var SFX = {
    cursor: function () { tone({ w: 'p125', f: 1760, d: 0.035, v: 0.18 }); },
    ok: function () { tone({ w: 'p250', f: 988, d: 0.05, v: 0.22 }); tone({ w: 'p250', f: 1319, t: 0.05, d: 0.08, v: 0.22 }); },
    cancel: function () { tone({ w: 'p250', f: 784, d: 0.05, v: 0.2 }); tone({ w: 'p250', f: 523, t: 0.05, d: 0.07, v: 0.2 }); },
    error: function () { tone({ w: 'p500', f: 150, d: 0.18, v: 0.22 }); tone({ w: 'p500', f: 142, t: 0.02, d: 0.16, v: 0.15 }); },
    blip: function () { tone({ w: 'p125', f: 1200 + Math.random() * 80, d: 0.022, v: 0.07 }); },
    open: function () { tone({ w: 'p250', f: 660, f2: 1320, d: 0.08, v: 0.18 }); },
    close: function () { tone({ w: 'p250', f: 1320, f2: 660, d: 0.08, v: 0.16 }); },
    door: function () {
      noise({ f: 400, d: 0.12, v: 0.25, type: 'lowpass' });
      tone({ w: 'tri', f: 180, f2: 90, d: 0.12, v: 0.3 });
      tone({ w: 'p500', f: 880, t: 0.12, d: 0.04, v: 0.08 });
    },
    step: function () { noise({ f: 900, d: 0.03, v: 0.04, type: 'lowpass' }); },
    bump: function () { tone({ w: 'tri', f: 90, f2: 60, d: 0.08, v: 0.35 }); },
    coin: function () { tone({ w: 'p250', f: 1976, d: 0.05, v: 0.2 }); tone({ w: 'p250', f: 2637, t: 0.05, d: 0.18, v: 0.2, r: 0.12 }); },
    buy: function () {
      noise({ f: 5000, d: 0.04, v: 0.12, type: 'highpass', metal: true });
      tone({ w: 'p125', f: 2093, t: 0.04, d: 0.06, v: 0.18 });
      tone({ w: 'p125', f: 2637, t: 0.1, d: 0.06, v: 0.18 });
      tone({ w: 'p125', f: 3136, t: 0.16, d: 0.2, v: 0.16, r: 0.15 });
    },
    save: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone({ w: 'p250', f: f, t: i * 0.07, d: 0.09, v: 0.16 }); });
      tone({ w: 'tri', f: 262, d: 0.35, v: 0.25 });
    },
    get: function () {
      var seq = [[784, 0], [988, 0.1], [1175, 0.2], [1568, 0.3]];
      seq.forEach(function (s) { tone({ w: 'p250', f: s[0], t: s[1], d: 0.12, v: 0.2 }); });
      tone({ w: 'p500', f: 1568, t: 0.4, d: 0.45, v: 0.16, vib: 0.01, r: 0.3 });
      tone({ w: 'tri', f: 392, t: 0, d: 0.85, v: 0.3, r: 0.4 });
    },
    trophy: function () {
      var m = [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.3], [988, 0.68, 0.12], [1047, 0.8, 0.6]];
      m.forEach(function (s) { tone({ w: 'p250', f: s[0], t: s[1], d: s[2], v: 0.2, vib: 0.008 }); tone({ w: 'p125', f: s[0] * 1.5, t: s[1], d: s[2], v: 0.08 }); });
      [262, 330, 392, 523].forEach(function (f, i) { tone({ w: 'tri', f: f, t: i * 0.36, d: 0.34, v: 0.25 }); });
    },
    beep: function () { tone({ w: 'p500', f: 880, d: 0.18, v: 0.25 }); },
    go: function () { tone({ w: 'p500', f: 1760, d: 0.5, v: 0.25, r: 0.2 }); tone({ w: 'p250', f: 1760 * 1.5, d: 0.5, v: 0.1, r: 0.2 }); },
    shift: function () { noise({ f: 2500, d: 0.03, v: 0.12, type: 'highpass', metal: true }); tone({ w: 'tri', f: 120, d: 0.04, v: 0.15 }); },
    crash: function () {
      noise({ f: 800, f2: 200, d: 0.35, v: 0.5, type: 'lowpass' });
      noise({ f: 3000, d: 0.25, v: 0.2, metal: true });
      tone({ w: 'tri', f: 110, f2: 40, d: 0.25, v: 0.4 });
    },
    scrape: function () { noise({ f: 2600, d: 0.12, v: 0.18, q: 3, metal: true }); },
    horn: function () { tone({ w: 'p500', f: 415, d: 0.3, v: 0.18 }); tone({ w: 'p500', f: 523, d: 0.3, v: 0.12 }); },
    swoosh: function () { noise({ f: 300, f2: 4000, d: 0.3, v: 0.22, q: 2 }); },
    swooshDown: function () { noise({ f: 4000, f2: 300, d: 0.3, v: 0.22, q: 2 }); },
    banner: function () {
      noise({ f: 500, f2: 5000, d: 0.25, v: 0.2, q: 2 });
      tone({ w: 'p250', f: 392, t: 0.2, d: 0.15, v: 0.2 }); tone({ w: 'p250', f: 523, t: 0.35, d: 0.4, v: 0.2, vib: 0.01 });
    },
    starter: function () {
      for (var i = 0; i < 5; i++) tone({ w: 'p500', f: 55, t: i * 0.09, d: 0.06, v: 0.2 });
      tone({ w: 'saw', f: 40, f2: 120, t: 0.45, d: 0.35, v: 0.3 });
      tone({ w: 'saw', f: 120, f2: 60, t: 0.8, d: 0.4, v: 0.22 });
    },
    rev: function () { tone({ w: 'saw', f: 60, f2: 240, d: 0.35, v: 0.25 }); tone({ w: 'saw', f: 240, f2: 70, t: 0.35, d: 0.4, v: 0.2 }); },
    register: function () {
      noise({ f: 4000, d: 0.05, v: 0.15, metal: true });
      tone({ w: 'p125', f: 2637, t: 0.06, d: 0.3, v: 0.16, r: 0.2 });
      tone({ w: 'p125', f: 3520, t: 0.06, d: 0.3, v: 0.1, r: 0.2 });
    },
    scrub: function () { noise({ f: 1800 + Math.random() * 600, d: 0.06, v: 0.12, q: 1.5 }); },
    ratchet: function () { noise({ f: 3500, d: 0.025, v: 0.2, q: 4, metal: true }); tone({ w: 'p125', f: 2200, d: 0.015, v: 0.08 }); },
    correct: function () { tone({ w: 'p250', f: 1319, d: 0.06, v: 0.2 }); tone({ w: 'p250', f: 1760, t: 0.06, d: 0.12, v: 0.2 }); },
    wrong: function () { tone({ w: 'p500', f: 196, d: 0.12, v: 0.22 }); tone({ w: 'p500', f: 185, t: 0.1, d: 0.16, v: 0.22 }); },
    splash: function () { noise({ f: 1200, f2: 400, d: 0.25, v: 0.2, type: 'lowpass' }); },
    bubble: function () { tone({ w: 'sine', f: 300 + Math.random() * 300, f2: 900, d: 0.06, v: 0.12 }); },
    clunk: function () { tone({ w: 'tri', f: 140, f2: 70, d: 0.1, v: 0.4 }); noise({ f: 600, d: 0.08, v: 0.2, type: 'lowpass' }); },
    eat: function () { noise({ f: 1500, d: 0.05, v: 0.1 }); noise({ f: 1300, t: 0.12, d: 0.05, v: 0.1 }); noise({ f: 1600, t: 0.24, d: 0.05, v: 0.1 }); },
    drink: function () { for (var i = 0; i < 3; i++) tone({ w: 'sine', f: 420, f2: 260, t: i * 0.16, d: 0.1, v: 0.15 }); },
    exclaim: function () { tone({ w: 'p250', f: 1568, d: 0.05, v: 0.2 }); tone({ w: 'p250', f: 2093, t: 0.05, d: 0.1, v: 0.2 }); },
    question: function () { tone({ w: 'p250', f: 1047, f2: 1400, d: 0.15, v: 0.18 }); },
    place: function () { tone({ w: 'tri', f: 220, f2: 160, d: 0.07, v: 0.3 }); noise({ f: 900, d: 0.05, v: 0.1, type: 'lowpass' }); },
    sleep: function () {
      [784, 659, 523, 392].forEach(function (f, i) { tone({ w: 'tri', f: f, t: i * 0.3, d: 0.35, v: 0.3 }); });
    },
    wash: function () { noise({ f: 2500, f2: 800, d: 0.6, v: 0.18, type: 'bandpass', q: 0.8 }); },
    lose: function () {
      [392, 370, 349, 330].forEach(function (f, i) { tone({ w: 'p250', f: f, t: i * 0.25, d: 0.28, v: 0.2 }); });
      tone({ w: 'tri', f: 131, d: 1.2, v: 0.3, r: 0.6 });
    }
  };
  A.SFX = SFX;
  A.sfx = function (name) {
    if (!ctx || !A.ready) return;
    var f = SFX[name];
    if (f) { try { f(); } catch (e) { RR.log(e); } }
  };

  // ---------- 楽器（BGM用） ----------
  var INST = {
    lead: { w: 'p250', a: 0.006, sus: 0.7, dec: 0.08, r: 0.04, v: 0.16, vib: 0.006 },
    lead2: { w: 'p125', a: 0.004, sus: 0.6, dec: 0.06, r: 0.03, v: 0.13, vib: 0.005 },
    sq: { w: 'p500', a: 0.004, sus: 0.6, dec: 0.08, r: 0.04, v: 0.11 },
    soft: { w: 'p500', a: 0.03, sus: 0.8, dec: 0.1, r: 0.12, v: 0.07 },
    arp: { w: 'p125', a: 0.002, sus: 0.3, dec: 0.04, r: 0.02, v: 0.08 },
    bass: { w: 'tri', a: 0.003, sus: 0.85, dec: 0.05, r: 0.02, v: 0.34 },
    pbass: { w: 'p500', a: 0.003, sus: 0.6, dec: 0.06, r: 0.02, v: 0.09 },
    saw: { w: 'saw', a: 0.004, sus: 0.6, dec: 0.08, r: 0.04, v: 0.07 },
    bell: { w: 'sine', a: 0.002, sus: 0.25, dec: 0.25, r: 0.2, v: 0.14 },
    pad: { w: 'tri', a: 0.08, sus: 0.9, dec: 0.1, r: 0.2, v: 0.16 }
  };
  function drum(k, t, v) {
    v = v == null ? 1 : v;
    var B = bus.bgm;
    if (k === 'k') { tone({ w: 'tri', f: 160, f2: 42, t: t, d: 0.14, v: 0.55 * v, bus: B }); noise({ f: 300, t: t, d: 0.04, v: 0.12 * v, type: 'lowpass', bus: B }); }
    else if (k === 's') { noise({ f: 1900, t: t, d: 0.13, v: 0.22 * v, q: 0.7, bus: B }); tone({ w: 'tri', f: 200, f2: 140, t: t, d: 0.06, v: 0.25 * v, bus: B }); }
    else if (k === 'h') noise({ f: 8000, t: t, d: 0.03, v: 0.08 * v, type: 'highpass', bus: B });
    else if (k === 'o') noise({ f: 7500, t: t, d: 0.16, v: 0.07 * v, type: 'highpass', bus: B });
    else if (k === 'c') noise({ f: 5000, t: t, d: 0.7, v: 0.1 * v, type: 'highpass', bus: B });
    else if (k === 't') tone({ w: 'tri', f: 220, f2: 110, t: t, d: 0.15, v: 0.4 * v, bus: B });
    else if (k === 'l') tone({ w: 'tri', f: 150, f2: 80, t: t, d: 0.18, v: 0.42 * v, bus: B });
    else if (k === 'p') noise({ f: 2600, t: t, d: 0.02, v: 0.09 * v, q: 3, metal: true, bus: B });
  }

  // ---------- MML パーサ ----------
  // 4分音符 = 48 tick
  var NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function parseMML(src, isDrum) {
    var evs = [], pos = 0, oct = 4, len = 48, vol = 12, gate = 7, tick = 0;
    src = src.replace(/\s+/g, '');
    function num() {
      var m = /^\d+/.exec(src.slice(pos));
      if (!m) return null;
      pos += m[0].length;
      return parseInt(m[0], 10);
    }
    function length() {
      var n = num(), l = n ? 192 / n : len;
      var add = l / 2;
      while (src[pos] === '.') { l += add; add /= 2; pos++; }
      while (src[pos] === '^') {
        pos++;
        var n2 = num(), l2 = n2 ? 192 / n2 : len, add2 = l2 / 2;
        while (src[pos] === '.') { l2 += add2; add2 /= 2; pos++; }
        l += l2;
      }
      return l;
    }
    function run(end) {
      while (pos < src.length) {
        var c = src[pos++];
        if (c === end) return;
        if (c === '[') {
          var start = pos, depth = 1;
          while (pos < src.length && depth) { if (src[pos] === '[') depth++; else if (src[pos] === ']') depth--; pos++; }
          var body = src.slice(start, pos - 1);
          var times = num() || 2;
          var save = { src: src, pos: pos };
          for (var i = 0; i < times; i++) { src = body; pos = 0; run(null); }
          src = save.src; pos = save.pos;
          continue;
        }
        if (c === 'o') { oct = num(); continue; }
        if (c === '<') { oct--; continue; }
        if (c === '>') { oct++; continue; }
        if (c === 'l') { len = 192 / num(); continue; }
        if (c === 'v') { vol = num(); continue; }
        if (c === 'q') { gate = num(); continue; }
        if (c === 'r') { tick += length(); continue; }
        if (isDrum) {
          if ('kshoctlp'.indexOf(c) >= 0) {
            var acc = 1;
            if (src[pos] === '!') { acc = 1.4; pos++; }
            var dl = length();
            evs.push({ t: tick, d: dl, k: c, v: vol / 12 * acc });
            tick += dl;
          }
          continue;
        }
        if (NOTE.hasOwnProperty(c)) {
          var semi = NOTE[c];
          while (src[pos] === '+' || src[pos] === '#' || src[pos] === '-') { semi += src[pos] === '-' ? -1 : 1; pos++; }
          var l = length();
          var midi = (oct + 1) * 12 + semi;
          evs.push({ t: tick, d: l, n: midi, v: vol / 12, g: gate / 8 });
          tick += l;
        }
      }
    }
    run(null);
    return { evs: evs, len: tick };
  }
  A.parseMML = parseMML;

  // ---------- シーケンサ ----------
  var songCache = {};
  function compile(id) {
    if (songCache[id]) return songCache[id];
    var def = RR.Music && RR.Music.songs[id];
    if (!def) return null;
    var chs = def.ch.map(function (c) {
      var p = parseMML(c.mml, c.inst === 'drum');
      return { inst: c.inst, evs: p.evs, len: p.len, oct: c.oct || 0, vol: c.vol == null ? 1 : c.vol, pan: c.pan || 0, det: c.det || 0 };
    });
    var len = 0;
    chs.forEach(function (c) { len = Math.max(len, c.len); });
    var s = { id: id, bpm: def.bpm, loop: def.loop !== false, chs: chs, len: len };
    songCache[id] = s;
    return s;
  }

  function Player(song) {
    this.song = song;
    this.tickSec = 60 / song.bpm / 48;
    this.start = ctx.currentTime + 0.08;
    this.idx = song.chs.map(function () { return 0; });
    this.loopN = song.chs.map(function () { return 0; });
    this.gain = ctx.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(bus.bgm);
    this.done = false;
  }
  Player.prototype.schedule = function () {
    var now = ctx.currentTime, horizon = now + 0.25, song = this.song, self = this;
    var loopSec = song.len * this.tickSec;
    song.chs.forEach(function (ch, ci) {
      if (!ch.evs.length) return;
      var guard = 0;
      while (guard++ < 64) {
        var i = self.idx[ci];
        if (i >= ch.evs.length) {
          if (!song.loop) return;
          self.idx[ci] = 0; self.loopN[ci]++; i = 0;
        }
        var e = ch.evs[i];
        var t = self.start + self.loopN[ci] * loopSec + e.t * self.tickSec;
        if (t > horizon) return;
        self.idx[ci]++;
        if (t < now - 0.05) continue;
        self.play(ch, e, t - now);
      }
    });
    if (!song.loop) {
      var allDone = song.chs.every(function (ch, ci) { return self.idx[ci] >= ch.evs.length; });
      if (allDone && now > this.start + loopSec) this.done = true;
    }
  };
  Player.prototype.play = function (ch, e, dt) {
    if (ch.inst === 'drum') { drumTo(this.gain, e.k, dt, e.v * ch.vol); return; }
    var ins = INST[ch.inst] || INST.lead;
    var f = 440 * Math.pow(2, (e.n + ch.oct * 12 - 69) / 12) * (1 + ch.det);
    var d = Math.max(0.03, e.d * this.tickSec * (e.g || 0.875));
    tone({
      w: ins.w, f: f, t: dt, d: d, v: ins.v * e.v * ch.vol, a: ins.a, sus: ins.sus, dec: ins.dec,
      r: Math.min(ins.r, d * 0.4), vib: d > 0.25 ? ins.vib : 0, bus: this.gain, pan: ch.pan
    });
  };
  function drumTo(out, k, t, v) {
    var old = bus.bgm; bus.bgm = out;
    drum(k, t, v);
    bus.bgm = old;
  }
  Player.prototype.stop = function (fade) {
    var g = this.gain, t = ctx.currentTime;
    this.done = true;
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + (fade || 0.05));
      setTimeout(function () { try { g.disconnect(); } catch (e) { } }, (fade || 0.05) * 1000 + 400);
    } catch (e) { }
  };

  A.bgm = function (id, opt) {
    opt = opt || {};
    if (!ctx || !A.ready) { A._pending = id; return; }
    if (A.curId === id && A.cur && !A.cur.done && !opt.restart) return;
    if (A.cur) A.cur.stop(opt.fade == null ? 0.4 : opt.fade);
    A.cur = null; A.curId = null;
    if (!id) return;
    var s = compile(id);
    if (!s) return;
    A.cur = new Player(s);
    A.curId = id;
  };
  A.stopBgm = function (fade) { A._pending = null; if (A.cur) A.cur.stop(fade || 0.5); A.cur = null; A.curId = null; };
  A.bgmDone = function () { return !A.cur || A.cur.done; };

  // ---------- 環境音 ----------
  var amb = { kind: null, nodes: [], nextChirp: 0 };
  A.ambient = function (kind) {
    if (!ctx || !A.ready) { A._pendingAmb = kind; return; }
    if (amb.kind === kind) return;
    amb.nodes.forEach(function (n) { try { n.stop(); } catch (e) { } });
    amb.nodes = [];
    amb.kind = kind;
    if (!kind || kind === 'none') return;
    var windLevel = kind === 'fog' ? 0.18 : kind === 'pass' ? 0.1 : kind === 'indoor' ? 0.0 : 0.05;
    if (windLevel > 0) {
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      var g = ctx.createGain(); g.gain.value = windLevel;
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.12; lg.gain.value = windLevel * 0.6;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(bus.amb);
      src.start(); lfo.start();
      amb.nodes.push(src, lfo);
    }
    if (kind === 'indoor') {
      var hum = ctx.createOscillator(), hg = ctx.createGain();
      hum.type = 'sine'; hum.frequency.value = 100; hg.gain.value = 0.015;
      hum.connect(hg); hg.connect(bus.amb); hum.start();
      amb.nodes.push(hum);
    }
  };
  function tickAmbient() {
    if (!ctx || !amb.kind) return;
    var k = amb.kind;
    if (k !== 'night' && k !== 'pass' && k !== 'town' && k !== 'fog') return;
    var now = ctx.currentTime;
    if (now < amb.nextChirp) return;
    // 虫の声: 高い音の短い連打
    var base = k === 'town' ? 4200 : 3600 + Math.random() * 900;
    var n = 3 + Math.floor(Math.random() * 4);
    var pan = Math.random() * 1.6 - 0.8;
    var vol = (k === 'town' ? 0.025 : 0.04) * (0.5 + Math.random() * 0.5);
    for (var i = 0; i < n; i++) tone({ w: 'sine', f: base, t: i * 0.055, d: 0.035, v: vol, bus: bus.amb, pan: pan });
    amb.nextChirp = now + 0.35 + Math.random() * (k === 'town' ? 2.5 : 1.2);
  }

  // ---------- エンジン音 ----------
  function Engine(volume, pan) {
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = ctx.createOscillator(); setWave(this.o2, 'p250');
    this.o3 = ctx.createOscillator(); this.o3.type = 'sine';
    this.f = ctx.createBiquadFilter(); this.f.type = 'lowpass'; this.f.Q.value = 2;
    this.g = ctx.createGain(); this.g.gain.value = 0;
    this.tg = ctx.createGain(); this.tg.gain.value = 0;
    this.o1.connect(this.f); this.o2.connect(this.f);
    this.f.connect(this.g);
    this.o3.connect(this.tg); this.tg.connect(bus.eng);
    var out = this.g;
    if (pan != null && ctx.createStereoPanner) { this.p = ctx.createStereoPanner(); this.p.pan.value = pan; this.g.connect(this.p); out = this.p; }
    out.connect(bus.eng);
    // スキール
    this.ns = ctx.createBufferSource(); this.ns.buffer = noiseBuf; this.ns.loop = true;
    this.nf = ctx.createBiquadFilter(); this.nf.type = 'bandpass'; this.nf.frequency.value = 1100; this.nf.Q.value = 6;
    this.ng = ctx.createGain(); this.ng.gain.value = 0;
    this.ns.connect(this.nf); this.nf.connect(this.ng); this.ng.connect(bus.eng);
    // 風
    this.ws = ctx.createBufferSource(); this.ws.buffer = noiseBuf; this.ws.loop = true;
    this.wf = ctx.createBiquadFilter(); this.wf.type = 'lowpass'; this.wf.frequency.value = 600;
    this.wg = ctx.createGain(); this.wg.gain.value = 0;
    this.ws.connect(this.wf); this.wf.connect(this.wg); this.wg.connect(bus.eng);
    this.vol = volume == null ? 1 : volume;
    var t = ctx.currentTime;
    [this.o1, this.o2, this.o3, this.ns, this.ws].forEach(function (o) { o.start(t); });
  }
  Engine.prototype.update = function (rpm, throttle, slip, speed, turbo) {
    var t = ctx.currentTime, k = 0.05;
    var fq = Math.max(18, rpm / 60 * 2);
    this.o1.frequency.setTargetAtTime(fq, t, 0.02);
    this.o2.frequency.setTargetAtTime(fq * 0.5, t, 0.02);
    this.f.frequency.setTargetAtTime(250 + throttle * 1800 + rpm * 0.12, t, k);
    this.g.gain.setTargetAtTime(this.vol * (0.12 + throttle * 0.16 + rpm / 9000 * 0.08), t, k);
    this.o3.frequency.setTargetAtTime(2400 + rpm * 0.5, t, 0.05);
    this.tg.gain.setTargetAtTime(this.vol * (turbo || 0) * 0.025, t, 0.08);
    var sq = U.clamp((slip - 0.15) * 0.9, 0, 0.5);
    this.ng.gain.setTargetAtTime(this.vol * sq * 0.6, t, 0.04);
    this.nf.frequency.setTargetAtTime(950 + sq * 700 + Math.sin(t * 30) * 60, t, 0.03);
    this.wg.gain.setTargetAtTime(this.vol * U.clamp(speed / 60, 0, 1) * 0.12, t, 0.1);
  };
  Engine.prototype.setVol = function (v) { this.vol = v; };
  Engine.prototype.stop = function () {
    var self = this, t = ctx.currentTime;
    [this.g, this.ng, this.wg, this.tg].forEach(function (g) {
      g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.08);
    });
    setTimeout(function () {
      [self.o1, self.o2, self.o3, self.ns, self.ws].forEach(function (o) { try { o.stop(); } catch (e) { } });
    }, 600);
  };
  A.engine = function (volume, pan) {
    if (!ctx || !A.ready) return null;
    return new Engine(volume, pan);
  };

  A.tick = function () {
    if (!ctx || !A.ready) return;
    if (A.cur) A.cur.schedule();
    tickAmbient();
  };

  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
})();
