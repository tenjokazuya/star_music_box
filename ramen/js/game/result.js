/* 精算（一日の締め）。売上から材料費・固定費を引き、足りなければゲームオーバー。
 * 足りれば日を進めてオートセーブし、朝へ。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx;
  var W = RP.W, H = RP.H;

  RP.OWNER_LOOK = { hair: 'towel', hairCol: '#2a2230', body: 'overall', c1: '#f6efdc', c2: '#b8a880', skin: 'skin', glasses: false };

  var A = null;   // 画面状態
  var t = 0;

  function gradeOf(s) {
    var tot = s.served + s.angry + s.lost;
    var served = tot ? s.served / tot : 1;
    var sum = s.stars[1] + s.stars[2] * 2 + s.stars[3] * 3;
    var avg = s.served ? sum / s.served / 3 : 0;
    var score = served * 60 + avg * 40;
    if (!s.served && !s.angry) { score = 30; }
    var g = score >= 88 ? 'S' : (score >= 75 ? 'A' : (score >= 60 ? 'B' : (score >= 40 ? 'C' : 'D')));
    return { grade: g, score: score };
  }

  var R = RP.TEXT.result;

  function enter(args) {
    if (!args || !args.svc) { A = null; RP.scene.go('morning', {}, { trans: 'none' }); return; }   // 営業データ無しで開かれた場合の保険
    var svc = args.svc, st = RP.game.state, d = svc.d, s = svc.stats;
    t = 0;
    var materials = Math.round(s.materials), waste = Math.round(s.waste);
    var expenses = materials + waste + d.rent + d.upkeep + d.wage;
    var net = s.sales - expenses;
    var newMoney = st.money - expenses;
    var g = gradeOf(s);
    A = {
      svc: svc, s: s, d: d, st: st, startMoney: args.startMoney, expenses: expenses, net: net, newMoney: newMoney,
      bankrupt: newMoney < 0, grade: g.grade, lines: [], shown: 0, done: false, stamped: false, moneyShown: args.startMoney + s.sales,
      comment: '', weather: args.weather, repDelta: s.repDelta, proceeding: false
    };
    var list = A.lines;
    function L(label, value, col, big, sound) { list.push({ label: label, value: value, col: col || 'white', big: !!big, sound: sound }); }
    L(R.served, R.unit(s.served), 'white');
    L(R.angry, R.unit(s.angry), s.angry ? 'red' : 'silver');
    if (s.lost) { L(R.lost, R.unit(s.lost), 'orange'); }
    L(R.stars, s.stars[3] + ' / ' + s.stars[2] + ' / ' + s.stars[1] + ' / ' + s.stars[0], 'yellow');
    L(R.combo, s.bestCombo + '連', s.bestCombo >= 5 ? 'orange' : 'white');
    L(R.sales, '+' + U.yen(s.sales), 'lime', false, 'coin');
    L(R.material, '-' + U.yen(materials + waste), 'silver');
    L(R.rent, '-' + U.yen(d.rent), 'silver');
    if (d.upkeep > 0) { L(R.upkeep, '-' + U.yen(d.upkeep), 'silver'); }
    if (d.wage > 0) { L(R.wage, '-' + U.yen(d.wage), 'silver'); }
    L(net >= 0 ? R.netPlus : R.netMinus, (net >= 0 ? '+' : '-') + U.yen(Math.abs(net)), net >= 0 ? 'yellow' : 'red', true, 'coins');
    L(R.money, U.yen(newMoney, true), newMoney < 0 ? 'red' : 'white', true);
    var cs = R.comment[A.grade];
    A.comment = A.bankrupt ? R.bankrupt : cs[Math.floor(Math.random() * cs.length)];
    RP.music.play('result', { fade: 0.6 });
    RP.audio.ambience({ city: 0.3, cricket: 0.4 });
    RP.audio.loopsOff();
  }

  function update(dt) {
    if (!A) { return; }
    t += dt;
    var nextAt = 0.7 + A.shown * 0.5;
    if (A.shown < A.lines.length && t >= nextAt) {
      var ln = A.lines[A.shown];
      A.shown++;
      if (ln.sound) { UI.se(ln.sound); } else { UI.se('select'); }
      if (ln.sound === 'coins') { FX.burst(250, 150, 12, { cols: ['yellow', 'orange'], speed: 60, up: 30 }); }
    }
    if (A.shown >= A.lines.length && !A.done) {
      A.done = true; A.doneT = t;
    }
    if (A.done) {
      if (!A.stamped && t - A.doneT > 0.6) {
        A.stamped = true; UI.se('stamp'); FX.shake(3, 0.25); FX.hitstop(0.05);
        if (A.grade === 'S' || A.grade === 'A') { UI.se('star', { n: 3 }); FX.confetti(310, 90, 30, { w: 40 }); }
      }
      // 所持金のロールアップ
      A.moneyShown = U.approach(A.moneyShown, A.newMoney, Math.max(1, Math.abs(A.newMoney - A.moneyShown) * 0.1 + 50));
      if (A.stamped && !A.proceeding && (I.taps.length || I.pressed('ok'))) { proceed(); }
    } else if (I.taps.length || I.pressed('ok')) {
      // 演出スキップ：全行を一気に表示
      t = Math.max(t, 0.7 + A.lines.length * 0.5);
    }
  }

  function proceed() {
    A.proceeding = true;
    UI.se('ok');
    var st = A.st;
    if (A.bankrupt) {
      st.stats.bankrupt++;
      RP.scene.go('gameover', { cause: 'bankrupt', net: A.net }, { trans: 'fade', dur: 1.0 });
      return;
    }
    // 日を進める
    var s = A.s;
    st.money = A.newMoney;
    st.stats.sales += s.sales; st.stats.served += s.served; st.stats.angry += s.angry;
    st.stats.perfect += s.stars[3]; st.stats.days++;
    st.stats.bestCombo = Math.max(st.stats.bestCombo, s.bestCombo);
    st.stats.maxMoney = Math.max(st.stats.maxMoney, st.money);
    st.last = { day: st.day, sales: s.sales, net: A.net, served: s.served, angry: s.angry, stars: s.stars.slice(), grade: A.grade, repDelta: A.repDelta, tier: st.tier };
    if (st.tv) { st.rep = U.clamp(st.rep + 3, 0, 100); st.tv = false; }
    if (st.cm > 0) { st.cm--; }
    st.day++;
    RP.game.achCheck(A.svc);
    RP.game.save();
    RP.scene.go('morning', { fromResult: true }, { trans: 'noren', dur: 0.9 });
  }

  function draw() {
    if (!A) { return; }
    UI.stripes(t, '#1c1a3c', '#241f48');
    UI.panel(8, 18, 252, 184, { title: R.title });
    T.draw(A.st.day + '日目  ' + A.svc.tier.short + (A.weather === 'rain' ? '  雨' : ''), 16, 30, 'cyan');
    var y = 44, i;
    for (i = 0; i < A.shown; i++) {
      var ln = A.lines[i];
      var lab = ln.label, val = ln.value;
      if (ln.label === R.money && A.done) { val = U.yen(Math.round(A.moneyShown), true); }
      var rowH = ln.big ? 15 : 12;
      if (ln.big) { G.rect(14, y - 1, 240, 1, '#4a4060'); y += 2; }
      T.draw(lab, 16, y, ln.big ? 'white' : 'cream', { size: 12 });
      T.draw(val, 254, y, ln.col, { align: 'r', bold: ln.big, shadow: 'ink' });
      y += rowH;
    }
    // 右：店主・評価
    var look = RP.OWNER_LOOK;
    var cv = RP.cust.canvas(look, A.done ? (A.bankrupt ? 'sour' : (A.grade === 'D' || A.grade === 'C' ? 'sour' : 'happy')) : 'normal', 0);
    G.ctx.drawImage(cv, 292, 130, 44, 60);
    G.rect(268, 196 - 0, 108, 1, 'ink');
    // 評価スタンプ
    if (A.stamped) {
      var k = Math.min(1, (t - A.doneT - 0.6) / 0.2);
      var sc = 1 + (1 - k) * 1.2;
      var col = A.grade === 'S' ? 'yellow' : (A.grade === 'A' ? 'lime' : (A.grade === 'B' ? 'cyan' : (A.grade === 'C' ? 'orange' : 'red')));
      G.rect(284, 22, 70, 48, 'ink'); G.rect(285, 23, 68, 46, '#2a2438');
      T.draw(R.grade, 319, 25, 'cream', { align: 'c' });
      T.draw(A.grade, 319, 36 + (1 - k) * -4, col, { align: 'c', size: Math.round(26 * Math.min(1.4, sc)), outline: 'ink', bold: true });
    } else {
      G.rect(284, 22, 70, 48, 'ink'); G.rect(285, 23, 68, 46, '#2a2438');
      T.draw(R.grade, 319, 25, 'cream', { align: 'c' });
      T.draw('？', 319, 40, 'gray', { align: 'c', size: 24 });
    }
    // 吹き出し
    if (A.done) {
      var lines = T.wrap(A.comment, 104);
      var bh = lines.length * 14 + 8;
      var by = 126 - bh;
      G.rrect(266, by, 112, bh, 'ink'); G.rrect(267, by + 1, 110, bh - 2, 'white');
      G.rect(310, by + bh, 4, 3, 'ink'); G.rect(311, by + bh - 1, 2, 3, 'white');
      lines.forEach(function (l, j) { T.draw(l, 271, by + 4 + j * 14, 'ink'); });
      if (A.stamped && Math.floor(t * 2) % 2 === 0) {
        UI.softkeys('', A.bankrupt ? R.nextBad : R.nextOk, R.tapNext, { noInput: true });
      } else { UI.softkeys('', '', '', { noInput: true }); }
    } else {
      UI.softkeys('', '', R.tapSkip, { noInput: true, centerCol: 'gray' });
    }
  }

  RP.scene.register('result', { enter: enter, update: update, draw: draw });
})(window.RP);
