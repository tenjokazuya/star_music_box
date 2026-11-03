/* 営業パートの画面（入力→ロジック呼び出し、描画、演出、音）。ロジック本体は service_core.js。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx, TU = RP.TUNE;
  var W = RP.W, H = RP.H;

  // ---- レイアウト ----
  var HUD_H = 14, COUNTER_Y = 92, SLOT_Y = 102, SLOT_H = 46, ST_Y = 150, ST_H = 26, ST2_Y = 178;
  var SLOT_COL = ['red', 'cyan', 'yellow', 'lime', 'pink', 'orange'];
  var HARD_SHORT = { bari: 'バリ', katame: 'カタ', futsu: 'ふつ', yawa: 'やわ' };

  var svc = null, bg = null, st = null, d = null;
  var L = null;                // レイアウト（毎フレーム再計算）
  var hold = null;             // 押しっぱなし操作 { pid, key, kind }
  var banners = [];
  var msg = { text: '', t: 0 };
  var dialog = new UI.Dialog();
  var state = 'intro';         // intro | play | paused | outro
  var introT = 0, outroT = 0;
  var tAnim = 0;
  var args = null;
  var hitFlash = {};           // セル押下の光り
  var weather = 'clear';
  var tipQueue = [];

  // ---------- ユーティリティ ----------
  function seatW() { var n = svc.seats.length; return n <= 4 ? 64 : (n <= 6 ? 54 : 46); }
  function seatX(i) { var n = svc.seats.length; return Math.round(W / 2 + (i - (n - 1) / 2) * seatW()); }
  function flash(id) { hitFlash[id] = 0.15; }
  function say(text) { msg.text = text; msg.t = 1.6; }
  function banner(text, col, dur, sub) { banners.push({ text: text, col: col || 'yellow', t: 0, dur: dur || 2.2, sub: sub }); }
  function shortName(id) { return RP.MENU.soup(id).name; }
  function soupCol(id) { return RP.MENU.soup(id).col; }

  // ---------- レイアウト計算 ----------
  function computeLayout() {
    var lay = { seats: [], slots: [], pots: [], soups: [], tops: [], grills: [], stock: [], rice: null, beer: null };
    var i, x;
    for (i = 0; i < svc.seats.length; i++) {
      var cx = seatX(i), sw = seatW();
      lay.seats.push({ i: i, cx: cx, x: cx - Math.floor(sw / 2), y: HUD_H, w: sw, h: COUNTER_Y + 10 - HUD_H });
    }
    var ns = svc.slots.length, sw2 = 58, gap = 2, tot = ns * sw2 + (ns - 1) * gap, sx = Math.round((W - tot) / 2);
    for (i = 0; i < ns; i++) { lay.slots.push({ i: i, x: sx + i * (sw2 + gap), y: SLOT_Y, w: sw2, h: SLOT_H }); }
    // 行A：釜（左）と寸胴（右）
    var cw = 44;
    for (i = 0; i < svc.pots.length; i++) { lay.pots.push({ i: i, x: 6 + i * (cw + 2), y: ST_Y, w: cw, h: ST_H }); }
    var soups = d.soups;
    for (i = 0; i < soups.length; i++) {
      lay.soups.push({ i: i, id: soups[i], x: W - 6 - (soups.length - i) * (cw + 2) + 2, y: ST_Y, w: cw, h: ST_H });
    }
    // 行B：トッピング・餃子・保温・ライス・ビール
    var widths = d.tops.length * 30 + (d.tops.length ? 4 : 0);
    var gw = svc.grills.length * 38 + (svc.grills.length ? 4 : 0);
    var stw = d.grills > 0 ? d.stockCap * 14 + 6 : 0;
    var rw = d.rice ? 34 : 0, bw = d.beer ? 34 : 0;
    var total = widths + gw + stw + rw + bw + (stw ? 4 : 0) + (rw ? 4 : 0);
    x = Math.round((W - total) / 2);
    d.tops.forEach(function (id, k) { lay.tops.push({ id: id, x: x + k * 30, y: ST2_Y, w: 28, h: ST_H }); });
    x += widths;
    for (i = 0; i < svc.grills.length; i++) { lay.grills.push({ i: i, x: x + i * 38, y: ST2_Y, w: 36, h: ST_H }); }
    x += gw;
    if (stw) {
      for (i = 0; i < d.stockCap; i++) { lay.stock.push({ i: i, x: x + 3 + i * 14, y: ST2_Y, w: 13, h: ST_H }); }
      lay.stockBox = { x: x, y: ST2_Y, w: stw - 2, h: ST_H };
      x += stw + 4;
    }
    if (rw) { lay.rice = { x: x, y: ST2_Y, w: 32, h: ST_H }; x += rw + 4; }
    if (bw) { lay.beer = { x: x, y: ST2_Y, w: 32, h: ST_H }; }
    return lay;
  }

  // ---------- 入力 ----------
  var KEYS = {
    seats: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'],
    slots: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'],
    pots: ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
    soups: ['KeyZ', 'KeyX', 'KeyC', 'KeyV'],
    tops: ['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
    grills: ['KeyG', 'KeyB'],
    stock: 'KeyN', rice: 'KeyM', beer: 'Comma'
  };
  var KEYLABEL = {
    Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8',
    KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R', KeyT: 'T', KeyY: 'Y', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F',
    KeyZ: 'Z', KeyX: 'X', KeyC: 'C', KeyV: 'V', KeyH: 'H', KeyJ: 'J', KeyK: 'K', KeyL: 'L', Semicolon: ';',
    KeyG: 'G', KeyB: 'B', KeyN: 'N', KeyM: 'M', Comma: ','
  };

  function inR(t, r) { return t.x >= r.x && t.x < r.x + r.w && t.y >= r.y && t.y < r.y + r.h; }

  function handleTap(t) {
    var i, r;
    // 提供ボタン（丼台下部）が最優先
    for (i = 0; i < L.slots.length; i++) {
      r = L.slots[i];
      var sl = svc.slots[i];
      if (inR(t, r) && sl) {
        if (sl.ready && t.y >= r.y + r.h - 14) { doServe(i); return; }
        if (t.x >= r.x + r.w - 11 && t.y < r.y + 12 && (sl.bowl.soup || sl.bowl.noodle)) { doTrash(i); return; }
        svc.selectSlot(i); UI.se('select'); flash('slot' + i); return;
      }
    }
    for (i = 0; i < L.seats.length; i++) {
      r = L.seats[i];
      if (inR(t, r)) { tapSeat(i); return; }
    }
    for (i = 0; i < L.pots.length; i++) { if (inR(t, L.pots[i])) { tapPot(i); return; } }
    for (i = 0; i < L.soups.length; i++) { if (inR(t, L.soups[i])) { startPour('soup', L.soups[i].id, t.id, L.soups[i], null); return; } }
    for (i = 0; i < L.tops.length; i++) { if (inR(t, L.tops[i])) { tapTop(L.tops[i].id); return; } }
    for (i = 0; i < L.grills.length; i++) { if (inR(t, L.grills[i])) { tapGrill(i); return; } }
    for (i = 0; i < L.stock.length; i++) { if (inR(t, L.stock[i])) { tapStock(i); return; } }
    if (L.rice && inR(t, L.rice)) { tapRice(); return; }
    if (L.beer && inR(t, L.beer)) { startPour('beer', 'beer', t.id, L.beer, null); return; }
  }

  function tapSeat(i) {
    var seat = svc.seats[i];
    if (seat.cust && seat.cust.state === 'order') { svc.tapCustomer(i); flash('seat' + i); return; }
    if (seat.cust && seat.cust.state === 'wait' && seat.cust.slot) { svc.selectSlot(seat.cust.slot.idx); UI.se('select'); flash('slot' + seat.cust.slot.idx); return; }
    if (seat.dirty) { svc.clearSeat(i, false); return; }
  }
  function tapPot(i) { var r = svc.tapPot(i); if (r) { flash('pot' + i); } else { /* error通知済み */ } }
  function tapTop(id) { if (svc.tapTopping(id)) { flash('top' + id); } }
  function tapGrill(i) { var r = svc.tapGrill(i); if (r) { flash('grill' + i); } }
  function tapStock(i) { if (svc.tapStock(i)) { flash('stock' + i); } }
  function tapRice() { if (svc.tapRice()) { flash('rice'); } }
  function doServe(i) { svc.serveSlot(i); }
  function doTrash(i) { svc.trashSlot(i); }

  function startPour(kind, id, pid, rect, keyCode) {
    if (svc.pourBegin(kind, id)) {
      hold = { pid: pid, key: keyCode || null, kind: kind, id: id };
      flash(kind === 'beer' ? 'beer' : 'soup' + id);
    }
  }
  function endPour() {
    if (svc.pour) { svc.pourEnd(); }
    hold = null;
  }

  function handleKeys() {
    var i;
    // 注ぎ中のキーが離されたら終了
    if (hold && hold.key && !I.rawHeld(hold.key)) { endPour(); }
    for (i = 0; i < KEYS.seats.length; i++) { if (i < svc.seats.length && I.rawPressed(KEYS.seats[i])) { tapSeat(i); } }
    for (i = 0; i < svc.slots.length; i++) {
      if (I.rawPressed(KEYS.slots[i]) && svc.selectSlot(i)) { UI.se('select'); flash('slot' + i); }
    }
    for (i = 0; i < svc.pots.length; i++) { if (I.rawPressed(KEYS.pots[i])) { tapPot(i); } }
    for (i = 0; i < d.soups.length; i++) {
      if (I.rawPressed(KEYS.soups[i]) && !hold) { startPour('soup', d.soups[i], null, null, KEYS.soups[i]); }
    }
    for (i = 0; i < d.tops.length; i++) { if (I.rawPressed(KEYS.tops[i])) { tapTop(d.tops[i]); } }
    for (i = 0; i < svc.grills.length; i++) { if (I.rawPressed(KEYS.grills[i])) { tapGrill(i); } }
    if (I.rawPressed(KEYS.stock) && svc.stock.length) { tapStock(0); }
    if (I.rawPressed(KEYS.rice)) { tapRice(); }
    if (I.rawPressed(KEYS.beer) && d.beer && !hold) { startPour('beer', 'beer', null, null, KEYS.beer); }
    if (I.pressed('ok')) {
      var sl = svc.selSlot();
      if (sl && sl.ready) { doServe(sl.idx); }
    }
    if (I.rawPressed('Backspace') && svc.sel >= 0) { doTrash(svc.sel); }
  }

  // ---------- イベント（音・演出） ----------
  function custPos(c) {
    var s = L && L.seats[c.seat];
    return s ? { x: s.cx, y: 66 } : { x: W / 2, y: 66 };
  }
  var X = RP.TEXT;
  var GRADE_TXT = X.pop.pour;
  var GRADE_COL = { perfect: 'yellow', ok: 'white', low: 'cyan', over: 'red', bad: 'red' };

  function onEvent(type, e) {
    var p;
    switch (type) {
      case 'arrive': UI.se('door'); addFlier(e.c, e.seat); break;
      case 'wantOrder': UI.se('tab'); break;
      case 'accept':
        UI.se('order'); flash('slot' + e.slot.idx);
        p = custPos(e.c); FX.popup(X.pop.accept, p.x, 54, 'white');
        break;
      case 'error': UI.se('error'); say(e.msg); break;
      case 'info': UI.se('select'); say(e.msg); break;
      case 'pourStart':
        UI.se('soupStart');
        RP.audio.loop(e.kind === 'beer' ? 'beer' : 'pour', 1, 1800);
        break;
      case 'pourZone': UI.se('cursor'); break;
      case 'pourEnd':
        RP.audio.loop('pour', 0); RP.audio.loop('beer', 0);
        UI.se('soupEnd');
        var rs = L.slots[e.slot.idx];
        if (rs) { FX.popup(GRADE_TXT[e.grade], rs.x + rs.w / 2, rs.y + 24, GRADE_COL[e.grade]); }
        if (e.grade === 'perfect') { UI.se('perfect'); FX.sparkle(rs.x + rs.w / 2, rs.y + 28, 8); }
        if (e.kind === 'beer') { UI.se('glass'); }
        hold = null;
        break;
      case 'pourCancel': RP.audio.loop('pour', 0); RP.audio.loop('beer', 0); hold = null; break;
      case 'noodleIn':
        UI.se('noodleIn');
        if (L.pots[e.i]) { FX.steam(L.pots[e.i].x + 22, L.pots[e.i].y + 6, 4); }
        break;
      case 'noodleOut':
        UI.se('noodleOut');
        var rp = L.slots[e.slot.idx];
        if (rp) {
          var hh = RP.MENU.hard(e.actual);
          FX.popup(e.grade === 'perfect' ? hh.name + '！' : (e.grade === 'ok' ? hh.name : X.pop.noodleBad), rp.x + rp.w / 2, rp.y + 24, GRADE_COL[e.grade]);
          FX.steam(rp.x + rp.w / 2, rp.y + 30, 5);
          if (e.grade === 'perfect') { FX.sparkle(rp.x + rp.w / 2, rp.y + 28, 6); }
        }
        break;
      case 'nobi': UI.se('warn'); say(X.info.nobi); break;
      case 'topping':
        UI.se('topping');
        var rt = L.slots[e.slot.idx];
        if (rt) { FX.burst(rt.x + rt.w / 2, rt.y + 30, 4, { cols: ['lime', 'white'], speed: 30, gravity: 80, life: 0.4 }); if (e.extra) { FX.popup(X.pop.extraTop, rt.x + rt.w / 2, rt.y + 20, 'orange'); } }
        break;
      case 'gyozaIn': UI.se('gyozaIn'); break;
      case 'gyozaFlipWait': UI.se('cursor'); break;
      case 'flip': UI.se('flip'); if (e.grade === 'perfect') { FX.sparkle(L.grills[e.i].x + 18, L.grills[e.i].y + 10, 4); } break;
      case 'gyozaDone': UI.se('perfect'); break;
      case 'burn': UI.se('warn'); say(X.info.burn); break;
      case 'plate': UI.se('plate'); break;
      case 'rice': UI.se('rice'); break;
      case 'riceReady': UI.se('ok'); say(X.info.riceReady); break;
      case 'discard': UI.se('trash'); break;
      case 'trash':
        UI.se('trash');
        var rtr = L.slots[e.slot.idx];
        if (rtr) { FX.popup(X.pop.trash, rtr.x + rtr.w / 2, rtr.y + 20, 'orange'); }
        break;
      case 'ready': UI.se('star'); break;
      case 'serve': onServe(e); break;
      case 'serveCold':
        p = custPos(e.c);
        FX.popup(X.pop.cold, p.x, 50, 'cyan', { bold: true });
        UI.se('serve');
        break;
      case 'pay':
        p = custPos(e.c);
        UI.se(e.tip > 0 ? 'tip' : 'pay');
        FX.coin(p.x, 88); FX.coin(p.x + 4, 88);
        FX.popup('+' + U.yen(e.amount), p.x, 52, 'yellow', { bold: true, dy: 18, life: 1.1 });
        if (e.tip > 0) { FX.popup(X.pop.tip + U.comma(e.tip), p.x, 64, 'lime', { delay: 0.25 }); }
        break;
      case 'angry':
        p = custPos(e.c);
        if (e.why === 'closing') { FX.popup(X.pop.closing, p.x, 50, 'cyan'); break; }
        UI.se('angry'); FX.shake(2, 0.3);
        FX.popup(e.why === 'cold' ? X.pop.coldAngry : (e.why === 'order' ? X.pop.angryOrder : X.pop.angryWait), p.x, 50, 'red', { bold: true });
        break;
      case 'leave':
        if (e.ate) { UI.se('leave'); }
        break;
      case 'clear': UI.se('clear'); break;
      case 'queue': UI.se('tab'); wipeHold = 0.9; break;
      case 'queueLeave':
        if (!e.closing) { UI.se('sigh'); var gq = wipeGeom(); FX.popup(X.pop.queueGiveUp, gq.x + gq.w / 2, gq.y + gq.h + 6, 'cyan', { size: 10 }); }
        break;
      case 'lost': UI.se('sigh'); var gl = wipeGeom(); wipeHold = 0.9; FX.popup(X.pop.full, gl.x + gl.w / 2, gl.y + gl.h + 6, 'orange', { size: 10 }); break;
      case 'impatient': UI.se('warn'); break;
      case 'combo':
        UI.se('combo', { n: e.n / 5 });
        var cb = X.banner.combo(e.n); banner(cb[0], 'orange', 1.5, cb[1]);
        FX.confetti(W / 2, 120, 30, { w: 160 });
        if (d.decor.cracker) { UI.se('fanfare'); FX.confetti(60, 130, 24); FX.confetti(W - 60, 130, 24); }
        if (d.decor.fireworks && e.n >= 10) { UI.se('firework'); FX.burst(W / 2, 50, 40, { speed: 90, cols: ['red', 'yellow', 'cyan', 'pink', 'white'], gravity: 40, life: 1.2 }); }
        break;
      case 'rush':
        if (e.on) {
          UI.se('rushWarn'); UI.se('drum');
          banner(X.banner.rush[0], 'red', 1.9, X.banner.rush[1]);
          RP.music.setIntensity(1);
        } else { RP.music.setIntensity(0); }
        break;
      case 'event': onEventBanner(e); break;
      case 'close':
        UI.se('clapper');
        banner(X.banner.close[0], 'cyan', 2.4, X.banner.close[1]);
        break;
      case 'finished':
        state = 'outro'; outroT = 0;
        banner(X.banner.done[0], 'yellow', 2.6);
        UI.se('dayEnd');
        break;
      case 'staff':
        onStaff(e);
        break;
      default: break;
    }
  }

  var STAFF_TXT = X.staff;
  function onStaff(e) {
    var x = W / 2, y = 120;
    if (e.seat !== undefined && L.seats[e.seat]) { x = L.seats[e.seat].cx; y = 52; }
    else if (e.slot && L.slots[e.slot.idx]) { x = L.slots[e.slot.idx].x + 29; y = L.slots[e.slot.idx].y + 14; }
    FX.popup(STAFF_TXT[e.kind] || STAFF_TXT.default, x, y, 'cyan', { size: 10, dy: 8, life: 0.8 });
    UI.se('tick');
  }

  function onEventBanner(e) {
    if (e.kind === 'group') { UI.se('event'); banner(X.banner.group[0], 'cyan', 2.2, X.banner.group[1]); }
    else if (e.kind === 'critic') { UI.se('event'); banner(X.banner.critic[0], 'yellow', 2.4, X.banner.critic[1]); }
    else if (e.kind === 'drunk') { UI.se('event'); banner(X.banner.drunk[0], 'orange', 2.2, X.banner.drunk[1]); }
    else if (e.kind === 'tv') {
      UI.se('fanfare'); banner(X.banner.tv[0], 'pink', 2.6, X.banner.tv[1]);
      FX.flash('#ffffff', 0.35, 0.6);
    }
  }

  function onServe(e) {
    var ev = e.ev, p = custPos(e.c), s = ev.stars;
    RP.game.achCheck(svc);
    UI.se('serve');
    var txt = X.pop.serve[s];
    var col = ['gray', 'white', 'lime', 'yellow'][s];
    FX.popup(txt, p.x, 46, col, { bold: true, dy: 16, life: 1.1 });
    if (s >= 2) {
      UI.se('star', { n: s });
      FX.sparkle(p.x, 70, s === 3 ? 12 : 6);
      FX.ring(p.x, 76, s === 3 ? 'yellow' : 'lime', s === 3 ? 18 : 12);
    }
    if (s === 3) {
      UI.se('perfect'); FX.hitstop(0.06);
      if (d.decor.confetti) { FX.confetti(p.x, 70, 18, { w: 20 }); UI.se('whoosh'); }
    }
    if (ev.wrongSoup) { FX.popup(X.pop.wrongSoup, p.x, 36, 'red'); }
  }

  // ---------- 初期化 ----------
  function enter(a) {
    args = a || {};
    if (!RP.game.state) { RP.game.newGame(); }
    st = RP.game.state;
    if (args.debug) { RP.game.debugSetup(args.debug); }
    d = RP.game.derive(st);
    weather = RP.game.weatherFor(st.day);
    svc = new RP.Service({ state: st, derived: d, weather: weather, onEvent: onEvent });
    L = computeLayout();
    if (RP.debug) { RP.dbg = { svc: svc, state: function () { return state; } }; }
    bg = RP.bg.create(svc.tier, d, st.seed + st.day);
    hold = null; banners = []; msg.t = 0; hitFlash = {}; fliers = []; wipeK = 0; wipeHold = 0;
    state = 'intro'; introT = 0; outroT = 0; tAnim = 0;
    FX.reset();
    st.startMoney = st.money;
    tipQueue = [];
    if (!RP.debug || RP.query('tips') === '1') {
      if (!st.flags.hints) { st.flags.hints = {}; }
      RP.TIPS.forEach(function (tp) { if (!st.flags.hints[tp.id] && tp.cond(d, st) && tipQueue.length < 2) { tipQueue.push(tp); } });
    }
    // 音：BGM・環境音
    var bgm = st.bgmPick && st.bgmPick !== 'auto' && d.bgms.indexOf(st.bgmPick) >= 0 ? 'day_' + st.bgmPick : 'day';
    RP.music.play(bgm, { fade: 0.8, intensity: 0 });
    setAmbience(0);
    UI.se('open');
    banner(X.banner.open[0], 'yellow', 2.0, X.banner.open[1](st.day, svc.tier.short, weather === 'rain'));
    RP.audio.loopsOff();
  }

  function setAmbience(p) {
    var tid = svc.tier.id;
    RP.audio.ambience({
      city: 0.5 + tid * 0.04,
      cricket: d.ambs.indexOf('cricket') >= 0 ? 0.8 : (tid <= 2 && p > 0.35 ? 0.35 : 0),
      rain: weather === 'rain' ? 0.8 : 0,
      train: (tid === 1 || d.ambs.indexOf('train') >= 0) ? 0.6 : 0,
      chime: d.decor.chime ? 0.9 : 0,
      wind: weather === 'rain' ? 0.4 : 0.15,
      sim: 0.7
    });
  }

  function exit() {
    FX.freeze = false;
    RP.audio.loopsOff();
    RP.audio.ambience({});
    RP.music.setIntensity(0);
  }

  // ---------- 更新 ----------
  var ambP = -1;
  function update(dt) {
    tAnim += dt;
    L = computeLayout();
    var k;
    // 行列ワイプの出入りと、入店の飛び込み
    var needWipe = svc.queue.length > 0 || fliers.length > 0;
    wipeHold = needWipe ? 0.9 : Math.max(0, wipeHold - dt);
    wipeK = U.clamp(wipeK + (wipeHold > 0 ? dt * 4 : -dt * 2.4), 0, 1);
    for (var fi = fliers.length - 1; fi >= 0; fi--) {
      fliers[fi].t += dt;
      if (fliers[fi].t >= fliers[fi].dur) {
        var sf = L.seats[fliers[fi].seat];
        if (sf) { FX.steam(sf.cx - 6, COUNTER_Y - 2, 2); FX.steam(sf.cx + 6, COUNTER_Y - 2, 2); }
        fliers.splice(fi, 1);
      }
    }
    FX.freeze = (state === 'paused' || state === 'tip' || dialog.active);
    for (k in hitFlash) { if (hitFlash[k] > 0) { hitFlash[k] -= dt; } }
    if (msg.t > 0) { msg.t -= dt; }
    for (var b = banners.length - 1; b >= 0; b--) { banners[b].t += dt; if (banners[b].t > banners[b].dur) { banners.splice(b, 1); } }

    if (dialog.active) { dialog.update(dt); return; }

    if (state === 'intro') {
      introT += dt;
      if (introT > 1.6) { state = 'play'; showTip(); }
      return;
    }
    if (state === 'outro') {
      outroT += dt;
      svc.update(dt);
      if (outroT > 2.8 && !RP.scene.busy()) { toResult(); }
      return;
    }
    if (state === 'paused') { return; }

    // ポーズ
    if (I.pressed('menu') || I.rawPressed('Escape')) { openPause(); return; }
    // ポインタ
    for (var i = 0; i < I.taps.length; i++) {
      var t = I.taps[i];
      if (t.used) { continue; }
      if (t.y >= H - UI.SOFT_H - 2) { continue; }   // ソフトキーは draw 側で処理
      handleTap(t);
    }
    handleKeys();
    // 注ぎ終了（指を離した）
    if (hold && hold.pid !== null && hold.pid !== undefined) {
      for (var r = 0; r < I.releases.length; r++) { if (I.releases[r].id === hold.pid) { endPour(); break; } }
    }
    if (hold && !svc.pour) { hold = null; }
    // ポインタが全て離れているのに押下扱いなら終了（取りこぼし対策）
    if (hold && hold.pid !== null && hold.pid !== undefined && I.downPoints().length === 0) { endPour(); }

    svc.update(dt);
    // 音：注ぎ中のピッチ
    if (svc.pour) {
      RP.audio.loop(svc.pour.kind === 'beer' ? 'beer' : 'pour', 1, 1500 + svc.pour.level * 2600);
    }
    // 釜・鉄板の環境音
    var boiling = 0, i2;
    for (i2 = 0; i2 < svc.pots.length; i2++) { if (svc.pots[i2].state === 'boil') { boiling++; } }
    RP.audio.loop('boil', Math.min(1, boiling * 0.5));
    var frying = 0;
    for (i2 = 0; i2 < svc.grills.length; i2++) { if (svc.grills[i2].state !== 'empty' && svc.grills[i2].state !== 'burnt') { frying++; } }
    RP.audio.loop('sizzle', Math.min(1, frying * 0.6));
    var pp = svc.sec / TU.daySec;
    if (Math.floor(pp * 5) !== ambP) { ambP = Math.floor(pp * 5); setAmbience(pp); }
    // 蒸気の演出
    if (Math.random() < dt * 6) {
      for (i2 = 0; i2 < L.pots.length; i2++) { if (svc.pots[i2].state === 'boil') { FX.steam(L.pots[i2].x + 14 + Math.random() * 16, L.pots[i2].y + 5, 1); } }
    }
  }

  function showTip() {
    var tp = tipQueue.shift();
    if (!tp) { return; }
    state = 'tip'; svc.paused = true;
    st.flags.hints[tp.id] = true;
    dialog.open({
      title: X.tipTitle + tp.title, text: tp.text, width: 256,
      choices: [{ label: X.tipOk, value: 1 }],
      onChoose: function () {
        if (tipQueue.length) { showTip(); } else { state = 'play'; svc.paused = false; }
      }
    });
  }

  function toResult() {
    RP.audio.loopsOff();
    var s = svc;
    RP.scene.go('result', { svc: s, startMoney: st.startMoney, weather: weather }, { trans: 'fade', dur: 0.7 });
    outroT = -99;
  }

  function openPause() {
    state = 'paused'; svc.paused = true;
    RP.audio.loopsOff();
    dialog.open({
      title: X.pause.title, text: X.pause.text, width: 220,
      choices: [{ label: X.pause.resume, value: 'resume' }, { label: X.pause.giveUp, value: 'retry' }],
      cancelValue: 'resume',
      onChoose: function (v) {
        if (v === 'resume') { state = 'play'; svc.paused = false; }
        else { confirmGiveUp(); }
      }
    });
  }
  function confirmGiveUp() {
    dialog.open({
      title: X.pause.confirmTitle, text: X.pause.confirmText, width: 232,
      choices: [{ label: X.pause.no, value: 'no' }, { label: X.pause.yes, value: 'yes' }], cancelValue: 'no',
      onChoose: function (v) {
        if (v === 'yes') {
          // 営業前の状態に戻す（朝のセーブがあればそこへ）
          if (RP.game.load()) { RP.scene.go('morning', {}, { trans: 'noren' }); } else { RP.scene.go('title', {}, { trans: 'fade' }); }
        } else { openPause(); }
      }
    });
  }

  // ---------- 描画 ----------
  function moodOf(c) {
    switch (c.state) {
      case 'enter': return 'normal';
      case 'order': return 'wait';
      case 'wait': var r = c.pat / c.patMax; return r > 0.45 ? 'normal' : (r > 0.25 ? 'sour' : 'angry');
      case 'eat': return 'eat';
      case 'happy': return c.result && c.result.stars === 0 ? 'sour' : 'happy';
      case 'angry': return 'angry';
      default: return 'normal';
    }
  }

  function drawBubble(cx, y, w, h, border) {
    G.rrect(cx - w / 2 - 1, y - 1, w + 2, h + 2, border || 'ink');
    G.rrect(cx - w / 2, y, w, h, 'white');
    G.rect(cx - 1, y + h + 1, 3, 1, border || 'ink'); G.rect(cx, y + h + 2, 1, 1, border || 'ink');
    G.rect(cx - 1, y + h, 3, 1, 'white'); G.rect(cx, y + h + 1, 1, 1, 'white');
  }

  function iconSoup(x, y, id, a) { G.sprite('ic_soup', x, y, { pal: { x: soupCol(id) }, alpha: a }); }
  function iconHard(x, y, id, a) { G.sprite('ic_h_' + id, x, y, { pal: { x: RP.MENU.hard(id).col }, alpha: a }); }

  // ---------- 行列のワイプ（店の外の様子を小窓で見せる） ----------
  // 待っている客を小窓に映し、席が空いたら窓から席へ飛び込んでくる。
  var wipeK = 0, wipeHold = 0, fliers = [];
  var WIPE_Y = 15, WIPE_H = 24, CS = 2;

  function wipeGeom() {
    var n = svc.queue.length;
    var heads = Math.min(4, Math.max(n, 1));
    var more = n > 4;
    var w = 33 + heads * 17 + (more ? 16 : 1);
    var off = Math.round((1 - U.ease.outCubic(wipeK)) * (w + 8));
    return { x: W - 4 - w + off, y: WIPE_Y, w: w, h: WIPE_H, heads: heads, more: more };
  }
  function wipeSlotX(g, i) { return g.x + 33 + i * 17; }

  function drawWipe() {
    if (wipeK <= 0.01) { return; }
    var g = wipeGeom(), n = svc.queue.length, ctx = G.ctx, i;
    G.rrect(g.x - 1, g.y - 1, g.w + 2, g.h + 2, 'ink');
    G.rrect(g.x, g.y, g.w, g.h, 'cream');
    G.rrect(g.x + 1, g.y + 1, g.w - 2, g.h - 2, '#262050');
    G.rect(g.x + 2, g.y + g.h - 4, g.w - 4, 2, '#32286a');
    // 生放送っぽい赤い点とラベル
    G.rect(g.x + 4, g.y + 4, 3, 3, Math.floor(tAnim * 2) % 2 === 0 ? 'red' : 'maroon');
    T.draw(X.wipe.label, g.x + 9, g.y + 1, 'cream', { size: 10 });
    T.draw(n > 0 ? X.wipe.count(n) : '', g.x + 9, g.y + 12, n >= svc.tier.queue ? 'yellow' : 'white', { size: 10 });
    ctx.save();
    ctx.beginPath(); ctx.rect(g.x + 2, g.y + 2, g.w - 4, g.h - 4); ctx.clip();
    for (i = 0; i < g.heads && i < n; i++) {
      var q = svc.queue[i], r = U.clamp(1 - q.qt / TU.queueWait, 0, 1);
      var mood = r > 0.5 ? 'wait' : (r > 0.25 ? 'sour' : 'angry');
      var cv = RP.cust.canvas(q.look, mood, 0);
      var px = wipeSlotX(g, i), pop = q.qt < 0.3 ? Math.round((1 - q.qt / 0.3) * 16) : 0;
      var sh = r < 0.25 ? (Math.floor(tAnim * 20) % 2 ? 1 : -1) : 0;
      ctx.drawImage(cv, 3, 2, 16, 15, px + sh, g.y + 4 + pop, 16, 15);
      G.rect(px, g.y + 19, 16, 2, 'ink');
      G.rect(px, g.y + 19, Math.round(16 * r), 2, r > 0.5 ? 'lime' : (r > 0.25 ? 'yellow' : 'red'));
    }
    ctx.restore();
    if (g.more) { T.draw('+' + (n - 4), g.x + g.w - 16, g.y + 8, 'yellow', { size: 10 }); }
  }

  function addFlier(c, seatIdx) { fliers.push({ c: c, seat: seatIdx, t: 0, dur: TU.enterSec }); wipeHold = 0.9; }

  // 窓から席へ。頭だけ見えている状態から、体が現れつつ2倍に育って着地する。
  function drawFliers() {
    var ctx = G.ctx;
    for (var i = 0; i < fliers.length; i++) {
      var f = fliers[i], k = U.clamp(f.t / f.dur, 0, 1), e = U.ease.inOutQuad(k);
      var g = wipeGeom();
      var sx = wipeSlotX(g, 0) - 3, sy = g.y + 3 - 2;
      var seat = L.seats[f.seat];
      if (!seat) { continue; }
      var ex = seat.cx - 22, ey = COUNTER_Y + 4 - RP.cust.H * CS;
      var sc = 1 + e;
      var x = sx + (ex - sx) * e, y = sy + (ey - sy) * e - Math.sin(Math.PI * k) * 12;
      var clipH = 17 + (RP.cust.H - 17) * e;
      var cv = RP.cust.canvas(f.c.look, 'normal', 0);
      ctx.drawImage(cv, 0, 0, RP.cust.W, clipH, Math.round(x), Math.round(y), RP.cust.W * sc, clipH * sc);
    }
  }

  function custBodyY(c, i) {
    var ch = RP.cust.H * CS;
    var bounce = (c.state === 'happy' || (c.state === 'wait' && c.warned)) ? (Math.floor(tAnim * 6 + i) % 2) : 0;
    var land = c.state === 'order' && c.ot < 0.18 ? Math.round(Math.sin(c.ot / 0.18 * Math.PI) * 3) : 0;
    return COUNTER_Y + 4 - ch - bounce * 2 - land;
  }

  // 客の体（カウンターより奥）
  function drawCustomerBodies() {
    for (var i = 0; i < svc.seats.length; i++) {
      var c = svc.seats[i].cust;
      if (!c || c.state === 'enter') { continue; }   // 入店中は飛び込み演出(drawFliers)が描く
      var cx = L.seats[i].cx;
      var shake = c.state === 'angry' ? Math.round(Math.sin(tAnim * 60) * 1.5) : 0;
      var cv = RP.cust.canvas(c.look, moodOf(c), Math.floor(tAnim * 4 + i) % 2);
      var cw = RP.cust.W * CS, ch = RP.cust.H * CS, y = custBodyY(c, i);
      G.alpha(1);
      G.ctx.drawImage(cv, Math.round(cx - cw / 2 + shake), y, cw, ch);
      if (c.state === 'angry') { G.alpha(0.35 + 0.15 * Math.sin(tAnim * 30)); G.rect(cx - cw / 2, y, cw, ch, 'red'); G.alpha(1); }
    }
  }

  // 吹き出し（注文を聞いて！）
  function drawBubbles() {
    for (var i = 0; i < svc.seats.length; i++) {
      var c = svc.seats[i].cust;
      if (!c || c.state !== 'order') { continue; }
      var cx = L.seats[i].cx, topY = COUNTER_Y + 4 - RP.cust.H * CS;
      var ratio = c.ot / TU.orderWait;
      var wob = Math.floor(tAnim * 5) % 2;
      var border = ratio > 0.6 ? (Math.floor(tAnim * 8) % 2 ? 'red' : 'ink') : 'ink';
      drawBubble(cx, topY - 22 - wob, 26, 15, border);
      iconSoup(cx - 12, topY - 19 - wob, c.order.soup);
      iconHard(cx + 2, topY - 19 - wob, c.order.hard);
      G.rect(cx - 13, topY - 6 - wob, Math.round(26 * (1 - ratio)), 1, ratio > 0.6 ? 'red' : 'green');
    }
  }

  // カウンター天板の上に出すもの（忍耐ゲージ・丼の番号・食べている丼）。カウンターより手前に描く。
  function drawCustomerFront() {
    for (var i = 0; i < svc.seats.length; i++) {
      var c = svc.seats[i].cust;
      if (!c) { continue; }
      var cx = L.seats[i].cx;
      if (c.state === 'wait') {
        var sl = c.slot, rr = U.clamp(c.pat / c.patMax, 0, 1);
        var col = rr > 0.55 ? 'lime' : (rr > 0.3 ? 'yellow' : 'red');
        var by = COUNTER_Y + 5;
        G.rect(cx - 16, by, 32, 5, 'ink');
        G.rect(cx - 15, by + 1, 30, 3, 'shade');
        G.rect(cx - 15, by + 1, Math.round(30 * rr), 3, col);
        if (sl) {
          G.rect(cx - 16 - 9, by - 2, 8, 9, 'ink'); G.rect(cx - 15 - 9, by - 1, 6, 7, SLOT_COL[sl.idx]);
          T.draw(String(sl.idx + 1), cx - 24, by - 3, 'ink', { size: 10 });
        }
        if (c.warned && Math.floor(tAnim * 6) % 2) { T.draw('！', cx + 14, by - 4, 'red', { outline: 'ink' }); }
      } else if (c.state === 'eat') {
        G.sprite('bowl_empty', cx - 9, COUNTER_Y + 1);
        G.rect(cx - 6, COUNTER_Y + 2, 12, 2, soupCol(c.order.soup));
        if (Math.random() < 0.15) { FX.steam(cx - 2 + Math.random() * 6, COUNTER_Y - 4, 1); }
      }
    }
  }

  function drawCounter() {
    // カウンター天板
    G.rect(0, COUNTER_Y + 4, W, 4, 'woodL');
    G.rect(0, COUNTER_Y + 8, W, 2, 'woodD');
    G.rect(0, COUNTER_Y + 4, W, 1, '#c88a54');
    for (var x = 0; x < W; x += 24) { G.rect(x + 5, COUNTER_Y + 6, 7, 1, '#8a5630'); }
    // 厨房側の壁
    G.rect(0, COUNTER_Y + 10, W, H - COUNTER_Y - 10, '#3a2a22');
    G.rect(0, COUNTER_Y + 10, W, 1, 'ink');
    for (var i = 0; i < svc.seats.length; i++) {
      var s = svc.seats[i], cx = L.seats[i].cx;
      if (s.dirty) {
        var pulse = Math.floor(tAnim * 3) % 2;
        G.sprite('dish_dirty', cx - 7, COUNTER_Y);
        if (pulse) { G.rect(cx - 9, COUNTER_Y - 2, 18, 1, 'yellow'); }
        if (!svc.d.staff.clear) { T.draw(X.slot.clearDish, cx, COUNTER_Y - 14, 'yellow', { align: 'c', outline: 'ink' }); }
      }
    }
  }

  function wrapIcons(order, slot) {
    // 注文を「アイコン列」に変換: { draw(x,y,alpha), done }
    var list = [];
    list.push({ kind: 'soup', id: order.soup, done: !!(slot.bowl.soup && slot.bowl.soup.type === order.soup), wrong: !!(slot.bowl.soup && slot.bowl.soup.type !== order.soup) });
    list.push({ kind: 'hard', id: order.hard, done: !!slot.bowl.noodle });
    order.tops.forEach(function (id) { list.push({ kind: 'top', id: id, done: slot.bowl.tops.indexOf(id) >= 0 }); });
    if (order.gyoza) { list.push({ kind: 'gyoza', done: !!slot.gyoza }); }
    if (order.beer) { list.push({ kind: 'beer', done: !!slot.beer }); }
    if (order.rice) { list.push({ kind: 'rice', done: !!slot.rice }); }
    return list;
  }
  function drawOrderIcon(it, x, y, a) {
    switch (it.kind) {
      case 'soup': iconSoup(x, y, it.id, a); break;
      case 'hard': iconHard(x, y, it.id, a); break;
      case 'top': G.sprite('ic_' + it.id, x, y, { alpha: a }); break;
      default: G.sprite('ic_' + it.kind, x, y, { alpha: a });
    }
  }

  function drawMiniBowl(x, y, sl) {
    // 丼の中身を絵で見せる（20x11）
    G.sprite('bowl_empty', x - 1, y);
    var b = sl.bowl;
    if (b.soup) {
      var col = soupCol(b.soup.type);
      G.rect(x + 2, y + 1, 14, 2, col);
      G.rect(x + 1, y + 2, 16, 1, col);
    }
    if (b.noodle) {
      G.rect(x + 3, y, 12, 2, 'noodle'); G.rect(x + 5, y + 1, 1, 1, 'tonkotsu'); G.rect(x + 9, y, 1, 1, 'tonkotsu'); G.rect(x + 12, y + 1, 1, 1, 'tonkotsu');
    }
    b.tops.forEach(function (id, k) {
      var tc = RP.MENU.top(id).col;
      G.rect(x + 3 + k * 3, y - 1, 3, 2, tc);
    });
    if (b.gold) { G.alpha(0.55); G.rect(x + 1, y + 4, 16, 3, 'yellow'); G.alpha(1); }
  }

  function drawSlots() {
    var i, nd = svc.need();
    G.rect(0, SLOT_Y - 2, W, SLOT_H + 4, '#2a1e1a');
    for (i = 0; i < L.slots.length; i++) {
      var r = L.slots[i], sl = svc.slots[i];
      var selected = svc.sel === i;
      if (!sl) {
        G.rrect(r.x, r.y, r.w, r.h, '#3a2a22');
        G.rrect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, '#241812');
        T.draw(X.slot.empty, r.x + r.w / 2, r.y + 16, '#5a4a40', { align: 'c' });
        T.draw(String(i + 1), r.x + 4, r.y + 2, '#5a4a40');
        continue;
      }
      var col = SLOT_COL[i];
      var flashing = hitFlash['slot' + i] > 0;
      G.rrect(r.x, r.y, r.w, r.h, selected ? 'white' : (svc.sel < 0 && Math.floor(tAnim * 3) % 2 ? 'white' : col));
      G.rrect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, selected ? '#4a3a52' : '#3a2e44');
      G.rect(r.x + 2, r.y + 1, r.w - 4, 1, col);
      {
        // 待っている客の忍耐（色が変わり、残りが少ないと点滅）
        var pc = sl.cust, pr = U.clamp(pc.pat / pc.patMax, 0, 1);
        G.rect(r.x + 3, r.y + 2, r.w - 6, 2, 'ink');
        G.rect(r.x + 3, r.y + 2, Math.round((r.w - 6) * pr), 2, pr > 0.55 ? 'lime' : (pr > 0.3 ? 'yellow' : (Math.floor(tAnim * 6) % 2 ? 'red' : 'maroon')));
      }
      if (flashing) { G.alpha(0.4); G.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 'white'); G.alpha(1); }
      // 顔・番号・金額
      var c = sl.cust;
      var cv = RP.cust.canvas(c.look, moodOf(c), 0);
      G.ctx.drawImage(cv, 3, 3, 16, 14, r.x + 3, r.y + 4, 16, 14);
      G.rect(r.x + 3, r.y + 4, 7, 9, 'ink'); G.rect(r.x + 4, r.y + 5, 5, 7, col);
      T.draw(String(i + 1), r.x + 4, r.y + 3, 'ink', { size: 10 });
      var pp = svc.pour && svc.pour.slot === sl ? svc.pour : null;
      if (pp) {
        var zz = Math.abs(pp.level - pp.zone.mid) <= pp.zone.half;
        T.draw(zz ? X.pour.now : X.pour.hold, r.x + r.w - 3, r.y + 4, zz ? 'lime' : 'white', { align: 'r', size: 10, outline: 'ink' });
      } else {
        var pyen = c.order.price;
        T.draw(pyen >= 10000 ? '\u00a5' + U.yenShort(pyen) : U.yen(pyen), r.x + r.w - 3, r.y + 3, 'yellow', { align: 'r' });
      }
      // 注文アイコン
      var icons = wrapIcons(sl.order, sl);
      var pouring = svc.pour && svc.pour.slot === sl;
      if (!pouring) {
        for (var k = 0; k < icons.length; k++) {
          var ix = r.x + 3 + (k % 5) * 11, iy = r.y + 19 + Math.floor(k / 5) * 10;
          var it = icons[k];
          drawOrderIcon(it, ix, iy, it.done ? 0.35 : 1);
          if (it.done) { G.sprite(it.wrong ? 'ic_x' : 'ic_ok', ix, iy); }
          else if (selected && nd && ((it.kind === 'soup' && nd.soup) || (it.kind === 'hard' && nd.noodle) ||
                   (it.kind === 'top' && nd.tops.indexOf(it.id) >= 0) || (it.kind === 'gyoza' && nd.gyoza) ||
                   (it.kind === 'beer' && nd.beer) || (it.kind === 'rice' && nd.rice))) {
            if (Math.floor(tAnim * 4) % 2) { G.frame(ix - 1, iy - 1, 11, 11, 'yellow'); }
          }
        }
      } else {
        drawPourGauge(r, svc.pour);
      }
      // 丼の絵と温度
      drawMiniBowl(r.x + 3, r.y + 36, sl);
      if (sl.bowl.soup) {
        var hv = U.clamp(sl.bowl.heat / 100, 0, 1);
        var hc = sl.bowl.heat >= TU.heat.hot ? 'red' : (sl.bowl.heat >= TU.heat.warm ? 'orange' : (sl.bowl.heat >= TU.heat.cold ? 'cyan' : 'blue'));
        G.rect(r.x + 26, r.y + 40, 28, 4, 'ink'); G.rect(r.x + 27, r.y + 41, 26, 2, 'shade');
        G.rect(r.x + 27, r.y + 41, Math.round(26 * hv), 2, hc);
        if (hv < 0.3 && Math.floor(tAnim * 4) % 2) { G.rect(r.x + 26, r.y + 40, 28, 4, 'blue'); }
        // 湯気
        if (hv > 0.4 && Math.random() < 0.03) { FX.steam(r.x + 12, r.y + 34, 1); }
      }
      // ゴミ箱
      if (sl.bowl.soup || sl.bowl.noodle) { G.sprite('ic_trash', r.x + r.w - 11, r.y + 12, { alpha: 0.55 }); }
      // 提供ボタン
      if (sl.ready) {
        var pulse = Math.floor(tAnim * 4) % 2;
        G.rrect(r.x + 2, r.y + r.h - 15, r.w - 4, 13, 'ink');
        G.rrect(r.x + 3, r.y + r.h - 14, r.w - 6, 11, pulse ? '#48b04c' : '#3a9a40');
        T.draw(X.slot.serve, r.x + r.w / 2, r.y + r.h - 14, 'white', { align: 'c', shadow: 'ink' });
      }
      // 選択マーク
      if (selected) { UI.cursor(r.x - 4, r.y + 20, 'yellow'); }
      if (I.lastDevice === 'key') { T.draw(KEYLABEL[KEYS.slots[i]], r.x + r.w - 9, r.y + 14, 'silver', { size: 10 }); }
    }
  }

  function drawPourGauge(r, p) {
    var gx = r.x + 4, gy = r.y + 20, gw = r.w - 8, gh = 12;
    var z = p.zone;
    G.rect(gx - 1, gy - 1, gw + 2, gh + 2, 'ink');
    G.rect(gx, gy, gw, gh, 'shade');
    var okA = z.mid - z.okHalf, okB = z.mid + z.okHalf, pfA = z.mid - z.half, pfB = z.mid + z.half;
    G.rect(gx + Math.round(gw * okA), gy, Math.round(gw * (okB - okA)), gh, p.kind === 'beer' ? '#7a6020' : '#5a4a20');
    G.rect(gx + Math.round(gw * pfA), gy, Math.round(gw * (pfB - pfA)), gh, 'forest');
    var lv = U.clamp(p.level, 0, 1);
    var fc = p.kind === 'beer' ? 'yellow' : soupCol(p.id);
    G.rect(gx, gy + 3, Math.round(gw * lv), gh - 6, fc);
    var inZ = Math.abs(p.level - z.mid) <= z.half;
    G.rect(gx + Math.round((gw - 1) * lv), gy - 2, 1, gh + 4, inZ ? 'lime' : 'white');
    void inZ;
  }

  // ---- 作業台 ----
  function cellBox(r, key, glow, sel) {
    var f = hitFlash[key] > 0;
    G.rrect(r.x, r.y, r.w, r.h, glow ? (Math.floor(tAnim * 4) % 2 ? 'yellow' : 'cream') : '#14101c');
    G.rrect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, f ? '#6a5a7a' : (sel ? '#4a3a58' : '#2e2640'));
    G.rect(r.x + 2, r.y + 1, r.w - 4, 1, '#4a4060');
  }
  function keyHint(r, code) {
    if (I.lastDevice === 'key' && code) { T.draw(KEYLABEL[code], r.x + r.w - 7, r.y + r.h - 11, 'silver', { size: 10 }); }
  }

  function drawStations() {
    var i, nd = svc.need(), sl = svc.selSlot(), t = tAnim;
    G.rect(0, ST_Y - 2, W, H - ST_Y + 2 - UI.SOFT_H, '#241812');
    // 釜
    for (i = 0; i < L.pots.length; i++) {
      var r = L.pots[i], p = svc.pots[i];
      var glow = nd && nd.noodle && p.state === 'boil';
      cellBox(r, 'pot' + i, glow, p.state === 'boil');
      // 鍋本体
      G.rect(r.x + 6, r.y + 4, r.w - 12, 10, '#14101c');
      G.rect(r.x + 7, r.y + 5, r.w - 14, 8, 'steel');
      G.rect(r.x + 7, r.y + 5, r.w - 14, 2, '#aab4c8');
      G.rect(r.x + 3, r.y + 6, 3, 2, 'steelD'); G.rect(r.x + r.w - 6, r.y + 6, 3, 2, 'steelD');
      var water = p.state === 'idle' ? '#3a7ab0' : '#58b8e8';
      G.rect(r.x + 9, r.y + 5, r.w - 18, 3, water);
      if (p.state === 'boil' || p.state === 'nobi') {
        for (var b = 0; b < 4; b++) {
          var bx = r.x + 11 + ((b * 7 + Math.floor(t * 6 + b)) % (r.w - 22));
          G.px(bx, r.y + 5 + (b % 2), 'white');
        }
        // 麺
        G.rect(r.x + 12, r.y + 6, r.w - 24, 2, p.state === 'nobi' ? '#b0a070' : 'noodle');
      }
      // 状態テキスト or ゲージ
      if (p.state === 'idle') {
        T.draw(X.cell.boil, r.x + r.w / 2, r.y + 13, 'white', { align: 'c', shadow: 'ink', size: 10 });
      } else {
        drawPotGauge(r, p, sl);
      }
      keyHint(r, KEYS.pots[i]);
    }
    // 寸胴
    for (i = 0; i < L.soups.length; i++) {
      var rs = L.soups[i], sid = rs.id;
      var needSoup = nd && nd.soup && sl && sl.order.soup === sid;
      var pouring = svc.pour && svc.pour.kind === 'soup' && svc.pour.id === sid;
      cellBox(rs, 'soup' + sid, needSoup, pouring);
      G.rect(rs.x + 9, rs.y + 2, rs.w - 18, 12, '#14101c');
      G.rect(rs.x + 10, rs.y + 3, rs.w - 20, 10, 'steel');
      G.rect(rs.x + 10, rs.y + 3, rs.w - 20, 2, '#aab4c8');
      G.rect(rs.x + 12, rs.y + 4, rs.w - 24, 3, soupCol(sid));
      G.rect(rs.x + 6, rs.y + 6, 3, 3, 'steelD'); G.rect(rs.x + rs.w - 9, rs.y + 6, 3, 3, 'steelD');
      // おたま
      G.rect(rs.x + rs.w - 12, rs.y + 0, 1, 7, '#9a96a8'); G.rect(rs.x + rs.w - 13, rs.y + 6, 3, 2, '#9a96a8');
      T.draw(shortName(sid), rs.x + rs.w / 2, rs.y + 13, 'white', { align: 'c', shadow: 'ink', size: 10 });
      if (pouring && Math.random() < 0.5) { FX.steam(rs.x + 22, rs.y + 3, 1); }
      keyHint(rs, KEYS.soups[i]);
    }
    // トッピング
    for (i = 0; i < L.tops.length; i++) {
      var rt = L.tops[i], tid = rt.id;
      var needTop = nd && nd.tops.indexOf(tid) >= 0;
      cellBox(rt, 'top' + tid, needTop, false);
      G.sprite('ic_' + tid, rt.x + 5, rt.y + 4, { sx: 2 });
      keyHint(rt, KEYS.tops[i]);
    }
    // 鉄板
    for (i = 0; i < L.grills.length; i++) {
      var rg = L.grills[i], g = svc.grills[i];
      var needG = nd && nd.gyoza && g.state === 'done';
      cellBox(rg, 'grill' + i, needG || g.state === 'flip' || g.state === 'burnt', g.state !== 'empty');
      G.rect(rg.x + 3, rg.y + 5, rg.w - 6, 10, '#14101c');
      G.rect(rg.x + 4, rg.y + 6, rg.w - 8, 8, g.state === 'empty' ? '#4a566c' : '#5a6680');
      var gc = { empty: null, cook: '#f6efdc', flip: '#f6efdc', cook2: '#d89c3c', done: '#f0b020', burnt: '#2a1a14' }[g.state];
      if (gc) {
        for (var gi = 0; gi < 6; gi++) {
          var gx2 = rg.x + 7 + (gi % 3) * 9, gy2 = rg.y + 7 + Math.floor(gi / 3) * 3;
          G.rect(gx2, gy2, 7, 3, gc); G.rect(gx2, gy2 + 2, 7, 1, g.state === 'cook' || g.state === 'flip' ? '#c8a860' : '#8a5a20');
        }
        if (g.state === 'cook' || g.state === 'cook2') { if (Math.random() < 0.2) { FX.steam(rg.x + 8 + Math.random() * 20, rg.y + 6, 1); } }
      }
      var lab = g.state === 'empty' ? X.cell.gyoza : (g.state === 'flip' ? X.cell.flip : (g.state === 'done' ? X.cell.take : (g.state === 'burnt' ? X.cell.trash : X.cell.frying)));
      var lcol = g.state === 'flip' || g.state === 'done' ? 'yellow' : (g.state === 'burnt' ? 'red' : 'white');
      T.draw(lab, rg.x + rg.w / 2, rg.y + 14, lcol, { align: 'c', shadow: 'ink', size: 10 });
      // 進行バー
      if (g.state !== 'empty') {
        var G2 = TU.gyoza, lim = g.state === 'cook' ? G2.cook1 : (g.state === 'flip' ? G2.flipWindow : (g.state === 'cook2' ? G2.cook2 : G2.doneKeep));
        var pr = U.clamp(g.t / lim, 0, 1);
        G.rect(rg.x + 3, rg.y + 3, rg.w - 6, 2, 'ink');
        G.rect(rg.x + 3, rg.y + 3, Math.round((rg.w - 6) * pr), 2, g.state === 'flip' ? 'red' : (g.state === 'done' ? 'yellow' : 'orange'));
      }
      keyHint(rg, KEYS.grills[i]);
    }
    // 保温ケース
    if (L.stockBox) {
      var sb = L.stockBox;
      G.rrect(sb.x, sb.y, sb.w, sb.h, '#14101c'); G.rrect(sb.x + 1, sb.y + 1, sb.w - 2, sb.h - 2, '#3a3050');
      T.draw(X.cell.warm, sb.x + sb.w / 2, sb.y, 'silver', { align: 'c', size: 10 });
      for (i = 0; i < L.stock.length; i++) {
        var rk = L.stock[i], item = svc.stock[i];
        G.rect(rk.x, rk.y + 10, rk.w, 14, '#241c34');
        if (item) {
          var hv2 = item.heat / 100;
          var needS = nd && nd.gyoza;
          if (needS && Math.floor(tAnim * 4) % 2) { G.frame(rk.x - 1, rk.y + 9, rk.w + 2, 16, 'yellow'); }
          G.sprite('ic_gyoza', rk.x + 2, rk.y + 9);
          G.rect(rk.x + 1, rk.y + 20, rk.w - 2, 3, 'ink');
          G.rect(rk.x + 2, rk.y + 21, Math.round((rk.w - 4) * hv2), 1, hv2 > 0.6 ? 'orange' : (hv2 > 0.3 ? 'cyan' : 'blue'));
        }
      }
    }
    // ライス
    if (L.rice) {
      var rr = L.rice;
      cellBox(rr, 'rice', nd && nd.rice && svc.cooker.stock > 0, svc.cooker.cooking);
      G.sprite('ic_rice', rr.x + 1, rr.y + 4, { sx: 2 });
      if (svc.cooker.cooking) {
        G.rect(rr.x + 3, rr.y + 21, rr.w - 6, 3, 'ink'); G.rect(rr.x + 4, rr.y + 22, Math.round((rr.w - 8) * svc.cooker.t / TU.rice.cookTime), 1, 'orange');
        T.draw(X.cell.cook, rr.x + 20, rr.y + 6, 'orange', { size: 10, outline: 'ink' });
      } else {
        T.draw('x' + svc.cooker.stock, rr.x + 20, rr.y + 6, svc.cooker.stock === 0 ? 'red' : 'white', { size: 10, outline: 'ink' });
      }
      keyHint(rr, KEYS.rice);
    }
    // ビール
    if (L.beer) {
      var rb = L.beer;
      var pb = svc.pour && svc.pour.kind === 'beer';
      cellBox(rb, 'beer', nd && nd.beer, pb);
      G.sprite('ic_beer', rb.x + 7, rb.y + 4, { sx: 2 });
      keyHint(rb, KEYS.beer);
    }
  }

  function drawPotGauge(r, p, sl) {
    var gx = r.x + 3, gy = r.y + 18, gw = r.w - 6, gh = 6;
    var maxT = svc.nobiTime() * 1.02;
    var NN = TU.noodle, s = d.strainer;
    var perf = NN.perfTol + s * NN.strainerStep, ok = NN.okTol + s * NN.strainerStep * 1.4;
    G.rect(gx - 1, gy - 1, gw + 2, gh + 2, 'ink');
    G.rect(gx, gy, gw, gh, '#3a3050');
    var want = sl && sl.bowl.soup && !sl.bowl.noodle ? sl.order.hard : null;
    d.hards.forEach(function (hid) {
      var tt = svc.hardTime(hid);
      var xa = gx + Math.round(gw * (tt - ok) / maxT), wa = Math.max(2, Math.round(gw * 2 * ok / maxT));
      var xb = gx + Math.round(gw * (tt - perf) / maxT), wb = Math.max(1, Math.round(gw * 2 * perf / maxT));
      var hc = RP.MENU.hard(hid).col;
      var bright = want === hid;
      G.rect(xa, gy + 1, wa, gh - 2, bright ? U.mixHex(G.color(hc), '#14101c', 0.35) : U.mixHex(G.color(hc), '#14101c', 0.6));
      var inBand = Math.abs(p.t - tt) <= ok;
      G.rect(xb, gy + 1, wb, gh - 2, bright && inBand && Math.floor(tAnim * 6) % 2 ? '#ffffff' : hc);
    });
    // のびゾーン
    var nx = gx + Math.round(gw * svc.nobiTime() / maxT);
    G.rect(nx, gy, gx + gw - nx, gh, '#2a1a14');
    var mx = gx + Math.round(gw * U.clamp(p.t / maxT, 0, 1));
    G.rect(mx, gy - 2, 1, gh + 4, p.state === 'nobi' ? 'red' : 'white');
    // 現在の硬さ表示
    if (p.state === 'nobi') { T.draw(X.cell.nobi, r.x + r.w / 2, r.y + 5, 'red', { align: 'c', outline: 'ink', size: 10 }); }
    else {
      var nh = svc.nearestHard(p.t);
      var within = Math.abs(p.t - nh.time * svc.noodleScale()) <= ok;
      T.draw(within ? HARD_SHORT[nh.id] : '…', r.x + r.w / 2, r.y + 5, within ? nh.col : 'silver', { align: 'c', outline: 'ink', size: 10 });
    }
  }

  function drawHUD() {
    G.rect(0, 0, W, HUD_H, 'ink');
    G.rect(0, HUD_H - 1, W, 1, '#4a4060');
    var clock = U.clock(svc.clock());
    T.draw(st.day + X.hud.day, 3, 1, 'cream');
    T.draw(clock, 52, 1, svc.rushOn ? (Math.floor(tAnim * 4) % 2 ? 'red' : 'yellow') : 'cyan');
    // 営業の進み
    var pr = U.clamp(svc.sec / TU.daySec, 0, 1);
    G.rect(84, 5, 60, 4, '#2a2438'); G.rect(85, 6, 58, 2, '#14101c');
    G.rect(85, 6, Math.round(58 * pr), 2, svc.rushOn ? 'red' : 'cyan');
    // 所持金（中央）と、今夜の売上（短縮表記）
    T.draw(U.yen(st.money, true), 188, 1, 'yellow', { align: 'c' });
    T.draw('+' + U.yenShort(svc.stats.sales), 232, 1, 'lime');
    // 評判・コンボ
    var rs = RP.game.stars(st.rep);
    for (var i = 0; i < 5; i++) { G.sprite('ic_star', W - 48 + i * 9 - 2, 2, { pal: i < rs ? null : { y: '#4a4060' } }); }
    if (svc.combo >= 2) { T.draw(svc.combo + X.hud.combo, W - 52, 1, 'orange', { align: 'r' }); }
  }

  function hintText() {
    var i, H2 = X.hint;
    for (i = 0; i < svc.seats.length; i++) { if (svc.seats[i].cust && svc.seats[i].cust.state === 'order') { return H2.takeOrder; } }
    var sl = svc.selSlot();
    if (!sl) {
      if (svc.slots.some(function (s) { return s; })) { return H2.pickSlot; }
      return H2.waiting;
    }
    var n = svc.need(sl);
    if (sl.ready) { return H2.serve; }
    if (n.soup) { return H2.soup(shortName(sl.order.soup)); }
    if (n.noodle) {
      var phases = svc.pots.filter(function (p) { return p.state === 'boil'; }).map(function (p) { return svc.noodlePhase(p.t, sl.order.hard); });
      if (!phases.length) { return H2.noodleStart; }
      if (phases.indexOf('now') >= 0) { return H2.noodleLift; }
      return phases.indexOf('early') >= 0 ? H2.noodleWait : H2.noodleLate;
    }
    if (n.tops.length) { return H2.tops(n.tops.map(function (id) { return RP.MENU.top(id).name; }).join('・')); }
    if (n.gyoza) { return H2.gyoza; }
    if (n.beer) { return H2.beer; }
    if (n.rice) { return H2.rice; }
    return '';
  }

  function drawBanners() {
    banners.forEach(function (bn) {
      var k = bn.t / bn.dur;
      var a = k < 0.12 ? k / 0.12 : (k > 0.8 ? (1 - k) / 0.2 : 1);
      var slide = k < 0.12 ? (1 - k / 0.12) * 40 : 0;
      var y = 46;   // 客の部分に出す（丼台・作業台には被せない）
      G.alpha(0.55 * a); G.rect(0, y, W, 28, 'ink'); G.alpha(a);
      G.rect(0, y, W, 1, bn.col); G.rect(0, y + 27, W, 1, bn.col); G.alpha(1);
      T.draw(bn.text, W / 2 - slide, y + 2, bn.col, { align: 'c', size: 16, outline: 'ink', bold: true, alpha: a });
      if (bn.sub) { T.draw(bn.sub, W / 2 + slide, y + 18, 'white', { align: 'c', size: 10, alpha: a }); }
    });
  }

  // 描画順: 背景 → ワイプ → 客の体 → 夜の色味 → 吹き出し・飛び込み → カウンター → 丼台 → 作業台 → HUD → ソフトキー → バナー
  //         （ポップアップ等のFXは scene.js が後から重ね、ダイアログは drawTop で最前面に出す）
  function draw() {
    var p = U.clamp(svc.sec / TU.daySec, 0, 1);
    RP.bg.draw(bg, p, svc.rushOn, 1 / 60);
    if (weather === 'rain') {
      for (var i = 0; i < 40; i++) {
        var rx = (i * 53 + Math.floor(tAnim * 160)) % W, ry = 14 + ((i * 31 + Math.floor(tAnim * 220)) % 78);
        G.rect(rx, ry, 1, 3, '#7a9ad0');
      }
    }
    drawWipe();
    drawCustomerBodies();
    // 夜の色味は背景と客の体だけにかける（UIや吹き出し・ダイアログは暗くしない）
    if (p > 0.5) { G.alpha(Math.min(0.12, (p - 0.5) * 0.2)); G.rect(0, 14, W, 78, '#000030'); G.alpha(1); }
    drawBubbles();
    drawFliers();
    drawCounter();
    drawCustomerFront();
    drawSlots();
    drawStations();
    drawHUD();
    var ht = hintText();
    var res = UI.softkeys(X.hud.softPause, '', msg.t > 0 ? msg.text : ht, { centerCol: msg.t > 0 ? 'red' : 'yellow', noInput: dialog.active || state !== 'play' });
    if (res === 'left' && state === 'play') { openPause(); }
    drawBanners();
  }
  function drawTop() { if (dialog.active) { dialog.draw(); } }

  // 画面が隠れた/ウィンドウがフォーカスを失ったら自動でポーズ
  function autoPause() {
    if (RP.debug) { return; }   // 開発中の自動検証を止めない
    if (RP.scene.name() === 'service' && state === 'play' && !dialog.active) { openPause(); }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { autoPause(); } });
  window.addEventListener('blur', autoPause);

  RP.scene.register('service', { enter: enter, update: update, draw: draw, drawTop: drawTop, exit: exit });
  RP.serviceView = { onEvent: onEvent };
})(window.RP);
