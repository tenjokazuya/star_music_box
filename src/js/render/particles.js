(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Util = Orgel.Util;

  /**
   * 粒子システム（ほこり・きらめき・光の輪・残像）。上限つきのプールで、毎フレームの確保を避ける。
   *   var ps = Particles.create();
   *   ps.emit({ kind:'spark', x, y, vx, vy, life, size, color });
   *   ps.update(dtMs); ps.draw(ctx);
   *   ps.density = 0.3;   // 演出ひかえめ設定のとき小さくする（emit 数を間引く）
   */

  var TAU = Math.PI * 2;

  var CONFIG = {
    MAX: 360,   // 同時に存在できる粒子の上限
  };

  var glowCache = {};

  /** 色ごとの柔らかい光の円（事前描画） */
  function glowSprite(color) {
    if (glowCache[color]) return glowCache[color];
    var c = root.document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, Util.rgba(color, 1));
    grad.addColorStop(0.35, Util.rgba(color, 0.45));
    grad.addColorStop(1, Util.rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowCache[color] = c;
    return c;
  }

  function create() {
    var pool = [];
    for (var i = 0; i < CONFIG.MAX; i++) pool.push({ alive: false });
    var ps = { density: 1, glowSprite: glowSprite };

    /**
     * 粒子を1つ出す。
     * kind: 'dust'（ほこり）／'spark'（十字のきらめき・加算）／'glow'（光の玉・加算）／'ring'（広がる輪・加算）
     * p: { x, y, vx, vy, life(ms), size, color, grow(サイズの増減/秒), gravity(px/s^2), drag(0〜1), alpha, rot, spin }
     */
    ps.emit = function (p) {
      if (ps.density < 1 && Math.random() > ps.density) return;
      for (var i = 0; i < pool.length; i++) {
        var q = pool[i];
        if (q.alive) continue;
        q.alive = true;
        q.kind = p.kind || 'dust';
        q.x = p.x; q.y = p.y;
        q.vx = p.vx || 0; q.vy = p.vy || 0;
        q.life = q.max = p.life || 500;
        q.size = p.size || 4;
        q.color = p.color || '#ffffff';
        q.grow = p.grow || 0;
        q.gravity = p.gravity || 0;
        q.drag = p.drag == null ? 0 : p.drag;
        q.alpha = p.alpha == null ? 1 : p.alpha;
        q.rot = p.rot || 0;
        q.spin = p.spin || 0;
        return;
      }
    };

    ps.update = function (dt) {
      var s = dt / 1000;
      for (var i = 0; i < pool.length; i++) {
        var q = pool[i];
        if (!q.alive) continue;
        q.life -= dt;
        if (q.life <= 0) { q.alive = false; continue; }
        if (q.drag) {
          var k = Math.max(0, 1 - q.drag * s);
          q.vx *= k; q.vy *= k;
        }
        q.vy += q.gravity * s;
        q.x += q.vx * s;
        q.y += q.vy * s;
        q.size = Math.max(0, q.size + q.grow * s);
        q.rot += q.spin * s;
      }
    };

    ps.clear = function () {
      for (var i = 0; i < pool.length; i++) pool[i].alive = false;
    };

    ps.count = function () {
      var n = 0;
      for (var i = 0; i < pool.length; i++) if (pool[i].alive) n++;
      return n;
    };

    ps.draw = function (ctx) {
      var i, q, a, t;
      // 通常合成（ほこり）
      for (i = 0; i < pool.length; i++) {
        q = pool[i];
        if (!q.alive || q.kind !== 'dust') continue;
        t = q.life / q.max;
        a = q.alpha * t;
        ctx.fillStyle = Util.rgba(q.color, a * 0.55);
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, TAU);
        ctx.fill();
      }
      // 加算合成（光もの）
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < pool.length; i++) {
        q = pool[i];
        if (!q.alive || q.kind === 'dust') continue;
        t = q.life / q.max;
        a = q.alpha * t;
        if (q.kind === 'glow') {
          var sp = glowSprite(q.color);
          ctx.globalAlpha = Math.min(1, a);
          ctx.drawImage(sp, q.x - q.size, q.y - q.size, q.size * 2, q.size * 2);
        } else if (q.kind === 'spark') {
          ctx.globalAlpha = Math.min(1, a * 1.2);
          ctx.fillStyle = q.color;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          var l = q.size;
          var w = Math.max(0.8, q.size * 0.18);
          ctx.beginPath();
          ctx.moveTo(0, -l); ctx.lineTo(w, -w); ctx.lineTo(l, 0); ctx.lineTo(w, w);
          ctx.lineTo(0, l); ctx.lineTo(-w, w); ctx.lineTo(-l, 0); ctx.lineTo(-w, -w);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (q.kind === 'ring') {
          ctx.globalAlpha = Math.min(1, a);
          ctx.strokeStyle = q.color;
          ctx.lineWidth = Math.max(1, q.size * 0.12 * t + 1);
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.size, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    return ps;
  }

  var Particles = { CONFIG: CONFIG, create: create, glowSprite: glowSprite };

  Orgel.Particles = Particles;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Particles; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
