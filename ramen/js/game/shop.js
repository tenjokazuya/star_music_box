/* ショップ（設備・メニュー・従業員・飾りと演出・大きな使い道）。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx;
  var W = RP.W, H = RP.H;

  var tab = 0, menu = null, t = 0, dlg = new UI.Dialog(), buyFlash = 0, lastBought = null;
  var S = RP.TEXT.shop;
  var tabRects = [];

  function catItems() {
    var cat = RP.ITEM_CATS[tab].id, st = RP.game.state;
    return RP.ITEMS.filter(function (it) {
      if (it.cat !== cat) { return false; }
      return true;
    });
  }

  function rows() {
    return catItems().map(function (it) { return { it: it }; });
  }

  function rowColors(it) {
    var chk = RP.game.canBuy(it), lv = RP.game.level(it.id);
    if (!it.endless && lv >= it.max) { return { label: 'silver', price: 'gray', status: 'done' }; }
    if (chk.ok) { return { label: 'white', price: 'yellow', status: 'ok' }; }
    if (chk.short) { return { label: 'cream', price: 'orange', status: 'short' }; }
    return { label: 'gray', price: 'gray', status: 'locked', reason: chk.reason };
  }

  function drawRow(row, idx, x, y, w, h, sel) {
    var it = row.it, lv = RP.game.level(it.id), col = rowColors(it);
    if (sel) { G.rect(x, y, w, h - 1, 'maroon'); G.rect(x, y, w, 1, 'red'); UI.cursor(x + 2, y + 4); }
    var name = it.name;
    T.draw(name, x + 10, y + 2, col.label, { shadow: sel ? 'ink' : null });
    var right;
    if (it.endless) { right = U.yen(RP.game.itemCost(it), true); }
    else if (lv >= it.max) { right = it.max > 1 ? S.maxed(lv) : S.owned; }
    else { right = U.yen(RP.game.itemCost(it), true); }
    T.draw(right, x + w - 3, y + 2, col.status === 'done' ? 'silver' : col.price, { align: 'r' });
    if (!it.endless && it.max > 1 && lv > 0 && lv < it.max) { T.draw('Lv' + lv, x + w - 70, y + 3, 'lime', { align: 'r', size: 10 }); }
  }

  function enter(args) {
    t = 0;
    if (args && args.tab !== undefined) { tab = args.tab; }
    menu = new UI.Menu(rows(), { x: 6, y: 48, w: 214, rowH: 16, rows: 9, drawRow: drawRow, tapSelects: false,
      onSelect: function (r, i, denied) { tryBuy(r.it, denied); },
      onTapRow: function (r, i, changed) { if (changed) { UI.se('select'); } else { tryBuy(r.it, false); } } });
    RP.music.play('shop', { fade: 0.6 });
    FX.reset();
  }

  function refresh() { var idx = menu.index; menu.setItems(rows(), true); menu.index = Math.min(idx, menu.items.length - 1); menu.ensureVisible(); }

  function setTab(n) {
    var cnt = RP.ITEM_CATS.length;
    tab = (n + cnt) % cnt;
    UI.se('tab');
    menu.setItems(rows(), false);
  }

  function tryBuy(it, denied) {
    var chk = RP.game.canBuy(it);
    if (!chk.ok) {
      UI.se('error');
      FX.shake(1, 0.15);
      FX.popup(chk.reason, 300, 150, 'red');
      return;
    }
    var cost = RP.game.itemCost(it), st = RP.game.state;
    var doBuy = function () {
      var r = RP.game.buy(it);
      if (!r.ok) { return; }
      UI.se('buy');
      buyFlash = 0.4; lastBought = it.id;
      FX.burst(300, 100, 26, { cols: ['yellow', 'orange', 'white'], speed: 90, up: 40 });
      FX.popup('-' + U.yen(r.cost, true), 300, 90, 'orange', { bold: true });
      if (it.cat === 'decor' || it.endless) {
        FX.confetti(300, 110, 28, { w: 60 }); UI.se('whoosh');
        if (it.id === 'e_donate') { UI.se('firework'); FX.burst(300, 70, 50, { speed: 100, cols: ['red', 'yellow', 'cyan', 'pink', 'white'], gravity: 40, life: 1.3 }); }
      }
      if (it.cat === 'menu' || it.cat === 'equip') { UI.se('unlock'); }
      if (it.cat === 'staff') { UI.se('fanfare'); FX.popup(S.hire, 300, 70, 'lime', { bold: true }); }
      if (it.id === 'e_world' || it.id === 'e_space') { UI.se('fanfareBig'); FX.flash('#ffffff', 0.5, 0.8); FX.rainConfetti(80); }
      RP.game.achCheck(null);
      RP.game.save();
      refresh();
    };
    // 手持ちの半分以上を使うときは確認する
    if (cost >= st.money * 0.5 && cost >= 5000) {
      dlg.open({
        title: S.confirmTitle, text: S.confirm(it.name, U.yen(cost)), width: 220,
        choices: [{ label: S.confirmYes, value: 'yes' }, { label: S.confirmNo, value: 'no' }], cancelValue: 'no',
        onChoose: function (v) { if (v === 'yes') { doBuy(); } }
      });
    } else { doBuy(); }
  }

  function update(dt) {
    t += dt;
    if (buyFlash > 0) { buyFlash -= dt; }
    if (dlg.active) { dlg.update(dt); return; }
    // タブ
    for (var i = 0; i < tabRects.length; i++) {
      var r = tabRects[i];
      if (I.tapIn(r.x, r.y, r.w, r.h)) { if (tab !== i) { setTab(i); } }
    }
    if (I.nav('left')) { setTab(tab - 1); }
    if (I.nav('right')) { setTab(tab + 1); }
    if (I.tapIn(0, H - 14, 110, 14) || I.pressed('cancel')) { UI.se('cancel'); RP.scene.go('morning', {}, { trans: 'fade', dur: 0.3 }); return; }
    menu.update();
  }

  function draw() {
    var st = RP.game.state;
    UI.stripes(t, '#1c1a3c', '#221e44');
    // ヘッダー
    G.rect(0, 0, W, 14, 'ink'); G.rect(0, 13, W, 1, '#4a4060');
    T.draw(S.title, 4, 1, 'yellow');
    T.draw(S.money, 240, 1, 'silver'); T.draw(U.yen(st.money, true), W - 4, 1, 'yellow', { align: 'r' });
    // タブ
    tabRects = [];
    var tx = 4;
    RP.ITEM_CATS.forEach(function (c, i) {
      var w = T.measure(S.cats[c.id] || c.name) + 12;
      tabRects.push({ x: tx, y: 18, w: w, h: 20 });
      var on = i === tab;
      G.rrect(tx, 20, w, 18, on ? 'cream' : 'gray');
      G.rrect(tx + 1, 21, w - 2, 17, on ? 'maroon' : '#2e2640');
      T.draw(S.cats[c.id] || c.name, tx + 6, 23, on ? 'white' : 'silver');
      tx += w + 3;
    });
    G.rect(0, 38, W, 1, 'cream');
    // リスト
    menu.draw();
    // 詳細
    var cur = menu.items[menu.index];
    UI.panel(226, 44, 152, 154, { title: S.detail });
    if (cur) {
      var it = cur.it, lv = RP.game.level(it.id), col = rowColors(it);
      var lines = T.wrap(it.name, 140);
      lines.forEach(function (l, i) { T.draw(l, 232, 52 + i * 13, 'yellow'); });
      var y = 52 + lines.length * 13 + 2;
      T.wrap(it.desc, 138).forEach(function (l, i) { T.draw(l, 232, y + i * 13, 'white'); });
      y = 126;
      if (it.max > 1) { T.draw('段階 ' + lv + ' / ' + it.max, 232, y, 'lime'); y += 13; }
      if (it.upkeep) { T.draw('維持費 +' + U.yen(it.upkeep, true) + '/日', 232, y, 'silver'); y += 13; }
      if (it.wage) { T.draw('日給 ' + U.yen(it.wage, true) + '/日', 232, y, 'silver'); y += 13; }
      // 買うボタン
      var bx = 232, by = 172, bw = 140, bh = 20;
      var label = col.status === 'done' ? S.done : (col.status === 'locked' ? col.reason : (col.status === 'short' ? S.short(U.yen(RP.game.itemCost(it) - st.money, true)) : S.buy + '  ' + U.yen(RP.game.itemCost(it), true)));
      var bcol = col.status === 'ok' ? 'maroon' : 'gray';
      G.rrect(bx, by + 2, bw, bh, 'ink');
      G.rrect(bx, by, bw, bh, col.status === 'ok' ? 'cream' : 'gray');
      G.rrect(bx + 1, by + 1, bw - 2, bh - 2, bcol);
      T.draw(label, bx + bw / 2, by + 4, col.status === 'ok' ? 'white' : 'silver', { align: 'c', shadow: 'ink' });
      if (I.tapIn(bx, by, bw, bh)) { tryBuy(it, false); }
    }
    if (buyFlash > 0) { G.alpha(buyFlash); G.rect(226, 44, 152, 154, 'white'); G.alpha(1); }
    UI.softkeys(S.back, '', S.soft, { noInput: true, centerCol: 'silver' });
  }
  function drawTop() { if (dlg.active) { dlg.draw(); } }

  RP.scene.register('shop', { enter: enter, update: update, draw: draw, drawTop: drawTop });
})(window.RP);
