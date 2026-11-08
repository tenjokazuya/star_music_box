/* songs.js ― BGM譜面
 * コード進行から伴奏(ベース/アルペジオ/パッド/ドラム)を自動生成し、旋律は手書きMMLまたはモチーフ展開で作る。
 * 1小節 = 96ティック。 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;

  var PCN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], sus4: [0, 5, 7], dim: [0, 3, 6], M7: [0, 4, 7, 11] };
  var SCALES = {
    min: [0, 2, 3, 5, 7, 8, 10], maj: [0, 2, 4, 5, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11],
    dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10]
  };

  function chord(name) {
    var m = /^([A-G])([#b]?)(.*)$/.exec(name);
    var r = PCN[m[1]] + (m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0));
    return { r: (r + 12) % 12, iv: QUAL[m[3]] || QUAL[''] };
  }
  function rootAt(c, o) { return 12 * (o + 1) + c.r; }
  function n(m, t) { return 'n' + m + ',' + t + ' '; }
  function rep(s, k) { var o = ''; for (var i = 0; i < k; i++) o += s; return o; }

  var BASS = {
    pump: function (c) { var r = rootAt(c, 2); return rep(n(r, 12) + n(r + 12, 12), 4); },
    gallop: function (c) { var r = rootAt(c, 2); return rep(n(r, 12) + n(r, 6) + n(r, 6), 4); },
    half: function (c) { var r = rootAt(c, 2); return n(r, 48) + n(r + 7, 48); },
    whole: function (c) { return n(rootAt(c, 2), 96); },
    walk: function (c) { var r = rootAt(c, 2); return n(r, 24) + n(r + 7, 24) + n(r + 12, 24) + n(r + 7, 24); },
    sync: function (c) { var r = rootAt(c, 2); return n(r, 36) + n(r, 36) + n(r + 12, 24); },
    off: function (c) { var r = rootAt(c, 2); return rep('x12 ' + n(r + 12, 12), 4); }
  };
  var SHAPES = {
    up: [0, 1, 2, 3], down: [3, 2, 1, 0], ud: [0, 1, 2, 3, 2, 1], zig: [0, 2, 1, 3], wave: [0, 1, 2, 1], spread: [0, 2, 3, 2],
    hi: [2, 3, 2, 1]
  };
  function ARP(c, o, shape) {
    var base = rootAt(c, o), t = c.iv.map(function (x) { return base + x; });
    t.push(base + 12);
    var sh = SHAPES[shape] || SHAPES.up, s = '';
    for (var i = 0; i < 16; i++) s += n(t[sh[i % sh.length] % t.length], 6);
    return s;
  }
  function PAD(c, o, k) { return 'q8 ' + n(rootAt(c, o) + c.iv[k % c.iv.length], 96); }

  var DR = {
    drive: 'l16 k h h h s h h h k h k h s h h h',
    rock: 'l8 k h s h k h s h',
    soft: 'l8 k r h r s r h r',
    boss: 'l16 k h k h s h h k k h k h s h s s',
    fourfloor: 'l8 k h k h k h k h',
    march: 'l8 k r s r k k s r',
    none: 'r1'
  };
  var FILL = 'l16 s s s s t t t t k k s s c r r r';

  function octUp(s) { return s.replace(/o(\d)/g, function (m, d) { return 'o' + (parseInt(d, 10) + 1); }); }

  // モチーフ展開による旋律
  function degMidi(key, scale, deg) {
    var L = scale.length, o = Math.floor(deg / L), k = ((deg % L) + L) % L;
    return key + scale[k] + 12 * o;
  }
  function seqLead(o) {
    var scale = SCALES[o.scale || 'min'], N = o.chords.length, bars = [];
    for (var i = 0; i < N; i++) {
      var c = chord(o.chords[i]);
      var off = ((c.r - (o.key % 12)) % 12 + 12) % 12, rd = 0;
      for (var k = 0; k < scale.length; k++) if (scale[k] <= off) rd = k;
      var m = (i === N - 1 && o.cadence) ? o.cadence : o.motifs[i % o.motifs.length];
      if (o.motifs2 && i >= N / 2) m = (i === N - 1 && o.cadence) ? o.cadence : o.motifs2[i % o.motifs2.length];
      var s = 'q' + (o.gate || 7) + ' ';
      for (var j = 0; j < m.r.length; j++) {
        var tk = Math.round(m.r[j] * 12);
        if (m.d[j] === null) s += 'x' + tk + ' ';
        else s += n(degMidi(o.key, scale, rd + m.d[j] + (o.oct || 0) * 7), tk);
      }
      bars.push(s);
    }
    return bars;
  }

  function rests(N) { var s = ''; for (var i = 0; i < N; i++) s += 'r1 | '; return s; }

  function build(o) {
    var ch = o.chords.map(chord), N = ch.length, passes = 2, tracks = [], p, i;
    function bars(fn) {
      var s = '';
      for (p = 0; p < passes; p++) for (i = 0; i < N; i++) s += fn(ch[i], i, p) + ' | ';
      return s;
    }
    tracks.push({ inst: 'bass', vol: o.bassVol || 1, mml: bars(function (c) { return BASS[o.bass || 'pump'](c); }) });
    if (o.arp) {
      tracks.push({
        inst: o.arp.inst || 'arp', vol: o.arp.vol || 0.5, mml: bars(function (c, i2, p2) {
          return (p2 === 0 && o.arp.from2) ? 'r1' : ARP(c, o.arp.oct || 4, o.arp.shape || 'up');
        })
      });
    }
    if (o.pad) {
      tracks.push({ inst: 'pad', vol: o.pad === true ? 0.55 : o.pad, mml: bars(function (c) { return PAD(c, 4, 1); }) });
      tracks.push({ inst: 'pad', vol: o.pad === true ? 0.5 : o.pad * 0.9, mml: bars(function (c) { return PAD(c, 4, 2); }) });
    }
    var lead = o.lead, up = o.leadUp === false ? lead : lead.map(octUp);
    var li = o.leadInst || 'lead';
    tracks.push({ inst: li, vol: o.leadVol || 1, mml: lead.join(' | ') + ' | ' + up.join(' | ') + ' | ' });
    tracks.push({ inst: o.harmInst || 'lead2', vol: o.harmVol || 0.45, mml: rests(N) + lead.join(' | ') + ' | ' });
    if (o.drums !== 'none') {
      var dp = DR[o.drums || 'rock'];
      tracks.push({
        inst: 'drum', vol: o.drumVol || 1, mml: bars(function (c, i2, p2) {
          return (i2 === N - 1) ? FILL : dp;
        })
      });
    }
    return { bpm: o.bpm, tracks: tracks };
  }

  var S = {};

  // ---------- タイトル ----------
  S.title = build({
    bpm: 84, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'], bass: 'half', pad: true, drums: 'none', leadInst: 'bell', harmInst: 'pad', harmVol: 0.4,
    arp: { shape: 'ud', oct: 4, inst: 'arp', vol: 0.18 },
    lead: [
      'o5 l4 e2 a g', 'o5 l4 f2 e c', 'o5 l4 e2 g e', 'o5 l4 d2. r',
      'o5 l4 e2 a b', 'o5 l4 >c2< b a', 'o5 l4 f2 a g', 'o5 l4 e2. r'
    ]
  });

  // ---------- ステージ1：出撃 ----------
  S.st1 = build({
    bpm: 152, chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7'], bass: 'pump', drums: 'drive', arp: { shape: 'up', oct: 4, vol: 0.42 },
    lead: [
      'o5 l8 e4 g b >e4< b g', 'o5 l8 c4 e g >c4< g e', 'o5 l8 b4 g a b4 >d4', 'o5 l8 a4 f+ a >d4 c+4',
      'o5 l8 e4 g b >e4 f+ g', 'o6 l8 g4 e c e4 g4', 'o5 l8 a4 >c e a4 g e', 'o5 l8 f+4 d+ f+ b4 a f+'
    ]
  });

  // ---------- 中ボス ----------
  S.midboss = build({
    bpm: 164, chords: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Gm', 'A', 'A'], bass: 'gallop', drums: 'boss', arp: { shape: 'zig', oct: 3, vol: 0.4 }, leadInst: 'lead',
    lead: [
      'o5 l8 d4 d f a4 g f', 'o5 l8 d4 d f >d4< c a', 'o5 l8 b-4 b- >d4< b- a g', 'o5 l8 a4 e a >c+4< b a',
      'o5 l8 d4 f a >d4 e f', 'o5 l8 g4 b- >d4 c< b- g', 'o5 l8 e4 a >c+4 e4 d', 'o5 l8 a2 g f e4'
    ]
  });

  // ---------- ステージ2：蒼の深淵 ----------
  S.st2 = build({
    bpm: 124, chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'Am'], bass: 'walk', pad: 0.5, drums: 'soft', arp: { shape: 'wave', oct: 4, vol: 0.34 }, leadInst: 'lead2',
    lead: seqLead({
      key: 62, scale: 'min', oct: 1, chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'Am'],
      motifs: [{ r: [2, 2, 1, 1, 2], d: [4, 2, 0, 2, 4] }, { r: [3, 1, 2, 2], d: [4, 5, 4, 2] }, { r: [2, 1, 1, 4], d: [2, 4, 2, 0] }, { r: [1, 1, 2, 2, 2], d: [0, 2, 4, 2, 4] }],
      cadence: { r: [4, 2, 2], d: [4, 2, 0] }
    })
  });

  // ---------- ステージ3：小惑星基地 ----------
  S.st3 = build({
    bpm: 138, chords: ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Fm', 'Gm', 'Gm'], bass: 'sync', drums: 'march', arp: { shape: 'up', oct: 3, vol: 0.38, inst: 'thin' }, leadInst: 'lead',
    lead: seqLead({
      key: 60, scale: 'min', oct: 1, chords: ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Fm', 'Gm', 'Gm'],
      motifs: [{ r: [1, 1, 2, 1, 1, 2], d: [0, 0, 4, 0, 0, 3] }, { r: [1, 1, 2, 1, 1, 2], d: [2, 2, 4, 2, 2, 1] }, { r: [2, 1, 1, 2, 2], d: [4, 2, 4, 5, 4] }, { r: [1, 1, 1, 1, 4], d: [0, 2, 4, 2, 0] }],
      cadence: { r: [2, 2, 4], d: [4, 2, 0] }
    })
  });

  // ---------- ステージ4：紅炎 ----------
  S.st4 = build({
    bpm: 172, chords: ['Am', 'F', 'G', 'Em', 'Am', 'F', 'Dm', 'Em'], bass: 'gallop', drums: 'drive', arp: { shape: 'zig', oct: 4, vol: 0.4 }, leadInst: 'lead',
    lead: seqLead({
      key: 57, scale: 'min', oct: 1, chords: ['Am', 'F', 'G', 'Em', 'Am', 'F', 'Dm', 'Em'],
      motifs: [{ r: [1, 0.5, 0.5, 1, 1, 1, 1, 2], d: [4, 5, 4, 2, 4, 7, 4, 2] }, { r: [1, 0.5, 0.5, 1, 1, 2, 2], d: [4, 5, 4, 2, 0, 2, 4] }, { r: [2, 1, 1, 2, 2], d: [7, 4, 2, 4, 0] }, { r: [1, 1, 1, 1, 2, 2], d: [2, 4, 7, 4, 2, 0] }],
      cadence: { r: [1, 1, 2, 4], d: [4, 2, 0, null] }
    })
  });

  // ---------- ステージ5：深宇宙 ----------
  S.st5 = build({
    bpm: 150, chords: ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'Bm', 'C#m'], bass: 'pump', pad: 0.45, drums: 'fourfloor', arp: { shape: 'ud', oct: 4, vol: 0.4 }, leadInst: 'lead',
    lead: seqLead({
      key: 54, scale: 'min', oct: 2, chords: ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'Bm', 'C#m'],
      motifs: [{ r: [3, 1, 2, 2], d: [0, 4, 7, 4] }, { r: [3, 1, 4], d: [2, 4, 7] }, { r: [2, 2, 2, 2], d: [4, 7, 9, 7] }, { r: [1, 1, 2, 2, 2], d: [4, 2, 4, 7, 4] }],
      cadence: { r: [6, 2], d: [4, 2] }
    })
  });

  // ---------- ボス曲 ----------
  function bossSong(bpm, key, chords, drums, bassKind, motifs, cad, arpShape) {
    return build({
      bpm: bpm, chords: chords, bass: bassKind || 'gallop', drums: drums || 'boss', arp: { shape: arpShape || 'zig', oct: 3, vol: 0.4, inst: 'thin' }, leadInst: 'lead', leadVol: 1,
      lead: seqLead({ key: key, scale: 'min', oct: 1, chords: chords, motifs: motifs, cadence: cad })
    });
  }
  S.boss1 = bossSong(168, 62, ['Dm', 'Bb', 'Gm', 'Am', 'Dm', 'Bb', 'C', 'Am'], 'boss', 'gallop',
    [{ r: [1, 1, 1, 1, 1, 1, 2], d: [0, 0, 2, 0, 0, 4, 2] }, { r: [1, 1, 2, 1, 1, 2], d: [4, 4, 2, 4, 4, 5] }], { r: [2, 2, 4], d: [4, 2, 0] });
  S.boss2 = bossSong(164, 55, ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Cm', 'Eb', 'F'], 'boss', 'sync',
    [{ r: [2, 1, 1, 2, 2], d: [0, 2, 4, 2, 0] }, { r: [1, 1, 2, 1, 1, 2], d: [4, 5, 4, 2, 4, 7] }], { r: [4, 2, 2], d: [4, 5, 4] }, 'ud');
  S.boss3 = bossSong(172, 52, ['Em', 'C', 'D', 'Bm', 'Em', 'Am', 'C', 'D'], 'boss', 'gallop',
    [{ r: [0.5, 0.5, 1, 1, 1, 1, 2, 1], d: [0, 2, 4, 2, 4, 7, 4, 2] }, { r: [1, 1, 1, 1, 2, 2], d: [4, 2, 4, 2, 0, 4] }], { r: [2, 2, 2, 2], d: [4, 2, 0, null] });
  S.boss4 = bossSong(180, 61, ['C#m', 'A', 'E', 'B', 'C#m', 'A', 'F#m', 'G#m'], 'boss', 'gallop',
    [{ r: [1, 1, 1, 1, 1, 1, 1, 1], d: [0, 4, 2, 4, 0, 4, 2, 7] }, { r: [1, 1, 1, 1, 2, 2], d: [4, 2, 4, 5, 4, 2] }], { r: [1, 1, 2, 4], d: [4, 2, 0, null] }, 'up');
  S.boss5 = build({
    bpm: 156, chords: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#m'], bass: 'gallop', pad: 0.45, drums: 'boss', arp: { shape: 'ud', oct: 4, vol: 0.4 }, leadInst: 'lead',
    lead: seqLead({
      key: 59, scale: 'min', oct: 1, chords: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#m'],
      motifs: [{ r: [2, 1, 1, 1, 1, 2], d: [0, 2, 4, 7, 4, 2] }, { r: [1, 1, 2, 1, 1, 2], d: [4, 5, 7, 5, 4, 2] }, { r: [2, 1, 1, 4], d: [7, 4, 2, 0] }, { r: [1, 1, 1, 1, 2, 2], d: [2, 4, 7, 9, 7, 4] }],
      cadence: { r: [2, 2, 4], d: [7, 4, 2] }
    })
  });

  // ---------- 会話（静かな曲） ----------
  S.story = build({
    bpm: 68, chords: ['Am', 'F', 'C', 'Em', 'Am', 'F', 'Dm', 'E'], bass: 'whole', pad: true, drums: 'none', leadInst: 'bell', harmInst: 'pad', harmVol: 0.3,
    lead: seqLead({
      key: 57, scale: 'min', oct: 2, gate: 8, chords: ['Am', 'F', 'C', 'Em', 'Am', 'F', 'Dm', 'E'],
      motifs: [{ r: [3, 1, 4], d: [4, 2, 0] }, { r: [2, 2, 4], d: [2, 4, 2] }, { r: [4, 4], d: [4, null] }, { r: [1, 1, 2, 4], d: [0, 2, 4, 2] }],
      cadence: { r: [6, 2], d: [2, null] }
    })
  });
  S.story.tracks.forEach(function (t) { if (t.inst === 'arp') t.vol = 0.1; });

  // ---------- エンディング ----------
  S.ending = build({
    bpm: 86, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'], bass: 'half', pad: 0.55, drums: 'none', leadInst: 'bell', harmInst: 'pad', harmVol: 0.35,
    arp: { shape: 'ud', oct: 4, vol: 0.2 },
    lead: seqLead({
      key: 60, scale: 'maj', oct: 1, gate: 8, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'],
      motifs: [{ r: [2, 2, 2, 2], d: [2, 4, 2, 0] }, { r: [3, 1, 4], d: [4, 2, 1] }, { r: [2, 2, 4], d: [2, 4, 7] }, { r: [1, 1, 2, 4], d: [0, 2, 4, 2] }],
      cadence: { r: [8], d: [0] }
    })
  });

  // ---------- エンディング（通常・暗い結末）：遅いテンポの短調。明るい和音を使わず、長い音と休符で空白を残す ----------
  S.ending_dark = build({
    bpm: 54, chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'Dm'], bass: 'whole', pad: 0.5, drums: 'none', leadInst: 'bell', harmInst: 'pad', harmVol: 0.3,
    arp: { shape: 'down', oct: 3, vol: 0.1 },
    lead: seqLead({
      key: 62, scale: 'min', oct: 1, gate: 8, chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'Dm'],
      motifs: [{ r: [4, 2, 2], d: [4, 2, 0] }, { r: [6, 2], d: [2, null] }, { r: [3, 1, 4], d: [4, 5, 4] }, { r: [8], d: [2] }],
      cadence: { r: [6, 2], d: [0, null] }
    })
  });

  // ---------- ジングル ----------
  S.gameover = {
    bpm: 66, once: true, tracks: [
      { inst: 'bell', vol: 1, mml: 'o4 l4 e. d8 c <a2 | o4 l4 d. c8 <b >e2. | o4 l1 c' },
      { inst: 'pad', vol: 0.6, mml: 'q8 o3 l1 a | o3 g | o3 e' },
      { inst: 'bass', vol: 0.9, mml: 'o2 l1 a | o2 g | o2 c' }
    ]
  };
  S.clear = {
    bpm: 132, once: true, tracks: [
      { inst: 'lead', vol: 1, mml: 'o5 l8 c e g >c4. <g8 >c2 | l8 <a >c e a4. g8 e2 | l8 f a >c f4. e8 d c4 r4 < | o5 l1 >c<' },
      { inst: 'bass', vol: 1, mml: 'o3 l4 c c c c | o3 a a a a | o3 f f g g | o3 l1 c' },
      { inst: 'drum', vol: 0.9, mml: 'l8 k h s h k h s h | k h s h k h s h | l16 s s s s t t t t k k s s c r r r | c1' }
    ]
  };
  S.silence = { bpm: 60, tracks: [{ inst: 'pad', vol: 0, mml: 'r1' }] };

  EB.Songs = S;
})();
