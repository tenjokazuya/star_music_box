(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Rng = Orgel.Rng || require('../core/rng.js');

  /**
   * オーディオ基盤（Web Audio API）。音はすべてここの部品で合成する（録音素材は使わない）。
   * 仕様: managements/project/tech-design.md §8、game-design.md §10。
   *
   * 構成:
   *   各音源 ─▶ バス(sfx / bgm / amb) ─┬─▶ マスター入力 ─▶ ソフトリミッター ─▶ ローパス ─▶ マスター音量 ─▶ 出力
   *                                    └─▶ リバーブ送り ─▶ コンボルバー(生成したインパルス応答) ─▶ マスター入力
   *
   * 本番は Audio.ensure() が実際の AudioContext で作った1つのエンジンを返す（ユーザー操作の後に呼ぶ）。
   * テスト用に OfflineAudioContext でも Audio.create(ctx) でエンジンを作れる（効果音の自動検査で使う）。
   */

  var CONFIG = {
    MASTER: 0.8,        // マスター音量の初期値
    BUS: { bgm: 0.5, sfx: 0.8, amb: 0.5 },   // 各バスの音量の初期値（ユーザー設定で変更される）
    BUS_BASE: { bgm: 2.2, sfx: 3.6, amb: 2.0 },    // バス音量 1.0 のときの実ゲイン（音量バランスの基準。実測で決めた: BGMのRMS約-26dBFS・効果音のピーク約-6dBFS）
    SEND: { bgm: 0.32, sfx: 0.22, amb: 0.4 },     // リバーブ送りの量
    REVERB_SEC: 2.6,    // リバーブの長さ(秒)
    REVERB_RETURN: 0.85,
    LOWPASS_HZ: 13000,  // 高域の刺さりを抑える
    MAX_VOICES: 140,    // 同時に鳴らせる音の数の目安（超えたら優先度の低い音を鳴らさない）
    NOISE_SEC: 2,       // ノイズバッファの長さ
  };

  /**
   * ソフトリミッターの特性曲線。小さい音（0.6未満）は手を加えず、それを超える音だけをなめらかに抑えて 1.0 に収める。
   * （DynamicsCompressor は短い効果音のピークを約10dBも潰してしまうため使わない。実測で確認済み: 圧縮比1でも同様）
   * WaveShaper の入力は ±1 に切られるので、入力を 0.5 倍して ±2 の範囲を扱う。
   */
  function makeLimiterCurve() {
    var n = 4096;
    var curve = new Float32Array(n);
    var knee = 0.6;
    var room = 1 - knee;
    for (var i = 0; i < n; i++) {
      var x = ((i / (n - 1)) * 2 - 1) * 2;      // 本来の入力（-2〜2）
      var a = Math.abs(x);
      var y = a < knee ? a : knee + room * Math.tanh((a - knee) / room);
      curve[i] = x < 0 ? -y : y;
    }
    return curve;
  }

  /** MIDIノート番号 → 周波数(Hz) */
  function midiToHz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  /** 減衰するノイズからリバーブのインパルス応答を作る（時間とともに高域が減る） */
  function makeImpulse(ctx, seconds) {
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buf.getChannelData(ch);
      var rng = Rng.create('impulse-' + ch);
      var state = 0;
      var pre = Math.floor(rate * 0.012);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        var env = Math.pow(1 - t, 2.4);
        var n = rng.next() * 2 - 1;
        var a = 0.5 + 0.42 * t;
        state = state * a + n * (1 - a);
        data[i] = i < pre ? 0 : state * env * (i < pre + 200 ? (i - pre) / 200 : 1);
      }
    }
    return buf;
  }

  /** ノイズバッファを作る。kind: 'white' | 'pink' | 'brown' */
  function makeNoise(ctx, kind) {
    var len = Math.floor(ctx.sampleRate * CONFIG.NOISE_SEC);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var rng = Rng.create('noise-' + kind);
    var i;
    if (kind === 'pink') {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (i = 0; i < len; i++) {
        var w = rng.next() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else if (kind === 'brown') {
      var last = 0;
      for (i = 0; i < len; i++) {
        var w2 = rng.next() * 2 - 1;
        last = (last + 0.02 * w2) / 1.02;
        d[i] = last * 3.5;
      }
    } else {
      for (i = 0; i < len; i++) d[i] = rng.next() * 2 - 1;
    }
    // ループのつなぎ目のプチ音を避けるため、端をなめらかにつなぐ
    var fade = Math.floor(ctx.sampleRate * 0.02);
    for (i = 0; i < fade; i++) {
      var k = i / fade;
      d[i] = d[i] * k + d[len - fade + i] * (1 - k);
    }
    return buf;
  }

  /**
   * エンジンを作る。
   * @param {BaseAudioContext} ctx AudioContext または OfflineAudioContext
   */
  function create(ctx) {
    var e = { ctx: ctx, voices: 0, muted: false, volumes: {} };
    var buses = {};
    var sends = {};
    var noises = {};

    // 出力段
    var masterIn = ctx.createGain();
    var limiterIn = ctx.createGain();
    limiterIn.gain.value = 0.5;
    var limiter = ctx.createWaveShaper();
    limiter.curve = makeLimiterCurve();
    limiter.oversample = '2x';
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = CONFIG.LOWPASS_HZ;
    lp.Q.value = 0.5;
    var master = ctx.createGain();
    master.gain.value = CONFIG.MASTER;
    masterIn.connect(limiterIn);
    limiterIn.connect(limiter);
    limiter.connect(lp);
    lp.connect(master);
    master.connect(ctx.destination);
    // 出力レベルの計測用（動作確認・テスト用。音には影響しない）
    var analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser);

    // リバーブ
    var convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, CONFIG.REVERB_SEC);
    var reverbIn = ctx.createGain();
    var reverbOut = ctx.createGain();
    reverbOut.gain.value = CONFIG.REVERB_RETURN;
    reverbIn.connect(convolver);
    convolver.connect(reverbOut);
    reverbOut.connect(masterIn);

    // バス: 入力 → ユーザー音量 → ダッキング → (ドライ → マスター入力 / リバーブ送り)
    var vols = {};
    var ducks = {};
    ['sfx', 'bgm', 'amb'].forEach(function (name) {
      var input = ctx.createGain();
      var vol = ctx.createGain();
      vol.gain.value = CONFIG.BUS[name] * CONFIG.BUS_BASE[name];
      var duck = ctx.createGain();
      var s = ctx.createGain();
      s.gain.value = CONFIG.SEND[name];
      input.connect(vol);
      vol.connect(duck);
      duck.connect(masterIn);
      duck.connect(s);
      s.connect(reverbIn);
      buses[name] = input;
      vols[name] = vol;
      ducks[name] = duck;
      sends[name] = s;
      e.volumes[name] = CONFIG.BUS[name];
    });
    e.volumes.master = CONFIG.MASTER;

    /** いまの出力レベル { peak, rms }（直近約40msの波形から計算） */
    e.level = function () {
      var buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      var peak = 0;
      var sum = 0;
      for (var i = 0; i < buf.length; i++) {
        var a = Math.abs(buf[i]);
        if (a > peak) peak = a;
        sum += buf[i] * buf[i];
      }
      return { peak: peak, rms: Math.sqrt(sum / buf.length) };
    };

    /** バスの入力ノード（音源をここにつなぐ） */
    e.bus = function (name) { return buses[name || 'sfx']; };

    /** 音量を設定する（0〜1）。name: 'master' | 'bgm' | 'sfx' | 'amb' */
    e.setVolume = function (name, v) {
      v = Math.max(0, Math.min(1, v));
      e.volumes[name] = v;
      var t = ctx.currentTime;
      if (name === 'master') {
        master.gain.setTargetAtTime(e.muted ? 0 : v, t, 0.03);
      } else if (vols[name]) {
        vols[name].gain.setTargetAtTime(v * CONFIG.BUS_BASE[name], t, 0.03);
      }
    };

    /**
     * バスを一時的に下げる（ダッキング）。クリアのジングルを BGM の上に聞かせるときなどに使う。
     * @param {string} name バス名
     * @param {number} level 下げた時の倍率（0〜1。0.4 なら 40% まで下げる）
     * @param {number} downSec 下げるまでの時間
     * @param {number} holdSec 下げたままの時間
     * @param {number} upSec 戻すまでの時間
     */
    e.duck = function (name, level, downSec, holdSec, upSec) {
      var g = ducks[name] && ducks[name].gain;
      if (!g) return;
      var t = ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(level, t + downSec);
      g.setValueAtTime(level, t + downSec + holdSec);
      g.linearRampToValueAtTime(1, t + downSec + holdSec + upSec);
    };

    /** ミュートの切り替え（マスターを 0 にする） */
    e.setMuted = function (m) {
      e.muted = !!m;
      master.gain.setTargetAtTime(e.muted ? 0 : e.volumes.master, ctx.currentTime, 0.04);
    };

    /** ノイズバッファ（ctx ごとに1回だけ作って使い回す） */
    e.noiseBuffer = function (kind) {
      kind = kind || 'white';
      if (!noises[kind]) noises[kind] = makeNoise(ctx, kind);
      return noises[kind];
    };

    /** 同時発音数に余裕があるか。priority が 2 以上の重要な音は常に鳴らす */
    e.canStart = function (priority) {
      return e.voices < CONFIG.MAX_VOICES || (priority || 0) >= 2;
    };

    function track(node, stopAt) {
      e.voices++;
      node.onended = function () {
        e.voices--;
        try { node.disconnect(); } catch (err) { /* すでに切断済み */ }
      };
      void stopAt;
    }

    /**
     * 音程のある音を1つ鳴らす（オシレータ＋エンベロープ）。
     * opts: type('sine'|'triangle'|'square'|'sawtooth'), freq, freqEnd（指定すると指数でスイープ）, t（開始時刻）, dur（音の長さ）,
     *       gain, attack, release, shape('pluck'＝すぐ減衰／'sustain'＝保持して release で消える), bus, pan, detune,
     *       filter:{type, freq, q}（音色づけ用のフィルタ）, priority, dest（バスの代わりに直接つなぐノード）
     * @returns {?object} { osc, gain, end }（鳴らせなかったときは null）
     */
    e.tone = function (opts) {
      if (!e.canStart(opts.priority)) return null;
      var t = Math.max(0, opts.t == null ? ctx.currentTime : opts.t);   // 負の時刻は 0 に丸める（揺らぎで曲の先頭が負になるのを防ぐ）
      var dur = opts.dur || 0.3;
      var attack = opts.attack == null ? 0.004 : opts.attack;
      var release = opts.release == null ? 0.06 : opts.release;
      var peak = opts.gain == null ? 0.2 : opts.gain;
      var osc = ctx.createOscillator();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(opts.freq, t);
      if (opts.freqEnd && opts.freqEnd !== opts.freq) {
        osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
      }
      if (opts.detune) osc.detune.setValueAtTime(opts.detune, t);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      var end;
      if (opts.shape === 'sustain') {
        g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
        end = t + dur + release;
      } else {
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        end = t + dur;
      }
      var node = osc;
      var out = g;
      node.connect(g);
      if (opts.filter) {
        var f = ctx.createBiquadFilter();
        f.type = opts.filter.type || 'lowpass';
        f.frequency.setValueAtTime(opts.filter.freq, t);
        f.Q.value = opts.filter.q == null ? 0.7 : opts.filter.q;
        g.connect(f);
        out = f;
      }
      if (opts.pan && ctx.createStereoPanner) {
        var p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, opts.pan));
        out.connect(p);
        out = p;
      }
      out.connect(opts.dest || e.bus(opts.bus));
      track(osc, end);
      osc.start(t);
      osc.stop(end + 0.05);
      return { osc: osc, gain: g, end: end };
    };

    /**
     * ノイズを1つ鳴らす（風・波・スウッシュ・打撃音の素材）。
     * opts: color('white'|'pink'|'brown'), t, dur, gain, attack, release, shape, bus, pan,
     *       filter:{type, freq, freqEnd（指定するとスイープ）, q}, loop, priority
     */
    e.noise = function (opts) {
      if (!e.canStart(opts.priority)) return null;
      var t = Math.max(0, opts.t == null ? ctx.currentTime : opts.t);   // 負の時刻は 0 に丸める（揺らぎで曲の先頭が負になるのを防ぐ）
      var dur = opts.dur || 0.3;
      var attack = opts.attack == null ? 0.004 : opts.attack;
      var release = opts.release == null ? 0.05 : opts.release;
      var peak = opts.gain == null ? 0.2 : opts.gain;
      var src = ctx.createBufferSource();
      src.buffer = e.noiseBuffer(opts.color || 'white');
      src.loop = true;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      var end;
      if (opts.shape === 'sustain') {
        g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
        end = t + dur + release;
      } else {
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        end = t + dur;
      }
      var out = g;
      src.connect(g);
      if (opts.filter) {
        var f = ctx.createBiquadFilter();
        f.type = opts.filter.type || 'bandpass';
        f.frequency.setValueAtTime(opts.filter.freq, t);
        if (opts.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.filter.freqEnd, t + dur);
        f.Q.value = opts.filter.q == null ? 1 : opts.filter.q;
        g.connect(f);
        out = f;
      }
      if (opts.pan && ctx.createStereoPanner) {
        var p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, opts.pan));
        out.connect(p);
        out = p;
      }
      out.connect(opts.dest || e.bus(opts.bus));
      track(src, end);
      src.start(t, (Math.floor(t * 1000) % 1000) / 1000 * (CONFIG.NOISE_SEC - 0.1));
      src.stop(end + 0.05);
      return { src: src, gain: g, filter: out, end: end };
    };

    return e;
  }

  // ---------------------------------------------------------------------------
  // 本番用のエンジン（ユーザー操作の後に1つだけ作る）
  // ---------------------------------------------------------------------------

  var live = null;
  var listening = false;

  /**
   * 実際の AudioContext でエンジンを作る（まだなら）。再生を再開（resume）して返す。
   * ブラウザの自動再生制限のため、必ずクリック・タップ・キー入力などユーザー操作の中で呼ぶこと。
   * @returns {?object} エンジン（Web Audio が使えない環境では null）
   */
  function ensure() {
    if (!live) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try {
        live = create(new AC({ latencyHint: 'interactive' }));
      } catch (err) {
        return null;
      }
      if (!listening && root.document) {
        listening = true;
        // タブが見えないあいだは止め、戻ったら再開する
        root.document.addEventListener('visibilitychange', function () {
          if (!live) return;
          if (root.document.hidden) live.ctx.suspend(); else live.ctx.resume();
        });
      }
    }
    if (live.ctx.state === 'suspended') live.ctx.resume();
    return live;
  }

  /** 作成済みのエンジンを返す（まだなら null。音を鳴らす側は null のとき何もしない） */
  function get() {
    return live;
  }

  var Audio = { CONFIG: CONFIG, create: create, ensure: ensure, get: get, midiToHz: midiToHz };

  Orgel.Audio = Audio;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Audio; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
