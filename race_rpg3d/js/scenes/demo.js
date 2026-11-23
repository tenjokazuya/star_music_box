/* タイトルで放置/「おはなし」で流れるデモ: 町の俯瞰とナレーション → AI同士のレース */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input;
  var LINES = [
    'やまあいの ちいさな まち キリハラ。',
    'よるに なると まちを かこむ とうげに|はしりやたちが あつまってくる。',
    'いちたい いちの しょうぶ。|かけるのは かねと プライド。',
    'そして いつか とうげの ヌシに|いどむ ものが あらわれる。'
  ];
  var Demo = RR.Demo = {};

  var Pan = {
    opaque: true,
    enter: function () {
      this.t = 0; this.line = 0; this.lt = 0;
      this.map = RR.Maps.load('town');
      RR.Field3D.setMap(this.map);
      RR.FX.fadeIn(40);
      RR.Audio.bgm('title');
    },
    update: function () {
      this.t++; this.lt++;
      if (this.t > 20 && In.anyPressed()) { this.finish(true); return; }
      if (this.lt > 230) { this.lt = 0; this.line++; if (this.line >= LINES.length) this.finish(false); }
    },
    finish: function (skip) {
      if (this.done) return;
      this.done = true;
      RR.FX.fadeOut(30).then(function () { RR.Scene.pop(skip); });
    },
    draw3d: function () {
      var p = Math.min(1, this.t / (230 * LINES.length));
      var sp = U.smooth(p);
      RR.Field3D.renderFree(U.lerp(26, 30, p), U.lerp(38, 7, sp), U.lerp(15, 11, sp), U.lerp(0.95, 0.72, sp), 32, this.t);
    },
    draw: function (g) {
      var sc = RR.UI.screen();
      var gt = g.createLinearGradient(0, sc.y + sc.h - 50, 0, sc.y + sc.h);
      gt.addColorStop(0, 'rgba(0,0,0,0)'); gt.addColorStop(0.5, 'rgba(0,0,0,0.75)'); gt.addColorStop(1, 'rgba(0,0,0,0.9)');
      g.fillStyle = gt; g.fillRect(sc.x, sc.y + sc.h - 50, sc.w, 50);
      g.fillStyle = '#000'; g.fillRect(sc.x, sc.y, sc.w, 12);
      var txt = LINES[Math.min(this.line, LINES.length - 1)].split('|');
      var a = U.clamp(Math.min(this.lt / 20, (230 - this.lt) / 20), 0, 1);
      g.globalAlpha = a;
      txt.forEach(function (s, i) { F.draw(g, s, 120, sc.y + sc.h - 38 + i * 12, '#f8f0e0', { align: 'center', scale: 1.1 }); });
      g.globalAlpha = 1;
      F.draw(g, 'DEMO', sc.x + sc.w - 4, sc.y + 2, '#808aa8', { align: 'right', shadow: null });
    }
  };

  Demo.play = function () {
    var saved = RR.State.S;
    var S = RR.State.fresh('ソラ', 0);
    RR.State.S = S;
    RR.Data.initNewGame(S);
    S.cars[0].dirt = 0;
    var back = function () {
      RR.State.S = null;
      RR.Audio.stopBgm(0.3);
      RR.Scene.set(RR.Title, {});
    };
    RR.Scene.set({ opaque: true, draw: function (g) { var sc = RR.UI.screen(); g.fillStyle = '#000'; g.fillRect(sc.x, sc.y, sc.w, sc.h); } });
    RR.Scene.push(Object.create(Pan)).then(function (skipped) {
      if (skipped) { back(); return; }
      var rs = Object.create(RR.Race._scene);
      var p = RR.Scene.push(rs, { id: 'demo', course: 'tsuzura', rival: 'saki', stake: 0, demo: true, title: 'DEMO' });
      RR.FX.fadeIn(30);
      return p.then(back);
    });
  };
})();
