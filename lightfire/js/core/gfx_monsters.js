/* gfx_monsters.js — 戦闘用の敵ドット絵（図形→輪郭→陰影）と戦闘背景 */
(function () {
  'use strict';
  var P = PF.pal, G = PF.gfx;
  var MON = PF.monsters = { defs: {}, cache: {} };

  function Q(c) { this.c = c; this.x = c.getContext('2d'); this.x.imageSmoothingEnabled = false; }
  Q.prototype.R = function (x, y, w, h, col) { this.x.fillStyle = col; this.x.fillRect(x, y, w, h); return this; };
  Q.prototype.E = function (cx, cy, rx, ry, col) {
    this.x.fillStyle = col;
    for (var y = -ry; y <= ry; y++) { var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); this.x.fillRect(cx - hw, cy + y, hw * 2 + 1, 1); }
    return this;
  };
  Q.prototype.poly = function (pts, col) {
    var minY = 999, maxY = -1, i, j; this.x.fillStyle = col;
    pts.forEach(function (p) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; });
    for (var y = minY; y <= maxY; y++) {
      var xs = [];
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (j = 0; j + 1 < xs.length; j += 2) this.x.fillRect(Math.round(xs[j]), y, Math.max(1, Math.round(xs[j + 1]) - Math.round(xs[j])), 1);
    }
    return this;
  };
  Q.prototype.polyM = function (pts, col, cx) { this.poly(pts, col); this.poly(pts.map(function (p) { return [2 * cx - p[0], p[1]]; }), col); return this; };
  Q.prototype.eye = function (x, y, r, pupil, white) { this.E(x, y, r, r, white || '#ffffff'); this.E(x, y + 1, Math.max(1, r - 2), Math.max(1, r - 2), pupil || '#1c1424'); return this; };
  Q.prototype.dot = function (x, y, col) { return this.R(x, y, 1, 1, col); };

  function M(id, size, draw, o) { MON.defs[id] = { size: size, draw: draw, o: o || {} }; }
  MON.make = function (id) {
    if (MON.cache[id]) return MON.cache[id];
    var d = MON.defs[id]; if (!d) d = MON.defs.chibikage;
    var c = PF.makeCanvas(d.size, d.size), q = new Q(c);
    d.draw(q, d.size);
    var o = d.o;
    if (o.hi) G.shadeEdges(c, o.hi, o.lo || '#000000');
    G.outline(c, o.out || P.ol);
    MON.cache[id] = c; return c;
  };

  /* ---------- 森・洞窟 ---------- */
  G.Q = Q;
  M('chibikage', 48, function (q) {
    q.E(24, 27, 14, 13, '#6a48a0'); q.poly([[12, 18], [14, 6], [20, 15]], '#6a48a0'); q.poly([[36, 18], [34, 6], [28, 15]], '#6a48a0');
    q.poly([[12, 36], [8, 44], [18, 38]], '#6a48a0'); q.poly([[22, 38], [24, 46], [28, 38]], '#6a48a0'); q.poly([[30, 38], [38, 44], [36, 36]], '#6a48a0');
    q.E(24, 30, 8, 6, '#8a66c0'); q.eye(17, 25, 4, '#c02020', '#fff0a0'); q.eye(31, 25, 4, '#c02020', '#fff0a0'); q.R(19, 34, 10, 1, '#1c1424'); q.R(21, 35, 1, 1, '#fff'); q.R(26, 35, 1, 1, '#fff');
  }, { hi: '#9a7ad8', lo: '#3c2870' });
  M('komori', 48, function (q) {
    q.polyM([[20, 24], [3, 12], [5, 22], [9, 20], [11, 30], [15, 27], [20, 33]], '#6a4a88', 24);
    q.E(24, 26, 8, 9, '#8060a8'); q.polyM([[18, 19], [16, 9], [22, 16]], '#8060a8', 24); q.E(24, 29, 5, 5, '#a888c8');
    q.eye(20, 24, 2, '#c02020'); q.eye(28, 24, 2, '#c02020'); q.R(22, 31, 1, 2, '#fff'); q.R(26, 31, 1, 2, '#fff');
  }, { hi: '#b098d0', lo: '#3c2858' });
  M('kinoko', 48, function (q) {
    q.R(17, 24, 14, 16, '#f0e4cc'); q.E(24, 40, 9, 3, '#f0e4cc'); q.E(24, 20, 16, 11, '#c84040'); q.R(8, 20, 32, 6, '#c84040');
    q.E(15, 18, 3, 3, '#ffe8e0'); q.E(30, 14, 4, 3, '#ffe8e0'); q.E(24, 21, 2, 2, '#ffe8e0'); q.E(34, 22, 2, 2, '#ffe8e0');
    q.eye(20, 31, 3, '#1c1424'); q.eye(28, 31, 3, '#1c1424'); q.R(22, 36, 5, 1, '#8a4a38');
  }, { hi: '#ffffff', lo: '#8a2828' });
  M('ookage', 64, function (q) {
    q.E(32, 38, 24, 20, '#3a2460'); q.E(32, 24, 17, 16, '#3a2460');
    q.polyM([[20, 14], [12, 0], [26, 8]], '#3a2460', 32); q.polyM([[16, 40], [4, 36], [8, 50], [2, 62], [14, 54]], '#3a2460', 32);
    q.poly([[22, 54], [26, 63], [30, 56]], '#3a2460'); q.poly([[34, 56], [38, 63], [42, 54]], '#3a2460');
    q.E(32, 44, 14, 8, '#54388a'); q.eye(24, 26, 5, '#ff3030', '#ffe060'); q.eye(40, 26, 5, '#ff3030', '#ffe060');
    q.R(22, 40, 20, 3, '#14081c'); for (var i = 0; i < 6; i++) q.poly([[23 + i * 3, 40], [25 + i * 3, 40], [24 + i * 3, 44]], '#ffffff');
  }, { hi: '#6a4aa8', lo: '#1c1034' });

  /* ---------- みなと・灯台 ---------- */
  M('yadokari', 48, function (q) {
    q.E(24, 38, 14, 5, '#d85848'); q.E(30, 20, 12, 13, '#e8b050'); q.E(30, 20, 7, 8, '#f8d078'); q.E(30, 20, 3, 4, '#e8b050');
    q.E(14, 32, 8, 8, '#d85848'); q.polyM([[6, 32], [0, 26], [6, 28]], '#d85848', 14); q.E(7, 40, 3, 3, '#d85848');
    q.R(12, 22, 2, 7, '#d85848'); q.R(18, 22, 2, 7, '#d85848'); q.eye(13, 21, 2, '#1c1424'); q.eye(19, 21, 2, '#1c1424');
  }, { hi: '#ffd8a0', lo: '#8a2c20' });
  M('mizudama', 48, function (q) {
    q.E(24, 32, 18, 12, '#4898e8'); q.E(24, 22, 11, 11, '#4898e8'); q.R(8, 36, 32, 5, '#4898e8'); q.E(24, 41, 16, 3, '#4898e8');
    q.E(24, 36, 10, 5, '#78c0f8'); q.eye(18, 28, 3); q.eye(30, 28, 3); q.R(22, 34, 5, 1, '#1c1424'); q.E(18, 17, 3, 2, '#c8ecff'); q.dot(14, 22, '#c8ecff');
  }, { hi: '#c8ecff', lo: '#2058a8' });
  M('hitode', 48, function (q) {
    q.poly([[24, 3], [29, 17], [44, 18], [32, 27], [37, 42], [24, 33], [11, 42], [16, 27], [4, 18], [19, 17]], '#e86890');
    q.E(24, 24, 8, 8, '#f890b0'); for (var i = 0; i < 5; i++) { var a = i * 1.2566 - 1.5708; q.dot(24 + Math.round(Math.cos(a) * 13), 24 + Math.round(Math.sin(a) * 13), '#ffd0e0'); }
    q.eye(20, 23, 2); q.eye(28, 23, 2); q.R(22, 29, 5, 1, '#8a2848');
  }, { hi: '#ffc0d8', lo: '#a03060' });
  M('funayurei', 48, function (q) {
    q.E(24, 20, 13, 14, '#c8e0f0'); q.R(11, 20, 26, 20, '#c8e0f0'); q.poly([[11, 40], [15, 46], [19, 40], [24, 46], [29, 40], [33, 46], [37, 40]], '#c8e0f0');
    q.R(10, 6, 28, 4, '#2c3c78'); q.R(14, 2, 20, 5, '#2c3c78'); q.R(20, 4, 8, 2, '#f0f0ff'); q.E(8, 28, 3, 7, '#c8e0f0'); q.E(40, 28, 3, 7, '#c8e0f0');
    q.E(18, 22, 4, 5, '#14182c'); q.E(30, 22, 4, 5, '#14182c'); q.dot(18, 22, '#60e0ff'); q.dot(30, 22, '#60e0ff'); q.E(24, 33, 3, 4, '#14182c');
  }, { hi: '#f0faff', lo: '#7090b0' });
  M('shizuku', 64, function (q) {
    q.E(32, 42, 26, 17, '#3878d8'); q.E(32, 30, 17, 18, '#3878d8'); q.R(8, 44, 48, 8, '#3878d8'); q.E(32, 52, 24, 5, '#3878d8');
    q.E(32, 46, 16, 8, '#68a8f0'); q.eye(24, 34, 5, '#c82020', '#ffffff'); q.eye(40, 34, 5, '#c82020', '#ffffff');
    q.poly([[24, 12], [20, 2], [27, 8], [32, 0], [37, 8], [44, 2], [40, 12]], '#f0c840'); q.R(24, 11, 16, 3, '#d8a020'); q.dot(32, 5, '#ff4040');
    q.R(26, 46, 12, 2, '#101c40'); q.E(14, 28, 3, 4, '#a0d0ff'); q.E(50, 20, 2, 3, '#a0d0ff');
  }, { hi: '#b8e0ff', lo: '#1c48a0' });

  /* ---------- 雪山・氷 ---------- */
  M('yukidaruma', 48, function (q) {
    q.E(24, 34, 14, 12, '#eef4ff'); q.E(24, 15, 10, 10, '#f8fcff');
    q.R(14, 4, 20, 3, '#3a4a88'); q.R(17, 0, 14, 5, '#3a4a88'); q.R(14, 24, 20, 3, '#d84848'); q.R(30, 27, 3, 8, '#d84848');
    q.eye(20, 15, 2, '#1c1424', '#f8fcff'); q.eye(28, 15, 2, '#1c1424', '#f8fcff'); q.poly([[24, 18], [24, 21], [34, 20]], '#f08830');
    q.R(8, 28, 6, 2, '#7a5030'); q.R(34, 28, 6, 2, '#7a5030'); q.dot(24, 31, '#1c1424'); q.dot(24, 36, '#1c1424'); q.dot(24, 41, '#1c1424');
  }, { hi: '#ffffff', lo: '#98b0d8' });
  M('koorislime', 48, function (q) {
    q.E(24, 34, 18, 11, '#88d8f0'); q.E(24, 25, 11, 11, '#88d8f0'); q.R(6, 36, 36, 4, '#88d8f0');
    q.poly([[14, 22], [10, 10], [19, 18]], '#c8f4ff'); q.poly([[34, 22], [38, 10], [29, 18]], '#c8f4ff'); q.poly([[22, 16], [24, 5], [27, 16]], '#c8f4ff');
    q.eye(18, 30, 3, '#2060a0'); q.eye(30, 30, 3, '#2060a0'); q.R(22, 36, 5, 1, '#2060a0'); q.dot(17, 24, '#fff'); q.dot(18, 24, '#fff');
  }, { hi: '#f0ffff', lo: '#4898c0' });
  M('fubukidori', 48, function (q) {
    q.polyM([[20, 22], [2, 10], [6, 22], [2, 34], [14, 30], [20, 36]], '#c8dcf8', 24);
    q.E(24, 26, 10, 11, '#e8f2ff'); q.E(24, 15, 7, 7, '#e8f2ff'); q.poly([[24, 16], [24, 21], [31, 18]], '#f0b030');
    q.poly([[21, 8], [24, 0], [27, 8]], '#68a0e0'); q.eye(21, 14, 2, '#1c1424'); q.eye(27, 14, 2, '#1c1424'); q.polyM([[20, 36], [18, 46], [23, 38]], '#c8dcf8', 24);
  }, { hi: '#ffffff', lo: '#7898c8' });
  M('tsurara', 48, function (q) {
    q.poly([[24, 46], [10, 6], [38, 6]], '#a8e4f8'); q.R(8, 3, 32, 5, '#c8f4ff'); q.poly([[8, 8], [6, 20], [12, 8]], '#a8e4f8'); q.poly([[40, 8], [42, 22], [36, 8]], '#a8e4f8');
    q.eye(19, 17, 3, '#c02020', '#fff0f0'); q.eye(29, 17, 3, '#c02020', '#fff0f0'); q.R(21, 26, 7, 2, '#1c3c68'); q.R(23, 28, 3, 6, '#78c4e8');
  }, { hi: '#ffffff', lo: '#4898c0' });
  M('koorikishi', 64, function (q) {
    q.R(18, 22, 28, 26, '#8ab8d8'); q.R(14, 24, 8, 12, '#a8d0ec'); q.R(42, 24, 8, 12, '#a8d0ec'); q.R(20, 46, 10, 16, '#7aa8c8'); q.R(34, 46, 10, 16, '#7aa8c8');
    q.R(22, 4, 20, 20, '#a8d0ec'); q.polyM([[24, 6], [20, 0], [27, 4]], '#e8faff', 32); q.R(24, 12, 16, 4, '#14182c'); q.dot(28, 13, '#ff5050'); q.dot(36, 13, '#ff5050');
    q.R(30, 6, 4, 18, '#c8ecff'); q.R(24, 32, 16, 4, '#e8faff'); q.R(52, 2, 3, 56, '#d8d8e8'); q.poly([[53, 0], [50, 8], [57, 8]], '#f0f8ff'); q.R(6, 22, 10, 22, '#4878b8'); q.R(8, 26, 6, 14, '#a8d0ec');
  }, { hi: '#f0ffff', lo: '#3c6088' });

  /* ---------- 火山 ---------- */
  M('honootokage', 48, function (q) {
    q.E(22, 28, 14, 8, '#e85a28'); q.E(34, 22, 9, 8, '#e85a28'); q.poly([[8, 28], [0, 38], [4, 40], [12, 32]], '#e85a28'); q.poly([[40, 20], [47, 23], [40, 26]], '#e85a28');
    q.R(12, 34, 4, 8, '#e85a28'); q.R(26, 34, 4, 8, '#e85a28'); q.R(11, 41, 7, 2, '#a83818'); q.R(25, 41, 7, 2, '#a83818');
    q.E(22, 28, 8, 4, '#ffb050'); q.eye(36, 20, 2, '#1c1424', '#ffee80'); for (var i = 0; i < 4; i++) q.poly([[14 + i * 5, 21], [16 + i * 5, 15], [18 + i * 5, 21]], '#ffd060');
  }, { hi: '#ffd8a0', lo: '#a02808' });
  M('magmaslime', 48, function (q) {
    q.E(24, 34, 18, 11, '#e04818'); q.E(24, 25, 11, 11, '#e04818'); q.R(6, 36, 36, 4, '#e04818'); q.E(24, 36, 11, 5, '#ff9030');
    q.eye(18, 29, 3, '#1c1424', '#ffe880'); q.eye(30, 29, 3, '#1c1424', '#ffe880'); q.R(22, 36, 5, 1, '#5a1408'); q.dot(24, 12, '#ffa040'); q.dot(23, 9, '#ffe060'); q.dot(28, 14, '#ffe060');
  }, { hi: '#ffe090', lo: '#802008' });
  M('iwagoro', 48, function (q) {
    q.R(12, 12, 24, 24, '#8a7a6a'); q.E(24, 14, 13, 6, '#8a7a6a'); q.R(4, 18, 10, 18, '#7a6a5a'); q.R(34, 18, 10, 18, '#7a6a5a'); q.R(14, 34, 8, 12, '#6a5a4a'); q.R(26, 34, 8, 12, '#6a5a4a');
    q.R(16, 8, 16, 6, '#a09080'); q.R(16, 18, 5, 3, '#14101c'); q.R(27, 18, 5, 3, '#14101c'); q.dot(18, 19, '#ff6030'); q.dot(29, 19, '#ff6030'); q.R(18, 27, 12, 2, '#14101c');
    q.R(8, 24, 2, 1, '#4a3a2a'); q.R(30, 30, 3, 1, '#4a3a2a'); q.R(20, 36, 1, 4, '#4a3a2a');
  }, { hi: '#c0b0a0', lo: '#4a3c30' });
  M('hinotama', 48, function (q) {
    q.E(24, 28, 14, 14, '#f06020'); q.poly([[14, 20], [10, 6], [20, 14]], '#f06020'); q.poly([[34, 20], [38, 6], [28, 14]], '#f06020'); q.poly([[20, 16], [24, 0], [28, 16]], '#f06020');
    q.E(24, 30, 10, 10, '#ffa030'); q.E(24, 32, 6, 6, '#ffe070'); q.eye(19, 27, 3, '#c02010', '#fff'); q.eye(29, 27, 3, '#c02010', '#fff'); q.R(21, 36, 7, 2, '#7a2008');
  }, { hi: '#fff0a0', lo: '#a02808' });
  M('yogangolem', 64, function (q) {
    q.R(16, 14, 32, 34, '#5a4e5a'); q.E(32, 16, 20, 8, '#5a4e5a'); q.R(2, 20, 14, 30, '#4a3e4a'); q.R(48, 20, 14, 30, '#4a3e4a'); q.R(18, 46, 12, 17, '#443844'); q.R(34, 46, 12, 17, '#443844');
    q.R(22, 6, 20, 10, '#6e606c'); q.R(24, 10, 6, 3, '#ffe060'); q.R(34, 10, 6, 3, '#ffe060'); q.R(26, 20, 12, 4, '#14101c');
    q.poly([[22, 26], [30, 32], [26, 40], [34, 48]], '#ff7a20'); q.poly([[44, 22], [40, 32], [46, 42]], '#ff7a20'); q.poly([[8, 26], [6, 36], [10, 46]], '#ff7a20'); q.R(24, 29, 3, 12, '#ffa030');
    q.E(32, 36, 6, 6, '#ff9030'); q.E(32, 36, 3, 3, '#ffe880');
  }, { hi: '#8a7c8a', lo: '#2a202a' });

  /* ---------- 塔 ---------- */
  M('kagekishi', 48, function (q) {
    q.R(14, 18, 20, 20, '#38304c'); q.R(10, 20, 6, 12, '#4a4062'); q.R(32, 20, 6, 12, '#4a4062'); q.R(16, 36, 7, 10, '#28203c'); q.R(25, 36, 7, 10, '#28203c');
    q.R(16, 4, 16, 16, '#4a4062'); q.polyM([[20, 4], [18, 0], [24, 2]], '#6a5a90', 24); q.R(18, 10, 12, 3, '#0e0a14'); q.dot(21, 11, '#ff4040'); q.dot(27, 11, '#ff4040'); q.R(22, 20, 4, 14, '#6a5a90');
    q.R(40, 4, 3, 40, '#9a90b8'); q.R(38, 22, 7, 2, '#6a5a90');
  }, { hi: '#8a7ab0', lo: '#14101c' });
  M('yurei', 48, function (q) {
    q.E(24, 18, 12, 13, '#d8d0f0'); q.R(12, 18, 24, 22, '#d8d0f0'); q.poly([[12, 40], [15, 46], [19, 40], [24, 47], [29, 40], [33, 46], [36, 40]], '#d8d0f0');
    q.E(7, 28, 3, 8, '#d8d0f0'); q.E(41, 28, 3, 8, '#d8d0f0'); q.E(18, 19, 3, 5, '#2c2048'); q.E(30, 19, 3, 5, '#2c2048'); q.E(24, 30, 3, 5, '#2c2048');
  }, { hi: '#ffffff', lo: '#8a80b0' });
  M('kogoeta', 48, function (q) {
    q.poly([[10, 44], [6, 14], [24, 2], [42, 14], [38, 44]], '#98d8f0');
    q.R(18, 14, 12, 12, '#4a5878'); q.R(15, 26, 18, 16, '#4a5878'); q.R(12, 28, 6, 10, '#4a5878'); q.R(30, 28, 6, 10, '#4a5878'); q.dot(21, 19, '#ffe080'); q.dot(27, 19, '#ffe080');
    q.poly([[12, 10], [16, 8], [14, 22]], '#e8ffff'); q.R(34, 12, 2, 20, '#c8f4ff');
  }, { hi: '#ffffff', lo: '#4a98c0' });
  M('fuyunokage', 64, function (q) {
    q.poly([[32, 10], [8, 30], [2, 62], [20, 56], [32, 63], [44, 56], [62, 62], [56, 30]], '#1c1838');
    q.E(32, 22, 13, 13, '#2c2650'); q.poly([[22, 14], [18, 0], [26, 8], [32, 0], [38, 8], [46, 0], [42, 14]], '#a0e0ff'); q.R(22, 12, 20, 3, '#68b8e0');
    q.eye(26, 22, 4, '#40d0ff', '#e8ffff'); q.eye(38, 22, 4, '#40d0ff', '#e8ffff'); q.R(26, 32, 12, 2, '#0e0a14');
    q.poly([[14, 34], [4, 28], [8, 44]], '#2c2650'); q.poly([[50, 34], [60, 28], [56, 44]], '#2c2650'); q.R(30, 40, 4, 14, '#68b8e0'); q.R(26, 44, 12, 3, '#a0e0ff');
    for (var i = 0; i < 6; i++) q.dot(10 + i * 9, 50 + (i % 2) * 6, '#a0e0ff');
  }, { hi: '#4a4488', lo: '#0a0818' });
  M('furuki', 64, function (q) { // クリア後: 古い火の影
    q.E(32, 36, 24, 24, '#8a3a1a'); q.E(32, 36, 17, 17, '#d85a1a'); q.E(32, 38, 10, 10, '#ffc040');
    q.poly([[14, 24], [8, 6], [24, 18]], '#d85a1a'); q.poly([[50, 24], [56, 6], [40, 18]], '#d85a1a'); q.poly([[24, 14], [32, 0], [40, 14]], '#d85a1a');
    q.eye(25, 34, 4, '#40d0ff', '#fff'); q.eye(39, 34, 4, '#40d0ff', '#fff'); q.R(26, 46, 12, 2, '#3a1008');
  }, { hi: '#ffe090', lo: '#5a1c08' });

  /* ---------- 戦闘背景 (240x96) ---------- */
  var BG = PF.battleBG = {};
  function bands(c, cols, y0, y1) {
    var x = c.getContext('2d'), n = cols.length, h = (y1 - y0) / n;
    cols.forEach(function (col, i) { x.fillStyle = col; x.fillRect(0, Math.round(y0 + i * h), 240, Math.ceil(h) + 1); });
  }
  function dither(c, y, h, col, density) {
    var x = c.getContext('2d'); x.fillStyle = col;
    for (var j = 0; j < h; j++) for (var i = (j % 2); i < 240; i += 2) if (((i * 7 + j * 13) % 10) / 10 < density) x.fillRect(i, y + j, 1, 1);
  }
  function stars(c, n, col, maxY) { var R = PF.seeded(5), x = c.getContext('2d'); x.fillStyle = col; for (var i = 0; i < n; i++) x.fillRect((R() * 240) | 0, (R() * maxY) | 0, 1, 1); }
  function treeRow(c, y, col, col2, sc) {
    var x = c.getContext('2d');
    for (var i = -10; i < 250; i += 22 * sc) { var h = 28 * sc; x.fillStyle = col; x.beginPath(); x.moveTo(i, y); x.lineTo(i + 10 * sc, y - h); x.lineTo(i + 20 * sc, y); x.fill(); x.fillStyle = col2; x.fillRect(i + 9 * sc, y, 3, 6); }
  }
  function mk96(f) { var c = PF.makeCanvas(240, 96); f(c, c.getContext('2d')); return c; }
  var BGDEF = {
    forest: function (c, x) { bands(c, ['#2a3a5c', '#33476a', '#3c5578'], 0, 50); stars(c, 24, '#c8d8f0', 30); treeRow(c, 60, '#1c3a38', '#3a2a1c', 1.3); treeRow(c, 66, '#264a40', '#3a2a1c', 1); bands(c, ['#d8e8f8', '#c4d6ec'], 60, 96); dither(c, 62, 10, '#b0c4e0', 0.4); },
    cave: function (c, x) { bands(c, ['#1c1828', '#241f34', '#2c2640'], 0, 56); dither(c, 40, 16, '#352e4c', 0.4); x.fillStyle = '#14101c'; for (var i = 0; i < 240; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 8, 22 + (i * 7 % 18)); x.lineTo(i + 16, 0); x.fill(); } bands(c, ['#4a4458', '#3e384e', '#322e44'], 56, 96); dither(c, 58, 10, '#5a546c', 0.4); },
    port: function (c, x) { bands(c, ['#f0c880', '#f4b878', '#e8a070', '#c8809a'], 0, 40); x.fillStyle = '#ffe8a0'; x.fillRect(180, 22, 18, 18); bands(c, ['#4880c0', '#3c70b0', '#3060a0'], 40, 70); dither(c, 40, 30, '#78a8e0', 0.2); bands(c, ['#b89860', '#a08450'], 70, 96); },
    lighthouse: function (c, x) { bands(c, ['#202c58', '#2c3a70', '#38488a'], 0, 46); stars(c, 30, '#e0e8ff', 36); bands(c, ['#304880', '#283c70', '#203060'], 46, 66); dither(c, 46, 20, '#587ab8', 0.25); bands(c, ['#5a5870', '#4a485e'], 66, 96); dither(c, 68, 8, '#706e88', 0.4); },
    snow: function (c, x) { bands(c, ['#8aa8d8', '#a4c0e8', '#c0d8f4'], 0, 44); x.fillStyle = '#e8f2ff'; x.beginPath(); x.moveTo(0, 56); x.lineTo(50, 18); x.lineTo(90, 56); x.fill(); x.beginPath(); x.moveTo(70, 56); x.lineTo(140, 8); x.lineTo(210, 56); x.fill(); x.fillStyle = '#b8cce8'; x.beginPath(); x.moveTo(140, 8); x.lineTo(210, 56); x.lineTo(150, 56); x.fill(); bands(c, ['#f4f8ff', '#e0eaf8', '#d0dcf0'], 56, 96); dither(c, 58, 10, '#c4d4ec', 0.4); },
    ice: function (c, x) { bands(c, ['#1c3258', '#264470', '#305688'], 0, 50); x.fillStyle = '#78c4e8'; for (var i = 0; i < 240; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 12, 26 + (i * 5 % 20)); x.lineTo(i + 24, 0); x.fill(); } bands(c, ['#a8e4f8', '#90d4f0', '#78c4e8'], 56, 96); dither(c, 58, 10, '#d0f4ff', 0.3); },
    volcano: function (c, x) { bands(c, ['#3a1418', '#5a1c1c', '#7a2820', '#a03c20'], 0, 50); x.fillStyle = '#2a1414'; x.beginPath(); x.moveTo(40, 56); x.lineTo(110, 14); x.lineTo(180, 56); x.fill(); x.fillStyle = '#ff7a20'; x.fillRect(104, 14, 12, 3); stars(c, 12, '#ffb060', 30); bands(c, ['#3c3038', '#322830', '#281e28'], 56, 96); x.fillStyle = '#f85820'; for (var j = 0; j < 4; j++) x.fillRect(20 + j * 60, 80 + (j % 2) * 6, 26, 2); },
    tower: function (c, x) { bands(c, ['#14101c', '#1c1628', '#241c34'], 0, 56); x.fillStyle = '#2c2440'; for (var i = 0; i < 240; i += 40) { x.fillRect(i + 6, 0, 10, 56); x.fillStyle = '#3a3052'; x.fillRect(i + 6, 0, 3, 56); x.fillStyle = '#2c2440'; } bands(c, ['#4a4468', '#3c3858', '#302c48'], 56, 96); dither(c, 58, 10, '#625c88', 0.3); },
    plain: function (c, x) { bands(c, ['#78b0e8', '#98c8f0', '#b8e0f8'], 0, 50); bands(c, ['#78c050', '#68b048', '#58a040'], 50, 96); dither(c, 52, 10, '#88d060', 0.4); },
    final: function (c, x) { bands(c, ['#0a0818', '#140e28', '#1c1438', '#281c4a'], 0, 56); stars(c, 50, '#a0e0ff', 50); x.fillStyle = '#1c2a58'; x.fillRect(0, 56, 240, 40); dither(c, 56, 40, '#a0e0ff', 0.12); dither(c, 56, 10, '#4878b8', 0.35); }
  };
  MON.bg = function (env) {
    if (!BG[env]) BG[env] = mk96(BGDEF[env] || BGDEF.plain);
    return BG[env];
  };
})();
