/* sprites.js ― ドット絵定義：自機・弾・アイテム・爆発・ザコ敵
 * すべてプリミティブ描画→自動輪郭/陰影で生成（外部画像なし） */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var G = EB.Gfx, U = EB.U;

  // ステージごとの配色（機械生命体）
  var TONES = [
    { hull: 'steel',  dark: 'iron',   acc: 'red',    glow: '#ff5050' },
    { hull: 'teal',   dark: 'navy',   acc: 'white',  glow: '#60fff0' },
    { hull: 'violet', dark: 'black',  acc: 'yellow', glow: '#ffe860' },
    { hull: 'rust',   dark: 'black',  acc: 'orange', glow: '#ff9030' },
    { hull: 'black',  dark: 'navy',   acc: 'pink',   glow: '#ff50d0' }
  ];

  var Spr = { TONES: TONES, cache: {} };

  // ---------- 自機 ----------
  function shipFrame(bank) {
    var lt = bank < 0 ? 2.5 : 0, rt = bank > 0 ? 2.5 : 0;
    return G.make(17, 23, function (P) {
      P.poly([[7, 9], [1 + lt, 15], [0.5 + lt, 19], [2 + lt, 20.5], [7, 18]], 'blue');
      P.poly([[10, 9], [16 - rt, 15], [16.5 - rt, 19], [15 - rt, 20.5], [10, 18]], 'blue');
      P.px(2 + lt, 18, '#ff6060'); P.px(14 - rt, 18, '#ff6060');
      P.sr(4, 15, 2, 6, 'steel');
      P.poly([[8.5, 0], [11, 7], [11.6, 15], [10.6, 19], [8.5, 22], [6.4, 19], [5.4, 15], [6, 7]], 'white');
      P.sr(6, 11, 1, 6, 'steel');
      P.ell(8.5, 8.4, 1.5, 3.2, 'glass');
      P.rect(8, 1, 1, 3, 'red');
      P.px(8, 19, 'blue'); P.px(8, 20, 'blue');
    });
  }
  Spr.player = [shipFrame(-1), shipFrame(0), shipFrame(1)];
  // 排気炎 (2フレーム)
  Spr.flame = [0, 1, 2].map(function (i) {
    return G.make(7, 9, function (P) {
      var h = 4 + i;
      P.poly([[3.5, 0], [6, 2], [3.5, h + 2], [1, 2]], 'orange');
      P.poly([[3.5, 0], [5, 2], [3.5, h], [2, 2]], 'yellow');
      P.px(3, 1, '#ffffff');
    }, { outline: false, bevel: false });
  });
  Spr.option = [0, 1].map(function (i) {
    return G.make(9, 9, function (P) {
      P.ell(4.5, 4.5, 3.6, 3.6, 'cyan');
      P.ell(4.5, 4.5, 1.6, 1.6, 'white');
      P.px(i ? 1 : 7, 4, '#ffffff'); P.px(i ? 7 : 1, 4, '#80e0ff');
    });
  });
  Spr.lifeIcon = G.make(9, 9, function (P) {
    P.poly([[4.5, 0], [6.5, 4], [7, 8], [4.5, 7], [2, 8], [2.5, 4]], 'white');
    P.sr(0, 4, 2, 4, 'blue'); P.rect(4, 3, 1, 2, 'red');
  }, { outline: '#101830' });
  Spr.bombIcon = G.make(9, 9, function (P) {
    P.ell(4.5, 4.5, 3.4, 3.4, 'cyan'); P.ell(4.5, 4.5, 1.6, 1.6, 'white'); P.ring(4.5, 4.5, 3.4, 4.2, 'blue');
  }, { outline: '#101830' });

  // ---------- 自機の弾 ----------
  Spr.pshotBase = G.make(3, 9, function (P) {
    P.rect(0, 2, 3, 5, 'cyan'); P.rect(1, 0, 1, 9, 'white');
  }, { outline: '#1a3a8a', bevel: false });
  Spr.pshotRot = G.rotated(Spr.pshotBase, 32, 15);     // 0=上向き, 時計回り
  Spr.pshotOpt = G.make(3, 5, function (P) { P.rect(0, 1, 3, 3, 'green'); P.rect(1, 0, 1, 5, 'lime'); }, { outline: '#0e4a1a', bevel: false });
  Spr.pshotOptRot = G.rotated(Spr.pshotOpt, 32, 11);
  Spr.missile = G.make(5, 9, function (P) {
    P.poly([[2.5, 0], [4.5, 3], [4.5, 8], [0.5, 8], [0.5, 3]], 'orange');
    P.rect(2, 1, 1, 3, 'yellow'); P.px(2, 8, '#ffffff');
  }, { outline: '#5a1a08' });
  Spr.missileRot = G.rotated(Spr.missile, 32, 15);

  // ---------- 敵弾 ----------
  var BCOL = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'white'];
  var BCOL_IDX = {}; BCOL.forEach(function (c, i) { BCOL_IDX[c] = i; });
  function orb(size, core, color) {
    var c = size / 2;
    return G.make(size, size, function (P) {
      P.ell(c, c, c - 0.2, c - 0.2, color);
      P.ell(c, c, core, core, '#ffffff');
    }, { outline: U.rgb.apply(null, G.RAMP[color][3]), bevel: size > 7 });
  }
  var BKIND = {
    sm: { r: 2.0, make: function (c) { return [orb(7, 1.5, c)]; } },
    md: { r: 3.0, make: function (c) { return [orb(9, 2.4, c)]; } },
    lg: { r: 6.0, make: function (c) { return [orb(15, 5, c)]; } },
    xl: { r: 10.0, make: function (c) { return [orb(23, 8, c)]; } },
    ndl: {
      r: 2.0, rot: 24, make: function (c) {
        var base = G.make(10, 3, function (P) { P.rect(0, 0, 8, 3, c); P.poly([[8, 0], [10, 1.5], [8, 3]], c); P.rect(2, 1, 6, 1, '#ffffff'); }, { outline: U.rgb.apply(null, G.RAMP[c][3]), bevel: false });
        return G.rotated(base, 24, 15);
      }
    },
    rice: {
      r: 2.0, rot: 24, make: function (c) {
        var base = G.make(7, 4, function (P) { P.ell(3.5, 2, 3.4, 1.9, c); P.rect(2, 1, 3, 2, '#ffffff'); }, { outline: U.rgb.apply(null, G.RAMP[c][3]), bevel: false });
        return G.rotated(base, 24, 13);
      }
    },
    dia: {
      r: 3.0, make: function (c) {
        return [G.make(9, 9, function (P) { P.poly([[4.5, 0], [9, 4.5], [4.5, 9], [0, 4.5]], c); P.poly([[4.5, 2.5], [6.5, 4.5], [4.5, 6.5], [2.5, 4.5]], '#ffffff'); }, { outline: U.rgb.apply(null, G.RAMP[c][3]), bevel: false })];
      }
    },
    star: {
      r: 3.5, make: function (c) {
        return [0, 1].map(function (f) {
          return G.make(11, 11, function (P) {
            if (!f) { P.poly([[5.5, 0], [7, 4], [11, 5.5], [7, 7], [5.5, 11], [4, 7], [0, 5.5], [4, 4]], c); }
            else { P.poly([[5.5, 1], [8.5, 2.5], [10, 5.5], [8.5, 8.5], [5.5, 10], [2.5, 8.5], [1, 5.5], [2.5, 2.5]], c); }
            P.ell(5.5, 5.5, 1.6, 1.6, '#ffffff');
          }, { outline: U.rgb.apply(null, G.RAMP[c][3]), bevel: false });
        });
      }
    }
  };
  // 敵弾スプライトの取得（遅延生成）。戻り値 {fr:[frames], r, rot}
  Spr.bullet = function (kind, color) {
    var key = 'b_' + kind + '_' + color;
    var s = Spr.cache[key];
    if (!s) {
      var k = BKIND[kind];
      if (!k) throw new Error('bullet kind ' + kind);
      s = Spr.cache[key] = { fr: k.make(color), r: k.r, rot: k.rot || 0 };
    }
    return s;
  };
  Spr.BCOL = BCOL; Spr.BKIND = BKIND;

  // ---------- アイテム ----------
  var GL = {
    P: ['XXX', 'X.X', 'XXX', 'X..', 'X..'], B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
    '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'], U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'], 'F': ['XXX', 'X..', 'XX.', 'X..', 'X..']
  };
  function glyph(P, ch, x, y, color) {
    var g = GL[ch];
    for (var j = 0; j < 5; j++) for (var i = 0; i < 3; i++) if (g[j].charAt(i) === 'X') P.px(x + i, y + j, color);
  }
  Spr.items = {
    p: G.make(9, 9, function (P) { P.rect(0, 0, 9, 9, 'red'); glyph(P, 'P', 3, 2, '#ffffff'); }),
    pl: G.make(13, 13, function (P) { P.rect(0, 0, 13, 13, 'orange'); P.rect(1, 1, 11, 11, 'yellow'); glyph(P, 'P', 5, 4, '#a01830'); }),
    b: G.make(11, 11, function (P) { P.rect(0, 0, 11, 11, 'blue'); P.rect(1, 1, 9, 9, 'cyan'); glyph(P, 'B', 4, 3, '#1a2c74'); }),
    up: G.make(15, 11, function (P) { P.rect(0, 0, 15, 11, 'green'); P.rect(1, 1, 13, 9, 'lime'); glyph(P, '1', 2, 3, '#14502c'); glyph(P, 'U', 6, 3, '#14502c'); glyph(P, 'P', 10, 3, '#14502c'); }),
    gem: G.make(7, 9, function (P) { P.poly([[3.5, 0], [7, 4.5], [3.5, 9], [0, 4.5]], 'cyan'); P.px(3, 3, '#ffffff'); P.px(3, 4, '#ffffff'); }),
    gemBig: G.make(11, 13, function (P) { P.poly([[5.5, 0], [11, 6.5], [5.5, 13], [0, 6.5]], 'yellow'); P.rect(4, 4, 3, 5, '#ffffff'); }),
    star: G.make(7, 7, function (P) { P.poly([[3.5, 0], [4.5, 2.5], [7, 3.5], [4.5, 4.5], [3.5, 7], [2.5, 4.5], [0, 3.5], [2.5, 2.5]], 'gold'); })
  };

  // ---------- 爆発 ----------
  function explosion(S, nf) {
    var out = [];
    for (var f = 0; f < nf; f++) {
      (function (f) {
        var rng = U.makeRng(S * 100 + f);
        out.push(G.make(S, S, function (P) {
          var t = f / (nf - 1), c = S / 2, rr = c * (0.28 + 0.72 * (1 - Math.pow(1 - t, 2)));
          if (t < 0.85) {
            P.ell(c, c, rr, rr, t < 0.5 ? 'red' : 'rust');
            P.ell(c, c, rr * 0.82, rr * 0.82, 'orange');
            P.ell(c, c, rr * 0.58 * (1 - t * 0.5), rr * 0.58 * (1 - t * 0.5), 'yellow');
            if (t < 0.6) P.ell(c, c, rr * 0.34 * (1 - t), rr * 0.34 * (1 - t), 'white');
          } else {
            P.ring(c, c, rr * 0.7, rr * 0.85, 'rust');
          }
          var n = Math.floor(S / 3);
          for (var i = 0; i < n; i++) {
            var a = rng.range(0, U.TAU), d = rr * rng.range(0.7, 1.25) * (0.7 + t * 0.4);
            P.px(c + Math.cos(a) * d, c + Math.sin(a) * d, t < 0.5 ? 'yellow' : 'orange');
          }
        }, { outline: false, bevel: false }));
      })(f);
    }
    return out;
  }
  Spr.expl = [explosion(17, 8), explosion(33, 10), explosion(57, 12)];

  // ---------- ザコ敵 ----------
  var EN = {};
  EN.scout = function (T, f) {
    return G.make(15, 15, function (P) {
      P.sp([[4, 5], [0, 2], [0.5, 9], [4, 11]], T.dark);
      P.ell(7.5, 7.5, 4, 5.5, T.hull);
      P.ell(7.5, 9, 1.8, 1.8, T.acc);
      P.px(7, 9, f ? '#ffffff' : T.glow);
      P.rect(7, 2, 1, 2, T.dark);
    });
  };
  EN.drone = function (T, f) {
    return G.make(13, 13, function (P) {
      P.sr(0, 4, 2, 5, T.dark);
      P.ell(6.5, 6.5, 5, 5, T.hull);
      P.ring(6.5, 6.5, 1.6, 3.2, T.dark);
      P.px(6, 6, f ? '#ffffff' : T.glow); P.px(6, 7, T.glow);
      P.spx(1, 3, T.acc); P.spx(1, 9, T.acc);
    });
  };
  EN.wing = function (T, f) {
    return G.make(21, 15, function (P) {
      P.sp([[10.5, 14], [0, 6], [0, 1.5], [5.5, 5], [10.5, 2]], T.hull);
      P.sr(1, 2, 2, 5, T.dark);
      P.ell(10.5, 7, 2.2, 4.8, T.dark);
      P.ell(10.5, 6, 1.3, 2, T.acc);
      P.px(10, 6, f ? '#ffffff' : T.glow);
      P.spx(2, 3, T.glow);
    });
  };
  EN.gunship = function (T, f) {
    return G.make(29, 25, function (P) {
      P.sr(0, 6, 5, 11, T.dark);
      P.sr(4, 3, 5, 15, T.hull);
      P.poly([[14.5, 24], [4, 17], [4, 5], [14.5, 1], [25, 5], [25, 17]], T.hull);
      P.rect(9, 8, 11, 8, T.dark);
      P.ell(14.5, 11, 3.5, 3, T.acc);
      P.px(14, 11, f ? '#ffffff' : T.glow); P.px(15, 11, f ? '#ffffff' : T.glow);
      P.sr(2, 15, 2, 8, T.dark); P.sr(2, 21, 2, 3, T.glow);
      P.spx(7, 6, T.glow);
    });
  };
  EN.turretBase = function (T) {
    return G.make(19, 19, function (P) {
      P.ell(9.5, 9.5, 9, 9, T.dark);
      P.ring(9.5, 9.5, 5.6, 7.4, T.hull);
      P.ell(9.5, 9.5, 5, 5, T.hull);
      P.ell(9.5, 9.5, 2.4, 2.4, T.dark);
      P.px(9, 9, T.glow);
    });
  };
  EN.turretBarrel = function (T) {
    return G.rotated(G.make(12, 4, function (P) { P.rect(0, 0, 12, 4, T.dark); P.rect(9, 0, 3, 4, T.acc); }), 24, 25);
  };
  EN.spinner = function (T, f) {
    var base = G.make(17, 17, function (P) {
      P.sr(0, 6, 5, 5, T.dark); P.rect(6, 0, 5, 17, T.dark);
      P.rect(0, 6, 17, 5, T.hull);
      P.rect(6, 1, 5, 5, T.hull); P.rect(6, 11, 5, 5, T.hull);
      P.ell(8.5, 8.5, 3.5, 3.5, T.acc); P.px(8, 8, f ? '#ffffff' : T.glow);
    });
    return G.rotated(base, 16, 25);
  };
  EN.diver = function (T, f) {
    return G.make(11, 19, function (P) {
      P.sp([[5.5, 18], [0, 12], [0, 8], [3, 10], [5.5, 4]], T.dark);
      P.poly([[5.5, 18], [9, 8], [5.5, 1], [2, 8]], T.hull);
      P.rect(5, 6, 1, 6, T.acc);
      P.px(5, 13, f ? '#ffffff' : T.glow);
    });
  };
  EN.mine = function (T, f) {
    return G.make(15, 15, function (P) {
      P.spx(7, 0, T.dark); P.px(7, 14, T.dark); P.px(0, 7, T.dark); P.px(14, 7, T.dark);
      P.line(2, 2, 12, 12, T.dark); P.line(12, 2, 2, 12, T.dark);
      P.ell(7.5, 7.5, 4.6, 4.6, T.hull);
      P.ell(7.5, 7.5, 2, 2, f ? T.acc : T.dark);
      P.px(7, 7, f ? '#ffffff' : T.glow);
    });
  };
  EN.carrier = function (T, f) {
    return G.make(49, 27, function (P) {
      P.sp([[24.5, 26], [4, 22], [0, 12], [2, 5], [24.5, 2]], T.hull);
      P.sr(3, 7, 9, 13, T.dark);
      P.rect(15, 5, 19, 17, T.dark);
      P.ell(24.5, 13, 6, 5, T.hull);
      P.ell(24.5, 13, 3, 3, T.acc);
      P.px(24, 13, f ? '#ffffff' : T.glow); P.px(25, 13, f ? '#ffffff' : T.glow);
      P.sr(5, 21, 4, 5, T.dark); P.sr(5, 24, 4, 2, T.glow);
      P.spx(8, 9, T.glow); P.spx(8, 13, T.glow); P.spx(8, 17, T.glow);
      P.sr(14, 3, 3, 2, T.acc);
    });
  };
  // ステージ固有
  EN.sub = function (T, f) {          // 潜行機
    return G.make(21, 25, function (P) {
      P.sp([[10.5, 24], [3, 18], [1, 10], [5, 6], [10.5, 3]], T.hull);
      P.ell(10.5, 8, 3.6, 5.4, T.dark);
      P.ell(10.5, 6.5, 2.2, 2.8, 'glass');
      P.px(10, 6, f ? '#ffffff' : T.glow);
      P.sr(0, 11, 3, 7, T.dark); P.sr(0, 17, 3, 2, T.acc);
      P.rect(10, 0, 1, 4, T.dark);
    });
  };
  EN.beamer = function (T, f) {       // プリズム砲台
    return G.make(17, 23, function (P) {
      P.poly([[8.5, 0], [16, 8], [13, 22], [4, 22], [1, 8]], T.hull);
      P.poly([[8.5, 4], [12.5, 9], [10.5, 18], [6.5, 18], [4.5, 9]], T.dark);
      P.ell(8.5, 11, 2.4, 3.6, f ? T.acc : T.glow);
      P.px(8, 10, '#ffffff');
      P.spx(2, 8, T.acc);
    });
  };
  EN.flare = function (T, f) {        // 火球
    return G.make(15, 15, function (P) {
      var r = 6 + (f ? 0.8 : 0);
      P.ell(7.5, 7.5, r, r, 'red');
      P.ell(7.5, 7.5, r - 1.6, r - 1.6, 'orange');
      P.ell(7.5, 7.5, r - 3.4, r - 3.4, 'yellow');
      P.ell(7.5, 7.5, 1.4, 1.4, 'white');
      P.px(7, f ? 0 : 1, 'orange'); P.px(f ? 2 : 12, 2, 'yellow'); P.px(f ? 13 : 1, 12, 'orange');
    }, { outline: '#4a0a10', bevel: false });
  };
  EN.warper = function (T, f) {       // ワープ兵
    return G.make(19, 19, function (P) {
      P.ring(9.5, 9.5, 6.4, 9, T.hull);
      P.ring(9.5, 9.5, 4, 5.4, T.dark);
      P.ell(9.5, 9.5, 3, 3, T.acc);
      P.px(9, 9, f ? '#ffffff' : T.glow); P.px(10, 9, f ? '#ffffff' : T.glow);
      P.px(9, 0, T.glow); P.px(9, 18, T.glow); P.px(0, 9, T.glow); P.px(18, 9, T.glow);
    });
  };

  // 敵スプライトの取得 → {fr:[f0,f1], barrel?}
  Spr.enemy = function (kind, tone) {
    var key = 'e_' + kind + '_' + tone;
    var s = Spr.cache[key];
    if (s) return s;
    var T = TONES[tone % TONES.length], fn = EN[kind];
    if (!fn) throw new Error('enemy kind ' + kind);
    if (kind === 'spinner') s = { fr: fn(T, 0), rotating: true };
    else if (kind === 'turretBarrel') s = { fr: fn(T) };
    else if (kind === 'turretBase') s = { fr: [fn(T)] };
    else s = { fr: [fn(T, 0), fn(T, 1)] };
    Spr.cache[key] = s;
    return s;
  };
  Spr.turretBarrel = function (tone) { return Spr.enemy('turretBarrel', tone); };

  // 被弾閃光用
  Spr.flash = function (s) { return G.flashOf(s); };

  EB.Spr = Spr;
})();
