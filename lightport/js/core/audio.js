/* audio.js — Web Audio による効果音・BGM・環境音の合成
 *
 *  効果音   Game.sfxData のレシピ（短い合成音）を鳴らす           Game.audio.sfx('ok')
 *  BGM      Game.music.tracks の MML 風データをシーケンサで再生    Game.audio.bgm('village')
 *  ジングル  短い曲。BGM を一時的に下げて鳴らす                     await Game.audio.jingle('get')
 *  環境音    うみ・かぜ・虫などをノイズとオシレータで作る           Game.audio.ambient(['sea','night'])
 *
 * ブラウザは操作があるまで音を出せないため、unlock() が最初の入力で呼ばれる。
 * それまでに要求された BGM と環境音は覚えておき、unlock 後に始める。
 */
(function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var A = Game.audio = {
    ctx: null,
    ready: false,
    wantBgm: null,        // { name, opts }
    wantAmb: [],
    curBgm: null,
    curAmb: {},           // 名前 → { out, stop }
    muted: false
  };

  var ctx, master, comp, analyser, bgmBus, sfxBus, ambBus, jingleBus, reverb, reverbSend;
  var waves = {};
  var noiseBuf = {};

  /* ============ 基本 ============ */
  function vol(v) { return Math.pow(Math.max(0, Math.min(10, v)) / 10, 1.7); }

  A.applySettings = function () {
    if (!A.ready) { return; }
    var s = Game.settings, t = ctx.currentTime;
    bgmBus.gain.setTargetAtTime(vol(s.bgm) * 0.9, t, 0.05);
    sfxBus.gain.setTargetAtTime(vol(s.sfx) * 1.0, t, 0.05);
    ambBus.gain.setTargetAtTime(vol(s.amb) * 0.9, t, 0.05);
    jingleBus.gain.setTargetAtTime(vol(s.bgm) * 1.0, t, 0.05);
  };

  function makeImpulse(sec, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * sec);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    }
    return buf;
  }

  function makeNoise() {
    var rate = ctx.sampleRate, len = rate * 3;
    var w = ctx.createBuffer(1, len, rate), b = ctx.createBuffer(1, len, rate), p = ctx.createBuffer(1, len, rate);
    var dw = w.getChannelData(0), db = b.getChannelData(0), dp = p.getChannelData(0);
    var last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      dw[i] = white;
      last = (last + 0.02 * white) / 1.02; db[i] = last * 3.5;
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
      dp[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11; b6 = white * 0.115926;
    }
    noiseBuf = { white: w, brown: b, pink: p };
  }

  function pulseWave(duty) {
    var key = 'p' + duty;
    if (waves[key]) { return waves[key]; }
    var n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (var k = 1; k < n; k++) { im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); }
    waves[key] = ctx.createPeriodicWave(re, im);
    return waves[key];
  }

  A.unlock = function () {
    if (!AC) { return; }
    if (!A.ctx) {
      try { A.ctx = ctx = new AC(); } catch (e) { return; }
      master = ctx.createGain(); master.gain.value = 0.85;
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
      analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
      master.connect(comp); comp.connect(analyser); comp.connect(ctx.destination);
      bgmBus = ctx.createGain(); sfxBus = ctx.createGain(); ambBus = ctx.createGain(); jingleBus = ctx.createGain();
      bgmBus.connect(master); sfxBus.connect(master); ambBus.connect(master); jingleBus.connect(master);
      reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(1.6, 2.6);
      reverbSend = ctx.createGain(); reverbSend.gain.value = 0.16;
      bgmBus.connect(reverbSend); jingleBus.connect(reverbSend); reverbSend.connect(reverb); reverb.connect(master);
      makeNoise();
    }
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      var p = ctx.resume();
      if (p && p.catch) { p.catch(function () { /* 無視 */ }); }
    }
    if (!A.ready) {
      A.ready = true;
      A.applySettings();
      if (A.wantBgm) { var w = A.wantBgm; A.bgm(w.name, w.opts); }
      A.ambient(A.wantAmb);
    }
  };

  document.addEventListener('visibilitychange', function () {
    if (!ctx) { return; }
    if (document.hidden) { ctx.suspend(); } else { ctx.resume(); }
  }, false);
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { A.unlock(); }, { passive: true });
  });

  /** 検証用: いま出ている音の大きさ（RMS） */
  A.level = function () {
    if (!A.ready) { return 0; }
    var d = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(d);
    var s = 0;
    for (var i = 0; i < d.length; i++) { s += d[i] * d[i]; }
    return Math.sqrt(s / d.length);
  };

  /* ============ 音のもと ============ */
  function waveFor(osc, w) {
    if (w === 'sq' || w === 'p50') { osc.setPeriodicWave(pulseWave(0.5)); }
    else if (w === 'p25') { osc.setPeriodicWave(pulseWave(0.25)); }
    else if (w === 'p12') { osc.setPeriodicWave(pulseWave(0.125)); }
    else if (w === 'p75') { osc.setPeriodicWave(pulseWave(0.75)); }
    else if (w === 'tri') { osc.type = 'triangle'; }
    else if (w === 'saw') { osc.type = 'sawtooth'; }
    else { osc.type = 'sine'; }
  }

  function noiseSrc(kind) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf[kind || 'white'];
    s.loop = true;
    s.loopStart = Math.random() * 1.5;
    return s;
  }

  /** 効果音 1 声分。v: { w, f, d, v, at, a, lp, hp, bp, q, fe, arp, step, vib } */
  function voice(v, t0, dest) {
    var t = t0 + (v.at || 0);
    var d = v.d || 0.1, a = v.a === undefined ? 0.002 : v.a;
    var g = ctx.createGain();
    var vv = (v.v === undefined ? 0.2 : v.v);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vv, t + a);
    if (v.hold) { g.gain.setValueAtTime(vv, t + v.hold); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    var src, stopAt = t + d + 0.05;
    if (v.w === 'noise' || v.w === 'brown' || v.w === 'pink') {
      src = noiseSrc(v.w === 'noise' ? 'white' : v.w);
    } else {
      src = ctx.createOscillator();
      waveFor(src, v.w);
      var f0 = v.f instanceof Array ? v.f[0] : v.f;
      var f1 = v.f instanceof Array ? v.f[1] : null;
      src.frequency.setValueAtTime(f0 || 440, t);
      if (f1) { src.frequency.exponentialRampToValueAtTime(f1, t + d); }
      if (v.arp) {
        var st = v.step || 0.06;
        for (var i = 0; i < v.arp.length; i++) { src.frequency.setValueAtTime(v.arp[i], t + i * st); }
      }
      if (v.vib) {
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = v.vib[0]; lg.gain.value = v.vib[1];
        lfo.connect(lg); lg.connect(src.detune);
        lfo.start(t); lfo.stop(stopAt);
      }
    }
    var node = src;
    var ftype = v.lp ? 'lowpass' : (v.hp ? 'highpass' : (v.bp ? 'bandpass' : null));
    if (ftype) {
      var fl = ctx.createBiquadFilter();
      fl.type = ftype;
      var fc = v.lp || v.hp || v.bp;
      fl.frequency.setValueAtTime(fc, t);
      if (v.fe) { fl.frequency.exponentialRampToValueAtTime(v.fe, t + d); }
      fl.Q.value = v.q || (ftype === 'bandpass' ? 1.2 : 0.7);
      node.connect(fl); node = fl;
    }
    node.connect(g); g.connect(dest);
    src.start(t); src.stop(stopAt);
  }

  /** 効果音を鳴らす。opts.rate で全体の高さを変えられる */
  A.sfx = function (name, opts) {
    if (!A.ready || A.muted) { return; }
    var rec = Game.sfxData && Game.sfxData[name];
    if (!rec) { return; }
    var t = ctx.currentTime + 0.005;
    var rate = (opts && opts.rate) || 1;
    var vs = (opts && opts.vol) || 1;
    for (var i = 0; i < rec.length; i++) {
      var v = rec[i];
      if (rate !== 1 || vs !== 1) {
        v = Object.assign({}, v);
        if (rate !== 1) {
          if (v.f instanceof Array) { v.f = [v.f[0] * rate, v.f[1] * rate]; } else if (v.f) { v.f = v.f * rate; }
          if (v.arp) { v.arp = v.arp.map(function (x) { return x * rate; }); }
        }
        v.v = (v.v === undefined ? 0.2 : v.v) * vs;
      }
      voice(v, t, sfxBus);
    }
  };

  /* ============ MML ============ */
  var NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  function expandRepeats(s) {
    var re = /\[([^\[\]]*)\](\d*)/;
    var guard = 0;
    while (re.test(s) && guard++ < 200) {
      s = s.replace(re, function (m, body, n) {
        var k = n ? parseInt(n, 10) : 2, out = '';
        for (var i = 0; i < k; i++) { out += body + ' '; }
        return out;
      });
    }
    return s;
  }

  function lenBeats(n, dots) {
    var b = 4 / n, add = b / 2, r = b;
    for (var i = 0; i < dots; i++) { r += add; add /= 2; }
    return r;
  }

  /** MML → { events:[{t,d,p,v,inst}], beats } 。drum=true なら音名ではなくドラム記号 */
  function parseMML(src, drum) {
    var s = expandRepeats(src).replace(/\|/g, ' ');
    var i = 0, oct = 4, def = 4, vol = 12, gate = 7, inst = 0;
    var t = 0, ev = [], tie = false, last = null;
    function num() {
      var m = /^\d+/.exec(s.slice(i));
      if (!m) { return null; }
      i += m[0].length; return parseInt(m[0], 10);
    }
    function dots() { var n = 0; while (s.charAt(i) === '.') { n++; i++; } return n; }
    while (i < s.length) {
      var c = s.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      i++;
      if (c === 'o') { oct = num(); continue; }
      if (c === '>') { oct++; continue; }
      if (c === '<') { oct--; continue; }
      if (c === 'l') { def = num(); dots(); continue; }
      if (c === 'v') { vol = num(); continue; }
      if (c === 'q') { gate = num(); continue; }
      if (c === '@') { inst = num(); continue; }
      if (c === 'r') {
        var rn = num() || def, rd = dots();
        t += lenBeats(rn, rd); tie = false; last = null; continue;
      }
      var isNote = !drum && NOTE[c] !== undefined;
      var isDrum = drum && 'kshptx'.indexOf(c) >= 0;
      if (isNote || isDrum) {
        var p;
        if (isNote) {
          p = 12 * (oct + 1) + NOTE[c];
          var ac = s.charAt(i);
          if (ac === '+' || ac === '#') { p++; i++; } else if (ac === '-') { p--; i++; }
        } else { p = c; }
        var n = num() || def, dd = dots();
        var len = lenBeats(n, dd);
        var tieNext = false;
        if (s.charAt(i) === '&') { tieNext = true; i++; }
        if (tie && last && last.p === p) {
          last.d += len;
        } else {
          last = { t: t, d: len, p: p, v: vol, g: gate, inst: inst };
          ev.push(last);
        }
        tie = tieNext;
        t += len;
        continue;
      }
      // 未知の文字は無視
    }
    return { events: ev, beats: t };
  }
  A.parseMML = parseMML;

  /* ============ BGM シーケンサ ============ */
  var players = [];
  var LOOKAHEAD = 0.18;

  function midiFreq(p) { return 440 * Math.pow(2, (p - 69) / 12); }

  function playNote(pl, chd, ev, when, spb) {
    var ch = chd.def;
    var dur = ev.d * spb;
    var sound = Math.max(0.03, dur * (ev.g / 8));
    var inst = (ch.alt && ev.inst && ch.alt[ev.inst]) ? Object.assign({}, ch, ch.alt[ev.inst]) : ch;
    var osc = ctx.createOscillator();
    waveFor(osc, inst.w);
    osc.frequency.setValueAtTime(midiFreq(ev.p + (inst.trans || 0)), when);
    if (inst.detune) { osc.detune.value = inst.detune; }
    var g = ctx.createGain();
    var peak = (inst.vol === undefined ? 0.3 : inst.vol) * (ev.v / 15);
    var a = inst.a === undefined ? 0.004 : inst.a;
    var dcy = inst.d === undefined ? 0.1 : inst.d;
    var sus = inst.s === undefined ? 0.7 : inst.s;
    var rel = inst.r === undefined ? 0.05 : inst.r;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + a);
    if (sus < 1) { g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), when + a + dcy); }
    g.gain.setValueAtTime(Math.max(0.0002, peak * (sus < 1 ? sus : 1)), Math.max(when + a + dcy, when + sound));
    g.gain.exponentialRampToValueAtTime(0.0001, when + sound + rel);
    osc.connect(g); g.connect(chd.out);
    if (chd.lfoGain) { chd.lfoGain.connect(osc.detune); }
    osc.start(when); osc.stop(when + sound + rel + 0.05);
    osc.onended = function () { try { if (chd.lfoGain) { chd.lfoGain.disconnect(osc.detune); } g.disconnect(); } catch (e) { /* 無視 */ } };
  }

  function playDrum(chd, ev, when) {
    var out = chd.out, k = ev.p, vv = (ev.v / 15) * (chd.def.vol === undefined ? 0.4 : chd.def.vol);
    var o, g, n, f;
    if (k === 'k') {
      o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(42, when + 0.12);
      g = ctx.createGain(); g.gain.setValueAtTime(vv * 1.6, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
      o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.2);
    } else if (k === 's') {
      n = noiseSrc('white'); f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
      g = ctx.createGain(); g.gain.setValueAtTime(vv * 1.1, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.13);
      n.connect(f); f.connect(g); g.connect(out); n.start(when); n.stop(when + 0.16);
      o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(220, when); o.frequency.exponentialRampToValueAtTime(120, when + 0.07);
      var g2 = ctx.createGain(); g2.gain.setValueAtTime(vv * 0.6, when); g2.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
      o.connect(g2); g2.connect(out); o.start(when); o.stop(when + 0.1);
    } else if (k === 'h' || k === 'p') {
      n = noiseSrc('white'); f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      g = ctx.createGain(); var dec = k === 'h' ? 0.035 : 0.16;
      g.gain.setValueAtTime(vv * 0.55, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dec);
      n.connect(f); f.connect(g); g.connect(out); n.start(when); n.stop(when + dec + 0.03);
    } else if (k === 't') {
      o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(190, when); o.frequency.exponentialRampToValueAtTime(95, when + 0.14);
      g = ctx.createGain(); g.gain.setValueAtTime(vv * 1.2, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
      o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.22);
    } else if (k === 'x') {
      n = noiseSrc('white'); f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500;
      g = ctx.createGain(); g.gain.setValueAtTime(vv * 0.8, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
      n.connect(f); f.connect(g); g.connect(out); n.start(when); n.stop(when + 0.95);
    }
  }

  function buildPlayer(track, bus, loop) {
    var spb = 60 / track.tempo;
    var pl = { track: track, spb: spb, bus: bus, loop: loop, chans: [], beats: 0, start: 0, timer: null, done: false, nodes: [] };
    Object.keys(track.ch).forEach(function (name) {
      var def = track.ch[name];
      var parsed = parseMML(def.mml, def.w === 'noise');
      pl.beats = Math.max(pl.beats, parsed.beats);
      var out = ctx.createGain(); out.gain.value = def.gain === undefined ? 1 : def.gain;
      out.connect(bus);
      var chd = { name: name, def: def, events: parsed.events, beats: parsed.beats, idx: 0, loopN: 0, out: out };
      if (def.pan !== undefined && ctx.createStereoPanner) {
        var pan = ctx.createStereoPanner(); pan.pan.value = def.pan;
        out.disconnect(); out.connect(pan); pan.connect(bus); pl.nodes.push(pan);
      }
      if (def.vib) {
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = def.vib[0]; lg.gain.value = def.vib[1];
        lfo.connect(lg); lfo.start();
        chd.lfoGain = lg; pl.nodes.push(lfo);
      }
      if (def.echo) {
        var dl = ctx.createDelay(1.0), fb = ctx.createGain(), wet = ctx.createGain();
        dl.delayTime.value = spb * (def.echoBeats || 0.75);
        fb.gain.value = 0.34; wet.gain.value = def.echo;
        out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(bus);
        pl.nodes.push(dl, fb, wet);
      }
      pl.chans.push(chd);
      pl.nodes.push(out);
    });
    // 全チャンネルは同じ長さで揃える（ループがずれないように）
    pl.loopBeats = pl.beats;
    return pl;
  }

  function schedulePlayer(pl) {
    var now = ctx.currentTime;
    var horizon = now + LOOKAHEAD;
    var alive = false;
    for (var ci = 0; ci < pl.chans.length; ci++) {
      var chd = pl.chans[ci];
      var drum = chd.def.w === 'noise';
      for (;;) {
        if (chd.idx >= chd.events.length) {
          if (pl.loop) { chd.loopN++; chd.idx = 0; if (!chd.events.length) { break; } } else { break; }
        }
        var ev = chd.events[chd.idx];
        var when = pl.start + (chd.loopN * pl.loopBeats + ev.t) * pl.spb;
        if (when > horizon) { alive = true; break; }
        chd.idx++;
        if (when < now - 0.02) { continue; }
        if (drum) { playDrum(chd, ev, when); } else { playNote(pl, chd, ev, when, pl.spb); }
      }
    }
    if (!pl.loop) {
      var endT = pl.start + pl.loopBeats * pl.spb;
      if (!alive && now > endT + 0.3) { pl.done = true; }
    }
  }

  function startPlayer(pl) {
    pl.start = ctx.currentTime + 0.08;
    schedulePlayer(pl);
    pl.timer = setInterval(function () {
      if (pl.done) { stopPlayer(pl, 0.05); return; }
      schedulePlayer(pl);
    }, 30);
    players.push(pl);
  }

  function stopPlayer(pl, fade) {
    if (pl.stopped) { return; }
    pl.stopped = true;
    clearInterval(pl.timer);
    var t = ctx.currentTime;
    try {
      pl.bus.gain.cancelScheduledValues(t);
      pl.bus.gain.setValueAtTime(pl.bus.gain.value, t);
      pl.bus.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.03, fade));
    } catch (e) { /* 無視 */ }
    setTimeout(function () {
      try {
        pl.chans.forEach(function (c) { c.out.disconnect(); });
        pl.nodes.forEach(function (n) { try { if (n.stop) { n.stop(); } n.disconnect(); } catch (e2) { /* 無視 */ } });
        pl.bus.disconnect();
      } catch (e3) { /* 無視 */ }
      var k = players.indexOf(pl); if (k >= 0) { players.splice(k, 1); }
    }, (fade + 0.4) * 1000);
  }

  /** BGM を切り替える。同じ曲なら何もしない */
  A.bgm = function (name, opts) {
    opts = opts || {};
    A.wantBgm = name ? { name: name, opts: opts } : null;
    if (!A.ready) { return; }
    if (A.curBgm && A.curBgm.name === name && !A.curBgm.pl.stopped) { return; }
    var fade = opts.fade === undefined ? 0.7 : opts.fade;
    if (A.curBgm) { stopPlayer(A.curBgm.pl, fade); A.curBgm = null; }
    if (!name) { return; }
    var track = Game.music && Game.music.tracks[name];
    if (!track) { Game.fail('audio.bgm', '曲がない: ' + name); return; }
    var bus = ctx.createGain();
    bus.gain.value = 0.0001;
    bus.connect(bgmBus);
    var pl = buildPlayer(track, bus, true);
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(track.gain === undefined ? 1 : track.gain, ctx.currentTime + (opts.fadeIn === undefined ? Math.min(0.8, fade + 0.1) : opts.fadeIn));
    A.curBgm = { name: name, pl: pl };
    startPlayer(pl);
  };
  A.stopBgm = function (fade) { A.bgm(null, { fade: fade === undefined ? 0.8 : fade }); };

  /** BGM の音量を一時的に変える（会話中に少し下げるなど） */
  A.duck = function (k, sec) {
    if (!A.ready) { return; }
    var t = ctx.currentTime;
    bgmBus.gain.cancelScheduledValues(t);
    bgmBus.gain.setTargetAtTime(vol(Game.settings.bgm) * 0.9 * k, t, sec === undefined ? 0.15 : sec);
  };

  /** ジングル（短い曲）。終わるまで待てる */
  A.jingle = function (name) {
    return new Promise(function (resolve) {
      if (!A.ready || A.muted) { Game.after(600).then(resolve); return; }
      var track = Game.music && Game.music.tracks[name];
      if (!track) { resolve(); return; }
      var bus = ctx.createGain();
      bus.gain.value = track.gain === undefined ? 1 : track.gain;
      bus.connect(jingleBus);
      var pl = buildPlayer(track, bus, false);
      var sec = pl.loopBeats * pl.spb;
      A.duck(0.12, 0.05);
      startPlayer(pl);
      Game.after((sec + 0.2) * 1000).then(function () { A.duck(1, 0.4); });
      Game.after((sec + 0.35) * 1000).then(resolve);
    });
  };

  /* ============ 環境音 ============ */
  function rnd(a, b) { return a + Math.random() * (b - a); }

  var AMB = {};

  // うみ: 波の寄せては返す音
  AMB.sea = function (out) {
    var n = noiseSrc('brown'), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 0.5;
    g.gain.value = 0.0;
    var lfo = ctx.createOscillator(), lg = ctx.createGain(), base = ctx.createConstantSource ? ctx.createConstantSource() : null;
    lfo.frequency.value = 0.11; lg.gain.value = 0.13;
    lfo.connect(lg); lg.connect(g.gain);
    var lfo2 = ctx.createOscillator(), lg2 = ctx.createGain();
    lfo2.frequency.value = 0.11; lg2.gain.value = 380;
    lfo2.connect(lg2); lg2.connect(lp.frequency);
    g.gain.value = 0.2;
    n.connect(lp); lp.connect(g); g.connect(out);
    var n2 = noiseSrc('pink'), hp = ctx.createBiquadFilter(), g3 = ctx.createGain(), lfo3 = ctx.createOscillator(), lg3 = ctx.createGain();
    hp.type = 'bandpass'; hp.frequency.value = 1800; hp.Q.value = 0.4;
    g3.gain.value = 0.02; lfo3.frequency.value = 0.11; lg3.gain.value = 0.018; lfo3.phase = 0;
    lfo3.connect(lg3); lg3.connect(g3.gain);
    n2.connect(hp); hp.connect(g3); g3.connect(out);
    [n, n2, lfo, lfo2, lfo3].forEach(function (s) { s.start(); });
    if (base) { base.disconnect(); }
    var timer = null;
    return {
      stop: function () { [n, n2, lfo, lfo2, lfo3].forEach(function (s) { try { s.stop(); } catch (e) { /* 無視 */ } }); clearTimeout(timer); }
    };
  };

  // かもめ
  AMB.gull = function (out) {
    var timer = null, alive = true;
    function cry() {
      if (!alive) { return; }
      var t = ctx.currentTime + 0.02, k = 2 + Math.floor(Math.random() * 3), base = rnd(1300, 1700);
      for (var i = 0; i < k; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        var at = t + i * 0.22;
        o.frequency.setValueAtTime(base, at); o.frequency.exponentialRampToValueAtTime(base * 0.62, at + 0.17);
        g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.045, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);
        o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.22);
      }
      timer = setTimeout(cry, rnd(7000, 16000));
    }
    timer = setTimeout(cry, rnd(2500, 6000));
    return { stop: function () { alive = false; clearTimeout(timer); } };
  };

  // かぜ
  AMB.wind = function (out, o) {
    o = o || {};
    var n = noiseSrc('pink'), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = o.freq || 420; bp.Q.value = 0.9;
    g.gain.value = o.gain || 0.18;
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 120;
    lfo.connect(lg); lg.connect(bp.frequency);
    var lfo2 = ctx.createOscillator(), lg2 = ctx.createGain();
    lfo2.frequency.value = 0.19; lg2.gain.value = (o.gain || 0.18) * 0.5;
    lfo2.connect(lg2); lg2.connect(g.gain);
    n.connect(bp); bp.connect(g); g.connect(out);
    [n, lfo, lfo2].forEach(function (s) { s.start(); });
    return { stop: function () { [n, lfo, lfo2].forEach(function (s) { try { s.stop(); } catch (e) { /* 無視 */ } }); } };
  };
  AMB.windhigh = function (out) { return AMB.wind(out, { freq: 700, gain: 0.3 }); };

  // よる（虫の声）
  AMB.night = function (out) {
    var timer = null, alive = true;
    function chirp(freq, at, n) {
      for (var i = 0; i < n; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain(), t = at + i * 0.065;
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.011, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.06);
      }
    }
    function loop() {
      if (!alive) { return; }
      var t = ctx.currentTime + 0.05;
      chirp(rnd(4100, 4500), t, 3 + Math.floor(Math.random() * 3));
      if (Math.random() < 0.6) { chirp(rnd(4700, 5200), t + 0.31, 3); }
      timer = setTimeout(loop, rnd(900, 2200));
    }
    loop();
    return { stop: function () { alive = false; clearTimeout(timer); } };
  };

  // もり（葉ずれと鳥）
  AMB.forest = function (out) {
    var w = AMB.wind(out, { freq: 1100, gain: 0.07 });
    var timer = null, alive = true;
    function bird() {
      if (!alive) { return; }
      var t = ctx.currentTime + 0.02, k = 2 + Math.floor(Math.random() * 4), base = rnd(2200, 3400);
      for (var i = 0; i < k; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain(), at = t + i * 0.1;
        o.type = 'sine';
        o.frequency.setValueAtTime(base * rnd(0.9, 1.15), at); o.frequency.exponentialRampToValueAtTime(base * rnd(1.2, 1.5), at + 0.06);
        g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.028, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
        o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.1);
      }
      timer = setTimeout(bird, rnd(3000, 9000));
    }
    timer = setTimeout(bird, rnd(1500, 4000));
    return { stop: function () { alive = false; clearTimeout(timer); w.stop(); } };
  };

  // ほらあな（低いうなりと水のしずく）
  AMB.cave = function (out) {
    var n = noiseSrc('brown'), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 160; g.gain.value = 0.22;
    n.connect(lp); lp.connect(g); g.connect(out); n.start();
    var dl = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    dl.delayTime.value = 0.28; fb.gain.value = 0.45; wet.gain.value = 0.6;
    dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);
    var timer = null, alive = true;
    function drip() {
      if (!alive) { return; }
      var t = ctx.currentTime + 0.02, f = rnd(900, 1700);
      var o = ctx.createOscillator(), gg = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.12);
      gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.05, t + 0.005); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(gg); gg.connect(out); gg.connect(dl); o.start(t); o.stop(t + 0.16);
      timer = setTimeout(drip, rnd(1800, 5200));
    }
    timer = setTimeout(drip, 900);
    return { stop: function () { alive = false; clearTimeout(timer); try { n.stop(); } catch (e) { /* 無視 */ } } };
  };

  // しつない（柱時計とかすかなぱちぱち）
  AMB.indoor = function (out) {
    var timer = null, alive = true, tick = 0;
    function clock() {
      if (!alive) { return; }
      var t = ctx.currentTime + 0.02;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(tick % 2 ? 1500 : 1900, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.04);
      tick++;
      timer = setTimeout(clock, 1000);
    }
    clock();
    var w = AMB.wind(out, { freq: 300, gain: 0.05 });
    return { stop: function () { alive = false; clearTimeout(timer); w.stop(); } };
  };

  A.ambient = function (list) {
    list = list || [];
    A.wantAmb = list;
    if (!A.ready) { return; }
    var want = {};
    list.forEach(function (n) { want[n] = true; });
    Object.keys(A.curAmb).forEach(function (n) {
      if (!want[n]) {
        var layer = A.curAmb[n]; delete A.curAmb[n];
        var t = ctx.currentTime;
        layer.out.gain.cancelScheduledValues(t);
        layer.out.gain.setValueAtTime(layer.out.gain.value, t);
        layer.out.gain.linearRampToValueAtTime(0.0001, t + 1.2);
        setTimeout(function () { layer.stop(); try { layer.out.disconnect(); } catch (e) { /* 無視 */ } }, 1500);
      }
    });
    list.forEach(function (n) {
      if (A.curAmb[n] || !AMB[n]) { return; }
      var out = ctx.createGain();
      out.gain.value = 0.0001;
      out.connect(ambBus);
      var layer = AMB[n](out);
      layer.out = out;
      out.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.4);
      A.curAmb[n] = layer;
    });
  };

  /** すべて止める（タイトルへ戻るときなど） */
  A.stopAll = function () { A.bgm(null, { fade: 0.4 }); A.ambient([]); };
})();
