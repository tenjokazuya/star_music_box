/* BGMシーケンサ：js/data/songs.js の記譜を読み、WebAudioで合成演奏する。
 * 記譜: 1ステップ=16分音符。トラックの notes は空白区切りで "C4:4 E4 r:2 C4+E4+G4:8"。
 *   音名[#b]オクターブ[:長さ] / r=休符 / +で和音 / 長さ省略時は直前の長さを引き継ぐ。
 * ドラム: pat は1文字1ステップ（k=キック s=スネア h=ハット o=オープン t=タム w=木魚 d=太鼓 c=クラッシュ .=無音）。 */
(function (RP) {
  'use strict';

  var M = RP.music = {};
  var A = RP.audio;
  var cur = null, timer = null, pending = null;
  var intensity = 0;
  var tempoMult = 1;
  var LOOKAHEAD = 0.2;

  // ---- 記譜のコンパイル ----
  var TOKEN = /^(?:(r)|([A-G][#b]?-?\d(?:\+[A-G][#b]?-?\d)*))(?::(\d+))?$/;
  function compileTrack(tr, songSteps) {
    var c = { id: tr.id, kind: tr.kind || 'note', inst: tr.inst || 'lead', vol: tr.vol === undefined ? 0.15 : tr.vol,
              layer: tr.layer || null, ev: {}, len: 0, pan: tr.pan };
    var i;
    if (c.kind === 'drum') {
      var pat = String(tr.pat).replace(/[\s|]+/g, '');
      c.len = pat.length;
      for (i = 0; i < pat.length; i++) { if (pat.charAt(i) !== '.') { c.ev[i] = pat.charAt(i); } }
      return c;
    }
    var toks = String(tr.notes).trim().split(/\s+/), pos = 0, last = 1;
    toks.forEach(function (tk) {
      if (tk === '|') { return; }   // 小節線（可読性のため）
      var m = TOKEN.exec(tk);
      if (!m) { RP.log.warn('記譜エラー', tr.id, tk); return; }
      var len = m[3] ? parseInt(m[3], 10) : last;
      last = len;
      if (!m[1]) {
        c.ev[pos] = { midis: m[2].split('+').map(function (n) { return A.midi(n); }), len: len };
      }
      pos += len;
    });
    c.len = pos;
    void songSteps;
    return c;
  }
  function compile(def) {
    var tracks = def.tracks.map(function (t) { return compileTrack(t, def.steps); });
    var steps = def.steps;
    if (!steps) { steps = 0; tracks.forEach(function (t) { steps = Math.max(steps, t.len); }); }
    return { steps: steps, tracks: tracks };
  }

  // ---- 楽器 ----
  function note(tr, midi, t, stepDur, len, gain) {
    var f = A.hz(midi), d = len * stepDur, v = tr.vol * gain, bus = tr.node;
    switch (tr.inst) {
      case 'lead':
        A.tone({ t: t, duty: 0.25, f: f, dur: d * 0.96, vol: v, env: 'hold', r: 0.05, a: 0.006, bus: bus, vibRate: 5.5, vibDepth: 9 });
        break;
      case 'lead50':
        A.tone({ t: t, duty: 0.5, f: f, dur: d * 0.96, vol: v, env: 'hold', r: 0.05, a: 0.006, bus: bus, vibRate: 5, vibDepth: 7 });
        break;
      case 'pluck':   // 着メロ風の短い撥弦
        A.tone({ t: t, duty: 0.25, f: f, dur: Math.min(d * 1.3, 0.55), vol: v * 1.15, env: 'perc', a: 0.003, bus: bus });
        break;
      case 'shami':   // 三味線っぽいノコギリ＋ローパス
        A.tone({ t: t, type: 'sawtooth', f: f, dur: Math.min(d * 1.2, 0.5), vol: v * 0.9, env: 'perc', a: 0.002, bus: bus, lp: 2600 });
        A.tone({ t: t, type: 'triangle', f: f * 2, dur: 0.12, vol: v * 0.5, env: 'perc', a: 0.002, bus: bus });
        break;
      case 'koto':
        A.tone({ t: t, type: 'triangle', f: f, dur: Math.min(d * 1.6, 0.9), vol: v * 1.3, env: 'perc', a: 0.002, bus: bus });
        A.tone({ t: t, type: 'sine', f: f * 3, dur: 0.18, vol: v * 0.4, env: 'perc', a: 0.002, bus: bus });
        break;
      case 'bass':
        A.tone({ t: t, type: 'triangle', f: f, dur: d * 0.92, vol: v * 1.6, env: 'hold', r: 0.03, a: 0.004, bus: bus });
        break;
      case 'bass2':   // ちょっとパルス
        A.tone({ t: t, duty: 0.5, f: f, dur: d * 0.85, vol: v * 0.9, env: 'hold', r: 0.03, a: 0.004, bus: bus, lp: 900 });
        break;
      case 'pad':
        A.tone({ t: t, type: 'triangle', f: f, dur: d, vol: v, env: 'hold', r: 0.12, a: 0.08, bus: bus, vibRate: 4.5, vibDepth: 5 });
        break;
      case 'bell':
        A.tone({ t: t, type: 'sine', f: f, dur: Math.min(d * 2, 1.2), vol: v * 1.2, env: 'perc', a: 0.002, bus: bus });
        A.tone({ t: t, type: 'sine', f: f * 2.76, dur: 0.3, vol: v * 0.35, env: 'perc', a: 0.002, bus: bus });
        break;
      case 'arp':
        A.tone({ t: t, duty: 0.125, f: f, dur: Math.min(d * 0.9, 0.2), vol: v * 0.8, env: 'perc', a: 0.002, bus: bus });
        break;
      default:
        A.tone({ t: t, duty: 0.25, f: f, dur: d, vol: v, env: 'hold', bus: bus });
    }
  }
  function drum(tr, ch, t) {
    var v = tr.vol, bus = tr.node;
    switch (ch) {
      case 'k':
        A.tone({ t: t, type: 'sine', f: 160, f2: 45, dur: 0.14, vol: v * 2.6, a: 0.002, bus: bus });
        A.noise({ t: t, dur: 0.02, vol: v * 0.6, ft: 'highpass', f1: 2500, bus: bus });
        break;
      case 's':
        A.noise({ t: t, dur: 0.13, vol: v * 1.7, ft: 'bandpass', f1: 2000, q: 0.8, bus: bus });
        A.tone({ t: t, type: 'triangle', f: 230, f2: 150, dur: 0.07, vol: v * 1.2, bus: bus });
        break;
      case 'h': A.noise({ t: t, dur: 0.035, vol: v * 0.9, ft: 'highpass', f1: 7000, bus: bus }); break;
      case 'o': A.noise({ t: t, dur: 0.14, vol: v * 0.8, ft: 'highpass', f1: 6000, bus: bus }); break;
      case 't': A.tone({ t: t, type: 'sine', f: 220, f2: 110, dur: 0.16, vol: v * 2, bus: bus }); break;
      case 'w':
        A.tone({ t: t, type: 'triangle', f: 1250, f2: 950, dur: 0.045, vol: v * 1.8, bus: bus });
        A.noise({ t: t, dur: 0.02, vol: v * 0.5, ft: 'bandpass', f1: 2600, q: 2, bus: bus });
        break;
      case 'd':
        A.tone({ t: t, type: 'sine', f: 120, f2: 55, dur: 0.3, vol: v * 3, a: 0.002, bus: bus });
        A.noise({ t: t, dur: 0.06, vol: v * 0.7, kind: 'brown', ft: 'lowpass', f1: 800, bus: bus });
        break;
      case 'c': A.noise({ t: t, dur: 0.6, vol: v * 0.9, ft: 'highpass', f1: 4000, bus: bus }); break;
      default: break;
    }
  }

  // ---- スケジューラ ----
  function stepDur() { return 60 / cur.def.bpm / 4 / tempoMult; }

  function playStep(s, t) {
    var sd = stepDur();
    var sw = cur.def.swing ? (s % 2 ? cur.def.swing * sd : 0) : 0;
    t += sw;
    for (var i = 0; i < cur.comp.tracks.length; i++) {
      var tr = cur.comp.tracks[i];
      var e = tr.ev[s % tr.len];
      if (e === undefined) { continue; }
      if (tr.kind === 'drum') { drum(tr, e, t); }
      else { for (var k = 0; k < e.midis.length; k++) { note(tr, e.midis[k], t, sd, e.len, e.midis.length > 1 ? 0.7 : 1); } }
    }
  }

  function tick() {
    if (!cur || !A.ready()) { return; }
    var ctx = A.ctx();
    var now = ctx.currentTime;
    var guard = 0;
    while (cur.nextT < now + LOOKAHEAD && guard++ < 64) {
      playStep(cur.step, cur.nextT);
      cur.nextT += stepDur();
      cur.step++;
      if (cur.step >= cur.comp.steps) {
        if (cur.loop) { cur.step = cur.def.loopFrom || 0; }
        else {
          var cb = cur.onEnd;
          var songRef = cur;
          setTimeout(function () { if (cur === songRef) { M.stop(0.1); if (cb) { cb(); } } }, Math.max(0, (cur.nextT - now) * 1000));
          cur.loop = false; cur.step = -1; cur.nextT = Infinity;
          break;
        }
      }
    }
    if (now - cur.nextT > 1) { cur.nextT = now + 0.05; }   // 大きく遅れた時は追いつかずに詰める
  }

  function applyLayers() {
    if (!cur) { return; }
    var ctx = A.ctx();
    cur.comp.tracks.forEach(function (tr) {
      var on = !tr.layer || (tr.layer === 'rush' ? intensity >= 1 : intensity >= 0.5);
      tr.node.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.15);
    });
  }

  // ---- 公開API ----
  M.current = function () { return cur ? cur.name : null; };
  M.isPlaying = function (n) { return !!cur && cur.name === n; };

  // o: { fade(秒), loop(true), onEnd, intensity }
  M.play = function (name, o) {
    o = o || {};
    if (cur && cur.name === name && cur.loop !== false) { return; }
    if (!A.ready()) { pending = { name: name, o: o }; return; }
    var def = RP.songs && RP.songs[name];
    if (!def) { RP.log.warn('未定義のBGM', name); return; }
    var ctx = A.ctx();
    var fade = o.fade === undefined ? 0.5 : o.fade;
    M.stop(fade);
    var comp = compile(def);
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + Math.max(0.02, fade));
    out.connect(A.bus('bgm'));
    comp.tracks.forEach(function (tr) {
      tr.node = ctx.createGain();
      tr.node.gain.value = 1;
      tr.node.connect(out);
    });
    cur = { name: name, def: def, comp: comp, step: 0, nextT: ctx.currentTime + 0.06, loop: o.loop !== false, out: out, onEnd: o.onEnd };
    if (o.intensity !== undefined) { intensity = o.intensity; }
    tempoMult = 1 + (intensity >= 1 ? (def.rushTempo || 0.12) : 0);
    applyLayers();
    if (!timer) { timer = setInterval(tick, 40); }
    tick();
  };

  // 検証・書き出し用：OfflineAudioContext に曲を最初からseconds秒ぶん一括でスケジュールする
  M.scheduleAll = function (name, seconds, o) {
    o = o || {};
    var def = RP.songs[name], ctx = A.ctx();
    var comp = compile(def);
    var out = ctx.createGain();
    out.connect(A.bus('bgm'));
    comp.tracks.forEach(function (tr) { tr.node = ctx.createGain(); tr.node.connect(out); });
    cur = { name: name, def: def, comp: comp, step: 0, nextT: 0.05, loop: true, out: out };
    if (o.intensity !== undefined) { intensity = o.intensity; }
    tempoMult = 1 + (intensity >= 1 ? (def.rushTempo || 0.12) : 0);
    var guard = 0;
    while (cur.nextT < seconds && guard++ < 100000) {
      playStep(cur.step, cur.nextT);
      cur.nextT += stepDur();
      cur.step++;
      if (cur.step >= cur.comp.steps) { cur.step = def.loopFrom || 0; }
    }
    applyLayers();
    cur = null;
  };

  M.stop = function (fade) {
    pending = null;
    if (!cur) { return; }
    var old = cur; cur = null;
    if (!A.ready()) { return; }
    var ctx = A.ctx();
    fade = fade === undefined ? 0.4 : fade;
    try {
      old.out.gain.cancelScheduledValues(ctx.currentTime);
      old.out.gain.setValueAtTime(Math.max(0.0001, old.out.gain.value), ctx.currentTime);
      old.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.02, fade));
    } catch (e) { /* noop */ }
    setTimeout(function () { try { old.out.disconnect(); } catch (e) { /* noop */ } }, (fade + 0.3) * 1000);
  };

  // ラッシュ等で盛り上げる：0=通常 / 0.5=中間 / 1=ラッシュ（テンポ上昇＋レイヤ追加）
  M.setIntensity = function (v) {
    intensity = v;
    if (cur) {
      tempoMult = 1 + (intensity >= 1 ? (cur.def.rushTempo || 0.12) : 0);
      applyLayers();
    }
  };

  M.onReady = function () {
    if (pending) { var p = pending; pending = null; M.play(p.name, p.o); }
  };
})(window.RP);
