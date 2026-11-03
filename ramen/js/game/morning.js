/* 朝の仕込み（拠点メニュー）。営業開始・ショップ・出店移転・きろく・せってい。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, T = RP.text, UI = RP.ui, I = RP.input, U = RP.util, FX = RP.fx;
  var W = RP.W, H = RP.H;

  var bgCache = {};
  // 朝の背景（ティアごとにキャッシュ）
  RP.morningBg = function (tierId) {
    var st = RP.game.state, d = RP.game.derive(st);
    var key = tierId + ':' + JSON.stringify(st.items);
    if (!bgCache.cur || bgCache.key !== key) {
      bgCache.cur = RP.bg.create(RP.TIERS[tierId - 1], d, st.seed + 77);
      bgCache.key = key;
    }
    return bgCache.cur;
  };

  var menu = null, t = 0, dlg = new UI.Dialog(), derived = null;
  var M = RP.TEXT.morning;

  function items() {
    var st = RP.game.state;
    return [
      { id: 'open', label: RP.TEXT.morning.menu.open },
      { id: 'shop', label: RP.TEXT.morning.menu.shop },
      { id: 'move', label: RP.TEXT.morning.menu.move },
      { id: 'records', label: RP.TEXT.morning.menu.records },
      ].concat(st.flags.ending ? [{ id: 'ending', label: RP.TEXT.morning.menu.ending }] : []).concat([
      { id: 'settings', label: RP.TEXT.morning.menu.settings },
      { id: 'title', label: RP.TEXT.morning.menu.title }
    ]);
  }

  function enter(args) {
    var st = RP.game.state;
    t = 0;
    derived = RP.game.derive(st);
    menu = new UI.Menu(items(), {
      x: 12, y: 108, w: 188, rowH: 15, rows: 6,
      onSelect: function (it) { choose(it.id); }
    });
    RP.music.play('morning', { fade: 0.8 });
    RP.audio.ambience({ city: 0.25, chime: derived.decor.chime ? 0.8 : 0, wind: 0.1 });
    FX.reset();
    if (args && args.fromResult) {
      UI.se('dayEnd');
      FX.confetti(W / 2, 20, 20, { w: 100 });
    }
    // 起動直後でも状態が壊れていたら安全に
    if (!st.last) { st.last = null; }
  }

  function choose(id) {
    var st = RP.game.state;
    switch (id) {
      case 'open': RP.scene.go('service', {}, { trans: 'noren', dur: 0.8 }); break;
      case 'shop': RP.scene.go('shop', {}, { trans: 'fade', dur: 0.3 }); break;
      case 'move': RP.scene.go('move', {}, { trans: 'fade', dur: 0.3 }); break;
      case 'records': RP.scene.go('records', {}, { trans: 'fade', dur: 0.3 }); break;
      case 'ending': RP.scene.go('ending', { first: false }, { trans: 'white', dur: 1.0 }); break;
      case 'settings': RP.scene.go('settings', { from: 'morning' }, { trans: 'fade', dur: 0.3 }); break;
      case 'title':
        dlg.open({
          title: RP.TEXT.morning.quitTitle, text: RP.TEXT.morning.quitText, width: 220,
          choices: [{ label: RP.TEXT.morning.quitNo, value: 'no' }, { label: RP.TEXT.morning.quitYes, value: 'yes' }], cancelValue: 'no',
          onChoose: function (v) { if (v === 'yes') { RP.scene.go('title', {}, { trans: 'fade' }); } }
        });
        break;
      default: break;
    }
    void st;
  }

  function update(dt) {
    t += dt;
    if (dlg.active) { dlg.update(dt); return; }
    menu.update();
    if (I.pressed('cancel')) { /* 朝の画面では何もしない */ }
  }

  function draw() {
    var st = RP.game.state;
    var bg = RP.morningBg(st.tier);
    RP.bg.draw(bg, -1, false, 1 / 60);
    // 暖簾（昼は畳まれている想定で、手前の台だけ描く）
    G.rect(0, 92, W, 124, '#2a1e1a');
    G.rect(0, 92, W, 4, 'woodL'); G.rect(0, 96, W, 2, 'woodD');
    // HUD
    G.rect(0, 0, W, 14, 'ink'); G.rect(0, 13, W, 1, '#4a4060');
    T.draw(M.dayTitle(st.day), 4, 1, 'cream');
    T.draw(RP.TIERS[st.tier - 1].short, 78, 1, 'cyan');
    T.draw(U.yen(st.money, true), W - 4, 1, 'yellow', { align: 'r' });
    var rs = RP.game.stars(st.rep);
    for (var i = 0; i < 5; i++) { G.sprite('ic_star', 232 + i * 9, 2, { pal: i < rs ? null : { y: '#4a4060' } }); }

    // 左：メニュー
    UI.panel(6, 100, 200, 102, { title: M.title });
    menu.draw();

    // 右：情報
    UI.panel(212, 100, 168, 102, { title: st.flags.ending ? '★' + RP.titleOf(st) : M.plan });
    var w = RP.game.weatherFor(st.day);
    T.draw(M.weather, 220, 110, 'silver');
    T.draw(w === 'rain' ? M.rain : M.clear, 304, 110, w === 'rain' ? 'cyan' : 'orange');
    var tier = RP.TIERS[st.tier - 1];
    T.draw(M.seats, 220, 124, 'silver'); T.draw(M.seatUnit(tier.seats), 304, 124, 'white');
    T.draw(M.fixed, 220, 138, 'silver'); T.draw(U.yen(derived.rent + derived.upkeep + derived.wage) + M.perDay, 304, 138, 'white');
    if (st.last) {
      T.draw(M.last, 220, 152, 'silver');
      T.draw((st.last.net >= 0 ? '+' : '-') + U.yen(Math.abs(st.last.net), true), 304, 152, st.last.net >= 0 ? 'lime' : 'red');
      T.draw(M.grade(st.last.grade), 220, 166, 'yellow'); T.draw(M.served(st.last.served), 304, 166, 'white');
    } else {
      T.draw(M.first, 220, 152, 'yellow');
    }
    var fixed = derived.rent + derived.upkeep + derived.wage;
    if (st.money < fixed) { if (Math.floor(t * 2) % 2) { T.draw(M.warn, 220, 180, 'red'); } }
    else if (st.tv) { T.draw(M.tv, 220, 180, 'pink'); }
    else if (st.cm > 0) { T.draw(M.cm(st.cm), 220, 180, 'pink'); }
    UI.softkeys('', '', M.soft, { noInput: true, centerCol: 'silver' });
  }
  function drawTop() { if (dlg.active) { dlg.draw(); } }

  RP.scene.register('morning', { enter: enter, update: update, draw: draw, drawTop: drawTop });
})(window.RP);
