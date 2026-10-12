(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Songs = Orgel.Songs || require('./songs.js');
  var Voices = Orgel.Voices || require('./voices.js');
  var Util = Orgel.Util || require('../core/util.js');

  /**
   * 効果音。一覧と方針は managements/project/game-design.md §10.2。
   * ほしのこの色A〜Dには音階の度数を割り当て、帰宅・止まる音がその世界の調に乗って鳴る。
   *   var sfx = Sfx.create(engine);
   *   sfx.setWorld(2);                        // 効果音の調を切り替える（1〜5）
   *   sfx.play('home', { color: 1, n: 0 });   // 効果音ID と 引数
   *   sfx.jingle('clear', { stars: 3 });      // ジングル（返り値は長さ(秒)）
   */

  var COLOR_DEG = [0, 2, 3, 4];   // 色A〜Dに割り当てる五音音階の度数（主音・3度・5度・6度）

  function create(engine) {
    var ctx = engine.ctx;
    var voices = Voices.create(engine);
    var world = 1;
    var sfx = { sounds: {} };
    var S = sfx.sounds;

    function now() { return ctx.currentTime; }

    /** 現在のワールドの音階で、度数 deg（oct オクターブ上）のMIDIノート番号 */
    function note(deg, oct) {
      var k = Songs.KEYS[world];
      return Songs.degToMidi(k.root + 12 * (oct || 0), k.pent, deg);
    }

    function tone(o) { return engine.tone(o); }
    function noise(o) { return engine.noise(o); }

    sfx.setWorld = function (w) { if (Songs.KEYS[w]) world = w; };

    // ---- UI ----
    S.ui_hover = function () {
      tone({ type: 'sine', freq: 2100, dur: 0.035, gain: 0.05, attack: 0.002 });
    };
    S.ui_click = function () {
      tone({ type: 'sine', freq: 587, dur: 0.14, gain: 0.17, attack: 0.002 });
      tone({ type: 'triangle', freq: 1174, dur: 0.06, gain: 0.04, attack: 0.002 });
    };
    S.ui_back = function () {
      var t = now();
      tone({ type: 'sine', freq: 659, dur: 0.1, gain: 0.11, attack: 0.002, t: t });
      tone({ type: 'sine', freq: 494, dur: 0.14, gain: 0.11, attack: 0.002, t: t + 0.07 });
    };
    S.ui_toggle = function () {
      var t = now();
      tone({ type: 'sine', freq: 880, dur: 0.05, gain: 0.09, attack: 0.002, t: t });
      tone({ type: 'sine', freq: 1320, dur: 0.05, gain: 0.07, attack: 0.002, t: t + 0.045 });
    };
    S.ui_open = function () {
      noise({ color: 'pink', dur: 0.24, gain: 0.05, attack: 0.04, filter: { type: 'bandpass', freq: 400, freqEnd: 1800, q: 1 } });
      tone({ type: 'sine', freq: 392, freqEnd: 587, dur: 0.22, gain: 0.05, attack: 0.03 });
    };
    S.ui_close = function () {
      noise({ color: 'pink', dur: 0.2, gain: 0.04, attack: 0.02, filter: { type: 'bandpass', freq: 1800, freqEnd: 400, q: 1 } });
      tone({ type: 'sine', freq: 587, freqEnd: 392, dur: 0.18, gain: 0.045, attack: 0.02 });
    };

    // ---- かたむける・止まる ----
    S.tilt = function (o) {
      var dir = o.dir == null ? 1 : o.dir;
      var total = Util.clamp((o.ticks || 1) * (o.tickMs || 70) / 1000, 0.16, 1.0);
      var pan = dir === 1 ? 0.45 : (dir === 3 ? -0.45 : 0);
      var up = dir === 0;
      var down = dir === 2;
      var f0 = up ? 350 : (down ? 1500 : 650);
      var f1 = up ? 1500 : (down ? 350 : 900);
      if (dir === 3) { f0 = 900; f1 = 650; }
      noise({ color: 'pink', dur: total, gain: 0.085, attack: 0.03, filter: { type: 'bandpass', freq: f0, freqEnd: f1, q: 1.2 }, pan: pan });
      tone({ type: 'sine', freq: up ? 196 : 294, freqEnd: up ? 294 : 196, dur: total, gain: 0.04, attack: 0.03, pan: pan });
      // 転がる低い音（動いているほしのこが多いほど少し大きい）
      noise({ color: 'brown', dur: total, gain: 0.12 * Math.min(o.orbs || 1, 3) / 3, attack: 0.02, release: 0.08, shape: 'sustain', filter: { type: 'lowpass', freq: 240 }, pan: pan * 0.5 });
    };
    S.stop_wall = function () {
      tone({ type: 'sine', freq: 150, freqEnd: 68, dur: 0.12, gain: 0.2, attack: 0.002 });
      noise({ color: 'white', dur: 0.05, gain: 0.05, attack: 0.001, filter: { type: 'lowpass', freq: 700 } });
    };
    S.stop_orb = function (o) {
      var c = o.color == null ? 0 : o.color;
      var t = now();
      voices.bell(t, note(COLOR_DEG[c], 2), { dur: 0.4, gain: 0.07 });
      tone({ type: 'sine', freq: 180, freqEnd: 110, dur: 0.07, gain: 0.08, attack: 0.002, t: t });
    };
    S.stop_mud = function () {
      tone({ type: 'sine', freq: 190, freqEnd: 85, dur: 0.14, gain: 0.2, attack: 0.002 });
      noise({ color: 'pink', dur: 0.09, gain: 0.07, attack: 0.002, filter: { type: 'bandpass', freq: 320, q: 3 } });
    };
    S.bump = function () {
      tone({ type: 'sine', freq: 120, freqEnd: 90, dur: 0.06, gain: 0.07, attack: 0.002 });
    };
    S.noop = function () {
      tone({ type: 'sine', freq: 240, freqEnd: 190, dur: 0.07, gain: 0.08, attack: 0.002 });
      noise({ color: 'white', dur: 0.03, gain: 0.03, attack: 0.001, filter: { type: 'lowpass', freq: 500 } });
    };

    // ---- 帰宅・ギミック ----
    S.home = function (o) {
      var c = o.color == null ? 0 : o.color;
      var n = o.n || 0;
      var idx = COLOR_DEG[c] + n;           // 同じ手で続けて帰るたびに、音階を1つ上がる
      var t = now();
      voices.bell(t, note(idx, 1), { dur: 1.6, gain: 0.22, priority: 2 });
      voices.bell(t + 0.07, note(idx + 2, 2), { dur: 0.7, gain: 0.06, priority: 2 });
      noise({ color: 'white', t: t, dur: 0.25, gain: 0.012, attack: 0.01, filter: { type: 'highpass', freq: 7000 } });
    };
    S.flow = function () {
      noise({ color: 'pink', dur: 0.2, gain: 0.07, attack: 0.02, filter: { type: 'bandpass', freq: 900, freqEnd: 1700, q: 3 } });
      tone({ type: 'sine', freq: 520, freqEnd: 760, dur: 0.09, gain: 0.05, attack: 0.005 });
    };
    S.warp = function () {
      var t = now();
      tone({ type: 'sine', freq: 260, freqEnd: 980, dur: 0.3, gain: 0.09, attack: 0.01, t: t });
      tone({ type: 'triangle', freq: 390, freqEnd: 1470, dur: 0.3, gain: 0.035, attack: 0.01, t: t });
      tone({ type: 'sine', freq: 1100, freqEnd: 420, dur: 0.2, gain: 0.055, attack: 0.01, t: t + 0.18 });
      noise({ color: 'pink', t: t, dur: 0.3, gain: 0.035, attack: 0.02, filter: { type: 'bandpass', freq: 500, freqEnd: 2500, q: 2 } });
    };
    S.bloom = function () {
      var t = now();
      voices.bell(t, note(3, 1), { dur: 1.2, gain: 0.14 });
      voices.bell(t + 0.06, note(4, 1), { dur: 0.9, gain: 0.09 });
      voices.bell(t + 0.12, note(5, 1), { dur: 0.8, gain: 0.07 });
      voices.bell(t + 0.18, note(7, 1), { dur: 0.7, gain: 0.05 });
    };

    // ---- 新しいギミック（ワールド6〜）: 音は、そのワールドの調に乗る ----
    /** いろの もんを通る: その子の色の音階で、小さな「きらっ」 */
    S.gate = function (o) {
      var c = o.color == null ? 0 : o.color;
      var t = now();
      voices.bell(t, note(COLOR_DEG[c] + 2, 2), { dur: 0.5, gain: 0.075 });
      voices.bell(t + 0.05, note(COLOR_DEG[c] + 4, 2), { dur: 0.4, gain: 0.04 });
      noise({ color: 'white', t: t, dur: 0.12, gain: 0.01, attack: 0.005, filter: { type: 'highpass', freq: 6500 } });
    };
    /** こおりの かがみで曲がる: ガラスの「ちりん」（高めの小さな鈴） */
    S.mirror = function () {
      var t = now();
      voices.bell(t, note(4, 3), { dur: 0.6, gain: 0.07 });
      voices.bell(t + 0.055, note(7, 3), { dur: 0.45, gain: 0.04 });
      noise({ color: 'white', t: t, dur: 0.05, gain: 0.008, attack: 0.002, filter: { type: 'highpass', freq: 7500 } });
    };
    /** すなの もんを通る: やわらかい「すう」 */
    S.oneway = function () {
      noise({ color: 'pink', dur: 0.17, gain: 0.05, attack: 0.03, filter: { type: 'bandpass', freq: 700, freqEnd: 1500, q: 2 } });
      tone({ type: 'sine', freq: 330, freqEnd: 440, dur: 0.12, gain: 0.03, attack: 0.02 });
    };
    /** スイッチを踏む: 「かちっ」 */
    S.switch = function () {
      var t = now();
      tone({ type: 'triangle', freq: 1300, freqEnd: 900, dur: 0.04, gain: 0.09, attack: 0.001, t: t });
      tone({ type: 'sine', freq: 640, freqEnd: 520, dur: 0.08, gain: 0.07, attack: 0.001, t: t + 0.03 });
      noise({ color: 'white', t: t, dur: 0.02, gain: 0.04, attack: 0.001, filter: { type: 'bandpass', freq: 3500, q: 2 } });
    };
    /** とびらが切りかわる: 低めの「ごとん」 */
    S.door = function () {
      var t = now();
      tone({ type: 'sine', freq: 118, freqEnd: 62, dur: 0.24, gain: 0.2, attack: 0.002, t: t });
      noise({ color: 'brown', t: t, dur: 0.2, gain: 0.1, attack: 0.002, filter: { type: 'lowpass', freq: 420 } });
      tone({ type: 'triangle', freq: 880, freqEnd: 760, dur: 0.09, gain: 0.025, attack: 0.002, t: t + 0.1 });
    };

    // ---- 操作 ----
    S.undo = function () {
      noise({ color: 'pink', dur: 0.2, gain: 0.07, attack: 0.01, filter: { type: 'bandpass', freq: 1600, freqEnd: 420, q: 1 } });
      tone({ type: 'sine', freq: 460, freqEnd: 340, dur: 0.18, gain: 0.08, attack: 0.01 });
    };
    S.reset = function () {
      var t = now();
      tone({ type: 'sine', freq: 900, freqEnd: 180, dur: 0.38, gain: 0.08, attack: 0.01, t: t });
      tone({ type: 'triangle', freq: 1350, freqEnd: 270, dur: 0.38, gain: 0.03, attack: 0.01, t: t });
      tone({ type: 'sine', freq: 330, dur: 0.07, gain: 0.07, attack: 0.002, t: t + 0.38 });
    };
    S.hint = function () {
      var t = now();
      voices.bell(t, note(2, 2), { dur: 0.8, gain: 0.11 });
      voices.bell(t + 0.11, note(4, 2), { dur: 1.0, gain: 0.09 });
    };
    S.stuck = function () {
      var t = now();
      tone({ type: 'triangle', freq: voicesHz(note(3, 1)), dur: 0.45, gain: 0.09, attack: 0.02, t: t, filter: { type: 'lowpass', freq: 1500 } });
      tone({ type: 'triangle', freq: voicesHz(note(1, 1)), dur: 0.5, gain: 0.09, attack: 0.02, t: t + 0.22, filter: { type: 'lowpass', freq: 1500 } });
    };
    S.stage_start = function () {
      var t = now();
      [0, 2, 3].forEach(function (d, i) { voices.bell(t + i * 0.07, note(d, 1), { dur: 0.5, gain: 0.1 }); });
      noise({ color: 'pink', t: t, dur: 0.35, gain: 0.035, attack: 0.1, filter: { type: 'bandpass', freq: 300, freqEnd: 1200, q: 1 } });
    };
    S.star = function (o) {
      var n = Util.clamp(o.n || 1, 1, 3);
      var t = now();
      voices.bell(t, note([0, 2, 4][n - 1], 2), { dur: 1.4, gain: 0.18, priority: 2 });
      voices.bell(t + 0.02, note([0, 2, 4][n - 1], 1), { dur: 1.0, gain: 0.08, priority: 2 });
      noise({ color: 'white', t: t, dur: 0.3, gain: 0.012, attack: 0.01, filter: { type: 'highpass', freq: 7500 } });
    };

    function voicesHz(m) { return Orgel.Audio.midiToHz(m); }

    // ---- ジングル ----
    /**
     * ジングル（短い旋律）。返り値は鳴る長さ(秒)。BGM のダッキングは呼び出し側（Director）が行う。
     * 'clear': ステージクリア（stars で終わり方が変わる）／'world_clear': ワールドクリア
     */
    sfx.jingle = function (id, o) {
      var t = now() + 0.02;
      var i;
      if (id === 'world_clear') {
        var seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (i = 0; i < seq.length; i++) voices.bell(t + i * 0.11, note(seq[i], 1), { dur: 1.3, gain: 0.14 - i * 0.004, priority: 2 });
        var tc = t + seq.length * 0.11 + 0.05;
        [0, 2, 3].forEach(function (d) { voices.bell(tc, note(d, 2), { dur: 2.2, gain: 0.12, priority: 2 }); });
        [0, 2, 3].forEach(function (d) { voices.pad(tc, note(d, 0), 2.0, { gain: 0.04, bus: 'sfx', priority: 2 }); });
        return tc - t + 2.4;
      }
      // clear
      var stars = (o && o.stars) || 1;
      var melody = [[0, 0], [2, 0.13], [3, 0.26], [4, 0.39], [3, 0.58], [4, 0.72]];
      melody.forEach(function (m) { voices.bell(t + m[1], note(m[0], 1), { dur: 1.0, gain: 0.15, priority: 2 }); });
      var end = t + 0.92;
      voices.bell(end, note(5, 1), { dur: 1.8, gain: 0.17, priority: 2 });
      voices.bell(end, note(0, 2), { dur: 1.6, gain: 0.07, priority: 2 });
      [0, 2, 3].forEach(function (d) { voices.pad(end, note(d, 0), 1.6, { gain: 0.035, bus: 'sfx', priority: 2 }); });
      if (stars >= 3) voices.bell(end + 0.14, note(7, 1), { dur: 1.6, gain: 0.1, priority: 2 });
      return end - t + 2;
    };

    /** 効果音を鳴らす。未定義の ID は false を返す */
    sfx.play = function (id, opts) {
      var fn = S[id];
      if (!fn) return false;
      fn(opts || {});
      return true;
    };

    return sfx;
  }

  var Sfx = { COLOR_DEG: COLOR_DEG, create: create };

  Orgel.Sfx = Sfx;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Sfx; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
