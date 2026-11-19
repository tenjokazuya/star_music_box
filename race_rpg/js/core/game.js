/* メインループ / シーン管理 / 待機タイマー / 画面演出 / 画面レイアウト */
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
  // 画面を覆うトランジション（type: blinds / iris / diamond / slide）
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
      FX.ox = Math.round((Math.random() * 2 - 1) * m);
      FX.oy = Math.round((Math.random() * 2 - 1) * m);
      if (FX.shakeT <= 0) { FX.ox = FX.oy = 0; FX.shakeMag = 0; }
    }
    if (FX.flashT > 0) FX.flashT--;
  };
  FX.draw = function (g) {
    var W = RR.W, H = RR.H;
    if (FX.cov && FX.cov.p > 0) drawCover(g, FX.cov.type, FX.cov.p);
    if (FX.fade > 0.001) {
      // ディザ付きフェード（GBA風に8段階）
      var lv = Math.round(FX.fade * 8) / 8;
      g.globalAlpha = lv;
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
  function drawCover(g, type, p) {
    var W = RR.W, H = RR.H, i, j;
    g.fillStyle = '#000';
    if (type === 'blinds') {
      var bh = 16;
      for (i = 0; i < H; i += bh) {
        var h = Math.ceil(bh * U.clamp(p * 1.6 - (i / H) * 0.6, 0, 1));
        g.fillRect(0, i, W, h);
      }
    } else if (type === 'iris') {
      var r = (1 - p) * 150;
      g.beginPath();
      g.rect(0, 0, W, H);
      // 円をドット状に近似（8角形以上の多角形）
      var n = 32;
      for (i = n; i >= 0; i--) {
        var a = i / n * Math.PI * 2;
        var x = W / 2 + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r;
        if (i === n) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
      g.fill('evenodd');
    } else if (type === 'slide') {
      g.fillRect(0, 0, Math.ceil(W * p), H);
    } else if (type === 'race') {
      // 斜めのストライプが走る
      for (i = 0; i < 12; i++) {
        var w = U.clamp(p * 2 - i / 12, 0, 1) * 40;
        g.save();
        g.translate(i * 24 - 20, 0);
        g.transform(1, 0, -0.4, 1, 0, 0);
        g.fillRect(0, 0, w, H);
        g.restore();
      }
    } else {
      // diamond: GBAでよくあるひし形タイルの拡大
      var s = 16;
      for (j = 0; j < H / s + 1; j++) {
        for (i = 0; i < W / s + 1; i++) {
          var t = U.clamp(p * 2 - ((i + j) / (W / s + H / s)), 0, 1);
          var d = t * s;
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
  var Game = RR.Game = { frame: 0, buf: null, g: null, display: null, dg: null, scale: 1 };

  Game.init = function () {
    var app = document.getElementById('app');
    Game.buf = U.canvas(RR.W, RR.H);
    Game.g = Game.buf.g;
    Game.display = document.getElementById('screen');
    Game.dg = Game.display.getContext('2d');
    RR.SoftPad.build(app);
    window.addEventListener('resize', Game.layout);
    window.addEventListener('orientationchange', function () { setTimeout(Game.layout, 200); });
    Game.layout();
    // 2回目のレイアウト（アドレスバー等の変化対策）
    setTimeout(Game.layout, 300);
    requestAnimationFrame(loop);
  };

  Game.layout = function () {
    var app = document.getElementById('app');
    var vw = window.innerWidth, vh = window.innerHeight;
    var dpr = window.devicePixelRatio || 1;
    var st = RR.Settings ? RR.Settings.data : {};
    var padMode = st.pad || 'auto';
    var showPad = padMode === 'on' || (padMode === 'auto' && RR.platform.isTouch());
    var pad = RR.SoftPad.el;
    var portrait = vh > vw * 1.1;
    var availW = vw, availH = vh, top = 0;
    if (showPad && portrait) {
      availH = Math.floor(vh * 0.58);
    } else if (showPad) {
      // 横向き: 左右に操作部を置けるだけ縮める
      availW = Math.max(240, vw - 300);
    }
    var sDev = Math.min(availW * dpr / RR.W, availH * dpr / RR.H);
    var useFit = st.scale === 'fit';
    if (!useFit && sDev >= 1) sDev = Math.floor(sDev);
    if (sDev < 1) sDev = Math.max(0.5, sDev);
    var cw = Math.round(RR.W * sDev), ch = Math.round(RR.H * sDev);
    var cssW = cw / dpr, cssH = ch / dpr;
    var d = Game.display;
    if (d.width !== cw) d.width = cw;
    if (d.height !== ch) d.height = ch;
    d.style.width = cssW + 'px';
    d.style.height = cssH + 'px';
    var left = (vw - cssW) / 2;
    if (showPad && portrait) top = Math.max(8, (availH - cssH) / 2);
    else top = (vh - cssH) / 2;
    d.style.left = left + 'px';
    d.style.top = top + 'px';
    Game.dg = d.getContext('2d');
    Game.dg.imageSmoothingEnabled = false;
    Game.scale = sDev;
    if (pad) {
      pad.style.display = showPad ? 'block' : 'none';
      pad.className = portrait ? 'portrait' : 'landscape';
      if (showPad) layoutPad(pad, vw, vh, portrait, top + cssH);
    }
    app.classList.toggle('with-pad', showPad);
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
      // 横向き: 画面の左右の余白を列として使う（狭い時は半透明で重ねる）
      var side = Math.max(120, (vw - Game.display.offsetWidth) / 2);
      var ds2 = Math.min(unit * 0.46, 170, side - 16);
      var lcx = side / 2, rcx = vw - side / 2;
      var dy = vh - ds2 - unit * 0.08;
      place(q('.dpad'), lcx - ds2 / 2, dy, ds2, ds2);
      var bs2 = ds2 * 0.46;
      place(q('.btn-a'), rcx + ds2 * 0.5 - bs2, dy + ds2 * 0.05, bs2, bs2);
      place(q('.btn-b'), rcx - ds2 * 0.5, dy + ds2 * 0.42, bs2, bs2);
      var lw2 = Math.min(110, side - 20), lh2 = Math.max(28, unit * 0.09);
      place(q('.btn-l'), lcx - lw2 / 2, 10, lw2, lh2);
      place(q('.btn-r'), rcx - lw2 / 2, 10, lw2, lh2);
      var pw2 = Math.min(84, side - 30), ph2 = Math.max(22, pw2 * 0.32);
      var py2 = Math.min(dy - ph2 - 8, 10 + lh2 + (dy - 10 - lh2) / 2 - ph2 / 2);
      place(q('.btn-select'), lcx - pw2 / 2, py2, pw2, ph2);
      place(q('.btn-start'), rcx - pw2 / 2, py2, pw2, ph2);
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
    if (steps > 0) render();
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

  function render() {
    var g = Game.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#000';
    g.fillRect(0, 0, RR.W, RR.H);
    // 不透明シーンより下は描かない
    var st = Scene.stack, start = 0;
    for (var i = st.length - 1; i >= 0; i--) { if (st[i].opaque) { start = i; break; } }
    for (i = start; i < st.length; i++) {
      if (st[i].draw) {
        try { st[i].draw(g); } catch (e) { reportError(e); }
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }
    if (RR.UI) RR.UI.draw(g);
    FX.draw(g);
    if (RR.Debug && RR.Debug.draw) RR.Debug.draw(g);
    var d = Game.display, dg = Game.dg;
    dg.imageSmoothingEnabled = false;
    dg.fillStyle = '#000';
    dg.fillRect(0, 0, d.width, d.height);
    var s = d.width / RR.W;
    dg.drawImage(Game.buf, 0, 0, RR.W, RR.H, Math.round(FX.ox * s), Math.round(FX.oy * s), d.width, d.height);
  }

  // 検証用: 画面が非表示でも指定フレーム進める
  Game.debugRun = function (n) {
    for (var i = 0; i < (n || 1); i++) step();
    render();
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
