/* デバッグ・検証用（URL に #debug を付けた時だけ有効）
 * RR.Debug.auto = true で会話を自動で送り、choose の番号を選ぶ。fakeRace = 'win'/'lose' でレースを省略する
 */
(function () {
  'use strict';
  var RR = window.RR;
  var Dbg = RR.Debug = { auto: false, choose: 0, chooseQueue: [], fakeRace: null, log: [], show: false };
  Dbg.toggle = function () { Dbg.show = !Dbg.show; };
  Dbg.draw = function (g) {
    if (!RR.DEBUG || !Dbg.show) return;
    var S = RR.State.S, f = RR.Field;
    var lines = ['F' + RR.Game.frame];
    if (S) lines.push('ST' + S.stage + ' ¥' + S.money);
    if (f.map && RR.Scene.top() === f) lines.push(f.map.id + ' ' + f.player.x + ',' + f.player.y);
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 150 - lines.length * 9, 90, lines.length * 9 + 10);
    lines.forEach(function (l, i) { RR.Font.draw(g, l, 2, 152 - (lines.length - i) * 9, '#80ff80', { shadow: null }); });
  };
  // UI の自動操作（ui.js から呼ばれる）
  Dbg.hookMessage = function (m) {
    if (!Dbg.auto) return false;
    Dbg.log.push((m.name ? m.name + ': ' : '') + m.pages.map(function (p) { return p.join(' '); }).join(' / '));
    return true;
  };
  Dbg.nextChoice = function () { return Dbg.chooseQueue.length ? Dbg.chooseQueue.shift() : Dbg.choose; };
  // NPC に話しかける
  Dbg.talk = function (id) {
    var a = RR.Field.actor(id);
    if (!a) { Dbg.log.push('!! NPC が いない: ' + id); return Promise.resolve(); }
    return RR.Script.run(function (E) { return a.def.talk(E, a); }, a);
  };
  Dbg.event = function (id) {
    var ev = RR.Field.map.events.filter(function (e) { return e.id === id; })[0];
    if (!ev) { Dbg.log.push('!! イベントが ない: ' + id); return Promise.resolve(); }
    return RR.Script.run(ev.run);
  };
  Dbg.warp = function (map, spot) { return RR.Field.warpTo({ map: map, x: spot || 'door' }); };
  // 条件を満たすまでフレームを進める（非表示でも進む）
  Dbg.until = function (cond, max) {
    for (var i = 0; i < (max || 20000); i++) {
      if (cond()) return true;
      RR.Game.debugRun(1);
    }
    return false;
  };
})();
