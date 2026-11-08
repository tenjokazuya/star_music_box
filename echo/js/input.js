/* input.js ― 入力統合：キーボード / ゲームパッド / ソフトキー(タッチ) / 画面タップ */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB, CFG = EB.CFG;

  var keys = {};            // 押下中のキー
  var latch = {};           // 押下エッジ（フレーム間に押して離した入力の取りこぼし防止）
  var touchAct = { shot: false, bomb: false, slow: false, pause: false, up: false, down: false, left: false, right: false };
  var touchLatch = { shot: false, bomb: false, pause: false };
  var dpadPointer = -1;
  var tapQ = null;
  var prev = { shot: false, bomb: false, slow: false, pause: false, ok: false, cancel: false };
  var navHold = { up: 0, down: 0, left: 0, right: 0 };
  var padPrev = {};

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'shot', Space: 'shot', KeyJ: 'shot',
    KeyX: 'bomb', KeyK: 'bomb',
    ShiftLeft: 'slow', ShiftRight: 'slow', KeyC: 'slow', KeyL: 'slow',
    Escape: 'pause', KeyP: 'pause',
    Enter: 'enter', Backspace: 'back'
  };

  var Input = {
    dx: 0, dy: 0, shot: false, bomb: false, slow: false,
    pressed: { ok: false, cancel: false, pause: false, bomb: false, shot: false, up: false, down: false, left: false, right: false },
    anyPressed: false,      // 何らかの入力があったフレーム
    padConnected: false,
    lastDevice: 'key',

    init: function () {
      var d = root.document;
      root.addEventListener('keydown', function (e) {
        var a = KEYMAP[e.code];
        if (a) {
          if (!keys[e.code]) latch[a] = true;
          keys[e.code] = true;
          e.preventDefault();
        }
        if (e.code === 'KeyF' && !e.repeat) EB.Platform.isFullscreen() ? EB.Platform.exitFullscreen() : EB.Platform.requestFullscreen();
        if (e.code === 'KeyM' && !e.repeat && EB.Audio) EB.Audio.toggleMute();
        Input.lastDevice = 'key';
      }, false);
      root.addEventListener('keyup', function (e) {
        if (KEYMAP[e.code]) { keys[e.code] = false; e.preventDefault(); }
      }, false);
      root.addEventListener('blur', function () { keys = {}; Input._resetTouch(); });

      // ソフトキー
      var dp = d.getElementById('dpad');
      if (dp) {
        dp.addEventListener('pointerdown', function (e) {
          markTouch();
          dpadPointer = e.pointerId;
          try { dp.setPointerCapture(e.pointerId); } catch (er) { /* 無視 */ }
          dpadMove(e); e.preventDefault();
        });
        dp.addEventListener('pointermove', function (e) { if (e.pointerId === dpadPointer) { dpadMove(e); e.preventDefault(); } });
        var up = function (e) { if (e.pointerId === dpadPointer) { dpadPointer = -1; dpadClear(); } };
        dp.addEventListener('pointerup', up); dp.addEventListener('pointercancel', up); dp.addEventListener('lostpointercapture', up);
      }
      var btns = d.querySelectorAll('.btn');
      for (var i = 0; i < btns.length; i++) bindBtn(btns[i]);

      // 画面タップ（メニュー操作用）
      var view = d.getElementById('view');
      if (view) {
        view.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'touch') markTouch();
          var r = view.getBoundingClientRect();
          tapQ = { x: (e.clientX - r.left) / r.width * CFG.W, y: (e.clientY - r.top) / r.height * CFG.H };
          Input.lastDevice = 'touch';
          e.preventDefault();
        });
      }
      root.addEventListener('gamepadconnected', function () { Input.padConnected = true; });
      root.addEventListener('gamepaddisconnected', function () { Input.padConnected = false; });
      root.document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      Input.showTouch(EB.touchUI);
    },

    showTouch: function (on) {
      EB.touchUI = !!on;
      var t = root.document.getElementById('touch');
      if (t) t.className = on ? '' : 'hidden';
      if (EB.Gfx && EB.Gfx.layout) EB.Gfx.layout();
    },
    relayout: function () { /* 将来用 */ },

    _resetTouch: function () {
      for (var k in touchAct) touchAct[k] = false;
      dpadClear();
    },

    // 論理フレームごとに1回呼ぶ
    update: function () {
      var P = Input.pressed, k, anyKey = false;
      // --- 保持状態の集約 ---
      var held = { up: false, down: false, left: false, right: false, shot: false, bomb: false, slow: false, pause: false, enter: false, back: false };
      for (var code in keys) if (keys[code]) { var a = KEYMAP[code]; if (a) { held[a] = true; anyKey = true; } }
      for (k in latch) if (latch[k]) { held[k] = true; }
      // ゲームパッド
      var pad = pollPad();
      if (pad) { for (k in pad) if (pad[k]) held[k] = true; }
      // タッチ
      for (k in touchAct) if (touchAct[k]) held[k] = true;
      for (k in touchLatch) if (touchLatch[k]) { held[k] = true; }

      Input.dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      Input.dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      Input.shot = held.shot; Input.bomb = held.bomb; Input.slow = held.slow;

      var ok = held.shot || held.enter, cancel = held.bomb || held.back || (held.pause && false);
      P.ok = ok && !prev.ok; P.cancel = cancel && !prev.cancel;
      P.pause = (held.pause || held.enter) && !(prev.pause);
      // Enter は決定としても使うが、ポーズは Esc/P/Start/ボタンのみ
      P.pause = held.pause && !prev.pause;
      P.bomb = held.bomb && !prev.bomb;
      P.shot = held.shot && !prev.shot;
      // タップは決定として扱う
      if (tapQ) P.ok = P.ok || false;

      // ナビゲーション（リピート付き）
      var dirs = ['up', 'down', 'left', 'right'];
      for (var i = 0; i < 4; i++) {
        var dn = dirs[i];
        if (held[dn]) { navHold[dn]++; } else navHold[dn] = 0;
        var n = navHold[dn];
        P[dn] = (n === 1) || (n > 22 && ((n - 22) % 6 === 0));
      }
      prev.shot = held.shot; prev.bomb = held.bomb; prev.slow = held.slow; prev.pause = held.pause;
      prev.ok = ok; prev.cancel = cancel;

      Input.anyPressed = P.ok || P.cancel || P.pause || P.up || P.down || P.left || P.right || !!tapQ;

      // ラッチをクリア（押しっぱなしでなければ）
      for (k in latch) latch[k] = false;
      for (k in touchLatch) touchLatch[k] = false;
    },

    // 画面タップの取得（消費）
    takeTap: function () { var t = tapQ; tapQ = null; return t; },
    peekTap: function () { return tapQ; }
  };

  function markTouch() {
    if (!EB.touchUI) { EB.Platform.markTouchSeen(); Input.showTouch(true); }
    Input.lastDevice = 'touch';
  }

  function bindBtn(el) {
    var act = el.getAttribute('data-act'), pid = -1;
    el.addEventListener('pointerdown', function (e) {
      markTouch();
      pid = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (er) { /* 無視 */ }
      touchAct[act] = true;
      if (touchLatch.hasOwnProperty(act)) touchLatch[act] = true;
      el.classList.add('on');
      if (EB.Platform.vibrate) EB.Platform.vibrate(8);
      e.preventDefault(); e.stopPropagation();
    });
    function rel(e) {
      if (e.pointerId !== pid) return;
      pid = -1; touchAct[act] = false; el.classList.remove('on');
    }
    el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel); el.addEventListener('lostpointercapture', rel);
  }

  function dpadClear() {
    touchAct.up = touchAct.down = touchAct.left = touchAct.right = false;
    var kn = root.document.getElementById('knob');
    if (kn) { kn.style.left = '50px'; kn.style.top = '50px'; }
  }
  function dpadMove(e) {
    var dp = root.document.getElementById('dpad'), r = dp.getBoundingClientRect();
    var rad = r.width / 2, cx = r.left + rad, cy = r.top + r.height / 2;
    var vx = (e.clientX - cx) / rad, vy = (e.clientY - cy) / rad;
    var m = Math.sqrt(vx * vx + vy * vy);
    var th = 0.28;
    touchAct.left = vx < -th; touchAct.right = vx > th; touchAct.up = vy < -th; touchAct.down = vy > th;
    if (m > 1) { vx /= m; vy /= m; m = 1; }
    var kn = root.document.getElementById('knob');
    if (kn) {
      var sc = r.width / 150;      // CSS上の見かけ倍率
      kn.style.left = (50 + vx * 50 / 1) + 'px'; kn.style.top = (50 + vy * 50 / 1) + 'px';
      void sc;
    }
  }

  function pollPad() {
    var nav = root.navigator;
    if (!nav || !nav.getGamepads) return null;
    var gps;
    try { gps = nav.getGamepads(); } catch (e) { return null; }
    if (!gps) return null;
    var out = { up: false, down: false, left: false, right: false, shot: false, bomb: false, slow: false, pause: false };
    var found = false;
    for (var i = 0; i < gps.length; i++) {
      var g = gps[i];
      if (!g || !g.connected) continue;
      found = true;
      var ax = g.axes || [], b = g.buttons || [];
      function B(n) { return b[n] && (b[n].pressed || b[n].value > 0.5); }
      var lx = ax[0] || 0, ly = ax[1] || 0;
      if (lx < -0.4 || B(14)) out.left = true;
      if (lx > 0.4 || B(15)) out.right = true;
      if (ly < -0.4 || B(12)) out.up = true;
      if (ly > 0.4 || B(13)) out.down = true;
      if (B(0) || B(2)) out.shot = true;
      if (B(1) || B(3)) out.bomb = true;
      if (B(4) || B(5) || B(6) || B(7)) out.slow = true;
      if (B(9)) out.pause = true;
      if (out.up || out.down || out.left || out.right || out.shot || out.bomb || out.pause) Input.lastDevice = 'pad';
    }
    Input.padConnected = found;
    return found ? out : null;
  }

  EB.Input = Input;
})();
