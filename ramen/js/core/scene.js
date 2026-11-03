/* シーン管理とトランジション。
 * シーン定義: { enter(args), update(dt), draw(), exit(), resume() } を RP.scene.register(name, def) で登録。 */
(function (RP) {
  'use strict';

  var S = RP.scene = {};
  var current = null, curName = '';
  var stack = [];            // push された重ねシーン（ダイアログ等）
  var trans = null;          // { kind, phase:'out'|'in', t, dur, next, args, done }
  var shakeOnDraw = true;

  S.register = function (name, def) { RP.scenes[name] = def; def._name = name; };
  S.name = function () { return curName; };
  S.current = function () { return current; };
  S.busy = function () { return !!trans; };

  function enterScene(name, args) {
    var def = RP.scenes[name];
    if (!def) { RP.log.error('未登録のシーン', name); return; }
    if (current && current.exit) { try { current.exit(); } catch (e) { RP.log.error(e); } }
    stack.length = 0;
    current = def; curName = name;
    RP.fx.reset();
    if (def.enter) { try { def.enter(args || {}); } catch (e) { RP.log.error('enter失敗', name, e); } }
  }

  // opts: { trans:'noren'|'fade'|'dots'|'none', dur(秒), onCover(fn) }
  S.go = function (name, args, opts) {
    opts = opts || {};
    var kind = opts.trans || 'fade';
    if (kind === 'none' || !current) { enterScene(name, args); return; }
    if (trans) { return; }
    trans = { kind: kind, phase: 'out', t: 0, dur: (opts.dur || 0.5) / 2, next: name, args: args, onCover: opts.onCover };
    RP.input.blocked = true;
  };

  S.push = function (name, args) {
    var def = RP.scenes[name];
    if (!def) { RP.log.error('未登録のシーン', name); return; }
    stack.push(def);
    if (def.enter) { def.enter(args || {}); }
  };
  S.pop = function () {
    var def = stack.pop();
    if (def && def.exit) { def.exit(); }
    var top = stack[stack.length - 1] || current;
    if (top && top.resume) { top.resume(); }
  };

  S.update = function (dt) {
    if (trans) {
      trans.t += dt;
      if (trans.t >= trans.dur) {
        if (trans.phase === 'out') {
          if (trans.onCover) { try { trans.onCover(); } catch (e) { RP.log.error(e); } }
          enterScene(trans.next, trans.args);
          trans.phase = 'in'; trans.t = 0;
        } else {
          trans = null;
          RP.input.blocked = false;
        }
      }
    }
    var top = stack.length ? stack[stack.length - 1] : current;
    if (top && top.update) {
      try { top.update(dt); } catch (e) { RP.log.error('update失敗', top._name, e); }
    }
  };

  S.draw = function () {
    var off = RP.fx.offset();
    RP.gfx.begin(shakeOnDraw ? off.x : 0, shakeOnDraw ? off.y : 0);
    if (current && current.draw) {
      try { current.draw(); } catch (e) { RP.log.error('draw失敗', curName, e); }
    }
    for (var i = 0; i < stack.length; i++) {
      if (stack[i].draw) { try { stack[i].draw(); } catch (e2) { RP.log.error('draw失敗', stack[i]._name, e2); } }
    }
    RP.fx.draw();
    // 最前面（ダイアログなど）はFXの上に描く
    if (current && current.drawTop) { try { current.drawTop(); } catch (e3) { RP.log.error('drawTop失敗', curName, e3); } }
    for (var j = 0; j < stack.length; j++) { if (stack[j].drawTop) { try { stack[j].drawTop(); } catch (e4) { RP.log.error('drawTop失敗', stack[j]._name, e4); } } }
    RP.gfx.end();
    if (trans) { drawTrans(); }
  };

  // ---- トランジション描画 ----
  // cover: 0..1（1で完全に覆う）
  function drawTrans() {
    var cover = trans.phase === 'out' ? trans.t / trans.dur : 1 - trans.t / trans.dur;
    cover = RP.util.clamp(cover, 0, 1);
    var G = RP.gfx, W = RP.W, H = RP.H, i;
    if (trans.kind === 'fade') {
      G.alpha(cover); G.rect(0, 0, W, H, 'ink'); G.alpha(1);
    } else if (trans.kind === 'noren') {
      // 暖簾が上から降りてくる
      var n = 24, sw = W / n;
      for (i = 0; i < n; i++) {
        var delay = (i % 4) * 0.12 + (i % 3) * 0.04;
        var k = RP.util.clamp((cover - delay) / (1 - 0.45), 0, 1);
        var h = Math.round(RP.util.ease.outCubic(k) * (H + 12));
        if (h <= 0) { continue; }
        var x = Math.round(i * sw);
        G.rect(x, 0, Math.ceil(sw), h, (i % 2) ? 'red' : 'maroon');
        G.rect(x, h - 4, Math.ceil(sw), 4, 'ink');
        if (i % 2) { G.rect(x + 2, 0, 1, h - 4, 'maroon'); }
      }
      if (cover > 0.98) { G.rect(0, 0, W, H, 'maroon'); }
    } else if (trans.kind === 'dots') {
      var bs = 16, cols = Math.ceil(W / bs), rows = Math.ceil(H / bs);
      for (var yy = 0; yy < rows; yy++) {
        for (var xx = 0; xx < cols; xx++) {
          var d = (xx + yy) / (cols + rows);
          var s = RP.util.clamp((cover * 1.6 - d) * 3, 0, 1);
          var r = Math.round(bs * s);
          if (r > 0) { G.rect(xx * bs + (bs - r) / 2, yy * bs + (bs - r) / 2, r, r, 'ink'); }
        }
      }
    } else if (trans.kind === 'white') {
      G.alpha(cover); G.rect(0, 0, W, H, 'white'); G.alpha(1);
    }
  }
})(window.RP);
