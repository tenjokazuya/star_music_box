(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Audio = Orgel.Audio || require('./audio.js');
  var Rng = Orgel.Rng || require('../core/rng.js');

  /**
   * 音色の部品。効果音・環境音・BGM が共通で使う。すべて Web Audio の合成音（録音素材なし）。
   * どれも「やわらかさ」を優先した設計: サイン波・三角波・ローパス・短い減衰。
   *
   *   var v = Voices.create(engine);
   *   v.bell(t, midi, { dur, gain, bus|dest, pan, priority })
   */

  var midiToHz = Audio.midiToHz;

  var BELL_MAX_MIDI = 91;        // ベルの基音の上限（G6 = 約1.57kHz）
  var PARTIAL_SOFT_HZ = 3500;    // これを超える倍音は音量を半分に
  var PARTIAL_MAX_HZ = 6000;     // これを超える倍音は鳴らさない

  function create(engine) {
    var rng = Rng.create('voices');
    var v = {};

    function route(o) {
      return { bus: o.bus || 'sfx', dest: o.dest, priority: o.priority };
    }

    /**
     * オルゴールのベル: 基音と非整数倍音（2.0 / 2.76 / 5.4倍）を、減衰の速さを変えて重ねる。
     * 高い倍音ほど早く消えるので、きらっと鳴ってやわらかく残る。
     */
    v.bell = function (t, midi, o) {
      o = o || {};
      while (midi > BELL_MAX_MIDI) midi -= 12;                // 高くなりすぎる音はオクターブ下げる（キンキンして耳に刺さるため）
      var f = midiToHz(midi);
      var dur = o.dur == null ? 1.4 : o.dur;
      var gain = o.gain == null ? 0.2 : o.gain;
      var det = (rng.next() - 0.5) * 7;                       // 毎回ほんの少し音程が揺れて自然になる
      var pan = o.pan != null ? o.pan : (rng.next() - 0.5) * 0.3;
      var parts = [[1, 1, 1], [2.0, 0.3, 0.5], [2.76, 0.16, 0.3], [5.4, 0.06, 0.12]];
      var r = route(o);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var pf = f * p[0];
        if (pf > PARTIAL_MAX_HZ) continue;                     // 6kHz を超える倍音は鳴らさない
        var pg = pf > PARTIAL_SOFT_HZ ? 0.5 : 1;               // 3.5kHz を超える倍音は半分の音量に
        engine.tone({
          type: 'sine', freq: pf, t: t, dur: dur * p[2], gain: gain * p[1] * pg, attack: 0.002,
          detune: det, pan: pan, bus: r.bus, dest: r.dest, priority: r.priority,
        });
      }
    };

    /** やわらかいつま弾き（アルペジオ用）: 三角波にローパス＋1オクターブ上の細いサイン波 */
    v.pluck = function (t, midi, o) {
      o = o || {};
      var f = midiToHz(midi);
      var g = o.gain == null ? 0.08 : o.gain;
      var dur = o.dur == null ? 0.6 : o.dur;
      var pan = o.pan != null ? o.pan : (rng.next() - 0.5) * 0.4;
      var r = route(o);
      engine.tone({ type: 'triangle', freq: f, t: t, dur: dur, gain: g, attack: 0.004, filter: { type: 'lowpass', freq: 2200, q: 0.5 }, pan: pan, bus: r.bus, dest: r.dest, priority: r.priority });
      engine.tone({ type: 'sine', freq: f * 2, t: t, dur: dur * 0.4, gain: g * 0.25, attack: 0.003, pan: pan, bus: r.bus, dest: r.dest, priority: r.priority });
    };

    /** パッド（持続する和音の1音）: 少しずれた2つの三角波をローパスで丸め、ゆっくり立ち上げる */
    v.pad = function (t, midi, dur, o) {
      o = o || {};
      var f = midiToHz(midi);
      var g = o.gain == null ? 0.03 : o.gain;
      var r = route(o);
      [-6, 6].forEach(function (det, i) {
        engine.tone({
          type: 'triangle', freq: f, t: t, dur: dur, gain: g, attack: 0.7, release: 1.1, shape: 'sustain',
          detune: det, filter: { type: 'lowpass', freq: 1000, q: 0.3 }, pan: i ? 0.3 : -0.3,
          bus: r.bus, dest: r.dest, priority: r.priority,
        });
      });
    };

    /** ベース: 低いサイン波＋ごく小さな1オクターブ上 */
    v.bass = function (t, midi, dur, o) {
      o = o || {};
      var f = midiToHz(midi);
      var g = o.gain == null ? 0.15 : o.gain;
      var r = route(o);
      engine.tone({ type: 'sine', freq: f, t: t, dur: dur, gain: g, attack: 0.02, release: 0.3, shape: 'sustain', bus: r.bus, dest: r.dest, priority: r.priority });
      engine.tone({ type: 'triangle', freq: f * 2, t: t, dur: dur * 0.6, gain: g * 0.18, attack: 0.02, release: 0.2, shape: 'sustain', filter: { type: 'lowpass', freq: 600 }, bus: r.bus, dest: r.dest, priority: r.priority });
    };

    /** 軽い裏拍の音（ハイハット代わり）: 高域ノイズの短いひと粒 */
    v.tick = function (t, o) {
      o = o || {};
      var r = route(o);
      engine.noise({
        color: 'white', t: t, dur: 0.035, gain: o.gain == null ? 0.022 : o.gain, attack: 0.001,
        filter: { type: 'highpass', freq: 6500, q: 0.5 }, pan: o.pan || 0, bus: r.bus, dest: r.dest, priority: r.priority,
      });
    };

    /** やわらかい低音（キックの代わり）: 下がるサイン波 */
    v.thump = function (t, o) {
      o = o || {};
      var r = route(o);
      engine.tone({ type: 'sine', freq: 92, freqEnd: 46, t: t, dur: 0.17, gain: o.gain == null ? 0.1 : o.gain, attack: 0.002, bus: r.bus, dest: r.dest, priority: r.priority });
    };

    return v;
  }

  var Voices = { create: create };

  Orgel.Voices = Voices;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Voices; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
