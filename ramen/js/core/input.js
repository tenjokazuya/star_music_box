/* 入力統合：マウス/タッチ(ポインタ) + キーボード + ゲームパッド。
 * すべて「論理座標」と「アクション名」に正規化して扱う。
 * 毎フレーム先頭で RP.input.update(dt) を呼ぶと、前フレーム以降のイベントが「このフレームの入力」になる。 */
(function (RP) {
  'use strict';

  var I = RP.input = {};
  var canvas = null;

  var pointers = {};        // id → { id, x, y, down, downX, downY, downAt }
  var pendTaps = [], pendRel = [];
  var pendPressed = {}, pendRaw = {};
  var heldKeys = {};        // アクション → 押下中の物理キー数
  var heldRaw = {};
  var padHeld = {};         // アクション → ゲームパッド押下
  var padPrev = {};
  var repeatT = {};         // アクション → 押しっぱなし経過秒

  I.taps = [];              // このフレームに押された { id, x, y, used }
  I.releases = [];          // このフレームに離された { id, x, y }
  I.blocked = false;        // true の間は入力を無効化（トランジション中など）
  I.lastDevice = 'pointer'; // 最後に使われた入力デバイス（ヒント表示切替用）
  I.onFirstGesture = null;  // AudioContext解禁など

  var pressed = {}, rawPressed = {}, rep = {};

  var ACTION = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', KeyZ: 'ok',
    Escape: 'cancel', KeyX: 'cancel', Backspace: 'cancel',
    KeyP: 'menu', KeyM: 'menu', Tab: 'menu'
  };

  function gesture() {
    if (I.onFirstGesture) { try { I.onFirstGesture(); } catch (e) { RP.log.error(e); } }
  }

  function toLogical(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (RP.W / r.width),
      y: (e.clientY - r.top) * (RP.H / r.height)
    };
  }

  function toggleFullscreen() {
    var el = document.documentElement;
    try {
      if (!document.fullscreenElement) { if (el.requestFullscreen) { el.requestFullscreen(); } }
      else if (document.exitFullscreen) { document.exitFullscreen(); }
    } catch (err) { RP.log.warn('フルスクリーン切替に失敗', err); }
  }
  I.toggleFullscreen = toggleFullscreen;

  I.init = function (cv) {
    canvas = cv;
    canvas.addEventListener('pointerdown', function (e) {
      gesture();
      I.lastDevice = 'pointer';
      var p = toLogical(e);
      pointers[e.pointerId] = { id: e.pointerId, x: p.x, y: p.y, down: true, downX: p.x, downY: p.y, downAt: performance.now() };
      pendTaps.push({ id: e.pointerId, x: p.x, y: p.y, used: false });
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = toLogical(e);
      var pt = pointers[e.pointerId];
      if (pt) { pt.x = p.x; pt.y = p.y; }
      else if (e.pointerType === 'mouse') {
        pointers[e.pointerId] = { id: e.pointerId, x: p.x, y: p.y, down: false, downX: p.x, downY: p.y, downAt: 0 };
      }
    });
    function up(e) {
      var pt = pointers[e.pointerId];
      var p = toLogical(e);
      if (pt && pt.down) { pendRel.push({ id: e.pointerId, x: p.x, y: p.y }); }
      if (pt) {
        if (e.pointerType === 'mouse') { pt.down = false; pt.x = p.x; pt.y = p.y; }
        else { delete pointers[e.pointerId]; }
      }
      gesture();
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('keydown', function (e) {
      gesture();
      // Alt+Enter でフルスクリーン切り替え（デスクトップ/Steam）
      if (e.altKey && e.code === 'Enter') { toggleFullscreen(); e.preventDefault(); return; }
      I.lastDevice = 'key';
      var a = ACTION[e.code];
      if (e.repeat) { if (a || e.code.indexOf('Digit') === 0) { e.preventDefault(); } return; }
      heldRaw[e.code] = true;
      pendRaw[e.code] = true;
      if (a) {
        heldKeys[a] = (heldKeys[a] || 0) + 1;
        pendPressed[a] = true;
        e.preventDefault();
      } else if (e.code.indexOf('Digit') === 0 || e.code.indexOf('Numpad') === 0) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) {
      var a = ACTION[e.code];
      if (heldRaw[e.code]) {
        delete heldRaw[e.code];
        if (a) { heldKeys[a] = Math.max(0, (heldKeys[a] || 1) - 1); }
      }
    });
    window.addEventListener('blur', function () {
      heldKeys = {}; heldRaw = {};
      Object.keys(pointers).forEach(function (id) {
        if (pointers[id].down) { pendRel.push({ id: +id, x: pointers[id].x, y: pointers[id].y }); }
        pointers[id].down = false;
      });
    });
  };

  // ゲームパッド → アクション
  var PAD_MAP = [
    [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'],
    [0, 'ok'], [1, 'cancel'], [9, 'menu'], [2, 'ok'], [3, 'menu']
  ];
  function pollPad() {
    var pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    var cur = {};
    for (var i = 0; i < pads.length; i++) {
      var gp = pads[i];
      if (!gp) { continue; }
      PAD_MAP.forEach(function (m) {
        var b = gp.buttons[m[0]];
        if (b && (b.pressed || b.value > 0.5)) { cur[m[1]] = true; }
      });
      if (gp.axes.length >= 2) {
        if (gp.axes[0] < -0.5) { cur.left = true; }
        if (gp.axes[0] > 0.5) { cur.right = true; }
        if (gp.axes[1] < -0.5) { cur.up = true; }
        if (gp.axes[1] > 0.5) { cur.down = true; }
      }
    }
    Object.keys(cur).forEach(function (a) {
      if (!padPrev[a]) { pendPressed[a] = true; I.lastDevice = 'pad'; gesture(); }
    });
    padHeld = cur;
    padPrev = cur;
  }

  I.update = function (dt) {
    pollPad();
    if (I.blocked) {
      I.taps = []; I.releases = []; pressed = {}; rawPressed = {}; rep = {};
      pendTaps = []; pendRel = []; pendPressed = {}; pendRaw = {};
      return;
    }
    I.taps = pendTaps; pendTaps = [];
    I.releases = pendRel; pendRel = [];
    pressed = pendPressed; pendPressed = {};
    rawPressed = pendRaw; pendRaw = {};
    // 方向キーのオートリピート
    rep = {};
    ['up', 'down', 'left', 'right'].forEach(function (a) {
      if (I.held(a)) {
        repeatT[a] = (repeatT[a] || 0) + dt;
        if (pressed[a]) { repeatT[a] = 0; rep[a] = true; }
        else if (repeatT[a] > 0.35) {
          repeatT[a] -= 0.09; rep[a] = true;
        }
      } else { repeatT[a] = 0; }
    });
  };

  // ---- アクション ----
  I.pressed = function (a) { return !!pressed[a]; };
  I.nav = function (a) { return !!(pressed[a] || rep[a]); };       // オートリピート込み
  I.held = function (a) { return !!(heldKeys[a] > 0 || padHeld[a]); };
  I.rawPressed = function (code) { return !!rawPressed[code]; };
  I.rawHeld = function (code) { return !!heldRaw[code]; };
  I.consumeAction = function (a) { var r = !!pressed[a]; pressed[a] = false; return r; };

  // ---- ポインタ ----
  I.pointerList = function () {
    var out = [];
    Object.keys(pointers).forEach(function (id) { out.push(pointers[id]); });
    return out;
  };
  // 現在押されている指/ボタンの座標群
  I.downPoints = function () {
    if (I.blocked) { return []; }
    return I.pointerList().filter(function (p) { return p.down; });
  };
  I.hover = function () {
    var l = I.pointerList();
    for (var i = 0; i < l.length; i++) { if (l[i].down === false) { return l[i]; } }
    return null;
  };
  // 矩形内で今フレーム押された（消費する）
  I.tapIn = function (x, y, w, h) {
    for (var i = 0; i < I.taps.length; i++) {
      var t = I.taps[i];
      if (!t.used && t.x >= x && t.x < x + w && t.y >= y && t.y < y + h) { t.used = true; return t; }
    }
    return null;
  };
  I.peekTapIn = function (x, y, w, h) {
    for (var i = 0; i < I.taps.length; i++) {
      var t = I.taps[i];
      if (!t.used && t.x >= x && t.x < x + w && t.y >= y && t.y < y + h) { return t; }
    }
    return null;
  };
  // 矩形内が押下中か
  I.isDownIn = function (x, y, w, h) {
    var d = I.downPoints();
    for (var i = 0; i < d.length; i++) {
      if (d[i].x >= x && d[i].x < x + w && d[i].y >= y && d[i].y < y + h) { return d[i]; }
    }
    return null;
  };
  I.anyTap = function () { return I.taps.length > 0 || !!pressed.ok; };
  I.clearTaps = function () { I.taps = []; };
  // 開発用：論理座標のタップを1回注入する（自動プレイ・ヘッドレス検証用）
  I.inject = function (x, y) { pendTaps.push({ id: 9999, x: x, y: y, used: false }); pendRel.push({ id: 9999, x: x, y: y }); };
})(window.RP);
