/* 出店・移転。最初から全ティアの名称・席数・家賃・費用を見せる（システムは誘導しない）。
 * 最後のティアを手に入れるとエンディング。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx;
  var W = RP.W, H = RP.H;

  var menu = null, t = 0, dlg = new UI.Dialog(), moving = null;
  var Mv = RP.TEXT.move;

  function rows() { return RP.TIERS.map(function (tr) { return { tr: tr }; }); }

  function statusOf(tr) {
    var st = RP.game.state;
    if (tr.id === st.tier) { return 'here'; }
    if (tr.id < st.tier) { return 'past'; }
    return tr.cost <= st.money ? 'ok' : 'short';
  }

  function drawRow(row, idx, x, y, w, h, sel) {
    var tr = row.tr, s = statusOf(tr), st = RP.game.state;
    if (sel) { G.rect(x, y, w, h - 1, 'maroon'); G.rect(x, y, w, 1, 'red'); UI.cursor(x + 2, y + 10); }
    var lc = s === 'here' ? 'cyan' : (s === 'past' ? 'gray' : 'white');
    // 長い店名は短縮名にする（右端の価格と重ならないように）
    T.draw(T.measure(tr.name) > 130 ? tr.short : tr.name, x + 10, y + 2, lc, { shadow: sel ? 'ink' : null });
    var right = s === 'here' ? Mv.here : (s === 'past' ? Mv.past : U.yen(tr.cost, true));
    T.draw(right, x + w - 3, y + 2, s === 'ok' ? 'yellow' : (s === 'short' ? 'orange' : 'silver'), { align: 'r' });
    // 貯金ゲージ（目標にしやすいよう常に見せる）
    if (s === 'ok' || s === 'short') {
      var pr = U.clamp(st.money / tr.cost, 0, 1);
      G.rect(x + 10, y + 16, w - 14, 3, 'ink');
      G.rect(x + 11, y + 17, Math.round((w - 16) * pr), 1, s === 'ok' ? 'lime' : 'orange');
    }
  }

  function enter() {
    t = 0; moving = null;
    var st = RP.game.state;
    menu = new UI.Menu(rows(), { x: 6, y: 26, w: 214, rowH: 24, rows: 6, drawRow: drawRow, tapSelects: false,
      cursor: Math.min(RP.TIERS.length - 1, st.tier),
      onSelect: function (r) { tryMove(r.tr); },
      onTapRow: function (r, i, changed) { if (changed) { UI.se('select'); } else { tryMove(r.tr); } } });
    RP.music.play('shop', { fade: 0.6 });
    FX.reset();
  }

  function tryMove(tr) {
    var chk = RP.game.canMove(tr.id);
    if (!chk.ok) { UI.se('error'); FX.shake(1, 0.15); FX.popup(chk.reason, 300, 150, 'red'); return; }
    var st = RP.game.state;
    var final = tr.id === RP.FINAL_TIER;
    dlg.open({
      title: final ? Mv.finalTitle : Mv.confirmTitle,
      text: Mv.confirm(tr.name, U.yen(tr.cost), U.yen(st.money), final),
      width: 236,
      choices: [{ label: final ? Mv.yesFinal : Mv.yes, value: 'yes' }, { label: Mv.no, value: 'no' }], cancelValue: 'no',
      onChoose: function (v) { if (v === 'yes') { doMove(tr); } }
    });
  }

  function doMove(tr) {
    var r = RP.game.move(tr.id);
    if (!r.ok) { return; }
    var st = RP.game.state;
    UI.se(tr.id === RP.FINAL_TIER ? 'fanfareBig' : 'levelUp');
    FX.flash('#ffffff', 0.5, 0.9); FX.rainConfetti(70);
    moving = { t: 0, tr: tr };
    RP.music.stop(0.3);
    if (tr.id === RP.FINAL_TIER && !st.flags.ending) { st.flags.ending = true; moving.ending = true; }
    RP.game.achCheck(null);
    RP.game.save();
  }

  function update(dt) {
    t += dt;
    if (moving) {
      moving.t += dt;
      if (moving.t > 3.2) {
        var m = moving; moving = null;
        if (m.ending) { RP.scene.go('ending', { first: true }, { trans: 'white', dur: 1.2 }); }
        else { RP.scene.go('morning', {}, { trans: 'noren', dur: 0.9 }); }
      }
      return;
    }
    if (dlg.active) { dlg.update(dt); return; }
    if (I.tapIn(0, H - 14, 110, 14) || I.pressed('cancel')) { UI.se('cancel'); RP.scene.go('morning', {}, { trans: 'fade', dur: 0.3 }); return; }
    menu.update();
    var cur = menu.items[menu.index];
    if (cur) {
      var bx = 232, by = 172, bw = 140, bh = 20;
      if (I.tapIn(bx, by, bw, bh)) { tryMove(cur.tr); }
    }
  }

  function draw() {
    var st = RP.game.state;
    UI.stripes(t, '#1c1a3c', '#221e44');
    G.rect(0, 0, W, 14, 'ink'); G.rect(0, 13, W, 1, '#4a4060');
    T.draw(Mv.title, 4, 1, 'yellow');
    T.draw(Mv.money, 240, 1, 'silver'); T.draw(U.yen(st.money, true), W - 4, 1, 'yellow', { align: 'r' });
    T.draw(Mv.lead, 6, 15, 'silver', { size: 10 });
    menu.draw();
    var cur = menu.items[menu.index];
    UI.panel(226, 30, 152, 168, { title: cur ? cur.tr.short : '' });
    if (cur) {
      var tr = cur.tr, s = statusOf(tr);
      T.wrap(tr.desc, 140).forEach(function (l, i) { T.draw(l, 232, 38 + i * 13, 'white'); });
      var y = 100;
      T.draw(Mv.seats, 232, y, 'silver'); T.draw(RP.TEXT.morning.seatUnit(tr.seats), 372, y, 'white', { align: 'r' }); y += 13;
      T.draw(Mv.rent, 232, y, 'silver'); T.draw(U.yen(tr.rent, true) + Mv.perDay, 372, y, 'white', { align: 'r' }); y += 13;
      T.draw(Mv.price, 232, y, 'silver'); T.draw('×' + tr.mult.toFixed(2), 372, y, 'lime', { align: 'r' }); y += 13;
      T.draw(Mv.flow, 232, y, 'silver'); T.draw(Mv.pax(tr.base), 372, y, 'lime', { align: 'r' }); y += 13;
      var bx = 232, by = 172, bw = 140, bh = 20;
      var label = s === 'here' ? Mv.here : (s === 'past' ? Mv.past : (s === 'short' ? Mv.short(U.yen(tr.cost - st.money, true)) : Mv.go));
      var okb = s === 'ok';
      G.rrect(bx, by + 2, bw, bh, 'ink');
      G.rrect(bx, by, bw, bh, okb ? 'cream' : 'gray');
      G.rrect(bx + 1, by + 1, bw - 2, bh - 2, okb ? 'maroon' : '#2e2640');
      T.draw(label, bx + bw / 2, by + 4, okb ? 'white' : 'silver', { align: 'c', shadow: 'ink' });
      
    }
    UI.softkeys(RP.TEXT.shop.back, '', '', { noInput: true });
    if (moving) {
      var k = Math.min(1, moving.t / 0.5);
      G.alpha(0.7 * k); G.rect(0, 0, W, H, 'ink'); G.alpha(1);
      UI.big(moving.ending ? Mv.movedFinal : Mv.moved, W / 2, 70, 'yellow');
      T.draw(moving.tr.name, W / 2, 110, 'white', { align: 'c', size: 16, outline: 'ink' });
      if (moving.t > 1.2) { T.draw(Mv.carry, W / 2, 140, 'cream', { align: 'c' }); }
    }
  }
  function drawTop() { if (dlg.active) { dlg.draw(); } }

  RP.scene.register('move', { enter: enter, update: update, draw: draw, drawTop: drawTop });
})(window.RP);
