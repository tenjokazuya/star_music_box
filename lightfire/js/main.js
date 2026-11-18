/* main.js — 起動 */
(function () {
  'use strict';
  function go() { PF.boot(); }
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);

  // 開発用 (?debug): ブラウザの console から使う補助。製品では使わない。
  if (/[?&]debug/.test(location.search)) {
    PF.debug = true;
    PF.dbg = {
      // PF.dbg.goto('forest', {entry:'south'}, {ch:1,'prologue.done':true})
      // 4つ目の引数 true で onEnter（入場イベント）も実行する
      goto: function (id, pos, flags, runEnter) {
        if (!PF.state) { PF.state = PF.newState(); }
        for (var k in (flags || {})) PF.state.flags[k] = flags[k];
        PF.clearWaiters(); PF.modals.length = 0; PF.fx.reset();
        PF.field.lock = 0; PF.field.lastArea = null;
        PF.scene.replace(PF.field);
        PF.field.load(id, pos);
        PF.input.clear();
        if (runEnter) PF.field.run(function (g) { return g.runEnter(); });
      },
      press: function (b, n) { PF.input.tap(b, n || 3); return PF.wait((n || 3) + 3); },
      talk: async function (max) { for (var i = 0; i < (max || 60); i++) { if (!PF.modals.length && PF.field.lock === 0) break; await PF.dbg.press('a', 3); await PF.wait(10); } },
      state: function () { var f = PF.field; return f.player ? PF.maps.current.id + ' (' + f.player.x + ',' + f.player.y + ') lock=' + f.lock + ' modals=' + PF.modals.length + ' ch=' + PF.flag('ch') : 'nofield'; },
      walk: async function (path) { var m = { u: 'up', d: 'down', l: 'left', r: 'right' }; for (var i = 0; i < path.length; i++) { PF.input.tap(m[path[i]], 13); await PF.wait(15); } }
    };
  }
})();
