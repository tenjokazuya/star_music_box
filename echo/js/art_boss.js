/* art_boss.js ― 中ボス/大ボスのドット絵（プリミティブ描画＋自動陰影） */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var G = EB.Gfx, U = EB.U, TONES = EB.Spr.TONES;
  var W = '#ffffff';

  var B = {};

  // ===== 中ボス =====
  // 1: 偵察母機ピケット
  B.picket = function (T, f) {
    return G.make(55, 41, function (P) {
      var cx = 27.5;
      P.rect(27, 0, 1, 9, T.dark);
      P.ell(cx, 5, 10, 3.6, T.hull); P.ell(cx, 4.2, 6.5, 1.8, T.acc);
      P.sr(0, 14, 8, 17, T.dark); P.sr(1, 16, 6, 13, T.hull);
      P.sr(2, 18, 4, 3, f ? T.glow : T.dark); P.sr(2, 24, 4, 3, f ? T.dark : T.glow);
      P.sp([[cx, 40], [10, 34], [3, 22], [10, 11], [cx, 8]], T.hull);
      P.ell(cx, 23, 14, 11, T.dark);
      P.ell(cx, 23, 10, 8, T.hull);
      P.ell(cx, 23, 6, 5, T.acc);
      P.rect(26, 22, 3, 2, f ? W : T.glow);
      P.spx(11, 24, T.glow); P.spx(13, 30, T.glow); P.spx(13, 16, T.glow);
      P.sr(11, 36, 3, 4, T.dark); P.sr(11, 38, 3, 2, T.glow);
    });
  };
  // 2: 潜行機ディープウォーカー
  B.deepwalker = function (T, f) {
    return G.make(61, 43, function (P) {
      var cx = 30.5, i;
      for (i = 0; i < 3; i++) {
        var y = 14 + i * 7;
        P.poly([[18, y], [6 - i * 2, y + 6], [3 - i * 2, y + 14], [6 - i * 2, y + 15], [10, y + 8], [20, y + 3]], T.dark);
        P.poly([[43, y], [55 + i * 2, y + 6], [58 + i * 2, y + 14], [55 + i * 2, y + 15], [51, y + 8], [41, y + 3]], T.dark);
      }
      P.sr(0, 2, 7, 12, T.hull); P.sr(1, 4, 5, 8, T.dark); P.rect(2, 12, 3, 2, T.acc);
      P.ell(cx, 20, 17, 15, T.hull);
      P.ell(cx, 20, 13, 11, T.dark);
      P.ell(cx, 14, 8, 8, T.hull);
      P.ell(cx, 13, 5, 5, 'glass');
      P.rect(29, 12, 3, 2, f ? W : T.glow);
      P.rect(cx - 9, 24, 19, 3, T.acc); P.spx(18, 30, T.glow); P.spx(21, 33, T.glow);
      P.rect(30, 33, 1, 8, T.dark);
    });
  };
  // 3: 迎撃機ミラーレイ
  B.mirrorray = function (T, f) {
    return G.make(51, 49, function (P) {
      var cx = 25.5;
      P.poly([[cx, 0], [50, 24], [cx, 48], [1, 24]], T.hull);
      P.poly([[cx, 6], [43, 24], [cx, 42], [8, 24]], T.dark);
      P.poly([[cx, 12], [36, 24], [cx, 36], [15, 24]], 'glass');
      P.poly([[cx, 12], [36, 24], [cx, 24]], 'white');
      P.line(cx, 0, cx, 48, T.acc);
      P.line(1, 24, 50, 24, T.acc);
      P.ell(cx, 24, 4, 4, f ? T.acc : T.glow); P.ell(cx, 24, 1.5, 1.5, W);
      P.sr(0, 21, 4, 7, T.acc); P.spx(8, 24, f ? W : T.glow);
      P.spx(15, 10, T.glow); P.spx(15, 38, T.glow);
    });
  };
  // 4: 炉心機フレアコア
  B.flarecore = function (T, f) {
    return G.make(53, 53, function (P) {
      var c = 26.5, i;
      P.ring(c, c, 21, 26, T.dark);
      P.ring(c, c, 22, 24, T.hull);
      for (i = 0; i < 8; i++) {
        var a = i / 8 * U.TAU + (f ? U.TAU / 16 : 0);
        P.ell(c + Math.cos(a) * 24, c + Math.sin(a) * 24, 2.6, 2.6, T.acc);
      }
      P.ell(c, c, 17, 17, 'red');
      P.ell(c, c, 14, 14, 'orange');
      P.ell(c, c, 10, 10, 'yellow');
      P.ell(c, c, 5, 5, 'white');
      for (i = 0; i < 6; i++) {
        var b = i / 6 * U.TAU + (f ? 0.5 : 0);
        P.line(c + Math.cos(b) * 8, c + Math.sin(b) * 8, c + Math.cos(b) * 17, c + Math.sin(b) * 17, 'orange');
      }
    });
  };
  // 5: 門番機ゲートキーパー
  B.gatekeeper = function (T, f) {
    return G.make(63, 63, function (P) {
      var c = 31.5, i;
      P.ring(c, c, 24, 31, T.hull);
      P.ring(c, c, 27, 29, T.dark);
      for (i = 0; i < 4; i++) {
        var a = i / 4 * U.TAU + U.PI / 4;
        P.ell(c + Math.cos(a) * 27, c + Math.sin(a) * 27, 4.4, 4.4, T.dark);
        P.ell(c + Math.cos(a) * 27, c + Math.sin(a) * 27, 2.2, 2.2, f ? T.acc : T.glow);
      }
      P.ell(c, c, 14, 14, T.dark);
      P.ell(c, c, 11, 11, T.hull);
      P.ell(c, c, 7, 7, 'black');
      P.ell(c, c, 4.5, 4.5, T.acc);
      P.ell(c, c, 2, 2, f ? W : T.glow);
      P.sr(c - 2, 1, 4, 6, T.acc); P.rect(c - 2, 56, 4, 6, T.acc);
      P.spx(8, 29, T.glow); P.spx(8, 33, T.glow);
    });
  };

  // ===== 大ボス =====
  // 1: 母艦ブルワーク
  B.bulwark = function (T, f) {
    return G.make(97, 61, function (P) {
      var cx = 48.5, i;
      P.sr(0, 12, 14, 40, T.dark); P.sr(2, 14, 10, 36, T.hull);
      for (i = 0; i < 4; i++) P.sr(4, 17 + i * 9, 6, 5, i % 2 ? T.acc : T.dark);
      P.sr(10, 50, 8, 10, T.dark); P.sr(12, 52, 4, 8, T.glow);
      P.sp([[cx, 60], [20, 52], [15, 28], [24, 8], [cx, 3]], T.hull);
      P.rect(18, 20, 61, 24, T.dark);
      P.rect(22, 22, 53, 20, T.hull);
      P.ell(cx, 30, 14, 10, T.dark);
      P.ell(cx, 30, 10, 7, T.hull);
      P.ell(cx, 30, 6, 5, T.acc);
      P.rect(47, 29, 3, 3, f ? W : T.glow);
      P.sr(26, 6, 6, 12, T.dark); P.sr(27, 8, 4, 8, T.acc);
      P.sr(33, 43, 7, 12, T.dark); P.sr(35, 50, 3, 5, T.glow);
      for (i = 0; i < 3; i++) { P.sr(22 + i * 6, 46 - i * 3, 3, 3, f ? T.glow : T.acc); }
      P.rect(46, 4, 5, 10, T.acc); P.rect(47, 6, 3, 4, f ? T.glow : T.dark);
    });
  };
  // 2: 母艦リヴァイアサン
  B.leviathan = function (T, f) {
    return G.make(89, 83, function (P) {
      var cx = 44.5, i;
      P.sp([[cx, 6], [20, 18], [2, 42], [8, 54], [24, 46]], T.dark);
      P.sp([[cx, 2], [30, 12], [22, 40], [26, 64], [cx, 82]], T.hull);
      P.sp([[cx, 12], [32, 22], [28, 40], [31, 58], [cx, 70]], T.dark);
      for (i = 0; i < 5; i++) { P.sr(30 - i, 20 + i * 8, 14 + i * 1, 3, i % 2 ? T.acc : T.hull); }
      P.ell(cx, 60, 11, 13, T.hull);
      P.ell(cx, 56, 7, 7, T.dark);
      P.ell(cx, 56, 4.2, 4.2, T.acc);
      P.rect(43, 55, 3, 2, f ? W : T.glow);
      P.sp([[cx, 82], [32, 74], [28, 62]], T.dark);
      for (i = 0; i < 4; i++) { P.spx(32 + i * 2, 70 - i * 2, 'white'); }
      P.sp([[cx, 0], [38, 6], [cx, 20]], T.acc);
      P.spx(24, 30, T.glow); P.spx(25, 44, T.glow); P.spx(36, 14, f ? T.glow : T.dark);
    });
  };
  // 3: 母艦アーセナル
  B.arsenal = function (T, f) {
    return G.make(101, 65, function (P) {
      var cx = 50.5, i;
      P.rect(10, 18, 81, 30, T.dark);
      P.rect(12, 20, 77, 26, T.hull);
      P.sp([[cx, 64], [24, 52], [16, 34], [24, 12], [cx, 4]], T.hull);
      P.rect(30, 24, 41, 18, T.dark);
      for (i = 0; i < 4; i++) { P.sr(2 + i * 6, 26 - i * 2, 4, 30 + i * 2, i % 2 ? T.hull : T.dark); }
      for (i = 0; i < 3; i++) { P.sr(6 + i * 9, 50 + i * 2, 5, 10, T.dark); P.sr(7 + i * 9, 54 + i * 2, 3, 6, T.glow); }
      P.ell(cx, 33, 11, 9, T.dark);
      P.ell(cx, 33, 7, 6, T.hull);
      P.ell(cx, 33, 3.6, 3.2, T.acc);
      P.rect(49, 32, 3, 2, f ? W : T.glow);
      P.sr(27, 8, 8, 10, T.dark); P.sr(28, 6, 6, 5, T.acc);
      for (i = 0; i < 3; i++) { P.sr(30 + i * 5, 44, 3, 8, i === 1 ? T.dark : T.acc); }
      P.rect(48, 0, 5, 12, T.acc); P.rect(49, 2, 3, 5, f ? T.glow : T.dark);
    });
  };
  // 4: 母艦ソーラーイーター
  B.solareater = function (T, f) {
    return G.make(97, 85, function (P) {
      var cx = 48.5, cy = 46, i;
      for (i = 0; i < 6; i++) {
        var a = -U.PI / 2 + (i - 2.5) * 0.62;
        var x2 = cx + Math.cos(a) * 44, y2 = cy + Math.sin(a) * 40;
        P.line(cx + Math.cos(a) * 20, cy + Math.sin(a) * 18, x2, y2, T.dark);
        P.ell(x2, y2, 6, 5, i % 2 ? T.acc : T.hull); P.ell(x2, y2, 3, 2.4, f ? T.glow : T.dark);
      }
      P.ell(cx, cy, 31, 31, T.hull);
      P.ring(cx, cy, 25, 29, T.dark);
      P.ell(cx, cy, 24, 24, T.dark);
      P.ell(cx, cy, 20, 20, 'red');
      P.ell(cx, cy, 16, 16, 'orange');
      P.ell(cx, cy, 11, 11, 'yellow');
      P.ell(cx, cy, 6, 6, W);
      for (i = 0; i < 10; i++) {
        var b = i / 10 * U.TAU + (f ? 0.15 : 0);
        P.poly([[cx + Math.cos(b - 0.12) * 26, cy + Math.sin(b - 0.12) * 26], [cx + Math.cos(b) * 20, cy + Math.sin(b) * 20], [cx + Math.cos(b + 0.12) * 26, cy + Math.sin(b + 0.12) * 26]], T.hull);
      }
      P.sr(cx - 6, 74, 4, 10, T.acc);
    });
  };
  // 5: マザー機ORIGIN (最終)
  B.origin = function (T, f) {
    return G.make(121, 105, function (P) {
      var cx = 60.5, cy = 52, i;
      for (i = 0; i < 12; i++) {
        var a = i / 12 * U.TAU - U.PI / 2;
        var l = i % 3 === 0 ? 50 : 40;
        P.poly([[cx + Math.cos(a - 0.1) * 22, cy + Math.sin(a - 0.1) * 22], [cx + Math.cos(a) * l, cy + Math.sin(a) * l * 0.95], [cx + Math.cos(a + 0.1) * 22, cy + Math.sin(a + 0.1) * 22]], i % 2 ? T.dark : T.hull);
      }
      P.ell(cx, cy, 30, 30, T.dark);
      P.ring(cx, cy, 26, 30, T.hull);
      P.ring(cx, cy, 21, 24, T.acc);
      P.ell(cx, cy, 20, 20, 'black');
      P.ell(cx, cy, 16, 16, T.dark);
      P.ell(cx, cy, 12, 12, 'red');
      P.ell(cx, cy, 8, 8, 'orange');
      P.ell(cx, cy, 5, 5, f ? W : 'yellow');
      P.ell(cx, cy, 2, 2, W);
      for (i = 0; i < 8; i++) {
        var b = i / 8 * U.TAU + (f ? U.PI / 8 : 0);
        P.ell(cx + Math.cos(b) * 23, cy + Math.sin(b) * 23, 2, 2, f ? T.glow : T.acc);
      }
      P.sr(cx - 12, 90, 5, 14, T.dark); P.sr(cx - 11, 94, 3, 10, T.glow);
      P.rect(58, 96, 5, 8, T.acc);
    });
  };

  var cache = {};
  EB.BossArt = {
    keys: ['picket', 'deepwalker', 'mirrorray', 'flarecore', 'gatekeeper', 'bulwark', 'leviathan', 'arsenal', 'solareater', 'origin'],
    get: function (key, stage) {
      var k = key + stage;
      if (!cache[k]) {
        var T = TONES[stage % TONES.length];
        cache[k] = [B[key](T, 0), B[key](T, 1)];
      }
      return cache[k];
    }
  };
})();
