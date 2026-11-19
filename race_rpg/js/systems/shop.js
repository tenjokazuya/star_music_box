/* ショップ: パーツ（売買）/ ざっか（家具）/ 飲食 / 中古車 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, UI = RR.UI, D = RR.Data;
  var Shop = RR.Shop = {};
  function S() { return RR.State.S; }

  // 進行度で品ぞろえが増える
  function available(p) {
    var st = S().stage;
    if (p.rank === 0) return true;
    if (p.rank === 1) return st >= 2;
    return st >= 3;
  }
  Shop.available = available;

  Shop.open = function (id) {
    if (id === 'parts') return partsShop();
    if (id === 'zakka') return zakkaShop();
    return Promise.resolve();
  };

  // ---------- パーツ ----------
  function partsShop() {
    var top = [{ label: 'かう' }, { label: 'うる' }, { label: 'やめる' }];
    var loop = function (sel) {
      return UI.menu({ items: top, x: 160, y: 4, w: 76, sel: sel, drawExtra: function (g) { UI.moneyBox(g, 160, 50); } }).then(function (i) {
        if (i < 0 || i === 2) return UI.say('てんちょう', 'また きてくれよな!');
        return (i === 0 ? buyParts() : sellParts()).then(function () { return loop(i); });
      });
    };
    return UI.say('てんちょう', 'いらっしゃい! パーツの ことなら まかせとけ。').then(function () { return loop(0); });
  }
  function buyParts() {
    var slots = D.SLOTS.map(function (s) { return { label: D.SLOT_NAMES[s], slot: s }; });
    var pick = function (sel) {
      return UI.menu({ title: 'なにを みる?', items: slots, x: 8, y: 4, w: 120, rows: 8, sel: sel, drawExtra: function (g) { UI.moneyBox(g); } }).then(function (i) {
        if (i < 0) return;
        return partList(slots[i].slot).then(function () { return pick(i); });
      });
    };
    return pick(0);
  }
  function partList(slot) {
    var car = D.currentCar();
    var base = D.rating(car);
    var list = Object.keys(D.parts).map(function (k) { return D.parts[k]; }).filter(function (p) { return p.slot === slot && p.shop; });
    var items = list.map(function (p) {
      var ok = available(p);
      var map = D.carPartMap(car); map[slot] = { id: p.id, dur: 100 };
      var r = D.ratingOfSpec(D.buildSpec(map));
      var own = S().parts.filter(function (x) { return x.id === p.id; }).length;
      return { label: ok ? p.name : '? ? ? ? ?', right: ok ? '¥' + U.money(p.price) : '', p: p, r: r, own: own, disabled: !ok };
    });
    var loop = function (sel) {
      return UI.menu({
        title: D.SLOT_NAMES[slot], items: items, x: 8, y: 4, w: 224, rows: 6, sel: sel,
        drawExtra: function (g, m) {
          var it = items[m.sel];
          UI.moneyBox(g, null, 106);
          if (it.disabled) { UI.descBox(g, 'まだ にゅうか して いない。'); return; }
          var d = it.r - base;
          UI.descBox(g, it.p.desc + '  LV' + base + '→' + it.r + (it.own ? '  もっている:' + it.own : ''));
          F.draw(g, (d >= 0 ? '+' : '') + d, 14, 112, d > 0 ? '#78e878' : d < 0 ? '#f87868' : '#a0a8c0');
        }
      }).then(function (i) {
        if (i < 0) return;
        var it = items[i];
        return UI.ask('てんちょう', '{y}' + it.p.name + '{w} は ¥' + U.money(it.p.price) + ' だ。かうかい?', ['かう', 'やめる']).then(function (a) {
          if (a !== 0) return loop(i);
          if (S().money < it.p.price) { RR.Audio.sfx('error'); return UI.say('てんちょう', 'おかねが たりない みたいだな。').then(function () { return loop(i); }); }
          RR.State.addMoney(-it.p.price);
          RR.Audio.sfx('buy');
          D.addPart(it.p.id, 100);
          it.own++;
          return UI.say('てんちょう', 'まいど! テツさんの ところで つけて もらいな。').then(function () { return loop(i); });
        });
      });
    };
    return loop(0);
  }
  function sellParts() {
    var spare = S().parts.filter(function (p) { return !p.on; });
    if (!spare.length) return UI.say('てんちょう', 'うれる パーツは ないみたいだな。');
    var items = spare.map(function (p) { return { label: D.parts[p.id].name, right: '¥' + U.money(D.sellPrice(p)) + ' ' + Math.round(p.dur) + '%', inst: p }; });
    return UI.menu({ title: 'どれを うる?', items: items, x: 8, y: 4, w: 224, rows: 7, drawExtra: function (g) { UI.moneyBox(g, null, 126); } }).then(function (i) {
      if (i < 0) return;
      var p = items[i].inst, price = D.sellPrice(p);
      return UI.ask('てんちょう', '{y}' + D.parts[p.id].name + '{w} なら ¥' + U.money(price) + ' で かいとるよ。', ['うる', 'やめる']).then(function (a) {
        if (a !== 0) return sellParts();
        D.removePart(p.uid);
        RR.State.addMoney(price);
        RR.Audio.sfx('coin');
        return sellParts();
      });
    });
  }

  // ---------- ざっか ----------
  function zakkaShop() {
    var list = D.furnitureShopList.map(function (k) { return D.furniture[k]; });
    var items = list.map(function (f) {
      return { label: f.name, right: '¥' + U.money(f.price), f: f };
    });
    var loop = function (sel) {
      return UI.menu({
        title: 'ざっか', items: items, x: 8, y: 4, w: 150, rows: 7, sel: sel,
        drawExtra: function (g, m) {
          var f = items[m.sel].f;
          UI.win(g, 160, 4, 78, 56, 'paper');
          RR.Props.drawIcon(g, f.prop, f.opts, 199 - (RR.Props.defs[f.prop].size(f.opts)[0] * 8), 28);
          var own = S().furniture.owned[f.id] || 0;
          F.draw(g, 'もっている ' + own, 164, 48, '#382810', { shadow: null });
          UI.moneyBox(g, 160, 62);
          UI.descBox(g, f.desc);
        }
      }).then(function (i) {
        if (i < 0) return UI.say('てんいん', 'また どうぞ。');
        var f = items[i].f;
        return UI.ask('てんいん', '{y}' + f.name + '{w} ですね。¥' + U.money(f.price) + ' です。', ['かう', 'やめる']).then(function (a) {
          if (a !== 0) return loop(i);
          if (S().money < f.price) { RR.Audio.sfx('error'); return UI.say('てんいん', 'すこし たりない ようです...').then(function () { return loop(i); }); }
          RR.State.addMoney(-f.price);
          RR.Audio.sfx('buy');
          D.giveFurniture(f.id, 1);
          return UI.say('てんいん', 'おうちに とどけて おきますね。|いえで もようがえが できますよ。').then(function () { return loop(i); });
        });
      });
    };
    return UI.say('てんいん', 'いらっしゃいませ。へやに おく ものなら いろいろ ありますよ。').then(function () { return loop(0); });
  }

  // ---------- 飲食 ----------
  Shop.food = function (id) {
    var shop = D.foodShops[id];
    var items = shop.items.map(function (it) { return { label: it.name, right: '¥' + U.money(it.price), it: it }; });
    items.push({ label: 'やめる' });
    var pre = shop.greet ? UI.say(shop.clerk, shop.greet) : Promise.resolve();
    var loop = function (sel) {
      return UI.menu({ title: shop.name, items: items, x: 8, y: 4, w: 170, rows: 7, sel: sel, drawExtra: function (g) { UI.moneyBox(g, null, 4); } }).then(function (i) {
        if (i < 0 || !items[i].it) return;
        var it = items[i].it;
        if (S().money < it.price) { RR.Audio.sfx('error'); return UI.msg('おかねが たりない。').then(function () { return loop(i); }); }
        RR.State.addMoney(-it.price);
        RR.Audio.sfx(id === 'vending' ? 'clunk' : 'register');
        var foods = S().stats.foods;
        var n = foods[it.id] || 0;
        foods[it.id] = n + 1;
        var line = it.lines[n % it.lines.length];
        return RR.wait(id === 'vending' ? 20 : 30).then(function () {
          RR.Audio.sfx(it.sfx);
          return RR.wait(24);
        }).then(function () {
          RR.Audio.sfx(it.sfx);
          return UI.say('{N}', line);
        }).then(function () {
          if (shop.thanks) return UI.say(shop.clerk, shop.thanks);
        }).then(function () { return loop(i); });
      });
    };
    return pre.then(function () { return loop(0); });
  };

  // ---------- 中古車 ----------
  Shop.dealer = function () {
    var owned = {};
    S().cars.forEach(function (c) { owned[c.model] = true; });
    var list = D.carOrder.filter(function (m) { return m !== 'comet'; });
    var items = list.map(function (m) { return { label: D.cars[m].name, right: owned[m] ? 'もっている' : '¥' + U.money(D.cars[m].price), m: m, disabled: !!owned[m] }; });
    var loop = function (sel) {
      return UI.menu({
        title: 'ちゅうこしゃ', items: items, x: 8, y: 4, w: 150, rows: 6, sel: sel,
        drawExtra: function (g, m) {
          var md = items[m.sel].m;
          UI.win(g, 2, 98, 236, 60);
          g.drawImage(RR.Sprites.carSide(md, 'white', 0), 10, 108);
          var lines = F.wrap(D.cars[md].desc, 150);
          lines.forEach(function (l, i) { F.draw(g, l, 82, 106 + i * 12, '#f8f8f8'); });
          F.draw(g, 'せいのうは パーツしだい', 82, 140, '#a8b0d0');
          UI.moneyBox(g, 160, 4);
        }
      }).then(function (i) {
        if (i < 0) return UI.say('てんちょう', 'いつでも みに きてね。');
        var md = items[i].m;
        return UI.ask('てんちょう', '{y}' + D.cars[md].name + '{w} は ¥' + U.money(D.cars[md].price) + '。|パーツは ぜんぶ ノーマルに なるよ。', ['かう', 'やめる']).then(function (a) {
          if (a !== 0) return loop(i);
          if (S().money < D.cars[md].price) { RR.Audio.sfx('error'); return UI.say('てんちょう', 'うーん、おかねが たりないね。').then(function () { return loop(i); }); }
          RR.State.addMoney(-D.cars[md].price);
          RR.Audio.sfx('buy');
          var car = D.newCar(md, 'white');
          owned[md] = true; items[i].disabled = true; items[i].right = 'もっている';
          return UI.ask('てんちょう', 'まいど! ガレージに とどけて おくよ。|いまから のりかえる?', ['のりかえる', 'あとで']).then(function (b) {
            if (b === 0) { S().carUid = car.uid; RR.Audio.sfx('starter'); return UI.msg('{y}' + D.cars[md].name + '{w} に のりかえた!|パーツは ガレージで つけかえよう。'); }
          }).then(function () { return loop(i); });
        });
      });
    };
    return UI.say('てんちょう', 'いらっしゃい。どれも はしりは いいよ。|みためが ちがう だけ だけどね!').then(function () { return loop(0); });
  };
})();
