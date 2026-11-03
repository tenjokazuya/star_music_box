/* オーディオ基盤：WebAudioだけで効果音・ループ音・環境音を合成する（外部音声ファイル不使用）。
 * 初回の入力(タップ/キー)で RP.audio.unlock() が呼ばれるまでは無音。 */
(function (RP) {
  'use strict';

  var A = RP.audio = {};
  var ctx = null, master = null, comp = null;
  var bus = {};
  var noiseBufs = {};
  var vol = { master: 0.8, bgm: 0.7, sfx: 0.9, amb: 0.6 };
  var rng = RP.fxrng;
  var voices = 0;
  A.maxVoices = 48;   // 同時発音の上限（モバイルの負荷対策）
  var muted = false;

  A.ctx = function () { return ctx; };
  A.ready = function () { return !!ctx; };
  A.running = function () { return !!ctx && ctx.state === 'running'; };
  A.now = function () { return ctx ? ctx.currentTime : 0; };
  A.bus = function (n) { return bus[n] || bus.sfx; };
  A.vol = vol;

  // ---- 初期化・解禁 ----
  A.unlock = function () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { RP.log.warn('WebAudio非対応'); return false; }
      var c;
      try { c = new AC(); } catch (e) { RP.log.warn('AudioContext生成失敗', e); return false; }
      build(c);
      document.addEventListener('visibilitychange', function () {
        if (!ctx) { return; }
        if (document.hidden) { ctx.suspend(); } else { ctx.resume(); }
      });
      if (RP.music && RP.music.onReady) { RP.music.onReady(); }
      if (A.onReady) { A.onReady(); }
    }
    if (ctx.state === 'suspended') { ctx.resume(); }
    return true;
  };

  // 出力グラフを組む。検証用に OfflineAudioContext も渡せる（A.useContext）
  function build(c) {
    ctx = c;
    master = ctx.createGain();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 20; comp.ratio.value = 6;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    ['bgm', 'sfx', 'amb'].forEach(function (n) {
      bus[n] = ctx.createGain();
      bus[n].connect(master);
    });
    A.applyVolumes();
    makeNoise();
  }
  // 検証・書き出し用：任意のコンテキスト（OfflineAudioContext等）に差し替える
  A.useContext = function (c) {
    bus = {}; noiseBufs = {}; pulseWaves = {}; loops = {}; ambNodes = {}; voices = 0;
    A.maxVoices = 1e9;   // 一括スケジュールするため上限を外す
    build(c);
  };

  A.setVolume = function (kind, v) {
    vol[kind] = RP.util.clamp(v, 0, 1);
    A.applyVolumes();
  };
  A.setMuted = function (m) { muted = !!m; A.applyVolumes(); };
  A.applyVolumes = function () {
    if (!ctx) { return; }
    var t = ctx.currentTime;
    master.gain.setTargetAtTime(muted ? 0 : vol.master, t, 0.02);
    bus.bgm.gain.setTargetAtTime(vol.bgm, t, 0.02);
    bus.sfx.gain.setTargetAtTime(vol.sfx, t, 0.02);
    bus.amb.gain.setTargetAtTime(vol.amb, t, 0.02);
  };

  // ---- ノイズバッファ ----
  function makeNoise() {
    var sr = ctx.sampleRate, n = sr * 2, i;
    var w = ctx.createBuffer(1, n, sr), wd = w.getChannelData(0);
    for (i = 0; i < n; i++) { wd[i] = Math.random() * 2 - 1; }
    noiseBufs.white = w;
    var b = ctx.createBuffer(1, n, sr), bd = b.getChannelData(0), last = 0;
    for (i = 0; i < n; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      bd[i] = last * 3.5;
    }
    noiseBufs.brown = b;
    // 煮え立つ音：茶色ノイズ＋ランダムな泡
    var s = sr * 3, bb = ctx.createBuffer(1, s, sr), bbd = bb.getChannelData(0);
    last = 0;
    for (i = 0; i < s; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bbd[i] = last * 2.2; }
    for (var k = 0; k < 70; k++) {
      var st = Math.floor(Math.random() * (s - 3000)), f0 = 260 + Math.random() * 500, len = 400 + Math.random() * 1400;
      var amp = 0.12 + Math.random() * 0.22;
      for (i = 0; i < len; i++) {
        var ph = (i / sr) * (f0 + (i / len) * f0 * 0.9) * Math.PI * 2;
        bbd[st + i] += Math.sin(ph) * amp * Math.pow(1 - i / len, 2);
      }
    }
    noiseBufs.boil = bb;
    // 鉄板の焼ける音：白ノイズ＋パチパチ
    var z = sr * 2, sz = ctx.createBuffer(1, z, sr), szd = sz.getChannelData(0);
    for (i = 0; i < z; i++) { szd[i] = (Math.random() * 2 - 1) * 0.5; }
    for (k = 0; k < 90; k++) {
      var p = Math.floor(Math.random() * (z - 200)), a2 = 0.5 + Math.random() * 0.5;
      for (i = 0; i < 90; i++) { szd[p + i] += (Math.random() * 2 - 1) * a2 * Math.pow(1 - i / 90, 2); }
    }
    noiseBufs.sizzle = sz;
  }

  // ---- 基本シンセ ----
  var pulseWaves = {};
  function pulse(duty) {
    if (pulseWaves[duty]) { return pulseWaves[duty]; }
    var N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (var n = 1; n < N; n++) { im[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty); }
    var w = ctx.createPeriodicWave(re, im);
    pulseWaves[duty] = w;
    return w;
  }

  // o: { t, type|duty, f, f2, dur, vol, a, r, env:'perc'|'hold', bus, lp, vibRate, vibDepth, detune }
  A.tone = function (o) {
    if (!ctx || voices > A.maxVoices) { return null; }
    var t0 = o.t === undefined ? ctx.currentTime : o.t;
    var osc = ctx.createOscillator();
    if (o.duty) { osc.setPeriodicWave(pulse(o.duty)); } else { osc.type = o.type || 'square'; }
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) { osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur); }
    if (o.detune) { osc.detune.value = o.detune; }
    var g = ctx.createGain();
    var v = Math.max(0.0002, o.vol === undefined ? 0.2 : o.vol);
    var a = o.a === undefined ? 0.003 : o.a;
    var end = t0 + o.dur;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    if (o.env === 'hold') {
      var r = o.r === undefined ? 0.04 : o.r;
      g.gain.setValueAtTime(v, Math.max(t0 + a, end - r));
      g.gain.exponentialRampToValueAtTime(0.0001, end + 0.005);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    }
    var head = osc;
    if (o.vibRate) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vibRate; lg.gain.value = o.vibDepth || 6;
      lfo.connect(lg); lg.connect(osc.detune);
      lfo.start(t0); lfo.stop(end + 0.1);
    }
    if (o.lp) {
      var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp;
      head.connect(fl); head = fl;
    }
    head.connect(g);
    g.connect(o.bus ? (typeof o.bus === 'string' ? bus[o.bus] : o.bus) : bus.sfx);
    osc.start(t0);
    osc.stop(end + 0.05);
    voices++;
    osc.onended = function () { voices--; try { g.disconnect(); } catch (e) { /* noop */ } };
    return osc;
  };

  // o: { t, dur, vol, kind:'white'|'brown'|'boil'|'sizzle', ft, f1, f2, q, a, bus }
  A.noise = function (o) {
    if (!ctx || voices > A.maxVoices) { return null; }
    var t0 = o.t === undefined ? ctx.currentTime : o.t;
    var src = ctx.createBufferSource();
    var buf = noiseBufs[o.kind || 'white'];
    src.buffer = buf;
    src.loop = true;
    var g = ctx.createGain();
    var v = Math.max(0.0002, o.vol === undefined ? 0.2 : o.vol);
    var a = o.a === undefined ? 0.003 : o.a;
    var end = t0 + o.dur;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    var head = src;
    if (o.ft) {
      var f = ctx.createBiquadFilter();
      f.type = o.ft;
      f.frequency.setValueAtTime(o.f1 || 1000, t0);
      if (o.f2) { f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), end); }
      f.Q.value = o.q || 1;
      head.connect(f); head = f;
    }
    head.connect(g);
    g.connect(o.bus ? (typeof o.bus === 'string' ? bus[o.bus] : o.bus) : bus.sfx);
    src.start(t0, Math.random() * 1.5);
    src.stop(end + 0.05);
    voices++;
    src.onended = function () { voices--; try { g.disconnect(); } catch (e) { /* noop */ } };
    return src;
  };

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  A.hz = hz;
  var NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // "C#4" "Bb3" → MIDI番号
  A.midi = function (name) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) { return null; }
    return 12 * (parseInt(m[3], 10) + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0));
  };

  // 短いジングル：[[note, beats], ...] を順に鳴らす
  A.jingle = function (notes, o) {
    if (!ctx) { return; }
    o = o || {};
    var t = ctx.currentTime + 0.02, spb = 60 / (o.bpm || 140);
    notes.forEach(function (n) {
      var d = (n[1] || 0.5) * spb;
      if (n[0] !== 'r') {
        var m = typeof n[0] === 'string' ? A.midi(n[0]) : n[0];
        A.tone({ t: t, duty: o.duty || 0.25, f: hz(m), dur: d * 0.95, vol: o.vol || 0.2, env: 'hold', r: 0.05, bus: o.bus || 'sfx', vibRate: o.vib ? 6 : 0, vibDepth: 8 });
        if (o.harm) { A.tone({ t: t, type: 'triangle', f: hz(m - 12), dur: d * 0.95, vol: (o.vol || 0.2) * 1.1, env: 'hold', r: 0.05, bus: o.bus || 'sfx' }); }
      }
      t += d;
    });
    return t - ctx.currentTime;
  };

  // ---- ループ音（注ぎ・煮え・鉄板など。名前ごとに1本、音量だけ操作する） ----
  var loops = {};
  var LOOP_DEF = {
    pour:   { buf: 'white',  ft: 'bandpass', f: 2200, q: 0.9, base: 0.22 },
    beer:   { buf: 'white',  ft: 'bandpass', f: 3400, q: 0.7, base: 0.16 },
    boil:   { buf: 'boil',   ft: 'lowpass',  f: 1400, q: 0.5, base: 0.5 },
    sizzle: { buf: 'sizzle', ft: 'highpass', f: 2600, q: 0.5, base: 0.28 },
    sim:    { buf: 'boil',   ft: 'lowpass',  f: 520,  q: 0.5, base: 0.35 }
  };
  // g: 0..1（0で止める）。f: フィルタ周波数を変えたい時
  A.loop = function (name, g, f) {
    if (!ctx) { return; }
    var def = LOOP_DEF[name];
    if (!def) { return; }
    var L = loops[name];
    if (!L) {
      if (g <= 0) { return; }
      var src = ctx.createBufferSource();
      src.buffer = noiseBufs[def.buf]; src.loop = true;
      var fl = ctx.createBiquadFilter(); fl.type = def.ft; fl.frequency.value = def.f; fl.Q.value = def.q;
      var gn = ctx.createGain(); gn.gain.value = 0;
      src.connect(fl); fl.connect(gn); gn.connect(bus.sfx);
      src.start(0, Math.random());
      L = loops[name] = { src: src, filter: fl, gain: gn, g: 0 };
    }
    var t = ctx.currentTime;
    L.gain.gain.setTargetAtTime(g * def.base, t, 0.04);
    if (f) { L.filter.frequency.setTargetAtTime(f, t, 0.05); }
    L.g = g;
  };
  A.loopsOff = function () { Object.keys(loops).forEach(function (n) { A.loop(n, 0); }); };

  // ---- 環境音 ----
  var amb = { city: 0, cricket: 0, rain: 0, train: 0, chime: 0, wind: 0, sim: 0 };
  var ambTarget = { city: 0, cricket: 0, rain: 0, train: 0, chime: 0, wind: 0, sim: 0 };
  var ambNodes = {};
  var ambT = { cricket: 0, train: 8, chime: 3, drop: 0, car: 5 };

  function ambLoop(name, buf, ft, f, q) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBufs[buf]; src.loop = true;
    var fl = ctx.createBiquadFilter(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q || 0.5;
    var gn = ctx.createGain(); gn.gain.value = 0;
    src.connect(fl); fl.connect(gn); gn.connect(bus.amb);
    src.start(0, Math.random());
    return { src: src, filter: fl, gain: gn };
  }

  // 環境音の目標値を設定：{city, cricket, rain, train, chime, wind, sim}（0〜1）
  A.ambience = function (o) {
    Object.keys(ambTarget).forEach(function (k) { ambTarget[k] = o && o[k] !== undefined ? o[k] : 0; });
  };

  A.update = function (dt) {
    if (!ctx) { return; }
    var k;
    for (k in amb) { amb[k] += (ambTarget[k] - amb[k]) * Math.min(1, dt * 1.2); }
    if (!ambNodes.city) {
      ambNodes.city = ambLoop('city', 'brown', 'lowpass', 380, 0.4);
      ambNodes.rain = ambLoop('rain', 'white', 'bandpass', 4200, 0.35);
      ambNodes.wind = ambLoop('wind', 'brown', 'bandpass', 700, 0.8);
      ambNodes.sim = ambLoop('sim', 'boil', 'lowpass', 480, 0.5);
    }
    var t = ctx.currentTime;
    ambNodes.city.gain.gain.setTargetAtTime(amb.city * 0.5, t, 0.2);
    ambNodes.rain.gain.gain.setTargetAtTime(amb.rain * 0.16, t, 0.2);
    ambNodes.wind.gain.gain.setTargetAtTime(amb.wind * 0.28, t, 0.2);
    ambNodes.sim.gain.gain.setTargetAtTime(amb.sim * 0.22, t, 0.2);
    // 街の遠いざわめきを少しうねらせる
    ambNodes.city.filter.frequency.setTargetAtTime(330 + Math.sin(performance.now() / 2600) * 90, t, 0.4);
    // 虫の声（コオロギ：高い音を3連で）
    if (amb.cricket > 0.02) {
      ambT.cricket -= dt;
      if (ambT.cricket <= 0) {
        ambT.cricket = 0.55 + rng.next() * 0.5;
        var f = 4100 + rng.next() * 500;
        for (var i = 0; i < 3; i++) {
          A.tone({ t: t + i * 0.07, type: 'sine', f: f, dur: 0.05, vol: 0.05 * amb.cricket, bus: 'amb', a: 0.006 });
        }
      }
    }
    // 風鈴
    if (amb.chime > 0.02) {
      ambT.chime -= dt;
      if (ambT.chime <= 0) {
        ambT.chime = 2.5 + rng.next() * 5;
        var base = [2349, 2637, 3136, 3520][Math.floor(rng.next() * 4)];
        A.tone({ t: t, type: 'sine', f: base, dur: 1.4, vol: 0.06 * amb.chime, bus: 'amb', a: 0.002 });
        A.tone({ t: t, type: 'sine', f: base * 2.76, dur: 0.5, vol: 0.025 * amb.chime, bus: 'amb', a: 0.002 });
      }
    }
    // 遠くの電車（ガタンゴトン）
    if (amb.train > 0.02) {
      ambT.train -= dt;
      if (ambT.train <= 0) {
        ambT.train = 28 + rng.next() * 30;
        A.trainPass(amb.train);
      }
    }
    // 雨粒の近い音
    if (amb.rain > 0.02) {
      ambT.drop -= dt;
      if (ambT.drop <= 0) {
        ambT.drop = 0.08 + rng.next() * 0.25;
        A.tone({ t: t, type: 'sine', f: 1400 + rng.next() * 1600, f2: 700, dur: 0.04, vol: 0.03 * amb.rain, bus: 'amb' });
      }
    }
  };

  // 電車が高架を通る音
  A.trainPass = function (g) {
    if (!ctx) { return; }
    g = g === undefined ? 0.6 : g;
    var t = ctx.currentTime, i;
    var dur = 6.5;
    A.noise({ t: t, dur: dur, vol: 0.20 * g, kind: 'brown', ft: 'lowpass', f1: 300, f2: 700, q: 0.6, a: 2.2, bus: 'amb' });
    A.noise({ t: t + 1, dur: dur - 1, vol: 0.05 * g, kind: 'white', ft: 'bandpass', f1: 1500, f2: 900, q: 1.2, a: 2, bus: 'amb' });
    var beat = 0.19;
    for (i = 0; i < 28; i++) {
      var tt = t + 1.0 + i * beat, env = Math.sin(Math.min(1, i / 27) * Math.PI);
      A.tone({ t: tt, type: 'triangle', f: 95, f2: 55, dur: 0.07, vol: 0.12 * g * env, bus: 'amb' });
      if (i % 2 === 1) { A.noise({ t: tt + 0.01, dur: 0.05, vol: 0.07 * g * env, ft: 'highpass', f1: 2000, bus: 'amb' }); }
    }
  };

  // ---- SE（効果音）----
  var SE = {};
  RP.se = {
    play: function (name, opts) {
      if (!ctx) { return; }
      var fn = SE[name];
      if (!fn) { return; }
      try { fn(ctx.currentTime, opts || {}); } catch (e) { RP.log.error('SE失敗', name, e); }
    },
    has: function (n) { return !!SE[n]; },
    def: function (n, fn) { SE[n] = fn; }
  };

  function ping(t, f, d, v, type) { A.tone({ t: t, type: type || 'square', f: f, dur: d, vol: v, a: 0.002 }); }

  // UI
  SE.cursor = function (t) { ping(t, 880, 0.045, 0.09); };
  SE.ok = function (t) { ping(t, 784, 0.05, 0.16); ping(t + 0.05, 1175, 0.09, 0.16); };
  SE.cancel = function (t) { A.tone({ t: t, type: 'triangle', f: 620, f2: 380, dur: 0.1, vol: 0.18 }); };
  SE.error = function (t) { A.tone({ t: t, type: 'sawtooth', f: 150, dur: 0.07, vol: 0.14 }); A.tone({ t: t + 0.09, type: 'sawtooth', f: 130, dur: 0.1, vol: 0.14 }); };
  SE.window = function (t) {
    A.noise({ t: t, dur: 0.14, vol: 0.06, ft: 'bandpass', f1: 600, f2: 2400, q: 1 });
    A.tone({ t: t, type: 'triangle', f: 520, f2: 780, dur: 0.12, vol: 0.12 });
  };
  SE.tab = function (t) { ping(t, 1318, 0.04, 0.09, 'triangle'); };
  SE.coin = function (t, o) {
    var up = (o && o.pitch) || 0, k = Math.pow(2, up / 12);
    A.tone({ t: t, duty: 0.5, f: 1568 * k, dur: 0.05, vol: 0.2 });
    A.tone({ t: t + 0.05, duty: 0.5, f: 2093 * k, dur: 0.26, vol: 0.2 });
  };
  SE.coins = function (t) {
    for (var i = 0; i < 5; i++) { SE.coin(t + i * 0.06, { pitch: (i % 3) * 2 }); }
  };
  SE.buy = function (t) {
    A.noise({ t: t, dur: 0.06, vol: 0.12, ft: 'highpass', f1: 4000 });
    ping(t, 1568, 0.07, 0.12); ping(t + 0.07, 2093, 0.07, 0.12); ping(t + 0.14, 2637, 0.2, 0.12);
    A.tone({ t: t + 0.14, type: 'sine', f: 5274, dur: 0.3, vol: 0.05 });
  };
  SE.unlock = function (t) {
    [523, 659, 784, 1047, 1319].forEach(function (f, i) { A.tone({ t: t + i * 0.06, duty: 0.25, f: f, dur: 0.1, vol: 0.12 }); });
  };

  // 営業の音
  SE.door = function (t) {   // 引き戸のガラガラ＋鈴
    A.noise({ t: t, dur: 0.38, vol: 0.2, kind: 'brown', ft: 'bandpass', f1: 260, f2: 520, q: 1.4, a: 0.03 });
    A.noise({ t: t + 0.02, dur: 0.3, vol: 0.05, ft: 'highpass', f1: 1800 });
    A.tone({ t: t + 0.34, type: 'sine', f: 2637, dur: 0.6, vol: 0.09 });
    A.tone({ t: t + 0.34, type: 'sine', f: 3951, dur: 0.35, vol: 0.05 });
  };
  SE.leave = function (t) { A.noise({ t: t, dur: 0.22, vol: 0.14, kind: 'brown', ft: 'bandpass', f1: 520, f2: 260, q: 1.2 }); };
  SE.order = function (t) {   // 注文を受けた
    A.tone({ t: t, type: 'triangle', f: 1046, f2: 700, dur: 0.05, vol: 0.2 });
    ping(t + 0.06, 1568, 0.08, 0.1);
  };
  SE.bowl = function (t) {    // 丼を置く
    A.tone({ t: t, type: 'sine', f: 210, f2: 90, dur: 0.1, vol: 0.4 });
    A.noise({ t: t, dur: 0.04, vol: 0.12, ft: 'highpass', f1: 2500 });
  };
  SE.select = function (t) { ping(t, 988, 0.04, 0.1, 'triangle'); };
  SE.noodleIn = function (t) {   // 麺を釜へ
    A.noise({ t: t, dur: 0.28, vol: 0.2, kind: 'brown', ft: 'lowpass', f1: 1500, f2: 300, q: 0.7 });
    A.tone({ t: t + 0.02, type: 'sine', f: 380, f2: 190, dur: 0.14, vol: 0.2 });
  };
  SE.noodleOut = function (t) {  // 湯切り
    for (var i = 0; i < 3; i++) {
      A.noise({ t: t + i * 0.09, dur: 0.1, vol: 0.18 - i * 0.04, ft: 'highpass', f1: 3200 - i * 600, f2: 900, q: 0.8, a: 0.004 });
    }
    A.tone({ t: t, type: 'sine', f: 330, f2: 520, dur: 0.12, vol: 0.12 });
  };
  SE.soupStart = function (t) { A.tone({ t: t, type: 'sine', f: 500, f2: 800, dur: 0.07, vol: 0.12 }); };
  SE.soupEnd = function (t) { A.tone({ t: t, type: 'sine', f: 800, f2: 300, dur: 0.08, vol: 0.14 }); };
  SE.topping = function (t) {
    A.tone({ t: t, type: 'sine', f: 760, f2: 300, dur: 0.07, vol: 0.2 });
    A.noise({ t: t, dur: 0.04, vol: 0.08, ft: 'bandpass', f1: 2500, q: 1 });
  };
  SE.gyozaIn = function (t) { A.noise({ t: t, dur: 0.55, vol: 0.28, ft: 'highpass', f1: 2400, f2: 5500, q: 0.5, a: 0.01 }); };
  SE.flip = function (t) {
    A.tone({ t: t, type: 'triangle', f: 1800, f2: 900, dur: 0.05, vol: 0.18 });
    A.noise({ t: t, dur: 0.09, vol: 0.12, ft: 'bandpass', f1: 3000, q: 2 });
  };
  SE.plate = function (t) { ping(t, 2400, 0.05, 0.1, 'triangle'); ping(t + 0.04, 3100, 0.08, 0.08, 'triangle'); };
  SE.rice = function (t) { A.noise({ t: t, dur: 0.12, vol: 0.14, ft: 'bandpass', f1: 1800, q: 0.8 }); A.tone({ t: t + 0.05, type: 'sine', f: 300, f2: 180, dur: 0.1, vol: 0.2 }); };
  SE.glass = function (t) { ping(t, 3136, 0.12, 0.09, 'sine'); ping(t + 0.02, 4699, 0.1, 0.05, 'sine'); };
  SE.serve = function (t) {
    A.tone({ t: t, type: 'triangle', f: 330, f2: 160, dur: 0.08, vol: 0.3 });
    ping(t + 0.08, 1568, 0.09, 0.1);
    ping(t + 0.16, 2093, 0.18, 0.1);
  };
  SE.eat = function (t) {   // ずるずる
    A.noise({ t: t, dur: 0.5, vol: 0.55, ft: 'bandpass', f1: 500, f2: 1800, q: 2.4, a: 0.05 });
    A.noise({ t: t + 0.6, dur: 0.4, vol: 0.45, ft: 'bandpass', f1: 800, f2: 1500, q: 2.4, a: 0.05 });
  };
  SE.pay = function (t) { SE.coin(t); SE.coin(t + 0.11, { pitch: 4 }); };
  SE.tip = function (t) { SE.coins(t); };
  SE.angry = function (t) {
    A.tone({ t: t, type: 'sawtooth', f: 260, f2: 110, dur: 0.5, vol: 0.18, vibRate: 22, vibDepth: 60 });
    A.noise({ t: t, dur: 0.12, vol: 0.18, ft: 'lowpass', f1: 800 });
  };
  SE.sigh = function (t) { A.tone({ t: t, type: 'triangle', f: 440, f2: 220, dur: 0.5, vol: 0.14 }); };
  SE.clear = function (t) { ping(t, 2793, 0.04, 0.09, 'triangle'); ping(t + 0.06, 2217, 0.05, 0.09, 'triangle'); A.noise({ t: t + 0.03, dur: 0.08, vol: 0.06, ft: 'highpass', f1: 3500 }); };
  SE.trash = function (t) { A.noise({ t: t, dur: 0.22, vol: 0.2, kind: 'brown', ft: 'lowpass', f1: 800, f2: 200 }); };
  SE.warn = function (t) { ping(t, 1046, 0.07, 0.12); ping(t + 0.12, 1046, 0.07, 0.12); };
  SE.tick = function (t) { ping(t, 1500, 0.02, 0.05, 'triangle'); };
  SE.clapper = function (t) {   // 拍子木 カンカン
    [0, 0.22].forEach(function (d) {
      A.tone({ t: t + d, type: 'triangle', f: 1700, f2: 850, dur: 0.07, vol: 0.4 });
      A.noise({ t: t + d, dur: 0.05, vol: 0.2, ft: 'bandpass', f1: 2400, q: 1.5 });
    });
  };
  SE.drum = function (t) {
    A.tone({ t: t, type: 'sine', f: 130, f2: 48, dur: 0.28, vol: 0.55 });
    A.noise({ t: t, dur: 0.07, vol: 0.12, kind: 'brown', ft: 'lowpass', f1: 900 });
  };
  SE.combo = function (t, o) {
    var n = Math.min(12, (o && o.n) || 1);
    var f = 660 * Math.pow(2, n / 12 * 1.5 / 1.5);
    ping(t, f, 0.06, 0.12); ping(t + 0.06, f * 1.5, 0.12, 0.12);
  };
  SE.star = function (t, o) {
    var n = (o && o.n) || 0;
    var notes = [1319, 1568, 2093, 2637];
    for (var i = 0; i <= Math.min(3, n); i++) { A.tone({ t: t + i * 0.07, type: 'triangle', f: notes[i], dur: 0.2, vol: 0.14 }); }
  };
  SE.thunder = function (t) { A.noise({ t: t, dur: 1.8, vol: 0.35, kind: 'brown', ft: 'lowpass', f1: 500, f2: 80, q: 0.6, a: 0.1 }); };
  SE.splash = function (t) { A.noise({ t: t, dur: 0.18, vol: 0.12, ft: 'bandpass', f1: 1200, f2: 400, q: 0.8 }); };
  SE.stamp = function (t) { A.tone({ t: t, type: 'sine', f: 140, f2: 60, dur: 0.18, vol: 0.5 }); A.noise({ t: t, dur: 0.05, vol: 0.2, ft: 'lowpass', f1: 1500 }); };
  SE.whoosh = function (t) { A.noise({ t: t, dur: 0.3, vol: 0.12, ft: 'bandpass', f1: 400, f2: 3000, q: 1, a: 0.1 }); };
  SE.firework = function (t) {
    A.tone({ t: t, type: 'sine', f: 400, f2: 1800, dur: 0.5, vol: 0.1 });
    A.noise({ t: t + 0.5, dur: 0.6, vol: 0.3, kind: 'brown', ft: 'lowpass', f1: 1800, f2: 120, a: 0.005 });
    A.noise({ t: t + 0.52, dur: 0.5, vol: 0.12, ft: 'highpass', f1: 3000, f2: 800 });
  };
  SE.meow = function (t) { A.tone({ t: t, type: 'triangle', f: 700, f2: 1100, dur: 0.12, vol: 0.14 }); A.tone({ t: t + 0.12, type: 'triangle', f: 1100, f2: 600, dur: 0.25, vol: 0.14 }); };
  SE.bark = function (t) { A.tone({ t: t, type: 'sawtooth', f: 420, f2: 260, dur: 0.1, vol: 0.14, lp: 1400 }); A.tone({ t: t + 0.16, type: 'sawtooth', f: 420, f2: 260, dur: 0.1, vol: 0.14, lp: 1400 }); };

  // ジングル系
  SE.fanfare = function () {
    A.jingle([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5], ['G5', 0.4], ['C6', 2]], { bpm: 150, vol: 0.2, harm: true, vib: true });
  };
  SE.fanfareBig = function () {
    A.jingle([['G4', 0.34], ['C5', 0.34], ['E5', 0.34], ['G5', 0.5], ['E5', 0.25], ['G5', 0.25], ['C6', 1.2],
      ['A5', 0.4], ['B5', 0.4], ['C6', 0.4], ['D6', 0.4], ['E6', 2.2]], { bpm: 150, vol: 0.2, harm: true, vib: true });
  };
  SE.levelUp = function () {
    A.jingle([['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.25], ['E6', 0.25], ['G6', 1.6]], { bpm: 170, vol: 0.18, harm: true });
  };
  SE.dayEnd = function () {
    A.jingle([['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.8]], { bpm: 110, vol: 0.16, harm: true, vib: true });
  };
  SE.gameOver = function () {
    A.jingle([['E4', 0.6], ['D4', 0.6], ['C4', 0.6], ['B3', 0.6], ['A3', 2.4]], { bpm: 70, vol: 0.2, harm: true, duty: 0.5 });
  };
  SE.open = function () {   // 営業開始
    RP.se.play('clapper');
    setTimeout(function () { A.jingle([['C5', 0.25], ['G5', 0.25], ['C6', 1]], { bpm: 190, vol: 0.14 }); }, 520);
  };
  SE.rushWarn = function (t) {
    for (var i = 0; i < 3; i++) { ping(t + i * 0.13, 880 + i * 220, 0.1, 0.13); }
  };
  SE.event = function () { A.jingle([['E5', 0.25], ['G5', 0.25], ['B5', 0.25], ['E6', 0.9]], { bpm: 180, vol: 0.14 }); };
  SE.perfect = function (t) {
    ping(t, 1568, 0.05, 0.12); ping(t + 0.05, 1976, 0.05, 0.12); ping(t + 0.1, 2349, 0.05, 0.12); ping(t + 0.15, 3136, 0.25, 0.12);
  };
})(window.RP);
