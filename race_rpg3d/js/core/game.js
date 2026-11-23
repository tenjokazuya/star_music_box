/* メインループ / シーン管理 / 待機タイマー / 画面演出 / 画面レイアウト（WebGL + UIオーバーレイ） */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var STEP = 1000 / 60;

  // ---------- 待機タイマー ----------
  var timers = [];
  RR.wait = function (frames) {
    return new Promise(function (res) { timers.push({ n: Math.max(0, frames | 0), res: res }); });
  };
  function tickTimers() {
    if (!timers.length) return;
    var keep = [];
    var done = [];
    for (var i = 0; i < timers.length; i++) {
      var t = timers[i];
      if (t.n <= 0) done.push(t); else { t.n--; keep.push(t); }
    }
    timers = keep;
    done.forEach(function (t) { t.res(); });
  }
  // 毎フレーム呼ばれる関数（戻り値 true で終了）
  var tasks = [];
  RR.every = function (fn) { tasks.push(fn); };
  function tickTasks() {
    if (!tasks.length) return;
    tasks = tasks.filter(function (f) { return !f(); });
  }

  // ---------- シーン管理 ----------
  var Scene = RR.Scene = { stack: [] };
  Scene.top = function () { return Scene.stack[Scene.stack.length - 1]; };
  Scene.set = function (s, arg) {
    while (Scene.stack.length) {
      var o = Scene.stack.pop();
      if (o.exit) o.exit();
      if (o._res) o._res(undefined);
    }
    Scene.stack.push(s);
    if (s.enter) s.enter(arg);
  };
  // 上に積む。pop されると Promise が解決される
  Scene.push = function (s, arg) {
    return new Promise(function (res) {
      s._res = res;
      Scene.stack.push(s);
      if (s.enter) s.enter(arg);
    });
  };
  Scene.pop = function (result) {
    var s = Scene.stack.pop();
    if (!s) return;
    if (s.exit) s.exit();
    var r = s._res; s._res = null;
    var t = Scene.top();
    if (t && t.resume) t.resume(result);
    if (r) r(result);
  };

  // ---------- 画面演出 ----------
  var FX = RR.FX = {
    fade: 0, fadeColor: '#000', shakeT: 0, shakeMag: 0, ox: 0, oy: 0,
    flashT: 0, flashMax: 0, flashColor: '#fff',
    cov: null // {type, p}
  };
  function animate(frames, fn) {
    return new Promise(function (res) {
      var i = 0;
      frames = Math.max(1, frames | 0);
      RR.every(function () {
        i++;
        fn(Math.min(1, i / frames));
        if (i >= frames) { res(); return true; }
        return false;
      });
    });
  }
  RR.animate = animate;
  FX.fadeOut = function (frames, color) {
    FX.fadeColor = color || '#000';
    var a0 = FX.fade;
    return animate(frames || 16, function (p) { FX.fade = U.lerp(a0, 1, p); });
  };
  FX.fadeIn = function (frames) {
    var a0 = FX.fade;
    return animate(frames || 16, function (p) { FX.fade = U.lerp(a0, 0, p); });
  };
  FX.flash = function (frames, color) {
    FX.flashT = FX.flashMax = frames || 8;
    FX.flashColor = color || '#fff';
    return RR.wait(frames || 8);
  };
  FX.shake = function (mag, frames) {
    FX.shakeMag = Math.max(FX.shakeMag, mag || 3);
    FX.shakeT = Math.max(FX.shakeT, frames || 12);
  };
  // 画面を覆うトランジション（type: blinds / iris / diamond / slide / race）
  FX.cover = function (type, frames) {
    FX.cov = { type: type || 'diamond', p: 0 };
    return animate(frames || 24, function (p) { FX.cov.p = p; });
  };
  FX.uncover = function (frames) {
    if (!FX.cov) return Promise.resolve();
    var c = FX.cov;
    return animate(frames || 24, function (p) { c.p = 1 - p; if (p >= 1) FX.cov = null; });
  };
  FX.update = function () {
    if (FX.shakeT > 0) {
      FX.shakeT--;
      var m = FX.shakeMag * (FX.shakeT / 12 + 0.2);
      FX.ox = (Math.random() * 2 - 1) * m;
      FX.oy = (Math.random() * 2 - 1) * m;
      if (FX.shakeT <= 0) { FX.ox = FX.oy = 0; FX.shakeMag = 0; }
    }
    if (FX.flashT > 0) FX.flashT--;
  };
  // 画面全体（実画面の論理座標 0..VW, 0..VH）に描く
  FX.draw = function (g) {
    var W = RR.VW, H = RR.VH;
    if (FX.cov && FX.cov.p > 0) drawCover(g, FX.cov.type, FX.cov.p, W, H);
    if (FX.fade > 0.001) {
      g.globalAlpha = FX.fade;
      g.fillStyle = FX.fadeColor;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    if (FX.flashT > 0) {
      g.globalAlpha = FX.flashT / FX.flashMax;
      g.fillStyle = FX.flashColor;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  };
  function drawCover(g, type, p, W, H) {
    var i, j;
    g.fillStyle = '#000';
    if (type === 'blinds') {
      var bh = H / 10;
      for (i = 0; i < H; i += bh) {
        var h = Math.ceil(bh * U.clamp(p * 1.6 - (i / H) * 0.6, 0, 1));
        g.fillRect(0, i, W, h + 0.5);
      }
    } else if (type === 'iris') {
      var r = (1 - p) * Math.hypot(W, H) * 0.55;
      g.beginPath();
      g.rect(0, 0, W, H);
      g.arc(W / 2, H / 2, Math.max(0.01, r), 0, Math.PI * 2, true);
      g.fill('evenodd');
    } else if (type === 'slide') {
      g.fillRect(0, 0, Math.ceil(W * p), H);
    } else if (type === 'race') {
      // 斜めのストライプが走る
      var n = 14, sw = W / n * 1.6;
      for (i = 0; i < n; i++) {
        var w = U.clamp(p * 2 - i / n, 0, 1) * sw * 1.3;
        g.save();
        g.translate(i * (W / n) - 20, 0);
        g.transform(1, 0, -0.4, 1, 0, 0);
        g.fillRect(0, 0, w, H);
        g.restore();
      }
    } else {
      // diamond: ひし形タイルの拡大
      var s = H / 9;
      for (j = 0; j < H / s + 1; j++) {
        for (i = 0; i < W / s + 1; i++) {
          var t = U.clamp(p * 2 - ((i + j) / (W / s + H / s)), 0, 1);
          var d = t * s * 1.05;
          if (d <= 0) continue;
          var cx = i * s, cy = j * s;
          g.beginPath();
          g.moveTo(cx, cy - d); g.lineTo(cx + d, cy); g.lineTo(cx, cy + d); g.lineTo(cx - d, cy);
          g.closePath(); g.fill();
        }
      }
    }
  }

  // ---------- ゲーム本体 ----------
  var Game = RR.Game = { headless: false, frame: 0, ui: null, g: null, stage: null, scale: 1, cssW: 0, cssH: 0, dpr: 1, ok: false };

  Game.init = function () {
    var app = document.getElementById('app');
    Game.stage = document.getElementById('stage');
    Game.ui = document.getElementById('ui');
    Game.g = Game.ui.getContext('2d');
    Game.glc = document.getElementById('gl');
    RR.SoftPad.build(app);
    try {
      RR.GL.init(Game.glc);
      Game.ok = true;
    } catch (e) {
      var div = document.getElementById('err');
      if (div) { div.style.display = 'block'; div.textContent = 'WebGL を つかえませんでした。\n' + (e && e.message || e); }
      return;
    }
    window.addEventListener('resize', Game.layout);
    window.addEventListener('orientationchange', function () { setTimeout(Game.layout, 200); });
    Game.layout();
    setTimeout(Game.layout, 300);
    requestAnimationFrame(loop);
  };

  Game.layout = function () {
    var vw = window.innerWidth, vh = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var st = RR.Settings ? RR.Settings.data : {};
    var padMode = st.pad || 'auto';
    var showPad = padMode === 'on' || (padMode === 'auto' && RR.platform.isTouch());
    var pad = RR.SoftPad.el;
    var portrait = vh > vw * 1.1;
    var availH = vh;
    if (showPad && portrait) availH = Math.floor(vh * 0.58);
    var cssW = vw, cssH = availH;
    Game.cssW = cssW; Game.cssH = cssH; Game.dpr = dpr;
    Game.padLandscape = showPad && !portrait;
    var stage = Game.stage;
    stage.style.left = '0px'; stage.style.top = '0px';
    stage.style.width = cssW + 'px'; stage.style.height = cssH + 'px';
    // 論理サイズ: 基準 240x160 を必ず含む
    var aspect = cssW / cssH;
    var VW, VH;
    if (aspect >= 1.5) { VH = 160; VW = 160 * aspect; } else { VW = 240; VH = 240 / aspect; }
    RR.VW = VW; RR.VH = VH; RR.OX = (VW - 240) / 2; RR.OY = (VH - 160) / 2;
    var ui = Game.ui;
    var pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
    if (ui.width !== pw) ui.width = pw;
    if (ui.height !== ph) ui.height = ph;
    Game.scale = ph / VH;
    RR.GL.resize(cssW, cssH);
    if (pad) {
      pad.style.display = showPad ? 'block' : 'none';
      pad.className = portrait ? 'portrait' : 'landscape';
      if (showPad) layoutPad(pad, vw, vh, portrait, cssH);
    }
    document.getElementById('app').classList.toggle('with-pad', showPad);
  };

  function place(el, x, y, w, h) {
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    if (w != null) el.style.width = Math.round(w) + 'px';
    if (h != null) el.style.height = Math.round(h) + 'px';
  }
  function layoutPad(pad, vw, vh, portrait, screenBottom) {
    var q = function (s) { return pad.querySelector(s); };
    var unit = Math.min(vw, vh);
    if (portrait) {
      var area = vh - screenBottom;
      var ds = Math.min(vw * 0.42, area * 0.62);
      var by = screenBottom + (area - ds) * 0.55;
      place(q('.dpad'), vw * 0.05, by, ds, ds);
      var bs = ds * 0.42;
      place(q('.btn-a'), vw - bs - vw * 0.05, by + ds * 0.12, bs, bs);
      place(q('.btn-b'), vw - bs * 2.15 - vw * 0.05, by + ds * 0.42, bs, bs);
      var pw = Math.min(90, vw * 0.2), ph = pw * 0.32;
      place(q('.btn-select'), vw / 2 - pw - 6, vh - ph - Math.max(10, area * 0.06), pw, ph);
      place(q('.btn-start'), vw / 2 + 6, vh - ph - Math.max(10, area * 0.06), pw, ph);
      var lw = vw * 0.26, lh = Math.max(26, area * 0.1);
      place(q('.btn-l'), vw * 0.03, screenBottom + 6, lw, lh);
      place(q('.btn-r'), vw - lw - vw * 0.03, screenBottom + 6, lw, lh);
    } else {
      // 横向き: 3D画面の上に半透明で重ねる
      var ds2 = Math.min(unit * 0.44, 170);
      var margin = unit * 0.05;
      var dy = vh - ds2 - margin;
      place(q('.dpad'), margin, dy, ds2, ds2);
      var bs2 = ds2 * 0.46;
      place(q('.btn-a'), vw - margin - bs2, dy + ds2 * 0.05, bs2, bs2);
      place(q('.btn-b'), vw - margin - bs2 * 2.2, dy + ds2 * 0.42, bs2, bs2);
      var lw2 = Math.min(110, vw * 0.12), lh2 = Math.max(28, unit * 0.09);
      place(q('.btn-l'), margin, margin, lw2, lh2);
      place(q('.btn-r'), vw - margin - lw2, margin, lw2, lh2);
      var pw2 = Math.min(84, vw * 0.1), ph2 = Math.max(22, pw2 * 0.32);
      place(q('.btn-select'), vw / 2 - pw2 - 6, vh - ph2 - margin, pw2, ph2);
      place(q('.btn-start'), vw / 2 + 6, vh - ph2 - margin, pw2, ph2);
    }
  }

  var last = 0, acc = 0;
  function loop(t) {
    if (!last) last = t;
    var dtms = Math.min(t - last, 100);
    last = t;
    acc += dtms;
    var steps = 0;
    while (acc >= STEP && steps < 4) {
      step();
      acc -= STEP;
      steps++;
    }
    if (steps >= 4) acc = 0;
    if (steps > 0 && !Game.headless) render();
    requestAnimationFrame(loop);
  }

  function step() {
    RR.Input.update();
    tickTimers();
    tickTasks();
    if (RR.UI) RR.UI.update();
    var s = Scene.top();
    if (s && s.update) {
      try { s.update(1 / 60); } catch (e) { reportError(e); }
    }
    FX.update();
    if (RR.Audio && RR.Audio.tick) RR.Audio.tick();
    if (RR.State && RR.State.S && s && s.countTime) RR.State.S.playtime += STEP;
    Game.frame++;
  }

  var shakeOn = false;
  function render() {
    var st = Scene.stack, start = 0, i;
    // 不透明シーンより下は描かない
    for (i = st.length - 1; i >= 0; i--) { if (st[i].opaque) { start = i; break; } }
    // 3D 画面: 描画対象のうち最上位の draw3d を持つシーン
    var s3 = null;
    for (i = st.length - 1; i >= start; i--) { if (st[i].draw3d) { s3 = st[i]; break; } }
    if (s3) {
      Game.glc.style.visibility = 'visible';
      try { s3.draw3d(); } catch (e) { reportError(e); }
    } else {
      Game.glc.style.visibility = 'hidden';
    }
    // UI オーバーレイ
    var g = Game.g, S = Game.scale;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, Game.ui.width, Game.ui.height);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.setTransform(S, 0, 0, S, 0, 0);
    // 背景（3Dシーンが無い不透明シーンの下地）
    if (!s3 && RR.UI && RR.UI.backdrop) RR.UI.backdrop(g);
    g.save();
    g.translate(RR.OX, RR.OY);
    for (i = start; i < st.length; i++) {
      if (st[i].draw) {
        try { st[i].draw(g); } catch (e) { reportError(e); }
        g.setTransform(S, 0, 0, S, 0, 0); g.translate(RR.OX, RR.OY);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }
    if (RR.UI) RR.UI.draw(g);
    g.restore();
    g.setTransform(S, 0, 0, S, 0, 0);
    FX.draw(g);
    g.save(); g.translate(RR.OX, RR.OY);
    if (RR.Debug && RR.Debug.draw) RR.Debug.draw(g);
    g.restore();
    // 画面ゆれ
    if (FX.ox || FX.oy) {
      var k = Game.cssW / RR.VW;
      Game.stage.style.transform = 'translate(' + (FX.ox * k).toFixed(1) + 'px,' + (FX.oy * k).toFixed(1) + 'px)';
      shakeOn = true;
    } else if (shakeOn) { Game.stage.style.transform = ''; shakeOn = false; }
  }

  // 検証用: 画面が非表示でも指定フレーム進める
  Game.debugRun = function (n, skipRender) {
    for (var i = 0; i < (n || 1); i++) step();
    if (!skipRender) render();
    return Game.frame;
  };

  var errShown = 0;
  function reportError(e) {
    if (window.console) console.error(e);
    if (errShown++ < 3 && RR.DEBUG) {
      var div = document.getElementById('err');
      if (div) { div.style.display = 'block'; div.textContent += (e && e.stack || e) + '\n'; }
    }
  }
  RR.reportError = reportError;
  window.addEventListener('error', function (e) { reportError(e.error || e.message); });
  window.addEventListener('unhandledrejection', function (e) { reportError(e.reason); });
})();
