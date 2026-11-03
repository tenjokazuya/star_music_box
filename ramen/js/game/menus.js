/* きろく・せってい の画面。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx;
  var W = RP.W, H = RP.H;

  var TITLES = [
    { tier: 1, name: '屋台の一番星' }, { tier: 2, name: '商店街の顔' }, { tier: 3, name: '駅前の名店主' },
    { tier: 4, name: '繁華街の人気者' }, { tier: 5, name: '大都会の覇者' }, { tier: 6, name: '天下一のラーメン王' }
  ];
  RP.titleOf = function (st) {
    var name = TITLES[0].name;
    TITLES.forEach(function (t) { if (st.tier >= t.tier) { name = t.name; } });
    var en = st.stats.endless || {};
    if (en.e_space > 0) { name = '宇宙ラーメンの開祖'; }
    else if (en.e_world >= 3) { name = '世界のラーメン王'; }
    return name;
  };

  // ================= きろく =================
  var rt = 0, rpage = 0;
  var RR = RP.TEXT.records, SS = RP.TEXT.settings;
  RP.scene.register('records', {
    enter: function () { rt = 0; rpage = 0; RP.music.play('shop', { fade: 0.5 }); FX.reset(); },
    update: function (dt) {
      rt += dt;
      if (I.nav('left') || I.nav('right') || I.pressed('ok')) { rpage = 1 - rpage; UI.se('tab'); }
      var tp = I.tapIn(0, 14, W, H - 30);
      if (tp) { rpage = 1 - rpage; UI.se('tab'); }
      if (I.tapIn(0, H - 14, 110, 14) || I.pressed('cancel')) {
        UI.se('cancel'); RP.scene.go('morning', {}, { trans: 'fade', dur: 0.3 });
      }
    },
    draw: function () {
      var st = RP.game.state, s = st.stats;
      UI.stripes(rt, '#1c1a3c', '#221e44');
      G.rect(0, 0, W, 14, 'ink'); G.rect(0, 13, W, 1, '#4a4060');
      T.draw(RR.title + '  ' + (rpage + 1) + '/2', 4, 1, 'yellow');
      var ach = st.flags.ach || {}, got = RP.ACH.filter(function (a) { return ach[a.id]; }).length;
      if (rpage === 0) {
        UI.panel(8, 24, 368, 172, { title: RP.titleOf(st) });
        var rows = [
          [RR.rows.days, s.days + '日'],
          [RR.rows.tier, RP.TIERS[st.tier - 1].short],
          [RR.rows.rep, '★' + RP.game.stars(st.rep) + '  (' + Math.floor(st.rep) + ')'],
          [RR.rows.sales, U.yen(s.sales, true)],
          [RR.rows.served, U.comma(s.served) + '杯'],
          [RR.rows.perfect, U.comma(s.perfect) + '回'],
          [RR.rows.angry, U.comma(s.angry) + '人'],
          [RR.rows.combo, s.bestCombo + '連'],
          [RR.rows.spent, U.yen(s.spent, true)],
          [RR.rows.maxMoney, U.yen(s.maxMoney, true)],
          [RR.rows.donate, (s.endless && s.endless.e_donate || 0) + '回'],
          [RR.rows.world, (s.endless && s.endless.e_world || 0) + ' / ' + (s.endless && s.endless.e_space || 0)],
          [RR.rows.bankrupt, s.bankrupt + '回'],
          [RR.rows.play, Math.floor((Date.now() - (s.startedAt || Date.now())) / 60000) + '分(目安)']
        ];
        rows.forEach(function (r, i) {
          var col = i < 7 ? 0 : 1, row = i < 7 ? i : i - 7;
          var x = col === 0 ? 18 : 198;
          T.draw(r[0], x, 36 + row * 16, 'silver');
          T.draw(r[1], x + 168, 36 + row * 16, 'white', { align: 'r' });
        });
        T.draw(RR.foot, W / 2, 176, 'cream', { align: 'c', size: 12 });
      } else {
        UI.panel(8, 24, 368, 172, { title: RR.achTitle(got, RP.ACH.length) });
        RP.ACH.forEach(function (a, i) {
          var col = Math.floor(i / 8), row = i % 8;
          var x = 14 + col * 120, y = 34 + row * 15;
          var ok = !!ach[a.id];
          G.sprite(ok ? 'ic_ok' : 'ic_x', x, y + 1, ok ? null : { alpha: 0.35 });
          T.draw(ok ? a.name : '？？？？？', x + 12, y, ok ? 'yellow' : 'gray');
        });
        // 直近に解除した実績の説明
        var last = null;
        RP.ACH.forEach(function (a) { if (ach[a.id] && (!last || ach[a.id] >= ach[last.id])) { last = a; } });
        if (last) { T.draw(RR.recent(last.desc), W / 2, 164, 'cream', { align: 'c', size: 12 }); }
      }
      UI.softkeys(RP.TEXT.shop.back, '', RR.soft, { noInput: true, centerCol: 'silver' });
    }
  });

  // ================= せってい =================
  var sm = { idx: 0, t: 0, from: 'morning', rows: [] };
  var BGM_NAMES = SS.bgmNames;

  function buildRows() {
    var S = RP.game.settings, rows = [];
    rows.push({ id: 'master', label: SS.master, kind: 'vol' });
    rows.push({ id: 'bgm', label: SS.bgm, kind: 'vol' });
    rows.push({ id: 'sfx', label: SS.sfx, kind: 'vol' });
    rows.push({ id: 'amb', label: SS.amb, kind: 'vol' });
    rows.push({ id: 'mute', label: SS.mute, kind: 'toggle' });
    if (RP.game.state && sm.from === 'morning') {
      var d = RP.game.derive(RP.game.state);
      rows.push({ id: 'bgmPick', label: SS.bgmPick, kind: 'choice', opts: ['auto'].concat(d.bgms) });
    }
    rows.push({ id: 'back', label: SS.back, kind: 'button' });
    void S;
    return rows;
  }

  function rowRect(i) { return { x: 20, y: 30 + i * 22, w: 344, h: 20 }; }
  function sliderRect(i) { var r = rowRect(i); return { x: r.x + 140, y: r.y + 4, w: 150, h: 12 }; }

  function change(row, dir) {
    var S = RP.game.settings;
    if (row.kind === 'vol') {
      S[row.id] = U.clamp(Math.round((S[row.id] + dir * 0.1) * 10) / 10, 0, 1);
      RP.game.applySettings(); RP.game.saveSettings();
      UI.se('cursor');
    } else if (row.kind === 'toggle') {
      S.mute = !S.mute; RP.game.applySettings(); RP.game.saveSettings(); UI.se('ok');
    } else if (row.kind === 'choice') {
      var st = RP.game.state, cur = row.opts.indexOf(st.bgmPick || 'auto');
      if (cur < 0) { cur = 0; }
      st.bgmPick = row.opts[(cur + dir + row.opts.length) % row.opts.length];
      UI.se('tab');
      RP.game.save();
    }
  }

  RP.scene.register('settings', {
    enter: function (args) {
      sm.from = (args && args.from) || 'morning'; sm.idx = 0; sm.t = 0; sm.rows = buildRows();
      FX.reset();
      if (!RP.music.current()) { RP.music.play(sm.from === 'title' ? 'title' : 'shop', { fade: 0.5 }); }
    },
    update: function (dt) {
      sm.t += dt;
      var n = sm.rows.length, row = sm.rows[sm.idx];
      if (I.nav('up')) { sm.idx = (sm.idx + n - 1) % n; UI.se('cursor'); }
      if (I.nav('down')) { sm.idx = (sm.idx + 1) % n; UI.se('cursor'); }
      if (I.nav('left')) { change(row, -1); }
      if (I.nav('right')) { change(row, 1); }
      if (I.pressed('ok')) {
        if (row.kind === 'button') { back(); return; }
        if (row.kind === 'toggle') { change(row, 1); }
        if (row.kind === 'choice') { change(row, 1); }
      }
      if (I.pressed('cancel') || I.tapIn(0, H - 14, 110, 14)) { UI.se('cancel'); back(); return; }
      // ポインタ操作
      for (var i = 0; i < sm.rows.length; i++) {
        var r = rowRect(i), rr = sm.rows[i], sl = sliderRect(i);
        if (rr.kind === 'vol') {
          var dp = I.isDownIn(sl.x - 6, sl.y - 4, sl.w + 12, sl.h + 8);
          if (dp) {
            var v = Math.round(U.clamp((dp.x - sl.x) / sl.w, 0, 1) * 10) / 10;
            if (v !== RP.game.settings[rr.id]) { RP.game.settings[rr.id] = v; RP.game.applySettings(); UI.se('cursor'); RP.game.saveSettings(); }
            sm.idx = i;
          }
        }
        var tap = I.tapIn(r.x, r.y, r.w, r.h);
        if (tap) {
          sm.idx = i; UI.se('select');
          if (rr.kind === 'button') { back(); return; }
          if (rr.kind === 'toggle' || rr.kind === 'choice') { change(rr, 1); }
          if (rr.kind === 'vol' && tap.x < sl.x - 6) { /* ラベル部分は選択のみ */ }
        }
      }
    },
    draw: function () {
      UI.stripes(sm.t, '#1c1a3c', '#221e44');
      G.rect(0, 0, W, 14, 'ink'); G.rect(0, 13, W, 1, '#4a4060');
      T.draw(SS.title, 4, 1, 'yellow');
      var S = RP.game.settings;
      sm.rows.forEach(function (row, i) {
        var r = rowRect(i), sel = i === sm.idx;
        if (sel) { G.rect(r.x, r.y, r.w, r.h, 'maroon'); G.rect(r.x, r.y, r.w, 1, 'red'); UI.cursor(r.x + 3, r.y + 6); }
        T.draw(row.label, r.x + 14, r.y + 4, 'white', { shadow: sel ? 'ink' : null });
        var sl = sliderRect(i);
        if (row.kind === 'vol') {
          G.rect(sl.x - 1, sl.y - 1, sl.w + 2, sl.h + 2, 'ink'); G.rect(sl.x, sl.y, sl.w, sl.h, '#2e2640');
          G.rect(sl.x, sl.y, Math.round(sl.w * S[row.id]), sl.h, S.mute ? 'gray' : 'lime');
          for (var k = 1; k < 10; k++) { G.rect(sl.x + Math.round(sl.w * k / 10), sl.y, 1, sl.h, 'ink'); }
          T.draw(Math.round(S[row.id] * 100) + '%', sl.x + sl.w + 8, r.y + 4, 'yellow');
        } else if (row.kind === 'toggle') {
          T.draw(S.mute ? SS.muteOn : SS.muteOff, sl.x, r.y + 4, S.mute ? 'red' : 'cyan');
        } else if (row.kind === 'choice') {
          var cur = RP.game.state.bgmPick || 'auto';
          T.draw('◀ ' + (BGM_NAMES[cur] || cur) + ' ▶', sl.x, r.y + 4, 'cyan');
        }
      });
      T.draw(SS.hint, W / 2, 190, 'silver', { align: 'c', size: 10 });
      UI.softkeys(RP.TEXT.shop.back, '', '', { noInput: true });
    }
  });

  function back() {
    RP.game.saveSettings();
    RP.scene.go(sm.from === 'title' ? 'title' : 'morning', {}, { trans: 'fade', dur: 0.3 });
  }
})(window.RP);
