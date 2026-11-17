/* sprites.js — 人物と動物のドット絵（実行時に生成）
 *
 * 人物は 16×24。体の形は共通のひな形（3 方向 × 3 コマ）に、色と髪型・小物を重ねて作る。
 * ひな形の記号: H 髪  h 髪の影  S 肌  s 肌の影  E 目  A えりまき  C 服  c 服の影
 *               P ズボン  B くつ  K 帽子  D ひげ  G めがね  W エプロン  N 帽子のつば
 * 向きは down / up / left（right は left を反転）。コマは 0=立ち 1,2=歩き。
 */
(function () {
  'use strict';

  var INK = '#241a2e';

  /* ---- ひな形（上半身は 3 コマ共通、下半身だけ変わる） ---- */
  var UPPER = {
    down: [
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHHhHHHhHH...',
      '...HHHHHHHHHH...',
      '...HHSSSSSSHH...',
      '...HSSSSSSSSH...',
      '...SSESSSSESS...',
      '...SSESSSSESS...',
      '....SSSSsSSS....',
      '.....SSSSSS.....',
      '....AAAAAAAA....',
      '...CCCCCCCCCC...',
      '...CCCCCCCCCC...',
      '...CcCCCCCCcC...',
      '...SSCCccCCSS...',
      '....CCCCCCCC....'
    ],
    up: [
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHHhHHHhHH...',
      '...HHHHHHHHHH...',
      '...HHHHHHHHHH...',
      '...HHHHHHHHHH...',
      '...HHHHhHHHHH...',
      '...HHHHHHHHHH...',
      '....HHHHHHHH....',
      '.....HHHHHH.....',
      '....AAAAAAAA....',
      '...CCCCCCCCCC...',
      '...CCCCCCCCCC...',
      '...CcCCCCCCcC...',
      '...SSCCCCCCSS...',
      '....CCCCCCCC....'
    ],
    left: [
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHHhHHHHHH...',
      '...HHHHHHHHHH...',
      '...HSSHHHHHHH...',
      '...SSSSHHHHHH...',
      '...SESSHHHHHH...',
      '...SSSSHHHHHH...',
      '....SSSHHHHH....',
      '.....SSHHHH.....',
      '....AAAAAAAA....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '...CCCCCCCCCC...',
      '...SSCCCCCCCC...',
      '....CCCCCCCC....'
    ]
  };

  var LEGS = {
    down: [
      ['....PPPPPPPP....', '....PPPPPPPP....', '....PPP..PPP....', '....BBB..BBB....', '................'],
      ['....PPPPPPPP....', '....PPPPPPPP....', '....PPP..BBB....', '....PPP.........', '....BBB.........'],
      ['....PPPPPPPP....', '....PPPPPPPP....', '....BBB..PPP....', '.........PPP....', '.........BBB....']
    ],
    side: [
      ['.....PPPPPP.....', '.....PPPPPP.....', '.....PPPPPP.....', '.....BBBBBB.....', '................'],
      ['....PPPPPPP.....', '...PPPP.PPP.....', '..PPP.....PP....', '..BBB.....BB....', '................'],
      ['.....PPPPPPP....', '.....PPP.PPPP...', '....PP.....PPP..', '....BB.....BBB..', '................']
    ]
  };

  /* ---- 髪型・小物の加工（行の文字列を直接書き換える） ---- */
  function setCh(rows, y, x, ch) {
    if (y < 0 || y >= rows.length) { return; }
    var r = rows[y];
    if (x < 0 || x >= r.length) { return; }
    rows[y] = r.substr(0, x) + ch + r.substr(x + 1);
  }
  function setRange(rows, y, x0, x1, ch) { for (var x = x0; x <= x1; x++) { setCh(rows, y, x, ch); } }

  function styleHair(rows, dir, style) {
    var y;
    if (style === 'long') {
      for (y = 6; y <= 15; y++) {
        if (dir === 'left') { setCh(rows, y, 11, 'H'); setCh(rows, y, 12, 'H'); if (y > 12) { setRange(rows, y, 9, 12, 'H'); } }
        else { setCh(rows, y, 2, 'H'); setCh(rows, y, 13, 'H'); if (y > 12 && dir === 'up') { setRange(rows, y, 3, 12, 'H'); } }
      }
      if (dir === 'down') { for (y = 11; y <= 14; y++) { setCh(rows, y, 2, 'H'); setCh(rows, y, 13, 'H'); } }
    } else if (style === 'pigtails') {
      for (y = 5; y <= 11; y++) {
        if (dir !== 'left') { setCh(rows, y, 1, 'H'); setCh(rows, y, 14, 'H'); setCh(rows, y, 2, 'H'); setCh(rows, y, 13, 'H'); }
        else { setCh(rows, y, 12, 'H'); setCh(rows, y, 13, 'H'); setCh(rows, y, 14, 'H'); }
      }
      if (dir !== 'left') { setCh(rows, 12, 1, 'H'); setCh(rows, 12, 14, 'H'); }
      setCh(rows, 5, 1, 'A'); setCh(rows, 5, 14, 'A');
    } else if (style === 'bald') {
      for (y = 0; y <= 4; y++) {
        for (var x = 4; x <= 11; x++) {
          var c = rows[y].charAt(x);
          if (c === 'H' || c === 'h') { setCh(rows, y, x, dir === 'up' ? 'H' : 'S'); }
        }
      }
      if (dir !== 'up') { for (y = 5; y <= 8; y++) { setCh(rows, y, 3, 'H'); setCh(rows, y, 12, 'H'); } }
      setRange(rows, 0, 5, 10, '.'); setRange(rows, 1, 4, 5, '.'); setRange(rows, 1, 10, 11, '.');
    } else if (style === 'puff') {
      for (y = 2; y <= 7; y++) { setCh(rows, y, 2, 'H'); setCh(rows, y, 13, 'H'); }
      setRange(rows, 0, 4, 11, 'H'); setRange(rows, 1, 3, 12, 'H');
      setCh(rows, 0, 3, 'H'); setCh(rows, 0, 12, 'H');
    }
  }

  function styleCap(rows, dir) {
    // 帽子: 上から 4 行を帽子色にし、つばを出す
    for (var y = 0; y <= 4; y++) {
      for (var x = 0; x < 16; x++) {
        var c = rows[y].charAt(x);
        if (c === 'H' || c === 'h') { setCh(rows, y, x, 'K'); }
      }
    }
    if (dir === 'down') { setRange(rows, 5, 3, 12, 'K'); setRange(rows, 6, 2, 13, 'N'); }
    else if (dir === 'left') { setRange(rows, 5, 1, 12, 'K'); setRange(rows, 6, 1, 5, 'N'); }
    else { setRange(rows, 5, 3, 12, 'K'); }
  }

  function styleExtras(rows, dir, spec) {
    var y;
    if (spec.beard && dir === 'down') {
      setRange(rows, 9, 4, 11, 'D'); setRange(rows, 10, 5, 10, 'D'); setRange(rows, 11, 6, 9, 'D');
    } else if (spec.beard && dir === 'left') {
      setRange(rows, 9, 4, 7, 'D'); setRange(rows, 10, 5, 7, 'D'); setRange(rows, 11, 6, 8, 'D');
    } else if (spec.mustache && dir === 'down') {
      setRange(rows, 9, 5, 10, 'D');
    }
    if (spec.glasses) {
      if (dir === 'down') { setRange(rows, 7, 4, 6, 'G'); setRange(rows, 7, 9, 11, 'G'); setRange(rows, 8, 4, 6, 'G'); setRange(rows, 8, 9, 11, 'G'); setCh(rows, 7, 5, 'E'); setCh(rows, 7, 10, 'E'); setCh(rows, 8, 5, 'E'); setCh(rows, 8, 10, 'E'); setRange(rows, 6, 4, 11, rows[6].charAt(6)); setCh(rows, 7, 7, 'G'); setCh(rows, 7, 8, 'G'); }
      else if (dir === 'left') { setRange(rows, 7, 3, 4, 'G'); setRange(rows, 8, 3, 4, 'G'); setCh(rows, 7, 3, 'E'); }
    }
    if (spec.apron && (dir === 'down')) {
      for (y = 12; y <= 16; y++) { setRange(rows, y, 5, 10, 'W'); }
    } else if (spec.apron && dir === 'left') {
      for (y = 12; y <= 16; y++) { setRange(rows, y, 3, 6, 'W'); }
    }
  }

  /** 人物の絵を作る。戻り値: { down:[c,c,c], up:[...], left:[...], right:[...] } */
  function build(spec) {
    var util = Game.util;
    var dark = function (c, k) { return util.shade(c, k || 0.78); };
    var pal = {
      H: spec.hair, h: dark(spec.hair, 0.8), S: spec.skin, s: dark(spec.skin, 0.88), E: '#2a2030',
      A: spec.scarf || spec.shirt, C: spec.shirt, c: dark(spec.shirt, 0.78),
      P: spec.pants, B: spec.shoes || '#3a2c3c', K: spec.cap || '#c04040', N: dark(spec.cap || '#c04040', 0.75),
      D: spec.beard || spec.mustache || '#e0e0e8', G: '#6a5a50', W: '#f4f0e6'
    };
    if (spec.dress) { pal.P = spec.dress; }
    var out = { down: [], up: [], left: [], right: [] };
    ['down', 'up', 'left'].forEach(function (dir) {
      for (var f = 0; f < 3; f++) {
        var upper = UPPER[dir].slice();
        var legs = (dir === 'left' ? LEGS.side : LEGS.down)[f].slice();
        var rows = upper.concat(legs);
        styleHair(rows, dir, spec.hairStyle || 'short');
        if (spec.cap) { styleCap(rows, dir); }
        styleExtras(rows, dir, spec);
        if (spec.dress) {
          // ワンピース: ズボンの行をスカートに
          for (var yy = 17; yy <= 18; yy++) { rows[yy] = rows[yy].replace(/P/g, 'P'); }
          if (dir !== 'left') { setRange(rows, 17, 3, 12, 'P'); setRange(rows, 18, 3, 12, 'P'); setRange(rows, 19, 3, 12, 'P'); }
          else { setRange(rows, 17, 3, 12, 'P'); setRange(rows, 18, 3, 12, 'P'); }
          if (f === 0 && dir !== 'left') { rows[19] = '...PPPPPPPPPP...'; rows[20] = '....BBB..BBB....'; }
        }
        // 3 コマ目以降は 1 ドット上に（歩きの上下）
        var h = 24, top = f === 0 ? 2 : 1;
        var cv = Game.gfx.make(16, h, function (g) {
          for (var y = 0; y < rows.length; y++) {
            for (var x = 0; x < 16; x++) {
              var ch = rows[y].charAt(x);
              if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, top + y, 1, 1); }
            }
          }
        });
        Game.gfx.outline(cv, INK);
        out[dir].push(cv);
        if (dir === 'left') { out.right.push(Game.gfx.flipH(cv)); }
      }
    });
    return out;
  }

  /* ---- 動物 ---- */
  function catFrames(c) {
    var pal = { K: c.body, W: c.white, N: '#e88aa0', Y: '#e8d84a', k: Game.util.shade(c.body, 0.7) };
    var rows = [
      '................',
      '................',
      '..K..K..........',
      '..KKKK..........',
      '.KKKKKK.........',
      '.KYKKYK.........',
      '.KKNWNK.........',
      '..KWWWK.....K...',
      '..KWWWKKKKKKK...',
      '..KWWWKKKKKKK...',
      '..KWWKKKKKKKK...',
      '...KKKKKKKKKK...',
      '...KKKKKKKKKk...',
      '...WWKKKKKKWW...',
      '................',
      '................'
    ];
    var rows2 = rows.slice();
    rows2[7] = '..KWWWK......K..';
    rows2[8] = '..KWWWKKKKKKKK..';
    var a = Game.gfx.make(16, 16, function (g) {
      rows.forEach(function (r, y) { for (var x = 0; x < 16; x++) { var ch = r.charAt(x); if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } } });
    });
    var b = Game.gfx.make(16, 16, function (g) {
      rows2.forEach(function (r, y) { for (var x = 0; x < 16; x++) { var ch = r.charAt(x); if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } } });
    });
    Game.gfx.outline(a, INK); Game.gfx.outline(b, INK);
    return { left: [a, b, a], right: [Game.gfx.flipH(a), Game.gfx.flipH(b), Game.gfx.flipH(a)] };
  }

  function gullFrames() {
    var pal = { W: '#f6f6fa', G: '#b8bcd0', Y: '#f0b030', K: '#2a2a3a', O: '#e8a030' };
    var stand = [
      '................',
      '................',
      '................',
      '....WWW.........',
      '...WWKWO........',
      '...WWWWWOO......',
      '....WWWWGGGG....',
      '...WWWWWWWGGG...',
      '..WWWWWWWWGG....',
      '...WWWWWWWG.....',
      '....WWWWWG......',
      '.....Y..Y.......',
      '.....Y..Y.......',
      '................',
      '................',
      '................'
    ];
    var fly1 = [
      '................',
      '................',
      '................',
      '................',
      'GG..........GG..',
      '.WGG......GGWW..',
      '..WWGG..GGWW....',
      '...WWWWWWWW.....',
      '....WWWWWWKWO...',
      '.....WWWWWWOO...',
      '......WWWW......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    var fly2 = [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...WWWWWWWW.....',
      '.GWWWWWWWWKWO...',
      'GGWWWWWWWWWOO...',
      '.GGWWWWWWWW.....',
      '..GG.WWWW.GG....',
      '....GG....GG....',
      '................',
      '................',
      '................',
      '................'
    ];
    function mk(rows) { return Game.gfx.make(16, 16, function (g) { rows.forEach(function (r, y) { for (var x = 0; x < 16; x++) { var ch = r.charAt(x); if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } } }); }); }
    var s = mk(stand), a = mk(fly1), b = mk(fly2);
    [s, a, b].forEach(function (c) { Game.gfx.outline(c, INK); });
    return { left: [s, s, s], right: [Game.gfx.flipH(s), Game.gfx.flipH(s), Game.gfx.flipH(s)], fly: [a, b], flyR: [Game.gfx.flipH(a), Game.gfx.flipH(b)] };
  }

  function crabFrames() {
    var pal = { R: '#e8603c', r: '#b8402c', W: '#ffffff', K: '#2a2030' };
    var rows = [
      '................', '................', '................', '................', '................', '................',
      '..RR........RR..', '.R..R......R..R.', '.R.RRRRRRRRRR.R.', '...RRWKRRKWRR...', '..RRRRRRRRRRRR..',
      '...R.R.RR.R.R...', '..R..R....R..R..', '................', '................', '................'
    ];
    var rows2 = rows.slice();
    rows2[6] = '.RR..........RR.';
    rows2[11] = '....R.R..R.R....';
    rows2[12] = '...R..R..R..R...';
    function mk(rs) { return Game.gfx.make(16, 16, function (g) { rs.forEach(function (r, y) { for (var x = 0; x < 16; x++) { var ch = r.charAt(x); if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } } }); }); }
    var a = mk(rows), b = mk(rows2);
    Game.gfx.outline(a, INK); Game.gfx.outline(b, INK);
    return { left: [a, b, a], right: [a, b, a] };
  }

  /* ---- 登場人物の定義 ---- */
  var SPECS = {
    mio:      { hair: '#7a4a2a', skin: '#f8d2aa', shirt: '#3f78d8', pants: '#3a3a68', shoes: '#4a3030', scarf: '#f4c63c', hairStyle: 'short' },
    mother:   { hair: '#8a5a3a', skin: '#f8d2aa', shirt: '#e8dcc0', pants: '#5a8a5a', shoes: '#5a3a30', scarf: '#e8dcc0', hairStyle: 'long', apron: true, dress: '#5a8a5a' },
    grandpa:  { hair: '#eeeef4', skin: '#efc59c', shirt: '#9a6a3c', pants: '#6a5848', shoes: '#4a3a30', scarf: '#9a6a3c', hairStyle: 'bald', beard: '#f0f0f6' },
    coco:     { hair: '#e87a2a', skin: '#f8d2aa', shirt: '#f08aa8', pants: '#f08aa8', shoes: '#a04a58', scarf: '#ffffff', hairStyle: 'pigtails', dress: '#f08aa8' },
    gen:      { hair: '#a8aab8', skin: '#e6b48a', shirt: '#e8b830', pants: '#4a5878', shoes: '#2a3040', scarf: '#e8b830', cap: '#2a3a6a', beard: '#c8cad4', hairStyle: 'short' },
    haru:     { hair: '#f0f0f8', skin: '#f0c8a0', shirt: '#9a7ac8', pants: '#7a5aa8', shoes: '#5a4a60', scarf: '#f4f0e6', hairStyle: 'puff', apron: true, dress: '#7a5aa8' },
    haru_g:   { hair: '#f0f0f8', skin: '#f0c8a0', shirt: '#9a7ac8', pants: '#7a5aa8', shoes: '#5a4a60', scarf: '#f4f0e6', hairStyle: 'puff', apron: true, dress: '#7a5aa8', glasses: true },
    take:     { hair: '#3a2a22', skin: '#e8b890', shirt: '#58b058', pants: '#7a6a48', shoes: '#3a3a3a', scarf: '#58b058', cap: '#d8c040', hairStyle: 'short' },
    father:   { hair: '#2a2a38', skin: '#e4b48c', shirt: '#2a4a7a', pants: '#3a4658', shoes: '#2a2a2a', scarf: '#2a4a7a', hairStyle: 'short', mustache: '#3a3a44' },
    v_man:    { hair: '#5a3a2a', skin: '#f0c49a', shirt: '#a8503c', pants: '#4a4a5a', shoes: '#3a3030', scarf: '#a8503c', hairStyle: 'short' },
    v_woman:  { hair: '#c8603a', skin: '#f8d2aa', shirt: '#4a9a8a', pants: '#4a9a8a', shoes: '#4a3a40', scarf: '#f4f0e6', hairStyle: 'long', dress: '#4a9a8a' },
    v_old:    { hair: '#d8d8e0', skin: '#ecc298', shirt: '#7a8aa8', pants: '#5a5a68', shoes: '#4a4048', scarf: '#7a8aa8', hairStyle: 'puff', dress: '#7a8aa8' },
    v_boy:    { hair: '#b87a3a', skin: '#f0c49a', shirt: '#d85a4a', pants: '#4a5a8a', shoes: '#3a3030', scarf: '#d85a4a', hairStyle: 'short' },
    v_sailor: { hair: '#4a3a30', skin: '#dba67e', shirt: '#f0f0f4', pants: '#2a3a6a', shoes: '#2a2a30', scarf: '#2a3a6a', cap: '#f0f0f4', hairStyle: 'short' }
  };

  var cache = {};
  Game.sprites = {
    specs: SPECS,
    /** 人物・動物の絵を得る。id は SPECS のキー、または 'cat' 'cat2' 'gull' 'crab' */
    get: function (id) {
      if (cache[id]) { return cache[id]; }
      var r;
      if (id === 'cat') { r = catFrames({ body: '#34344a', white: '#f4f0ea' }); }
      else if (id === 'cat2') { r = catFrames({ body: '#e8a850', white: '#fbf2e0' }); }
      else if (id === 'gull') { r = gullFrames(); }
      else if (id === 'crab') { r = crabFrames(); }
      else if (SPECS[id]) { r = build(SPECS[id]); }
      else { throw new Error('スプライトがない: ' + id); }
      cache[id] = r;
      return r;
    },
    INK: INK
  };
})();
