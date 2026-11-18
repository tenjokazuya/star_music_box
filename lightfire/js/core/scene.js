/* scene.js — メインループ・シーンスタック・モーダル・画面効果 */
(function () {
  'use strict';
  PF.time = 0;
  PF.scenes = [];
  PF.modals = [];

  var canvas, ctx, last = 0, acc = 0, STEP = 1000 / 60;

  PF.scene = {
    top: function () { return PF.scenes[PF.scenes.length - 1]; },
    push: function (s) { PF.scenes.push(s); if (s.onEnter) s.onEnter(); return s; },
    pop: function () { var s = PF.scenes.pop(); if (s && s.onExit) s.onExit(); var t = PF.scene.top(); if (t && t.onResume) t.onResume(); return s; },
    replace: function (s) { while (PF.scenes.length) { var o = PF.scenes.pop(); if (o.onExit) o.onExit(); } return PF.scene.push(s); }
  };

  /* ---- モーダル（会話・メニュー等。Promise を返す） ---- */
  PF.openModal = function (m) {
    return new Promise(function (res) { m._res = res; PF.modals.push(m); if (m.onOpen) m.onOpen(); });
  };
  PF.closeModal = function (m, val) {
    var i = PF.modals.indexOf(m); if (i >= 0) PF.modals.splice(i, 1);
    if (m.onClose) m.onClose();
    if (m._res) { var r = m._res; m._res = null; r(val); }
  };

  /* ---- 画面効果 ---- */
  var fx = PF.fx = {
    fadeA: 0, fadeTarget: 0, fadeSpeed: 0.05, fadeColor: '#000000', fadeRes: null,
    flashA: 0, flashColor: '#ffffff',
    blinds: 0, blindsTarget: 0, blindsSpeed: 0.04, blindsRes: null,
    shakeAmp: 0, shakeT: 0,
    fade: function (to, frames, color) {
      if (color) fx.fadeColor = color;
      fx.fadeTarget = to; fx.fadeSpeed = Math.max(0.001, Math.abs(to - fx.fadeA) / Math.max(1, frames));
      if (Math.abs(to - fx.fadeA) < 0.001) return Promise.resolve();
      return new Promise(function (r) { fx.fadeRes = r; });
    },
    flash: function (color, a) { fx.flashColor = color || '#ffffff'; fx.flashA = a === undefined ? 1 : a; },
    shake: function (amp, frames) { fx.shakeAmp = amp; fx.shakeT = frames; },
    wipe: function (to, frames) {
      fx.blindsTarget = to; fx.blindsSpeed = Math.max(0.001, Math.abs(to - fx.blinds) / Math.max(1, frames));
      if (Math.abs(to - fx.blinds) < 0.001) return Promise.resolve();
      return new Promise(function (r) { fx.blindsRes = r; });
    },
    update: function () {
      if (fx.fadeA !== fx.fadeTarget) {
        var d = fx.fadeTarget - fx.fadeA;
        if (Math.abs(d) <= fx.fadeSpeed) { fx.fadeA = fx.fadeTarget; if (fx.fadeRes) { var r = fx.fadeRes; fx.fadeRes = null; r(); } }
        else fx.fadeA += Math.sign(d) * fx.fadeSpeed;
      }
      if (fx.blinds !== fx.blindsTarget) {
        var d2 = fx.blindsTarget - fx.blinds;
        if (Math.abs(d2) <= fx.blindsSpeed) { fx.blinds = fx.blindsTarget; if (fx.blindsRes) { var r2 = fx.blindsRes; fx.blindsRes = null; r2(); } }
        else fx.blinds += Math.sign(d2) * fx.blindsSpeed;
      }
      if (fx.flashA > 0) fx.flashA = Math.max(0, fx.flashA - 0.07);
      if (fx.shakeT > 0) fx.shakeT--; else fx.shakeAmp = 0;
    },
    draw: function (g) {
      if (fx.blinds > 0) {
        g.fillStyle = '#000';
        var n = 10, h = PF.H / n;
        for (var i = 0; i < n; i++) g.fillRect(0, Math.floor(i * h), PF.W, Math.ceil(h * Math.min(1, fx.blinds * 1.25)) + (fx.blinds >= 1 ? 1 : 0));
      }
      if (fx.flashA > 0) { g.globalAlpha = fx.flashA; g.fillStyle = fx.flashColor; g.fillRect(0, 0, PF.W, PF.H); g.globalAlpha = 1; }
      if (fx.fadeA > 0) { g.globalAlpha = Math.min(1, fx.fadeA); g.fillStyle = fx.fadeColor; g.fillRect(0, 0, PF.W, PF.H); g.globalAlpha = 1; }
    },
    reset: function () { fx.fadeA = fx.fadeTarget = 0; fx.blinds = fx.blindsTarget = 0; fx.flashA = 0; fx.shakeAmp = 0; fx.shakeT = 0; }
  };

  /* ---- ループ ---- */
  function step() {
    PF.input.update();
    PF.time++;
    PF.updateWaiters();
    fx.update();
    var m = PF.modals[PF.modals.length - 1];
    if (m) m.update();
    var s = PF.scene.top();
    if (s) s.update(!!m);
  }
  function render() {
    ctx.save();
    if (fx.shakeAmp > 0 && fx.shakeT > 0) ctx.translate(PF.rnd(fx.shakeAmp * 2 + 1) - fx.shakeAmp, PF.rnd(fx.shakeAmp * 2 + 1) - fx.shakeAmp);
    var i0 = PF.scenes.length - 1;
    while (i0 > 0 && PF.scenes[i0].overlay) i0--;
    for (var i = Math.max(0, i0); i < PF.scenes.length; i++) PF.scenes[i].draw(ctx);
    for (var j = 0; j < PF.modals.length; j++) PF.modals[j].draw(ctx);
    ctx.restore();
    fx.draw(ctx);
  }
  function frame(t) {
    requestAnimationFrame(frame);
    if (!last) last = t;
    var dt = t - last; last = t;
    if (dt > 250) dt = STEP;
    acc += dt;
    var n = 0;
    while (acc >= STEP && n < 5) { try { step(); } catch (e) { console.error(e); PF.lastError = e; } acc -= STEP; n++; }
    if (acc > STEP * 5) acc = 0;
    try { render(); } catch (e2) { console.error(e2); PF.lastError = e2; }
  }

  PF.boot = function () {
    canvas = document.getElementById('screen'); ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    PF.screen = canvas; PF.g = ctx;
    PF.initInput();
    PF.gfx.build();
    PF.save.loadSettings();
    PF.title.start();
    requestAnimationFrame(frame);
  };
  PF.stepOnce = function (n) { for (var i = 0; i < (n || 1); i++) step(); render(); }; // テスト用
})();
