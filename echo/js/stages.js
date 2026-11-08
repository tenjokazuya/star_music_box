/* stages.js ― ステージ進行スクリプト（時間軸イベント）
 * t はステージ内クロック(フレーム)。会話・ボス戦中はクロックが止まる。 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var U = EB.U, FW = EB.CFG.FW;

  function Builder() {
    var ev = [], seq = 0;
    var S = {
      ev: ev,
      at: function (t, fn) { ev.push({ t: t, type: 'fn', fn: fn, n: seq++ }); return S; },
      // 敵を出す。x はプレイ空間座標、y 省略で画面上端の外
      e: function (t, kind, x, p, y) {
        return S.at(t, function () { EB.Enemies.spawn(kind, x, y === undefined ? -14 : y, p); });
      },
      // n体を dt フレーム間隔で。xf:関数(i)または数値 / p:オブジェクトまたは関数(i)
      stream: function (t, kind, n, dt, xf, p) {
        for (var i = 0; i < n; i++) {
          (function (i) {
            var x = typeof xf === 'function' ? xf(i) : xf, pp = typeof p === 'function' ? p(i) : p;
            S.e(t + i * dt, kind, x, pp);
          })(i);
        }
        return S;
      },
      // 左右から同時
      both: function (t, kind, n, dt, p) {
        S.stream(t, kind, n, dt, -10, U.mixObj ? p : Object.assign({ dir: 1 }, p || {}));
        S.stream(t, kind, n, dt, FW + 10, Object.assign({ dir: -1 }, p || {}));
        return S;
      },
      // 横一列（等間隔）
      line: function (t, kind, n, x0, x1, p) {
        for (var i = 0; i < n; i++) S.e(t, kind, n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1), typeof p === 'function' ? p(i) : p);
        return S;
      },
      // V字
      vform: function (t, kind, cx, p) {
        var o = [[0, 0], [-22, -14], [22, -14], [-44, -28], [44, -28]];
        for (var i = 0; i < o.length; i++) S.e(t, kind, cx + o[i][0], p, o[i][1] - 6);
        return S;
      },
      dialog: function (t, id) { ev.push({ t: t, type: 'dialog', id: id, n: seq++ }); return S; },
      boss: function (t, id) { ev.push({ t: t, type: 'boss', id: id, n: seq++ }); return S; },
      waitClear: function (t) { ev.push({ t: t, type: 'wait', n: seq++ }); return S; },
      end: function (t) { ev.push({ t: t, type: 'end', n: seq++ }); return S; },
      done: function () { ev.sort(function (a, b) { return a.t - b.t || a.n - b.n; }); return ev; }
    };
    return S;
  }

  function xs(a, b, n) { return function (i) { return a + (b - a) * (n <= 1 ? 0.5 : i / (n - 1)); }; }
  function rx(a, b) { return function () { return U.rng.range(a, b); }; }

  var Stages = [];

  // ================= STAGE 1 =================
  Stages[0] = {
    name: '第一の信号', place: 'ケフェウス採掘コロニー', bgm: 'st1', amb: 'space',
    build: function (S) {
      S.dialog(40, 'st1_intro');
      S.stream(150, 'scout', 5, 22, xs(30, 162, 5));
      S.stream(330, 'scout', 5, 22, xs(162, 30, 5));
      S.stream(520, 'drone', 6, 26, 96, { amp: 50 });
      S.both(780, 'wing', 3, 30);
      S.e(1000, 'turret', 40, { carry: 'p' }); S.e(1000, 'turret', 152);
      S.stream(1060, 'scout', 6, 18, xs(20, 172, 6));
      S.e(1300, 'gunship', 96);
      S.stream(1500, 'diver', 4, 30, xs(30, 162, 4));
      S.stream(1760, 'mine', 3, 60, xs(40, 152, 3));
      S.stream(1900, 'drone', 5, 24, 60, { amp: 40, ph: 1 });
      S.e(2200, 'spinner', 50, { dir: 1 }); S.e(2260, 'spinner', 142, { dir: -1 });
      S.vform(2500, 'scout', 96);
      S.e(2700, 'carrier', 96, { hold: 380 });
      S.both(2900, 'wing', 3, 40);
      S.stream(3300, 'scout', 8, 14, xs(14, 178, 8), { vy: 1.8 });
      S.waitClear(3700);
      S.dialog(3720, 'st1_mid');
      S.boss(3760, 'picket');
      // ---- 後半 ----
      S.stream(3900, 'scout', 8, 14, xs(178, 14, 8), { vy: 1.8 });
      S.e(4100, 'gunship', 50); S.e(4150, 'gunship', 142);
      S.stream(4400, 'diver', 6, 22, xs(20, 172, 6));
      S.e(4600, 'turret', 30); S.e(4600, 'turret', 162); S.e(4700, 'turret', 96, { carry: 'b' });
      S.both(4800, 'wing', 4, 26);
      S.stream(5100, 'mine', 4, 40, xs(30, 162, 4));
      S.e(5300, 'carrier', 96, { hold: 340 });
      S.stream(5500, 'drone', 6, 22, 96, { amp: 56 });
      S.e(5800, 'spinner', 60, { dir: 1 }); S.e(5800, 'spinner', 132, { dir: -1 });
      S.vform(6100, 'wing', 96, { dir: 1 });
      S.waitClear(6700);
      S.dialog(6720, 'st1_boss');
      S.boss(6760, 'bulwark');
      S.dialog(6800, 'st1_end');
      S.end(6840);
    }
  };

  // ================= STAGE 2 =================
  Stages[1] = {
    name: '第二の信号', place: '海洋惑星リュミエ', bgm: 'st2', amb: 'wind',
    build: function (S) {
      S.dialog(40, 'st2_intro');
      S.stream(150, 'drone', 6, 22, 60, { amp: 44 });
      S.stream(330, 'scout', 6, 18, xs(20, 172, 6), { vy: 1.5 });
      S.line(560, 'sub', 3, 40, 152, {}, 20);
      S.both(760, 'wing', 3, 32);
      S.stream(980, 'sub', 4, 30, function (i) { return 30 + i * 44; });
      S.e(1200, 'turret', 40); S.e(1200, 'turret', 152, { carry: 'p' });
      S.e(1350, 'gunship', 96);
      S.stream(1650, 'diver', 5, 26, xs(24, 168, 5));
      S.stream(1900, 'mine', 4, 45, xs(30, 162, 4));
      S.stream(2050, 'drone', 6, 22, 130, { amp: 44, ph: 2 });
      S.e(2350, 'spinner', 96, { dir: 1 });
      S.line(2500, 'sub', 5, 20, 172, {});
      S.e(2800, 'carrier', 96, { hold: 380 });
      S.both(3000, 'wing', 4, 30);
      S.stream(3400, 'scout', 8, 14, xs(14, 178, 8), { vy: 1.8 });
      S.waitClear(3800);
      S.dialog(3820, 'st2_mid');
      S.boss(3860, 'deepwalker');
      S.stream(4000, 'sub', 5, 26, xs(20, 172, 5));
      S.e(4250, 'gunship', 50); S.e(4300, 'gunship', 142);
      S.stream(4600, 'diver', 6, 20, xs(172, 20, 6));
      S.stream(4850, 'drone', 7, 20, 96, { amp: 60 });
      S.e(5000, 'turret', 30, { carry: 'b' }); S.e(5000, 'turret', 162);
      S.line(5250, 'sub', 4, 30, 162, {});
      S.both(5500, 'wing', 4, 24);
      S.e(5800, 'carrier', 96, { hold: 340 });
      S.stream(6000, 'mine', 5, 36, xs(24, 168, 5));
      S.vform(6300, 'sub', 96);
      S.waitClear(6900);
      S.dialog(6920, 'st2_boss');
      S.boss(6960, 'leviathan');
      S.dialog(7000, 'st2_end');
      S.end(7040);
    }
  };

  // ================= STAGE 3 =================
  Stages[2] = {
    name: '第三の信号', place: '小惑星帯・研究基地アステリア', bgm: 'st3', amb: 'machine',
    build: function (S) {
      S.at(1200, function () { EB.W.bg.base = true; });
      S.dialog(40, 'st3_intro');
      S.stream(150, 'scout', 6, 18, xs(20, 172, 6), { vy: 1.6 });
      S.stream(340, 'drone', 6, 24, 96, { amp: 56 });
      S.e(560, 'turret', 40); S.e(560, 'turret', 152);
      S.e(700, 'beamer', 96, { carry: 'p' });
      S.both(900, 'wing', 3, 30);
      S.stream(1150, 'diver', 5, 24, xs(24, 168, 5));
      S.e(1400, 'gunship', 96);
      S.e(1550, 'beamer', 40); S.e(1550, 'beamer', 152);
      S.stream(1850, 'mine', 4, 40, xs(30, 162, 4));
      S.e(2100, 'spinner', 50, { dir: 1 }); S.e(2150, 'spinner', 142, { dir: -1 });
      S.vform(2400, 'scout', 96, { vy: 1.5 });
      S.e(2700, 'carrier', 96, { hold: 380 });
      S.both(2900, 'wing', 4, 28);
      S.e(3200, 'beamer', 96);
      S.stream(3350, 'scout', 8, 14, xs(178, 14, 8), { vy: 1.8 });
      S.waitClear(3800);
      S.dialog(3820, 'st3_mid');
      S.boss(3860, 'mirrorray');
      S.e(4000, 'beamer', 50); S.e(4000, 'beamer', 142);
      S.stream(4300, 'diver', 6, 20, xs(20, 172, 6));
      S.e(4500, 'turret', 30); S.e(4500, 'turret', 162, { carry: 'b' });
      S.e(4650, 'gunship', 60); S.e(4700, 'gunship', 132);
      S.both(5000, 'wing', 4, 24);
      S.stream(5250, 'drone', 7, 20, 96, { amp: 60 });
      S.e(5500, 'carrier', 96, { hold: 340 });
      S.e(5650, 'beamer', 96);
      S.stream(5900, 'mine', 5, 34, xs(24, 168, 5));
      S.e(6200, 'spinner', 60, { dir: 1 }); S.e(6200, 'spinner', 132, { dir: -1 });
      S.waitClear(6800);
      S.dialog(6820, 'st3_boss');
      S.boss(6860, 'arsenal');
      S.dialog(6900, 'st3_end');
      S.end(6940);
    }
  };

  // ================= STAGE 4 =================
  Stages[3] = {
    name: '第四の信号', place: '恒星環状都市ソレイユ', bgm: 'st4', amb: 'solar',
    build: function (S) {
      S.dialog(40, 'st4_intro');
      S.stream(150, 'flare', 6, 20, 96, { amp: 56 });
      S.stream(330, 'scout', 6, 16, xs(20, 172, 6), { vy: 1.7 });
      S.both(520, 'wing', 4, 26);
      S.stream(760, 'flare', 6, 20, 60, { amp: 40, ph: 1 }); S.stream(760, 'flare', 6, 20, 132, { amp: 40, ph: 4 });
      S.e(1050, 'gunship', 96, { carry: 'p' });
      S.stream(1250, 'diver', 5, 24, xs(24, 168, 5));
      S.e(1500, 'turret', 40); S.e(1500, 'turret', 152);
      S.stream(1700, 'mine', 4, 36, xs(30, 162, 4));
      S.stream(1950, 'flare', 8, 16, 96, { amp: 70, freq: 0.09 });
      S.e(2250, 'spinner', 50, { dir: 1 }); S.e(2300, 'spinner', 142, { dir: -1 });
      S.e(2600, 'carrier', 96, { hold: 360 });
      S.both(2800, 'wing', 4, 24);
      S.stream(3200, 'scout', 9, 12, xs(14, 178, 9), { vy: 2 });
      S.waitClear(3700);
      S.dialog(3720, 'st4_mid');
      S.boss(3760, 'flarecore');
      S.stream(3900, 'flare', 8, 16, 96, { amp: 60 });
      S.e(4150, 'gunship', 50); S.e(4200, 'gunship', 142);
      S.stream(4450, 'diver', 7, 18, xs(172, 20, 7));
      S.vform(4750, 'wing', 96, { dir: 1 });
      S.e(5000, 'turret', 30); S.e(5000, 'turret', 162, { carry: 'b' });
      S.stream(5150, 'flare', 6, 18, 60, { amp: 40, ph: 0 }); S.stream(5150, 'flare', 6, 18, 132, { amp: 40, ph: 3 });
      S.e(5500, 'carrier', 96, { hold: 340 });
      S.both(5700, 'wing', 4, 22);
      S.stream(6000, 'mine', 5, 30, xs(24, 168, 5));
      S.e(6200, 'spinner', 60, { dir: 1 }); S.e(6200, 'spinner', 132, { dir: -1 });
      S.waitClear(6800);
      S.dialog(6820, 'st4_boss');
      S.boss(6860, 'solareater');
      S.dialog(6900, 'st4_end');
      S.end(6940);
    }
  };

  // ================= STAGE 5 =================
  Stages[4] = {
    name: '最後の信号', place: '深宇宙・マザー艦隊航路', bgm: 'st5', amb: 'warp',
    build: function (S) {
      function wp(n, life) { return function () { return { life: life || 150 }; }; }
      S.dialog(40, 'st5_intro');
      S.stream(150, 'scout', 8, 12, xs(14, 178, 8), { vy: 1.9 });
      for (var i = 0; i < 6; i++) S.e(380 + i * 34, 'warper', 30 + (i * 53) % 130, {}, 40 + (i * 37) % 60);
      S.both(700, 'wing', 4, 22);
      S.e(950, 'beamer', 96, { carry: 'p' });
      S.stream(1100, 'diver', 6, 20, xs(20, 172, 6));
      for (i = 0; i < 6; i++) S.e(1400 + i * 30, 'warper', 20 + (i * 71) % 150, {}, 36 + (i * 41) % 70);
      S.e(1700, 'gunship', 50); S.e(1750, 'gunship', 142);
      S.stream(2000, 'drone', 8, 18, 96, { amp: 64 });
      S.e(2300, 'spinner', 50, { dir: 1 }); S.e(2300, 'spinner', 142, { dir: -1 });
      S.e(2600, 'carrier', 96, { hold: 360 });
      for (i = 0; i < 8; i++) S.e(2800 + i * 24, 'warper', 20 + (i * 67) % 150, {}, 30 + (i * 43) % 80);
      S.both(3200, 'wing', 5, 20);
      S.waitClear(3700);
      S.dialog(3720, 'st5_mid');
      S.boss(3760, 'gatekeeper');
      S.stream(3900, 'scout', 9, 12, xs(178, 14, 9), { vy: 2 });
      for (i = 0; i < 8; i++) S.e(4100 + i * 26, 'warper', 20 + (i * 59) % 150, {}, 36 + (i * 47) % 70);
      S.e(4400, 'beamer', 40); S.e(4400, 'beamer', 152);
      S.stream(4700, 'diver', 8, 16, xs(20, 172, 8));
      S.e(5000, 'gunship', 60, { carry: 'b' }); S.e(5050, 'gunship', 132);
      S.both(5300, 'wing', 5, 20);
      S.e(5600, 'carrier', 96, { hold: 340 }); S.e(5800, 'carrier', 50, { hold: 300 });
      for (i = 0; i < 10; i++) S.e(6000 + i * 22, 'warper', 16 + (i * 61) % 160, {}, 30 + (i * 53) % 80);
      S.e(6300, 'spinner', 60, { dir: 1 }); S.e(6300, 'spinner', 132, { dir: -1 });
      S.waitClear(6900);
      S.dialog(6920, 'st5_boss');
      S.boss(6960, 'origin');
      S.dialog(7000, 'st5_end');
      S.end(7040);
    }
  };

  // ビルド結果をキャッシュ
  EB.Stages = Stages;
  EB.StageBuild = function (idx) {
    var S = Builder();
    Stages[idx].build(S);
    return S.done();
  };
})();
