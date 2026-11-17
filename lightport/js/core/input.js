/* input.js — キーボード・ゲームパッド・ソフトキーを 8 つの論理ボタンにまとめる */
(function () {
  'use strict';

  var BTNS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Space: 'a', Enter: 'a', KeyJ: 'a',
    KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', Backspace: 'b', KeyK: 'b',
    Escape: 'start', Tab: 'start', KeyM: 'start',
    KeyC: 'select', KeyV: 'select'
  };

  var REP_DELAY = 16;  // キーリピート開始までのフレーム
  var REP_INT = 5;     // リピート間隔

  var down = {};       // btn → 押されている入力源の数（キーボード）
  var keyCodes = {};   // code → true
  var soft = {};       // ソフトキー
  var padState = {};   // ゲームパッド
  var latch = {};      // 1 フレーム未満のタップを逃さないため
  var cur = {}, prev = {}, hold = {};
  BTNS.forEach(function (b) { down[b] = 0; soft[b] = false; padState[b] = false; latch[b] = false; cur[b] = false; prev[b] = false; hold[b] = 0; });

  var input = Game.input = {
    BTNS: BTNS,
    device: 'keyboard',   // 最後に使われた入力機器
    enabled: true
  };

  function releaseAll() {
    keyCodes = {};
    BTNS.forEach(function (b) { down[b] = 0; soft[b] = false; });
  }

  function onKeyDown(e) {
    var b = KEYMAP[e.code];
    if (!b) { return; }
    if (e.ctrlKey || e.altKey || e.metaKey) { return; }
    e.preventDefault();
    input.device = 'keyboard';
    if (keyCodes[e.code]) { return; }
    keyCodes[e.code] = true;
    down[b]++;
    latch[b] = true;
    if (Game.audio && Game.audio.unlock) { Game.audio.unlock(); }
  }
  function onKeyUp(e) {
    var b = KEYMAP[e.code];
    if (!b) { return; }
    if (keyCodes[e.code]) {
      delete keyCodes[e.code];
      down[b] = Math.max(0, down[b] - 1);
    }
    e.preventDefault();
  }

  /** ソフトキー（display.js から呼ばれる） */
  input.setSoft = function (btn, on) {
    if (soft[btn] === on) { return; }
    soft[btn] = on;
    if (on) {
      latch[btn] = true;
      input.device = 'touch';
      if (Game.audio && Game.audio.unlock) { Game.audio.unlock(); }
      if (Game.settings.vibrate && (btn === 'a' || btn === 'b' || btn === 'start') && navigator.vibrate) {
        try { navigator.vibrate(6); } catch (e) { /* 無視 */ }
      }
    }
  };

  function pollGamepad() {
    var pads;
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { pads = []; }
    var s = { up: false, down: false, left: false, right: false, a: false, b: false, start: false, select: false };
    var any = false;
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p || !p.connected) { continue; }
      var bt = p.buttons || [];
      function B(n) { return !!(bt[n] && (bt[n].pressed || bt[n].value > 0.5)); }
      var ax = p.axes || [];
      var lx = ax[0] || 0, ly = ax[1] || 0;
      if (B(12) || ly < -0.55) { s.up = true; }
      if (B(13) || ly > 0.55) { s.down = true; }
      if (B(14) || lx < -0.55) { s.left = true; }
      if (B(15) || lx > 0.55) { s.right = true; }
      if (B(0) || B(3)) { s.a = true; }
      if (B(1) || B(2)) { s.b = true; }
      if (B(9)) { s.start = true; }
      if (B(8)) { s.select = true; }
    }
    BTNS.forEach(function (b) {
      if (s[b] && !padState[b]) { latch[b] = true; any = true; }
      padState[b] = s[b];
    });
    if (any) {
      input.device = 'pad';
      if (Game.audio && Game.audio.unlock) { Game.audio.unlock(); }
    }
  }

  /** 毎フレーム 1 回、ゲーム更新の前に呼ぶ */
  input.update = function () {
    pollGamepad();
    BTNS.forEach(function (b) {
      prev[b] = cur[b];
      var c = down[b] > 0 || soft[b] || padState[b] || latch[b];
      latch[b] = false;
      cur[b] = input.enabled ? c : false;
      hold[b] = cur[b] ? hold[b] + 1 : 0;
    });
  };

  input.held = function (b) { return cur[b]; };
  input.pressed = function (b) { return cur[b] && !prev[b]; };
  input.released = function (b) { return !cur[b] && prev[b]; };
  input.holdFrames = function (b) { return hold[b]; };
  /** 押した瞬間と、押し続けたときの一定間隔で true（メニューのカーソル用） */
  input.repeat = function (b) {
    var h = hold[b];
    if (h === 1) { return true; }
    return h > REP_DELAY && ((h - REP_DELAY) % REP_INT === 0);
  };
  input.anyPressed = function () {
    for (var i = 0; i < BTNS.length; i++) { if (input.pressed(BTNS[i])) { return true; } }
    return false;
  };
  /** 方向キーの現在の向き（なければ null）。上下を優先しない: 最後に押した軸を優先 */
  var lastAxis = null;
  input.direction = function () {
    var u = cur.up, d = cur.down, l = cur.left, r = cur.right;
    var v = u !== d ? (u ? 'up' : 'down') : null;
    var h = l !== r ? (l ? 'left' : 'right') : null;
    if (v && h) {
      // 新しく押した方を優先
      if (hold[v] < hold[h]) { lastAxis = v; } else if (hold[h] < hold[v]) { lastAxis = h; }
      var pick = lastAxis;
      if (pick !== v && pick !== h) { pick = v; }
      return pick;
    }
    return v || h || null;
  };
  /** ボタンの状態を強制的に離した扱いにする（画面遷移直後の誤入力防止） */
  input.clear = function () {
    BTNS.forEach(function (b) { latch[b] = false; prev[b] = true; cur[b] = true; });
  };

  input.init = function () {
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('blur', releaseAll, false);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { releaseAll(); } }, false);
    window.addEventListener('gamepadconnected', function () { input.device = 'pad'; }, false);
  };
})();
