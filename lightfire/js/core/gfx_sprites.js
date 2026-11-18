/* gfx_sprites.js — キャラ・物体・アイコンのドット絵生成 */
(function () {
  'use strict';
  var P = PF.pal, Pen = PF.Pen;
  var G = PF.gfx = {};
  var SP = PF.sprites = {};

  // シルエットの外側に輪郭線を付ける
  G.outline = function (c, col) {
    var x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), s = d.data, out = [];
    function a(i, j) { return i >= 0 && j >= 0 && i < w && j < h && s[(j * w + i) * 4 + 3] > 0; }
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      if (!a(i, j) && (a(i - 1, j) || a(i + 1, j) || a(i, j - 1) || a(i, j + 1))) out.push([i, j]);
    }
    x.fillStyle = col || P.ol; out.forEach(function (q) { x.fillRect(q[0], q[1], 1, 1); });
  };
  // 左上に明るく右下に暗く（シルエット内のドットを近傍から陰影付け）
  G.shadeEdges = function (c, hi, lo) {
    var x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), s = d.data, ops = [];
    function a(i, j) { return i >= 0 && j >= 0 && i < w && j < h && s[(j * w + i) * 4 + 3] > 0; }
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (a(i, j)) {
      if (!a(i, j - 1) || !a(i - 1, j)) ops.push([i, j, hi]); else if (!a(i, j + 1) || !a(i + 1, j)) ops.push([i, j, lo]);
    }
    ops.forEach(function (q) { x.fillStyle = q[2]; x.fillRect(q[0], q[1], 1, 1); });
  };
  G.flip = function (c) {
    var o = PF.makeCanvas(c.width, c.height), x = o.getContext('2d');
    x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o;
  };

  /* ---------- 人物 ---------- */
  var DOWN = ['.....KKKKKK.....', '...KKHHHHHHKK...', '..KHHHhhhhHHHK..', '..KHHhhHHHHHHK..', '..KHHHHHHHHHHK..', '..KHHSSSSSSHHK..', '..KHSSSSSSSSHK..',
    '..KSSESSSSESSK..', '..KSSESSSSESSK..', '...KSSSssSSSK...', '....KKSSSSKK....', '..KKCCCCCCCCKK..', '..KCCCTTTTCCCK..', '..KSKCCCCCCKSK..'];
  var UP = ['.....KKKKKK.....', '...KKHHHHHHKK...', '..KHHHhhhhHHHK..', '..KHHhhHHHHHHK..', '..KHHHHHHHHHHK..', '..KHHHHHHHHHHK..', '..KHHHHHHHHHHK..',
    '..KHHHHhhHHHHK..', '..KHHHHHHHHHHK..', '...KHHHHHHHHK...', '....KKHHHHKK....', '..KKCCCCCCCCKK..', '..KCCCccccCCCK..', '..KSKCCCCCCKSK..'];
  var LEFT = ['....KKKKKKK.....', '..KKHHHHHHHKK...', '.KHHHhhhhHHHHK..', '.KHhhHHHHHHHHK..', '.KHHHHHHHHHHHK..', '.KSSHHHHHHHHHK..', '.KSSSHHHHHHHHK..',
    '.KSESSHHHHHHK...', '.KSESSSHHHHK....', '..KSSSSSSSK.....', '...KKSSSKK......', '...KKCCCCCCKK...', '...KCCCTTCCCK...', '....KSKCCCCK....'];
  var LEGS = {
    d: [['...KKPPPPPPKK...', '....KBBKKBBK....'], ['...KKPPPPPPKK...', '....KBBK.KBBK...'], ['...KKPPPPPPKK...', '......KBBBBK....']],
    l: [['....KKPPPPKK....', '....KBBBBBBK....'], ['....KKPPPPKK....', '...KBBK..KBBK...'], ['....KKPPPPKK....', '.....KBBBBK.....']]
  };
  LEGS.u = LEGS.d;
  var SEQ = [0, 1, 0, 2];

  function mod(rows, dir, o) {
    var r = rows.map(function (s) { return s.split(''); });
    function setc(y, x0, x1, from, to) { for (var x = x0; x <= x1; x++) if (r[y] && r[y][x] === from) r[y][x] = to; }
    if (o.bald) for (var y = 0; y < 9; y++) { setc(y, 0, 15, 'H', 'S'); setc(y, 0, 15, 'h', 's'); }
    if (o.hat) {
      for (var y2 = 0; y2 <= 5; y2++) { setc(y2, 0, 15, 'H', 'X'); setc(y2, 0, 15, 'h', 'x'); }
      if (dir === 'd') { for (var x = 3; x <= 12; x++) if (r[5][x] === 'S') r[5][x] = 'X'; }
      if (dir === 'l') { for (var x2 = 2; x2 <= 4; x2++) if (r[5][x2] === 'S') r[5][x2] = 'X'; }
    }
    if (o.long) {
      if (dir === 'd') { for (var y3 = 7; y3 <= 9; y3++) { if (r[y3][3] === 'S') r[y3][3] = 'H'; if (r[y3][12] === 'S') r[y3][12] = 'H'; } r[10][4] = 'H'; r[10][11] = 'H'; }
      if (dir === 'u') { r[10][3] = 'H'; r[10][12] = 'H'; r[11][3] = 'H'; r[11][12] = 'H'; }
      if (dir === 'l') { for (var x3 = 7; x3 <= 9; x3++) if (r[9][x3] === 'S') r[9][x3] = 'H'; r[10][8] = 'H'; r[10][9] = 'H'; }
    }
    if (o.beard) {
      if (dir === 'd') { setc(9, 4, 11, 'S', 'W'); setc(10, 6, 9, 'S', 'W'); setc(9, 4, 11, 's', 'W'); }
      if (dir === 'l') { setc(9, 3, 6, 'S', 'W'); setc(10, 5, 7, 'S', 'W'); setc(8, 3, 4, 'S', 'W'); }
    }
    if (o.apron && dir !== 'u') { setc(12, 5, 10, 'C', 'W'); setc(13, 5, 10, 'C', 'W'); }
    if (o.apron && dir === 'u') { setc(12, 5, 10, 'c', 'W'); setc(12, 5, 10, 'C', 'W'); }
    return r.map(function (a) { return a.join(''); });
  }
  var humanCache = {};
  // opts: hair skin cloth trim pants boots hat long beard bald dress apron
  G.human = function (o) {
    var key = JSON.stringify(o); if (humanCache[key]) return humanCache[key];
    var hair = o.hair || '#6a3a1c', skin = o.skin || '#f8d0a0', cloth = o.cloth || '#d84830';
    var pal = { K: P.ol, H: hair, h: PF.mix(hair, '#ffffff', 0.32), S: skin, s: PF.shade(skin, 0.82), E: '#1c1424', C: cloth, c: PF.shade(cloth, 0.74),
      T: o.trim || '#f8e0a0', P: o.pants || '#4a4a78', B: o.boots || '#5a3820', X: o.hat || '#888888', x: PF.shade(o.hat || '#888888', 0.74), W: o.beardColor || '#eeeef6' };
    if (o.dress) pal.P = PF.shade(cloth, 0.86);
    var sheet = {};
    ['d', 'u', 'l'].forEach(function (dir) {
      var up = mod(dir === 'd' ? DOWN : (dir === 'u' ? UP : LEFT), dir, o);
      sheet[dir] = SEQ.map(function (li) {
        var c = PF.makeCanvas(16, 16), pen = new Pen(c);
        pen.rows(up.concat(LEGS[dir][li]), pal);
        return c;
      });
    });
    sheet.r = sheet.l.map(G.flip);
    humanCache[key] = sheet; return sheet;
  };

  /* ---------- ヒダネ（火の精） ---------- */
  function ember(fr, big) {
    var c = PF.makeCanvas(16, 16), pen = new Pen(c);
    var hw = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 4, 3];
    var lean = [-1, 0, 1, 0][fr];
    for (var y = 0; y < hw.length; y++) {
      var w = hw[y], cx = 8 + (y < 5 ? lean * (5 - y) / 3 | 0 : 0);
      pen.r(cx - w, 1 + y + 1, w * 2, 1, P.f1);
      if (w > 1) pen.r(cx - w + 1, 1 + y + 1, w * 2 - 2, 1, P.f2);
      if (w > 2 && y > 6) pen.r(cx - w + 3, 1 + y + 1, w * 2 - 6, 1, P.f3);
    }
    G.outline(c, '#4a1408');
    pen.r(5, 10, 2, 2, '#2c0c08'); pen.r(10, 10, 2, 2, '#2c0c08'); pen.p(5, 10, P.white); pen.p(10, 10, P.white);
    pen.r(7, 13, 3, 1, '#7a2410');
    return c;
  }
  SP.ember = [0, 1, 2, 3].map(function (i) { return ember(i); });

  function flame(w, h, fr) { // 小さな炎（燭台用）
    var c = PF.makeCanvas(16, 16), pen = new Pen(c);
    for (var y = 0; y < h; y++) {
      var t = y / (h - 1), ww = Math.max(1, Math.round(Math.sin(Math.PI * (0.25 + t * 0.75)) * w / 2 * (0.9 + 0.1 * ((fr + y) % 2))));
      var cx = 8 + ((fr === 1 && y < h / 2) ? 1 : (fr === 2 && y < h / 2 ? -1 : 0));
      pen.r(cx - ww, 16 - h + y - 4, ww * 2, 1, P.f1);
      if (ww > 1) pen.r(cx - ww + 1, 16 - h + y - 4, ww * 2 - 2, 1, y > h / 3 ? P.f2 : P.f1);
      if (ww > 2 && y > h / 2) pen.r(cx - 1, 16 - h + y - 4, 2, 1, P.f3);
    }
    return c;
  }
  SP.flame = [0, 1, 2].map(function (i) { return flame(8, 11, i); });

  /* ---------- 物体 ---------- */
  function mkc(f) { var c = PF.makeCanvas(16, 16); f(new Pen(c), c); return c; }
  SP.chest = [mkc(function (p) {
    p.r(2, 6, 12, 9, P.wd3); p.r(3, 7, 10, 7, P.wd1); p.r(2, 5, 12, 3, P.wd2); p.r(3, 4, 10, 1, P.wd3); p.r(3, 5, 10, 1, P.wd4);
    p.r(2, 9, 12, 1, P.wd3); p.r(7, 8, 2, 4, '#f8d860'); p.r(7, 9, 2, 2, '#b08020'); p.r(2, 14, 12, 1, P.ol); p.r(2, 4, 1, 11, P.ol); p.r(13, 4, 1, 11, P.ol);
  }), mkc(function (p) {
    p.r(2, 7, 12, 8, P.wd3); p.r(3, 9, 10, 5, '#3a2418'); p.r(3, 8, 10, 1, P.wd1); p.r(2, 14, 12, 1, P.ol);
    p.r(2, 1, 12, 3, P.wd2); p.r(3, 0, 10, 1, P.wd3); p.r(3, 1, 10, 1, P.wd4); p.r(2, 4, 12, 3, P.wd3); p.r(7, 3, 2, 2, '#f8d860');
  })];
  SP.block = mkc(function (p) {
    p.r(1, 1, 14, 14, P.s3); p.r(1, 1, 14, 2, P.s5); p.r(1, 1, 2, 14, P.s1); p.r(2, 3, 12, 11, P.s2); p.r(3, 4, 10, 9, P.s1);
    p.r(3, 12, 10, 1, P.s3); p.r(12, 4, 1, 9, P.s3); p.r(1, 14, 14, 1, P.s4); p.r(14, 2, 1, 13, P.s4);
    p.r(7, 6, 2, 1, P.s3); p.r(6, 7, 4, 3, P.s3); p.r(7, 10, 2, 1, P.s3); p.r(7, 7, 2, 2, P.s5); // 炎の紋
  });
  SP.plate = [mkc(function (p) { p.r(1, 1, 14, 14, P.s3); p.r(2, 2, 12, 12, P.s2); p.r(2, 2, 12, 1, P.s1); p.r(2, 2, 1, 12, P.s1); p.r(5, 5, 6, 6, P.s3); p.r(6, 6, 4, 4, '#8c7a50'); }),
  mkc(function (p) { p.r(1, 1, 14, 14, P.s4); p.r(2, 2, 12, 12, P.s3); p.r(5, 5, 6, 6, '#f8a030'); p.r(6, 6, 4, 4, '#ffee80'); })];
  SP.brazier = [mkc(function (p) { // 消えている
    p.r(5, 12, 6, 3, P.s3); p.r(7, 9, 2, 4, P.s3); p.r(3, 6, 10, 4, P.s2); p.r(4, 10, 8, 1, P.s3); p.r(3, 6, 10, 1, P.s5); p.r(4, 5, 8, 1, '#2a2030'); p.r(5, 6, 6, 1, '#3a3040');
    p.r(2, 6, 1, 4, P.ol); p.r(13, 6, 1, 4, P.ol); p.r(4, 15, 8, 1, P.ol);
  })].concat([0, 1, 2].map(function (fr) {
    var c = mkc(function (p) { p.r(5, 12, 6, 3, P.s3); p.r(7, 9, 2, 4, P.s3); p.r(3, 6, 10, 4, P.s2); p.r(4, 10, 8, 1, P.s3); p.r(3, 6, 10, 1, P.s5); p.r(2, 6, 1, 4, P.ol); p.r(13, 6, 1, 4, P.ol); p.r(4, 15, 8, 1, P.ol); });
    var f = flame(8, 10, fr); c.getContext('2d').drawImage(f, 0, -2); return c;
  }));
  SP.wtorch = [mkc(function (p) { p.r(7, 3, 2, 10, P.wd2); p.r(6, 12, 4, 2, P.s3); p.r(5, 1, 6, 3, P.s3); p.r(5, 1, 6, 1, P.s5); p.r(4, 14, 8, 1, P.s4); p.r(7, 3, 1, 9, P.wd4); })]
    .concat([0, 1, 2].map(function (fr) { var c = mkc(function (p) { p.r(7, 5, 2, 9, P.wd2); p.r(6, 13, 4, 2, P.s3); p.r(5, 3, 6, 3, P.s3); p.r(5, 3, 6, 1, P.s5); p.r(7, 5, 1, 8, P.wd4); }); c.getContext('2d').drawImage(flame(8, 9, fr), 0, -3); return c; }));
  SP.gate = mkc(function (p) {
    p.r(0, 0, 16, 16, P.s3); p.r(0, 0, 16, 2, P.s1); p.r(2, 2, 12, 14, '#14101c');
    for (var x = 3; x < 14; x += 3) { p.r(x, 2, 2, 14, '#8a8aa0'); p.r(x, 2, 1, 14, '#c4c4d8'); }
    p.r(2, 5, 12, 2, '#5a5a70'); p.r(2, 11, 12, 2, '#5a5a70'); p.r(6, 8, 4, 3, '#f8d860');
  });
  SP.sign = mkc(function (p) { p.r(7, 8, 2, 7, P.wd3); p.r(2, 2, 12, 8, P.wd3); p.r(3, 3, 10, 6, P.wd1); p.r(3, 3, 10, 1, P.wd4); p.r(5, 5, 6, 1, P.wd3); p.r(5, 7, 4, 1, P.wd3); });
  SP.iceblock = mkc(function (p) {
    p.r(1, 1, 14, 14, P.ic5); p.r(2, 2, 12, 12, P.ic3); p.r(2, 2, 12, 2, P.ic4); p.r(2, 2, 2, 12, P.ic1); p.r(4, 4, 8, 8, P.ic2); p.r(5, 5, 3, 1, P.white); p.r(5, 6, 1, 2, P.white); p.r(9, 10, 3, 1, P.ic4);
    p.r(1, 14, 14, 1, '#2c6c98'); p.r(14, 2, 1, 13, '#2c6c98');
  });
  SP.barrier = mkc(function (p) { // 燃やせる木柵
    p.r(1, 2, 3, 13, P.wd2); p.r(12, 2, 3, 13, P.wd2); p.r(0, 3, 16, 3, P.wd1); p.r(0, 10, 16, 3, P.wd1); p.r(0, 3, 16, 1, P.wd4); p.r(0, 10, 16, 1, P.wd4);
    p.r(1, 2, 3, 1, P.wd4); p.r(12, 2, 3, 1, P.wd4); p.r(2, 5, 12, 1, P.wd3); p.r(6, 6, 4, 4, '#8a6a30'); p.r(4, 14, 8, 1, P.ol);
  });
  SP.bramble = mkc(function (p) { // 枯れたつる
    p.rows(['................', '..K..K....K.....', '.KbK.KbK.KbK....', '..KbKKbKKbK.K...', '.KbbbKbbbKbbK...', '..KKbbbKbbbbK...', '.KbbKbbbbKbbbK..', '..KbbbKbbbbKK...', '.KbbKbbbKbbbbK..', '..KKbbbbKbbbK...', '...KKKKbKKKK....'], { K: P.ol, b: '#7a5a28' }, 0, 2);
    p.p(3, 5, '#c04040'); p.p(10, 8, '#c04040'); p.p(6, 10, '#c04040');
  });
  SP.orb = [0, 1].map(function (fr) { return mkc(function (p, c) {
    p.r(4, 12, 8, 3, P.s3); p.r(5, 11, 6, 1, P.s2); p.r(3, 14, 10, 1, P.s4);
    p.r(5, 3, 6, 8, fr ? '#ffc060' : '#ff9a40'); p.r(4, 4, 8, 6, fr ? '#ffc060' : '#ff9a40'); p.r(6, 5, 3, 3, '#fff0b0'); p.r(6, 4, 2, 1, P.white);
    G.outline(c, '#5a2410'); p.r(4, 14, 8, 1, P.ol);
  }); });
  SP.pedestal = mkc(function (p) { p.r(3, 8, 10, 7, P.s2); p.r(2, 7, 12, 2, P.s1); p.r(3, 12, 10, 1, P.s3); p.r(2, 14, 12, 1, P.s4); p.r(3, 9, 10, 1, P.s1); });
  SP.cat = [0, 1].map(function (fr) { return mkc(function (p, c) {
    p.rows(['........', '..K..K..', '.KkKKkK.', '.KkkkkK.', '.KkEkEK.', '..KkkkK.', '.KkkkkkK', '.KkkkkkK', '.KkkkkkK', '..KKKKK.'], { K: P.ol, k: '#d89a50', E: '#1c1424' }, 4, 5);
    if (fr) p.r(13, 11, 2, 1, '#d89a50'); else p.r(13, 12, 2, 1, '#d89a50');
  }); });
  SP.shadow = mkc(function (p) { p.r(4, 13, 8, 3, 'rgba(0,0,0,0.28)'); p.r(3, 14, 10, 1, 'rgba(0,0,0,0.28)'); });
  SP.bubble = {
    '!': mkc(function (p) { p.r(5, 0, 6, 8, P.ol); p.r(6, 1, 4, 6, P.white); p.r(7, 2, 2, 3, '#e03030'); p.r(7, 6, 2, 1, '#e03030'); p.r(7, 8, 2, 1, P.ol); }),
    '?': mkc(function (p) { p.r(5, 0, 6, 8, P.ol); p.r(6, 1, 4, 6, P.white); p.r(7, 2, 2, 1, '#3040c0'); p.r(8, 3, 1, 1, '#3040c0'); p.r(7, 5, 2, 1, '#3040c0'); p.r(7, 8, 2, 1, P.ol); }),
    '♪': mkc(function (p) { p.r(5, 0, 6, 8, P.ol); p.r(6, 1, 4, 6, P.white); p.r(8, 2, 1, 3, '#d04080'); p.r(7, 5, 2, 1, '#d04080'); p.r(7, 8, 2, 1, P.ol); })
  };

  /* ---------- おおび（村の大きな火）32x32 ---------- */
  function greatFlame(c, fr, level) {
    var pen = new Pen(c), h = [0, 8, 13, 17, 21, 24][level], w = [0, 8, 12, 16, 20, 24][level];
    for (var y = 0; y < h; y++) {
      var t = y / (h - 1), ww = Math.max(1, Math.round(Math.sin(Math.PI * (0.18 + t * 0.82)) * w / 2 * (0.92 + 0.08 * ((fr + y) % 2))));
      var cx = 16 + ((fr === 1 && y < h * 0.45) ? 1 : (fr === 2 && y < h * 0.45 ? -1 : 0)), yy = 24 - h + y;
      pen.r(cx - ww, yy, ww * 2, 1, P.f1);
      if (ww > 2) pen.r(cx - ww + 2, yy, ww * 2 - 4, 1, y > h * 0.3 ? P.f2 : P.f1);
      if (ww > 4 && y > h * 0.45) pen.r(cx - ww + 5, yy, ww * 2 - 10, 1, P.f3);
      if (ww > 6 && y > h * 0.7) pen.r(cx - 2, yy, 4, 1, P.f4);
    }
  }
  function greatBasin(c, lit) {
    var p = new Pen(c);
    p.r(5, 25, 22, 7, P.s3); p.r(3, 22, 26, 4, P.s2); p.r(3, 22, 26, 1, P.s5); p.r(3, 25, 26, 1, P.s3); p.r(7, 31, 18, 1, P.ol); p.r(2, 23, 1, 3, P.ol); p.r(29, 23, 1, 3, P.ol);
    p.r(4, 23, 24, 2, lit ? '#6a2a10' : '#2a2430'); p.r(6, 22, 20, 1, lit ? '#ff6a1a' : '#4a4452'); p.r(9, 27, 14, 2, P.s1);
    if (!lit) { p.r(8, 22, 5, 1, '#6a6070'); p.r(18, 22, 4, 1, '#6a6070'); }
  }
  SP.greatfire = [];
  for (var lv = 0; lv <= 5; lv++) {
    var fl = [];
    for (var f = 0; f < 3; f++) {
      var gc = PF.makeCanvas(32, 32);
      if (lv > 0) greatFlame(gc, f, lv);
      greatBasin(gc, lv > 0);
      fl.push(gc);
    }
    SP.greatfire.push(fl);
  }

  /* ---------- アイコン (8x8) ---------- */
  var IC = {};
  G.icons = IC;
  function icon(name, rows, pal) {
    var c = PF.makeCanvas(8, 8), pen = new Pen(c); pal.K = P.ol; pen.rows(rows, pal); IC[name] = c;
  }
  icon('potion', ['...KK...', '..KwwK..', '...KK...', '..KrrK..', '.KrRrrK.', '.KrrrrK.', '.KrrrrK.', '..KKKK..'], { w: '#e8e8f0', r: '#d83848', R: '#f89098' });
  icon('potion2', ['...KK...', '..KwwK..', '...KK...', '..KbbK..', '.KbBbbK.', '.KbbbbK.', '.KbbbbK.', '..KKKK..'], { w: '#e8e8f0', b: '#3868d8', B: '#98b8f8' });
  icon('herb', ['..KK....', '.KggK.K.', '.KgGgKgK', '..KgGgK.', '.KggGK..', 'KgGgK...', 'KKKK....', '........'], { g: '#40b050', G: '#88e078' });
  icon('sword', ['......wK', '.....wwK', '....wwK.', '...wwK..', '.KwwK...', '..KkK...', '.KkKK...', 'KK......'], { w: '#e0e8f8', k: '#b07030' });
  icon('shield', ['.KKKKKK.', 'KbbbbbbK', 'KbwwwwbK', 'KbwbbwbK', '.KbwwbK.', '.KbbbbK.', '..KbbK..', '...KK...'], { b: '#3868c8', w: '#e8e8f0' });
  icon('armor', ['.KK..KK.', 'KccKKccK', 'KcccccCK', '.KcccCK.', '.KccCcK.', '.KcCccK.', '.KccccK.', '..KKKK..'], { c: '#a0a8c0', C: '#d0d8f0' });
  icon('key', ['..KKK...', '.KyyyK..', '.KyKyK..', '.KyyyK..', '..KyK...', '..KyyK..', '..KyK...', '..KKK...'], { y: '#f0c840' });
  icon('orb', ['..KKKK..', '.KooooK.', 'KoOOooK.', 'KoOooooK', 'KooooooK', '.KooooK.', '..KKKK..', '........'], { o: '#f08830', O: '#ffe0a0' });
  icon('note', ['KKKKKKK.', 'KwwwwwK.', 'KwKKKwK.', 'KwwwwwK.', 'KwKKKwK.', 'KwwwwwK.', 'KKKKKKK.', '........'], { w: '#f0e8d0' });
  icon('gem', ['..KKKK..', '.KcCCcK.', 'KcCwCccK', '.KcccKK.', '..KcKK..', '...KK...', '........', '........'], { c: '#48b0e0', C: '#a0e0ff', w: '#ffffff' });
  icon('boots', ['..KKKK..', '..KbbK..', '..KbbK..', '.KbbbKK.', 'KbbbbbbK', 'KKKKKKKK', '........', '........'], { b: '#a06030' });
  icon('ring', ['..KKKK..', '.KyyyyK.', 'KyKKKKyK', 'KyK..KyK', 'KyK..KyK', '.KyyyyK.', '..KKKK..', '........'], { y: '#f0c840' });
  icon('bread', ['..KKKK..', '.KbbBbK.', 'KbBbbbbK', 'KbbbbBbK', '.KbbbbK.', '..KKKK..', '........', '........'], { b: '#d09040', B: '#f0c070' });
  icon('lamp', ['...KK...', '..KyyK..', '.KyOOyK.', '.KyOfyK.', '.KyOOyK.', '..KyyK..', '.KKKKKK.', '........'], { y: '#c0a050', O: '#ffe080', f: '#ff8030' });
  icon('fire', ['...K....', '..KfK...', '.KffKK..', '.KfFfK..', 'KfFFFfK.', 'KfFYFfK.', '.KfFfK..', '..KKK...'], { f: '#f05820', F: '#ffa030', Y: '#ffee80' });
  icon('heart', ['.KK.KK..', 'KrrKrrK.', 'KrRrrrK.', 'KrrrrrK.', '.KrrrK..', '..KrK...', '...K....', '........'], { r: '#e04058', R: '#ffa0b0' });
  icon('star', ['...K....', '..KyK...', 'KKKyKKK.', 'KyyyyyyK', '.KyyyyK.', '.KyKKyK.', '.KK..KK.', '........'], { y: '#f8e060' });
  icon('coin', ['..KKKK..', '.KyyyyK.', 'KyYyyyyK', 'KyYyyyyK', 'KyyyyyyK', '.KyyyyK.', '..KKKK..', '........'], { y: '#f0c840', Y: '#fff0a0' });
  icon('snow', ['K..K..K.', '.K.K.K..', '..KKK...', 'KKKwKKK.', '..KKK...', '.K.K.K..', 'K..K..K.', '........'], { w: '#e8f4ff' });
  icon('wing', ['........', 'K......K', 'KwK..KwK', 'KwwKKwwK', '.KwwwwK.', '..KwwK..', '...KK...', '........'], { w: '#f0f0ff' });

  G.build = function () {
    PF.tiles.build();
  };
})();
