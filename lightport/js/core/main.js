/* main.js — 起動とメインループ（60Hz 固定の更新 + 画面の描画） */
(function () {
  'use strict';

  var STEP = 1000 / 60;
  var acc = 0, last = 0;

  // ゲームの更新に合わせて進むタイマー（実時間の setTimeout だと、描画が止まる環境や検証でずれる）
  var pending = [];
  Game.after = function (ms) {
    return new Promise(function (res) { pending.push({ n: ms / STEP, res: res }); });
  };

  function tick() {
    for (var i = pending.length - 1; i >= 0; i--) {
      pending[i].n--;
      if (pending[i].n <= 0) { var p = pending.splice(i, 1)[0]; p.res(); }
    }
    Game.input.update();
    Game.gfx.update();
    Game.scenes.update();
  }

  function frame(now) {
    window.requestAnimationFrame(frame);
    if (Game.manual) { last = now; return; }
    if (!last) { last = now; }
    var dt = now - last;
    last = now;
    if (dt > 250) { dt = 250; }
    acc += dt;
    var n = 0;
    while (acc >= STEP && n < 4) {
      try { tick(); } catch (e) { Game.fail('update', e); }
      acc -= STEP; n++;
    }
    if (acc > STEP * 4) { acc = 0; }
    try {
      var g = Game.gfx.g;
      Game.scenes.draw(g);
      Game.gfx.drawOverlay(g);
      Game.ui.drawTop(g);
    } catch (e2) { Game.fail('draw', e2); }
  }

  /** デバッグ用: ?debug&map=village&x=10&y=8&flags=a,b&items=lantern で直接フィールドから始める */
  function debugStart() {
    var q = {};
    location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (m, k, v) { q[k] = decodeURIComponent(v); });
    if (!q.map) { return false; }
    Game.debugNoSave = true;
    var s = Game.save.newGame(0);
    s.map = q.map; s.x = +(q.x || 5); s.y = +(q.y || 5); s.dir = q.dir || 'down';
    (q.flags || '').split(',').forEach(function (f) { if (f) { s.flags[f] = true; } });
    (q.items || '').split(',').forEach(function (i) { if (i) { s.items.push(i); } });
    Game.state.sprite = 'mio';
    Game.scenes.replace(Game.scenes.field, { fadeFrames: 10 });
    return true;
  }

  /** 検証用: 手動で n フレーム進める（ブラウザが描画を止めていても動く）。Game.manual = true で実時間の更新を止める */
  Game.simTime = 0;
  Game.advance = async function (n) {
    Game.manual = true;
    for (var i = 0; i < n; i++) {
      try { tick(); } catch (e) { Game.fail('update', e); }
      Game.simTime += STEP;
      for (var j = 0; j < 12; j++) { await null; }
    }
    try { var g = Game.gfx.g; Game.scenes.draw(g); Game.gfx.drawOverlay(g); Game.ui.drawTop(g); } catch (e2) { Game.fail('draw', e2); }
  };

  /** file:// などで起動できているかの自己点検。結果を <html data-selftest> に書く（ヘッドレスブラウザで確認できる） */
  function selfTest() {
    document.documentElement.setAttribute('data-boot', '1');
    Game.advance(300).catch(function (e) { document.documentElement.setAttribute('data-selftest-error', String(e)); }).then(function () {
      var t = Game.scenes.top();
      var info = {
        errors: Game.errors, title: t === Game.scenes.title, frames: Game.simTime > 0,
        maps: Object.keys(Game.maps.list).length, tracks: Object.keys(Game.music.tracks).length,
        location: location.protocol
      };
      document.documentElement.setAttribute('data-selftest', JSON.stringify(info));
    });
  }

  Game.start = function () {
    try {
      Game.input.init();
      Game.display.init();
      Game.gfx.init(Game.display.canvas());
      Game.audio.applySettings();
      if (!(Game.debug && debugStart())) { Game.scenes.replace(Game.scenes.title); }
      window.requestAnimationFrame(frame);
      if (/[?&]selftest/.test(location.search)) { selfTest(); }
    } catch (e) {
      Game.fail('start', e);
      document.documentElement.setAttribute('data-start-error', String(e && e.stack ? e.stack : e).slice(0, 600));
    }
  };

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', Game.start); }
  else { Game.start(); }
})();
