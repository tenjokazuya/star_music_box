(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * 入力: キーボードとポインタ（マウスのドラッグ・タッチのスワイプ）を「操作の名前」に変換する。
   * スワイプ・ドラッグは、1回（指を置いてから離すまで）で1手だけかたむける。
   *   var input = Input.create(canvasElement);
   *   input.onAction = function (name, data) {...};
   *   name: 'tilt'（data.dir=0〜3）／'undo'／'reset'／'hint'／'pause'／'mute'
   *   input.enabled = false にすると操作を受け付けない（メニュー表示中など）。
   * 仕様: managements/project/game-design.md §6。
   */

  var CONFIG = {
    SWIPE_MIN: 24,        // スワイプとみなす最小距離(px)
    UNDO_REPEAT_MS: 110,  // もどすキーを押しっぱなしにしたときの繰り返し間隔
  };

  var KEY_TILT = {
    ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
    w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3,
  };

  function create(target) {
    var input = { enabled: true, onAction: null, swipeEnabled: true };
    var lastUndo = 0;

    function fire(name, data) {
      if (!input.enabled || !input.onAction) return;
      input.onAction(name, data || {});
    }

    function onKeyDown(e) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      var k = e.key;
      if (Object.prototype.hasOwnProperty.call(KEY_TILT, k)) {
        if (!input.enabled) return;
        e.preventDefault();
        if (!e.repeat) fire('tilt', { dir: KEY_TILT[k] });
        return;
      }
      switch (k) {
        case 'z': case 'Z': case 'u': case 'U': case 'Backspace': {
          if (!input.enabled) return;
          e.preventDefault();
          var t = Date.now();
          if (!e.repeat || t - lastUndo >= CONFIG.UNDO_REPEAT_MS) { lastUndo = t; fire('undo'); }
          break;
        }
        case 'r': case 'R':
          if (input.enabled && !e.repeat) fire('reset');
          break;
        case 'h': case 'H':
          if (input.enabled && !e.repeat) fire('hint');
          break;
        case 'Escape': case 'p': case 'P':
          if (!e.repeat && input.onAction) input.onAction('pause', {});
          break;
        case 'm': case 'M':
          if (!e.repeat && input.onAction) input.onAction('mute', {});
          break;
        default:
          break;
      }
    }

    // ---- ポインタ（スワイプ） ----
    // 1回のスワイプ（指を置いてから離すまで）で、かたむけるのは1手だけ。
    // 以前は、24px 動くたびに基準点を更新して連続で入力していたため、ゆっくり長くなぞる普通の操作で
    // 同じ向きの入力が何手も出て、ぬかるみやながれで止まったあとにもう一度動いてしまった（ISSUE-0007）。
    // 素早くはじくと1回のイベントで距離を越えるので、その場合だけ起きなかった。
    var drag = null;

    function onPointerDown(e) {
      if (!input.swipeEnabled) return;
      if (e.isPrimary === false) return;                                  // 2本目以降の指は見ない
      if (e.pointerType === 'mouse' && e.button != null && e.button !== 0) return;   // 右・中ボタンのドラッグは無視
      // 前のスワイプの終わり（pointerup）を取りこぼしていても、新しく押したときにやり直せる
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
      if (target.setPointerCapture) {
        try { target.setPointerCapture(e.pointerId); } catch (err) { /* 失敗しても操作は続けられる */ }
      }
    }

    function onPointerMove(e) {
      if (!drag || drag.done || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < CONFIG.SWIPE_MIN) return;
      // 距離を越えた最初の1回だけ入力する。指を離すまで、この向きにも別の向きにも続けて入力しない
      drag.done = true;
      var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      fire('tilt', { dir: dir });
    }

    function onPointerEnd(e) {
      if (drag && e.pointerId === drag.id) drag = null;
    }

    root.addEventListener('keydown', onKeyDown);
    target.addEventListener('pointerdown', onPointerDown);
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerEnd);
    target.addEventListener('pointercancel', onPointerEnd);
    target.addEventListener('lostpointercapture', onPointerEnd);

    input.destroy = function () {
      root.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerEnd);
      target.removeEventListener('pointercancel', onPointerEnd);
      target.removeEventListener('lostpointercapture', onPointerEnd);
    };
    return input;
  }

  var Input = { CONFIG: CONFIG, create: create };

  Orgel.Input = Input;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Input; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
