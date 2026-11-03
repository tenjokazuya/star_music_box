/* 開発用の自動プレイヤー（ボット）。service_core.js の公開API(tapXxx/pourBegin等)だけを使って遊ぶ。
 * ブラウザでは RP.makeBot、Nodeでは require で使う（tools/sim.js）。製品版のパッケージには含めない。 */
(function (root) {
  'use strict';

  function makeBot(RP, svc, opts) {
    opts = opts || {};
    var skill = opts.skill === undefined ? 0.8 : opts.skill;     // 0..1：タイミング精度
    var react = opts.react === undefined ? 0.5 : opts.react;     // 行動間隔(秒)
    var rng = new RP.Rng(opts.seed || 7);
    var acc = 0;

    function act(dt) {
      var i;
      // 注ぎ中は目標まで押しっぱなし
      if (svc.pour) {
        var z = svc.pour.zone, target = z.mid + (rng.next() - 0.5) * 2 * z.half * (1.6 - skill);
        if (svc.pour.level >= target) { svc.pourEnd(); acc = react * 0.5; }
        return;
      }
      acc -= dt;
      if (acc > 0) { return; }
      acc = react * (0.6 + rng.next() * 0.8);
      // 1. 注文を聞く
      var did = false;
      for (i = 0; i < svc.seats.length && !did; i++) { if (svc.seats[i].cust && svc.seats[i].cust.state === 'order') { did = svc.tapCustomer(i); } }
      if (did) { return; }
      // 2. 皿を片付ける
      for (i = 0; i < svc.seats.length && !did; i++) { if (svc.seats[i].dirty) { did = svc.clearSeat(i); } }
      if (did) { return; }
      // 3. 提供
      for (i = 0; i < svc.slots.length && !did; i++) { if (svc.slots[i] && svc.slots[i].ready) { did = svc.serveSlot(i); } }
      if (did) { return; }
      // 4. 作業：我慢の限界が近い注文を優先
      var order = svc.slots.map(function (s, ix) { return s ? ix : -1; }).filter(function (ix) { return ix >= 0; })
        .sort(function (a, b) { return svc.slots[a].cust.pat - svc.slots[b].cust.pat; });
      var needNoodle = order.filter(function (ix) { var s = svc.slots[ix]; return s.bowl.soup && !s.bowl.noodle; });
      var boiling = svc.pots.filter(function (p) { return p.state === 'boil'; }).length;
      var idle = svc.pots.filter(function (p) { return p.state === 'idle' && p.lock <= 0; });
      if (needNoodle.length > boiling && idle.length) { svc.tapPot(svc.pots.indexOf(idle[0])); return; }
      var acted = false;
      for (var k = 0; k < order.length && !acted; k++) {
        var sl = svc.slots[order[k]];
        svc.sel = order[k];
        var n = svc.need(sl);
        if (n.soup) { svc.pourBegin('soup', sl.order.soup); acted = true; break; }
        if (n.noodle) {
          var tgt = svc.hardTime(sl.order.hard) + (rng.next() - 0.5) * 2 * (2.2 - skill * 1.6);
          var pot = svc.pots.filter(function (p) { return p.state === 'boil' && p.t >= tgt; })[0];
          if (pot) { svc.tapPot(svc.pots.indexOf(pot)); acted = true; break; }
          continue;
        }
        if (n.tops.length) { svc.tapTopping(n.tops[0]); acted = true; break; }
        if (n.gyoza) {
          if (svc.stock.length) { svc.tapStock(0); acted = true; break; }
          var gd = svc.grills.filter(function (g) { return g.state === 'done'; })[0];
          if (gd) { svc.tapGrill(svc.grills.indexOf(gd)); acted = true; break; }
          var gf = svc.grills.filter(function (g) { return g.state === 'flip'; })[0];
          if (gf) { svc.tapGrill(svc.grills.indexOf(gf)); acted = true; break; }
          var ge = svc.grills.filter(function (g) { return g.state === 'empty'; })[0];
          if (ge) { svc.tapGrill(svc.grills.indexOf(ge)); acted = true; break; }
        }
        if (n.rice) { svc.tapRice(); acted = true; break; }
        if (n.beer) { svc.pourBegin('beer'); acted = true; break; }
      }
      if (acted) { return; }
      // 手が空いたら餃子の返し・焦げ捨て／伸びた麺を捨てる
      for (i = 0; i < svc.grills.length; i++) {
        var g2 = svc.grills[i];
        if (g2.state === 'flip' || g2.state === 'burnt') { svc.tapGrill(i); return; }
      }
      for (i = 0; i < svc.pots.length; i++) { if (svc.pots[i].state === 'nobi') { svc.tapPot(i); return; } }
    }
    return { act: act };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = makeBot; }
  else if (root.RP) { root.RP.makeBot = makeBot; }
})(typeof window !== 'undefined' ? window : globalThis);
