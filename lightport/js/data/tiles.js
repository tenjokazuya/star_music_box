/* tiles.js — 地面タイル（16×16）のドット絵とパレット。実行時に canvas へ描いて作る。
 *
 * タイル定義: Game.tiles.defs[名前] = { solid, step(足音の種類), anim(アニメする), draw(g, c) }
 *   draw の c: { x, y (タイル座標), f (アニメのコマ 0〜5), r (タイルごとの種つき乱数), nb(dx,dy) (隣のタイル名) }
 * 描画は g の原点がタイルの左上になっている。
 */
(function () {
  'use strict';

  /* ---- パレット（GBA 風に少ない色を系統ごとにそろえる） ---- */
  var P = Game.pal = {
    ink: '#241a2e', white: '#f6f4ee',
    g1: '#86d472', g2: '#62b85c', g3: '#46a052', g4: '#2e7c48',
    d1: '#e8cc96', d2: '#d6b47c', d3: '#b9955e', d4: '#8f6e44',
    s1: '#f8ecc6', s2: '#eed8a4', s3: '#d9bd86', s4: '#b89c64',
    w1: '#a4dcfa', w2: '#62b4f0', w3: '#3c8edc', w4: '#2a6cbc', w5: '#1e4e9c', foam: '#f4fbff',
    r1: '#dcdce6', r2: '#b0b0c4', r3: '#84849e', r4: '#5c5c78', r5: '#3c3c56',
    k1: '#dcaa6e', k2: '#bc8a50', k3: '#92683a', k4: '#6a4a2a', k5: '#4a321e',
    p1: '#f2e6cc', p2: '#e2d2b0', p3: '#c6b290', p4: '#a08e70',
    red1: '#e46450', red2: '#bc4038', red3: '#8c2c30',
    blu1: '#5c8ce0', blu2: '#4068bc', blu3: '#2c4c90',
    c1: '#8c7a70', c2: '#6c5e58', c3: '#51454a', c4: '#3a3038', c5: '#282028',
    yel: '#f6d04a', yel2: '#dca828', org: '#f0963c', pink: '#f4a0bc'
  };

  var tiles = Game.tiles = { defs: {}, ANIM_FRAMES: 6, ANIM_RATE: 10 };

  function def(name, props, draw) {
    var d = { name: name, solid: false, step: 'grass', anim: false, draw: draw };
    for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k)) { d[k] = props[k]; } }
    tiles.defs[name] = d;
  }

  function fill(g, c) { g.fillStyle = c; g.fillRect(0, 0, 16, 16); }
  function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function isGrass(n) { return n && n.indexOf('grass') === 0; }
  function isWater(n) { return n === 'water' || n === 'deep'; }
  function isSandy(n) { return n === 'sand'; }

  /** 隣が別の地面のとき、その縁にでこぼこの境目を描く */
  function blend(g, c, test, colors) {
    var sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (var s = 0; s < 4; s++) {
      var dx = sides[s][0], dy = sides[s][1];
      if (!test(c.nb(dx, dy))) { continue; }
      for (var i = 0; i < 16; i++) {
        var depth = 1 + c.r.int(3);
        for (var d = 0; d < depth; d++) {
          var x = dx === 0 ? i : (dx < 0 ? d : 15 - d);
          var y = dy === 0 ? i : (dy < 0 ? d : 15 - d);
          px(g, x, y, colors[d === depth - 1 ? 1 : 0]);
        }
      }
    }
  }

  /* ================= 屋外 ================= */
  def('grass', { step: 'grass' }, function (g, c) {
    fill(g, P.g2);
    var r = c.r, i, x, y;
    for (i = 0; i < 7; i++) {
      x = r.int(14) + 1; y = r.int(12) + 3;
      px(g, x, y, P.g3); px(g, x + 1, y, P.g3); px(g, x, y - 1, P.g1);
    }
    for (i = 0; i < 3; i++) { px(g, r.int(16), r.int(16), P.g1); }
    px(g, r.int(16), r.int(16), P.g4);
  });
  def('grass_f', { step: 'grass' }, function (g, c) {
    tiles.defs.grass.draw(g, c);
    var cols = [['#ffffff', P.yel], [P.pink, '#ffffff'], [P.yel, P.org]];
    for (var i = 0; i < 3; i++) {
      var x = 2 + i * 5 + c.r.int(3), y = 3 + c.r.int(10), k = cols[(c.x + c.y + i) % 3];
      px(g, x, y, k[1]); px(g, x - 1, y, k[0]); px(g, x + 1, y, k[0]); px(g, x, y - 1, k[0]); px(g, x, y + 1, k[0]);
      px(g, x, y + 2, P.g4);
    }
  });
  def('grass_t', { step: 'grass' }, function (g, c) {   // のびた草
    fill(g, P.g3);
    var r = c.r, i;
    for (i = 0; i < 9; i++) {
      var x = r.int(15) + 1, y = r.int(11) + 4;
      px(g, x, y, P.g2); px(g, x, y - 1, P.g2); px(g, x - 1, y - 2, P.g1); px(g, x + 1, y - 2, P.g1); px(g, x, y - 2, P.g1);
    }
    for (i = 0; i < 4; i++) { px(g, r.int(16), r.int(16), P.g4); }
  });

  def('dirt', { step: 'grass' }, function (g, c) {
    fill(g, P.d2);
    var r = c.r, i;
    for (i = 0; i < 9; i++) { px(g, r.int(16), r.int(16), P.d3); }
    for (i = 0; i < 6; i++) { px(g, r.int(16), r.int(16), P.d1); }
    for (i = 0; i < 2; i++) { var x = r.int(14), y = r.int(14); px(g, x, y, P.d4); px(g, x + 1, y, P.d3); }
    blend(g, c, isGrass, [P.g3, P.g2]);
    blend(g, c, isWater, [P.s3, P.s2]);
  });

  def('sand', { step: 'sand' }, function (g, c) {
    fill(g, P.s2);
    var r = c.r, i;
    for (i = 0; i < 8; i++) { px(g, r.int(16), r.int(16), P.s3); }
    for (i = 0; i < 6; i++) { px(g, r.int(16), r.int(16), P.s1); }
    if (r.int(4) === 0) { var x = r.int(13), y = r.int(14); px(g, x, y, P.s4); px(g, x + 1, y, P.s4); px(g, x + 1, y - 1, P.s3); }
    // 水ぎわは濡れた砂で暗く
    var sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (var s = 0; s < 4; s++) {
      var dx = sides[s][0], dy = sides[s][1];
      if (!isWater(c.nb(dx, dy))) { continue; }
      for (var k = 0; k < 16; k++) {
        var d2 = 2 + ((k + c.x * 3 + c.y) % 3 === 0 ? 1 : 0);
        for (var d = 0; d < d2; d++) {
          px(g, dx === 0 ? k : (dx < 0 ? d : 15 - d), dy === 0 ? k : (dy < 0 ? d : 15 - d), d === d2 - 1 ? P.s3 : P.s4);
        }
      }
    }
    blend(g, c, isGrass, [P.g3, P.g2]);
  });

  /** 水: 全体の座標でなみが連続して流れる。岸には泡 */
  function waterBase(g, c, deep) {
    var base = deep ? P.w4 : P.w3, hi = deep ? P.w3 : P.w2, sp = deep ? P.w2 : P.w1;
    fill(g, base);
    var gx0 = c.x * 16, gy0 = c.y * 16, f = c.f;
    for (var y = 0; y < 16; y++) {
      var gy = gy0 + y;
      if (gy % 4 !== 1) { continue; }
      for (var x = 0; x < 16; x++) {
        var gx = gx0 + x;
        var k = (gx + 5 * Math.floor(gy / 4) + f * 2) % 12;
        if (k < 3) { px(g, x, y, hi); }
        if (k === 1 && (Math.floor(gy / 4) + Math.floor(gx / 12)) % 3 === 0) { px(g, x, y, sp); }
      }
    }
    // ところどころ暗い筋
    for (var y2 = 0; y2 < 16; y2++) {
      var gy2 = gy0 + y2;
      if (gy2 % 8 !== 5) { continue; }
      for (var x2 = 0; x2 < 16; x2++) {
        if (((gx0 + x2) + Math.floor(gy2 / 8) * 7 - f * 2 + 120) % 16 < 2) { px(g, x2, y2, deep ? P.w5 : P.w4); }
      }
    }
  }
  function foam(g, c) {
    var sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    var wave = [0, 1, 2, 2, 1, 0][c.f % 6];
    for (var s = 0; s < 4; s++) {
      var dx = sides[s][0], dy = sides[s][1];
      var n = c.nb(dx, dy);
      if (isWater(n) || n === 'void' || n === 'cliff') { continue; }
      for (var k = 0; k < 16; k++) {
        var d = 1 + wave + (((k + c.x * 5 + c.y * 3) % 5 === 0) ? 1 : 0);
        for (var j = 0; j < d; j++) {
          var xx = dx === 0 ? k : (dx < 0 ? j : 15 - j);
          var yy = dy === 0 ? k : (dy < 0 ? j : 15 - j);
          px(g, xx, yy, j === d - 1 ? P.foam : P.w1);
        }
      }
    }
  }
  def('water', { solid: true, anim: true, step: 'water', water: true }, function (g, c) { waterBase(g, c, false); foam(g, c); });
  def('deep', { solid: true, anim: true, step: 'water', water: true }, function (g, c) { waterBase(g, c, true); foam(g, c); });

  def('cobble', { step: 'stone' }, function (g, c) {
    fill(g, P.r4);
    var cells = [[0, 0, 7, 7], [8, 0, 8, 6], [0, 8, 6, 8], [7, 7, 9, 9]];
    cells.forEach(function (q, i) {
      rect(g, q[0] + 1, q[1] + 1, q[2] - 2, q[3] - 2, i % 2 ? P.r2 : P.r1);
      rect(g, q[0] + 1, q[1] + q[3] - 2, q[2] - 2, 1, P.r3);
      px(g, q[0] + 1, q[1] + 1, P.white);
    });
    blend(g, c, isGrass, [P.g3, P.g2]);
  });

  def('plank', { step: 'wood' }, function (g, c) {
    fill(g, P.k2);
    for (var y = 0; y < 16; y += 4) {
      rect(g, 0, y, 16, 1, P.k1);
      rect(g, 0, y + 3, 16, 1, P.k4);
      var off = ((c.x + c.y + (y >> 2)) % 2) ? 5 : 11;
      rect(g, off, y, 1, 4, P.k3);
      px(g, off - 2, y + 1, P.k4); px(g, off + 2, y + 1, P.k4);
      if (c.r.int(3) === 0) { px(g, c.r.int(16), y + 1, P.k3); }
    }
  });

  def('cliff', { solid: true, step: 'stone' }, function (g, c) {
    var above = c.nb(0, -1) === 'cliff', below = c.nb(0, 1) === 'cliff';
    fill(g, P.r3);
    var r = c.r, i;
    for (i = 0; i < 6; i++) { var x = r.int(16); rect(g, x, 0, 1, 16, i % 2 ? P.r4 : P.r2); }
    for (i = 0; i < 8; i++) { px(g, r.int(16), r.int(16), P.r5); }
    if (!above) { rect(g, 0, 0, 16, 4, P.r2); rect(g, 0, 0, 16, 1, P.r1); rect(g, 0, 4, 16, 1, P.r4); }
    if (!below) { rect(g, 0, 13, 16, 3, P.r4); rect(g, 0, 15, 16, 1, P.r5); }
  });

  def('cave_door', { step: 'cave' }, function (g, c) {   // ほらあなの入口（暗いあな）
    fill(g, P.r3);
    rect(g, 0, 0, 16, 16, P.r4);
    rect(g, 2, 3, 12, 13, P.r5); rect(g, 3, 2, 10, 2, P.r5); rect(g, 4, 1, 8, 1, P.r5);
    rect(g, 3, 4, 10, 12, '#120c1c'); rect(g, 4, 3, 8, 1, '#120c1c');
    rect(g, 5, 7, 6, 9, '#08040e');
    rect(g, 1, 4, 2, 12, P.r2); rect(g, 13, 4, 2, 12, P.r2);
    rect(g, 3, 2, 1, 2, P.r2); rect(g, 12, 2, 1, 2, P.r2); rect(g, 4, 1, 8, 1, P.r2);
    for (var i = 0; i < 6; i++) { px(g, c.r.int(16), c.r.int(16), P.r5); }
  });

  def('rockfloor', { step: 'stone' }, function (g, c) {
    fill(g, P.r2);
    var r = c.r, i;
    for (i = 0; i < 9; i++) { px(g, r.int(16), r.int(16), P.r3); }
    for (i = 0; i < 5; i++) { px(g, r.int(16), r.int(16), P.r1); }
    blend(g, c, isGrass, [P.g3, P.g2]);
  });

  def('void', { solid: true, step: 'stone' }, function (g) { fill(g, '#000000'); });

  /* ================= 屋内 ================= */
  def('floor', { step: 'wood' }, function (g, c) {
    fill(g, '#dba46a');
    for (var y = 0; y < 16; y += 4) {
      rect(g, 0, y + 3, 16, 1, '#b8844c');
      rect(g, 0, y, 16, 1, '#e8b87c');
      var off = ((c.x * 3 + (y >> 2) * 5 + c.y) % 3) * 5 + 3;
      rect(g, off, y, 1, 4, '#b8844c');
    }
    if (c.r.int(4) === 0) { px(g, c.r.int(16), c.r.int(16), '#c8945a'); }
  });
  def('floor_d', { step: 'wood' }, function (g, c) {   // 少し暗い床（かげ）
    tiles.defs.floor.draw(g, c);
    g.globalAlpha = 0.22; fill(g, '#2a1a3a'); g.globalAlpha = 1;
  });
  def('wall', { solid: true, step: 'wood' }, function (g, c) {
    fill(g, '#efe2c6');
    for (var x = 0; x < 16; x += 4) { rect(g, x, 0, 1, 16, '#e4d4b4'); }
    rect(g, 0, 0, 16, 2, '#c8a878'); rect(g, 0, 2, 16, 1, '#a88858');
    rect(g, 0, 14, 16, 2, '#e4d4b4');
    if (c.r.int(3) === 0) { px(g, c.r.int(16), 5 + c.r.int(8), '#d8c8a6'); }
  });
  def('wallb', { solid: true, step: 'wood' }, function (g) {   // 壁の下側（腰板つき）
    fill(g, '#efe2c6');
    rect(g, 0, 0, 16, 1, '#c8a878');
    rect(g, 0, 3, 16, 13, '#b4804a');
    rect(g, 0, 3, 16, 1, '#dca56a');
    rect(g, 0, 2, 16, 1, '#8a5c34');
    for (var x = 0; x < 16; x += 8) { rect(g, x, 4, 1, 12, '#8e6238'); rect(g, x + 1, 4, 1, 11, '#c8905a'); }
    rect(g, 0, 15, 16, 1, '#5a3a22');
  });
  def('rug', { step: 'wood' }, function (g, c) {
    fill(g, '#c85048');
    rect(g, 0, 0, 16, 2, '#f2d078'); rect(g, 0, 14, 16, 2, '#f2d078');
    rect(g, 2, 2, 12, 1, '#a03838'); rect(g, 2, 13, 12, 1, '#a03838');
    for (var x = 2; x < 16; x += 4) { px(g, x, 7, '#f2d078'); px(g, x + 1, 8, '#f2d078'); px(g, x, 9, '#f2d078'); px(g, x - 1, 8, '#f2d078'); }
  });

  def('stone', { step: 'stone' }, function (g, c) {
    var a = (c.x + c.y) % 2 === 0;
    fill(g, a ? P.r2 : P.r1);
    rect(g, 0, 0, 16, 1, P.r3); rect(g, 0, 0, 1, 16, P.r3);
    rect(g, 0, 15, 16, 1, P.r4); rect(g, 15, 0, 1, 16, P.r4);
    if (c.r.int(3) === 0) { px(g, 3 + c.r.int(10), 3 + c.r.int(10), P.r3); }
    if (c.r.int(4) === 0) { var x = 2 + c.r.int(10), y = 3 + c.r.int(9); px(g, x, y, P.r3); px(g, x + 1, y + 1, P.r3); }
  });
  def('stonewall', { solid: true, step: 'stone' }, function (g, c) {
    fill(g, P.r3);
    for (var y = 0; y < 16; y += 4) {
      rect(g, 0, y + 3, 16, 1, P.r5);
      rect(g, 0, y, 16, 1, P.r2);
      var off = (y >> 2) % 2 ? 4 : 11;
      rect(g, off, y, 1, 4, P.r5);
      rect(g, (off + 8) % 16, y, 1, 4, P.r5);
    }
    if (c.nb(0, -1) !== 'stonewall') { rect(g, 0, 0, 16, 1, P.r1); }
    if (c.nb(0, 1) !== 'stonewall') { rect(g, 0, 13, 16, 3, P.r4); rect(g, 0, 15, 16, 1, P.r5); }
  });
  def('stairs', { step: 'stone' }, function (g) {
    fill(g, P.r4);
    for (var i = 0; i < 4; i++) {
      var y = i * 4;
      rect(g, 0, y, 16, 3, [P.r1, P.r2, P.r2, P.r3][i]);
      rect(g, 0, y + 3, 16, 1, P.r5);
      rect(g, 0, y, 1, 4, P.r3); rect(g, 15, y, 1, 4, P.r5);
    }
    // 昇りの矢印のような明かり
    rect(g, 6, 5, 4, 1, P.white); rect(g, 7, 4, 2, 1, P.white);
  });
  def('stairs_d', { step: 'stone' }, function (g) {   // くだり
    fill(g, P.r4);
    for (var i = 0; i < 4; i++) {
      var y = i * 4;
      rect(g, 0, y, 16, 3, [P.r3, P.r3, P.r2, P.r2][i]);
      rect(g, 0, y + 3, 16, 1, P.r5);
    }
    rect(g, 7, 10, 2, 1, P.white); rect(g, 6, 11, 4, 1, P.white);
  });

  /* ================= ほらあな ================= */
  def('cfloor', { step: 'cave' }, function (g, c) {
    fill(g, '#6e5e5c');
    var r = c.r, i;
    for (i = 0; i < 10; i++) { px(g, r.int(16), r.int(16), '#5c4e4e'); }
    for (i = 0; i < 6; i++) { px(g, r.int(16), r.int(16), '#82706a'); }
    if (r.int(3) === 0) { var x = r.int(12), y = r.int(14); px(g, x, y, '#463a3c'); px(g, x + 1, y + 1, '#463a3c'); px(g, x + 2, y + 1, '#463a3c'); }
  });
  def('cwall', { solid: true, step: 'cave' }, function (g, c) {
    var below = c.nb(0, 1) === 'cwall';
    fill(g, '#3e3446');
    var r = c.r, i;
    for (i = 0; i < 9; i++) { px(g, r.int(16), r.int(16), '#2e2636'); }
    for (i = 0; i < 6; i++) { px(g, r.int(16), r.int(16), '#52465c'); }
    if (!below) {
      rect(g, 0, 8, 16, 8, '#5a4c62');
      for (i = 0; i < 16; i += 3) { rect(g, i, 8, 1, 8, '#463a52'); }
      rect(g, 0, 8, 16, 1, '#7a6a82');
      rect(g, 0, 14, 16, 2, '#2e2636');
    }
  });

  /** 絵を 1 枚作る（マップの事前描画から呼ばれる） */
  tiles.draw = function (g, name, tx, ty, frame, nb) {
    var d = tiles.defs[name];
    if (!d) { throw new Error('タイルがない: ' + name); }
    var seed = (tx * 73856093) ^ (ty * 19349663) ^ name.charCodeAt(0) * 83492791;
    g.save();
    g.translate(tx * 16, ty * 16);
    d.draw(g, { x: tx, y: ty, f: frame, r: Game.util.rng(seed), nb: nb });
    g.restore();
  };
})();
