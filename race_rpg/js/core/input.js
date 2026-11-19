/* 入力: キーボード / ゲームパッド / ソフトキー を論理ボタンへ統合 */
(function () {
  'use strict';
  var RR = window.RR;
  var BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select', 'l', 'r'];

  var KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'a', Space: 'a', KeyJ: 'a',
    KeyX: 'b', Backspace: 'b', KeyK: 'b',
    Enter: 'start', Escape: 'start', NumpadEnter: 'start',
    ShiftLeft: 'select', ShiftRight: 'select', Tab: 'select',
    KeyQ: 'l', KeyE: 'r', KeyU: 'l', KeyO: 'r'
  };

  // code が取れない環境（一部のブラウザ・自動操作）向けに key でも判定する
  var KEYMAP2 = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', z: 'a', ' ': 'a', j: 'a', x: 'b', Backspace: 'b', k: 'b',
    Enter: 'start', Escape: 'start', Shift: 'select', Tab: 'select', q: 'l', e: 'r', u: 'l', o: 'r'
  };
  function mapKey(e) {
    return KEYMAP[e.code] || KEYMAP2[e.key] || KEYMAP2[(e.key || '').toLowerCase()];
  }
  var src = { key: {}, pad: {}, touch: {}, latch: {} }; // latch: 1フレーム内の押して離すを取りこぼさない
  var cur = {}, prev = {}, holdFrames = {};
  BUTTONS.forEach(function (b) { cur[b] = false; prev[b] = false; holdFrames[b] = 0; });

  var lastDevice = 'key';
  var anyListeners = [];

  function onFirstInteraction() {
    if (RR.Audio && RR.Audio.unlock) RR.Audio.unlock();
    anyListeners.forEach(function (f) { f(); });
  }

  window.addEventListener('keydown', function (e) {
    var b = mapKey(e);
    if (e.code === 'F2' && RR.DEBUG) { RR.Debug && RR.Debug.toggle(); }
    if (b) {
      src.key[b] = true;
      src.latch[b] = true;
      lastDevice = 'key';
      e.preventDefault();
    }
    onFirstInteraction();
  });
  window.addEventListener('keyup', function (e) {
    var b = mapKey(e);
    if (b) { src.key[b] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', function () {
    src.key = {}; src.touch = {}; src.latch = {};
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { src.key = {}; src.touch = {}; }
  });

  function pollPad() {
    src.pad = {};
    if (!navigator.getGamepads) return;
    var pads;
    try { pads = navigator.getGamepads(); } catch (e) { return; }
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p || !p.connected) continue;
      var bt = p.buttons, ax = p.axes;
      var pr = function (n) { return bt[n] && (bt[n].pressed || bt[n].value > 0.5); };
      var s = src.pad;
      if (pr(0)) s.a = true;
      if (pr(1)) s.b = true;
      if (pr(2)) s.b = true;      // X も B 扱い（ブレーキを押しやすく）
      if (pr(3)) s.a = true;      // Y も A 扱い
      if (pr(4) || pr(6)) s.l = true;
      if (pr(5) || pr(7)) s.r = true;
      if (pr(8)) s.select = true;
      if (pr(9)) s.start = true;
      if (pr(12)) s.up = true;
      if (pr(13)) s.down = true;
      if (pr(14)) s.left = true;
      if (pr(15)) s.right = true;
      if (ax.length >= 2) {
        if (ax[0] < -0.45) s.left = true;
        if (ax[0] > 0.45) s.right = true;
        if (ax[1] < -0.45) s.up = true;
        if (ax[1] > 0.45) s.down = true;
      }
      for (var k in s) { if (s[k]) { lastDevice = 'pad'; onFirstInteraction(); break; } }
    }
  }

  var Input = RR.Input = {
    BUTTONS: BUTTONS,
    // フレーム毎に1回呼ぶ
    update: function () {
      pollPad();
      BUTTONS.forEach(function (b) {
        prev[b] = cur[b];
        cur[b] = !!(src.key[b] || src.pad[b] || src.touch[b] || src.latch[b]);
        holdFrames[b] = cur[b] ? holdFrames[b] + 1 : 0;
      });
      src.latch = {};
    },
    held: function (b) { return cur[b]; },
    pressed: function (b) { return cur[b] && !prev[b]; },
    released: function (b) { return !cur[b] && prev[b]; },
    // メニュー用のキーリピート
    repeat: function (b) {
      var h = holdFrames[b];
      return cur[b] && (h === 1 || (h > 18 && (h - 18) % 5 === 0));
    },
    holdTime: function (b) { return holdFrames[b]; },
    anyPressed: function () {
      for (var i = 0; i < BUTTONS.length; i++) if (Input.pressed(BUTTONS[i])) return true;
      return false;
    },
    // 決定/キャンセルの瞬間
    ok: function () { return Input.pressed('a'); },
    cancel: function () { return Input.pressed('b'); },
    clear: function () {
      BUTTONS.forEach(function (b) { prev[b] = true; cur[b] = true; });
      src.key = {}; src.touch = {}; src.latch = {};
    },
    // このフレームの「押した瞬間」を消費する（UIが処理した入力をシーンに渡さない）
    consume: function () {
      BUTTONS.forEach(function (b) { prev[b] = cur[b]; });
    },
    lastDevice: function () { return lastDevice; },
    onAny: function (f) { anyListeners.push(f); },
    setTouch: function (b, v) {
      src.touch[b] = v;
      if (v) src.latch[b] = true;
      lastDevice = 'touch';
      if (v) onFirstInteraction();
    }
  };

  // ---- ソフトキー（DOM） ----
  var Pad = RR.SoftPad = { el: null, visible: false };

  function bindButton(el, btn) {
    var active = {};
    function down(e) {
      e.preventDefault();
      active[e.pointerId] = true;
      try { el.setPointerCapture(e.pointerId); } catch (er) { }
      Input.setTouch(btn, true);
      el.classList.add('on');
    }
    function up(e) {
      delete active[e.pointerId];
      if (Object.keys(active).length === 0) {
        Input.setTouch(btn, false);
        el.classList.remove('on');
      }
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function bindDpad(el) {
    var pid = null;
    function set(dirs) {
      ['up', 'down', 'left', 'right'].forEach(function (d) {
        Input.setTouch(d, !!dirs[d]);
        el.classList.toggle('d-' + d, !!dirs[d]);
      });
    }
    function calc(e) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = e.clientX - cx, dy = e.clientY - cy;
      var dead = r.width * 0.12;
      var dirs = {};
      if (Math.abs(dx) < dead && Math.abs(dy) < dead) { set(dirs); return; }
      var ang = Math.atan2(dy, dx); // -PI..PI, 0 = 右
      var oct = Math.round(ang / (Math.PI / 4)); // -4..4
      if (oct === 0) dirs.right = true;
      else if (oct === 1) { dirs.right = true; dirs.down = true; }
      else if (oct === 2) dirs.down = true;
      else if (oct === 3) { dirs.down = true; dirs.left = true; }
      else if (oct === 4 || oct === -4) dirs.left = true;
      else if (oct === -3) { dirs.left = true; dirs.up = true; }
      else if (oct === -2) dirs.up = true;
      else if (oct === -1) { dirs.up = true; dirs.right = true; }
      set(dirs);
    }
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (er) { }
      calc(e);
    });
    el.addEventListener('pointermove', function (e) { if (e.pointerId === pid) calc(e); });
    function end(e) { if (e.pointerId === pid) { pid = null; set({}); } }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  Pad.build = function (root) {
    var pad = document.createElement('div');
    pad.id = 'pad';
    pad.innerHTML =
      '<div class="sk dpad" data-k="dpad"><div class="dp-h"></div><div class="dp-v"></div><div class="dp-c"></div></div>' +
      '<div class="sk btn btn-a" data-k="a"><span>A</span></div>' +
      '<div class="sk btn btn-b" data-k="b"><span>B</span></div>' +
      '<div class="sk pill btn-start" data-k="start"><span>START</span></div>' +
      '<div class="sk pill btn-select" data-k="select"><span>SELECT</span></div>' +
      '<div class="sk sh btn-l" data-k="l"><span>L</span></div>' +
      '<div class="sk sh btn-r" data-k="r"><span>R</span></div>';
    root.appendChild(pad);
    Pad.el = pad;
    Array.prototype.forEach.call(pad.querySelectorAll('.sk'), function (el) {
      var k = el.getAttribute('data-k');
      if (k === 'dpad') bindDpad(el); else bindButton(el, k);
    });
    pad.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    return pad;
  };
})();
