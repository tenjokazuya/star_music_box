/* music.js — BGM のデータ（audio.js のシーケンサが読む）
 *
 * 曲 = { tempo(1分あたりの四分音符数), gain, ch:{ チャンネル名: {...} } }
 * チャンネル: w 波形('p12' 'p25' 'p50' 'tri' 'saw' 'sine' 'noise'=ドラム), vol, a/d/s/r(エンベロープ),
 *             vib:[Hz,cent], echo:量, echoBeats:遅れ(拍), pan, mml
 * MML: c d e f g a b(+#/-) 数字=長さ(4=四分) . = 付点  r=休符  o4=オクターブ  > <=上下  l8=既定の長さ
 *      v0-15=音量  q1-8=発音の長さ  & = タイ  [ ... ]3 = 繰り返し  | = 小節線（無視）
 *      ドラム: k=キック s=スネア h=ハイハット p=オープンハット t=タム x=クラッシュ
 * すべてのチャンネルは同じ拍数にそろえる（ループがずれないように）。tools/check-music.js で確認できる。
 */
(function () {
  'use strict';

  /* ---- 和音から伴奏を作る補助 ---- */
  var NAMES = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
  var ROOTS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function note(m) { return 'o' + (Math.floor(m / 12) - 1) + ' ' + NAMES[m % 12]; }
  function chord(name, oct) {
    var m = /^([A-G])([b#]?)(maj7|m7|m|7|sus4|dim|)$/.exec(name);
    if (!m) { throw new Error('和音の名前が不正: ' + name); }
    var r = 12 * (oct + 1) + ROOTS[m[1]] + (m[2] === 'b' ? -1 : (m[2] === '#' ? 1 : 0));
    var q = m[3];
    var third = (q === 'm' || q === 'm7' || q === 'dim') ? 3 : (q === 'sus4' ? 5 : 4);
    var fifth = q === 'dim' ? 6 : 7;
    return { root: r, tones: [r, r + third, r + fifth, r + 12] };
  }
  /** アルペジオ。pattern は和音の音の番号(0=根音 1=3度 2=5度 3=オクターブ上)の並び */
  function arp(chords, pattern, oct, unit) {
    var out = ['l' + unit];
    chords.split(' ').forEach(function (name) {
      var c = chord(name, oct), s = [];
      pattern.forEach(function (i) { s.push(note(c.tones[i])); });
      out.push(s.join(' '));
    });
    return out.join(' | ');
  }
  var ARP8 = [0, 1, 2, 3, 2, 1, 2, 1];
  var ARP8B = [0, 2, 1, 3, 1, 2, 1, 2];
  var ARP16 = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 1];

  /** ベース。style: half 根音と5度を二分音符 / pump 八分で弾む / pulse 休符を挟む / long 全音符 / walk 四分で歩く */
  function bass(chords, style, oct) {
    var out = [];
    chords.split(' ').forEach(function (name) {
      var c = chord(name, oct), r = c.root, s;
      if (style === 'half') { s = note(r) + '2 ' + note(r + 7) + '2'; }
      else if (style === 'long') { s = note(r) + '1'; }
      else if (style === 'walk') { s = note(r) + '4 ' + note(r + 7) + '4 ' + note(r + 12) + '4 ' + note(r + 7) + '4'; }
      else if (style === 'pulse') { s = note(r) + '8 r8 ' + note(r) + '8 r8 ' + note(r + 7) + '8 r8 ' + note(r) + '8 r8'; }
      else { // pump
        var offs = [0, 0, 12, 0, 7, 0, 12, 0];
        s = offs.map(function (o) { return note(r + o) + '8'; }).join(' ');
      }
      out.push(s);
    });
    return out.join(' | ');
  }
  function rep(str, n) { var a = []; for (var i = 0; i < n; i++) { a.push(str); } return a.join(' | '); }

  var T = {};

  /* ============ タイトル（夜の海、ひとりぼっちで、少し希望） ============ */
  (function () {
    var ch = 'Am F C G Am F Dm E7 F C G Am F C G G';
    T.title = {
      tempo: 76, gain: 1,
      ch: {
        lead: { w: 'p25', vol: 0.24, a: 0.012, d: 0.3, s: 0.6, r: 0.14, vib: [5, 9], echo: 0.3, echoBeats: 0.75, pan: 0.1, mml:
          'o5 v13 | e2 a4 b4 | o6 c2 o5 a4 f4 | e2 g4 e4 | d2 g4 b4 | o6 c2 o5 b4 a4 | a2 f4 a4 | d4 f4 a4 f4 | b4 g+4 e2 ' +
          '| f2 a4 o6 c4 | o6 e2 d4 c4 | o5 b2 g4 d4 | a4 b4 o6 c2 | c2 o5 a2 | g4 o6 c4 e2 | d2. o5 b4 | g2 b2' },
        arp: { w: 'p50', vol: 0.1, a: 0.003, d: 0.1, s: 0.4, r: 0.05, echo: 0.22, echoBeats: 0.75, pan: -0.2, mml: arp(ch, ARP8, 4, 8) },
        bass: { w: 'tri', vol: 0.36, a: 0.006, d: 0.25, s: 0.8, r: 0.06, mml: bass(ch, 'half', 2) },
        drum: { w: 'noise', vol: 0.22, mml:
          rep('r1', 4) + ' | ' + rep('v9 k4 r4 v7 s4 r4', 4) + ' | ' + rep('v9 k4 v4 h8 h8 v8 s4 v4 h8 h8', 8) }
      }
    };
  })();

  /* ============ いえ（あたたかい、やさしい） ============ */
  (function () {
    var ch = 'C Am F G C Am Dm G F C G Am F G C C';
    T.home = {
      tempo: 84, gain: 1,
      ch: {
        lead: { w: 'p25', vol: 0.2, a: 0.01, d: 0.25, s: 0.6, r: 0.12, vib: [4.5, 8], echo: 0.26, echoBeats: 0.75, mml:
          'o5 v12 | e4 g4 e4 c4 | a4 g4 e4 c4 | f4 a4 o6 c2 | o5 b4 a4 g2 | e4 g4 o6 c4 o5 g4 | a4 o6 c4 e2 | d4 c4 o5 a4 f4 | g2 b2 ' +
          '| a4 f4 a4 o6 c4 | e2 d4 c4 | o5 d4 g4 b4 g4 | a2 o6 c2 | o5 a4 f4 a4 f4 | g4 b4 o6 d2 | o6 e4 c4 o5 g4 e4 | c1' },
        arp: { w: 'tri', vol: 0.15, a: 0.004, d: 0.12, s: 0.5, r: 0.05, mml: arp(ch, ARP8B, 4, 8) },
        bass: { w: 'tri', vol: 0.3, a: 0.006, d: 0.25, s: 0.8, r: 0.06, mml: bass(ch, 'half', 2) },
        drum: { w: 'noise', vol: 0.16, mml: rep('v7 k4 r8 v4 h8 v6 s4 r4', 16) }
      }
    };
  })();

  /* ============ むら（夕方、にぎやか過ぎず軽やか） ============ */
  (function () {
    var ch = 'G Em C D G Em Am D C G Am D C D G G';
    T.village = {
      tempo: 100, gain: 1,
      ch: {
        lead: { w: 'p25', vol: 0.22, a: 0.006, d: 0.2, s: 0.55, r: 0.08, vib: [5.5, 7], echo: 0.2, echoBeats: 0.75, mml:
          'o5 v12 | b4 b8 a8 g4 e4 | g4 e8 g8 b4 g4 | o6 c4 c8 o5 b8 a4 g4 | f+4 a4 o6 d2 | o5 b4 b8 a8 g4 d4 | e4 g4 b4 o6 e4 | o6 c4 o5 b8 a8 g4 e4 | d4 f+4 a2 ' +
          '| e4 g4 o6 c4 o5 g4 | b4 g4 d4 g4 | a4 o6 c4 e4 c4 | o5 a4 f+4 d4 f+4 | o6 e4 d4 c4 o5 b4 | a4 f+4 o6 d2 | o5 g4 b4 o6 d4 g4 | o6 g2 o5 g2' },
        arp: { w: 'p12', vol: 0.11, a: 0.003, d: 0.08, s: 0.3, r: 0.04, pan: 0.25, mml: arp(ch, ARP8, 4, 8) },
        bass: { w: 'tri', vol: 0.32, a: 0.005, d: 0.2, s: 0.7, r: 0.05, mml: bass(ch, 'pump', 2) },
        drum: { w: 'noise', vol: 0.2, mml: rep('v9 k4 v5 h8 h8 v8 s4 v5 h8 h8', 16) }
      }
    };
  })();

  /* ============ みなと（潮風、少し弾む） ============ */
  (function () {
    var ch = 'D C G D D C G A Bm G D A G A D D';
    T.harbor = {
      tempo: 108, gain: 1,
      ch: {
        lead: { w: 'p50', vol: 0.16, a: 0.006, d: 0.2, s: 0.6, r: 0.08, vib: [5, 8], echo: 0.22, echoBeats: 0.75, mml:
          'o5 v12 | f+8. g16 a4 f+4 d4 | e8. f16 g4 e4 c4 | d8. e16 d4 o4 b4 g4 | o5 a4 f+4 d4 f+4 | f+8. g16 a4 o6 d4 o5 a4 | g8. a16 g4 e4 c4 | b8. o6 c16 o5 b4 g4 d4 | a4 o6 c+4 e2 ' +
          '| o5 b4 o6 d4 f+4 d4 | o6 d4 o5 b4 g4 b4 | a4 f+4 d4 f+4 | e4 a4 o6 c+2 | o5 b4 g4 d4 g4 | a4 e4 a4 o6 c+4 | d2 o5 a2 | f+4 a4 o6 d2' },
        arp: { w: 'p25', vol: 0.1, a: 0.003, d: 0.08, s: 0.3, r: 0.04, pan: -0.25, mml: arp(ch, ARP8, 4, 8) },
        bass: { w: 'tri', vol: 0.32, a: 0.005, d: 0.2, s: 0.7, r: 0.05, mml: bass(ch, 'pump', 2) },
        drum: { w: 'noise', vol: 0.2, mml: rep('v9 k4 v5 h8 h8 v8 s4 v5 h8 k8', 16) }
      }
    };
  })();

  /* ============ もり（ひそやか、ふしぎ） ============ */
  (function () {
    var ch = 'Em Em C D Em Am B7 Em C D Em Em Am B7 Em Em';
    T.forest = {
      tempo: 92, gain: 1,
      ch: {
        lead: { w: 'p12', vol: 0.2, a: 0.004, d: 0.1, s: 0.4, r: 0.06, vib: [5, 6], echo: 0.3, echoBeats: 0.75, mml:
          'o5 v12 q5 | e8 g8 b8 g8 e4 r4 | e8 g8 b8 o6 e8 o5 b4 g4 | g8 o6 c8 e8 c8 o5 g4 e4 | f+8 a8 o6 d8 o5 a8 f+4 d4 | e8 g8 b8 g8 e4 r4 | a8 o6 c8 e8 c8 o5 a4 e4 | b8 o6 d+8 f+8 d+8 o5 b4 f+4 | e2 b2 ' +
          '| o6 e4 c4 o5 g4 e4 | d4 f+4 a4 o6 d4 | o6 e2 d4 o5 b4 | g2 e2 | a4 o6 c4 e4 c4 | o5 b4 o6 d+4 f+2 | o6 e2 o5 b2 | e1' },
        arp: { w: 'p25', vol: 0.11, a: 0.003, d: 0.1, s: 0.3, r: 0.05, pan: 0.3, mml: 'q4 ' + arp(ch, ARP8B, 4, 8) },
        bass: { w: 'tri', vol: 0.3, a: 0.006, d: 0.2, s: 0.6, r: 0.06, mml: bass(ch, 'pulse', 2) },
        pad: { w: 'sine', vol: 0.08, a: 0.5, d: 0.5, s: 1, r: 0.6, echo: 0.4, echoBeats: 1.5, mml: bass(ch, 'long', 4) }
      }
    };
  })();

  /* ============ ほらあな（暗く、ゆっくり） ============ */
  (function () {
    var ch = 'Cm Cm Ab Bb Cm Fm G G Cm Ab Bb Gm Cm Fm G G';
    T.cave = {
      tempo: 66, gain: 1,
      ch: {
        lead: { w: 'tri', vol: 0.24, a: 0.02, d: 0.4, s: 0.6, r: 0.3, vib: [4.5, 10], echo: 0.5, echoBeats: 1.5, mml:
          'o5 v12 | c2 e-2 | g2. f4 | e-2 c4 e-4 | d2 f2 | e-4 g4 o6 c2 | o5 a-2 g4 f4 | b4 g4 d2 | g1 ' +
          '| c2 e-2 | a-2. e-4 | d2 f2 | b-4 g4 d2 | c2 e-4 g4 | f2 o6 c2 | o5 b2. d4 | g1' },
        arp: { w: 'sine', vol: 0.16, a: 0.005, d: 0.3, s: 0.2, r: 0.2, echo: 0.45, echoBeats: 1.5, pan: -0.2, mml: arp(ch, [0, 2, 3, 2], 4, 4) + ' ' },
        bass: { w: 'tri', vol: 0.3, a: 0.05, d: 0.4, s: 0.9, r: 0.2, mml: bass(ch, 'long', 2) },
        drum: { w: 'noise', vol: 0.18, mml: rep('v8 t4 r4 r2', 16) }
      }
    };
  })();

  /* ============ とうだい（のぼる、せまる） ============ */
  (function () {
    var ch = 'Dm Bb F C Dm Bb Gm A Bb F C Dm Bb F A A';
    T.lighthouse = {
      tempo: 104, gain: 1,
      ch: {
        lead: { w: 'p25', vol: 0.2, a: 0.006, d: 0.2, s: 0.5, r: 0.08, vib: [5.5, 8], echo: 0.26, echoBeats: 0.75, mml:
          'o5 v12 | d8 f8 a8 o6 d8 o5 a8 f8 d4 | b-8 o6 d8 f8 d8 o5 b-4 f4 | f8 a8 o6 c8 f8 c8 o5 a8 f4 | e8 g8 o6 c8 e8 c8 o5 g8 e4 ' +
          '| d8 f8 a8 o6 d8 o5 a8 f8 d4 | b-8 o6 d8 f8 d8 o5 b-4 f4 | g8 b-8 o6 d8 g8 d8 o5 b-8 g4 | a8 o6 c+8 e8 a8 e8 c+8 o5 a4 ' +
          '| o6 f2 d4 o5 b-4 | o6 c2 o5 a4 f4 | g4 o6 c4 e2 | o6 d2 o5 a2 | b-4 o6 d4 f4 d4 | o6 c4 f4 c4 o5 a4 | a4 o6 c+4 e2 | o6 e2. o5 a4' },
        arp: { w: 'p12', vol: 0.1, a: 0.003, d: 0.07, s: 0.3, r: 0.04, pan: 0.25, mml: arp(ch, ARP16, 4, 16) },
        bass: { w: 'tri', vol: 0.32, a: 0.005, d: 0.2, s: 0.7, r: 0.05, mml: bass(ch, 'pump', 2) },
        drum: { w: 'noise', vol: 0.2, mml: rep('v10 k4 v5 h8 h8 v9 s4 v5 h8 k8', 16) }
      }
    };
  })();

  /* ============ ひがともる（ゲーム最大の山場） ============ */
  (function () {
    var ch = 'C G Am Em F C F G C G Am Em F G C C';
    T.lamp = {
      tempo: 96, gain: 1,
      ch: {
        lead: { w: 'p50', vol: 0.2, a: 0.01, d: 0.25, s: 0.7, r: 0.12, vib: [5, 9], echo: 0.3, echoBeats: 0.75, mml:
          'o5 v13 | c4 e4 g4 o6 c4 | o5 b4 o6 d2 o5 g4 | a4 o6 c4 e2 | e4 d4 o5 b2 | a4 o6 c4 f2 | e4 g4 e4 c4 | o5 a4 o6 c4 o5 a4 f4 | o6 d2. o5 b4 ' +
          '| o6 c2 e2 | o6 g2 d2 | o6 c2 e2 | o6 e2 g2 | o6 f2 a2 | o6 d2 g2 | o6 c1 | o6 c2. r4' },
        arp: { w: 'p25', vol: 0.12, a: 0.003, d: 0.08, s: 0.4, r: 0.05, pan: -0.25, mml: arp(ch, ARP8, 4, 8) },
        bass: { w: 'tri', vol: 0.34, a: 0.005, d: 0.2, s: 0.7, r: 0.05, mml: bass(ch, 'pump', 2) },
        drum: { w: 'noise', vol: 0.24, mml: rep('v11 k4 v6 h8 h8 v10 s4 v6 h8 k8', 15) + ' | v11 x1' }
      }
    };
  })();

  /* ============ エンディング（夜明け、あたたかい） ============ */
  (function () {
    var ch = 'F C Dm Bb F C Bb C F Am Bb C Dm Bb C F';
    T.ending = {
      tempo: 80, gain: 1,
      ch: {
        lead: { w: 'p50', vol: 0.18, a: 0.02, d: 0.3, s: 0.65, r: 0.2, vib: [4.5, 10], echo: 0.32, echoBeats: 0.75, mml:
          'o5 v12 | a2 f2 | g2 e2 | f2 a2 | o6 d2 c4 o5 b-4 | a2 o6 c2 | e2 o5 g2 | b-2 o6 d2 | o6 e2 d2 ' +
          '| o6 f2 c2 | o6 e2 c2 | o6 d2 f2 | o6 e2 g2 | o6 f2 d2 | o6 d2 o5 b-2 | o6 e2 o5 g2 | a1' },
        arp: { w: 'tri', vol: 0.15, a: 0.005, d: 0.15, s: 0.5, r: 0.06, pan: -0.15, mml: arp(ch, ARP8, 4, 8) },
        bass: { w: 'tri', vol: 0.3, a: 0.008, d: 0.3, s: 0.8, r: 0.08, mml: bass(ch, 'half', 2) },
        pad: { w: 'sine', vol: 0.09, a: 0.6, d: 0.6, s: 1, r: 0.8, echo: 0.4, echoBeats: 1.5, mml: bass(ch, 'long', 3) }
      }
    };
  })();

  /* ============ ジングル（短い曲。ループしない） ============ */
  T.get = {
    tempo: 150, gain: 1,
    ch: {
      lead: { w: 'p50', vol: 0.2, a: 0.004, d: 0.18, s: 0.6, r: 0.1, echo: 0.3, echoBeats: 0.5, mml:
        'o5 v13 g8 o6 c8 e8 g8 e8 g8 >c4 | o6 g2. r4' },
      harm: { w: 'p25', vol: 0.12, a: 0.003, d: 0.1, s: 0.5, r: 0.06, mml:
        'o4 c8 e8 g8 o5 c8 e8 g8 e8 c8 | o4 c8 e8 g8 o5 c8 e2' },
      bass: { w: 'tri', vol: 0.3, a: 0.004, d: 0.2, s: 0.8, r: 0.1, mml:
        'o3 c4 e4 g4 o4 c4 | o3 c2 o2 g2' }
    }
  };
  T.solve = {
    tempo: 156, gain: 1,
    ch: {
      lead: { w: 'p50', vol: 0.2, a: 0.004, d: 0.18, s: 0.6, r: 0.1, echo: 0.3, echoBeats: 0.5, mml:
        'o5 v13 c8 e8 g8 o6 c8 e8 g8 >c4' },
      harm: { w: 'p25', vol: 0.12, a: 0.003, d: 0.1, s: 0.5, r: 0.06, mml:
        'o4 c8 g8 o5 c8 e8 g8 o6 c8 e4' },
      bass: { w: 'tri', vol: 0.3, a: 0.004, d: 0.2, s: 0.8, r: 0.1, mml:
        'o3 c4 g4 o4 c4 e4' }
    }
  };
  T.quiet = {   // 静かな間（ほしの かけら など）
    tempo: 100, gain: 1,
    ch: {
      lead: { w: 'sine', vol: 0.2, a: 0.01, d: 0.4, s: 0.5, r: 0.3, echo: 0.4, echoBeats: 0.75, mml:
        'o6 v12 e4 g4 >c2 | o6 g1' },
      bass: { w: 'tri', vol: 0.2, a: 0.01, d: 0.3, s: 0.7, r: 0.3, mml:
        'o3 c2 g2 | o3 c1' }
    }
  };

  Game.music = { tracks: T };
})();
