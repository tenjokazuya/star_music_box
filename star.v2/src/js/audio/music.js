(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Songs = Orgel.Songs || require('./songs.js');
  var Voices = Orgel.Voices || require('./voices.js');
  var Rng = Orgel.Rng || require('../core/rng.js');

  /**
   * BGM シーケンサ。曲データ（songs.js）から、オルゴールの旋律・アルペジオ・パッド・ベース・軽い打楽器を鳴らす。
   * 8分音符を1ステップとして、先読みで音を予約する（advance を一定間隔で呼ぶ）。
   *   var music = Music.create(engine);
   *   music.start('w1', { fade: 1.5, mix: {...} });   // 曲を始める（前の曲はクロスフェードで消える）
   *   music.advance(untilTime);                        // until（AudioContext の時刻）までの音を予約する
   *   music.setMix({ perc: 0 });                       // 層ごとの音量（0〜1）を変える
   * 仕様: managements/project/game-design.md §10.4、tech-design.md §8.5。
   */

  var DEFAULT_MIX = { melody: 1, arp: 1, pad: 1, bass: 1, perc: 1 };
  var ARP_LOW = 48;   // アルペジオの根音が入る範囲の下限（その上の1オクターブ未満）

  /** アルペジオの型（8分音符8つぶん。数は和音の何番目の音か、-1 は休み）。曲の arp で選ぶ */
  var ARP_PATTERNS = {
    full: [0, 1, 2, 1, 0, 1, 2, 1],
    slow: [0, -1, 2, -1, 1, -1, 2, -1],
    broken: [0, 2, 1, 2, 0, 2, 1, 2],
    rolling: [0, 1, 2, 0, 1, 2, 0, 1],
  };
  /** 旋律の音色ごとの音量の倍率（ベルを 1 として） */
  var MELODY_VOICE_GAIN = { bell: 1, glass: 1, flute: 0.9, pluck: 0.85 };

  function create(engine) {
    var ctx = engine.ctx;
    var voices = Voices.create(engine);
    var music = { current: null };
    var cur = null;

    function parsed(song) {
      if (!song._mel) song._mel = Songs.parseMelody(song.melody);
      return song._mel;
    }

    function scheduleStep(c) {
      var s = c.song;
      var stepDur = 30 / s.bpm;
      var bar = Math.floor(c.step / 8) % s.chords.length;
      var st = c.step % 8;
      var loop = Math.floor(c.step / (8 * s.chords.length));
      var variant = loop % 4;           // ループごとに少しずつ変化させる
      var mix = c.mix;
      var rng = c.rng;
      var t = c.t + (rng.next() - 0.5) * 0.012;
      var vel = (0.92 + rng.next() * 0.16) * s.gain;
      var chord = s.chords[bar];
      var dest = c.dest;
      var i;

      // 旋律（オルゴールのベル）
      if (mix.melody > 0 && !(variant === 2 && bar < 2)) {
        var mel = parsed(s)[bar];
        for (i = 0; i < mel.length; i++) {
          if (mel[i][0] !== st) continue;
          var oct = (variant === 1 && bar >= 4) ? 5 : 0;          // 2回目は後半を1オクターブ上で
          var midi = Songs.degToMidi(s.melodyRoot, s.scale, mel[i][1] + oct);
          var d = Math.max(1.1, mel[i][2] * stepDur * 1.3 + 0.8);
          var mv = s.melodyVoice || 'bell';
          voices[mv](t, midi, { dur: mv === 'pluck' ? Math.min(d, 1.5) : d, gain: 0.17 * vel * mix.melody * MELODY_VOICE_GAIN[mv], dest: dest, priority: 2 });
          if (s.octaveEcho) voices.bell(t + stepDur * 0.5, midi + 12, { dur: d * 0.8, gain: 0.05 * vel * mix.melody, dest: dest, priority: 2 });
        }
      }

      // アルペジオ（オルゴールの低いつま弾き）
      if (mix.arp > 0) {
        var tones = Songs.chordTones(chord[0], chord[1], ARP_LOW);
        var idx = (ARP_PATTERNS[s.arp] || ARP_PATTERNS.full)[st];
        if (variant === 3 && s.arp !== 'slow' && idx >= 0) idx = 2 - idx;   // 4周目は上下をひっくり返す
        if (idx >= 0) {
          voices.pluck(t, tones[Math.min(idx, 2)], { gain: 0.09 * vel * mix.arp, dur: s.arp === 'slow' ? 0.9 : 0.6, dest: dest, priority: 1 });
        }
      }

      // パッド（小節の頭で和音を鳴らし、次の和音とゆっくり重ねる）
      if (mix.pad > 0 && st === 0) {
        var padTones = Songs.chordTones(chord[0], chord[1], 52);
        for (i = 0; i < padTones.length; i++) {
          voices.pad(t, padTones[i], 8 * stepDur + 1.2, { gain: 0.03 * s.pad * mix.pad, dest: dest, priority: 1 });
        }
      }

      // ベース
      if (s.bass && mix.bass > 0 && (st === 0 || (st === 4 && variant !== 2))) {
        var bassMidi = Songs.chordTones(chord[0], chord[1], 36)[0];
        voices.bass(t, bassMidi, (st === 0 ? 3.6 : 3.4) * stepDur, { gain: 0.085 * vel * mix.bass, dest: dest, priority: 1 });
      }

      // 軽い打楽器
      //   tick: 裏拍の軽い音／beat: tick＋1・3拍のやわらかい低音／clock: 時計のチクタク（毎拍、高低を交互に）
      //   pulse: 小節の頭に、ゆっくりした鼓動／wave: 小節ごとに、寄せては返す波の音
      if (s.perc !== 'none' && mix.perc > 0) {
        if (s.perc === 'tick' || s.perc === 'beat') {
          if (st % 2 === 1) voices.tick(t, { gain: 0.02 * mix.perc, pan: st % 4 === 1 ? -0.3 : 0.3, dest: dest, priority: 0 });
          if (s.perc === 'beat' && (st === 0 || st === 4)) voices.thump(t, { gain: 0.085 * mix.perc, dest: dest, priority: 1 });
        } else if (s.perc === 'clock') {
          engine.tone({ type: 'sine', freq: st % 2 ? 1040 : 780, t: t, dur: 0.03, gain: 0.016 * mix.perc, attack: 0.002, pan: st % 2 ? 0.25 : -0.25, dest: dest, priority: 0 });
          if (st % 2 === 0) voices.tick(t, { gain: 0.014 * mix.perc, dest: dest, priority: 0 });
        } else if (s.perc === 'pulse') {
          if (st === 0) voices.thump(t, { gain: 0.06 * mix.perc, dest: dest, priority: 1 });
        } else if (s.perc === 'wave') {
          if (st === 0) engine.noise({ color: 'pink', t: t, dur: stepDur * 7, gain: 0.03 * mix.perc, attack: stepDur * 3.5, release: stepDur * 2, shape: 'sustain', filter: { type: 'lowpass', freq: 700, freqEnd: 350, q: 0.5 }, pan: bar % 2 ? 0.25 : -0.25, dest: dest, priority: 0 });
        }
      }

      // 3周目: ときどき高いきらめきを散らす
      if (variant === 2 && rng.chance(0.14)) {
        var sparkMidi = Songs.degToMidi(s.melodyRoot, s.scale, 5 + Math.floor(rng.next() * 5));
        voices.bell(t + stepDur * 0.25, sparkMidi, { dur: 0.9, gain: 0.04 * vel, dest: dest, priority: 0 });
      }
    }

    function fadeOut(c, fade) {
      var t = ctx.currentTime;
      c.gain.gain.cancelScheduledValues(t);
      c.gain.gain.setValueAtTime(c.gain.gain.value, t);
      c.gain.gain.linearRampToValueAtTime(0, t + fade);
      c.stopped = true;
    }

    /**
     * 曲を始める。すでに同じ曲が鳴っていれば、層の音量（mix）だけを更新する。
     * @param {string} id songs.js の曲ID
     * @param {{fade:number, t:number, mix:object}=} o fade=フェードの秒数／t=開始時刻（オフライン検査用）／mix=層ごとの音量
     */
    music.start = function (id, o) {
      o = o || {};
      var song = Songs.SONGS[id];
      if (!song) return false;
      var mix = Object.assign({}, DEFAULT_MIX, o.mix || {});
      if (cur && cur.id === id && !cur.stopped) {
        cur.mix = mix;
        return true;
      }
      var fade = o.fade == null ? 1.5 : o.fade;
      var t = o.t == null ? ctx.currentTime + 0.08 : o.t;
      if (cur) fadeOut(cur, fade);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(1, t + fade);
      gain.connect(engine.bus('bgm'));
      cur = { id: id, song: song, gain: gain, dest: gain, t: t, step: 0, mix: mix, rng: Rng.create('song-' + id), stopped: false };
      music.current = id;
      return true;
    };

    /** 層ごとの音量を部分的に変える（次の小節から反映される） */
    music.setMix = function (m) {
      if (cur) cur.mix = Object.assign({}, cur.mix, m);
    };

    music.stop = function (fade) {
      if (cur) fadeOut(cur, fade == null ? 1.2 : fade);
      cur = null;
      music.current = null;
    };

    /** until（AudioContext の時刻）までのステップを予約する */
    music.advance = function (until) {
      if (!cur || cur.stopped) return;
      var stepDur = 30 / cur.song.bpm;
      var guard = 0;
      while (cur.t < until && guard++ < 4096) {
        scheduleStep(cur);
        cur.t += stepDur;
        cur.step++;
      }
    };

    return music;
  }

  var Music = { DEFAULT_MIX: DEFAULT_MIX, ARP_PATTERNS: ARP_PATTERNS, create: create };

  Orgel.Music = Music;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Music; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
