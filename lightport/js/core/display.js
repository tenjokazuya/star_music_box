/* display.js — 画面の整数倍拡大、縦横レイアウト、ソフトキーの入力処理 */
(function () {
  'use strict';

  var display = Game.display = { scale: 1, padOn: false };
  var stage, canvas, pad, dpad, abtn, sysbtn;

  function isTouchDevice() {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) { return true; }
    } catch (e) { /* 無視 */ }
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  function wantPad() {
    var m = /[?&]pad=(\d)/.exec(location.search);
    if (m) { return m[1] === '1'; }
    var s = Game.settings.softkeys;
    if (s === 'on') { return true; }
    if (s === 'off') { return false; }
    return isTouchDevice();
  }

  /** 画面サイズに合わせて canvas とソフトキーを配置する */
  display.layout = function () {
    var vw = window.innerWidth, vh = window.innerHeight;
    var dpr = window.devicePixelRatio || 1;
    var W = Game.W, H = Game.H;
    var padOn = wantPad();
    display.padOn = padOn;
    document.body.classList.toggle('pad-on', padOn);
    document.body.classList.toggle('lcd', !!Game.settings.lcd);

    var portrait = vh > vw;
    var areaW = vw, areaH = vh;
    var padH = 0;
    if (padOn && portrait) {
      // 縦持ち: 画面は上、ソフトキーは下
      padH = Math.max(170, Math.min(vh * 0.42, vw * 0.78));
      areaH = vh - padH;
    }

    // 端末ピクセルで整数倍にする
    var sDev = Math.floor(Math.min(areaW * dpr / W, areaH * dpr / H));
    var cssW, cssH, s;
    if (sDev < 1) {
      s = Math.min(areaW / W, areaH / H);
    } else {
      s = sDev / dpr;
    }
    cssW = W * s; cssH = H * s;
    display.scale = s;

    var left = Math.round((areaW - cssW) / 2 * dpr) / dpr;
    var top;
    if (padOn && portrait) {
      top = Math.max(0, Math.round((areaH - cssH) / 2 * dpr) / dpr);
      top = Math.min(top, 24);
    } else {
      top = Math.round((areaH - cssH) / 2 * dpr) / dpr;
    }
    stage.style.left = left + 'px';
    stage.style.top = top + 'px';
    stage.style.width = cssW + 'px';
    stage.style.height = cssH + 'px';
    stage.style.setProperty('--s', s + 'px');

    if (!padOn) { return; }
    var st = pad.style;
    if (portrait) {
      var base = top + cssH;
      var avail = vh - base;
      var dsz = Math.min(vw * 0.46, avail * 0.78);
      var asz = Math.min(vw * 0.44, avail * 0.7);
      st.setProperty('--dsz', dsz + 'px');
      st.setProperty('--asz', asz + 'px');
      st.setProperty('--dx', Math.round(vw * 0.04) + 'px');
      st.setProperty('--dy', Math.round(base + (avail - dsz) * 0.42) + 'px');
      st.setProperty('--ax', Math.round(vw - asz - vw * 0.04) + 'px');
      st.setProperty('--ay', Math.round(base + (avail - asz) * 0.35) + 'px');
      var ssz = Math.min(vw * 0.62, 240);
      st.setProperty('--ssz', ssz + 'px');
      st.setProperty('--sh', '28px');
      st.setProperty('--sx', Math.round((vw - ssz) / 2) + 'px');
      st.setProperty('--sy', Math.round(vh - 28 - Math.max(10, avail * 0.04)) + 'px');
    } else {
      // 横持ち: 左右に重ねて置く
      var d2 = Math.min(vh * 0.62, 200);
      var a2 = Math.min(vh * 0.58, 190);
      st.setProperty('--dsz', d2 + 'px');
      st.setProperty('--asz', a2 + 'px');
      st.setProperty('--dx', Math.round(Math.max(12, vh * 0.04)) + 'px');
      st.setProperty('--dy', Math.round(vh - d2 - vh * 0.10) + 'px');
      st.setProperty('--ax', Math.round(vw - a2 - Math.max(12, vh * 0.04)) + 'px');
      st.setProperty('--ay', Math.round(vh - a2 - vh * 0.12) + 'px');
      var s2 = Math.min(vw * 0.3, 200);
      st.setProperty('--ssz', s2 + 'px');
      st.setProperty('--sh', '26px');
      st.setProperty('--sx', Math.round((vw - s2) / 2) + 'px');
      st.setProperty('--sy', Math.round(vh - 26 - 8) + 'px');
    }
  };

  /* ---- ソフトキーのポインタ処理 ---- */
  function bindDpad() {
    var active = {};   // pointerId → 向き集合
    function dirsAt(ev) {
      var r = dpad.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = ev.clientX - cx, dy = ev.clientY - cy;
      var half = r.width / 2;
      var dead = half * 0.16;
      var out = { up: false, down: false, left: false, right: false };
      if (Math.abs(dx) < dead && Math.abs(dy) < dead) { return out; }
      // 斜めに寄っているときは両方、はっきり軸に寄っているときは 1 方向
      var ax = Math.abs(dx), ay = Math.abs(dy);
      if (ay > ax * 0.55) { if (dy < 0) { out.up = true; } else { out.down = true; } }
      if (ax > ay * 0.55) { if (dx < 0) { out.left = true; } else { out.right = true; } }
      return out;
    }
    function apply() {
      var all = { up: false, down: false, left: false, right: false };
      for (var id in active) {
        if (Object.prototype.hasOwnProperty.call(active, id)) {
          var d = active[id];
          for (var k in d) { if (d[k]) { all[k] = true; } }
        }
      }
      for (var b in all) {
        Game.input.setSoft(b, all[b]);
        dpad.classList.toggle('on-' + b, all[b]);
      }
    }
    dpad.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      try { dpad.setPointerCapture(ev.pointerId); } catch (e) { /* 無視 */ }
      active[ev.pointerId] = dirsAt(ev);
      apply();
    });
    dpad.addEventListener('pointermove', function (ev) {
      if (active[ev.pointerId]) { active[ev.pointerId] = dirsAt(ev); apply(); }
    });
    function end(ev) {
      if (active[ev.pointerId]) { delete active[ev.pointerId]; apply(); }
    }
    dpad.addEventListener('pointerup', end);
    dpad.addEventListener('pointercancel', end);
    dpad.addEventListener('lostpointercapture', end);
  }

  function bindButtons(root) {
    var els = root.querySelectorAll('[data-k]');
    Array.prototype.forEach.call(els, function (el) {
      var key = el.getAttribute('data-k');
      var ids = {};
      function sync() {
        var any = false;
        for (var id in ids) { if (Object.prototype.hasOwnProperty.call(ids, id)) { any = true; } }
        Game.input.setSoft(key, any);
        el.classList.toggle('on', any);
      }
      el.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* 無視 */ }
        ids[ev.pointerId] = true; sync();
      });
      function end(ev) { if (ids[ev.pointerId]) { delete ids[ev.pointerId]; sync(); } }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('lostpointercapture', end);
    });
  }

  display.init = function () {
    stage = document.getElementById('stage');
    canvas = document.getElementById('screen');
    pad = document.getElementById('pad');
    dpad = document.getElementById('dpad');
    abtn = document.getElementById('abtn');
    sysbtn = document.getElementById('sysbtn');
    bindDpad();
    bindButtons(abtn);
    bindButtons(sysbtn);
    window.addEventListener('resize', display.layout, false);
    window.addEventListener('orientationchange', function () { setTimeout(display.layout, 120); }, false);
    // 画面タップで音を使えるようにする（ソフトキー以外のタップ）
    document.addEventListener('pointerdown', function () {
      if (Game.audio && Game.audio.unlock) { Game.audio.unlock(); }
    }, false);
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, false);
    display.layout();
  };

  display.canvas = function () { return canvas; };
})();
