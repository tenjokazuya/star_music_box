/* 所持品の管理: 車・パーツ・家具・戦績（セーブデータ S を操作する） */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var D = RR.Data = RR.Data || {};
  function S() { return RR.State.S; }

  D.initNewGame = function (s) {
    s.money = 2000;
    s.parts = [];
    s.cars = [];
    // じいちゃんの車: 主人公が戻る前にテツが整備しておいた（パーツは100%。ほこりは少し残る）
    var car = D.newCar('comet', 'white', s);
    car.dirt = 20;
    s.carUid = car.uid;
    s.furniture = { owned: {}, placed: [] };
    ['bed', 'desk_pc', 'shelf_book', 'clock'].forEach(function (id) { s.furniture.owned[id] = 1; });
    s.furniture.placed = [
      { id: 'bed', x: 1, y: 2 }, { id: 'desk_pc', x: 4, y: 2 }, { id: 'shelf_book', x: 9, y: 2 }, { id: 'clock', x: 7, y: 1 }
    ];
  };

  D.newCar = function (model, color, s) {
    s = s || S();
    var car = { uid: U.uid(), model: model, color: color || 'white', dirt: 0, parts: {} };
    D.SLOTS.forEach(function (slot) {
      var inst = D.addPart(D.stockParts[slot], 100, s);
      car.parts[slot] = inst.uid;
      inst.on = car.uid;
    });
    s.cars.push(car);
    return car;
  };
  D.addPart = function (id, dur, s) {
    s = s || S();
    var inst = { uid: U.uid(), id: id, dur: dur == null ? 100 : dur, on: null };
    s.parts.push(inst);
    return inst;
  };
  D.partInstance = function (uid, s) {
    s = s || S();
    for (var i = 0; i < s.parts.length; i++) if (s.parts[i].uid === uid) return s.parts[i];
    return null;
  };
  D.removePart = function (uid) {
    var s = S();
    s.parts = s.parts.filter(function (p) { return p.uid !== uid; });
  };
  D.currentCar = function () {
    var s = S();
    if (!s) return null;
    for (var i = 0; i < s.cars.length; i++) if (s.cars[i].uid === s.carUid) return s.cars[i];
    return s.cars[0] || null;
  };
  D.carPartMap = function (car) {
    var out = {};
    D.SLOTS.forEach(function (slot) {
      var inst = D.partInstance(car.parts[slot]);
      out[slot] = inst ? { id: inst.id, dur: inst.dur, uid: inst.uid } : { id: D.stockParts[slot], dur: 100 };
    });
    return out;
  };
  D.specOf = function (car) { return D.buildSpec(D.carPartMap(car)); };
  D.rating = function (car) { return car ? D.ratingOfSpec(D.specOf(car)) : 0; };
  // 指定スロットの、どの車にも付いていないパーツ
  D.spareParts = function (slot) {
    return S().parts.filter(function (p) { return !p.on && D.parts[p.id] && D.parts[p.id].slot === slot; });
  };
  D.equip = function (car, uid) {
    var inst = D.partInstance(uid);
    if (!inst) return false;
    var slot = D.parts[inst.id].slot;
    var old = D.partInstance(car.parts[slot]);
    if (old) old.on = null;
    car.parts[slot] = uid;
    inst.on = car.uid;
    return true;
  };
  D.repairCost = function (inst) {
    var def = D.parts[inst.id];
    return Math.ceil(def.price * 0.3 * (100 - inst.dur) / 100 / 10) * 10 + (inst.dur < 100 ? 100 : 0);
  };
  D.sellPrice = function (inst) {
    var def = D.parts[inst.id];
    if (def.stock) return Math.round(def.price * 0.2 * (inst.dur / 100) / 10) * 10;
    return Math.round(def.price * 0.45 * (0.4 + 0.6 * inst.dur / 100) / 10) * 10;
  };
  D.ownsPart = function (id) {
    return S().parts.some(function (p) { return p.id === id; });
  };
  // レース後の消耗を反映。wear: {engine, tire, ...}
  D.applyWear = function (car, wear) {
    var changes = {};
    D.SLOTS.forEach(function (slot) {
      var inst = D.partInstance(car.parts[slot]);
      if (!inst) return;
      var key = slot === 'light' ? null : slot;
      if (!key || !wear[key]) return;
      var before = inst.dur;
      inst.dur = Math.max(0, Math.round((inst.dur - wear[key]) * 10) / 10);
      changes[slot] = before - inst.dur;
    });
    return changes;
  };

  // ---------- 戦績 ----------
  D.record = function (id) {
    var s = S();
    s.records[id] = s.records[id] || { w: 0, l: 0 };
    return s.records[id];
  };

  // ---------- 家具 ----------
  D.giveFurniture = function (id, n) {
    var f = S().furniture;
    f.owned[id] = (f.owned[id] || 0) + (n || 1);
  };
  D.hasFurniture = function (id) { return (S().furniture.owned[id] || 0) > 0; };
  D.placedCount = function (id) { return S().furniture.placed.filter(function (p) { return p.id === id; }).length; };
})();
