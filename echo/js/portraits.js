/* portraits.js ― 会話ポートレート（64x72 の半身像・表情差分つき）
 * 1) 既定はコード生成のドット絵（Pix）。
 * 2) game/assets/portraits/ に所定名の画像(PNG)があれば、そちらを優先して表示する。
 *    例: luca.png / luca_talk.png / luca_sad.png / luca_sad_talk.png （詳細は assets/portraits/README.md）
 * 表情: normal / worry / sad / smile / determined / surprise */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB, G = EB.Gfx, U = EB.U;
  var PW = 64, PH = 72;

  // ---- 表情定義 ----
  // bo/bi: 眉の外側/内側の上下(負=上)  lid: 上まぶたの下がり  eyes: 目の形  mouth: 口
  var EMO = {
    normal:     { bo: 0,  bi: 0,  lid: 0,   mouth: 'flat' },
    worry:      { bo: 1,  bi: -3, lid: 0.6, mouth: 'worry' },
    sad:        { bo: 1,  bi: -3, lid: 1.2, mouth: 'sad', tear: true },
    smile:      { bo: -1, bi: -1, lid: 0,   eyes: 'smile', mouth: 'smile' },
    determined: { bo: -1, bi: 2,  lid: 1.2, mouth: 'firm' },
    surprise:   { bo: -3, bi: -3, lid: 0,   big: true, mouth: 'o' }
  };

  // ---- パレット ----
  var PAL = {
    luca: {
      skin: '#f9dcc2', skinS: '#e8b692', blush: '#f4a4a0', hairD: '#232f72', hair: '#3d56b4', hairH: '#92b4f6',
      iris: '#2a5ad8', irisL: '#7ad0ff', pupil: '#0c1a50', sclera: '#ffffff', lash: '#1c1634', brow: '#232f72', mouth: '#b8625a',
      suit: '#2f5ec8', suitS: '#234aa0', collar: '#e8eef8', collarS: '#b0bcd6', under: '#16204c', emblem: '#ff6a4a',
      bg1: '#1c3a70', bg2: '#0a1430', style: 'bob', headset: true
    },
    noa: {
      skin: '#d4f8ff', skinS: '#8edaf0', blush: '#a8f0ff', hairD: '#2c9ad2', hair: '#5ee2ff', hairH: '#f0ffff',
      iris: '#10b4e8', irisL: '#e0ffff', pupil: '#04506e', sclera: '#f2ffff', lash: '#0a6c96', brow: '#2c9ad2', mouth: '#3ab4d8',
      suit: '#1a8cc2', suitS: '#126a98', collar: '#b0f4ff', collarS: '#62cce8', under: '#0a4a70', emblem: '#ffffff',
      bg1: '#08385a', bg2: '#021a2c', style: 'long', holo: true
    },
    voice_girl: {
      skin: '#e0cfc6', skinS: '#b8a39c', blush: '#d8a8a4', hairD: '#5a4636', hair: '#86684c', hairH: '#b89874',
      iris: '#6a5030', irisL: '#b09068', pupil: '#201408', sclera: '#f0ecec', lash: '#2a2018', brow: '#5a4636', mouth: '#a8605a',
      suit: '#7a8cb0', suitS: '#5a6a90', collar: '#d8dff0', collarS: '#a0aac4', under: '#40486a',
      bg1: '#2a3040', bg2: '#12141e', style: 'twin', ribbon: '#d86a8a', noise: 1
    },
    voice_sci: {
      skin: '#e4d0c4', skinS: '#b8a498', blush: '#d4aaa0', hairD: '#2a2a34', hair: '#44444e', hairH: '#74747e',
      iris: '#4a4a60', irisL: '#8a8aa8', pupil: '#14141c', sclera: '#eeeeee', lash: '#1c1c24', brow: '#2a2a34', mouth: '#a0645c',
      suit: '#e4e8f0', suitS: '#b4bccc', collar: '#ffffff', collarS: '#c8d0dc', under: '#4a5a80',
      bg1: '#242c3c', bg2: '#10141e', style: 'short', glasses: true, noise: 1
    },
    voice_man: {
      skin: '#d8b8a0', skinS: '#a88670', blush: '#c89484', hairD: '#3a2c24', hair: '#54402e', hairH: '#7a6044',
      iris: '#3c4a5c', irisL: '#7c8ca0', pupil: '#10161c', sclera: '#e8e4e0', lash: '#1c1816', brow: '#3a2c24', mouth: '#9c5a52',
      suit: '#c8782c', suitS: '#9c5a1e', collar: '#e8a44a', collarS: '#b87a2c', under: '#3a2a1c',
      bg1: '#30241c', bg2: '#141010', style: 'helmet', noise: 1
    }
  };

  var KEYS = ['luca', 'noa', 'voice_girl', 'voice_sci', 'voice_man', 'voice_auto', 'machine', 'mother'];
  var VOICE_BY_NAME = { '少女の声': 'voice_girl', '研究員の声': 'voice_sci', 'コロニーの声': 'voice_man', '自動音声': 'voice_auto' };

  function rowsBg(P, c1, c2) {
    for (var y = 0; y < PH; y++) P.rect(0, y, PW, 1, U.mix(c1, c2, y / PH));
    var dot = U.mix(c1, '#ffffff', 0.1);
    for (y = 3; y < PH; y += 6) for (var x = (y % 12 ? 1 : 4); x < PW; x += 6) P.px(x, y, dot);
  }

  // ---- 体（肩・襟） ----
  function body(P, o) {
    P.poly([[0, 72], [2, 63], [11, 56], [23, 52], [41, 52], [53, 56], [62, 63], [64, 72]], o.suit);
    P.poly([[41, 52], [53, 56], [62, 63], [64, 72], [47, 72], [44, 61]], o.suitS);
    P.poly([[0, 72], [2, 63], [8, 58], [10, 72]], U.mix(o.suit, '#ffffff', 0.12));
    P.poly([[21, 50], [32, 61], [43, 50], [48, 54], [32, 68], [16, 54]], o.collar);
    P.poly([[32, 61], [43, 50], [48, 54], [32, 68]], o.collarS);
    P.poly([[26, 56], [32, 65], [38, 56]], o.under);
    if (o.emblem) {
      P.rect(7, 63, 8, 2, o.emblem); P.rect(7, 67, 8, 1, o.emblem);
      P.rect(49, 63, 8, 2, o.emblem); P.rect(49, 67, 8, 1, o.emblem);
    }
  }

  // ---- 髪（後ろ） ----
  function hairBack(P, o) {
    if (o.style === 'long') {
      P.ell(32, 27, 21.5, 22.5, o.hairD);
      P.poly([[9, 26], [4, 52], [6, 70], [16, 66], [21, 48], [20, 30]], o.hairD);
      P.poly([[55, 26], [60, 52], [58, 70], [48, 66], [43, 48], [44, 30]], o.hairD);
      P.poly([[8, 40], [6, 60], [10, 66], [12, 50]], o.hair); P.poly([[56, 40], [58, 60], [54, 66], [52, 50]], o.hair);
    } else if (o.style === 'bob') {
      P.ell(32, 27, 21.5, 22.5, o.hairD);
      P.poly([[9, 26], [8, 49], [15, 56], [22, 48], [20, 30]], o.hairD);
      P.poly([[55, 26], [56, 49], [49, 56], [42, 48], [44, 30]], o.hairD);
    } else if (o.style === 'twin') {
      P.ell(32, 27, 19.5, 20.5, o.hairD);
      P.ell(9, 41, 5.5, 12, o.hairD); P.ell(55, 41, 5.5, 12, o.hairD);
      P.ell(9, 40, 3.5, 9, o.hair); P.ell(55, 40, 3.5, 9, o.hair);
    } else if (o.style === 'short') {
      P.ell(32, 26, 19.5, 19.5, o.hairD);
    } else if (o.style === 'helmet') {
      P.ell(32, 26, 21, 21, '#5a5e6c');
    }
  }

  // ---- 目・眉・口 ----
  function eye(P, o, cx, cy, side, E, blink) {
    var lash = o.lash;
    if (blink || E.eyes === 'closed') {
      P.line(cx - 5, cy + 1, cx + 5, cy + 1, lash); P.line(cx - 5, cy + 2, cx + 5, cy + 2, lash);
      P.px(cx + side * 6, cy, lash);
      return;
    }
    if (E.eyes === 'smile') {
      P.line(cx - 5, cy + 2, cx - 3, cy - 1, lash); P.line(cx - 3, cy - 1, cx + 3, cy - 1, lash); P.line(cx + 3, cy - 1, cx + 5, cy + 2, lash);
      P.line(cx - 4, cy + 2, cx - 3, cy, lash); P.line(cx + 4, cy + 2, cx + 3, cy, lash);
      P.px(cx + side * 6, cy + 1, lash);
      return;
    }
    var ry = E.big ? 5.4 : 4.6, drop = E.lid || 0;
    P.ell(cx, cy, 4.8, ry, o.sclera);
    P.ell(cx, cy + 0.4, 3.5, E.big ? 3.8 : 4.1, o.iris);
    P.ell(cx, cy + 1.9, 2.6, 1.6, o.irisL);
    P.ell(cx, cy + 0.3, 1.7, E.big ? 1.7 : 2.3, o.pupil);
    P.rect(cx - 2, cy - 2, 2, 2, '#ffffff'); P.px(cx + 1, cy + 2, '#ffffff');
    // 上まぶた（肌色で覆って線を引く）
    var t = cy - ry - 1;
    P.rect(cx - 6, t, 13, Math.round(2 + drop), o.skin);
    var ly = cy - ry + 0.6 + drop;
    P.line(cx - 5, cy - 0.5, cx - 4, ly + 1.2, lash); P.line(cx - 4, ly + 1.2, cx - 1, ly, lash);
    P.line(cx - 1, ly, cx + 3, ly, lash); P.line(cx + 3, ly, cx + 5, cy - 1, lash);
    P.line(cx - 4, ly + 0.2, cx - 1, ly - 0.8, lash); P.line(cx - 1, ly - 0.8, cx + 3, ly - 0.8, lash);
    P.px(cx + side * 5.5, cy - 2, lash); P.px(cx + side * 6.5, cy - 3, lash);
    // 下まぶた
    P.line(cx - 3, cy + ry, cx + 3, cy + ry, o.skinS);
    if (E.tear) { P.px(cx + side * 2, cy + ry + 2, '#c8ecff'); P.px(cx + side * 2, cy + ry + 3, '#ffffff'); P.px(cx + side * 2, cy + ry + 4, '#a0d8ff'); P.px(cx - side * 1, cy + ry + 1, '#d8f4ff'); }
  }
  function brow(P, o, cx, cy, side, E) {
    var by = cy - 8.5, ox = cx + side * 5, ix = cx - side * 4;
    P.line(ox, by + E.bo, ix, by + E.bi, o.brow);
    var mx = (ox * 0.55 + ix * 0.45), my = (by + E.bo) * 0.55 + (by + E.bi) * 0.45;
    P.line(ox, by + E.bo + 1, mx, my + 1, o.brow);
  }
  function mouth(P, o, E, open) {
    var m = o.mouth, d = '#6a2434', cx = 32, y = 44;
    var kind = E.mouth;
    if (open) {
      if (kind === 'smile') { P.poly([[27.5, y - 1], [36.5, y - 1], [34, y + 3.5], [30, y + 3.5]], d); P.rect(29, y - 1, 6, 1, '#ffffff'); P.px(31, y + 2, '#e07880'); P.px(32, y + 2, '#e07880'); return; }
      P.ell(cx, y + 0.8, 2.6, 2.1, d); P.px(31, y + 1.5, '#e07880'); P.px(32, y + 1.5, '#e07880');
      return;
    }
    switch (kind) {
      case 'smile': P.line(28, y - 1, 30, y + 1, m); P.line(30, y + 1, 34, y + 1, m); P.line(34, y + 1, 36, y - 1, m); break;
      case 'sad': P.line(28, y + 2, 30, y, m); P.line(30, y, 34, y, m); P.line(34, y, 36, y + 2, m); break;
      case 'worry': P.line(28, y, 30, y + 1, m); P.line(30, y + 1, 32, y, m); P.line(32, y, 34, y + 1, m); P.line(34, y + 1, 36, y, m); break;
      case 'firm': P.line(29, y, 35, y, m); P.px(28, y + 1, m); P.px(36, y + 1, m); break;
      case 'o': P.ell(cx, y + 1, 1.8, 2.3, d); P.px(32, y + 2, '#e07880'); break;
      default: P.line(29, y, 35, y, m); P.px(35, y - 1, m);
    }
  }

  // ---- 顔と前髪 ----
  function head(P, o, E, open, blink) {
    // 首
    P.rect(28, 42, 8, 13, o.skinS);
    P.rect(28, 48, 8, 4, U.mix(o.skinS, '#000000', 0.18));
    // 顔
    P.ell(32, 30, 13.6, 14.8, o.skin);
    P.poly([[18.8, 31], [20, 38], [24.5, 44.5], [28.5, 47.4], [32, 48.4], [35.5, 47.4], [39.5, 44.5], [44, 38], [45.2, 31]], o.skin);
    // 影（右の輪郭に沿う三日月）
    P.poly([[44.8, 29], [45.2, 35], [42.6, 42], [37, 47.6], [40, 43], [42.2, 36], [42.8, 29]], o.skinS);
    P.poly([[19, 33], [20, 38], [22.5, 41], [21, 34]], U.mix(o.skin, '#ffffff', 0.35));
    // 頬
    P.ell(21.5, 39, 3, 1.6, o.blush); P.ell(42.5, 39, 3, 1.6, o.blush);
    // 耳
    P.ell(18.5, 34, 2, 3, o.skin); P.ell(45.5, 34, 2, 3, o.skin); P.px(46, 34, o.skinS);
    // 鼻
    P.px(32, 40, o.skinS);
    eye(P, o, 24.5, 34.5, -1, E, blink); eye(P, o, 39.5, 34.5, 1, E, blink);
    brow(P, o, 24.5, 34.5, -1, E); brow(P, o, 39.5, 34.5, 1, E);
    mouth(P, o, E, open);
  }
  function hairFront(P, o) {
    if (o.style === 'bob' || o.style === 'long') {
      P.poly([[11, 22], [13, 9], [22, 3.5], [32, 2], [42, 3.5], [51, 9], [53, 22], [46, 22], [43.5, 31], [40, 24], [36, 32], [32, 24], [28, 32], [24, 24], [20.5, 31], [18, 22]], o.hair);
      P.poly([[11, 22], [9.5, 40], [14, 47], [18, 40], [18, 24]], o.hair);
      P.poly([[53, 22], [54.5, 40], [50, 47], [46, 40], [46, 24]], o.hair);
      P.poly([[17, 12], [26, 6.5], [38, 6.5], [47, 12], [40, 10], [31, 9.5], [24, 10]], o.hairH);
      P.poly([[13, 20], [14, 12], [18, 18]], o.hairD); P.poly([[51, 20], [50, 12], [46, 18]], o.hairD);
      P.poly([[46, 22], [43.5, 31], [40, 24]], o.hairD);
      P.poly([[50, 28], [50, 44], [47, 41]], o.hairD);
      P.line(32, 2, 33, -1, o.hair);
      P.line(13, 26, 11, 40, o.hairH); P.line(14, 30, 13, 42, o.hairH); P.line(51, 26, 53, 40, o.hairD);
      P.line(24, 24, 22, 14, o.hairD); P.line(32, 24, 32, 12, o.hairD); P.line(40, 24, 42, 14, o.hairD);
      P.line(20, 20, 19, 12, o.hairH); P.line(38, 22, 36, 14, o.hairH);
    } else if (o.style === 'twin') {
      P.poly([[12, 22], [14, 10], [23, 4.5], [32, 3], [41, 4.5], [50, 10], [52, 22], [46, 24], [32, 27], [18, 24]], o.hair);
      P.poly([[17, 12], [26, 7], [38, 7], [47, 12], [40, 10], [24, 10]], o.hairH);
      P.poly([[12, 22], [11, 36], [15, 36], [18, 26]], o.hair); P.poly([[52, 22], [53, 36], [49, 36], [46, 26]], o.hair);
      P.rect(5, 30, 8, 3, o.ribbon); P.rect(51, 30, 8, 3, o.ribbon);
    } else if (o.style === 'short') {
      P.poly([[12, 24], [13, 10], [22, 4], [33, 2.5], [44, 5], [51, 12], [52, 24], [46, 18], [38, 22], [30, 15], [22, 21], [17, 17]], o.hair);
      P.poly([[18, 10], [28, 5.5], [40, 6], [32, 7.5]], o.hairH);
    } else if (o.style === 'helmet') {
      P.ell(32, 17, 19.5, 14, '#c8cdd8'); P.ell(32, 16, 17, 11, '#e8ecf4');
      P.rect(14, 19, 36, 6, '#8a90a0'); P.rect(14, 25, 36, 1, '#3a3e4c');
      P.ell(32, 8, 4, 3, '#ffe890'); P.ell(32, 8, 2, 1.6, '#ffffff');
      P.ell(32, 12, 3, 1.6, '#6a6e7c');
    }
  }
  function accessories(P, o) {
    if (o.headset) {
      P.ell(12.5, 35, 3.6, 4.4, '#e8eef8'); P.ell(12.5, 35, 2, 2.6, '#9fb0d0'); P.px(11, 33, '#ffffff');
      P.ell(51.5, 35, 3.6, 4.4, '#e8eef8'); P.ell(51.5, 35, 2, 2.6, '#9fb0d0');
      P.line(51, 39, 45, 46, '#c0c8dc'); P.line(51, 40, 45, 47, '#c0c8dc'); P.ell(44.5, 47, 1.8, 1.4, '#6a7894'); P.px(44, 46, '#ff6a6a');
      P.line(13, 31, 14, 8, '#d8e0f0'); P.line(14, 8, 24, 3, '#d8e0f0');
    }
    if (o.glasses) {
      var g = '#cfd6e6';
      [24.5, 39.5].forEach(function (cx) {
        P.line(cx - 6, 30, cx + 6, 30, g); P.line(cx - 6, 40, cx + 6, 40, g); P.line(cx - 6, 30, cx - 6, 40, g); P.line(cx + 6, 30, cx + 6, 40, g);
        P.px(cx - 4, 32, '#ffffff'); P.px(cx - 3, 31, '#ffffff');
      });
      P.line(31, 34, 33, 34, g); P.line(18, 33, 14, 31, g); P.line(46, 33, 50, 31, g);
    }
  }

  // ---- 後処理 ----
  function noiseOverlay(P, seed, amount) {
    var r = U.makeRng(seed);
    for (var i = 0; i < amount; i++) {
      var x = r.int(0, PW - 1), y = r.int(0, PH - 1);
      P.px(x, y, r.next() < 0.5 ? '#c0c8e8' : '#586088');
    }
    for (var j = 0; j < 5; j++) { var yy = r.int(2, PH - 4); P.rect(r.int(0, 14), yy, r.int(18, 46), 1, r.next() < 0.5 ? '#dfe6ff' : '#7a86b8'); }
  }
  function scan(spr, rgba, step) {
    var x = spr.c.getContext('2d');
    x.fillStyle = rgba;
    for (var y = 0; y < spr.h; y += step) x.fillRect(0, y, spr.w, 1);
    return spr;
  }

  // ---- キャラ別 ----
  function humanPortrait(P, key, emo, open, blink) {
    var o = PAL[key], E = EMO[emo] || EMO.normal;
    rowsBg(P, o.bg1, o.bg2);
    if (o.holo) { P.ring(32, 28, 25, 27, '#3ccaf0'); P.ring(32, 28, 21, 22, '#1a7aa8'); for (var i = 0; i < 6; i++) P.px(32 + Math.cos(i * 1.05) * 29, 28 + Math.sin(i * 1.05) * 29, '#a8f0ff'); }
    hairBack(P, o);
    body(P, o);
    head(P, o, E, open, blink);
    hairFront(P, o);
    accessories(P, o);
  }
  function machinePortrait(P, emo, open) {
    rowsBg(P, '#2a0a14', '#12040a');
    P.poly([[32, 2], [58, 16], [58, 52], [32, 68], [6, 52], [6, 16]], '#4a4e60');
    P.poly([[32, 6], [54, 18], [54, 50], [32, 63], [10, 50], [10, 18]], '#2a2c3a');
    P.poly([[32, 2], [58, 16], [54, 18], [32, 6]], '#8a90a8'); P.poly([[6, 16], [10, 18], [32, 6], [32, 2]], '#6a7088');
    P.ell(32, 34, 17, 14, '#14060c'); P.ring(32, 34, 14, 18, '#7a2030');
    P.ell(32, 34, 13, 11, '#c02030');
    P.ell(32, 34, 10, 8.5, open ? '#ff7a40' : '#ff3a48');
    P.ell(32, 34, 6.5, 5.5, open ? '#fff0a0' : '#ffb0a0');
    P.rect(30, 26, 4, 16, '#14060c');
    P.rect(27, 29, 3, 2, '#ffffff');
    for (var i = 0; i < 4; i++) { P.rect(14 + i * 9, 58, 5, 2, open && i % 2 ? '#ff5060' : '#6a2838'); }
    P.line(8, 20, 14, 26, '#8a90a8'); P.line(56, 20, 50, 26, '#8a90a8');
    P.ell(10, 36, 2, 5, '#ff4a50'); P.ell(54, 36, 2, 5, '#ff4a50');
  }
  function motherPortrait(P, emo, open) {
    rowsBg(P, '#2a0a30', '#10041a');
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * U.TAU, l = i % 2 ? 28 : 34;
      P.line(32 + Math.cos(a) * 14, 34 + Math.sin(a) * 14, 32 + Math.cos(a) * l, 34 + Math.sin(a) * l * 1.05, i % 2 ? '#6a2a8a' : '#a040b0');
    }
    P.ring(32, 34, 17, 21, '#c050b0'); P.ring(32, 34, 13, 15, '#7a30a0');
    P.ell(32, 34, 12, 12, '#12041a');
    P.ell(32, 34, open ? 10 : 9, open ? 10 : 9, '#c02848');
    P.ell(32, 34, 6.5, 6.5, '#ff7a40'); P.ell(32, 34, 3.6, 3.6, '#ffe890'); P.ell(32, 34, 1.6, 1.6, '#ffffff');
    P.rect(31, 24, 2, 20, '#12041a');
    P.px(26, 28, '#ffd0e0'); P.px(27, 28, '#ffd0e0');
    for (var j = 0; j < 8; j++) { var b = j / 8 * U.TAU + 0.2; P.px(32 + Math.cos(b) * 25, 34 + Math.sin(b) * 25, '#ffb0f0'); }
  }
  function autoPortrait(P, open) {
    rowsBg(P, '#10202a', '#060c12');
    var r = U.makeRng(open ? 5 : 9);
    P.ring(32, 30, 20, 22, '#3a8aa8');
    for (var i = 0; i < 13; i++) {
      var h = open ? r.int(4, 28) : 4 + Math.round(Math.abs(Math.sin(i * 0.7)) * 10);
      P.rect(10 + i * 3.4, 30 - h / 2, 2, h, i % 3 === 0 ? '#9fe8ff' : '#4ab0d0');
    }
    P.rect(8, 56, 48, 2, '#2a6a84'); P.rect(8, 56, open ? 36 : 22, 2, '#7adcf0');
    P.rect(26, 62, 12, 3, '#2a6a84');
  }

  var cache = {};
  var ext = {};     // 外部画像 {key: {base:img, variants:{name:img}}}

  function drawExt(img) {
    // 外部画像 → 64x72 より大きな枠(80x96)に収める。高解像度なら平滑化して縮小。
    var W = 80, H = 96, c = G.mkCanvas(W, H), x = c.getContext('2d');
    var s = Math.min(W / img.width, H / img.height), w = Math.round(img.width * s), h = Math.round(img.height * s);
    x.imageSmoothingEnabled = img.width > 120 || img.height > 120;
    try { x.imageSmoothingQuality = 'high'; } catch (e) { /* 無視 */ }
    x.drawImage(img, Math.round((W - w) / 2), H - h, w, h);
    return { c: c, w: W, h: H, ox: 0, oy: 0, ext: true };
  }
  function pickExt(key, emo, talk) {
    var e = ext[key]; if (!e) return null;
    var names = [];
    if (emo && emo !== 'normal') { if (talk) names.push(emo + '_talk'); names.push(emo); }
    if (talk) names.push('talk');
    names.push('base');
    for (var i = 0; i < names.length; i++) if (e.v[names[i]]) return { name: names[i], img: e.v[names[i]] };
    return null;
  }

  EB.Portrait = {
    W: PW, H: PH, KEYS: KEYS,
    // 話者IDと表示名上書きから描画キーを決める
    keyFor: function (speaker, nameOverride) {
      if (speaker === 'voice') return VOICE_BY_NAME[nameOverride] || 'voice_man';
      return speaker;
    },
    get: function (key, talking, emo, blink) {
      emo = EMO[emo] ? emo : 'normal';
      var p = pickExt(key, emo, !!talking);
      if (p) {
        var ck = 'x:' + key + ':' + p.name;
        return cache[ck] || (cache[ck] = drawExt(p.img));
      }
      var k = key + ':' + emo + (talking ? 'T' : '') + (blink ? 'B' : '');
      if (cache[k]) return cache[k];
      var spr = G.make(PW, PH, function (P) {
        if (PAL[key]) humanPortrait(P, key, emo, !!talking, !!blink);
        else if (key === 'machine') machinePortrait(P, emo, !!talking);
        else if (key === 'mother') motherPortrait(P, emo, !!talking);
        else if (key === 'voice_auto') autoPortrait(P, !!talking);
        else humanPortrait(P, 'luca', emo, !!talking, !!blink);
        var o = PAL[key];
        if (o && o.noise) noiseOverlay(P, talking ? 71 : 37, 90);
      }, { outline: false, bevel: false });
      if (PAL[key] && PAL[key].holo) scan(spr, 'rgba(0,30,50,0.28)', 3);
      else if (PAL[key] && PAL[key].noise) scan(spr, 'rgba(0,0,20,0.22)', 3);
      else if (key === 'voice_auto' || key === 'machine' || key === 'mother') scan(spr, 'rgba(0,0,20,0.18)', 3);
      spr.ext = false;
      cache[k] = spr;
      return spr;
    },
    // game/assets/portraits/ の画像を探して登録する（無ければ何もしない）
    loadExternal: function () {
      if (!root.Image) return;
      var base = 'assets/portraits/';
      var emos = ['worry', 'sad', 'smile', 'determined', 'surprise'];
      KEYS.forEach(function (key) {
        function probe(variant, file, then) {
          var img = new root.Image();
          img.onload = function () {
            if (!ext[key]) ext[key] = { v: {} };
            ext[key].v[variant] = img;
            if (then) then();
          };
          img.onerror = function () { /* 画像が無ければ既定の生成絵を使う */ };
          img.src = base + file + '.png';
        }
        probe('base', key, function () {
          probe('talk', key + '_talk');
          emos.forEach(function (e) { probe(e, key + '_' + e); probe(e + '_talk', key + '_' + e + '_talk'); });
        });
      });
    }
  };
})();
