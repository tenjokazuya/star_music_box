/* ガレージ（テツ）: パーツ装着 / 修理 / 洗車 / 塗装 / 乗り換え */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, UI = RR.UI, D = RR.Data;
  var G = RR.Garage = {};
  var WASH = 500;

  function carPanel(g, car) {
    UI.win(g, 2, 2, 150, 62);
    RR.Sprites.blit(g, RR.Sprites.carSpin(car.model, car.color, car.dirt, 66, 44, (RR.Game.frame / 5) | 0), 6, 8);
    F.draw(g, D.cars[car.model].name, 78, 10, '#f8e060');
    F.draw(g, 'LV ' + D.rating(car), 78, 22, '#f8f8f8');
    F.draw(g, 'よごれ ' + Math.round(car.dirt || 0) + '%', 78, 34, '#a8b0d0');
    var worst = 100;
    D.SLOTS.forEach(function (s) { var p = D.partInstance(car.parts[s]); if (p && D.parts[p.id].degrade > 0) worst = Math.min(worst, p.dur); });
    F.draw(g, 'いちばん いたんだ', 78, 46, '#a8b0d0');
    RR.Menu.durBar(g, 10, 50, 60, worst);
  }
  G.carPanel = carPanel;

  G.open = function () {
    var items = [
      { label: 'パーツを つける', desc: 'よびの パーツと つけかえる。LVの かわりかたも みられる' },
      { label: 'しゅうり', desc: 'いたんだ パーツを なおす。いたみが おおきいほど たかい' },
      { label: 'せんしゃ', desc: '¥' + WASH + '。くるまが ピカピカに なる (せいのうは かわらない)' },
      { label: 'ぬりかえ', desc: '¥' + U.money(D.PAINT_PRICE) + '。ボディの いろを かえる' },
      { label: 'くるまを えらぶ', desc: 'もっている くるまから のる くるまを えらぶ' },
      { label: 'やめる', desc: '' }
    ];
    var loop = function (sel) {
      var car = D.currentCar();
      return UI.menu({
        items: items, x: 154, y: 2, w: 84, sel: sel,
        drawExtra: function (g, m) { carPanel(g, car); UI.moneyBox(g, 2, 66); if (items[m.sel].desc) UI.descBox(g, items[m.sel].desc); }
      }).then(function (i) {
        if (i < 0 || i === 5) return;
        var p = [equip, repair, wash, paint, choose][i](car);
        return Promise.resolve(p).then(function () { return loop(i); });
      });
    };
    return loop(0);
  };

  function equip(car) {
    var slots = D.SLOTS.map(function (s) {
      var inst = D.partInstance(car.parts[s]);
      var spare = D.spareParts(s).length;
      return { label: D.SLOT_NAMES[s], right: (inst ? D.parts[inst.id].name : '') + (spare ? ' +' + spare : ''), slot: s };
    });
    return UI.menu({ title: 'どこを かえる?', items: slots, x: 8, y: 4, w: 224, rows: 8 }).then(function (i) {
      if (i < 0) return;
      var slot = slots[i].slot;
      var cur = D.partInstance(car.parts[slot]);
      var list = [cur].concat(D.spareParts(slot)).filter(Boolean);
      var base = D.rating(car);
      var items = list.map(function (p, k) {
        var map = D.carPartMap(car);
        map[slot] = { id: p.id, dur: p.dur };
        var r = D.ratingOfSpec(D.buildSpec(map));
        return { label: (k === 0 ? '★' : '') + D.parts[p.id].name, right: Math.round(p.dur) + '%  LV' + r, inst: p, r: r };
      });
      if (items.length === 1) return UI.say('テツ', 'その ばしょの よびの パーツが ないな。|パーツ ショップで かってくると いい。');
      return UI.menu({
        title: D.SLOT_NAMES[slot] + ' (★=いま)', items: items, x: 8, y: 4, w: 224, rows: Math.min(6, items.length),
        drawExtra: function (g, m) {
          var it = items[m.sel];
          var d = it.r - base;
          UI.descBox(g, D.parts[it.inst.id].desc + '  LV ' + base + '→' + it.r + (d ? (d > 0 ? ' (+' + d + ')' : ' (' + d + ')') : ''));
        }
      }).then(function (k) {
        if (k <= 0) return;
        D.equip(car, items[k].inst.uid);
        RR.Audio.sfx('ratchet');
        return RR.wait(8).then(function () { RR.Audio.sfx('ratchet'); return RR.wait(8); }).then(function () {
          RR.Audio.sfx('correct');
          return UI.say('テツ', U.pick(['よし、つけといたぞ。', 'できた。ためして みな。', 'ばっちりだ。']));
        });
      });
    });
  }

  function repair(car) {
    var parts = D.SLOTS.map(function (s) { return D.partInstance(car.parts[s]); }).filter(function (p) { return p && D.parts[p.id].degrade > 0; });
    var total = 0;
    var items = parts.map(function (p) {
      var c = D.repairCost(p); total += p.dur < 100 ? c : 0;
      return { label: D.parts[p.id].name, right: (p.dur >= 100 ? 'OK' : '¥' + U.money(c)) + ' ' + Math.round(p.dur) + '%', inst: p, cost: c, disabled: p.dur >= 100 };
    });
    items.unshift({ label: 'ぜんぶ なおす', right: '¥' + U.money(total), all: true, disabled: total === 0 });
    return UI.menu({
      title: 'しゅうり', items: items, x: 8, y: 4, w: 224, rows: 8,
      drawExtra: function (g, m) {
        UI.moneyBox(g, null, 128);
        var it = items[m.sel];
        if (it.inst) RR.Menu.durBar(g, 12, 140, 100, it.inst.dur);
      }
    }).then(function (i) {
      if (i < 0) return;
      var it = items[i];
      var cost = it.all ? total : it.cost;
      if (RR.State.S.money < cost) { RR.Audio.sfx('error'); return UI.say('テツ', 'おかねが たりないな。|バイトか レースで かせいで きな。'); }
      RR.State.addMoney(-cost);
      RR.Audio.sfx('register');
      (it.all ? parts : [it.inst]).forEach(function (p) { p.dur = 100; });
      RR.Audio.sfx('ratchet');
      return RR.wait(12).then(function () { RR.Audio.sfx('correct'); return UI.say('テツ', it.all ? 'ぜんぶ みて おいたぞ。しんぴんどうよう だ。' : 'なおしたぞ。'); });
    });
  }

  function wash(car) {
    if ((car.dirt || 0) < 3) return UI.say('テツ', 'もう ピカピカだぞ。');
    if (RR.State.S.money < WASH) { RR.Audio.sfx('error'); return UI.say('テツ', 'せんしゃ だいも ないのか...'); }
    RR.State.addMoney(-WASH);
    RR.Audio.sfx('wash');
    var t = 0, before = car.dirt;
    return UI.custom({
      update: function () {
        t++;
        car.dirt = Math.max(0, before * (1 - t / 90));
        if (t % 12 === 0) RR.Audio.sfx('scrub');
        if (t > 100) { car.dirt = 0; RR.State.S.stats.washes = (RR.State.S.stats.washes || 0) + 1; this.close(); }
      },
      draw: function (g) {
        carPanel(g, car);
        for (var i = 0; i < 14; i++) {
          var x = 10 + ((i * 37 + t * 2) % 60), y = 12 + ((i * 23 + t) % 30);
          g.fillStyle = (i + t >> 2) & 1 ? '#f8f8f8' : '#a8d8f8';
          g.fillRect(x, y, 2, 2);
        }
      }
    }).then(function () { RR.Audio.sfx('get'); return UI.say('テツ', 'ピカピカに なったな。|じいさんも よろこぶ だろう。'); });
  }

  function paint(car) {
    var items = D.paints.map(function (c) {
      return {
        label: RR.Sprites.PAINT_NAMES[c], right: c === car.color ? 'いま' : '', color: c === car.color ? '#a0a8c0' : null, c: c,
        icon: function (g, x, y) { var r = RR.Pal.ramp(RR.Sprites.PAINT[c]); g.fillStyle = '#000'; g.fillRect(x - 1, y, 10, 9); g.fillStyle = r.base; g.fillRect(x, y + 1, 8, 7); g.fillStyle = r.hi; g.fillRect(x, y + 1, 8, 2); }
      };
    });
    return UI.menu({
      title: 'なにいろに する? ¥' + U.money(D.PAINT_PRICE), items: items, x: 8, y: 4, w: 130, rows: 8,
      drawExtra: function (g, m) {
        var c = items[m.sel].c;
        UI.win(g, 140, 4, 98, 40);
        RR.Sprites.blit(g, RR.Sprites.carSpin(car.model, c, 0, 90, 34, (RR.Game.frame / 5) | 0), 144, 8);
      }
    }).then(function (i) {
      if (i < 0 || items[i].c === car.color) return;
      if (RR.State.S.money < D.PAINT_PRICE) { RR.Audio.sfx('error'); return UI.say('テツ', 'ぬりかえは ¥' + U.money(D.PAINT_PRICE) + ' だ。'); }
      RR.State.addMoney(-D.PAINT_PRICE);
      RR.Audio.sfx('register');
      car.color = items[i].c;
      RR.Audio.sfx('wash');
      return RR.wait(30).then(function () { RR.Audio.sfx('get'); return UI.say('テツ', 'いい いろに なったじゃないか。'); });
    });
  }

  function choose() {
    var S = RR.State.S;
    if (S.cars.length < 2) return UI.say('テツ', 'いまは この いちだい だけだ。|ちゅうこしゃやで かいかえも できるぞ。');
    var items = S.cars.map(function (c) { return { label: D.cars[c.model].name + ' ' + (RR.Sprites.PAINT_NAMES[c.color] || ''), right: 'LV ' + D.rating(c) + (c.uid === S.carUid ? ' ★' : ''), car: c }; });
    return UI.menu({
      title: 'のる くるまを えらぶ', items: items, x: 8, y: 4, w: 224, rows: 6,
      drawExtra: function (g, m) { UI.win(g, 70, 108, 100, 40); RR.Sprites.blit(g, RR.Sprites.carSide(items[m.sel].car.model, items[m.sel].car.color, items[m.sel].car.dirt), 88, 114); }
    }).then(function (i) {
      if (i < 0) return;
      S.carUid = items[i].car.uid;
      RR.Audio.sfx('starter');
      return UI.say('テツ', 'きょうは そいつで いくのか。');
    });
  }
})();
