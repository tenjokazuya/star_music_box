/* gfx_tiles.js — タイルセットをコードで生成（16x16 ドット絵） */
(function () {
  'use strict';
  var P = PF.pal = {
    ol: '#1c1424', black: '#0e0a14', white: '#ffffff',
    g1: '#6cc04a', g2: '#50a03a', g3: '#3a7a2c', g4: '#7ed458',
    d1: '#d8b878', d2: '#c0a060', d3: '#9a7a48', d4: '#e8cc90',
    s1: '#c4c4d4', s2: '#9c9cb0', s3: '#6c6c84', s4: '#464660', s5: '#dcdce8',
    w1: '#58a8e8', w2: '#3880d0', w3: '#2860b0', w4: '#b0e0ff',
    wd1: '#c08040', wd2: '#98602c', wd3: '#6c4020', wd4: '#dca464',
    lf1: '#2f8a3a', lf2: '#237030', lf3: '#185828', lf4: '#52b050',
    tk: '#7a4a28', tk2: '#5a3418',
    sn1: '#f6faff', sn2: '#d8e6f6', sn3: '#b4c8e8', sn4: '#8fa4d0',
    ic1: '#c8f0ff', ic2: '#98d8f0', ic3: '#68b8e0', ic4: '#eaffff', ic5: '#3c88b8',
    rr1: '#d84c3c', rr2: '#b03428', rr3: '#7c2018', rr4: '#f07a66',
    rb1: '#4c78d0', rb2: '#3454a8', rb3: '#223a78', rb4: '#78a8f0',
    wl1: '#f4e8cc', wl2: '#dccaa0', wl3: '#b8a078',
    lv1: '#f85820', lv2: '#f8a030', lv3: '#ffe060', lv4: '#c02810',
    as1: '#5a5264', as2: '#443c50', as3: '#74697e', as4: '#2e2838',
    cv1: '#4e485e', cv2: '#3a344c', cv3: '#2a263a', cv4: '#625c78',
    iw1: '#92603a', iw2: '#6e4526', iw3: '#4c2e18', iw4: '#a87848',
    fl1: '#c89a5a', fl2: '#b08240', fl3: '#946a30',
    cp1: '#b83a52', cp2: '#912a42', cp3: '#d85c74',
    f1: '#ff6a1a', f2: '#ffb030', f3: '#ffee80', f4: '#fff8d8',
    sky: '#1c2448'
  };
  var Tl = PF.tiles = { defs: {}, tex: {}, order: [] };

  function Pen(c) { this.c = c; this.x = c.getContext('2d'); this.x.imageSmoothingEnabled = false; }
  Pen.prototype.r = function (x, y, w, h, col) { this.x.fillStyle = col; this.x.fillRect(x, y, w, h); };
  Pen.prototype.p = function (x, y, col) { this.x.fillStyle = col; this.x.fillRect(x, y, 1, 1); };
  Pen.prototype.spk = function (R, col, n, size) {
    for (var i = 0; i < n; i++) this.r((R() * 16) | 0, (R() * 16) | 0, size || 1, 1, col);
  };
  // ASCII → ピクセル
  Pen.prototype.rows = function (rows, pal, ox, oy) {
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
      var ch = rows[y].charAt(x), col = pal[ch];
      if (col) this.p((ox || 0) + x, (oy || 0) + y, col);
    }
  };
  PF.Pen = Pen;

  function def(ch, name, o) {
    o.ch = ch; o.name = name; o.fr = o.fr || 1; o.v = o.v || 1;
    Tl.defs[ch] = o; Tl.order.push(ch);
  }
  // 地面を先に描いてから物体を描くタイプ用
  function onGround(g, f) { return function (p, fr, v, R) { Tl.defs[g].d(p, fr, v, R); f(p, fr, v, R); }; }

  /* ---------- 地面 ---------- */
  function grass(p, fr, v, R) {
    p.r(0, 0, 16, 16, P.g1);
    p.spk(R, P.g2, 14, 2); p.spk(R, P.g4, 8, 1);
    for (var i = 0; i < 3; i++) { var x = 2 + ((R() * 11) | 0), y = 3 + ((R() * 11) | 0); p.p(x, y, P.g3); p.p(x - 1, y - 1, P.g3); p.p(x + 1, y - 1, P.g3); }
  }
  def('.', 'grass', { d: grass, v: 4 });
  def(',', 'dirt', { v: 4, d: function (p, fr, v, R) { p.r(0, 0, 16, 16, P.d1); p.spk(R, P.d2, 16, 2); p.spk(R, P.d4, 6, 1); p.spk(R, P.d3, 5, 1); } });
  def(':', 'cobble', { v: 2, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.s2);
    for (var y = 0; y < 16; y += 8) { var off = (y / 8 % 2) * 4; for (var x = -off; x < 16; x += 8) { p.r(x + 1, y + 1, 7, 7, P.s1); p.r(x + 1, y + 1, 7, 1, P.s5); p.r(x + 1, y + 7, 7, 1, P.s3); } }
    p.spk(R, P.s3, 4, 1);
  } });
  def('s', 'sand', { v: 3, d: function (p, fr, v, R) { p.r(0, 0, 16, 16, '#ecd89c'); p.spk(R, '#d8c078', 14, 2); p.spk(R, '#f8ecc0', 6, 1); } });
  def('n', 'snow', { v: 4, d: function (p, fr, v, R) { p.r(0, 0, 16, 16, P.sn1); p.spk(R, P.sn2, 12, 3); p.spk(R, P.sn3, 4, 2); p.spk(R, P.white, 5, 1); } });
  def('I', 'ice', { ice: true, v: 2, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.ic2);
    for (var i = 0; i < 3; i++) { var x = (R() * 12) | 0, y = (R() * 12) | 0; for (var k = 0; k < 5; k++) p.p(x + k, y + 4 - k, P.ic4); }
    p.spk(R, P.ic1, 10, 2); p.spk(R, P.ic3, 4, 1); p.r(0, 15, 16, 1, P.ic3); p.r(15, 0, 1, 16, P.ic3);
  } });
  def('a', 'ash', { v: 3, d: function (p, fr, v, R) { p.r(0, 0, 16, 16, P.as1); p.spk(R, P.as2, 14, 2); p.spk(R, P.as3, 8, 1); p.spk(R, P.as4, 4, 1); } });
  def('~', 'water', { solid: true, water: true, fr: 4, d: function (p, fr) {
    p.r(0, 0, 16, 16, P.w2);
    for (var y = 0; y < 16; y += 4) { for (var x = 0; x < 16; x += 8) { var xx = (x + fr * 2 + y) % 16; p.r(xx, y + 1, 4, 1, P.w1); p.r(xx + 1, y, 2, 1, P.w4); } }
    p.r(0, 3, 16, 1, P.w3); p.r(0, 11, 16, 1, P.w3);
  } });
  def('L', 'lava', { solid: true, lava: true, fr: 4, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.lv1);
    for (var y = 0; y < 16; y += 5) for (var x = 0; x < 16; x += 7) { var xx = (x + fr * 3 + y * 2) % 16; p.r(xx, y + 1, 5, 2, P.lv2); p.r(xx + 1, y + 1, 2, 1, P.lv3); }
    p.r(0, 14, 16, 2, P.lv4); p.r(((fr * 5) % 14) + 1, 9, 2, 1, P.lv4);
  } });
  def('"', 'tallgrass', { grass: true, d: function (p, fr, v, R) {
    grass(p, fr, v, R);
    for (var i = 0; i < 6; i++) { var x = 1 + i * 2 + ((R() * 2) | 0), y = 4 + ((R() * 8) | 0); p.r(x, y, 1, 4, P.g3); p.p(x - 1, y - 1, P.g3); p.p(x + 1, y - 1, P.g3); p.p(x, y - 1, P.g4); }
  }, v: 2 });
  def('*', 'flowers', { v: 3, d: function (p, fr, v, R) {
    grass(p, fr, v, R);
    var cols = ['#ff6080', '#ffe060', '#ffffff', '#c090ff'];
    for (var i = 0; i < 4; i++) { var x = 2 + ((R() * 11) | 0), y = 2 + ((R() * 11) | 0), c = cols[(R() * 4) | 0]; p.p(x, y, c); p.p(x + 1, y, c); p.p(x, y + 1, c); p.p(x + 1, y + 1, '#ffd040'); p.p(x, y + 2, P.g3); }
  } });

  /* ---------- 木・岩・柵 ---------- */
  var TREE = [
    '................', '.....KKKKKK.....', '....KGGGGGGK....', '...KGLLGGGGGK...', '..KGLLLGGGGGGK..', '..KGLLGGGGGDGK..', '.KGGGGGGGGGDDGK.',
    '.KGGGGGGGGDDDGK.', '.KGGGGGGDDDDDGK.', '..KGGGGDDDDDDK..', '..KKGGDDDDDKKK..', '...KKKKGGKKK....', '......KTTK......', '......KTTK......', '.....KKTTKK.....', '................'];
  function drawTree(p, pal) { p.rows(TREE, pal); }
  def('#', 'tree', { solid: true, d: onGround('.', function (p) { drawTree(p, { K: P.ol, G: P.lf1, L: P.lf4, D: P.lf2, T: P.tk }); }) });
  def('T', 'snowtree', { solid: true, d: onGround('n', function (p) { drawTree(p, { K: P.ol, G: '#2a6e60', L: P.sn1, D: '#1e5448', T: P.tk }); p.r(5, 3, 5, 1, P.sn1); p.r(4, 6, 3, 1, P.sn2); p.r(9, 8, 3, 1, P.sn1); }) });
  def('G', 'deadtree', { solid: true, d: onGround('n', function (p) {
    p.rows(['................', '................', '..K....K....K...', '..KK..KK...KK...', '...KK.KK..KK....', '....KKKKKKK.....', '.....KTTK.......', '......KTTK......', '......KTTK......', '.....KTTTK......', '.....KTTTK......', '....KTTTTTK.....', '....KKKKKKK.....', '................'], { K: P.ol, T: '#6a4a38' }, 0, 1);
    p.r(3, 3, 2, 1, P.sn1); p.r(10, 4, 2, 1, P.sn1); p.r(6, 6, 4, 1, P.sn1);
  }) });
  function rockTex(p, R, base, hi, lo, dk) {
    p.r(0, 0, 16, 16, base);
    for (var i = 0; i < 5; i++) { var x = (R() * 11) | 0, y = (R() * 11) | 0, w = 3 + ((R() * 4) | 0), h = 2 + ((R() * 3) | 0); p.r(x, y, w, h, hi); p.r(x, y + h, w, 1, lo); }
    for (var j = 0; j < 3; j++) { var cx = (R() * 14) | 0, cy = (R() * 12) | 0; p.p(cx, cy, dk); p.p(cx + 1, cy + 1, dk); p.p(cx + 1, cy + 2, dk); }
    p.r(0, 14, 16, 2, lo); p.r(0, 0, 16, 1, hi);
  }
  def('^', 'rock', { solid: true, v: 3, d: function (p, fr, v, R) { rockTex(p, R, P.s2, P.s1, P.s3, P.s4); } });
  def('V', 'volcanic', { solid: true, v: 3, d: function (p, fr, v, R) { rockTex(p, R, P.as2, P.as1, P.as4, '#1c1824'); p.spk(R, '#8a3a20', 3, 1); } });
  def('i', 'icewall', { solid: true, v: 3, d: function (p, fr, v, R) { rockTex(p, R, P.ic3, P.ic1, P.ic5, '#2c6c98'); p.spk(R, P.ic4, 5, 1); } });
  def('f', 'fence', { solid: true, d: onGround('.', function (p) {
    p.r(0, 6, 16, 2, P.wd2); p.r(0, 11, 16, 2, P.wd2); p.r(0, 6, 16, 1, P.wd4);
    p.r(1, 3, 3, 12, P.wd1); p.r(1, 3, 3, 1, P.wd4); p.r(12, 3, 3, 12, P.wd1); p.r(12, 3, 3, 1, P.wd4); p.r(3, 3, 1, 12, P.wd3); p.r(14, 3, 1, 12, P.wd3);
  }) });
  def('b', 'bush', { solid: true, d: onGround('.', function (p) {
    p.rows(['................', '................', '....KKKKKKK.....', '..KKGGLLGGGKK...', '.KGGLLGGGGGGGK..', '.KGLGGGGGDGGGK..', 'KGGGGGGGGGDDGGK.', 'KGGGGGDGGGGDDGK.', 'KGGGGGGGGGDDDGK.', '.KGGGGDDDDDDGK..', '..KKGGGGGGGKK...', '....KKKKKKK.....'], { K: P.ol, G: P.lf1, L: P.lf4, D: P.lf2 }, 0, 2);
  }) });
  function boulder(g) { return function (p) { Tl.defs[g].d(p, 0, 0, PF.seeded(5)); p.rows(['................', '.....KKKKK......', '...KKsssssKK....', '..KsssSSsssssK..', '.KsssSSsssssssK.', '.KssssssssssdsK.', '.KsssssssssdddK.', '.KsssssssddddsK.', '..KddddddddddK..', '...KKKKKKKKKK...'], { K: P.ol, s: P.s2, S: P.s5, d: P.s3 }, 0, 4); }; }
  def('r', 'boulder', { solid: true, d: boulder('.') });
  def('R', 'boulder_ash', { solid: true, d: boulder('a') });
  def('g', 'boulder_sand', { solid: true, d: boulder('s') });
  def('j', 'boulder_snow', { solid: true, d: boulder('n') });
  def('B', 'bridge', { d: function (p, fr, v, R) {
    Tl.defs['~'].d(p, 0, 0, R);
    p.r(0, 0, 16, 16, P.wd1);
    for (var y = 0; y < 16; y += 4) { p.r(0, y, 16, 1, P.wd4); p.r(0, y + 3, 16, 1, P.wd3); }
    p.r(0, 0, 1, 16, P.wd3); p.r(15, 0, 1, 16, P.wd3);
  } });
  function lamp(g) {
    return function (p, fr) {
      Tl.defs[g].d(p, 0, 0, PF.seeded(7));
      p.r(7, 6, 2, 9, P.s4); p.r(5, 14, 6, 2, P.s4); p.r(6, 14, 4, 1, P.s3);
      p.r(4, 1, 8, 6, P.ol); p.r(5, 2, 6, 4, fr ? P.f3 : P.f2); p.r(7, 3, 2, 2, P.f4); p.r(4, 0, 8, 1, P.s3);
    };
  }
  def('l', 'lamppost', { solid: true, fr: 2, d: lamp('n') });
  def('y', 'lamppost_g', { solid: true, fr: 2, d: lamp('.') });
  def('q', 'lamppost_a', { solid: true, fr: 2, d: lamp('a') });
  def('e', 'lamppost_s', { solid: true, fr: 2, d: lamp('s') });

  /* ---------- 建物（外） ---------- */
  function roof(c1, c2, c3, c4, eave) {
    return function (p, fr, v, R) {
      p.r(0, 0, 16, 16, c1);
      for (var y = 0; y < 16; y += 4) { p.r(0, y + 3, 16, 1, c3); for (var x = ((y / 4) % 2) * 4; x < 16; x += 8) { p.r(x, y, 1, 3, c3); } p.r(0, y, 16, 1, c4); }
      if (eave) { p.r(0, 12, 16, 4, c2); p.r(0, 12, 16, 1, c4); p.r(0, 15, 16, 1, c3); }
      p.spk(R, c2, 4, 2);
    };
  }
  def('1', 'roof_red', { solid: true, v: 2, d: roof(P.rr1, P.rr2, P.rr3, P.rr4, false) });
  def('2', 'roof_red_eave', { solid: true, v: 2, d: roof(P.rr1, P.rr2, P.rr3, P.rr4, true) });
  def('3', 'roof_blue', { solid: true, v: 2, d: roof(P.rb1, P.rb2, P.rb3, P.rb4, false) });
  def('4', 'roof_blue_eave', { solid: true, v: 2, d: roof(P.rb1, P.rb2, P.rb3, P.rb4, true) });
  def('D', 'wall', { solid: true, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.wl1); p.r(0, 14, 16, 2, P.wl3); p.r(0, 0, 16, 2, P.wl2);
    p.spk(R, P.wl2, 6, 2); p.r(0, 13, 16, 1, P.wl2);
  } });
  def('N', 'wall_window', { solid: true, d: function (p, fr, v, R) {
    Tl.defs['D'].d(p, 0, 0, R);
    p.r(3, 3, 10, 9, P.wd3); p.r(4, 4, 8, 7, '#7cc0f0'); p.r(4, 4, 8, 2, '#b0e0ff'); p.r(7, 4, 2, 7, P.wd3); p.r(4, 7, 8, 1, P.wd3);
    p.r(2, 12, 12, 2, P.wd2); p.r(5, 5, 1, 1, P.white);
  } });
  def('0', 'door', { d: function (p, fr, v, R) {
    Tl.defs['D'].d(p, 0, 0, R);
    p.r(2, 1, 12, 15, P.wd3); p.r(3, 2, 10, 14, P.wd1); p.r(3, 2, 10, 2, P.wd4); p.r(7, 2, 2, 14, P.wd2); p.r(10, 9, 2, 2, '#f8d860');
    p.r(2, 1, 12, 1, P.ol);
  } });
  def(']', 'cavemouth', { d: onGround('^', function (p) {
    p.r(2, 2, 12, 14, P.ol); p.r(3, 3, 10, 13, '#08060c'); p.r(2, 2, 12, 1, P.s3); p.r(1, 4, 1, 12, P.s3); p.r(14, 4, 1, 12, P.s3);
    p.r(4, 12, 8, 4, '#16101e');
  }) });

  /* ---------- 室内 ---------- */
  def('=', 'woodfloor', { v: 2, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.fl1);
    for (var y = 0; y < 16; y += 8) { p.r(0, y + 7, 16, 1, P.fl3); p.r(0, y, 16, 1, '#dcae6c'); p.r(((y / 8) % 2) * 8 + 4, y, 1, 8, P.fl3); }
    p.spk(R, P.fl2, 5, 2);
  } });
  def('%', 'carpet', { d: function (p, fr, v, R) { p.r(0, 0, 16, 16, P.cp1); p.r(0, 0, 16, 1, P.cp3); p.r(0, 15, 16, 1, P.cp2); for (var y = 2; y < 16; y += 4) for (var x = (y % 8 ? 0 : 2); x < 16; x += 4) p.p(x, y, P.cp2); } });
  def('+', 'stonefloor', { v: 3, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.s2); p.r(1, 1, 14, 14, P.s1); p.r(1, 1, 14, 1, P.s5); p.r(1, 14, 14, 1, P.s3); p.spk(R, P.s2, 8, 1); p.spk(R, P.s3, 3, 1);
  } });
  def('_', 'mat', { d: function (p, fr, v, R) { Tl.defs['='].d(p, 0, 0, R); p.r(2, 4, 12, 9, P.wd2); p.r(3, 5, 10, 7, P.wd1); for (var x = 4; x < 13; x += 2) p.p(x, 8, P.wd4); } });
  def('W', 'inwall', { solid: true, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.iw1); p.r(0, 0, 16, 3, P.iw4); p.r(0, 3, 16, 1, P.iw3);
    for (var x = 0; x < 16; x += 4) p.r(x, 4, 1, 10, P.iw2); p.r(0, 13, 16, 3, P.iw3); p.r(0, 13, 16, 1, P.iw2);
  } });
  def('X', 'cavewall', { solid: true, v: 3, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.cv1); p.r(0, 0, 16, 2, P.cv4);
    for (var y = 3; y < 16; y += 5) { p.r(0, y, 16, 1, P.cv3); for (var x = ((y / 5 | 0) % 2) * 5; x < 16; x += 10) p.r(x, y, 1, 5, P.cv3); }
    p.spk(R, P.cv2, 8, 2); p.r(0, 14, 16, 2, P.cv3);
  } });
  def('z', 'inwindow', { solid: true, d: function (p, fr, v, R) {
    Tl.defs['W'].d(p, 0, 0, R);
    p.r(3, 2, 10, 10, P.wd3); p.r(4, 3, 8, 8, P.sky); p.r(7, 3, 2, 8, P.wd3); p.r(4, 6, 8, 1, P.wd3);
    p.p(5, 4, P.white); p.p(10, 8, P.white); p.p(5, 9, P.f3);
  } });
  def('o', 'shelf', { solid: true, d: onGround('=', function (p, fr, v, R) {
    p.r(1, 0, 14, 16, P.wd3); p.r(2, 1, 12, 14, P.wd2);
    var cols = ['#c04040', '#4070c0', '#40a050', '#d8b040', '#8040a0'];
    for (var s = 0; s < 2; s++) { p.r(2, 7 + s * 8 - 7 + 6, 12, 1, P.wd3); for (var x = 2; x < 13; x += 2) { p.r(x, 2 + s * 8, 2, 5, cols[((x / 2) + s * 2) % 5 | 0]); } }
  }) });
  def('t', 'table', { solid: true, d: onGround('=', function (p) {
    p.r(1, 3, 14, 8, P.wd1); p.r(1, 3, 14, 2, P.wd4); p.r(1, 11, 14, 1, P.wd3); p.r(2, 12, 2, 3, P.wd3); p.r(12, 12, 2, 3, P.wd3); p.r(0, 3, 1, 8, P.ol); p.r(15, 3, 1, 8, P.ol);
  }) });
  def('k', 'bed', { solid: true, d: onGround('=', function (p) {
    p.r(1, 1, 14, 14, P.wd3); p.r(2, 2, 12, 5, P.white); p.r(2, 2, 12, 1, '#e8e8ff'); p.r(2, 7, 12, 7, '#4a70c0'); p.r(2, 7, 12, 1, '#78a0e8'); p.r(2, 13, 12, 1, '#34508c');
  }) });
  def('p', 'barrel', { solid: true, d: onGround('=', function (p) {
    p.r(3, 2, 10, 13, P.wd2); p.r(4, 1, 8, 1, P.wd4); p.r(3, 5, 10, 1, P.s3); p.r(3, 10, 10, 1, P.s3); p.r(5, 2, 1, 13, P.wd4); p.r(2, 4, 1, 9, P.ol); p.r(13, 4, 1, 9, P.ol); p.r(3, 14, 10, 1, P.wd3);
  }) });
  def('c', 'counter', { solid: true, counter: true, d: onGround('=', function (p) {
    p.r(0, 3, 16, 12, P.wd1); p.r(0, 3, 16, 3, P.wd4); p.r(0, 6, 16, 1, P.wd3); p.r(0, 14, 16, 1, P.wd3);
  }) });
  def('h', 'chair', { solid: true, d: onGround('=', function (p) { p.r(4, 3, 8, 3, P.wd3); p.r(4, 6, 8, 5, P.wd1); p.r(4, 11, 2, 4, P.wd3); p.r(10, 11, 2, 4, P.wd3); }) });
  def('u', 'hearth', { solid: true, fr: 3, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.s3); p.r(0, 0, 16, 3, P.s2); p.r(2, 3, 12, 13, P.ol); p.r(3, 4, 10, 12, '#2c1810');
    p.r(1, 3, 1, 13, P.s4); p.r(14, 3, 1, 13, P.s4);
    var h = [6, 8, 7][fr];
    p.r(5, 14 - h + 2, 6, h, P.f1); p.r(6, 14 - h + 4, 4, h - 2, P.f2); p.r(7, 14 - h + 7, 2, h - 4, P.f3); p.r(3, 15, 10, 1, P.f1);
    p.r(4, 14, 8, 2, '#4a2a18');
  } });
  def('P', 'pillar', { solid: true, d: onGround('+', function (p) {
    p.r(4, 0, 8, 16, P.s2); p.r(4, 0, 2, 16, P.s5); p.r(10, 0, 2, 16, P.s3); p.r(3, 0, 10, 2, P.s1); p.r(3, 14, 10, 2, P.s3); p.r(3, 0, 10, 1, P.s5);
  }) });
  def('O', 'pit', { solid: true, pit: true, d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.cv3); p.r(1, 1, 14, 14, '#100c18'); p.r(0, 0, 16, 1, P.cv4); p.r(0, 0, 1, 16, P.cv4); p.r(15, 0, 1, 16, P.cv2); p.r(0, 15, 16, 1, P.cv2); p.r(3, 3, 5, 1, P.cv2); p.r(9, 11, 4, 1, P.cv2);
  } });
  def('Y', 'crystal', { solid: true, fr: 2, d: onGround('+', function (p, fr) {
    p.rows(['.......KK.......', '......KCCK......', '.....KCWCCK.....', '....KCWCCCCK....', '....KCWCCCDK....', '....KCCCCDDK....', '...KCCCCCDDDK...', '...KCWCCCDDDK...', '...KCCCCDDDDK...', '....KCCCDDDK....', '.....KKKKKK.....'], { K: P.ol, C: fr ? '#a8f0ff' : '#88d8f8', W: P.white, D: '#4898d0' }, 0, 3);
  }) });
  def('/', 'stairs_up', { d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.cv2); for (var i = 0; i < 4; i++) { p.r(1, 2 + i * 3, 14, 3, [P.s1, P.s2, P.s2, P.s3][i]); p.r(1, 2 + i * 3, 14, 1, P.s5); } p.r(0, 0, 16, 2, P.cv4);
  } });
  def('v', 'stairs_down', { d: function (p, fr, v, R) {
    p.r(0, 0, 16, 16, P.cv3); p.r(1, 1, 14, 14, '#14101c');
    for (var i = 0; i < 4; i++) { p.r(2 + i, 2 + i * 3, 12 - i * 2, 3, [P.s3, P.s2, P.s2, P.s1][i]); p.r(2 + i, 2 + i * 3, 12 - i * 2, 1, P.s1); }
  } });
  def('Z', 'void', { solid: true, d: function (p) { p.r(0, 0, 16, 16, '#000000'); } });
  def(' ', 'void2', { solid: true, d: function (p) { p.r(0, 0, 16, 16, '#000000'); } });

  /* ---------- テクスチャ生成 ---------- */
  Tl.build = function () {
    Tl.order.forEach(function (ch) {
      var d = Tl.defs[ch]; d.tex = [];
      for (var v = 0; v < d.v; v++) {
        var frames = [];
        for (var f = 0; f < d.fr; f++) {
          var c = PF.makeCanvas(16, 16), pen = new Pen(c), R = PF.seeded(ch.charCodeAt(0) * 131 + v * 17 + 7);
          d.d(pen, f, v, R); frames.push(c);
        }
        d.tex.push(frames);
      }
    });
  };
  Tl.get = function (ch) { return Tl.defs[ch] || Tl.defs['.']; };
  Tl.draw = function (ctx, ch, x, y, tx, ty, time) {
    var d = Tl.defs[ch]; if (!d) return;
    var v = d.v > 1 ? ((PF.hash(tx, ty, 3) * d.v) | 0) : 0;
    var f = d.fr > 1 ? (((time / (d.name === 'water' ? 28 : d.name === 'lava' ? 20 : 14)) | 0) + (d.name === 'lamppost' ? 0 : 0)) % d.fr : 0;
    ctx.drawImage(d.tex[v][f], x, y);
  };
})();
