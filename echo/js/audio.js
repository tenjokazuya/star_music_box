/* audio.js ― WebAudio：SE合成・BGMシーケンサ(MML風)・環境音
 * すべて実行時合成。外部音声ファイル不使用。 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB;

  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, master, comp, bgmBus, seBus, ambBus, echoSend, noiseBuf, brownBuf, revIn, revBr, analyser, lvBuf;
  var vol = { bgm: 0.7, se: 0.8, amb: 0.6 };
  var muted = false, ducked = false;
  var waves = {};
  var lastPlayed = {};
  var bgmCur = null, bgmTimer = null, ambCur = null;
  var LOOKAHEAD = 0.18;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---------- 初期化 ----------
  function build() {
    if (ctx || !AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    bgmBus = ctx.createGain(); bgmBus.gain.value = vol.bgm * 0.5;
    seBus = ctx.createGain(); seBus.gain.value = vol.se * 0.8;
    ambBus = ctx.createGain(); ambBus.gain.value = vol.amb * 0.45;
    bgmBus.connect(master); seBus.connect(master); ambBus.connect(master);
    // 音量メーター用アナライザ（コンプレッサ出力を監視）
    analyser = ctx.createAnalyser(); analyser.fftSize = 1024; comp.connect(analyser);
    // 響き（リバーブ）：ノイズの指数減衰で作ったインパルス応答。効果音の余韻に使う（SE音量に連動）
    var conv = ctx.createConvolver(), revOut = ctx.createGain(), irLen = Math.floor(ctx.sampleRate * 3.4);
    var ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var dd = ir.getChannelData(ch), lpv = 0;
      for (var q = 0; q < irLen; q++) {
        var tt = q / irLen, env = Math.pow(1 - tt, 2.6);
        lpv += ((Math.random() * 2 - 1) - lpv) * (0.75 - 0.6 * tt);       // 時間とともに高域が減衰
        dd[q] = lpv * env;
      }
    }
    conv.buffer = ir; revOut.gain.value = 1.0;
    revIn = ctx.createGain(); revIn.gain.value = 1;                 // 既定：高域を落とした暗い響き
    var revLp = ctx.createBiquadFilter(); revLp.type = 'lowpass'; revLp.frequency.value = 1300; revLp.Q.value = 0.5;
    revBr = ctx.createGain(); revBr.gain.value = 1;                 // rb:true：高域を残した明るい響き（レーザー等）
    revIn.connect(revLp); revLp.connect(conv); revBr.connect(conv);
    conv.connect(revOut); revOut.connect(seBus);
    // SFC風エコー
    var dl = ctx.createDelay(1.0); dl.delayTime.value = 0.19;
    var fb = ctx.createGain(); fb.gain.value = 0.34;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800;
    echoSend = ctx.createGain(); echoSend.gain.value = 0.26;
    bgmBus.connect(echoSend); echoSend.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
    // ノイズバッファ
    var n = ctx.sampleRate * 2, i;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    brownBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var b = brownBuf.getChannelData(0), last = 0;
    for (i = 0; i < n; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; b[i] = last * 3.5; }
    // パルス波
    [0.125, 0.25, 0.5].forEach(function (duty) {
      var re = new Float32Array(32), im = new Float32Array(32);
      for (var k = 1; k < 32; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      waves['p' + duty] = ctx.createPeriodicWave(re, im);
    });
  }

  // ---------- 基本合成 ----------
  // 響き（リバーブ）の送り。amt=0..1
  function send(node, amt, bright) {
    if (!revIn || !amt) return;
    var s = ctx.createGain(); s.gain.value = amt;
    node.connect(s); s.connect(bright ? revBr : revIn);
  }
  // 周波数スイープ・ホールド・スウェル・ローパス・デチューン・ビブラート・リバーブ付きの基本トーン
  //   t:開始遅延 dur:長さ f0→f1:周波数(sw:スイープ割合) vol a:アタック hold:一定音量の保持秒 swell:徐々に大きく
  //   lp→lp1:ローパス det:デチューン(cent) vibHz/vibDepth:ビブラート rev:リバーブ量
  function tone(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0), dur = o.dur || 0.1;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    if (o.wave && waves[o.wave]) osc.setPeriodicWave(waves[o.wave]); else osc.type = o.type || 'square';
    if (o.det) osc.detune.value = o.det;
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur * (o.sw || 1));
    if (o.vibHz) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vibHz; lg.gain.value = o.vibDepth || 20;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    var v = (o.vol === undefined ? 0.3 : o.vol), a = o.a || 0.003;
    g.gain.setValueAtTime(0.0001, t0);
    if (o.swell) {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + dur * 0.93);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    } else {
      g.gain.linearRampToValueAtTime(v, t0 + a);
      if (o.hold) g.gain.setValueAtTime(v, t0 + a + o.hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
    var src = osc;
    if (o.lp) {
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t0);
      if (o.lp1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.lp1), t0 + dur);
      osc.connect(f); src = f;
    }
    src.connect(g); g.connect(o.bus || seBus); send(g, o.rev, o.rb);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  // FMトーン（機械的な軋み・サイレン用）。mf:変調周波数 depth:変調幅(Hz)
  function fm(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0), dur = o.dur || 0.5;
    var car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.type = o.type || 'sawtooth';
    car.frequency.setValueAtTime(o.f0, t0);
    if (o.f1) car.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur * (o.sw || 0.6));
    mod.type = 'sine'; mod.frequency.value = o.mf || 80; mg.gain.value = o.depth || 150;
    mod.connect(mg); mg.connect(car.frequency);
    var v = (o.vol === undefined ? 0.1 : o.vol), a = o.a || 0.03;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    if (o.hold) g.gain.setValueAtTime(v, t0 + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var src = car;
    if (o.lp) {
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t0);
      if (o.lp1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.lp1), t0 + dur);
      car.connect(f); src = f;
    }
    src.connect(g); g.connect(o.bus || seBus); send(g, o.rev, o.rb);
    car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.03); mod.stop(t0 + dur + 0.03);
  }
  function noise(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0), dur = o.dur || 0.2;
    var src = ctx.createBufferSource(); src.buffer = o.brown ? brownBuf : noiseBuf; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f0 || 2000, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + dur);
    f.Q.value = o.q || 0.8;
    var g = ctx.createGain(), v = (o.vol === undefined ? 0.3 : o.vol), a = o.a || 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    if (o.hold) g.gain.setValueAtTime(v, t0 + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || seBus); send(g, o.rev, o.rb);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.03);
  }
  function arp(notes, step, o) {
    for (var i = 0; i < notes.length; i++) {
      tone({ type: o.type || 'square', f0: mtof(notes[i]), dur: o.dur || 0.09, vol: o.vol || 0.14, t: i * step, bus: o.bus });
    }
  }

  // ---------- 効果音定義 ----------
  var SE = {
    shot: function (p) { tone({ type: 'square', f0: 1500 + (p || 0) * 40, f1: 700, dur: 0.045, vol: 0.05 }); },
    shot2: function () { noise({ ft: 'bandpass', f0: 900, f1: 2600, q: 1.5, dur: 0.14, vol: 0.09 }); },
    hit: function () { tone({ type: 'square', f0: 260, f1: 170, dur: 0.035, vol: 0.05 }); },
    hitBoss: function () { tone({ type: 'triangle', f0: 190, f1: 120, dur: 0.05, vol: 0.12 }); noise({ ft: 'highpass', f0: 4000, dur: 0.03, vol: 0.05 }); },
    // ---- 爆発：破裂(パチッ)＋ボディ(ドン)＋ノイズの尾＋きらめき を重ね、リバーブで余韻を付ける ----
    exp1: function () {
      noise({ ft: 'lowpass', f0: 3600, f1: 240, dur: 0.3, vol: 0.3, rev: 0.12 });
      noise({ ft: 'bandpass', f0: 4200, f1: 1400, q: 1.2, dur: 0.09, vol: 0.12 });
      tone({ type: 'sine', f0: 190, f1: 40, dur: 0.24, vol: 0.32 });
      tone({ type: 'square', f0: 220, f1: 60, dur: 0.08, vol: 0.06 });
    },
    exp2: function () {
      noise({ ft: 'lowpass', f0: 3000, f1: 150, dur: 0.6, vol: 0.42, rev: 0.22 });
      noise({ ft: 'bandpass', f0: 3800, f1: 900, q: 1, dur: 0.12, vol: 0.15 });
      tone({ type: 'sine', f0: 140, f1: 30, dur: 0.5, vol: 0.42, rev: 0.15 });
      tone({ type: 'sawtooth', f0: 110, f1: 34, dur: 0.4, vol: 0.1, lp: 600 });
      for (var i = 1; i < 4; i++) noise({ ft: 'bandpass', f0: 3200 - i * 500, f1: 500, q: 1.5, dur: 0.14, vol: 0.1, t: 0.07 + i * 0.09 });
    },
    exp3: function () {
      noise({ brown: true, ft: 'lowpass', f0: 2400, f1: 60, dur: 1.8, vol: 0.85, rev: 0.45 });
      noise({ ft: 'bandpass', f0: 3500, f1: 700, q: 1, dur: 0.16, vol: 0.2 });
      tone({ type: 'sine', f0: 100, f1: 22, dur: 1.3, vol: 0.55, rev: 0.3 });
      tone({ type: 'sawtooth', f0: 80, f1: 28, dur: 1.0, vol: 0.12, lp: 500 });
      for (var i = 1; i < 6; i++) noise({ ft: 'bandpass', f0: 3000 - i * 380, f1: 200, dur: 0.3, vol: 0.16, t: i * 0.11 });
    },
    // ボス撃破の開始（断末魔）：重い衝撃＋下降する軋み
    bossDying: function () {
      noise({ brown: true, ft: 'lowpass', f0: 1600, f1: 50, dur: 1.3, vol: 0.8, rev: 0.5 });
      tone({ type: 'sine', f0: 70, f1: 26, dur: 1.1, vol: 0.55, rev: 0.4 });
      fm({ type: 'sawtooth', f0: 1000, f1: 110, mf: 47, depth: 300, dur: 1.2, vol: 0.08, sw: 1, lp: 2600, rev: 0.4 });
    },
    // 中ボス撃破：連続爆発→衝撃→低域の余韻
    midDie: function () {
      noise({ brown: true, ft: 'lowpass', f0: 2400, f1: 55, dur: 2.0, vol: 0.85, rev: 0.5 });
      noise({ ft: 'bandpass', f0: 3600, f1: 800, q: 1, dur: 0.18, vol: 0.2 });
      tone({ type: 'sine', f0: 90, f1: 22, dur: 1.5, vol: 0.55, rev: 0.4 });
      for (var i = 0; i < 5; i++) {
        noise({ ft: 'lowpass', f0: 2800 - i * 300, f1: 140, dur: 0.32, vol: 0.28, t: 0.08 + i * 0.13, rev: 0.25 });
        tone({ type: 'sine', f0: 150 - i * 12, f1: 34, dur: 0.28, vol: 0.24, t: 0.08 + i * 0.13 });
      }
      noise({ brown: true, ft: 'lowpass', f0: 420, f1: 45, dur: 2.4, vol: 0.34, a: 0.08, hold: 0.6, rev: 0.55 });
      tone({ type: 'sine', f0: 55, dur: 2.6, vol: 0.26, a: 0.08, hold: 0.7, rev: 0.55 });
      tone({ type: 'triangle', f0: 82.4, dur: 2.4, vol: 0.15, a: 0.08, hold: 0.6, rev: 0.55 });
    },
    // 大ボス撃破：多段の連続爆発→最大の衝撃→低域のランブルと低音和音の残響（高域のきらめきは付けない）
    bossDie: function () {
      var i;
      noise({ brown: true, ft: 'lowpass', f0: 2600, f1: 50, dur: 2.8, vol: 0.95, rev: 0.6 });
      noise({ ft: 'bandpass', f0: 3600, f1: 700, q: 1, dur: 0.22, vol: 0.24 });
      tone({ type: 'sine', f0: 80, f1: 20, dur: 2.2, vol: 0.6, rev: 0.45 });
      tone({ type: 'sawtooth', f0: 70, f1: 24, dur: 1.4, vol: 0.12, lp: 450, rev: 0.3 });
      // 転がる連続爆発
      for (i = 0; i < 9; i++) {
        noise({ ft: 'lowpass', f0: 2700 - i * 220, f1: 120, dur: 0.38, vol: 0.3, t: 0.1 + i * 0.12, rev: 0.3 });
        tone({ type: 'sine', f0: 155 - i * 8, f1: 32, dur: 0.3, vol: 0.26, t: 0.1 + i * 0.12 });
      }
      // 低音和音の残響（A）
      noise({ brown: true, ft: 'lowpass', f0: 420, f1: 40, dur: 3.6, vol: 0.4, a: 0.1, hold: 1.0, rev: 0.6 });      // 低域のランブルが長く尾を引く
      tone({ type: 'sine', f0: 55, dur: 4.4, vol: 0.3, a: 0.12, hold: 1.2, rev: 0.6 });
      tone({ type: 'triangle', f0: 82.4, dur: 4.0, vol: 0.18, a: 0.12, hold: 1.0, rev: 0.6 });
      tone({ type: 'sine', f0: 110, dur: 3.8, vol: 0.14, a: 0.12, hold: 1.0, rev: 0.6 });
    },
    pdie: function () {
      noise({ ft: 'lowpass', f0: 4200, f1: 90, dur: 0.95, vol: 0.6, rev: 0.3 });
      tone({ type: 'sawtooth', f0: 700, f1: 45, dur: 0.85, vol: 0.22, lp: 2500 });
      tone({ type: 'sine', f0: 140, f1: 28, dur: 0.9, vol: 0.45, rev: 0.25 });
    },
    bomb: function () {
      tone({ type: 'sine', f0: 70, f1: 880, dur: 0.9, vol: 0.4, sw: 0.9 });
      tone({ type: 'triangle', f0: 140, f1: 1760, dur: 0.9, vol: 0.15, sw: 0.9 });
      noise({ ft: 'bandpass', f0: 200, f1: 3400, q: 1.2, dur: 1.2, vol: 0.4 });
      for (var i = 0; i < 4; i++) tone({ type: 'triangle', f0: 90, f1: 45, dur: 0.18, vol: 0.4, t: 0.15 + i * 0.22 });
    },
    bombEnd: function () { tone({ type: 'sine', f0: 700, f1: 90, dur: 0.5, vol: 0.3 }); noise({ ft: 'lowpass', f0: 2400, f1: 200, dur: 0.5, vol: 0.2 }); },
    clearBullets: function () { noise({ ft: 'highpass', f0: 1500, f1: 7000, dur: 0.35, vol: 0.22 }); tone({ type: 'sine', f0: 400, f1: 1600, dur: 0.3, vol: 0.18 }); },
    item: function () { tone({ type: 'triangle', f0: 1046, dur: 0.06, vol: 0.18 }); tone({ type: 'triangle', f0: 1568, dur: 0.09, vol: 0.18, t: 0.05 }); },
    gem: function (p) { tone({ type: 'sine', f0: 1800 + (p || 0) * 90, dur: 0.05, vol: 0.12 }); },
    power: function () { arp([72, 76, 79, 84], 0.045, { type: 'square', vol: 0.12, dur: 0.1 }); },
    bombItem: function () { arp([67, 71, 74, 79, 83], 0.05, { type: 'triangle', vol: 0.2, dur: 0.14 }); },
    oneup: function () { arp([72, 76, 79, 84, 79, 84, 88], 0.075, { type: 'square', vol: 0.14, dur: 0.13 }); },
    graze: function () { tone({ type: 'triangle', f0: 2300 + Math.random() * 500, dur: 0.025, vol: 0.06 }); },
    cursor: function () { tone({ type: 'square', f0: 1320, dur: 0.035, vol: 0.1 }); },
    ok: function () { tone({ type: 'square', f0: 880, dur: 0.05, vol: 0.12 }); tone({ type: 'square', f0: 1320, dur: 0.09, vol: 0.12, t: 0.05 }); },
    cancel: function () { tone({ type: 'square', f0: 520, f1: 330, dur: 0.1, vol: 0.12 }); },
    error: function () { tone({ type: 'square', f0: 160, dur: 0.12, vol: 0.14 }); },
    start: function () {
      arp([60, 64, 67, 72, 76, 79, 84], 0.055, { type: 'square', vol: 0.14, dur: 0.16 });
      noise({ ft: 'highpass', f0: 800, f1: 6000, dur: 0.7, vol: 0.2 });
      tone({ type: 'sine', f0: 60, f1: 30, dur: 0.6, vol: 0.4, t: 0.35 });
    },
    pause: function () { tone({ type: 'triangle', f0: 660, f1: 440, dur: 0.1, vol: 0.2 }); },
    unpause: function () { tone({ type: 'triangle', f0: 440, f1: 660, dur: 0.1, vol: 0.2 }); },
    // ボス警告：サイレン＋増4度(トライトーン)の不協和＋機械的な「キュゥゥィィン」＋低域のうなり
    warning: function () {
      var i;
      for (i = 0; i < 5; i++) {
        tone({ type: 'sawtooth', f0: 520, f1: 880, dur: 0.46, vol: 0.15, t: i * 0.5, lp: 3200, rev: 0.15 });
        tone({ type: 'sawtooth', f0: 735, f1: 1245, dur: 0.46, vol: 0.09, t: i * 0.5, lp: 3000 });     // 増4度：不安を煽る不協和
        tone({ type: 'square', f0: 260, f1: 440, dur: 0.46, vol: 0.07, t: i * 0.5 });
      }
      // 裏で鳴る機械的な唸り（上昇して頂点で細く伸びる）
      fm({ type: 'sawtooth', f0: 350, f1: 2600, mf: 95, depth: 260, dur: 1.0, vol: 0.075, t: 0.1, sw: 0.6, hold: 0.25, lp: 5200, lp1: 2200, rev: 0.3 });
      fm({ type: 'sawtooth', f0: 600, f1: 3200, mf: 70, depth: 380, dur: 1.0, vol: 0.075, t: 1.05, sw: 0.6, hold: 0.25, lp: 5200, lp1: 2400, rev: 0.3 });
      fm({ type: 'sawtooth', f0: 450, f1: 3500, mf: 120, depth: 300, dur: 0.95, vol: 0.075, t: 2.0, sw: 0.6, hold: 0.2, lp: 5600, lp1: 2600, rev: 0.3 });
      // 低域の不安なうなり（わずかにずらした2音のビート）
      tone({ type: 'sine', f0: 55, dur: 3.0, vol: 0.26, a: 0.05, hold: 2.3, rev: 0.2 });
      tone({ type: 'sine', f0: 58.3, dur: 3.0, vol: 0.2, a: 0.05, hold: 2.3 });
      // 終盤の重い一撃
      noise({ brown: true, ft: 'lowpass', f0: 500, f1: 60, dur: 0.7, vol: 0.5, t: 2.45, rev: 0.4 });
    },
    bossIn: function () {
      noise({ brown: true, ft: 'lowpass', f0: 600, f1: 80, dur: 1.4, vol: 0.7, rev: 0.4 });
      tone({ type: 'sine', f0: 55, f1: 38, dur: 1.2, vol: 0.5, rev: 0.3 });
    },
    // フェーズ移行：弾が消える衝撃→短い警報(トライトーンの不協和)＋機械的な唸り→低い一撃。ボス警告の短縮版
    phase: function () {
      var i;
      noise({ ft: 'lowpass', f0: 2600, f1: 120, dur: 0.5, vol: 0.38, rev: 0.25 });
      tone({ type: 'sine', f0: 120, f1: 30, dur: 0.55, vol: 0.45, rev: 0.3 });
      noise({ ft: 'bandpass', f0: 4000, f1: 1200, q: 1.2, dur: 0.1, vol: 0.14 });
      for (i = 0; i < 2; i++) {
        tone({ type: 'sawtooth', f0: 560, f1: 940, dur: 0.42, vol: 0.13, t: 0.18 + i * 0.45, lp: 3200, rev: 0.15 });
        tone({ type: 'sawtooth', f0: 792, f1: 1330, dur: 0.42, vol: 0.08, t: 0.18 + i * 0.45, lp: 3000 });     // 増4度の不協和
        tone({ type: 'square', f0: 280, f1: 470, dur: 0.42, vol: 0.06, t: 0.18 + i * 0.45 });
      }
      fm({ type: 'sawtooth', f0: 420, f1: 2900, mf: 90, depth: 280, dur: 0.95, vol: 0.07, t: 0.2, sw: 0.6, hold: 0.2, lp: 5200, lp1: 2300, rev: 0.25 });
      tone({ type: 'sine', f0: 55, dur: 1.3, vol: 0.22, a: 0.04, hold: 0.8 });
      tone({ type: 'sine', f0: 58.3, dur: 1.3, vol: 0.16, a: 0.04, hold: 0.8 });
      noise({ brown: true, ft: 'lowpass', f0: 500, f1: 60, dur: 0.55, vol: 0.4, t: 1.0, rev: 0.35 });
      tone({ type: 'sine', f0: 80, f1: 28, dur: 0.5, vol: 0.3, t: 1.0 });
    },
    // レーザー予告：上昇するチャージ音＋加速するビープ（発射の瞬間に頂点）。d=予告の長さ(秒)
    laserWarn: function (d) {
      d = Math.max(0.5, d || 0.75);
      tone({ type: 'sine', f0: 500, f1: 3200, dur: d, vol: 0.09, swell: true, rev: 0.2 });
      tone({ type: 'sawtooth', f0: 250, f1: 1600, dur: d, vol: 0.05, swell: true, lp: 2200, rev: 0.15 });
      tone({ type: 'sine', f0: 62, dur: d, vol: 0.1, swell: true });
      var n = 7;
      for (var i = 1; i <= n; i++) {
        var tt = d * 0.92 * Math.pow(i / n, 0.6);
        tone({ type: 'square', f0: i === n ? 2800 : 1900, dur: 0.045, vol: i === n ? 0.1 : 0.07, t: tt, rev: 0.2 });
      }
    },
    // レーザー本体：薄く長く「シュバーウ」。高域のノイズが長く下降し、細いのこぎり波がうねる。d=照射の長さ(秒)
    laser: function (d) {
      d = Math.max(0.45, d || 0.6);
      var L = d + 0.9;                       // 照射が終わってもなお細く尾を引く
      noise({ ft: 'highpass', f0: 5000, f1: 9000, dur: 0.09, vol: 0.2, a: 0.002 });                                    // シュッ
      noise({ ft: 'bandpass', f0: 7500, f1: 2200, q: 2.2, dur: L, vol: 0.22, a: 0.03, hold: d, rev: 0.4, rb: true });                    // 空気を裂く長いスイープ
      noise({ ft: 'bandpass', f0: 3200, f1: 1100, q: 6, dur: L, vol: 0.1, a: 0.05, hold: d });                                // 笛のような細い成分
      tone({ type: 'sawtooth', f0: 1500, f1: 560, dur: L, vol: 0.08, lp: 3400, lp1: 1400, hold: d * 0.7, vibHz: 9, vibDepth: 35, rev: 0.35, rb: true });
      tone({ type: 'sawtooth', f0: 1500, f1: 560, dur: L, vol: 0.065, lp: 3400, lp1: 1400, hold: d * 0.7, det: 18, vibHz: 7, vibDepth: 30 });
      tone({ type: 'sine', f0: 3600, f1: 2000, dur: L * 0.8, vol: 0.05, hold: d * 0.6, rev: 0.45, rb: true });                    // 高域の光
    },
    warp: function () {
      noise({ ft: 'highpass', f0: 600, f1: 7000, dur: 0.5, vol: 0.2 });
      tone({ type: 'sine', f0: 200, f1: 2000, dur: 0.4, vol: 0.15 });
    },
    enemyShot: function () { tone({ type: 'triangle', f0: 600, f1: 300, dur: 0.06, vol: 0.05 }); },
    enemyShotBig: function () { tone({ type: 'square', f0: 300, f1: 120, dur: 0.14, vol: 0.08 }); noise({ ft: 'lowpass', f0: 1800, f1: 300, dur: 0.15, vol: 0.1 }); },
    tally: function () { tone({ type: 'square', f0: 1700, dur: 0.02, vol: 0.07 }); },
    tallyEnd: function () { arp([79, 84, 88, 91], 0.06, { type: 'square', vol: 0.14, dur: 0.14 }); },
    stageClear: function () { arp([72, 76, 79, 84], 0.12, { type: 'square', vol: 0.15, dur: 0.3 }); arp([67, 71, 74, 79], 0.12, { type: 'triangle', vol: 0.18, dur: 0.3 }); },
    bell: function () { tone({ type: 'sine', f0: 1320, dur: 0.8, vol: 0.2 }); tone({ type: 'sine', f0: 1980, dur: 0.5, vol: 0.1 }); },
    radio: function () { noise({ ft: 'bandpass', f0: 1800, f1: 2600, q: 3, dur: 0.12, vol: 0.12 }); },
    // 隠しコマンド成功音「キュピーン」：上昇する2音のあとに高音が長く鳴る
    cheat: function () {
      tone({ type: 'sine', f0: 1500, f1: 2400, dur: 0.07, vol: 0.2 });
      tone({ type: 'sine', f0: 2800, f1: 3800, dur: 0.09, vol: 0.2, t: 0.07 });
      tone({ type: 'sine', f0: 4200, dur: 0.9, vol: 0.16, t: 0.16, a: 0.005 });
      tone({ type: 'triangle', f0: 6300, dur: 0.5, vol: 0.05, t: 0.16 });
      noise({ ft: 'highpass', f0: 6000, f1: 9000, dur: 0.35, vol: 0.06, t: 0.16 });
    },
    cheatOff: function () { tone({ type: 'sine', f0: 2200, f1: 800, dur: 0.18, vol: 0.18 }); tone({ type: 'sine', f0: 1500, f1: 600, dur: 0.22, vol: 0.12, t: 0.1 }); },
    glitch: function () { for (var i = 0; i < 5; i++) tone({ type: 'square', f0: 200 + Math.random() * 2400, dur: 0.03, vol: 0.07, t: i * 0.03 }); }
  };
  var MINGAP = { laserWarn: 0.2, laser: 0.2, bossDie: 1, midDie: 1, bossDying: 1, warning: 1, shot: 0.04, shot2: 0.1, hit: 0.045, hitBoss: 0.06, graze: 0.035, exp1: 0.03, gem: 0.02, cursor: 0.02, enemyShot: 0.08, enemyShotBig: 0.1, tally: 0.02, radio: 0.05 };

  // ---------- 会話の発話音 ----------
  function blip(pitch, kind) {
    if (!ctx) return;
    var base = pitch || 400;
    var f = base * (0.92 + Math.random() * 0.2);
    if (kind === 'machine') { tone({ type: 'square', f0: f * 0.6, dur: 0.05, vol: 0.08 }); tone({ type: 'sawtooth', f0: f * 1.5, dur: 0.04, vol: 0.04 }); }
    else if (kind === 'static') { noise({ ft: 'bandpass', f0: f * 3, q: 2, dur: 0.05, vol: 0.1 }); }
    else if (kind === 'ai') { tone({ type: 'sine', f0: f * 1.5, dur: 0.07, vol: 0.12 }); tone({ type: 'triangle', f0: f * 3, dur: 0.05, vol: 0.05 }); }
    else { tone({ type: 'square', f0: f, dur: 0.05, vol: 0.07, wave: 'p0.25' }); }
  }

  // ---------- BGM (MML) ----------
  var WHOLE = 96;
  var NOTE_SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  function parseNum(s, i) {
    var j = i;
    while (j < s.length && s.charAt(j) >= '0' && s.charAt(j) <= '9') j++;
    return j > i ? { v: parseInt(s.substring(i, j), 10), i: j } : null;
  }
  function lenTicks(num, dots) {
    var t = WHOLE / num, add = t / 2;
    for (var k = 0; k < dots; k++) { t += add; add /= 2; }
    return t;
  }
  // 旋律トラック → イベント列
  function parseMelody(s) {
    var ev = [], i = 0, oct = 4, len = 8, vel = 12, gate = 0.8, t = 0;
    while (i < s.length) {
      var c = s.charAt(i++);
      if (c === ' ' || c === '|' || c === '\n' || c === '\t' || c === '\r') continue;
      var r;
      if (c === 'o') { r = parseNum(s, i); if (r) { oct = r.v; i = r.i; } continue; }
      if (c === 'l') { r = parseNum(s, i); if (r) { len = r.v; i = r.i; } continue; }
      if (c === 'v') { r = parseNum(s, i); if (r) { vel = r.v; i = r.i; } continue; }
      if (c === 'q') { r = parseNum(s, i); if (r) { gate = r.v / 8; i = r.i; } continue; }
      if (c === '<') { oct--; continue; }
      if (c === '>') { oct++; continue; }
      if (c === 'x') {           // x<ticks>：休符（ティック指定。1全音符=96）
        r = parseNum(s, i); if (r) { i = r.i; t += r.v; }
        continue;
      }
      if (c === 'n') {           // n<MIDI番号>[,<ticks>]：コード自動生成用の直接指定
        r = parseNum(s, i);
        if (r) {
          i = r.i;
          var tk0 = lenTicks(len, 0);
          if (s.charAt(i) === ',') { var r3 = parseNum(s, i + 1); if (r3) { tk0 = r3.v; i = r3.i; } }
          ev.push({ t: t, d: tk0, m: r.v, v: vel, g: gate }); t += tk0;
        }
        continue;
      }
      if ((c >= 'a' && c <= 'g') || c === 'r') {
        var semi = c === 'r' ? 0 : NOTE_SEMI[c];
        while (i < s.length && (s.charAt(i) === '+' || s.charAt(i) === '#' || s.charAt(i) === '-')) {
          semi += s.charAt(i) === '-' ? -1 : 1; i++;
        }
        var n = len;
        r = parseNum(s, i); if (r) { n = r.v; i = r.i; }
        var dots = 0; while (s.charAt(i) === '.') { dots++; i++; }
        var tk = lenTicks(n, dots);
        // タイ
        for (;;) {
          var j = i; while (s.charAt(j) === ' ') j++;
          if (s.charAt(j) !== '&') break;
          j++; while (s.charAt(j) === ' ') j++;
          var nc = s.charAt(j);
          if (!((nc >= 'a' && nc <= 'g') || nc === 'r')) break;
          j++;
          while (s.charAt(j) === '+' || s.charAt(j) === '#' || s.charAt(j) === '-') j++;
          var n2 = len, r2 = parseNum(s, j); if (r2) { n2 = r2.v; j = r2.i; }
          var d2 = 0; while (s.charAt(j) === '.') { d2++; j++; }
          tk += lenTicks(n2, d2); i = j;
        }
        if (c !== 'r') ev.push({ t: t, d: tk, m: 12 * (oct + 1) + semi, v: vel, g: gate });
        t += tk;
      }
    }
    return { ev: ev, len: t };
  }
  // ドラムトラック k=kick s=snare h=hat H=open hat t=tom c=crash
  function parseDrums(s) {
    var ev = [], i = 0, len = 8, vel = 12, t = 0;
    while (i < s.length) {
      var c = s.charAt(i++);
      if (c === ' ' || c === '|' || c === '\n' || c === '\t' || c === '\r') continue;
      var r;
      if (c === 'l') { r = parseNum(s, i); if (r) { len = r.v; i = r.i; } continue; }
      if (c === 'v') { r = parseNum(s, i); if (r) { vel = r.v; i = r.i; } continue; }
      if ('kshHtcr'.indexOf(c) >= 0) {
        var n = len; r = parseNum(s, i); if (r) { n = r.v; i = r.i; }
        var dots = 0; while (s.charAt(i) === '.') { dots++; i++; }
        var tk = lenTicks(n, dots);
        if (c !== 'r') ev.push({ t: t, d: tk, k: c, v: vel });
        t += tk;
      }
    }
    return { ev: ev, len: t };
  }

  var INST = {
    lead:  { wave: 'p0.25', a: 0.004, rel: 0.06, vib: 5.5, vibD: 0.0, vibAmt: 0.012, vol: 0.55 },
    lead2: { wave: 'p0.5', a: 0.004, rel: 0.05, vol: 0.5 },
    thin:  { wave: 'p0.125', a: 0.003, rel: 0.04, vol: 0.45 },
    bass:  { type: 'triangle', a: 0.004, rel: 0.05, vol: 0.9 },
    saw:   { type: 'sawtooth', a: 0.01, rel: 0.1, vol: 0.28, lp: 1600 },
    pad:   { type: 'triangle', a: 0.12, rel: 0.4, vol: 0.5 },
    bell:  { type: 'sine', a: 0.003, rel: 0.5, vol: 0.55, decay: 0.7 },
    arp:   { wave: 'p0.125', a: 0.002, rel: 0.03, vol: 0.38 }
  };

  function playNote(song, tr, ev, t0, spt) {
    var inst = INST[tr.inst] || INST.lead;
    var dur = Math.max(0.03, ev.d * spt * ev.g);
    var osc = ctx.createOscillator(), g = ctx.createGain();
    if (inst.wave && waves[inst.wave]) osc.setPeriodicWave(waves[inst.wave]); else osc.type = inst.type || 'square';
    var f = mtof(ev.m + (tr.tr || 0));
    osc.frequency.setValueAtTime(f, t0);
    if (inst.vib && dur > 0.2) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = inst.vib; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(f * inst.vibAmt, t0 + 0.25);
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + inst.rel + 0.05);
    }
    var vpk = (ev.v / 15) * (inst.vol || 0.5) * (tr.vol || 1) * 0.55;
    var a = inst.a || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vpk, t0 + a);
    if (inst.decay) g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vpk * 0.12), t0 + Math.max(a + 0.01, dur * inst.decay + 0.3));
    else g.gain.setValueAtTime(vpk * 0.92, t0 + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + inst.rel);
    var out = g;
    if (inst.lp) { var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = inst.lp; g.connect(f2); out = f2; }
    osc.connect(g); out.connect(song.gain);
    osc.start(t0); osc.stop(t0 + dur + inst.rel + 0.05);
  }
  function playDrum(song, tr, ev, t0) {
    var v = (ev.v / 15) * (tr.vol || 1), out = song.gain;
    function nz(o) {
      var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      var f = ctx.createBiquadFilter(); f.type = o.ft; f.frequency.setValueAtTime(o.f0, t0);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
      var g = ctx.createGain(); g.gain.setValueAtTime(o.vol * v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      src.connect(f); f.connect(g); g.connect(out); src.start(t0, Math.random()); src.stop(t0 + o.dur + 0.02);
    }
    function tn(f0, f1, dur, vl) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      g.gain.setValueAtTime(vl * v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
    }
    switch (ev.k) {
      case 'k': tn(160, 42, 0.16, 0.95); break;
      case 's': nz({ ft: 'bandpass', f0: 1900, dur: 0.14, vol: 0.55 }); tn(220, 150, 0.08, 0.3); break;
      case 'h': nz({ ft: 'highpass', f0: 7500, dur: 0.035, vol: 0.28 }); break;
      case 'H': nz({ ft: 'highpass', f0: 6500, dur: 0.16, vol: 0.26 }); break;
      case 't': tn(190, 90, 0.2, 0.7); break;
      case 'c': nz({ ft: 'highpass', f0: 3500, dur: 0.7, vol: 0.4 }); break;
    }
  }

  function prepareSong(def) {
    if (def._p) return def._p;
    var p = { bpm: def.bpm, tracks: [], len: 0, once: !!def.once };
    var maxLen = 0;
    def.tracks.forEach(function (tr) {
      var parsed = tr.inst === 'drum' ? parseDrums(tr.mml) : parseMelody(tr.mml);
      maxLen = Math.max(maxLen, parsed.len);
      p.tracks.push({ inst: tr.inst, ev: parsed.ev, vol: tr.vol, tr: tr.tr, idx: 0, base: 0 });
    });
    p.len = def.loopTicks || maxLen;
    def._p = p;
    return p;
  }

  function schedulerTick() {
    var s = bgmCur;
    if (!ctx || !s || s.stopped) return;
    var now = ctx.currentTime, horizon = now + LOOKAHEAD, p = s.p, spt = 60 / (p.bpm * 24);
    for (var ti = 0; ti < p.tracks.length; ti++) {
      var tr = s.tracks[ti];
      for (var guard = 0; guard < 64; guard++) {
        if (tr.idx >= tr.src.ev.length) {
          var endT = tr.base + p.len * spt;
          if (endT <= horizon) {
            if (p.once) { tr.idx = 1e9; s.endAt = Math.max(s.endAt || 0, endT); break; }
            tr.base = endT; tr.idx = 0; continue;
          }
          break;
        }
        var ev = tr.src.ev[tr.idx], t0 = tr.base + ev.t * spt;
        if (t0 > horizon) break;
        if (t0 >= now - 0.05) {
          if (tr.src.inst === 'drum') playDrum(s, tr.src, ev, Math.max(t0, now));
          else playNote(s, tr.src, ev, Math.max(t0, now), spt);
        }
        tr.idx++;
      }
    }
  }

  function startScheduler() {
    if (bgmTimer) return;
    bgmTimer = root.setInterval(schedulerTick, 30);
  }

  // ---------- 環境音 ----------
  function mkNoiseSrc(brown) {
    var src = ctx.createBufferSource(); src.buffer = brown ? brownBuf : noiseBuf; src.loop = true; return src;
  }
  var AMB = {
    space: function (out) {
      var nodes = [];
      [55, 55.4, 82.5].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 160; g.gain.value = i === 2 ? 0.05 : 0.07;
        o.connect(lp); lp.connect(g); g.connect(out); o.start(); nodes.push(o);
      });
      var n = mkNoiseSrc(true), f = ctx.createBiquadFilter(), g2 = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7; g2.gain.value = 0.08;
      lfo.frequency.value = 0.07; lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency);
      n.connect(f); f.connect(g2); g2.connect(out); n.start(); lfo.start(); nodes.push(n, lfo);
      return nodes;
    },
    wind: function (out) {
      var nodes = [], n = mkNoiseSrc(false), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.9; g.gain.value = 0.22;
      lfo.frequency.value = 0.13; lg.gain.value = 450; lfo.connect(lg); lg.connect(f.frequency);
      n.connect(f); f.connect(g); g.connect(out); n.start(); lfo.start(); nodes.push(n, lfo);
      var o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = 49; og.gain.value = 0.12;
      o.connect(og); og.connect(out); o.start(); nodes.push(o);
      return nodes;
    },
    machine: function (out) {
      var nodes = [], o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 60; lp.type = 'lowpass'; lp.frequency.value = 240; g.gain.value = 0.1;
      lfo.frequency.value = 7.5; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(); lfo.start(); nodes.push(o, lfo);
      var n = mkNoiseSrc(true), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      nf.type = 'lowpass'; nf.frequency.value = 400; ng.gain.value = 0.2; n.connect(nf); nf.connect(ng); ng.connect(out); n.start(); nodes.push(n);
      return nodes;
    },
    solar: function (out) {
      var nodes = [], n = mkNoiseSrc(true), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0.55;
      lfo.frequency.value = 0.2; lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency);
      n.connect(f); f.connect(g); g.connect(out); n.start(); lfo.start(); nodes.push(n, lfo);
      var n2 = mkNoiseSrc(false), hf = ctx.createBiquadFilter(), hg = ctx.createGain(), lfo2 = ctx.createOscillator(), lg2 = ctx.createGain();
      hf.type = 'highpass'; hf.frequency.value = 5500; hg.gain.value = 0.0; lfo2.type = 'square'; lfo2.frequency.value = 9; lg2.gain.value = 0.02;
      lfo2.connect(lg2); lg2.connect(hg.gain); n2.connect(hf); hf.connect(hg); hg.connect(out); n2.start(); lfo2.start(); nodes.push(n2, lfo2);
      return nodes;
    },
    warp: function (out) {
      var nodes = [], o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 220; g.gain.value = 0.05; lfo.frequency.value = 0.25; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
      o.connect(g); g.connect(out); o.start(); lfo.start(); nodes.push(o, lfo);
      var n = mkNoiseSrc(false), f = ctx.createBiquadFilter(), ng = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 4; ng.gain.value = 0.05; n.connect(f); f.connect(ng); ng.connect(out); n.start(); nodes.push(n);
      var b = mkNoiseSrc(true), bf = ctx.createBiquadFilter(), bg = ctx.createGain();
      bf.type = 'lowpass'; bf.frequency.value = 140; bg.gain.value = 0.5; b.connect(bf); bf.connect(bg); bg.connect(out); b.start(); nodes.push(b);
      return nodes;
    }
  };

  // ---------- 公開 API ----------
  var Audio = {
    get ready() { return !!ctx; },
    unlock: function () {
      if (!AC) return;
      if (!ctx) build();
      if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* 無視 */ } }
    },
    suspend: function () { if (ctx && ctx.state === 'running') try { ctx.suspend(); } catch (e) { /* 無視 */ } },
    resume: function () { if (ctx && ctx.state === 'suspended') try { ctx.resume(); } catch (e) { /* 無視 */ } },
    setVolume: function (kind, v) {
      vol[kind] = v;
      if (!ctx) return;
      if (kind === 'bgm') bgmBus.gain.value = v * 0.5 * (ducked ? 0.35 : 1);
      if (kind === 'se') seBus.gain.value = v * 0.8;
      if (kind === 'amb') ambBus.gain.value = v * 0.45;
    },
    getVolume: function (kind) { return vol[kind]; },
    toggleMute: function () { Audio.setMute(!muted); },
    setMute: function (m) { muted = m; if (ctx) master.gain.value = m ? 0 : 0.9; },
    isMuted: function () { return muted; },
    duck: function (on) {
      ducked = on;
      if (ctx) bgmBus.gain.setTargetAtTime(vol.bgm * 0.5 * (on ? 0.35 : 1), ctx.currentTime, 0.05);
    },
    se: function (name, arg) {
      if (!ctx || muted) return;
      var f = SE[name];
      if (!f) return;
      var now = ctx.currentTime, gap = MINGAP[name];
      if (gap) { if (lastPlayed[name] && now - lastPlayed[name] < gap) return; lastPlayed[name] = now; }
      try { f(arg); } catch (e) { if (Audio._strict) throw e; /* 通常は音で落とさない */ }
    },
    blip: function (pitch, kind) { if (ctx && !muted) try { blip(pitch, kind); } catch (e) { /* 無視 */ } },
    // BGM再生。fade 秒でクロスフェード
    play: function (name, opt) {
      opt = opt || {};
      if (!ctx) { Audio._pending = name; return; }
      if (bgmCur && bgmCur.name === name && !bgmCur.stopped && !opt.restart) return;
      var def = EB.Songs && EB.Songs[name];
      if (!def) return;
      Audio.stop(opt.fadeOut === undefined ? 0.6 : opt.fadeOut);
      var p = prepareSong(def);
      var g = ctx.createGain();
      var now = ctx.currentTime;
      g.gain.setValueAtTime(opt.fadeIn ? 0.0001 : 1, now);
      if (opt.fadeIn) g.gain.linearRampToValueAtTime(1, now + opt.fadeIn);
      g.connect(bgmBus);
      var s = { name: name, p: p, gain: g, stopped: false, tracks: [] };
      p.tracks.forEach(function (tr) { s.tracks.push({ src: tr, idx: 0, base: now + 0.08 }); });
      bgmCur = s;
      startScheduler();
      schedulerTick();
    },
    stop: function (fade) {
      var s = bgmCur;
      if (!s || !ctx) { bgmCur = null; return; }
      s.stopped = true;
      var now = ctx.currentTime;
      try {
        s.gain.gain.cancelScheduledValues(now);
        s.gain.gain.setValueAtTime(s.gain.gain.value, now);
        s.gain.gain.linearRampToValueAtTime(0.0001, now + (fade || 0.05));
      } catch (e) { /* 無視 */ }
      var gg = s.gain;
      root.setTimeout(function () { try { gg.disconnect(); } catch (e) { /* 無視 */ } }, ((fade || 0.05) + 0.4) * 1000 + 250);
      bgmCur = null;
    },
    current: function () { return bgmCur ? bgmCur.name : null; },
    bgmEnded: function () { return !bgmCur || (bgmCur.endAt && ctx && ctx.currentTime > bgmCur.endAt); },
    ambient: function (name) {
      if (!ctx) return;
      if (ambCur && ambCur.name === name) return;
      Audio.stopAmbient(0.8);
      if (!name || !AMB[name]) return;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
      g.connect(ambBus);
      var nodes = AMB[name](g);
      ambCur = { name: name, gain: g, nodes: nodes };
    },
    stopAmbient: function (fade) {
      var a = ambCur; if (!a || !ctx) { ambCur = null; return; }
      var now = ctx.currentTime;
      try { a.gain.gain.cancelScheduledValues(now); a.gain.gain.setValueAtTime(a.gain.gain.value, now); a.gain.gain.linearRampToValueAtTime(0.0001, now + (fade || 0.5)); } catch (e) { /* 無視 */ }
      root.setTimeout(function () { a.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* 無視 */ } }); try { a.gain.disconnect(); } catch (e) { /* 無視 */ } }, ((fade || 0.5) + 0.2) * 1000);
      ambCur = null;
    },
    // 出力レベル(0..1)。サウンドテストのメーター用
    level: function () {
      if (!analyser) return 0;
      if (!lvBuf) lvBuf = new Uint8Array(analyser.fftSize);
      lvBuf.fill(128);
      analyser.getByteTimeDomainData(lvBuf);
      var pk = 0;
      for (var i = 0; i < lvBuf.length; i++) { var v = Math.abs(lvBuf[i] - 128) / 128; if (v > pk) pk = v; }
      return pk;
    },
    // 帯域別の強さ [低域<300Hz, 中域300〜2500Hz, 高域>2500Hz] 各0..1（音作りの検証用）
    bands: function () {
      if (!analyser) return [0, 0, 0];
      var n = analyser.frequencyBinCount, a = new Uint8Array(n), hz = ctx.sampleRate / analyser.fftSize, r = [0, 0, 0];
      a.fill(0);
      analyser.getByteFrequencyData(a);
      for (var i = 1; i < n; i++) {
        var f = i * hz, k = f < 300 ? 0 : (f < 2500 ? 1 : 2);
        if (a[i] / 255 > r[k]) r[k] = a[i] / 255;
      }
      return r;
    },
    seNames: function () { return Object.keys(SE); },
    // テスト・拡張用
    _parse: function (mml, drum) { return drum ? parseDrums(mml) : parseMelody(mml); },
    _tone: tone, _noise: noise, _mtof: mtof
  };
  EB.Audio = Audio;
})();
