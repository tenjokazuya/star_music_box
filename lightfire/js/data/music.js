/* music.js — BGM 定義。コード進行から ベース/アルペジオ/ドラム を自動生成し、旋律(lead)はMMLで手書きする。
   MML: o4 octave / < > octave / l8 length / c d e f g a b (+ - . ^) / r / v volume / q gate / n60:4 (MIDI番号:長さ) / [..]n 繰返
   ドラム(noise): c=キック d=スネア e=ハット f=オープンハット                                                     */
(function () {
  'use strict';
  var LET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], d: [0, 3, 6], s: [0, 5, 7] };
  function chord(name) {
    var m = /^([A-G])([+-]?)(m7|M7|m|7|d|s|)$/.exec(name);
    if (!m) throw new Error('chord? ' + name);
    return { pc: (LET[m[1]] + (m[2] === '+' ? 1 : m[2] === '-' ? -1 : 0) + 12) % 12, t: QUAL[m[3]] };
  }
  function N(m, len) { return 'n' + m + ':' + len + ' '; }
  var BASS = {
    root5: function (c) { var r = 36 + c.pc; return N(r, 4) + N(r + 7, 4) + N(r, 4) + N(r + 7, 4); },
    eighth: function (c) { var r = 36 + c.pc, s = ''; [0, 0, 12, 0, 0, 0, 12, 0].forEach(function (o) { s += N(r + o, 8); }); return s; },
    sustain: function (c) { return N(36 + c.pc, 1); },
    walk: function (c) { var r = 36 + c.pc; return N(r, 4) + N(r + 7, 4) + N(r + 12, 4) + N(r + 7, 4); }
  };
  function tones(c, base) { return c.t.map(function (x) { return base + c.pc + x; }); }
  var ARP = {
    none: function () { return 'r1 '; },
    up: function (c) { var t = tones(c, 60), s = ''; [0, 1, 2, 1, 0, 1, 2, 1].forEach(function (i) { s += N(t[i], 8); }); return s; },
    up2: function (c) { var t = tones(c, 60), s = ''; [0, 2, 1, 2, 0, 2, 1, 2].forEach(function (i) { s += N(t[i] + (i === 2 ? 12 : 0), 8); }); return s; },
    slow: function (c) { var t = tones(c, 60), s = ''; [0, 2, 1, 2].forEach(function (i) { s += N(t[i], 4); }); return s; },
    pad: function (c) { var t = tones(c, 60); return N(t[1], 2) + N(t[2], 2); }
  };
  var DRUM = {
    none: 'r1 ', light: 'c e r e d e r e ', rock: 'c e d e c c d e ', battle: 'c e d e c c d d ', march: 'c r d r c r d d '
  };

  function T(id, o) {
    var bars = o.prog.split(/\s+/), bass = '', arp = '', dr = '';
    bars.forEach(function (b) {
      var c = chord(b);
      bass += BASS[o.bass || 'root5'](c); arp += ARP[o.arp || 'up'](c); dr += DRUM[o.drums || 'none'];
    });
    var ch = [
      { w: o.leadW || 'p25', v: o.leadV || 11, m: o.lead, vib: o.vib === undefined ? 0 : o.vib, q: o.q || 6.4, sus: o.sus },
      { w: o.arpW || 'p12', v: o.arpV || 6, m: arp, q: 5, sus: 0.5 },
      { w: 'tri', v: 12, m: bass, q: o.bassQ || 7 },
      { w: 'noise', v: o.drumV || 8, m: dr }
    ];
    if (o.extra) ch.push(o.extra);
    PF.audio.tracks[id] = { tempo: o.tempo, loop: o.loop !== false, ch: ch, bars: bars.length };
  }

  T('title', {
    tempo: 88, vib: 6, arpV: 6,
    prog: 'Am F C G Am F G E F G Em Am F G C E',
    lead: 'o5 l8 e4. d8 c4 <a4> | a4. g8 f4 c4 | e4. g8 e4 c4 | d2 <b4 g4> | e4. f8 e4 d4 | f4. e8 d4 c4 | d4 e4 d4 <b4> | e2. r4 | ' +
      'a4. g8 f4 a4 | b4. a8 g4 d4 | g4. f+8 e4 b4 | a2 e2 | a4. g8 f4 c4 | b4. a8 g4 d4 | e4 g4 >c2< | b4 g+4 e2'
  });
  T('night', {
    tempo: 72, leadW: 'p12', leadV: 10, vib: 5, arp: 'slow', arpW: 'p50', arpV: 4, bass: 'sustain',
    prog: 'Am Em F C Dm Am E E',
    lead: 'o5 l8 e4. a8 >c2< | b4. g8 e2 | c4. f8 a2 | g4. e8 c2 | d4. f8 a2 | c4. e8 a2 | b4. g+8 e4 g+4 | e2. r4'
  });
  T('village', {
    tempo: 112, drums: 'light', drumV: 6,
    prog: 'C Am F G C Am F G Dm G C Am F G C C',
    lead: 'o5 l8 e4 g4 e8 d8 c4 | c4. d8 e4 c4 | a4 a8 g8 f4 a4 | g4 f8 e8 d2 | e4 g4 >c4 <b4 | a4. g8 e4 c4 | f4 a4 g4 f4 | e4 d4 d2 | ' +
      'f4. e8 d4 f4 | g4. f8 e4 d4 | e4. g8 >c4 <g4 | a4 g4 e2 | f4. a8 >c4 <a4 | g4. f8 d4 <b4> | e4 g4 >c2< | e4 d4 c2'
  });
  T('field', {
    tempo: 126, drums: 'rock', bass: 'eighth', arpV: 5,
    prog: 'C G Am Em F C F G C G Am Em F C G C',
    lead: 'o5 l8 e4 g4 >c4 <g4 | d4 g4 b4 g4 | c4. e8 a4 e4 | e4 g4 b4 g4 | f4. a8 >c4 <a4 | g4. e8 c4 e4 | a4 f4 a4 >c4< | d4. e8 d2 | ' +
      'g4. e8 g4 >c4< | b4 a4 g4 d4 | a4. g8 e4 c4 | e4. g8 b4 g4 | a4 >c4 <a4 f4 | e4 g4 e4 c4 | d4 e4 d4 <b4> | c2. r4'
  });
  T('forest', {
    tempo: 84, leadW: 'p12', leadV: 9, vib: 8, arp: 'slow', arpW: 'p50', arpV: 4, bass: 'sustain',
    prog: 'Em Em C D Em Em Am B7',
    lead: 'o5 l8 e2. g4 | b2 a4 g4 | g2. e4 | f+2. a4 | b2. g4 | e2 g4 b4 | c2 e4 a4 | d+2 f+2'
  });
  T('cave', {
    tempo: 100, leadW: 'p50', leadV: 9, q: 5, arp: 'up2', arpV: 5, bass: 'eighth', drums: 'light', drumV: 6,
    prog: 'Dm Dm B- A Dm Dm Gm A',
    lead: 'o5 l8 d4 d8 f8 a4 f4 | a4. g8 f4 e4 | d4 d8 f8 b-4 a4 | e4. f8 e4 c+4 | d4 d8 f8 a4 >d4< | c4. d8 a4 f4 | g4 b-4 d4 g4 | e4. c+8 e2'
  });
  T('port', {
    tempo: 120, drums: 'rock', bass: 'eighth', arpV: 5,
    prog: 'G C G D G C D G Em C G D Em Am D G',
    lead: 'o5 l8 g4 b4 >d4 <b4 | c4. e8 g4 e4 | b4. a8 g4 d4 | f+4 a4 f+4 d4 | g4 b4 >d2< | c4 e4 g4 >c4< | a4 f+4 a4 f+4 | g2. r4 | ' +
      'e4 g4 b4 g4 | e4 g4 >c2< | d4 g4 b2 | a4 f+4 d2 | g4. f+8 e4 g4 | a4. g8 e4 c4 | d4 f+4 a4 f+4 | b4 a4 g2'
  });
  T('lighthouse', {
    tempo: 96, drums: 'light', drumV: 6,
    prog: 'Em Em C C Am Am B B',
    lead: 'o5 l8 e4. g8 b4 g4 | e4 g4 b2 | g4. e8 c4 e4 | g2 e2 | a4. c8 e4 c4 | a4 c4 e2 | d+4 f+4 b2 | f+4 d+4 b2'
  });
  T('snow', {
    tempo: 76, leadW: 'p12', leadV: 10, arp: 'slow', arpW: 'p50', arpV: 4, bass: 'sustain',
    prog: 'F Dm B- C F Am B- C',
    lead: 'o5 l8 c4 f4 a2 | a4 f4 d2 | d4 f4 b-2 | e4 g4 >c2< | c4 f4 a4 >c4< | a4 e4 c2 | d4 f4 b-4 >d4< | g4 e4 c2'
  });
  T('ice', {
    tempo: 80, leadW: 'p12', leadV: 9, vib: 6, arp: 'up2', arpW: 'p50', arpV: 4, bass: 'sustain',
    prog: 'Bm Bm G A Bm Bm Em F+',
    lead: 'o5 l8 f+2 d4 f+4 | b2 a4 f+4 | g2 e4 g4 | a2 e4 c+4 | d4 f+4 b4 f+4 | d4 f+4 a2 | g4 b4 >e4 <b4 | c+2 a+2'
  });
  T('volcano', {
    tempo: 132, drums: 'battle', bass: 'eighth', arp: 'up2', arpV: 5,
    prog: 'Em Em C D Em Em F G',
    lead: 'o5 l8 e4 e8 g8 b4 >e4< | d4 d8 e8 g4 e4 | c4 c8 e8 g4 >c4< | d4 f+8 a8 f+4 d4 | e4 e8 g8 b4 >e4< | b4 g4 e4 g4 | f4 a4 >c4 <a4 | g4 b4 >d2<'
  });
  T('tower', {
    tempo: 90, leadW: 'p50', leadV: 10, vib: 6, arp: 'up2', arpV: 5, drums: 'march', drumV: 6,
    prog: 'Dm B- Gm A Dm B- C A',
    lead: 'o5 l8 a2 f4 a4 | b-2 a4 f4 | g2 b-4 >d4< | e2 a4 >c+4< | a2 f4 d4 | d2 f4 b-4 | e2 g4 >c4< | c+2 e2'
  });
  T('battle', {
    tempo: 150, drums: 'battle', bass: 'eighth', arp: 'none',
    prog: 'Am Am F G Am Am F E',
    lead: 'o5 l8 a e a >c e c <a e | a e a >c e d c <b | f c f a >c <a f c | g d g b >d <b g d | a e a >c e c <a e | a >c e g e c <a g | f a >c f e c <a f | e g+ b >e d <b g+ e'
  });
  T('boss', {
    tempo: 156, drums: 'battle', bass: 'eighth', arp: 'up2', arpV: 4,
    prog: 'Dm Dm B- B- Gm Gm A A',
    lead: 'o5 l8 d f a >d f d <a f | d f a >d e d c <a | b- d f b- >d <b- f d | b- d f b- >c <b- a f | g b- >d g f d <b- g | g b- >d g f e d <b- | a >c+ e <a >c+ e <a e | a4 >c+4 e2<'
  });
  T('finalboss', {
    tempo: 138, drums: 'battle', bass: 'eighth', arp: 'up2', arpV: 5, leadV: 12,
    prog: 'Em C D B Em C B B',
    lead: 'o5 l8 e g b >e g e <b g | c e g >c e c <g e | d f+ a >d f+ d <a f+ | b d+ f+ b >d+ <b f+ d+ | e g b >e g f+ e d+< | c e g >c e d c <g | b d+ f+ b >d+ f+ b4< | f+2 b2'
  });
  T('sad', {
    tempo: 66, leadW: 'p12', leadV: 10, vib: 7, arp: 'slow', arpW: 'p50', arpV: 4, bass: 'sustain',
    prog: 'Am Dm Em Am F Dm E E',
    lead: 'o5 l8 e2. a4 | a2 f4 d4 | g2. e4 | e2 c4 e4 | a2. f4 | f4 d2 f4 | g+4 b2 e4 | e2. r4'
  });
  T('hope', {
    tempo: 84, drums: 'light', drumV: 5, vib: 4,
    prog: 'C G Am F C G F C',
    lead: 'o5 l8 e4 g4 >c2< | d4 g4 b2 | c4 e4 a2 | a4 f4 c2 | e4 g4 >c4 e4< | d4 g4 b4 >d4< | c4 a4 f4 a4 | g4 e4 c2'
  });
  T('ending', {
    tempo: 80, vib: 6, drums: 'none',
    prog: 'C G Am Em F C F G C G Am Em F G C C',
    lead: 'o5 l8 e4. d8 c4 e4 | d4. c8 <b4 g4> | c4. e8 a4 e4 | e4. d8 c4 <b4> | f4. a8 >c4 <a4 | g4. e8 c4 e4 | f4. e8 d4 f4 | g2. r4 | ' +
      'e4 g4 >c4 e4< | d4 g4 b4 >d4< | c4 e4 a4 >c4< | b4 g4 e4 g4 | f4 a4 >c2< | g4 e4 d4 <b4> | c4 e4 g4 e4 | c1'
  });
  T('garden', {
    tempo: 92, leadW: 'p12', leadV: 10, vib: 6, arp: 'up', arpW: 'p50', arpV: 4, bass: 'sustain',
    prog: 'CM7 Em7 Am7 FM7 CM7 G Am7 FM7',
    lead: 'o5 l8 e4 g4 b2 | g4 b4 >e2< | e4 a4 >c2< | c4 a4 f4 a4 | b4 >e4 g4 e4< | d4 g4 b2 | c4 e4 a4 e4 | f4 a4 >c2<'
  });
  T('ruins', {
    tempo: 100, leadW: 'p50', leadV: 9, q: 5, arp: 'up2', arpV: 5, bass: 'eighth', drums: 'light', drumV: 6,
    prog: 'Am Am F F Dm Dm E E',
    lead: 'o5 l8 e4. c8 a4 e4 | a4. c8 e2 | f4. a8 >c4 <a4 | f4 a4 >c2< | d4. f8 a4 f4 | d4 f4 a2 | g+4. b8 >e4 <b4 | g+4 b4 >e2<'
  });
  T('gameover', {
    tempo: 60, loop: false, leadW: 'p12', vib: 6, arp: 'slow', arpW: 'p50', arpV: 4, bass: 'sustain',
    prog: 'Am Dm E Am',
    lead: 'o5 l8 a2 e2 | d2 f2 | e2 g+2 | a1'
  });

  /* ---------- ジングル（一回きり） ---------- */
  function J(id, tempo, chs) { PF.audio.jingles[id] = { tempo: tempo, loop: false, ch: chs }; }
  J('fanfare', 140, [
    { w: 'p25', v: 12, m: 'o5 l16 c c c c4 e4 g4 >c2< r8', q: 6 },
    { w: 'p50', v: 8, m: 'o4 l16 e e e e4 g4 >c4 e2< r8', q: 6 },
    { w: 'tri', v: 12, m: 'o3 l16 c c c c4 c4 c4 c2 r8', q: 7 }]);
  J('levelup', 150, [
    { w: 'p25', v: 12, m: 'o5 l16 c e g >c e8 g8 c4 e8 g2< r8', q: 6 },
    { w: 'tri', v: 12, m: 'o3 l16 c c c c4 g4 >c2.<', q: 7 }]);
  J('item', 160, [
    { w: 'p25', v: 12, m: 'o5 l16 g >c e g4 e8 g2<', q: 6 },
    { w: 'tri', v: 12, m: 'o3 l8 c g >c2.<', q: 7 }]);
  J('solve', 130, [
    { w: 'p25', v: 12, m: 'o5 l16 e g >c e g8. e16 g4 >c2< r8', q: 6 },
    { w: 'p12', v: 8, m: 'o4 l16 c e g >c e8. c16 e4 g2< r8', q: 6 },
    { w: 'tri', v: 12, m: 'o3 l8 c4 g4 >c1<', q: 7 }]);
  J('inn', 100, [
    { w: 'p12', v: 10, m: 'o5 l8 c e g e c4 e4 g2 r4', q: 6 },
    { w: 'tri', v: 10, m: 'o3 l4 c g c g c2 r4', q: 7 }]);
  J('sting', 120, [
    { w: 'p25', v: 12, m: 'o4 l16 a >c e a8. g16 e2<', q: 6 },
    { w: 'tri', v: 12, m: 'o2 l4 a2 e2', q: 7 }]);
  J('dark', 100, [
    { w: 'p25', v: 10, m: 'o4 l8 e b-2. < e1', q: 6 },
    { w: 'tri', v: 12, m: 'o2 l1 e e', q: 7 }]);
})();
