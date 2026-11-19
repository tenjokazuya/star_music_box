/* 起動 */
(function () {
  'use strict';
  var RR = window.RR;
  function boot() {
    if (RR.DEBUG) window.addEventListener('hashchange', function () { location.reload(); });
    RR.Game.init();
    if (RR.DEBUG && /test=/.test(location.hash)) {
      var m = /test=([a-z_]+)/.exec(location.hash)[1];
      RR.State.newGame('ソラ', 0);
      if (m === 'race' && RR.Race) { RR.Race.debugStart(); return; }
      var spot = /spot=([a-z_0-9]+)/.exec(location.hash);
      RR.State.S.pos = { map: m, x: spot ? spot[1] : 'start', y: 0, dir: 'down' };
      RR.Scene.set(RR.Field);
      return;
    }
    RR.Scene.set(RR.Title || RR.Field);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
