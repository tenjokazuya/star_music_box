/* 起動画面（TAP TO START）。ここでAudioContextを解禁し、タイトルへ進む。 */
(function (RP) {
  'use strict';
  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input;
  var t = 0, started = false, goT = 0;

  RP.scene.register('boot', {
    enter: function () { t = 0; started = false; goT = 0; },
    update: function (dt) {
      t += dt;
      if (!started && (I.taps.length > 0 || I.pressed('ok'))) {
        started = true;
        RP.audio.unlock();
        RP.se.play('clapper');
        RP.fx.burst(RP.W / 2, 120, 24, { speed: 90 });
      }
      if (started) {
        goT += dt;
        if (goT > 0.9 && !RP.scene.busy()) { RP.scene.go('title', {}, { trans: 'noren', dur: 0.9 }); goT = -99; }
      }
    },
    draw: function () {
      G.clear('#0c0a16');
      // ゆっくり揺れる提灯と文字
      var sw = Math.round(Math.sin(t * 1.5) * 2);
      G.glow(RP.W / 2 + sw, 52, 30, 'orange', 0.45);
      G.sprite('lantern', RP.W / 2 - 4 + sw, 40, { sx: 2 });
      T.draw('ラーメンパニック', RP.W / 2, 96, 'yellow', { align: 'c', size: 24, bold: true, outline: 'maroon' });
      T.draw(RP.SUBTITLE, RP.W / 2, 126, 'cream', { align: 'c' });
      if (!started) {
        if (Math.floor(t * 2) % 2 === 0) { T.draw(RP.TEXT.boot.tap, RP.W / 2, 170, 'white', { align: 'c', outline: 'ink' }); }
      } else {
        T.draw(RP.TEXT.boot.go, RP.W / 2, 170, 'white', { align: 'c', outline: 'ink' });
      }
      UI.softkeys('', 'v' + RP.VERSION, '', { noInput: true });
    }
  });
})(window.RP);
