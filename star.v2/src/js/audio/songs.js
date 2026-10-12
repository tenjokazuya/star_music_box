(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * 曲のデータ。すべて独自に作った旋律で、既存の曲は使っていない。
   *
   * ■ テーマ「ほしのオルゴールのうた」（8小節）
   *   五音音階（ペンタトニック）の度数で書いた1本の旋律。各ワールドは、同じ度数の並びを
   *   そのワールドの調・旋法に移して使う（ワールド1と5は長調、2は短調風、3はリディア風、4は明るい長調）。
   *   度数は 0=主音, 1,2,3,4 = 音階の2〜5番目, 5=1オクターブ上の主音, -1=1オクターブ下の5番目の音…。
   *
   * ■ 旋律の書式（1小節 = 8分音符8つ）
   *   '開始位置:度数:長さ' を空白で並べる（位置・長さは8分音符の数）。
   *
   * ■ コード: [根音の音名(0=C…11=B), 種類]。種類は CHORDS を参照。
   *   旋律の音と半音でぶつからないものを、tools/harmony-check.js で検査している。
   */

  var PENT_MAJOR = [0, 2, 4, 7, 9];
  var PENT_MINOR = [0, 3, 5, 7, 10];

  /** コードの種類（根音からの半音の距離） */
  var CHORDS = {
    maj: [0, 4, 7],
    min: [0, 3, 7],
    min7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11],
    sus2: [0, 2, 7],
  };

  /**
   * 効果音の音階（ワールドごと）。root は基準のMIDIノート番号、pent は五音音階の音程。
   * ほしのこの色A〜Dは、この音階の度数に対応づけて、帰宅のベルなどが調に乗って鳴る。
   */
  var KEYS = {
    1: { root: 60, pent: PENT_MAJOR, name: 'C' },
    2: { root: 57, pent: PENT_MINOR, name: 'Am' },
    3: { root: 53, pent: PENT_MAJOR, name: 'F' },
    4: { root: 62, pent: PENT_MAJOR, name: 'D' },
    5: { root: 63, pent: PENT_MAJOR, name: 'Eb' },
    6: { root: 55, pent: PENT_MAJOR, name: 'G' },
    7: { root: 52, pent: PENT_MINOR, name: 'Em' },
    8: { root: 62, pent: PENT_MINOR, name: 'Dm' },
    9: { root: 58, pent: PENT_MAJOR, name: 'Bb' },
    10: { root: 57, pent: PENT_MAJOR, name: 'A' },
    11: { root: 54, pent: PENT_MINOR, name: 'F#m' },
    12: { root: 60, pent: PENT_MAJOR, name: 'C' },
    13: { root: 52, pent: PENT_MAJOR, name: 'E' },
    14: { root: 48, pent: PENT_MINOR, name: 'Cm' },
    15: { root: 56, pent: PENT_MAJOR, name: 'Ab' },
    16: { root: 59, pent: PENT_MINOR, name: 'Bm' },
    17: { root: 55, pent: PENT_MAJOR, name: 'G' },
    18: { root: 60, pent: PENT_MAJOR, name: 'C' },
    title: { root: 60, pent: PENT_MAJOR, name: 'C' },
    ending: { root: 60, pent: PENT_MAJOR, name: 'C' },
  };

  // テーマの旋律（8小節）
  var THEME = [
    '0:2:2 2:3:2 4:4:3 7:3:1',
    '0:2:2 2:1:2 4:0:4',
    '0:1:2 2:2:2 4:3:2 6:2:2',
    '0:1:4 4:-1:2 6:1:2',
    '0:2:2 2:3:2 4:5:3 7:4:1',
    '0:3:2 2:2:2 4:4:4',
    '0:3:2 2:2:2 4:1:2 6:0:2',
    '0:1:2 2:-1:2 4:1:4',
  ];

  /**
   * 曲の定義。
   *   melodyRoot: 旋律の度数0のMIDIノート番号 / scale: 五音音階の音程 / bpm / chords: 8小節ぶんのコード
   *   arp:  アルペジオの型（music.js の ARP_PATTERNS: 'full' 8分音符のつま弾き／'slow' 4分音符／'broken'／'rolling'）
   *   perc: 打楽器（'none' / 'tick' 裏拍の軽い音 / 'beat' 1・3拍のやわらかい低音＋裏拍 / 'clock' 時計のチクタク / 'pulse' ゆっくりの鼓動 / 'wave' 寄せる波）
   *   melodyVoice: 旋律の音色（'bell' オルゴール／'glass' ガラスの鈴／'flute' 笛／'pluck' つま弾き）。省くと 'bell'
   *   bass: ベースの有無 / pad: パッドの音量（0で無し）/ gain: 曲全体の音量倍率
   *   octaveEcho: 旋律を1オクターブ上でもごく小さく重ねる（エンディング用）
   */
  var SONGS = {
    title: {
      key: 'title', bpm: 70, melodyRoot: 72, scale: PENT_MAJOR, melody: THEME,
      chords: [[0, 'maj'], [9, 'min7'], [0, 'maj'], [5, 'maj'], [0, 'maj'], [9, 'min7'], [0, 'maj'], [7, 'maj']],
      arp: 'slow', perc: 'none', bass: false, pad: 1, gain: 0.95,
    },
    w1: {
      key: '1', bpm: 76, melodyRoot: 72, scale: PENT_MAJOR, melody: THEME,
      chords: [[0, 'maj'], [9, 'min7'], [0, 'maj'], [5, 'maj'], [0, 'maj'], [9, 'min7'], [0, 'maj'], [7, 'maj']],
      arp: 'full', perc: 'none', bass: true, pad: 1, gain: 1,
    },
    w2: {
      key: '2', bpm: 70, melodyRoot: 69, scale: PENT_MINOR, melody: THEME,
      chords: [[9, 'min7'], [2, 'maj'], [0, 'maj'], [9, 'min7'], [9, 'min7'], [7, 'maj'], [2, 'maj'], [9, 'min7']],
      arp: 'full', perc: 'none', bass: true, pad: 1.1, gain: 1,
    },
    w3: {
      key: '3', bpm: 72, melodyRoot: 65, scale: PENT_MAJOR, melody: THEME,
      chords: [[5, 'maj'], [7, 'maj'], [5, 'maj'], [0, 'maj'], [5, 'maj'], [2, 'min'], [5, 'maj'], [7, 'maj']],
      arp: 'full', perc: 'tick', bass: true, pad: 1, gain: 1,
    },
    w4: {
      key: '4', bpm: 80, melodyRoot: 74, scale: PENT_MAJOR, melody: THEME,
      chords: [[2, 'maj'], [11, 'min'], [2, 'maj'], [7, 'maj'], [2, 'maj'], [11, 'min'], [2, 'maj'], [7, 'maj']],
      arp: 'full', perc: 'beat', bass: true, pad: 0.9, gain: 1,
    },
    w5: {
      key: '5', bpm: 84, melodyRoot: 75, scale: PENT_MAJOR, melody: THEME,
      chords: [[3, 'maj'], [0, 'min7'], [3, 'maj'], [8, 'maj'], [3, 'maj'], [0, 'min7'], [3, 'maj'], [10, 'maj']],
      arp: 'full', perc: 'beat', bass: true, pad: 1.1, gain: 1,
    },
    // ---- ワールド6〜18（v1.1）。同じテーマの旋律を、ワールドごとの調・旋法・テンポ・音色・和音に移す ----
    // 和音は、旋律と半音でぶつからないものを、小節ごとに選んだ（harmonyIssues で検査）
    w6: {
      key: '6', bpm: 66, melodyRoot: 67, scale: PENT_MAJOR, melody: THEME,
      chords: [[7, 'maj7'], [4, 'min7'], [7, 'maj7'], [0, 'maj7'], [7, 'sus2'], [4, 'min7'], [7, 'maj'], [2, 'sus2']],
      arp: 'rolling', perc: 'none', bass: true, pad: 1.2, gain: 1, melodyVoice: 'flute',
    },
    w7: {
      key: '7', bpm: 60, melodyRoot: 76, scale: PENT_MINOR, melody: THEME,
      chords: [[4, 'min7'], [0, 'maj7'], [7, 'maj'], [9, 'min7'], [4, 'sus2'], [2, 'maj'], [7, 'sus2'], [0, 'maj7']],
      arp: 'slow', perc: 'none', bass: false, pad: 1.3, gain: 1, melodyVoice: 'glass',
    },
    w8: {
      key: '8', bpm: 86, melodyRoot: 74, scale: PENT_MINOR, melody: THEME,
      chords: [[2, 'min'], [0, 'sus2'], [5, 'maj'], [7, 'min'], [2, 'min7'], [0, 'maj'], [0, 'sus2'], [10, 'maj']],
      arp: 'broken', perc: 'tick', bass: true, pad: 0.9, gain: 1, melodyVoice: 'pluck',
    },
    w9: {
      key: '9', bpm: 92, melodyRoot: 70, scale: PENT_MAJOR, melody: THEME,
      chords: [[10, 'maj'], [7, 'min'], [10, 'maj'], [3, 'maj'], [10, 'maj'], [2, 'min7'], [7, 'min'], [5, 'maj']],
      arp: 'rolling', perc: 'tick', bass: true, pad: 0.9, gain: 1,
    },
    w10: {
      key: '10', bpm: 72, melodyRoot: 69, scale: PENT_MAJOR, melody: THEME,
      chords: [[9, 'maj7'], [4, 'sus2'], [1, 'min7'], [2, 'maj7'], [9, 'sus2'], [6, 'min7'], [11, 'sus2'], [4, 'sus2']],
      arp: 'slow', perc: 'wave', bass: true, pad: 1.2, gain: 1, melodyVoice: 'glass',
    },
    w11: {
      key: '11', bpm: 56, melodyRoot: 66, scale: PENT_MINOR, melody: THEME,
      chords: [[6, 'min7'], [11, 'sus2'], [6, 'min7'], [2, 'sus2'], [6, 'sus2'], [1, 'min7'], [11, 'sus2'], [4, 'sus2']],
      arp: 'slow', perc: 'pulse', bass: true, pad: 1.5, gain: 1, melodyVoice: 'flute',
    },
    w12: {
      key: '12', bpm: 100, melodyRoot: 72, scale: PENT_MAJOR, melody: THEME,
      chords: [[0, 'maj'], [9, 'min'], [7, 'maj'], [5, 'maj'], [0, 'maj'], [9, 'min'], [7, 'sus2'], [7, 'maj']],
      arp: 'broken', perc: 'clock', bass: true, pad: 0.8, gain: 1,
    },
    w13: {
      key: '13', bpm: 88, melodyRoot: 76, scale: PENT_MAJOR, melody: THEME,
      chords: [[4, 'maj'], [6, 'sus2'], [4, 'maj7'], [9, 'maj'], [4, 'maj'], [8, 'min7'], [4, 'sus2'], [11, 'maj']],
      arp: 'rolling', perc: 'tick', bass: true, pad: 1, gain: 1, melodyVoice: 'glass',
    },
    w14: {
      key: '14', bpm: 92, melodyRoot: 72, scale: PENT_MINOR, melody: THEME,
      chords: [[0, 'min'], [8, 'maj'], [3, 'maj'], [5, 'min'], [0, 'min'], [10, 'maj'], [3, 'maj'], [8, 'maj']],
      arp: 'full', perc: 'beat', bass: true, pad: 1.1, gain: 1,
    },
    w15: {
      key: '15', bpm: 64, melodyRoot: 68, scale: PENT_MAJOR, melody: THEME,
      chords: [[8, 'maj7'], [5, 'min7'], [0, 'min7'], [1, 'maj7'], [8, 'sus2'], [5, 'min7'], [10, 'sus2'], [3, 'sus2']],
      arp: 'slow', perc: 'none', bass: true, pad: 1.5, gain: 1, melodyVoice: 'glass',
    },
    w16: {
      key: '16', bpm: 54, melodyRoot: 71, scale: PENT_MINOR, melody: THEME,
      chords: [[11, 'min7'], [2, 'sus2'], [11, 'min7'], [4, 'sus2'], [11, 'sus2'], [2, 'maj7'], [4, 'sus2'], [11, 'min7']],
      arp: 'slow', perc: 'none', bass: false, pad: 1.5, gain: 1, melodyVoice: 'flute',
    },
    w17: {
      key: '17', bpm: 78, melodyRoot: 67, scale: PENT_MAJOR, melody: THEME,
      chords: [[7, 'sus2'], [4, 'min'], [2, 'maj'], [0, 'maj'], [7, 'maj'], [4, 'min7'], [7, 'sus2'], [2, 'maj']],
      arp: 'rolling', perc: 'tick', bass: true, pad: 1.3, gain: 1, octaveEcho: true,
    },
    w18: {
      key: '18', bpm: 80, melodyRoot: 72, scale: PENT_MAJOR, melody: THEME,
      chords: [[0, 'maj'], [9, 'min7'], [0, 'maj7'], [5, 'maj7'], [0, 'maj'], [9, 'min7'], [0, 'sus2'], [7, 'maj']],
      arp: 'full', perc: 'beat', bass: true, pad: 1.5, gain: 1.05, octaveEcho: true,
    },
    ending: {
      key: 'ending', bpm: 66, melodyRoot: 72, scale: PENT_MAJOR, melody: THEME,
      chords: [[0, 'maj'], [9, 'min7'], [0, 'maj'], [5, 'maj'], [0, 'maj'], [9, 'min7'], [0, 'maj'], [7, 'maj']],
      arp: 'full', perc: 'none', bass: true, pad: 1.4, gain: 1.05, octaveEcho: true,
    },
  };

  /** 旋律の文字列を、小節ごとの [開始位置, 度数, 長さ] の配列にする */
  function parseMelody(bars) {
    return bars.map(function (bar) {
      return bar.split(' ').filter(Boolean).map(function (tok) {
        var p = tok.split(':').map(Number);
        return [p[0], p[1], p[2]];
      });
    });
  }

  /** 五音音階の度数 → MIDIノート番号 */
  function degToMidi(rootMidi, scale, deg) {
    var n = scale.length;
    var oct = Math.floor(deg / n);
    var idx = ((deg % n) + n) % n;
    return rootMidi + scale[idx] + 12 * oct;
  }

  /** コード（根音の音名と種類）の構成音を、与えた基準音（その音名で始まる）から並べて返す */
  function chordTones(pc, quality, baseMidi) {
    var root = baseMidi + (((pc - baseMidi) % 12) + 12) % 12;
    return CHORDS[quality].map(function (i) { return root + i; });
  }

  /**
   * 旋律とコードの和声の検査。旋律の音が、同じ小節のコードの構成音と半音（短2度・長7度）でぶつかっていないかを調べる。
   * @param {object} song SONGS の1曲
   * @returns {string[]} 問題の説明（なければ空配列）
   */
  function harmonyIssues(song) {
    var issues = [];
    var bars = parseMelody(song.melody);
    if (bars.length !== song.chords.length) issues.push('旋律(' + bars.length + '小節)とコード(' + song.chords.length + '小節)の小節数が違います');
    bars.forEach(function (bar, bi) {
      var ch = song.chords[bi];
      if (!ch) return;
      var tones = chordTones(ch[0], ch[1], 48).map(function (m) { return m % 12; });
      bar.forEach(function (n) {
        var pc = ((degToMidi(song.melodyRoot, song.scale, n[1]) % 12) + 12) % 12;
        tones.forEach(function (tp) {
          var d = Math.abs(pc - tp) % 12;
          if (d === 1 || d === 11) issues.push((bi + 1) + '小節目: 旋律の音(' + pc + ')がコードの構成音(' + tp + ')と半音でぶつかります');
        });
      });
    });
    return issues;
  }

  var Songs = {
    PENT_MAJOR: PENT_MAJOR,
    PENT_MINOR: PENT_MINOR,
    CHORDS: CHORDS,
    KEYS: KEYS,
    SONGS: SONGS,
    parseMelody: parseMelody,
    degToMidi: degToMidi,
    chordTones: chordTones,
    harmonyIssues: harmonyIssues,
  };

  Orgel.Songs = Songs;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Songs; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
