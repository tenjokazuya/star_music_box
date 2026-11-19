/* フィールドのスタートメニュー: くるま / パーツ / きろく / セーブ / せってい */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input, UI = RR.UI, D = RR.Data;
  var Menu = RR.Menu = {};

  // 耐久度バー
  Menu.durBar = function (g, x, y, w, dur) {
    g.fillStyle = '#181c30'; g.fillRect(x, y, w, 4);
    var col = dur > 70 ? '#48d058' : dur > 40 ? '#e0c840' : dur > 15 ? '#e88830' : '#e83828';
    g.fillStyle = col; g.fillRect(x, y, Math.round(w * dur / 100), 4);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x, y, Math.round(w * dur / 100), 1);
  };

  Menu.open = function (E) {
    var atHome = RR.Field.map && RR.Field.map.id === 'home';
    var items = [{ label: 'くるま', k: 'car' }, { label: 'パーツ', k: 'parts' }, { label: 'きろく', k: 'rec' }];
    if (atHome) items.push({ label: 'もようがえ', k: 'deco' });
    items.push({ label: 'セーブ', k: 'save' }, { label: 'せってい', k: 'set' }, { label: 'とじる', k: 'close' });
    var loop = function (sel) {
      return UI.menu({
        items: items, x: 160, y: 4, w: 76, sel: sel,
        drawExtra: function (g) {
          var S = RR.State.S;
          UI.moneyBox(g, 160, items.length * 13 + 16);
          var y = items.length * 13 + 34;
          UI.win(g, 160, y, 76, 30);
          F.draw(g, S.name, 166, y + 4, '#f8e060');
          F.draw(g, RR.CHAPTERS[Math.min(5, S.stage)], 166, y + 16, '#c8d0f0');
          if (S.flags.goal) {
            UI.win(g, 2, 128, 154, 30, 'dark');
            F.draw(g, 'もくてき', 8, 131, '#f8e060');
            F.draw(g, S.flags.goal, 8, 143, '#f8f8f8');
          }
        }
      }).then(function (i) {
        var k = i < 0 ? 'close' : items[i].k;
        if (k === 'close') { RR.Audio.sfx('close'); return; }
        var p;
        if (k === 'car') p = Menu.carStatus();
        else if (k === 'parts') p = Menu.spareParts();
        else if (k === 'rec') p = Menu.records();
        else if (k === 'deco') return RR.Decorate.open();
        else if (k === 'save') p = UI.ask('', 'いまの ところまで きろく しますか?', ['はい', 'いいえ']).then(function (a) {
          if (a === 0) { var ok = RR.State.save(); RR.Audio.sfx('save'); return UI.msg(ok ? '{N}は きろく した!' : 'きろく できません でした。'); }
        });
        else if (k === 'set') p = RR.Settings.menu();
        return Promise.resolve(p).then(function () { return loop(i); });
      });
    };
    return loop(0);
  };

  // ---------- 愛車の状態 ----------
  Menu.carStatus = function () {
    var car = D.currentCar();
    return UI.custom({
      update: function () { if (In.pressed('a') || In.pressed('b')) { RR.Audio.sfx('cancel'); this.close(); } },
      draw: function (g) { Menu.drawCar(g, car); }
    });
  };
  Menu.drawCar = function (g, car, opt) {
    opt = opt || {};
    UI.win(g, 2, 2, 236, 156);
    var side = RR.Sprites.carSide(car.model, car.color, car.dirt);
    g.save(); g.imageSmoothingEnabled = false;
    g.drawImage(side, 10, 8, side.width * 1.5, side.height * 1.5);
    g.restore();
    F.draw(g, D.cars[car.model].name, 120, 10, '#f8e060');
    F.draw(g, RR.Sprites.PAINT_NAMES[car.color] || '', 120, 22, '#c8d0f0');
    F.draw(g, 'せいのう LV ' + D.rating(car), 120, 34, '#f8f8f8');
    F.draw(g, 'よごれ ' + Math.round(car.dirt || 0) + '%', 190, 22, car.dirt > 60 ? '#c8a070' : '#a0a8c0');
    var y = 54;
    D.SLOTS.forEach(function (slot) {
      var inst = D.partInstance(car.parts[slot]);
      var def = inst ? D.parts[inst.id] : D.parts[D.stockParts[slot]];
      F.draw(g, D.SLOT_NAMES[slot], 10, y, '#a8b0d0');
      F.draw(g, def.name, 82, y, '#f8f8f8');
      if (inst && def.degrade > 0) {
        Menu.durBar(g, 186, y + 3, 30, inst.dur);
        F.draw(g, Math.round(inst.dur) + '', 232, y, '#c8d0f0', { align: 'right' });
      }
      y += 12;
    });
  };

  // ---------- 予備パーツ ----------
  Menu.spareParts = function () {
    var S = RR.State.S;
    var list = S.parts.filter(function (p) { return !p.on; });
    if (!list.length) return UI.msg('よびの パーツは もっていない。');
    var items = list.map(function (p) {
      var def = D.parts[p.id];
      return { label: def.name, right: Math.round(p.dur) + '%', desc: D.SLOT_NAMES[def.slot] + ': ' + def.desc };
    });
    return UI.menu({
      title: 'よびの パーツ', items: items, x: 8, y: 4, w: 224, rows: 7,
      drawExtra: function (g, m) { UI.descBox(g, items[m.sel].desc); }
    });
  };

  // ---------- 記録 ----------
  Menu.records = function () {
    var S = RR.State.S;
    var page = 0;
    return UI.custom({
      update: function () {
        if (In.pressed('left') || In.pressed('right')) { page = 1 - page; RR.Audio.sfx('cursor'); }
        if (In.pressed('a') || In.pressed('b')) { RR.Audio.sfx('cancel'); this.close(); }
      },
      draw: function (g) {
        UI.win(g, 2, 2, 236, 156);
        F.draw(g, page === 0 ? 'きろく  ◀ 1/2 ▶' : 'ベスト タイム  ◀ 2/2 ▶', 10, 8, '#f8e060');
        var y = 24;
        function row(a, b, c) { F.draw(g, a, 12, y, '#a8b0d0'); F.draw(g, b, 228, y, c || '#f8f8f8', { align: 'right' }); y += 12; }
        if (page === 0) {
          row('プレイじかん', RR.State.playtimeText(S.playtime));
          row('レース', S.stats.races + ' せん ' + S.stats.wins + ' しょう');
          row('かせいだ おかね', '¥' + U.money(S.stats.earned));
          row('バイト', ((S.stats.jobs.wash || 0) + (S.stats.jobs.nut || 0) + (S.stats.jobs.ramen || 0)) + ' かい');
          var beaten = ['kenta', 'saki', 'gou', 'shinobu', 'kurosawa', 'hayami'].filter(function (k) { return S.records[k] && S.records[k].w > 0; });
          row('たおした かしら', beaten.length ? beaten.map(function (k) { return D.rivals[k].name; }).join(' ') : '-');
          var tro = Object.keys(S.furniture.owned).filter(function (k) { return /^trophy/.test(k); }).length;
          row('トロフィー', tro + ' こ');
        } else {
          Object.keys(D.courses).forEach(function (id) {
            if (id === 'kyudo' && !S.cleared) return;
            row(D.courses[id].name, U.time(S.best[id]));
          });
        }
      }
    });
  };
})();
