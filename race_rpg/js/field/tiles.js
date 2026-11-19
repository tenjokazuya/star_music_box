/* 地形タイル（16x16）。隣接タイルを見て縁取りや繋がりを描く */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, P = RR.Pal;
  var T = RR.Tiles = { defs: {} };
  var TS = T.SIZE = 16;

  // 描画コンテキスト: map キャンバスの (ox,oy) に描く
  function TC(g, ox, oy, x, y, nb, seed) {
    this.g = g; this.ox = ox; this.oy = oy; this.x = x; this.y = y; this.nbf = nb;
    this.r = U.rng(((x * 73856093) ^ (y * 19349663) ^ (seed || 0)) >>> 0);
  }
  TC.prototype.px = function (x, y, c) { this.g.fillStyle = c; this.g.fillRect(this.ox + x, this.oy + y, 1, 1); };
  TC.prototype.rect = function (x, y, w, h, c) { if (w <= 0 || h <= 0) return; this.g.fillStyle = c; this.g.fillRect(this.ox + x, this.oy + y, w, h); };
  TC.prototype.nb = function (dx, dy) { return this.nbf(this.x + dx, this.y + dy); };
  TC.prototype.is = function (dx, dy, group) {
    var id = this.nb(dx, dy);
    var d = T.defs[id];
    return !!(d && d.group === group);
  };
  TC.prototype.speck = function (n, colors, w, h) {
    for (var i = 0; i < n; i++) {
      var c = colors[Math.floor(this.r() * colors.length)];
      this.rect(Math.floor(this.r() * 16), Math.floor(this.r() * 16), w || 1, h || 1, c);
    }
  };
  T.TC = TC;

  function def(id, o) { o.id = id; T.defs[id] = o; }
  T.def = def;

  // ---------- 屋外 ----------
  var GR = ['#2c5424', '#3c7030', '#4c8034', '#58903c', '#78b050'];
  function grass(t, flowers) {
    t.rect(0, 0, 16, 16, GR[1]);
    // ディザで明暗のむら
    for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
      var n = U.hash2(t.x * 16 + x >> 2, t.y * 16 + y >> 2, 5);
      if (n > 0.72 && P.dither(x, y) < 0.5) t.px(x, y, GR[2]);
      else if (n < 0.2 && P.dither(x, y) < 0.4) t.px(x, y, GR[0]);
    }
    for (var i = 0; i < 7; i++) {
      var bx = Math.floor(t.r() * 15), by = Math.floor(t.r() * 14) + 1;
      t.px(bx, by, GR[0]); t.px(bx, by + 1, GR[0]); t.px(bx + 1, by - 1, GR[3]);
    }
    t.speck(4, [GR[3], GR[4]]);
    if (flowers) {
      var fc = ['#f8f8f8', '#f8e060', '#f890b0', '#b0a0f8'];
      for (i = 0; i < 3; i++) {
        var fx = 2 + Math.floor(t.r() * 12), fy = 2 + Math.floor(t.r() * 12), c = fc[Math.floor(t.r() * fc.length)];
        t.px(fx, fy - 1, c); t.px(fx - 1, fy, c); t.px(fx + 1, fy, c); t.px(fx, fy + 1, c); t.px(fx, fy, '#f8d040');
      }
    }
  }
  def('grass', { draw: function (t) { grass(t, false); edgeShadow(t); } });
  def('flower', { draw: function (t) { grass(t, true); edgeShadow(t); } });
  // 北側が高いもの（壁/崖/建物）の時に落ちる影
  function edgeShadow(t) {
    var n = T.defs[t.nb(0, -1)];
    if (n && n.tall) { t.g.globalAlpha = 0.3; t.rect(0, 0, 16, 3, '#101830'); t.g.globalAlpha = 0.18; t.rect(0, 3, 16, 2, '#101830'); t.g.globalAlpha = 1; }
  }
  T.edgeShadow = edgeShadow;

  var DT = ['#5c4024', '#7c5c34', '#8c6a3c', '#a07c4c'];
  def('dirt', {
    group: 'dirt',
    draw: function (t) {
      t.rect(0, 0, 16, 16, DT[1]);
      t.speck(10, [DT[0]]); t.speck(8, [DT[2]]); t.speck(4, [DT[3]], 2, 1);
      // 草との境目
      var self = this;
      [[0, -1, 0, 0, 16, 2], [0, 1, 0, 14, 16, 2], [-1, 0, 0, 0, 2, 16], [1, 0, 14, 0, 2, 16]].forEach(function (e) {
        var id = t.nb(e[0], e[1]);
        if (id === 'grass' || id === 'flower') {
          for (var i = 0; i < 16; i += 2) {
            var len = 1 + Math.floor(t.r() * 3);
            if (e[0] === 0) t.rect(i, e[1] < 0 ? 0 : 16 - len, 2, len, GR[1]);
            else t.rect(e[0] < 0 ? 0 : 16 - len, i, len, 2, GR[1]);
          }
        }
      });
      edgeShadow(t);
    }
  });

  var AS = ['#2c2c38', '#383844', '#444452', '#585868'];
  function asphalt(t) {
    t.rect(0, 0, 16, 16, AS[1]);
    t.speck(14, [AS[0]]); t.speck(10, [AS[2]]); t.speck(3, [AS[3]]);
    // 舗装の継ぎ目（たまに）
    if (t.r() < 0.12) { var y = Math.floor(t.r() * 16); t.rect(0, y, 16, 1, AS[0]); }
  }
  T.asphalt = asphalt;
  function roadEdges(t) {
    // 道でない隣接側にはわずかな影（側溝）
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
      if (!t.is(d[0], d[1], 'road')) {
        if (d[1] === -1) t.rect(0, 0, 16, 1, AS[0]);
        if (d[1] === 1) t.rect(0, 15, 16, 1, AS[0]);
        if (d[0] === -1) t.rect(0, 0, 1, 16, AS[0]);
        if (d[0] === 1) t.rect(15, 0, 1, 16, AS[0]);
      }
    });
  }
  def('road', { group: 'road', draw: function (t) { asphalt(t); roadEdges(t); } });
  def('road_ch', { group: 'road', draw: function (t) { asphalt(t); if ((t.x & 1) === 0) t.rect(2, 7, 12, 2, '#d8c868'); roadEdges(t); } });
  def('road_cv', { group: 'road', draw: function (t) { asphalt(t); if ((t.y & 1) === 0) t.rect(7, 2, 2, 12, '#d8c868'); roadEdges(t); } });
  def('road_wh', { group: 'road', draw: function (t) { asphalt(t); t.rect(0, 7, 16, 1, '#d0d0d8'); roadEdges(t); } });
  def('cross_h', { group: 'road', draw: function (t) { asphalt(t); for (var i = 1; i < 16; i += 4) t.rect(i, 1, 2, 14, '#d8d8e0'); } });
  def('cross_v', { group: 'road', draw: function (t) { asphalt(t); for (var i = 1; i < 16; i += 4) t.rect(1, i, 14, 2, '#d8d8e0'); } });
  def('park', { group: 'road', draw: function (t) { asphalt(t); t.rect(0, 0, 1, 16, '#d0d0d8'); roadEdges(t); } });
  def('park_t', { group: 'road', draw: function (t) { asphalt(t); t.rect(0, 0, 16, 1, '#d0d0d8'); t.rect(0, 0, 1, 10, '#d0d0d8'); roadEdges(t); } });

  var SW = ['#6c6c80', '#8c8ca4', '#a4a4b8', '#bcbccc'];
  def('walk', {
    group: 'walk',
    draw: function (t) {
      t.rect(0, 0, 16, 16, SW[2]);
      // 8x8の敷石
      t.rect(0, 7, 16, 1, SW[1]); t.rect(7, 0, 1, 16, SW[1]);
      t.rect(0, 0, 7, 1, SW[3]); t.rect(8, 0, 7, 1, SW[3]); t.rect(0, 8, 7, 1, SW[3]); t.rect(8, 8, 7, 1, SW[3]);
      t.speck(5, [SW[1]]);
      // 車道側の縁石
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        if (t.is(d[0], d[1], 'road')) {
          if (d[1] === 1) { t.rect(0, 13, 16, 2, '#d8d8e4'); t.rect(0, 15, 16, 1, SW[0]); }
          if (d[1] === -1) { t.rect(0, 0, 16, 2, '#d8d8e4'); t.rect(0, 2, 16, 1, SW[0]); }
          if (d[0] === -1) { t.rect(0, 0, 2, 16, '#d8d8e4'); t.rect(2, 0, 1, 16, SW[0]); }
          if (d[0] === 1) { t.rect(14, 0, 2, 16, '#d8d8e4'); t.rect(13, 0, 1, 16, SW[0]); }
        }
      });
      edgeShadow(t);
    }
  });
  def('brick', {
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#a85c44');
      for (var y = 0; y < 16; y += 4) {
        t.rect(0, y + 3, 16, 1, '#784030');
        var off = ((y >> 2) & 1) * 4;
        for (var x = off; x < 16; x += 8) t.rect(x, y, 1, 3, '#784030');
        for (x = off + 1; x < 16; x += 8) t.rect(x, y, 3, 1, '#c07858');
      }
      t.speck(3, ['#8c4c38']);
      edgeShadow(t);
    }
  });
  def('gravel', {
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#8c8478');
      t.speck(20, ['#6c6458']); t.speck(16, ['#a8a090']); t.speck(5, ['#c0b8a8']);
      edgeShadow(t);
    }
  });
  def('conc', {
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#9c9ca8');
      t.speck(8, ['#8c8c98']); t.speck(6, ['#acacb8']);
      if ((t.x % 3) === 0) t.rect(0, 0, 1, 16, '#80808c');
      if ((t.y % 3) === 0) t.rect(0, 0, 16, 1, '#80808c');
      if (t.r() < 0.15) { var ox = 3 + Math.floor(t.r() * 8), oy = 3 + Math.floor(t.r() * 8); t.rect(ox, oy, 4, 3, '#707078'); t.rect(ox + 1, oy - 1, 2, 5, '#707078'); }
      edgeShadow(t);
    }
  });
  def('stone', {
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#5c5c68');
      var rects = [[1, 1, 6, 5], [8, 1, 7, 4], [1, 7, 4, 8], [6, 7, 9, 3], [6, 11, 4, 4], [11, 6, 4, 9]];
      rects.forEach(function (r) {
        t.rect(r[0], r[1], r[2], r[3], '#9898a4');
        t.rect(r[0], r[1], r[2], 1, '#b0b0bc');
        t.rect(r[0], r[1] + r[3] - 1, r[2], 1, '#7c7c88');
      });
      edgeShadow(t);
    }
  });
  def('step', {
    tall: false,
    draw: function (t) {
      for (var y = 0; y < 16; y += 4) {
        t.rect(0, y, 16, 3, '#a4a4b0'); t.rect(0, y, 16, 1, '#c4c4d0'); t.rect(0, y + 3, 16, 1, '#5c5c68');
      }
    }
  });
  // 水（アニメーション）
  def('water', {
    solid: true, anim: 2,
    draw: function (t, frame) {
      t.rect(0, 0, 16, 16, '#284c88');
      for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
        var n = U.hash2(t.x * 16 + x >> 2, t.y * 16 + y >> 1, 9);
        if (n > 0.7) t.px(x, y, '#305898');
      }
      var f = frame || 0;
      for (var i = 0; i < 3; i++) {
        var wx = (i * 6 + f * 3 + t.x * 5) % 14, wy = (i * 5 + t.y * 3) % 14;
        t.rect(wx, wy, 3, 1, '#68a0d8'); t.px(wx + 1, wy - 1 < 0 ? 0 : wy - 1, '#a0c8f0');
      }
      if (!t.is(0, -1, 'water')) { t.rect(0, 0, 16, 2, '#183060'); t.rect(0, 2, 16, 1, '#4070b0'); }
    }
  });
  T.defs.water.group = 'water';
  // 崖・岩壁
  def('rock', {
    solid: true, tall: true, group: 'rock',
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#5c5048');
      for (var i = 0; i < 6; i++) {
        var x = Math.floor(t.r() * 12), y = Math.floor(t.r() * 12), w = 3 + Math.floor(t.r() * 4), h = 2 + Math.floor(t.r() * 3);
        t.rect(x, y, w, h, '#786a5c'); t.rect(x, y, w, 1, '#948474'); t.rect(x, y + h, w, 1, '#3c342c');
      }
      if (!t.is(0, -1, 'rock')) { t.rect(0, 0, 16, 2, GR[2]); t.rect(0, 2, 16, 1, GR[0]); for (var k = 0; k < 16; k += 3) t.px(k, 3, GR[1]); }
      if (!t.is(0, 1, 'rock')) t.rect(0, 15, 16, 1, '#2c2420');
    }
  });
  // 森（マップの外周を埋める密集した木々）
  def('forest', {
    solid: true, tall: true, group: 'forest',
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#14301c');
      var L = ['#18401c', '#28602c', '#408040', '#68a050'];
      for (var i = 0; i < 5; i++) {
        var cx = Math.floor(t.r() * 16), cy = Math.floor(t.r() * 16), r = 4 + Math.floor(t.r() * 3);
        for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          var px = cx + x, py = cy + y;
          if (px < 0 || py < 0 || px > 15 || py > 15) continue;
          var l = (x + y < -r * 0.6) ? 3 : (x + y < 0) ? 2 : (x + y < r * 0.7) ? 1 : 0;
          if (l === 3 && P.dither(px, py) > 0.5) l = 2;
          t.px(px, py, L[l]);
        }
      }
      if (!t.is(0, 1, 'forest')) { t.rect(0, 13, 16, 3, '#0c2010'); for (var k = 1; k < 16; k += 5) t.rect(k, 12, 2, 4, '#3c2818'); }
    }
  });
  // フェンス（草地の上に描く、繋がりを自動判定）
  def('fence', {
    solid: true, group: 'fence',
    draw: function (t) {
      grass(t, false);
      var wood = '#a07040', dk = '#604020', lt = '#c89058';
      var h = t.is(-1, 0, 'fence') || t.is(1, 0, 'fence');
      var v = t.is(0, -1, 'fence') || t.is(0, 1, 'fence');
      if (h || !v) {
        t.rect(0, 5, 16, 2, wood); t.rect(0, 5, 16, 1, lt); t.rect(0, 10, 16, 2, wood); t.rect(0, 12, 16, 1, dk);
        t.rect(2, 3, 2, 12, wood); t.rect(2, 3, 1, 12, lt); t.rect(12, 3, 2, 12, wood); t.rect(13, 3, 1, 12, dk);
        t.rect(2, 15, 2, 1, '#203018'); t.rect(12, 15, 2, 1, '#203018');
      }
      if (v) {
        t.rect(7, 0, 2, 16, wood); t.rect(7, 0, 1, 16, lt); t.rect(9, 0, 1, 16, dk);
      }
    }
  });
  // ガードレール
  def('rail', {
    solid: true, group: 'rail',
    draw: function (t) {
      var under = t.nb(0, 0 + 1) === 'road' ? 'road' : 'grass';
      grass(t, false);
      var v = t.is(0, -1, 'rail') || t.is(0, 1, 'rail');
      if (v && !(t.is(-1, 0, 'rail') || t.is(1, 0, 'rail'))) {
        t.rect(6, 0, 4, 16, '#c8ccd8'); t.rect(6, 0, 1, 16, '#f0f0f8'); t.rect(9, 0, 1, 16, '#80849c');
        t.rect(5, 6, 1, 4, '#606478');
      } else {
        t.rect(0, 6, 16, 4, '#c8ccd8'); t.rect(0, 6, 16, 1, '#f0f0f8'); t.rect(0, 9, 16, 1, '#80849c');
        t.rect(3, 10, 2, 5, '#707488'); t.rect(11, 10, 2, 5, '#707488');
      }
    }
  });
  def('hedge', {
    solid: true, tall: true, group: 'hedge',
    draw: function (t) {
      grass(t, false);
      var L = ['#18401c', '#28602c', '#3c7838', '#5c9848'];
      t.rect(0, 2, 16, 13, L[1]);
      for (var i = 0; i < 10; i++) { var x = Math.floor(t.r() * 14), y = 2 + Math.floor(t.r() * 10); t.rect(x, y, 2, 2, L[2]); t.px(x, y, L[3]); }
      t.rect(0, 13, 16, 2, L[0]);
      if (!t.is(0, -1, 'hedge')) { t.rect(0, 2, 16, 1, L[3]); t.rect(0, 1, 16, 1, L[2]); }
    }
  });
  def('void', { solid: true, draw: function (t) { t.rect(0, 0, 16, 16, '#080810'); } });
  def('sky', { solid: true, draw: function (t) { t.rect(0, 0, 16, 16, '#101830'); } });

  // ---------- 屋内 ----------
  def('wood', {
    draw: function (t) {
      var c = ['#6c4424', '#8c5c34', '#a07040', '#b88450'];
      t.rect(0, 0, 16, 16, c[2]);
      for (var y = 0; y < 16; y += 4) {
        t.rect(0, y + 3, 16, 1, c[0]);
        t.rect(0, y, 16, 1, c[3]);
        var seam = ((t.y * 4 + (y >> 2)) * 7 + t.x * 5) % 16;
        t.rect(seam, y, 1, 3, c[0]);
        if (t.r() < 0.5) t.rect(Math.floor(t.r() * 12), y + 1, 3, 1, c[1]);
      }
      edgeShadow(t);
    }
  });
  def('tile', {
    draw: function (t) {
      var a = ((t.x + t.y) & 1) ? '#d8d8e0' : '#b8bcc8';
      t.rect(0, 0, 16, 16, a);
      t.rect(0, 0, 16, 1, '#f0f0f8'); t.rect(0, 0, 1, 16, '#f0f0f8'); t.rect(15, 0, 1, 16, '#9c9cac'); t.rect(0, 15, 16, 1, '#9c9cac');
      edgeShadow(t);
    }
  });
  ['red', 'blue', 'green', 'beige'].forEach(function (k) {
    var base = { red: '#a03838', blue: '#384c98', green: '#3c7848', beige: '#c8b490' }[k];
    def('carpet_' + k, {
      draw: function (t) {
        t.rect(0, 0, 16, 16, base);
        for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) if (((x + y) & 3) === 0) t.px(x, y, P.shade(base, -0.12));
        t.speck(4, [P.shade(base, 0.15)]);
        edgeShadow(t);
      }
    });
  });
  def('tatami', {
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#b8b070');
      for (var y = 0; y < 16; y += 2) t.rect(0, y, 16, 1, '#a8a060');
      if ((t.x + t.y) & 1) { t.rect(0, 0, 16, 2, '#3c5030'); } else { t.rect(0, 0, 2, 16, '#3c5030'); }
      edgeShadow(t);
    }
  });
  def('garage', {
    draw: function (t) {
      t.rect(0, 0, 16, 16, '#6c6c78');
      t.speck(10, ['#5c5c68']); t.speck(6, ['#7c7c88']);
      if (t.r() < 0.25) { var ox = 2 + Math.floor(t.r() * 8), oy = 2 + Math.floor(t.r() * 8); t.rect(ox, oy, 5, 3, '#4c4c58'); t.rect(ox + 1, oy - 1, 3, 5, '#4c4c58'); }
      if (t.y % 4 === 0) t.rect(0, 0, 16, 1, '#585864');
      edgeShadow(t);
    }
  });
  // 壁（屋内）: style をマップ毎に変えたい時は wall_xxx を使う
  function wallTile(paper, line) {
    return {
      solid: true, tall: true, group: 'wall',
      draw: function (t) {
        var above = T.defs[t.nb(0, -1)];
        var top = !(above && above.group === 'wall');
        t.rect(0, 0, 16, 16, paper);
        for (var x = 0; x < 16; x += 4) t.rect(x, 0, 1, 16, line);
        if (!t.is(0, 1, 'wall')) {
          t.rect(0, 12, 16, 4, '#5c3c24'); t.rect(0, 12, 16, 1, '#7c5434'); t.rect(0, 15, 16, 1, '#2c1c10');
        }
        if (top) { t.rect(0, 0, 16, 3, '#28202c'); t.rect(0, 3, 16, 1, P.shade(paper, -0.3)); }
      }
    };
  }
  def('wall', wallTile('#d8ccb0', '#c8bc9c'));
  def('wall_blue', wallTile('#a8b8d0', '#98a8c0'));
  def('wall_green', wallTile('#b8c8a0', '#a8b890'));
  def('wall_pink', wallTile('#e0c0c0', '#d0b0b0'));
  def('wall_gray', wallTile('#9c9cac', '#8c8c9c'));
  def('wall_wood', wallTile('#906040', '#7c5034'));
  def('mat', {
    draw: function (t) {
      T.defs.wood.draw(t);
      t.rect(2, 4, 12, 9, '#783030'); t.rect(3, 5, 10, 7, '#984040');
      for (var x = 4; x < 12; x += 2) t.rect(x, 6, 1, 5, '#a85050');
    }
  });
})();
