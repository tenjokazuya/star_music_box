/* BGM。メロディは MML で手書きし、ベース・アルペジオ・ドラムはコード進行から生成する
 * MML: o=オクターブ l=既定長 v=音量 <>=オクターブ上下 c d e f g a b(+#/-) 長さ . ^ r [..]n
 */
(function () {
  'use strict';
  var RR = window.RR;
  var M = RR.Music = { songs: {} };

  var NN = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
  var ROOT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], dim: [0, 3, 6], m7b5: [0, 3, 6, 10] };
  function chord(name) {
    var r = ROOT[name[0]], i = 1;
    if (name[1] === '#') { r++; i++; } else if (name[1] === 'b') { r--; i++; }
    var q = QUAL[name.slice(i)] || QUAL[''];
    return { root: (r + 12) % 12, tones: q };
  }
  function n(semi, oct, len) {
    var o = oct + Math.floor(semi / 12);
    var s = ((semi % 12) + 12) % 12;
    return 'o' + o + NN[s] + len;
  }
  function bar(ch, style, oct) {
    var c = chord(ch), r = c.root, t = c.tones, out = '', i;
    var fifth = r + 7, third = r + t[1];
    switch (style) {
      case 'bounce': for (i = 0; i < 4; i++) out += n(r, oct, 8) + n(r, oct + 1, 8); break;
      case 'drive': for (i = 0; i < 6; i++) out += n(r, oct, 8); out += n(fifth, oct, 8) + n(r, oct + 1, 8); break;
      case 'root2': out = n(r, oct, 2) + n(fifth, oct - 1, 2); break;
      case 'root1': out = n(r, oct, 1); break;
      case 'walk': out = n(r, oct, 4) + n(fifth, oct, 4) + n(r, oct + 1, 4) + n(fifth, oct, 4); break;
      case 'arp8':
        var seq8 = [0, 1, 2, 3, 2, 1, 2, 1];
        for (i = 0; i < 8; i++) { var k = seq8[i]; out += n(r + (k < t.length ? t[k] : t[0] + 12), oct, 8); }
        break;
      case 'arp16':
        var seq16 = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1];
        var tones = t.concat(t.map(function (x) { return x + 12; }));
        for (i = 0; i < 16; i++) out += n(r + tones[seq16[i] % tones.length], oct, 16);
        break;
      case 'power': for (i = 0; i < 4; i++) out += n(r, oct, 8) + n(fifth, oct, 8); break;
      case 'stab': out = 'r8' + n(third, oct, 8) + 'r8' + n(fifth, oct, 8) + 'r8' + n(third, oct, 8) + 'r8' + n(fifth, oct, 8); break;
      default: out = n(r, oct, 1);
    }
    return out;
  }
  function gen(prog, style, oct) { return prog.split(' ').map(function (c) { return bar(c, style, oct); }).join(''); }
  function rep(s, k) { var o = ''; for (var i = 0; i < k; i++) o += s; return o; }
  M.gen = gen;

  var D_ROCK = 'k8h8s8h8k8k8s8h8', D_ROCK2 = 'k8h8s8h8k8h8s8s16s16';
  var D_HALF = 'k4h8h8s4h8h8', D_CHILL = 'k4p8p8s4p8p8', D_SPARSE = 'k4h4s4h8k8', D_POP = 'k8h8s8h8k8h8s8h8';

  function song(id, bpm, ch, loop) { M.songs[id] = { bpm: bpm, ch: ch, loop: loop !== false }; }

  // ---- タイトル ----
  var tProg = 'Am F G Em Am F Dm E';
  song('title', 108, [
    { inst: 'lead', mml: 'v13 o5e8a8b8>c8<b4a8e8 o5f4.e8d4c4 o5d8e8g8b8>d4<b8g8 o5e2.r4 o5e8a8b8>c8d4c8<b8 o5a4.g8f4e4 o5f8g8a8>c8d4c8<a8 o5g+2b4>e4' },
    { inst: 'arp', mml: 'v9' + gen(tProg, 'arp16', 4) },
    { inst: 'bass', mml: 'v12' + gen(tProg, 'bounce', 2) },
    { inst: 'drum', mml: 'v10' + rep(D_SPARSE, 8) }
  ]);
  // ---- 町 ----
  var townProg = 'Fmaj7 Em7 Dm7 C Bbmaj7 Am7 Gm7 C7';
  song('town', 92, [
    { inst: 'lead2', mml: 'v12 o5a4.g8e4c4 o5d4.e8g2 o5f8e8f8a8>c4<a4 o5g2r4e8g8 o5a4.a+8a4g4 o5e4.g8c4e4 o5d8e8f8g8a4f4 o5e2.r4' },
    { inst: 'soft', mml: 'v10' + gen(townProg, 'arp8', 4) },
    { inst: 'bass', mml: 'v11' + gen(townProg, 'walk', 2) },
    { inst: 'drum', mml: 'v8' + rep(D_CHILL, 8) }
  ]);
  // ---- 家 ----
  var homeProg = 'C Am F G C Am Dm G';
  song('home', 76, [
    { inst: 'lead2', mml: 'v12 o5e4g4>c4<g4 o5a2e4c4 o5f4a4>c4<a4 o5g2.r4 o5e4g4>c4d4 o6e2c4<a4 o5f4a4g4f4 o5d2g2' },
    { inst: 'bell', mml: 'v11' + gen(homeProg, 'arp8', 5) },
    { inst: 'bass', mml: 'v10' + gen(homeProg, 'root2', 3) }
  ]);
  // ---- 店 ----
  var shopProg = 'G C D G Em C D G';
  song('shop', 124, [
    { inst: 'lead', mml: 'v12 o5g8b8>d8<b8g8b8>d4 o5e8g8>c8<g8e4c4 o5f+8a8>d8<a8f+8a8>d8e8 o6d4<b4g4r4 o5e8g8b8>e8<b8g8e4 o5c8e8g8>c8<g8e8c4 o5d8f+8a8>d8c8<a8f+8a8 o5g2r2' },
    { inst: 'arp', mml: 'v8' + gen(shopProg, 'stab', 5) },
    { inst: 'bass', mml: 'v11' + gen(shopProg, 'bounce', 2) },
    { inst: 'drum', mml: 'v8' + rep(D_POP, 8) }
  ]);
  // ---- 峠みち / パーキング ----
  var passProg = 'Em C D Bm Em C Am B';
  song('pass', 100, [
    { inst: 'lead2', mml: 'v11 o5b2.a8g8 o5e2.r4 o5f+4a4d4f+4 o5f+2b2 o5b2.>d8c8 o5b4g4e4g4 o5a4>c4<b4a4 o5f+1' },
    { inst: 'arp', mml: 'v8' + gen(passProg, 'arp16', 4) },
    { inst: 'bass', mml: 'v11' + gen(passProg, 'drive', 2) },
    { inst: 'drum', mml: 'v9' + rep(D_HALF, 8) }
  ]);
  // ---- レース1（ウラヤマ・ツヅラ） ----
  var r1 = 'Am F G E Am F G Am Dm Am Dm E F G Am Am';
  song('race1', 152, [
    { inst: 'lead', mml: 'v13 o5a8a8>c8<a8>d8<a8>e8<a8 o5a8a8>c8<a8>d8<a8>c8<a8 o5b8b8>d8<b8>e8<b8>d8<b8 o5g+4b4>e4<b4 o6e4.d8c4<b4 o5a4.g8f4a4 o5g8a8b8>c8d4<b4 o5a2.r4 ' +
      'o5d8f8a8>d8<a8f8d8f8 o5e8a8>c8e8c8<a8e8a8 o5f8a8>d8f8e8d8c8<a8 o5g+8b8>e8g+8<b4>e4 o6c4.<a8>c4d4 o6d4.<b8>d4e4 o6e8d8c8<b8a8b8>c8d8 o6e2.r4' },
    { inst: 'sq', mml: 'v8' + gen(r1, 'power', 3) },
    { inst: 'bass', mml: 'v12' + gen(r1, 'drive', 2) },
    { inst: 'drum', mml: 'v11' + rep(D_ROCK, 15) + D_ROCK2 }
  ]);
  // ---- レース2（ヘビノセ） ----
  var r2 = 'Dm Bb C A Dm Bb C Dm Gm Dm Bb A Gm Dm Bb A';
  song('race2', 164, [
    { inst: 'lead', mml: 'v13 o5d8f8a8f8d8f8a8>d8 o5d8f8a+8f8d8f8a+8>d8 o5e8g8>c8<g8e8g8>c8e8 o5c+4e4a4>c+4 o6d4.c8<a4f4 o5a+4.a8f4d4 o5e8f8g8a8a+8a8g8e8 o5d2.r4 ' +
      'o5g8a+8>d8<a+8g4>d4 o5f8a8>d8<a8f4a4 o5a+8>d8f8d8<a+4>f4 o5a8>c+8e8c+8<a4>e4 o6g4.f8d4<a+4 o6f4.e8d4<a4 o5a+8>c8d8e8f4e4 o6c+2e2' },
    { inst: 'arp', mml: 'v8' + gen(r2, 'arp16', 4) },
    { inst: 'bass', mml: 'v12' + gen(r2, 'drive', 2) },
    { inst: 'drum', mml: 'v11' + rep(D_ROCK2, 16) }
  ]);
  // ---- レース3（キリガタニ・キュウドウ） ----
  var r3 = 'Em C Am B Em C D B';
  song('race3', 138, [
    { inst: 'lead2', mml: 'v12 o5e8g8b8>e8<b8g8e8g8 o5e8g8>c8e8c8<g8e8g8 o5e8a8>c8e8c8<a8e8a8 o5d+8f+8b8>d+8<b8f+8d+8f+8 o6e4.f+8g4f+4 o6e4.d8c4<b4 o5a4.b8>c4d4 o6d+2<b2' },
    { inst: 'soft', mml: 'v10' + gen(r3, 'arp8', 4) },
    { inst: 'bass', mml: 'v12' + gen(r3, 'drive', 2) },
    { inst: 'drum', mml: 'v10' + rep('k4h8k8s4h8h8', 8) }
  ]);
  // ---- 最終決戦（ヤシャ） ----
  var rf = 'Cm Ab Bb G Cm Ab Fm G Ab Bb Cm Cm Fm G Cm G';
  song('race_final', 158, [
    { inst: 'lead', mml: 'v13 o5c8d+8g8o6c8o5g8d+8o6c8d8 o6d+4.c8o5g+4d+4 o5f8g8a+8o6c8d8c8o5a+8g8 o5g2b2 o6c4.d8d+4g4 o6g+4.g8f4d+4 o6c4.o5a+8g+4f4 o5g2.r4 ' +
      'o5d+8g+8o6c8d+8c8o5g+8d+8g+8 o5f8a+8o6d8f8d8o5a+8f8a+8 o6g4.f8d+4d4 o6c2.r4 o6c8d8d+8f8g+4f4 o6g4.f8d4o5b4 o6c8d8d+8g8o7c4o6g4 o6g2b2' },
    { inst: 'sq', mml: 'v8' + gen(rf, 'power', 3) },
    { inst: 'arp', mml: 'v6' + gen(rf, 'arp16', 5) },
    { inst: 'bass', mml: 'v12' + gen(rf, 'drive', 2) },
    { inst: 'drum', mml: 'v11' + rep('c8h8s8h8k8k8s8h8' + rep(D_ROCK, 6) + D_ROCK2, 2) }
  ]);
  // ---- バイト ----
  var mg = 'C G Am F C G F G';
  song('minigame', 140, [
    { inst: 'lead', mml: 'v12 o5c8e8g8e8c8e8g4 o5b8>d8<g8>d8<b8>d8<g4 o5a8>c8e8c8<a8>c8e4 o5f8a8>c8<a8f4r4 o6c8<b8a8g8e8g8>c4 o5b8a8g8f8d8f8g4 o5a8g8f8e8f8a8>c4 o5g2r2' },
    { inst: 'arp', mml: 'v8' + gen(mg, 'stab', 5) },
    { inst: 'bass', mml: 'v11' + gen(mg, 'bounce', 2) },
    { inst: 'drum', mml: 'v9' + rep(D_POP, 8) }
  ]);
  // ---- イベント（しんみり） ----
  var ev = 'Am Em F C Dm Am F E';
  song('event', 80, [
    { inst: 'lead2', mml: 'v12 o5e2a4b4 o6c4.<b8g2 o5a4.g8f4a4 o5g2.r4 o5f4a4o6d4c4 o5b4.a8e2 o5f4a4o6c4d4 o5b2g+2' },
    { inst: 'soft', mml: 'v10' + gen(ev, 'arp8', 4) },
    { inst: 'bass', mml: 'v10' + gen(ev, 'root2', 2) }
  ]);
  // ---- 緊張（クロサワ） ----
  var te = 'Cm Ab Cm G Cm Ab Fm G';
  song('tension', 96, [
    { inst: 'lead2', mml: 'v11 o5g2.g+8g8 o5d+2.r4 o5g2.a+8g+8 o5g2f2 o5g2.g+8g8 o6c2.<a+8g+8 o5g+4f4d+4c4 o4b2.r4' },
    { inst: 'arp', mml: 'v8' + gen(te, 'arp16', 4) },
    { inst: 'bass', mml: 'v12' + gen(te, 'drive', 2) },
    { inst: 'drum', mml: 'v8' + rep('k4r8k8s4r4', 8) }
  ]);
  // ---- ゲームオーバー ----
  song('sad', 66, [
    { inst: 'lead2', mml: 'v12 o5a2f4d4 o5f2d4o4a+4 o5d2o4a+4g4 o4a1' },
    { inst: 'soft', mml: 'v9' + gen('Dm Bb Gm A', 'arp8', 4) },
    { inst: 'bass', mml: 'v10' + gen('Dm Bb Gm A', 'root1', 2) }
  ]);
  // ---- 勝利ジングル ----
  song('victory', 150, [
    { inst: 'lead', mml: 'v13 o5c8e8g8o6c4.o5g8o6c2' },
    { inst: 'lead2', mml: 'v10 o4g8o5c8e8g4.e8g2' },
    { inst: 'bass', mml: 'v12 o3c4.g4.r8o4c2' },
    { inst: 'drum', mml: 'v10 k8k8k8c4.k8c2' }
  ], false);
  // ---- エンディング ----
  var ed = 'C G Am F C G F G Am Em F C Dm G C C';
  song('ending', 88, [
    { inst: 'lead', mml: 'v12 o5e8g8a8o6c8o5a4g8e8 o5d4.e8g4b4 o5c8e8a8o6c8e4d8c8 o5a2.r4 o5e8g8a8o6c8d4c8o5a8 o5g4.a8b4o6d4 o6c8d8c8o5a8f4a4 o5g2.r4 ' +
      'o6e4.d8c4o5a4 o5b4.a8g4e4 o5a4.b8o6c4d4 o6e2.r4 o6f4.e8d4c4 o5b4.a8g4b4 o6c1 r1' },
    { inst: 'bell', mml: 'v10' + gen(ed, 'arp8', 5) },
    { inst: 'bass', mml: 'v10' + gen(ed, 'root2', 3) },
    { inst: 'drum', mml: 'v7' + rep(D_CHILL, 16) }
  ]);
})();
