/* 演出エフェクト基盤：パーティクル・フローティング文字・画面揺れ・ヒットストップ・フラッシュ。 */
(function (RP) {
  'use strict';

  var FX = RP.fx = {};
  var parts = [], pops = [], toasts = [];
  var shakeMag = 0, shakeT = 0, shakeDur = 0;
  var stopT = 0;
  var flashT = 0, flashDur = 0, flashCol = '#fff', flashA = 0.8;
  var rng = RP.fxrng;
  var MAX_PARTS = 600;

  FX.reset = function () {
    parts.length = 0; pops.length = 0;   // トーストは画面遷移をまたいで残す
    shakeMag = 0; shakeT = 0; stopT = 0; flashT = 0;
  };

  // ---- 画面揺れ・ヒットストップ・フラッシュ ----
  FX.shake = function (mag, dur) {
    if (mag >= shakeMag || shakeT <= 0) { shakeMag = mag; shakeDur = dur; shakeT = dur; }
  };
  FX.hitstop = function (sec) { stopT = Math.max(stopT, sec); };
  FX.flash = function (col, dur, a) { flashCol = col || '#fff'; flashDur = dur || 0.2; flashT = flashDur; flashA = a === undefined ? 0.8 : a; };
  FX.timeScale = function () { return stopT > 0 ? 0 : 1; };
  FX.offset = function () {
    if (shakeT <= 0) { return { x: 0, y: 0 }; }
    var k = shakeMag * (shakeT / shakeDur);
    return { x: Math.round((rng.next() * 2 - 1) * k), y: Math.round((rng.next() * 2 - 1) * k) };
  };

  // ---- パーティクル ----
  // o: { x,y,vx,vy,ay,life,col,size,shape('px'|'conf'|'star'|'steam'|'ring'),fade }
  FX.spawn = function (o) {
    if (parts.length >= MAX_PARTS) { parts.shift(); }
    o.t = 0; o.life = o.life || 1; o.size = o.size || 1;
    o.ay = o.ay || 0; o.vx = o.vx || 0; o.vy = o.vy || 0;
    o.spin = rng.next() * 6;
    parts.push(o);
    return o;
  };

  FX.burst = function (x, y, n, o) {
    o = o || {};
    var cols = o.cols || ['yellow', 'orange', 'white'];
    for (var i = 0; i < n; i++) {
      var a = rng.next() * Math.PI * 2, sp = (o.speed || 60) * (0.4 + rng.next() * 0.8);
      FX.spawn({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0),
        ay: o.gravity === undefined ? 120 : o.gravity, life: (o.life || 0.6) * (0.6 + rng.next() * 0.8),
        col: cols[Math.floor(rng.next() * cols.length)], size: o.size || 1, shape: o.shape || 'px'
      });
    }
  };

  FX.confetti = function (x, y, n, o) {
    o = o || {};
    var cols = o.cols || ['red', 'yellow', 'cyan', 'pink', 'lime', 'white', 'orange'];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (rng.next() - 0.5) * (o.spread || 2.4);
      var sp = (o.speed || 110) * (0.4 + rng.next() * 0.9);
      FX.spawn({
        x: x + (rng.next() - 0.5) * (o.w || 0), y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        ay: 90, drag: 0.6, life: (o.life || 1.8) * (0.6 + rng.next() * 0.6),
        col: cols[Math.floor(rng.next() * cols.length)], size: 2, shape: 'conf'
      });
    }
  };

  // 画面上端から降る紙吹雪
  FX.rainConfetti = function (n) {
    var cols = ['red', 'yellow', 'cyan', 'pink', 'lime', 'white', 'orange'];
    for (var i = 0; i < n; i++) {
      FX.spawn({
        x: rng.next() * RP.W, y: -4, vx: (rng.next() - 0.5) * 30, vy: 20 + rng.next() * 30,
        ay: 10, drag: 0.4, life: 3 + rng.next() * 2,
        col: cols[Math.floor(rng.next() * cols.length)], size: 2, shape: 'conf'
      });
    }
  };

  FX.steam = function (x, y, n) {
    for (var i = 0; i < (n || 1); i++) {
      FX.spawn({
        x: x + (rng.next() - 0.5) * 6, y: y, vx: (rng.next() - 0.5) * 6, vy: -(10 + rng.next() * 10),
        ay: 0, life: 0.9 + rng.next() * 0.6, col: 'white', size: 2, shape: 'steam', fade: true
      });
    }
  };

  FX.sparkle = function (x, y, n, cols) {
    for (var i = 0; i < (n || 6); i++) {
      FX.spawn({
        x: x + (rng.next() - 0.5) * 16, y: y + (rng.next() - 0.5) * 12, vx: 0, vy: -4 - rng.next() * 6,
        life: 0.4 + rng.next() * 0.5, col: (cols || ['white', 'yellow'])[Math.floor(rng.next() * 2)], size: 1, shape: 'star'
      });
    }
  };

  FX.ring = function (x, y, col, maxR) {
    FX.spawn({ x: x, y: y, life: 0.4, col: col || 'white', size: maxR || 14, shape: 'ring' });
  };

  FX.coin = function (x, y) {
    FX.spawn({ x: x, y: y, vx: (rng.next() - 0.5) * 30, vy: -80, ay: 260, life: 0.7, col: 'yellow', size: 3, shape: 'coin' });
  };

  // ---- フローティング文字 ----
  // o: { col, outline, size, dy(上昇量), life, bold, delay }
  FX.popup = function (text, x, y, col, o) {
    o = o || {};
    pops.push({
      text: text, x: x, y: y, col: col || 'white', outline: o.outline === undefined ? 'ink' : o.outline,
      t: -(o.delay || 0), life: o.life || 0.9, dy: o.dy === undefined ? 14 : o.dy, bold: !!o.bold, size: o.size
    });
    if (pops.length > 60) { pops.shift(); }
  };

  // 画面右上に出るお知らせ（実績解除など）
  FX.toast = function (title, sub, col) {
    toasts.push({ title: title, sub: sub || '', col: col || 'yellow', t: 0, life: 3.6 });
  };

  FX.update = function (dt) {
    for (var ti = toasts.length - 1; ti >= 0; ti--) {
      toasts[ti].t += dt;
      if (toasts[ti].t > toasts[ti].life) { toasts.splice(ti, 1); }
    }
    if (FX.freeze) { return; }   // ポーズ中・ダイアログ表示中は演出を止める（トーストだけ進む）
    if (stopT > 0) { stopT -= dt; dt = 0; }
    if (shakeT > 0) { shakeT -= dt; }
    if (flashT > 0) { flashT -= dt; }
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      if (p.drag) { p.vx -= p.vx * p.drag * dt; p.vy -= (p.vy - 30) * p.drag * dt * 0.5; }
      p.vy += p.ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (var j = pops.length - 1; j >= 0; j--) {
      var q = pops[j];
      q.t += dt;
      if (q.t >= q.life) { pops.splice(j, 1); }
    }
  };

  FX.draw = function () {
    var G = RP.gfx, ctx = G.ctx, i;
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      var k = p.t / p.life;
      var x = Math.round(p.x), y = Math.round(p.y);
      var a = 1;
      if (p.fade) { a = 1 - k; }
      else if (k > 0.75) { a = 1 - (k - 0.75) / 0.25; }
      if (a <= 0) { continue; }
      if (a < 1) { ctx.globalAlpha = a; }
      switch (p.shape) {
        case 'conf':
          // 回転して見えるよう幅と高さを入れ替える
          if (Math.floor(p.t * 8 + p.spin) % 2) { G.rect(x, y, 2, 1, p.col); } else { G.rect(x, y, 1, 2, p.col); }
          break;
        case 'star':
          G.px(x, y, p.col);
          if (k < 0.6) { G.px(x - 1, y, p.col); G.px(x + 1, y, p.col); G.px(x, y - 1, p.col); G.px(x, y + 1, p.col); }
          break;
        case 'steam':
          G.rect(x, y, p.size + Math.floor(k * 2), p.size + Math.floor(k * 2), p.col);
          break;
        case 'ring':
          ring(x, y, Math.round(p.size * RP.util.ease.outQuad(k)), p.col);
          break;
        case 'coin':
          G.rect(x - 1, y - 2, 3, 4, 'yellow'); G.rect(x, y - 1, 1, 2, 'gold');
          break;
        default:
          G.rect(x, y, p.size, p.size, p.col);
      }
      if (a < 1) { ctx.globalAlpha = 1; }
    }
    for (i = 0; i < pops.length; i++) {
      var q = pops[i];
      if (q.t < 0) { continue; }
      var kk = q.t / q.life;
      var yy = q.y - q.dy * RP.util.ease.outCubic(Math.min(1, kk * 1.4));
      var al = kk > 0.7 ? 1 - (kk - 0.7) / 0.3 : 1;
      RP.text.draw(q.text, q.x, yy, q.col, { align: 'c', outline: q.outline, bold: q.bold, alpha: al, size: q.size });
    }
    // トースト（上から順に積む）
    for (i = 0; i < toasts.length && i < 3; i++) {
      var to = toasts[i], k2 = to.t / to.life;
      var slideX = k2 < 0.1 ? (1 - k2 / 0.1) * 150 : (k2 > 0.88 ? ((k2 - 0.88) / 0.12) * 150 : 0);
      var bx = RP.W - 148 + slideX, by = 16 + i * 26;
      G.rrect(bx - 1, by - 1, 146, 24, 'ink'); G.rrect(bx, by, 144, 22, '#2e2640');
      G.rect(bx + 2, by + 1, 140, 1, to.col);
      RP.gfx.sprite('ic_star', bx + 4, by + 6);
      RP.text.draw(to.title, bx + 16, by + 2, to.col, { size: 10 });
      RP.text.draw(to.sub, bx + 16, by + 12, 'white', { size: 10 });
    }
    if (flashT > 0) {
      ctx.globalAlpha = flashA * (flashT / flashDur);
      G.rect(0, 0, RP.W, RP.H, flashCol);
      ctx.globalAlpha = 1;
    }
  };

  function ring(cx, cy, r, col) {
    var G = RP.gfx;
    if (r < 1) { G.px(cx, cy, col); return; }
    var x = r, y = 0, err = 0;
    while (x >= y) {
      G.px(cx + x, cy + y, col); G.px(cx + y, cy + x, col); G.px(cx - y, cy + x, col); G.px(cx - x, cy + y, col);
      G.px(cx - x, cy - y, col); G.px(cx - y, cy - x, col); G.px(cx + y, cy - x, col); G.px(cx + x, cy - y, col);
      y++;
      err += 1 + 2 * y;
      if (2 * (err - x) + 1 > 0) { x--; err += 1 - 2 * x; }
    }
  }
})(window.RP);
