(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Util = Orgel.Util;
  var rgba = Util.rgba;
  var lighten = Util.lighten;
  var darken = Util.darken;
  var mix = Util.mix;
  var TAU = Math.PI * 2;

  /**
   * 描画部品（ほしのこ・おうち・床・かべ・各ギミック）。すべてCanvasの図形で描く。
   * 座標は呼び出し側が決める。c はセルの大きさ(px)。仕様: managements/project/game-design.md §8。
   */

  /** ほしのこの色（A〜D）。hat は頭の飾りの色 */
  var ORB_COLORS = [
    { name: 'あかね', letter: 'あ', base: '#ff6b81', light: '#ffb8c4', dark: '#c93a58', glow: '#ff8fa3', hat: '#ffe3e8' },
    { name: 'ひかり', letter: 'ひ', base: '#ffd166', light: '#fff1b8', dark: '#d99a1f', glow: '#ffe08a', hat: '#fff8de' },
    { name: 'そら', letter: 'そ', base: '#4cc9f0', light: '#b8eeff', dark: '#1f8fb8', glow: '#7fdcff', hat: '#dff7ff' },
    { name: 'みどり', letter: 'み', base: '#6ee7a8', light: '#c8ffe2', dark: '#2fae78', glow: '#9affc8', hat: '#e3fff1' },
  ];

  var INK = '#3a2152'; // 顔の線の色

  /** 方向の角度（0=上 1=右 2=下 3=左） */
  var DIR_ANGLE = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------------------------------------------------------------------------
  // 頭の飾り（色ごとに形が違う。色が見分けにくい人でも判別できる）
  // ---------------------------------------------------------------------------

  /** 飾りの形を原点中心のパスとして作る（大きさ s）。bottom は形の下端（原点からの距離/s） */
  var HAT_BOTTOM = [0.9, 0.85, 0.85, 1.1];
  function hatPath(ctx, ci, s) {
    ctx.beginPath();
    if (ci === 0) { // まる（ぽんぽん）
      ctx.arc(0, 0, s * 0.9, 0, TAU);
    } else if (ci === 1) { // さんかく（とんがり帽子）
      ctx.moveTo(0, -s * 1.1);
      ctx.lineTo(s * 0.95, s * 0.85);
      ctx.lineTo(-s * 0.95, s * 0.85);
      ctx.closePath();
    } else if (ci === 2) { // しかく（かくかく帽子）
      var h = s * 0.85;
      roundRect(ctx, -h, -h, h * 2, h * 2, s * 0.28);
    } else { // ひしがた（宝石）
      ctx.moveTo(0, -s * 1.1);
      ctx.lineTo(s * 0.8, 0);
      ctx.lineTo(0, s * 1.1);
      ctx.lineTo(-s * 0.8, 0);
      ctx.closePath();
    }
  }

  function drawTopper(ctx, ci, R, col) {
    var s = R * 0.3;
    var cy = -R * 0.86 - HAT_BOTTOM[ci] * s;
    ctx.save();
    ctx.translate(0, cy);
    if (ci === 2) ctx.rotate(-0.12);
    hatPath(ctx, ci, s);
    var g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, col.hat);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, R * 0.06);
    ctx.strokeStyle = rgba(col.dark, 0.9);
    ctx.stroke();
    // 飾りの中の小さな模様
    ctx.fillStyle = rgba(col.base, 0.9);
    if (ci === 0) {
      ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.25, s * 0.22, 0, TAU); ctx.fill();
    } else if (ci === 1) {
      ctx.beginPath(); ctx.arc(0, -s * 1.12, s * 0.28, 0, TAU); ctx.fill();
      ctx.fillRect(-s * 0.6, s * 0.15, s * 1.2, s * 0.22);
    } else if (ci === 2) {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.32, 0); ctx.lineTo(0, s * 0.5); ctx.lineTo(-s * 0.32, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // ほしのこ
  // ---------------------------------------------------------------------------

  function drawEye(ctx, x, y, R, style, look, blink) {
    var ex = R * 0.17;
    var ey = R * 0.22;
    ctx.save();
    ctx.translate(x, y);
    if (style === 'happy') {
      ctx.strokeStyle = INK; ctx.lineWidth = R * 0.085; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, R * 0.06, R * 0.15, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    } else if (style === 'sleep') {
      ctx.strokeStyle = INK; ctx.lineWidth = R * 0.075; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -R * 0.02, R * 0.15, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    } else if (style === 'ouch') {
      ctx.strokeStyle = INK; ctx.lineWidth = R * 0.085; ctx.lineCap = 'round';
      var dir = x < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(-dir * R * 0.12, -R * 0.12); ctx.lineTo(dir * R * 0.1, 0); ctx.lineTo(-dir * R * 0.12, R * 0.12);
      ctx.stroke();
    } else {
      var k = blink ? 0.12 : 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(0, 0, ex, ey * k, 0, 0, TAU); ctx.fill();
      if (!blink) {
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.arc(look[0] * R * 0.07, look[1] * R * 0.07 + R * 0.02, R * 0.115, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(look[0] * R * 0.07 + R * 0.035, look[1] * R * 0.07 - R * 0.04, R * 0.035, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawMouth(ctx, R, style) {
    ctx.save();
    ctx.translate(0, R * 0.32);
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = R * 0.075;
    ctx.lineCap = 'round';
    if (style === 'o') {
      ctx.beginPath(); ctx.ellipse(0, R * 0.02, R * 0.085, R * 0.11, 0, 0, TAU); ctx.fill();
    } else if (style === 'happy') {
      ctx.beginPath(); ctx.arc(0, -R * 0.02, R * 0.2, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = INK; ctx.fill();
      ctx.fillStyle = '#ff8fa3';
      ctx.beginPath(); ctx.ellipse(0, R * 0.14, R * 0.09, R * 0.05, 0, 0, TAU); ctx.fill();
    } else if (style === 'ouch') {
      ctx.beginPath();
      ctx.moveTo(-R * 0.15, R * 0.05); ctx.lineTo(-R * 0.05, -R * 0.02); ctx.lineTo(R * 0.05, R * 0.05); ctx.lineTo(R * 0.15, -R * 0.02);
      ctx.stroke();
    } else if (style === 'sleep') {
      ctx.beginPath(); ctx.arc(0, -R * 0.02, R * 0.08, 0.2, Math.PI - 0.2); ctx.stroke();
    } else { // smile
      ctx.beginPath(); ctx.arc(0, -R * 0.06, R * 0.15, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * ほしのこを描く。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx 中心x
   * @param {number} cy 中心y
   * @param {number} R 半径
   * @param {number} ci 色番号(0〜3)
   * @param {object=} o  sx,sy（進行方向への伸び縮み）, angle（進行方向の角度）, scale, alpha, bob, rev（さかさ）,
   *                     eyes('open'|'blink'|'happy'|'ouch'|'sleep'), mouth('smile'|'o'|'happy'|'ouch'|'sleep'), look([x,y]),
   *                     glow（光の強さ 0〜1）, shadow（影の濃さ 0〜1）, tilt（頭の傾き rad）
   */
  function drawOrb(ctx, cx, cy, R, ci, o) {
    o = o || {};
    var col = ORB_COLORS[ci];
    var alpha = o.alpha == null ? 1 : o.alpha;
    if (alpha <= 0.01) return;
    var scale = o.scale == null ? 1 : o.scale;
    if (scale <= 0.01) return;
    var bob = o.bob || 0;

    ctx.save();
    ctx.globalAlpha *= alpha;

    // 地面の影（変形の影響を受けない）
    var sh = o.shadow == null ? 1 : o.shadow;
    if (sh > 0) {
      ctx.fillStyle = 'rgba(8,3,26,' + (0.28 * sh * alpha) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, cy + R * 0.92, R * 0.8 * scale, R * 0.24 * scale, 0, 0, TAU);
      ctx.fill();
    }

    ctx.translate(cx, cy + bob);
    var sx = o.sx || 1;
    var sy = o.sy || 1;
    if (sx !== 1 || sy !== 1) {
      var ang = o.angle || 0;
      ctx.rotate(ang);
      ctx.scale(sx, sy);
      ctx.rotate(-ang);
    }
    if (scale !== 1) ctx.scale(scale, scale);
    if (o.tilt) ctx.rotate(o.tilt);
    if (o.rev) ctx.scale(1, -1);

    // やわらかい光
    var gl = o.glow == null ? 0.55 : o.glow;
    if (gl > 0) {
      var sp = Orgel.Particles.glowSprite(col.glow);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= gl * 0.6;
      ctx.drawImage(sp, -R * 1.9, -R * 1.9, R * 3.8, R * 3.8);
      ctx.restore();
    }

    // からだ
    var g = ctx.createRadialGradient(-R * 0.34, -R * 0.42, R * 0.08, 0, 0, R * 1.08);
    g.addColorStop(0, col.light);
    g.addColorStop(0.42, col.base);
    g.addColorStop(1, col.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    // ふちの光
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.lineWidth = Math.max(1, R * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.94, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();

    drawTopper(ctx, ci, R, col);

    // ほっぺ
    ctx.fillStyle = rgba('#ff7a9a', 0.32);
    ctx.beginPath(); ctx.ellipse(-R * 0.55, R * 0.18, R * 0.14, R * 0.085, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R * 0.55, R * 0.18, R * 0.14, R * 0.085, 0, 0, TAU); ctx.fill();

    // かお
    var look = o.look || [0, 0];
    var eyes = o.eyes || 'open';
    var blink = eyes === 'blink';
    var style = blink ? 'open' : eyes;
    drawEye(ctx, -R * 0.34, -R * 0.06, R, style, look, blink);
    drawEye(ctx, R * 0.34, -R * 0.06, R, style, look, blink);
    drawMouth(ctx, R, o.mouth || 'smile');

    // さかさのこ: 薄い紫の輪
    if (o.rev) {
      ctx.strokeStyle = 'rgba(205,170,255,0.9)';
      ctx.lineWidth = Math.max(1.5, R * 0.09);
      ctx.setLineDash([R * 0.35, R * 0.18]);
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.14, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 床・かべ・縁（静的レイヤでキャッシュして使う）
  // ---------------------------------------------------------------------------

  function drawFloorTile(ctx, x, y, c, th, parity) {
    var g = c * 0.045;
    var s = c - g * 2;
    roundRect(ctx, x + g, y + g, s, s, c * 0.16);
    ctx.fillStyle = 'rgba(10,5,32,0.42)';
    ctx.fill();
    var grad = ctx.createLinearGradient(0, y + g, 0, y + g + s);
    grad.addColorStop(0, rgba(th.tile, 0.26 + parity * 0.035));
    grad.addColorStop(1, rgba(th.tile, 0.11 + parity * 0.02));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(th.tileEdge, 0.26);
    ctx.stroke();
    // 上辺のハイライト
    ctx.strokeStyle = rgba('#ffffff', 0.16);
    ctx.beginPath();
    ctx.moveTo(x + g + c * 0.16, y + g + 1.5);
    ctx.lineTo(x + g + s - c * 0.16, y + g + 1.5);
    ctx.stroke();
  }

  /**
   * 盤の縁（盤外に接する辺）を光らせる。線はセルの境界に引くので、隣り合うセルの線がひと続きの枠になる。
   * sides は [上,右,下,左] の真偽（その辺が盤外に接しているか）
   */
  function drawRim(ctx, x, y, c, th, sides) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(th.tileEdge, 0.8);
    ctx.lineWidth = Math.max(2, c * 0.045);
    ctx.shadowColor = rgba(th.tileEdge, 0.7);
    ctx.shadowBlur = c * 0.14;
    ctx.beginPath();
    if (sides[0]) { ctx.moveTo(x, y); ctx.lineTo(x + c, y); }
    if (sides[1]) { ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + c); }
    if (sides[2]) { ctx.moveTo(x, y + c); ctx.lineTo(x + c, y + c); }
    if (sides[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y + c); }
    ctx.stroke();
    ctx.restore();
  }

  /** かべ（水晶ブロック）。上面が少し浮き上がって見える */
  function drawWall(ctx, x, y, c, th, tone) {
    var g = c * 0.045;
    var s = c - g * 2;
    var rise = c * 0.1;
    var top = th.wallTop;
    var side = th.wallSide;
    if (tone) { top = tone.top; side = tone.side; }
    // 側面
    roundRect(ctx, x + g, y + g + s * 0.35 - rise, s, s * 0.65, c * 0.14);
    ctx.fillStyle = side;
    ctx.fill();
    // 上面
    ctx.save();
    ctx.shadowColor = rgba(th.wallGlow, 0.4);
    ctx.shadowBlur = c * 0.22;
    roundRect(ctx, x + g, y + g - rise, s, s - rise * 0.2, c * 0.16);
    var grad = ctx.createLinearGradient(x, y + g - rise, x + s, y + g + s);
    grad.addColorStop(0, lighten(top, 0.32));
    grad.addColorStop(0.55, top);
    grad.addColorStop(1, darken(top, 0.18));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    // 結晶のきらめき（面のハイライト）
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(x + g + s * 0.14, y + g - rise + s * 0.1);
    ctx.lineTo(x + g + s * 0.52, y + g - rise + s * 0.1);
    ctx.lineTo(x + g + s * 0.14, y + g - rise + s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(x + g + s * 0.86, y + g - rise + s * 0.9);
    ctx.lineTo(x + g + s * 0.5, y + g - rise + s * 0.9);
    ctx.lineTo(x + g + s * 0.86, y + g - rise + s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(lighten(th.wallGlow, 0.3), 0.55);
    roundRect(ctx, x + g, y + g - rise, s, s - rise * 0.2, c * 0.16);
    ctx.stroke();
  }

  // ---------------------------------------------------------------------------
  // おうち
  // ---------------------------------------------------------------------------

  /**
   * おうち（ほしのこの帰る場所）を描く。
   * @param {object} o  t(ms), filled（使用済み）, flash（帰宅直後の光 0〜1）, marks（色の頭文字を表示）, phase
   */
  function drawSocket(ctx, cx, cy, c, ci, o) {
    var col = ORB_COLORS[ci];
    var R = c * 0.36;
    var t = o.t || 0;
    var pulse = 1 + 0.035 * Math.sin(t * 0.003 + (o.phase || 0));
    var filled = !!o.filled;
    var flash = o.flash || 0;

    ctx.save();
    // 光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var sp = Orgel.Particles.glowSprite(col.glow);
    var ga = (filled ? 0.5 : 0.28 + 0.1 * Math.sin(t * 0.003 + (o.phase || 0))) + flash * 0.6;
    ctx.globalAlpha = Math.min(1, ga);
    ctx.drawImage(sp, cx - R * 2.1, cy - R * 2.1, R * 4.2, R * 4.2);
    ctx.restore();

    // くぼみ
    var g = ctx.createRadialGradient(cx, cy - R * 0.2, R * 0.1, cx, cy, R * 1.05);
    g.addColorStop(0, filled ? rgba(col.base, 0.55) : 'rgba(6,2,20,0.7)');
    g.addColorStop(1, filled ? rgba(col.base, 0.2) : rgba(col.dark, 0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * pulse, 0, TAU);
    ctx.fill();

    // 輪
    ctx.lineWidth = Math.max(2, c * 0.055);
    ctx.strokeStyle = rgba(filled ? col.light : col.base, filled ? 1 : 0.92);
    ctx.beginPath();
    ctx.arc(cx, cy, R * pulse, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba('#ffffff', 0.35);
    ctx.beginPath();
    ctx.arc(cx, cy, R * pulse * 0.82, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();

    // 中の印（頭の飾りと同じ形）
    ctx.save();
    ctx.translate(cx, cy);
    if (filled) {
      // ねむっている顔
      ctx.fillStyle = rgba(col.base, 0.9);
      ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, TAU); ctx.fill();
      drawEye(ctx, -R * 0.22, -R * 0.06, R * 0.55, 'sleep', [0, 0], false);
      drawEye(ctx, R * 0.22, -R * 0.06, R * 0.55, 'sleep', [0, 0], false);
      drawMouth(ctx, R * 0.55, 'sleep');
    } else {
      hatPath(ctx, ci, R * 0.42);
      ctx.fillStyle = rgba(col.base, 0.5);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(col.light, 0.65);
      ctx.stroke();
    }
    ctx.restore();

    // 色の頭文字: マスの右下すみに置く（盤面の端でも欠けない）
    if (o.marks) drawMark(ctx, cx + c * 0.33, cy + c * 0.33, c * 0.135, ci, 1);
    ctx.restore();
  }

  /** 色の頭文字の札（「いろの めじるし」設定）。暗い丸に、色の輪と頭文字。ほしのこ・おうちの両方に付ける */
  function drawMark(ctx, mx, my, r, ci, alpha) {
    var col = ORB_COLORS[ci];
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = 'rgba(10,5,30,0.8)';
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.strokeStyle = rgba(col.base, 0.95);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.round(r * 1.25) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(col.letter, mx, my + r * 0.07);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // ギミック
  // ---------------------------------------------------------------------------

  /** ぬかるみ */
  function drawMud(ctx, cx, cy, c, t, seed) {
    var R = c * 0.4;
    ctx.save();
    ctx.translate(cx, cy);
    var g = ctx.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.1, 0, 0, R * 1.1);
    g.addColorStop(0, '#a47a56');
    g.addColorStop(0.6, '#7a5640');
    g.addColorStop(1, '#4e3428');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, R, R * 0.82, 0, 0, TAU);
    ctx.ellipse(-R * 0.45, R * 0.22, R * 0.5, R * 0.42, 0.3, 0, TAU);
    ctx.ellipse(R * 0.4, -R * 0.2, R * 0.5, R * 0.4, -0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,200,0.22)';
    ctx.beginPath();
    ctx.ellipse(-R * 0.25, -R * 0.38, R * 0.38, R * 0.14, -0.35, 0, TAU);
    ctx.fill();
    // あぶく
    for (var i = 0; i < 3; i++) {
      var ph = ((t * 0.0006 + seed * 0.37 + i * 0.33) % 1);
      var bx = (i - 1) * R * 0.45 + Math.sin(seed + i) * R * 0.1;
      var by = R * 0.2 - ph * R * 0.55;
      var br = R * (0.07 + 0.06 * Math.sin(ph * Math.PI));
      ctx.strokeStyle = 'rgba(255,235,210,' + (0.7 * Math.sin(ph * Math.PI)) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** ながれ（矢印）。dir の向きへ流れる */
  function drawFlow(ctx, x, y, c, dir, t, flash) {
    var g = c * 0.045;
    var s = c - g * 2;
    ctx.save();
    roundRect(ctx, x + g, y + g, s, s, c * 0.16);
    ctx.fillStyle = 'rgba(70,200,235,' + (0.14 + (flash || 0) * 0.25) + ')';
    ctx.fill();
    ctx.clip();
    ctx.translate(x + c / 2, y + c / 2);
    ctx.rotate(DIR_ANGLE[dir]);
    var spacing = c * 0.3;
    var off = ((t * 0.00045 * c) % spacing);
    ctx.lineWidth = Math.max(2, c * 0.06);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = -2; i <= 2; i++) {
      var px = i * spacing + off;
      var a = 1 - Math.min(1, Math.abs(px) / (c * 0.5));
      ctx.strokeStyle = 'rgba(160,240,255,' + (0.85 * a + (flash || 0) * 0.3) + ')';
      ctx.beginPath();
      ctx.moveTo(px - c * 0.1, -c * 0.17);
      ctx.lineTo(px + c * 0.06, 0);
      ctx.lineTo(px - c * 0.1, c * 0.17);
      ctx.stroke();
    }
    ctx.restore();
  }

  var PORTAL_COLORS = [['#b79cff', '#7ff5e0'], ['#ffb36b', '#ff7bd1']];

  /** ワープ（うずしお）。pair は組の番号(0/1)、flash は出入りの光 */
  function drawPortal(ctx, cx, cy, c, pair, t, flash) {
    var cols = PORTAL_COLORS[pair] || PORTAL_COLORS[0];
    var R = c * 0.4;
    ctx.save();
    ctx.translate(cx, cy);
    // 暗い中心
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.05);
    g.addColorStop(0, 'rgba(4,2,16,0.9)');
    g.addColorStop(0.7, rgba(cols[0], 0.28));
    g.addColorStop(1, rgba(cols[0], 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.05, 0, TAU);
    ctx.fill();
    // 渦
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var k = 0; k < 3; k++) {
      var rr = R * (0.38 + k * 0.24);
      var rot = t * 0.0022 * (k % 2 ? -1 : 1) * (1 + k * 0.25);
      for (var a = 0; a < 3; a++) {
        var a0 = rot + a * (TAU / 3);
        ctx.strokeStyle = rgba(cols[k % 2], 0.55 + (flash || 0) * 0.4);
        ctx.lineWidth = Math.max(1.5, c * (0.055 - k * 0.01));
        ctx.beginPath();
        ctx.arc(0, 0, rr, a0, a0 + TAU * 0.22);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** つぼみ（まだ咲いていない）。grow は開花アニメーション中の 0〜1（咲く前は 0） */
  function drawBud(ctx, cx, cy, c, t, seed) {
    var sway = Math.sin(t * 0.002 + seed) * 0.06;
    ctx.save();
    ctx.translate(cx, cy + c * 0.22);
    ctx.rotate(sway);
    // くき
    ctx.strokeStyle = '#6cc88a';
    ctx.lineWidth = Math.max(2, c * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(c * 0.05, -c * 0.2, 0, -c * 0.38);
    ctx.stroke();
    // 葉
    ctx.fillStyle = '#8fe0a6';
    ctx.beginPath();
    ctx.ellipse(c * 0.1, -c * 0.1, c * 0.1, c * 0.045, -0.6, 0, TAU);
    ctx.fill();
    // つぼみ
    ctx.translate(0, -c * 0.4);
    var g = ctx.createRadialGradient(-c * 0.03, -c * 0.06, 1, 0, 0, c * 0.2);
    g.addColorStop(0, '#ffd1ea');
    g.addColorStop(1, '#ff7fbd');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, c * 0.14);
    ctx.bezierCurveTo(-c * 0.2, c * 0.04, -c * 0.12, -c * 0.16, 0, -c * 0.22);
    ctx.bezierCurveTo(c * 0.12, -c * 0.16, c * 0.2, c * 0.04, 0, c * 0.14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, c * 0.12);
    ctx.quadraticCurveTo(-c * 0.04, -c * 0.04, 0, -c * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  /** 咲いた花（かべになったつぼみ）。grow は 0〜1（1で完全に咲く） */
  function drawFlowerWall(ctx, x, y, c, th, grow, t) {
    var tone = { top: '#e79ad0', side: '#8a3f78' };
    var s = Util.clamp(grow, 0, 1);
    ctx.save();
    ctx.translate(x + c / 2, y + c / 2);
    ctx.scale(0.55 + 0.45 * s, 0.55 + 0.45 * s);
    ctx.translate(-(x + c / 2), -(y + c / 2));
    drawWall(ctx, x, y, c, th, tone);
    ctx.restore();
    // 花びら
    var cx = x + c / 2;
    var cy = y + c * 0.42;
    var pr = c * 0.17 * s;
    if (pr > 0.5) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(t * 0.0015) * 0.05);
      for (var i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i / 6) * TAU);
        ctx.fillStyle = i % 2 ? '#fff0f8' : '#ffd0ea';
        ctx.beginPath();
        ctx.ellipse(0, -pr * 1.05, pr * 0.6, pr * 1.0, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, pr * 0.65, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // 拡張ワールド（6〜18）のギミック: いろの もん・こおりの かがみ・すなの もん・スイッチ・とびら
  // ---------------------------------------------------------------------------

  /**
   * いろの もん（その色のほしのこだけ通れる）。ガラスの枠と、色つきの薄い幕。真ん中に、その色の頭の飾りと同じ形。
   * @param {object=} o  flash（通れた直後の光 0〜1。幕がほどける）, deny（入れなかった直後の光 0〜1）, marks（頭文字の札）
   */
  function drawGate(ctx, cx, cy, c, ci, t, o) {
    o = o || {};
    var col = ORB_COLORS[ci];
    var flash = o.flash || 0;
    var deny = o.deny || 0;
    var h = c * 0.4;
    ctx.save();
    ctx.translate(cx, cy);
    if (deny > 0) ctx.translate(Math.sin(deny * 26) * c * 0.022 * deny, 0);

    // 幕（通れた直後はほどけて薄くなる）
    var curtain = 1 - flash * 0.75;
    roundRect(ctx, -h, -h, h * 2, h * 2, c * 0.14);
    var g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, rgba(col.light, (0.3 + deny * 0.3) * curtain));
    g.addColorStop(1, rgba(col.base, (0.16 + deny * 0.2) * curtain));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // ゆっくり流れる糸のような光
    ctx.lineWidth = Math.max(1, c * 0.025);
    for (var k = 0; k < 4; k++) {
      var ph = ((t * 0.00035 + k * 0.25) % 1);
      var lx = -h + (k + 0.5) * (h * 2 / 4);
      ctx.strokeStyle = rgba('#ffffff', 0.22 * Math.sin(ph * Math.PI) * curtain);
      ctx.beginPath();
      ctx.moveTo(lx, -h);
      ctx.lineTo(lx, h);
      ctx.stroke();
    }
    var sweep = ((t * 0.0004) % 1) * 2 - 0.5;
    var sg = ctx.createLinearGradient(-h + sweep * h * 2 - h * 0.5, -h, -h + sweep * h * 2 + h * 0.5, h);
    sg.addColorStop(0, rgba('#ffffff', 0));
    sg.addColorStop(0.5, rgba('#ffffff', 0.2 * curtain));
    sg.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = sg;
    ctx.fillRect(-h, -h, h * 2, h * 2);
    ctx.restore();

    // 枠のまわりの光（光の玉のスプライト。毎フレーム描くので、重い shadowBlur は使わない）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 + flash * 0.4;
    ctx.drawImage(Orgel.Particles.glowSprite(col.glow), -h * 1.6, -h * 1.6, h * 3.2, h * 3.2);
    ctx.restore();
    // 枠（ガラスのふち）と、四すみの結晶
    ctx.lineWidth = Math.max(2, c * 0.06);
    ctx.strokeStyle = rgba(flash > 0 ? lighten(col.base, 0.3 * flash) : col.base, 0.95);
    roundRect(ctx, -h, -h, h * 2, h * 2, c * 0.14);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba('#ffffff', 0.45);
    ctx.beginPath();
    ctx.moveTo(-h + c * 0.1, -h + c * 0.035);
    ctx.lineTo(h - c * 0.1, -h + c * 0.035);
    ctx.stroke();
    var cr = c * 0.09;
    ctx.fillStyle = col.light;
    ctx.strokeStyle = rgba(col.dark, 0.9);
    ctx.lineWidth = Math.max(1, c * 0.025);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      ctx.save();
      ctx.translate(q[0] * h, q[1] * h);
      ctx.beginPath();
      ctx.moveTo(0, -cr); ctx.lineTo(cr, 0); ctx.lineTo(0, cr); ctx.lineTo(-cr, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 真ん中の印（頭の飾りと同じ形）
    ctx.save();
    ctx.globalAlpha *= 0.55 + 0.4 * (1 - curtain) + 0.1 * Math.sin(t * 0.003);
    hatPath(ctx, ci, c * 0.17);
    ctx.fillStyle = rgba(col.hat, 0.9);
    ctx.fill();
    ctx.lineWidth = Math.max(1, c * 0.03);
    ctx.strokeStyle = rgba(col.dark, 0.95);
    ctx.stroke();
    ctx.restore();
    if (o.marks) drawMark(ctx, c * 0.33, c * 0.33, c * 0.135, ci, 1);
    ctx.restore();
  }

  /**
   * こおりの かがみ（ななめの透明な板）。kind 0=「／」（p） 1=「＼」（q）。flash は曲がった直後の光 0〜1
   */
  function drawMirror(ctx, cx, cy, c, kind, t, flash) {
    flash = flash || 0;
    var L = c * 0.47;                 // 板の長さ（対角線の半分）
    var W = c * 0.115;                // 板の厚さの半分
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(kind === 0 ? -Math.PI / 4 : Math.PI / 4);
    // 床に落ちる、ぼんやりした影
    ctx.fillStyle = 'rgba(8,4,28,0.28)';
    roundRect(ctx, -L, -W + c * 0.05, L * 2, W * 2.2, W);
    ctx.fill();
    // 板
    var g = ctx.createLinearGradient(0, -W, 0, W);
    g.addColorStop(0, 'rgba(240,252,255,0.92)');
    g.addColorStop(0.5, 'rgba(170,225,255,0.62)');
    g.addColorStop(1, 'rgba(120,190,245,0.78)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 + flash * 0.45;
    ctx.drawImage(Orgel.Particles.glowSprite('#bfeaff'), -L * 1.05, -W * 3.6, L * 2.1, W * 7.2);
    ctx.restore();
    roundRect(ctx, -L, -W, L * 2, W * 2, W);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, c * 0.025);
    ctx.strokeStyle = rgba('#ffffff', 0.85);
    roundRect(ctx, -L, -W, L * 2, W * 2, W);
    ctx.stroke();
    // 両はしの氷の留め具
    ctx.fillStyle = '#7fb6e8';
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.arc(s * L, 0, W * 0.95, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });
    // 板の上をゆっくり走る光
    var gp = ((t * 0.00042 + kind * 0.37) % 1);
    var gx = -L + gp * L * 2;
    var gs = ctx.createLinearGradient(gx - L * 0.25, 0, gx + L * 0.25, 0);
    gs.addColorStop(0, 'rgba(255,255,255,0)');
    gs.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 + flash * 0.15) + ')');
    gs.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gs;
    roundRect(ctx, -L * 0.96, -W * 0.7, L * 1.92, W * 1.4, W * 0.7);
    ctx.fill();
    ctx.restore();
    // 曲がった直後の、きらっとした十字の光
    if (flash > 0.02) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#ffffff', 0.9 * flash);
      ctx.lineWidth = Math.max(1.5, c * 0.04);
      ctx.lineCap = 'round';
      var r = c * (0.18 + 0.2 * (1 - flash));
      ctx.beginPath();
      ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
      ctx.moveTo(0, -r); ctx.lineTo(0, r);
      ctx.stroke();
      ctx.restore();
    }
  }

  var SAND = { base: '#e9c27a', light: '#fff0c4', dark: '#a8772d', glow: '#ffd98a' };

  /**
   * すなの もん（いっぽうつうこう）。dir の向きにだけ入れる。向きに沿って金色のシェブロン（＞＞）が流れる。
   * @param {object=} o  flash（通れた直後の光 0〜1）, deny（入れなかった直後の光 0〜1）
   */
  function drawOneway(ctx, cx, cy, c, dir, t, o) {
    o = o || {};
    var flash = o.flash || 0;
    var deny = o.deny || 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(DIR_ANGLE[dir]);       // 以降は「右向き」を向きとして描く
    var h = c * 0.43;
    // 足もとの砂色
    roundRect(ctx, -h, -h, h * 2, h * 2, c * 0.14);
    ctx.fillStyle = rgba(SAND.base, 0.2 + flash * 0.2);
    ctx.fill();
    // 両わきの石の柱（向きに対して横）。ここからは入れない
    [-1, 1].forEach(function (s) {
      var px = -h * 0.82;
      var py = s > 0 ? h * 0.66 : -h * 0.66 - c * 0.17;
      var pg = ctx.createLinearGradient(0, py, 0, py + c * 0.17);
      pg.addColorStop(0, lighten(SAND.base, 0.28));
      pg.addColorStop(1, SAND.dark);
      roundRect(ctx, px, py, h * 1.64, c * 0.17, c * 0.06);
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(SAND.light, 0.7);
      ctx.stroke();
    });
    // 流れるシェブロン
    ctx.save();
    roundRect(ctx, -h * 0.92, -h * 0.58, h * 1.84, h * 1.16, c * 0.06);
    ctx.clip();
    var spacing = c * 0.3;
    var off = (t * 0.0004 * c) % spacing;
    ctx.lineWidth = Math.max(2, c * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = -2; i <= 2; i++) {
      var px2 = i * spacing + off;
      var a = 1 - Math.min(1, Math.abs(px2) / (c * 0.52));
      ctx.strokeStyle = rgba(flash > 0 ? '#ffffff' : SAND.glow, Math.min(1, 0.85 * a + flash * 0.35));
      ctx.beginPath();
      ctx.moveTo(px2 - c * 0.1, -c * 0.18);
      ctx.lineTo(px2 + c * 0.07, 0);
      ctx.lineTo(px2 - c * 0.1, c * 0.18);
      ctx.stroke();
    }
    ctx.restore();
    // 入れなかったときの、赤みのある光
    if (deny > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      roundRect(ctx, -h, -h, h * 2, h * 2, c * 0.14);
      ctx.fillStyle = rgba('#ff9a7a', 0.28 * deny);
      ctx.fill();
    }
    ctx.restore();
  }

  var BRASS = { base: '#d9ac55', light: '#fff0b8', dark: '#7f5a1c', glow: '#ffd98a' };

  /**
   * スイッチ（床の丸いボタン）。sw は とびらの いまの状態（0/1）で、ボタンの色が変わる。
   * @param {object=} o  sw, flash（踏まれた直後の光 0〜1）
   */
  function drawSwitch(ctx, cx, cy, c, t, o) {
    o = o || {};
    var flash = o.flash || 0;
    var R = c * 0.34;
    ctx.save();
    ctx.translate(cx, cy);
    // 台座（真鍮の歯車のようなふち）
    ctx.fillStyle = 'rgba(8,4,28,0.35)';
    ctx.beginPath(); ctx.ellipse(0, R * 0.2, R * 1.12, R * 0.98, 0, 0, TAU); ctx.fill();
    var teeth = 10;
    ctx.beginPath();
    for (var i = 0; i < teeth * 2; i++) {
      var a = (i / (teeth * 2)) * TAU + t * 0.0002;
      var rr = i % 2 ? R * 1.0 : R * 1.14;
      var px = Math.cos(a) * rr;
      var py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    var bg = ctx.createLinearGradient(-R, -R, R, R);
    bg.addColorStop(0, BRASS.light);
    bg.addColorStop(0.5, BRASS.base);
    bg.addColorStop(1, BRASS.dark);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(BRASS.dark, 0.9);
    ctx.stroke();
    // くぼみとボタン（踏まれると沈む）
    ctx.fillStyle = 'rgba(40,24,10,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, TAU); ctx.fill();
    var press = Math.max(o.sw ? 0.35 : 0, flash);
    var br = R * (0.6 - press * 0.1);
    var on = o.sw ? ['#d6fff6', '#4fe3c8', '#1c8c7a'] : ['#fff0c8', '#ffb347', '#b8651a'];
    var bgd = ctx.createRadialGradient(-br * 0.3, -br * 0.35 + press * br * 0.2, br * 0.1, 0, 0, br * 1.05);
    bgd.addColorStop(0, on[0]);
    bgd.addColorStop(0.5, on[1]);
    bgd.addColorStop(1, on[2]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 + flash * 0.5;
    ctx.drawImage(Orgel.Particles.glowSprite(on[1]), -br * 1.9, -br * 1.9, br * 3.8, br * 3.8);
    ctx.restore();
    ctx.fillStyle = bgd;
    ctx.beginPath(); ctx.arc(0, press * R * 0.06, br, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', 0.5);
    ctx.lineWidth = Math.max(1, c * 0.025);
    ctx.beginPath(); ctx.arc(0, press * R * 0.06, br * 0.78, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    // 上下に向く小さな三角（きりかえの印）
    ctx.fillStyle = rgba('#ffffff', 0.85);
    var tr = br * 0.3;
    ctx.beginPath(); ctx.moveTo(0, -tr * 1.5); ctx.lineTo(tr, -tr * 0.2); ctx.lineTo(-tr, -tr * 0.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, tr * 1.5); ctx.lineTo(tr, tr * 0.2); ctx.lineTo(-tr, tr * 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /**
   * とびら。closed は閉じている度合い（0=開いている 1=閉じている。切りかわる間は途中の値）。
   * 閉じているときは鉄格子（入れない）、開いているときは床にふちの金具だけ。
   */
  function drawDoor(ctx, x, y, c, closed, t, sw) {
    var g = c * 0.075;
    var s = c - g * 2;
    var u = Util.clamp(closed, 0, 1);
    ctx.save();
    // 開いているときも見える、四すみの金具
    ctx.strokeStyle = rgba(BRASS.base, 0.55 + 0.4 * u);
    ctx.lineWidth = Math.max(1.5, c * 0.05);
    ctx.lineCap = 'round';
    var k = c * 0.2;
    var x0 = x + g, y0 = y + g, x1 = x + g + s, y1 = y + g + s;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + k); ctx.lineTo(x0, y0); ctx.lineTo(x0 + k, y0);
    ctx.moveTo(x1 - k, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + k);
    ctx.moveTo(x1, y1 - k); ctx.lineTo(x1, y1); ctx.lineTo(x1 - k, y1);
    ctx.moveTo(x0 + k, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - k);
    ctx.stroke();
    if (u > 0.02) {
      // 鉄の板と格子（上から下りてくる）
      var bars = 5;
      var gap = s / bars;
      ctx.save();
      roundRect(ctx, x0, y0, s, s, c * 0.12);
      ctx.clip();
      ctx.globalAlpha *= Math.min(1, u * 1.6);
      var pg = ctx.createLinearGradient(0, y0, 0, y1);
      pg.addColorStop(0, 'rgba(70,50,100,0.88)');
      pg.addColorStop(1, 'rgba(34,22,58,0.92)');
      ctx.fillStyle = pg;
      ctx.fillRect(x0, y0, s, s * u);
      for (var i = 0; i < bars; i++) {
        var bx = x0 + gap * (i + 0.5);
        var bgd = ctx.createLinearGradient(bx - c * 0.035, 0, bx + c * 0.035, 0);
        bgd.addColorStop(0, BRASS.light);
        bgd.addColorStop(0.5, BRASS.base);
        bgd.addColorStop(1, BRASS.dark);
        ctx.fillStyle = bgd;
        ctx.fillRect(bx - c * 0.035, y0, c * 0.07, s * u);
        ctx.fillStyle = rgba(BRASS.light, 0.8);
        ctx.beginPath(); ctx.arc(bx, y0 + s * u, c * 0.04, 0, TAU); ctx.fill();
      }
      // 横木
      ctx.fillStyle = rgba(BRASS.dark, 0.95);
      ctx.fillRect(x0, y0 + s * 0.12, s, c * 0.05);
      ctx.fillRect(x0, y0 + s * 0.78, s, c * 0.05);
      ctx.restore();
      ctx.lineWidth = Math.max(1, c * 0.03);
      ctx.strokeStyle = rgba(BRASS.glow, 0.7 * u);
      roundRect(ctx, x0, y0, s, s, c * 0.12);
      ctx.stroke();
    }
    void t; void sw;
    ctx.restore();
  }

  /** ヒントの矢印（盤の縁に出す光る矢印）。dir は 0〜3、p は 0〜1 の脈動 */
  function drawHintArrow(ctx, cx, cy, size, dir, p, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(DIR_ANGLE[dir]);
    ctx.globalCompositeOperation = 'lighter';
    var a = 0.5 + 0.5 * p;
    var sp = Orgel.Particles.glowSprite(color);
    ctx.globalAlpha = a * 0.8;
    ctx.drawImage(sp, -size * 1.6, -size * 1.6, size * 3.2, size * 3.2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba(color, 0.55 + 0.4 * a);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.lineJoin = 'round';
    var o = p * size * 0.25;
    ctx.beginPath();
    ctx.moveTo(size * 0.55 + o, 0);
    ctx.lineTo(-size * 0.2 + o, -size * 0.5);
    ctx.lineTo(-size * 0.05 + o, 0);
    ctx.lineTo(-size * 0.2 + o, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  var Sprites = {
    ORB_COLORS: ORB_COLORS,
    DIR_ANGLE: DIR_ANGLE,
    PORTAL_COLORS: PORTAL_COLORS,
    roundRect: roundRect,
    hatPath: hatPath,
    drawOrb: drawOrb,
    drawFloorTile: drawFloorTile,
    drawRim: drawRim,
    drawWall: drawWall,
    drawSocket: drawSocket,
    drawMark: drawMark,
    drawMud: drawMud,
    drawFlow: drawFlow,
    drawPortal: drawPortal,
    drawBud: drawBud,
    drawFlowerWall: drawFlowerWall,
    drawGate: drawGate,
    drawMirror: drawMirror,
    drawOneway: drawOneway,
    drawSwitch: drawSwitch,
    drawDoor: drawDoor,
    drawHintArrow: drawHintArrow,
  };

  Orgel.Sprites = Sprites;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Sprites; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
