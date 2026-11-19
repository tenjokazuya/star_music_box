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
      this.light = U.canvas(240, 160);
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
    draw: function (g) {
      var m = this.map;
      var p = Math.min(1, this.t / (230 * LINES.length));
      var cx = U.lerp(330, 360, p), cy = U.lerp(560, 40, U.smooth(p));
      cx = Math.round(cx); cy = Math.round(cy);
      g.drawImage(m.low, cx, cy, 240, 160, 0, 0, 240, 160);
      g.drawImage(m.high, cx, cy, 240, 160, 0, 0, 240, 160);
      var lg = this.light.g;
      lg.globalCompositeOperation = 'source-over';
      lg.fillStyle = m.ambient || '#40487c'; lg.fillRect(0, 0, 240, 160);
      lg.globalCompositeOperation = 'lighter';
      m.lights.forEach(function (l) {
        var x = l.x - cx, y = l.y - cy;
        if (x < -l.r || y < -l.r || x > 240 + l.r || y > 160 + l.r) return;
        lg.drawImage(RR.Pal.lightSprite(l.r, l.c), Math.round(x - l.r), Math.round(y - l.r));
      });
      g.globalCompositeOperation = 'multiply'; g.drawImage(this.light, 0, 0); g.globalCompositeOperation = 'source-over';
      // 黒帯
      g.fillStyle = '#000'; g.fillRect(0, 0, 240, 16); g.fillRect(0, 124, 240, 36);
      var txt = LINES[Math.min(this.line, LINES.length - 1)].split('|');
      var a = U.clamp(Math.min(this.lt / 20, (230 - this.lt) / 20), 0, 1);
      g.globalAlpha = a;
      txt.forEach(function (s, i) { F.draw(g, s, 120, 128 + i * 12, '#f8f0e0', { align: 'center' }); });
      g.globalAlpha = 1;
      F.draw(g, 'DEMO', 236, 4, '#606880', { align: 'right', shadow: null });
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
    RR.Scene.set({ opaque: true, draw: function (g) { g.fillStyle = '#000'; g.fillRect(0, 0, 240, 160); } });
    RR.Scene.push(Object.create(Pan)).then(function (skipped) {
      if (skipped) { back(); return; }
      var rs = Object.create(RR.Race._scene);
      var p = RR.Scene.push(rs, { id: 'demo', course: 'tsuzura', rival: 'saki', stake: 0, demo: true, title: 'DEMO' });
      RR.FX.fadeIn(30);
      return p.then(back);
    });
  };
})();
