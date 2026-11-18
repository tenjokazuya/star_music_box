/* input.js — キーボード / ゲームパッド / タッチ(ソフトキー) と 画面レイアウト */
(function () {
  'use strict';
  var BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
  var KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'a', Enter: 'a', Space: 'a', KeyJ: 'a',
    KeyX: 'b', Backspace: 'b', KeyK: 'b', ShiftLeft: 'b', ShiftRight: 'b',
    Escape: 'start', Tab: 'start', KeyM: 'start',
    KeyC: 'select', KeyR: 'select'
  };
  var keys = {}, touch = {}, pad = {}, latch = {}, virt = {};
  var held = {}, prev = {}, pressedNow = {}, repeatT = {};
  var gestureCbs = [];

  var I = PF.input = {
    held: held, BTN: BTN, lastSource: 'key',
    update: function () {
      pollPad();
      for (var i = 0; i < BTN.length; i++) {
        var b = BTN[i];
        var h = !!(keys[b] || touch[b] || pad[b] || latch[b] || virt[b] > 0); latch[b] = false; if (virt[b] > 0) virt[b]--;
        prev[b] = held[b];
        held[b] = h;
        pressedNow[b] = h && !prev[b];
        repeatT[b] = h ? (repeatT[b] || 0) + 1 : 0;
      }
      // 左右同時押し等の矛盾を除去
      if (held.up && held.down) held.up = held.down = false;
      if (held.left && held.right) held.left = held.right = false;
    },
    down: function (b) { return !!held[b]; },
    pressed: function (b) { return !!pressedNow[b]; },
    // 押した瞬間と、押しっぱなしのリピート（メニュー用）
    repeat: function (b) {
      var t = repeatT[b] || 0;
      return t === 1 || (t > 18 && (t - 18) % 5 === 0);
    },
    anyPressed: function () {
      for (var i = 0; i < BTN.length; i++) if (pressedNow[BTN[i]]) return true;
      return false;
    },
    // 方向キー(リピート付き)を単一方向で返す
    dirRepeat: function () {
      if (I.repeat('up')) return 'u'; if (I.repeat('down')) return 'd';
      if (I.repeat('left')) return 'l'; if (I.repeat('right')) return 'r';
      return null;
    },
    heldDir: function () {
      if (held.up) return 'u'; if (held.down) return 'd';
      if (held.left) return 'l'; if (held.right) return 'r';
      return null;
    },
    // テスト用: 仮想ボタン入力（frames フレーム押し続ける）
    tap: function (b, frames) { virt[b] = frames || 3; },
    clear: function () { for (var i = 0; i < BTN.length; i++) { pressedNow[BTN[i]] = false; prev[BTN[i]] = true; } },
    onGesture: function (f) { gestureCbs.push(f); },
    vibrate: function (ms) { try { if (navigator.vibrate && I.lastSource === 'touch' && PF.settings && PF.settings.vib !== 0) navigator.vibrate(ms); } catch (e) { } }
  };

  function gesture() { for (var i = 0; i < gestureCbs.length; i++) gestureCbs[i](); }

  window.addEventListener('keydown', function (e) {
    var b = KEYMAP[e.code];
    if (b) { keys[b] = true; latch[b] = true; I.lastSource = 'key'; e.preventDefault(); gesture(); }
    if (e.code === 'F9' && PF.debug) { PF.emit('debugkey'); }
  });
  window.addEventListener('keyup', function (e) {
    var b = KEYMAP[e.code]; if (b) { keys[b] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', function () { keys = {}; touch = {}; });

  /* ---- ゲームパッド ---- */
  function pollPad() {
    var gps = navigator.getGamepads ? navigator.getGamepads() : [];
    var any = false, np = {};
    for (var i = 0; i < gps.length; i++) {
      var g = gps[i]; if (!g || !g.connected) continue;
      var B = g.buttons, ax = g.axes;
      function bt(n) { return B[n] && (B[n].pressed || B[n].value > 0.5); }
      if (bt(12) || (ax[1] < -0.55)) np.up = true;
      if (bt(13) || (ax[1] > 0.55)) np.down = true;
      if (bt(14) || (ax[0] < -0.55)) np.left = true;
      if (bt(15) || (ax[0] > 0.55)) np.right = true;
      if (bt(0) || bt(3)) np.a = true;
      if (bt(1) || bt(2)) np.b = true;
      if (bt(9)) np.start = true;
      if (bt(8)) np.select = true;
      if (bt(4) || bt(5) || bt(6) || bt(7)) np.b = true; // 肩ボタンもダッシュ
    }
    for (var k in np) { any = true; }
    if (any) { I.lastSource = 'pad'; if (!pad._any) gesture(); }
    np._any = any; pad = np;
  }

  /* ---- タッチ・ソフトキー ---- */
  var els = {};
  function mk(cls, txt, btn) {
    var d = document.createElement('div'); d.className = 'pbtn ' + (cls || ''); d.textContent = txt || '';
    d.dataset.btn = btn; els[btn] = d; padRoot.appendChild(d);
    function dn(e) { e.preventDefault(); touch[btn] = true; latch[btn] = true; I.lastSource = 'touch'; d.classList.add('on'); gesture(); I.vibrate(8); }
    function up(e) { e.preventDefault(); touch[btn] = false; d.classList.remove('on'); }
    d.addEventListener('pointerdown', dn); d.addEventListener('pointerup', up);
    d.addEventListener('pointercancel', up); d.addEventListener('pointerleave', up);
    return d;
  }
  var padRoot, dpad, dhl;
  function buildPad() {
    padRoot = document.getElementById('pad');
    dpad = document.createElement('div'); dpad.id = 'dpad';
    dpad.innerHTML = '<i class="u"></i><i class="d"></i><i class="l"></i><i class="r"></i><div class="hl"></div>';
    dhl = dpad.querySelector('.hl');
    padRoot.appendChild(dpad);
    var active = null;
    function setDir(e) {
      var r = dpad.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      touch.up = touch.down = touch.left = touch.right = false;
      var dead = r.width * 0.12;
      if (Math.abs(dx) < dead && Math.abs(dy) < dead) { dhl.style.display = 'none'; return; }
      var d = PF.dirFromDelta(dx, dy);
      if (d === 'u') touch.up = true; else if (d === 'd') touch.down = true;
      else if (d === 'l') touch.left = true; else touch.right = true;
      var off = r.width * 0.33;
      dhl.style.display = 'block';
      dhl.style.left = (r.width / 2 + (d === 'l' ? -off : d === 'r' ? off : 0) - r.width * 0.17) + 'px';
      dhl.style.top = (r.height / 2 + (d === 'u' ? -off : d === 'd' ? off : 0) - r.height * 0.17) + 'px';
    }
    dpad.addEventListener('pointerdown', function (e) { e.preventDefault(); active = e.pointerId; try { dpad.setPointerCapture(active); } catch (x) { } I.lastSource = 'touch'; setDir(e); gesture(); I.vibrate(8); });
    dpad.addEventListener('pointermove', function (e) { if (active === e.pointerId) { e.preventDefault(); setDir(e); } });
    function end(e) { if (active === e.pointerId) { active = null; touch.up = touch.down = touch.left = touch.right = false; dhl.style.display = 'none'; } }
    dpad.addEventListener('pointerup', end); dpad.addEventListener('pointercancel', end);
    mk('', 'A', 'a'); mk('', 'B', 'b');
    mk('pill', 'START', 'start'); mk('pill', 'SELECT', 'select');
  }

  /* ---- レイアウト（整数倍スケール／ソフトキー配置） ---- */
  var isTouch = false;
  function detectTouch() {
    var q = /[?&]pad=(\d)/.exec(location.search);
    if (q) return q[1] === '1';
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
  }
  function place(el, x, y, w, h) {
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
    el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px';
  }
  PF.layout = function () {
    var vw = window.innerWidth, vh = window.innerHeight;
    var wrap = document.getElementById('screenwrap');
    var portrait = vh > vw * 1.05;
    var availW = vw, availH = vh, s;
    if (isTouch && portrait) { availH = vh * 0.62; }
    s = Math.min(availW / 240, availH / 160);
    var si = Math.floor(s);
    if (si >= 1 && si / s >= 0.84) s = si;
    var w = 240 * s, h = 160 * s;
    wrap.style.position = 'absolute';
    var x = (vw - w) / 2, y = (isTouch && portrait) ? Math.max(0, (vh * 0.62 - h) / 2 + 4) : (vh - h) / 2;
    place(wrap, x, y, w, h);
    PF.scale = s;
    if (!isTouch) return;
    var padTop = y + h, padH = vh - padTop;
    var dsz, ax, ay, bx, by, bs, px, py;
    if (portrait) {
      dsz = Math.min(padH * 0.62, vw * 0.44);
      place(dpad, vw * 0.05, padTop + (padH - dsz) * 0.45, dsz, dsz);
      bs = Math.min(padH * 0.30, vw * 0.2);
      place(els.a, vw * 0.95 - bs, padTop + padH * 0.22, bs, bs);
      place(els.b, vw * 0.95 - bs * 2.15, padTop + padH * 0.45, bs, bs);
      var pw = Math.min(vw * 0.22, 84), ph = Math.min(padH * 0.12, 30);
      place(els.start, vw / 2 + 6, vh - ph - 12, pw, ph);
      place(els.select, vw / 2 - pw - 6, vh - ph - 12, pw, ph);
    } else {
      dsz = Math.min(vh * 0.5, vw * 0.22);
      place(dpad, 14, vh - dsz - 14, dsz, dsz);
      bs = Math.min(vh * 0.2, vw * 0.1);
      place(els.a, vw - bs - 16, vh - bs * 2.2 - 14, bs, bs);
      place(els.b, vw - bs * 2.2 - 24, vh - bs * 1.4 - 14, bs, bs);
      var pw2 = Math.min(vw * 0.1, 80), ph2 = 26;
      place(els.start, vw - pw2 - 16, 12, pw2, ph2);
      place(els.select, vw - pw2 * 2 - 24, 12, pw2, ph2);
    }
    // 画面と重なるボタンは少し透過
  };

  PF.initInput = function () {
    isTouch = detectTouch();
    buildPad();
    if (isTouch) document.body.classList.add('touch');
    window.addEventListener('resize', PF.layout);
    window.addEventListener('orientationchange', function () { setTimeout(PF.layout, 150); });
    PF.layout();
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // タッチ初回ジェスチャ
    window.addEventListener('touchend', gesture, { passive: true }); window.addEventListener('click', gesture);
    window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') { isTouch = true; document.body.classList.add('touch'); PF.layout(); } gesture(); }, { passive: true });
  };
})();
