/* 営業パートのロジック（描画に依存しない）。ビュー(service.js)は入力を tapXxx で渡し、
 * onEvent(type, data) で音・演出のきっかけを受け取る。バランスは RP.TUNE と各data層。 */
(function (RP) {
  'use strict';

  var U = RP.util, TU = RP.TUNE;

  function Service(opts) {
    this.st = opts.state;
    this.d = opts.derived;
    this.tier = RP.TIERS[this.st.tier - 1];
    this.rng = new RP.Rng(opts.seed || Math.floor(Math.random() * 4294967295));
    this.onEvent = opts.onEvent || function () {};
    this.weather = opts.weather || 'clear';
    this.uid = 0;
    this.sec = 0;
    this.finished = false;
    this.closed = false;
    this.rushOn = false;
    this.paused = false;

    var d = this.d;
    this.seats = [];
    for (var i = 0; i < this.tier.seats; i++) { this.seats.push({ i: i, cust: null, dirty: false, dirtyT: 0 }); }
    this.queue = [];
    this.slots = [];
    for (i = 0; i < d.slotCount; i++) { this.slots.push(null); }
    this.sel = -1;
    this.pots = [];
    for (i = 0; i < d.potCount; i++) { this.pots.push({ state: 'idle', t: 0, lock: 0, auto: null, autoT: 0 }); }
    this.grills = [];
    for (i = 0; i < d.grills; i++) { this.grills.push({ state: 'empty', t: 0, grade: 'ok' }); }
    this.stock = [];
    this.cooker = { stock: d.rice ? TU.rice.stock : 0, cooking: false, t: 0 };
    this.pour = null;
    this.staffCd = { soup: 0, noodle: 0, topping: 0, serve: 0, gyoza: 0, clear: 0, accept: 0 };
    this.combo = 0;
    this.stats = { sales: 0, tips: 0, served: 0, angry: 0, lost: 0, stars: [0, 0, 0, 0], bestCombo: 0,
                   materials: 0, waste: 0, repDelta: 0, orders: 0, perfectNoodle: 0, perfectSoup: 0, critics: 0 };
    this.events = [];       // 当日の特別イベント（ビューのテロップ用）
    this.buildSchedule();
  }

  Service.prototype.emit = function (type, data) { this.onEvent(type, data || {}); };
  Service.prototype.clock = function () { return TU.openMin + (this.sec / TU.daySec) * TU.dayMin; };

  // ============ 来客スケジュール ============
  Service.prototype.buildSchedule = function () {
    var st = this.st, d = this.d, r = this.rng, tier = this.tier;
    var repMult = 0.75 + (st.rep / 100) * 0.8;
    var weatherMul = this.weather === 'rain' ? 0.85 : 1;
    var tvMul = st.tv ? 1.6 : 1;
    var cmMul = st.cm > 0 ? 1.35 : 1;
    var n = Math.round(tier.base * repMult * (1 + d.arrival) * weatherMul * tvMul * cmMul);
    this.planned = n;
    if (st.tv) { this.events.push({ kind: 'tv', at: 6 }); }
    // ラッシュ帯
    var rs = 36 + r.next() * 44;
    this.rushSec = [rs, rs + 24];
    // 到着時刻：3つの山を持つ分布を逆変換サンプリング
    var N = 280, cum = [], acc = 0, i;
    for (i = 0; i < N; i++) {
      var s = (i / N) * TU.lastOrderSec;
      var f = 0.45 + 1.1 * Math.exp(-Math.pow((s - 32) / 17, 2)) + 1.5 * Math.exp(-Math.pow((s - 92) / 20, 2)) +
              0.7 * Math.exp(-Math.pow((s - 124) / 9, 2));
      if (s >= this.rushSec[0] && s <= this.rushSec[1]) { f += 1.3; }
      acc += f; cum.push(acc);
    }
    var times = [];
    for (i = 0; i < n; i++) {
      var u = ((i + r.next()) / n) * acc, lo = 0, hi = N - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] < u) { lo = mid + 1; } else { hi = mid; } }
      times.push({ at: (lo / N) * TU.lastOrderSec + r.next() * 0.5 });
    }
    // 団体客（ティア2〜）
    if (st.tier >= 2 && r.chance(0.4)) {
      var g = 38 + r.next() * 60;
      for (i = 0; i < 3; i++) { times.push({ at: g + i * 0.9, group: true }); }
      this.events.push({ kind: 'group', at: g - 1 });
    }
    // 評論家
    if (st.tier >= 2 && st.rep >= 28 && r.chance(0.3 + st.rep / 220)) {
      var ct = 50 + r.next() * 60;
      times.push({ at: ct, type: 'critic' });
      this.events.push({ kind: 'critic', at: ct - 1 });
    }
    // 酔客
    if (d.beer && r.chance(0.6)) {
      var dt0 = 88 + r.next() * 40;
      times.push({ at: dt0, type: 'drunk' });
      times.push({ at: dt0 + 3 + r.next() * 8, type: 'drunk' });
      this.events.push({ kind: 'drunk', at: dt0 - 1 });
    }
    times.sort(function (a, b) { return a.at - b.at; });
    this.sched = times;
    this.events.sort(function (a, b) { return a.at - b.at; });
  };

  Service.prototype.pickType = function (sec) {
    var st = this.st, tier = this.tier;
    var cands = RP.CUSTOMERS.types.filter(function (t) {
      if (t.minTier && st.tier < t.minTier) { return false; }
      if (t.minRep && st.rep < t.minRep) { return false; }
      if (t.late && sec < 70) { return false; }
      if (t.critic) { return false; }                // 評論家はイベントで出す
      if (t.needs && !(st.stats.endless && st.stats.endless[t.needs] > 0)) { return false; }
      return true;
    });
    void tier;
    return this.rng.weighted(cands, function (t) { return t.w; });
  };

  Service.prototype.makeLook = function (type) {
    var r = this.rng, C = RP.CUSTOMERS;
    var cl = r.pick(C.clothes);
    var hair = r.pick(type.hairs);
    return {
      hair: hair, hairCol: r.pick(C.hairCols), body: r.pick(type.bodies),
      c1: cl[0], c2: cl[1], skin: type.skin || r.pick(C.skins), glasses: hair === 'glasses', big: !!type.big
    };
  };

  Service.prototype.makeOrder = function (type) {
    var r = this.rng, d = this.d, M = RP.MENU;
    var soup = r.weighted(d.soups, function (id) { return type.soup[id] === undefined ? 1 : type.soup[id]; });
    var hardW = d.hards.filter(function (id) { return (type.hard[id] || 0) > 0; });
    if (!hardW.length) { hardW = d.hards; }
    var hard = r.weighted(hardW, function (id) { return type.hard[id] || 1; });
    var nTops = U.clamp(r.int(type.tops[0], type.tops[1]), 0, d.tops.length);
    var tops = U.shuffle(d.tops, r).slice(0, nTops);
    var o = { soup: soup, hard: hard, tops: tops, gyoza: false, beer: false, rice: false };
    if (d.grills > 0 && r.chance(type.sides.gyoza)) { o.gyoza = true; }
    if (d.beer && r.chance(type.sides.beer)) { o.beer = true; }
    if (d.rice && r.chance(type.sides.rice)) { o.rice = true; }
    var base = M.soup(soup).price;
    tops.forEach(function (id) { base += M.top(id).price; });
    if (o.gyoza) { base += M.sides.gyoza.price; }
    if (o.beer) { base += M.sides.beer.price; }
    if (o.rice) { base += M.sides.rice.price; }
    o.price = Math.max(10, Math.round(base * this.tier.mult * d.priceMul / 10) * 10);
    o.items = 1 + tops.length + (o.gyoza ? 1 : 0) + (o.beer ? 1 : 0) + (o.rice ? 1 : 0);
    return o;
  };

  Service.prototype.newCustomer = function (typeId) {
    var type = typeId ? RP.CUSTOMERS.type(typeId) : this.pickType(this.sec);
    var order = this.makeOrder(type);
    var pat = (TU.patBase + TU.patPerItem * order.items) * type.pat * (1 + this.d.patBonus);
    if (this.weather === 'rain') { pat *= 1.08; }
    var c = {
      id: ++this.uid, type: type, look: this.makeLook(type), order: order, state: 'enter', t: 0, ot: 0, qt: 0,
      seat: -1, slot: null, patMax: pat, pat: pat, mood: 'normal', eatDur: 0, result: null, warned: false, paid: 0
    };
    return c;
  };

  Service.prototype.pickSeat = function () {
    var free = [];
    for (var i = 0; i < this.seats.length; i++) { if (!this.seats[i].cust && !this.seats[i].dirty) { free.push(i); } }
    if (!free.length) { return -1; }
    return this.rng.pick(free);
  };

  // fromQueue: 行列から席へ移る客（ビューが「ワイプ→席」の移動演出を出す）
  Service.prototype.seatCustomer = function (c, idx, fromQueue) {
    this.seats[idx].cust = c;
    c.seat = idx; c.state = 'enter'; c.t = 0; c.ot = 0; c.fromQueue = !!fromQueue;
    this.emit('arrive', { c: c, seat: idx, fromQueue: !!fromQueue });
  };

  Service.prototype.spawn = function (a) {
    var c = this.newCustomer(a.type);
    var idx = this.pickSeat();
    if (idx >= 0) { this.seatCustomer(c, idx); }
    else if (this.queue.length < this.tier.queue) {
      c.state = 'queue'; c.qt = 0; this.queue.push(c);
      this.emit('queue', { c: c, n: this.queue.length });
    } else {
      this.stats.lost++;
      this.emit('lost', { c: c });
    }
  };

  // ============ 更新 ============
  Service.prototype.update = function (dt) {
    if (this.finished || this.paused) { return; }
    this.sec += dt;
    var i, c;

    // 特別イベント告知
    while (this.events.length && this.events[0].at <= this.sec) { this.emit('event', this.events.shift()); }
    // ラッシュ
    var rush = this.sec >= this.rushSec[0] && this.sec <= this.rushSec[1];
    if (rush !== this.rushOn) { this.rushOn = rush; this.emit('rush', { on: rush }); }
    // 来客
    while (this.sched.length && this.sched[0].at <= this.sec) { this.spawn(this.sched.shift()); }
    // 閉店
    if (!this.closed && this.sec >= TU.daySec) {
      this.closed = true;
      this.sched.length = 0;
      this.emit('close', {});
      for (i = this.queue.length - 1; i >= 0; i--) { this.stats.lost++; this.emit('queueLeave', { c: this.queue[i], closing: true }); }
      this.queue.length = 0;
    }

    // 行列
    for (i = this.queue.length - 1; i >= 0; i--) {
      c = this.queue[i]; c.qt += dt;
      if (c.qt >= TU.queueWait) {
        this.queue.splice(i, 1);
        this.stats.lost++;
        this.addRep(TU.rep.queue);
        this.emit('queueLeave', { c: c, closing: false });
      }
    }
    if (this.queue.length && !this.closed) {
      var si = this.pickSeat();
      if (si >= 0) { var q = this.queue.shift(); this.seatCustomer(q, si, true); }
    }

    // 席の皿
    for (i = 0; i < this.seats.length; i++) {
      var seat = this.seats[i];
      if (seat.dirty) { seat.dirtyT += dt; }
      c = seat.cust;
      if (!c) { continue; }
      c.t += dt;
      switch (c.state) {
        case 'enter':
          if (c.t >= TU.enterSec) { c.state = 'order'; c.t = 0; c.ot = 0; this.emit('wantOrder', { c: c }); }
          break;
        case 'order':
          c.ot += dt;
          if (c.ot >= TU.orderWait) { this.angryLeave(c, 'order'); }
          break;
        case 'wait':
          c.pat -= dt;
          if (!c.warned && c.pat / c.patMax < 0.3) { c.warned = true; this.emit('impatient', { c: c }); }
          if (c.pat <= 0) { this.angryLeave(c, 'wait'); }
          break;
        case 'eat':
          if (c.t >= c.eatDur) { this.finishEating(c); }
          break;
        case 'happy':
          if (c.t >= 0.7) { this.removeCustomer(c, true); }
          break;
        case 'angry':
          if (c.t >= 0.95) { this.removeCustomer(c, false); }
          break;
        default: break;
      }
    }

    this.updateSlots(dt);
    this.updatePots(dt);
    this.updateGrills(dt);
    this.updatePour(dt);
    this.updateCooker(dt);
    this.updateStaff(dt);

    // 終了判定（閉店後、客が全員いなくなったら）。居残りは一定時間で退店
    if (this.closed) {
      var left = 0;
      for (i = 0; i < this.seats.length; i++) { if (this.seats[i].cust) { left++; } }
      if (this.sec > TU.daySec + TU.closeGraceSec) {
        for (i = 0; i < this.seats.length; i++) {
          if (this.seats[i].cust && this.seats[i].cust.state !== 'eat') { this.angryLeave(this.seats[i].cust, 'closing'); }
        }
      }
      if (left === 0) { this.finished = true; this.emit('finished', {}); }
    }
  };

  Service.prototype.addRep = function (v) {
    if (v > 0) { v *= (1 + this.d.repBonus); }
    this.stats.repDelta += v;
    this.st.rep = U.clamp(this.st.rep + v, 0, 100);
  };

  // ============ 注文受付 ============
  Service.prototype.tapCustomer = function (idx) {
    var seat = this.seats[idx];
    if (!seat || !seat.cust) { return false; }
    if (seat.cust.state !== 'order') { return false; }
    return this.accept(seat.cust, false);
  };

  Service.prototype.accept = function (c, byStaff) {
    var idx = this.slots.indexOf(null);
    if (idx < 0) { if (!byStaff) { this.emit('error', { msg: RP.TEXT.err.slotsFull }); } return false; }
    var slot = {
      id: ++this.uid, cust: c, order: c.order, idx: idx, t: 0, ready: false, readyT: 0,
      bowl: { soup: null, noodle: null, tops: [], heat: 0, gold: !!this.d.decor.gold },
      gyoza: null, beer: null, rice: false
    };
    this.slots[idx] = slot;
    c.slot = slot; c.state = 'wait'; c.pat = c.patMax; c.t = 0;
    // 注文を受けて丼台に加わることと、どの丼台に手をつけるか（選択）は別。選択は変えない。
    if (this.sel >= 0 && !this.slots[this.sel]) { this.sel = -1; }
    this.stats.orders++;
    this.emit('accept', { c: c, slot: slot, byStaff: byStaff });
    return true;
  };

  Service.prototype.selectSlot = function (i) {
    if (this.slots[i]) { this.sel = i; return true; }
    return false;
  };
  Service.prototype.selSlot = function () { return this.sel >= 0 ? this.slots[this.sel] : null; };

  Service.prototype.isComplete = function (sl) {
    if (!sl.bowl.soup || !sl.bowl.noodle) { return false; }
    var i;
    for (i = 0; i < sl.order.tops.length; i++) { if (sl.bowl.tops.indexOf(sl.order.tops[i]) < 0) { return false; } }
    if (sl.order.gyoza && !sl.gyoza) { return false; }
    if (sl.order.beer && !sl.beer) { return false; }
    if (sl.order.rice && !sl.rice) { return false; }
    return true;
  };

  // 選択中の注文に足りないもの
  Service.prototype.need = function (sl) {
    sl = sl || this.selSlot();
    if (!sl) { return null; }
    var n = { soup: !sl.bowl.soup, noodle: !!sl.bowl.soup && !sl.bowl.noodle, tops: [], gyoza: false, beer: false, rice: false };
    sl.order.tops.forEach(function (id) { if (sl.bowl.tops.indexOf(id) < 0) { n.tops.push(id); } });
    n.gyoza = sl.order.gyoza && !sl.gyoza;
    n.beer = sl.order.beer && !sl.beer;
    n.rice = sl.order.rice && !sl.rice;
    return n;
  };

  Service.prototype.updateSlots = function (dt) {
    var T = TU.heat, d = this.d;
    for (var i = 0; i < this.slots.length; i++) {
      var sl = this.slots[i];
      if (!sl) { continue; }
      sl.t += dt;
      if (sl.bowl.soup) {
        sl.bowl.heat = Math.max(0, sl.bowl.heat - T.decay * (1 - d.heater * T.heaterStep) * dt);
      }
      if (sl.gyoza) { sl.gyoza.heat = Math.max(0, sl.gyoza.heat - TU.gyoza.stockDecay * dt * 0.6); }
      var ready = this.isComplete(sl);
      if (ready && !sl.ready) { sl.readyT = 0; this.emit('ready', { slot: sl }); }
      sl.ready = ready;
      if (ready) { sl.readyT += dt; }
    }
  };

  // ============ スープ・ビール注ぎ ============
  Service.prototype.pourZone = function (kind) {
    var P = TU.pour, l = this.d.ladle;
    if (kind === 'beer') { return { mid: P.beerMid, half: P.beerHalf + l * 0.0, okHalf: P.beerOkHalf }; }
    return { mid: P.soupMid, half: P.soupHalf + l * P.ladleStep, okHalf: P.soupOkHalf + l * P.ladleStep };
  };

  Service.prototype.pourBegin = function (kind, id) {
    if (this.pour || this.finished) { return false; }
    var sl = this.selSlot();
    if (!sl) { this.emit('error', { msg: RP.TEXT.err.pickSlot }); return false; }
    if (kind === 'soup' && sl.bowl.soup) { this.emit('error', { msg: RP.TEXT.err.soupDone }); return false; }
    if (kind === 'beer') {
      if (!sl.order.beer) { this.emit('error', { msg: RP.TEXT.err.notBeer }); return false; }
      if (sl.beer) { this.emit('error', { msg: RP.TEXT.err.beerDone }); return false; }
    }
    this.pour = { kind: kind, id: id, slot: sl, level: 0, zone: this.pourZone(kind), inZone: false };
    this.emit('pourStart', { kind: kind, slot: sl });
    return true;
  };

  Service.prototype.updatePour = function (dt) {
    var p = this.pour;
    if (!p) { return; }
    if (this.slots[p.slot.idx] !== p.slot) { this.pour = null; this.emit('pourCancel', {}); return; }
    p.level += TU.pour.speed * dt;
    var z = p.zone, inZ = Math.abs(p.level - z.mid) <= z.half;
    if (inZ && !p.inZone) { this.emit('pourZone', { kind: p.kind }); }
    p.inZone = inZ;
    if (p.level >= 1) { p.level = 1; this.pourEnd(); }
  };

  Service.prototype.pourEnd = function () {
    var p = this.pour;
    if (!p) { return null; }
    this.pour = null;
    var z = p.zone, diff = p.level - z.mid, grade;
    if (Math.abs(diff) <= z.half) { grade = 'perfect'; }
    else if (diff < 0) { grade = diff >= -z.okHalf ? 'ok' : 'low'; }
    else { grade = (diff <= z.okHalf && p.level < 1) ? 'ok' : 'over'; }
    var sl = p.slot;
    if (p.kind === 'soup') {
      sl.bowl.soup = { type: p.id, grade: grade, level: p.level };
      sl.bowl.heat = 100;
      if (grade === 'perfect') { this.stats.perfectSoup++; }
    } else {
      sl.beer = { grade: grade, level: p.level };
    }
    this.emit('pourEnd', { kind: p.kind, grade: grade, slot: sl, level: p.level });
    return grade;
  };

  // ============ 釜（麺） ============
  Service.prototype.noodleScale = function () { return 1 - this.d.stove * TU.noodle.stoveStep; };
  Service.prototype.hardTime = function (id) { return RP.MENU.hard(id).time * this.noodleScale(); };
  Service.prototype.nobiTime = function () { return RP.MENU.nobiTime * this.noodleScale(); };

  // 釜の経過時間 t が、注文の硬さ hardId に対して「まだ早い/上がり頃/茹ですぎ」のどれか
  Service.prototype.noodlePhase = function (t, hardId) {
    var N = TU.noodle, s = this.d.strainer;
    var ok = N.okTol + s * N.strainerStep * 1.4, diff = t - this.hardTime(hardId);
    return diff < -ok ? 'early' : (diff <= ok ? 'now' : 'late');
  };

  Service.prototype.noodleGrade = function (t, target) {
    var N = TU.noodle, s = this.d.strainer, diff = t - target;
    var perf = N.perfTol + s * N.strainerStep, ok = N.okTol + s * N.strainerStep * 1.4;
    if (Math.abs(diff) <= perf) { return 'perfect'; }
    if (Math.abs(diff) <= ok) { return 'ok'; }
    return 'bad';
  };
  // 茹で時間 t に最も近い硬さID（ポップアップ表示用）
  Service.prototype.nearestHard = function (t) {
    var best = null, bd = 1e9, self = this;
    RP.MENU.hards.forEach(function (h) {
      var dd = Math.abs(t - h.time * self.noodleScale());
      if (dd < bd) { bd = dd; best = h; }
    });
    return best;
  };

  Service.prototype.updatePots = function (dt) {
    for (var i = 0; i < this.pots.length; i++) {
      var p = this.pots[i];
      if (p.lock > 0) { p.lock -= dt; }
      if (p.state === 'boil') {
        p.t += dt;
        if (p.t > this.nobiTime()) { p.state = 'nobi'; p.auto = null; this.emit('nobi', { i: i }); }
      }
    }
  };

  // 釜のタップ。戻り値: 'start' | 'lift' | 'discard' | null
  Service.prototype.tapPot = function (i) {
    var p = this.pots[i];
    if (!p || p.lock > 0 || this.finished) { return null; }
    if (p.state === 'idle') {
      p.state = 'boil'; p.t = 0; p.auto = null;
      this.emit('noodleIn', { i: i });
      return 'start';
    }
    if (p.state === 'nobi') {
      p.state = 'idle'; p.lock = 0.3; p.t = 0;
      this.stats.waste += 40;
      this.emit('discard', { i: i, what: 'noodle' });
      return 'discard';
    }
    var sl = this.selSlot();
    if (!sl) { this.emit('error', { msg: RP.TEXT.err.pickSlot }); return null; }
    if (!sl.bowl.soup) { this.emit('error', { msg: RP.TEXT.err.soupFirst }); return null; }
    if (sl.bowl.noodle) { this.emit('error', { msg: RP.TEXT.err.noodleDone }); return null; }
    this.liftInto(p, sl, false);
    return 'lift';
  };

  Service.prototype.liftInto = function (p, sl, byStaff) {
    var target = this.hardTime(sl.order.hard);
    var grade = this.noodleGrade(p.t, target);
    sl.bowl.noodle = { t: p.t, target: target, grade: grade, actual: this.nearestHard(p.t).id };
    sl.bowl.heat = Math.min(100, sl.bowl.heat + TU.heat.noodleBoost);
    if (grade === 'perfect') { this.stats.perfectNoodle++; }
    p.state = 'idle'; p.t = 0; p.lock = TU.noodle.lock; p.auto = null;
    this.emit('noodleOut', { i: this.pots.indexOf(p), slot: sl, grade: grade, byStaff: byStaff, actual: sl.bowl.noodle.actual });
  };

  // ============ トッピング ============
  Service.prototype.tapTopping = function (id) {
    var sl = this.selSlot();
    if (!sl) { this.emit('error', { msg: RP.TEXT.err.pickSlot }); return false; }
    if (!sl.bowl.noodle) { this.emit('error', { msg: RP.TEXT.err.noodleFirst }); return false; }
    if (sl.bowl.tops.indexOf(id) >= 0) { this.emit('error', { msg: RP.TEXT.err.topDone }); return false; }
    this.addTopping(sl, id, false);
    return true;
  };
  Service.prototype.addTopping = function (sl, id, byStaff) {
    sl.bowl.tops.push(id);
    this.emit('topping', { slot: sl, id: id, extra: sl.order.tops.indexOf(id) < 0, byStaff: byStaff });
  };

  // ============ 餃子 ============
  Service.prototype.updateGrills = function (dt) {
    var G = TU.gyoza;
    for (var i = 0; i < this.grills.length; i++) {
      var g = this.grills[i];
      if (g.state === 'empty') { continue; }
      g.t += dt;
      if (g.state === 'cook' && g.t >= G.cook1) { g.state = 'flip'; g.t = 0; this.emit('gyozaFlipWait', { i: i }); }
      else if (g.state === 'flip' && g.t >= G.flipWindow) { g.state = 'burnt'; g.t = 0; this.emit('burn', { i: i }); }
      else if (g.state === 'cook2' && g.t >= G.cook2) { g.state = 'done'; g.t = 0; this.emit('gyozaDone', { i: i }); }
      else if (g.state === 'done' && g.t >= G.doneKeep) { g.state = 'burnt'; g.t = 0; this.emit('burn', { i: i }); }
    }
    var decay = G.stockDecay * (1 - this.d.stockKeep * G.stockKeepStep);
    for (i = 0; i < this.stock.length; i++) { this.stock[i].heat = Math.max(0, this.stock[i].heat - decay * dt); }
  };

  Service.prototype.tapGrill = function (i) {
    var g = this.grills[i];
    if (!g || this.finished) { return null; }
    var G = TU.gyoza;
    if (g.state === 'empty') { g.state = 'cook'; g.t = 0; g.grade = 'ok'; this.emit('gyozaIn', { i: i }); return 'start'; }
    if (g.state === 'cook') { this.emit('error', { msg: RP.TEXT.err.rawGyoza }); return null; }
    if (g.state === 'flip') {
      g.grade = g.t <= G.flipGood ? 'perfect' : 'ok';
      g.state = 'cook2'; g.t = 0;
      this.emit('flip', { i: i, grade: g.grade });
      return 'flip';
    }
    if (g.state === 'cook2') { this.emit('error', { msg: RP.TEXT.err.gyozaWait }); return null; }
    if (g.state === 'burnt') {
      g.state = 'empty'; g.t = 0; this.stats.waste += 60;
      this.emit('discard', { i: i, what: 'gyoza' });
      return 'discard';
    }
    // done
    var sl = this.selSlot();
    var item = { heat: 100, grade: g.grade };
    if (sl && sl.order.gyoza && !sl.gyoza) {
      sl.gyoza = item; g.state = 'empty'; g.t = 0;
      this.emit('plate', { slot: sl, item: item, toSlot: true });
      return 'plate';
    }
    if (this.stock.length < this.d.stockCap) {
      this.stock.push(item); g.state = 'empty'; g.t = 0;
      this.emit('plate', { item: item, toSlot: false });
      return 'stock';
    }
    this.emit('error', { msg: RP.TEXT.err.stockFull });
    return null;
  };

  Service.prototype.tapStock = function (i) {
    var item = this.stock[i];
    if (!item) { return false; }
    var sl = this.selSlot();
    if (!sl) { this.emit('error', { msg: RP.TEXT.err.pickSlot }); return false; }
    if (!sl.order.gyoza) { this.emit('error', { msg: RP.TEXT.err.notGyoza }); return false; }
    if (sl.gyoza) { this.emit('error', { msg: RP.TEXT.err.gyozaDone }); return false; }
    this.stock.splice(i, 1);
    sl.gyoza = item;
    this.emit('plate', { slot: sl, item: item, toSlot: true });
    return true;
  };

  // ============ ライス ============
  Service.prototype.updateCooker = function (dt) {
    var c = this.cooker;
    if (c.cooking) {
      c.t += dt;
      if (c.t >= TU.rice.cookTime) { c.cooking = false; c.stock = TU.rice.stock; this.emit('riceReady', {}); }
    }
  };
  Service.prototype.tapRice = function () {
    if (!this.d.rice) { return false; }
    var c = this.cooker;
    if (c.stock <= 0) {
      if (!c.cooking) { c.cooking = true; c.t = 0; this.emit('info', { msg: RP.TEXT.info.riceCook }); }
      else { this.emit('error', { msg: RP.TEXT.err.riceWait }); }
      return false;
    }
    var sl = this.selSlot();
    if (!sl) { this.emit('error', { msg: RP.TEXT.err.pickSlot }); return false; }
    if (!sl.order.rice) { this.emit('error', { msg: RP.TEXT.err.notRice }); return false; }
    if (sl.rice) { this.emit('error', { msg: RP.TEXT.err.riceDone }); return false; }
    c.stock--; sl.rice = true;
    this.emit('rice', { slot: sl });
    if (c.stock === 0 && !c.cooking) { c.cooking = true; c.t = 0; }
    return true;
  };

  // ============ 破棄 ============
  Service.prototype.trashSlot = function (i) {
    var sl = this.slots[i];
    if (!sl) { return false; }
    if (!sl.bowl.soup && !sl.bowl.noodle) { return false; }
    var loss = sl.order.price * TU.cost.waste;
    this.stats.waste += loss;
    sl.bowl = { soup: null, noodle: null, tops: [], heat: 0, gold: !!this.d.decor.gold };
    sl.ready = false;
    if (this.pour && this.pour.slot === sl && this.pour.kind === 'soup') { this.pour = null; }
    this.emit('trash', { slot: sl });
    return true;
  };

  // ============ 提供・評価 ============
  Service.prototype.evaluate = function (sl, c) {
    var S = TU.score, H = TU.heat, b = sl.bowl, o = sl.order, parts = [], wsum = 0, total = 0;
    function add(w, s, name) { parts.push({ name: name, s: s }); wsum += w; total += w * s; }
    var wrongSoup = b.soup.type !== o.soup;
    add(0.25, wrongSoup ? S.soup.wrong : S.soup[b.soup.grade], 'スープ');
    add(0.30, S.noodle[b.noodle.grade], '麺');
    var extras = 0;
    b.tops.forEach(function (id) { if (o.tops.indexOf(id) < 0) { extras++; } });
    add(0.10, Math.max(0.5, 1 - 0.15 * extras), '具');
    var heat = b.heat;
    var angry = heat < H.cold;
    var hs = heat >= H.hot ? 1 : (heat >= H.warm ? 0.86 : 0.6);
    add(0.20, hs, '温度');
    var sides = [];
    if (o.gyoza && sl.gyoza) {
      var gh = sl.gyoza.heat;
      sides.push((gh >= 60 ? 1 : (gh >= 30 ? 0.75 : 0.5)) * (sl.gyoza.grade === 'perfect' ? 1 : 0.92));
    }
    if (o.beer && sl.beer) { sides.push(S.beer[sl.beer.grade]); }
    if (o.rice) { sides.push(1); }
    if (sides.length) {
      var avg = sides.reduce(function (a, v) { return a + v; }, 0) / sides.length;
      add(0.15, avg, 'サイド');
    }
    var overall = total / wsum;
    var stars = overall < S.starBad ? 0 : (overall < S.star1 ? 1 : (overall < S.star2 ? 2 : 3));
    if (wrongSoup) { stars = 0; }
    // 熱々でなくても全部ぴったりなら★3、冷めかけは★2止まり
    if (heat < H.warm && stars === 3) { stars = 2; }
    return { stars: stars, overall: overall, wrongSoup: wrongSoup, extras: extras, heat: heat, angry: angry,
             patRatio: U.clamp(c.pat / c.patMax, 0, 1), parts: parts };
  };

  Service.prototype.serveSlot = function (i) {
    var sl = this.slots[i];
    if (!sl || this.finished) { return false; }
    if (!this.isComplete(sl)) { this.emit('error', { msg: RP.TEXT.err.notReady }); return false; }
    var c = sl.cust;
    var ev = this.evaluate(sl, c);
    this.slots[i] = null;
    if (this.sel === i) { this.sel = this.nextSelection(); }
    if (this.pour && this.pour.slot === sl) { this.pour = null; }
    this.stats.materials += sl.order.price * TU.cost.material;
    if (ev.angry) {
      this.emit('serveCold', { slot: sl, c: c, ev: ev });
      this.angryLeave(c, 'cold', true);
      return true;
    }
    c.slot = null;
    c.state = 'eat'; c.t = 0; c.result = ev;
    c.eatDur = TU.eat[0] + this.rng.next() * (TU.eat[1] - TU.eat[0]);
    c.mood = ev.stars >= 2 ? 'happy' : (ev.stars === 0 ? 'sour' : 'normal');
    this.stats.served++;
    this.stats.stars[ev.stars]++;
    this.applyStars(c, ev);
    this.emit('serve', { slot: sl, c: c, ev: ev });
    return true;
  };

  Service.prototype.nextSelection = function () {
    var best = -1;
    for (var i = 0; i < this.slots.length; i++) {
      if (this.slots[i] && !this.slots[i].ready) { return i; }
      if (this.slots[i] && best < 0) { best = i; }
    }
    return best;
  };

  Service.prototype.applyStars = function (c, ev) {
    var R = TU.rep, s = ev.stars, dRep;
    if (c.type.critic) {
      this.stats.critics++;
      dRep = s === 3 ? R.critic3 : (s === 2 ? R.critic2 : R.critic1);
    } else {
      dRep = s === 3 ? R.s3 : (s === 2 ? R.s2 : (s === 1 ? R.s1 : R.bad));
    }
    this.addRep(dRep);
    if (s >= 2) {
      this.combo++;
      if (this.combo > this.stats.bestCombo) { this.stats.bestCombo = this.combo; }
      if (this.combo % 5 === 0) { this.emit('combo', { n: this.combo }); }
    } else if (s === 0) {
      this.combo = 0;
    }
  };

  Service.prototype.finishEating = function (c) {
    var ev = c.result, P = TU.pay, base = c.order.price;
    var mult = ev.stars === 0 ? P.bad : (ev.stars === 1 ? P.s1 : (ev.stars === 2 ? P.s2 : P.s3));
    var tipRate = ev.stars === 3 ? P.tip3 : (ev.stars === 2 ? P.tip2 : P.tip1);
    var tip = base * c.type.tip * tipRate * (0.6 + 0.8 * ev.patRatio) * (1 + Math.min(0.5, this.combo * 0.05)) * (1 + this.d.tipBonus);
    if (c.type.critic && ev.stars < 3) { tip = 0; }
    var amount = Math.round((base * mult + tip) / 10) * 10;
    tip = Math.round(tip / 10) * 10;
    c.paid = amount;
    this.st.money += amount;
    this.stats.sales += amount;
    this.stats.tips += tip;
    c.state = 'happy'; c.t = 0;
    this.emit('pay', { c: c, amount: amount, tip: tip, ev: ev });
  };

  Service.prototype.angryLeave = function (c, why, served) {
    if (c.state === 'angry') { return; }
    var R = TU.rep;
    c.state = 'angry'; c.t = 0; c.mood = 'angry';
    if (c.slot && !served) {
      var sl = c.slot, idx = this.slots.indexOf(sl);
      if (idx >= 0) {
        this.slots[idx] = null;
        if (this.sel === idx) { this.sel = this.nextSelection(); }
        if (sl.bowl.soup) { this.stats.waste += sl.order.price * TU.cost.waste; }
      }
      if (this.pour && this.pour.slot === sl) { this.pour = null; }
    }
    c.slot = null;
    if (why === 'closing') { this.stats.lost++; this.emit('angry', { c: c, why: why }); return; }
    this.stats.angry++;
    this.addRep(why === 'order' ? R.order : R.angry);
    this.combo = 0;
    this.emit('angry', { c: c, why: why });
  };

  Service.prototype.removeCustomer = function (c, ate) {
    var seat = this.seats[c.seat];
    if (seat && seat.cust === c) {
      seat.cust = null;
      if (ate) { seat.dirty = true; seat.dirtyT = 0; }
    }
    c.state = 'gone';
    this.emit('leave', { c: c, ate: ate, seat: c.seat });
  };

  Service.prototype.clearSeat = function (i, byStaff) {
    var seat = this.seats[i];
    if (!seat || !seat.dirty) { return false; }
    seat.dirty = false; seat.dirtyT = 0;
    this.emit('clear', { seat: i, byStaff: !!byStaff });
    return true;
  };

  // ============ 従業員の自動化 ============
  Service.prototype.updateStaff = function (dt) {
    var d = this.d, sf = d.staff, k, i, sl;
    for (k in this.staffCd) { if (this.staffCd[k] > 0) { this.staffCd[k] -= dt; } }
    var D = TU.staff.delay;

    if (sf.clear && this.staffCd.clear <= 0) {
      for (i = 0; i < this.seats.length; i++) {
        if (this.seats[i].dirty && this.seats[i].dirtyT > 1.2) {
          this.clearSeat(i, true); this.staffCd.clear = 0.8; this.emit('staff', { kind: 'clear', seat: i }); break;
        }
      }
    }
    if ((sf.accept || d.ticket) && this.staffCd.accept <= 0) {
      for (i = 0; i < this.seats.length; i++) {
        var c = this.seats[i].cust;
        if (c && c.state === 'order' && c.ot >= TU.autoAcceptDelay) {
          if (this.accept(c, true)) { this.staffCd.accept = 0.6; if (!d.ticket || sf.accept) { this.emit('staff', { kind: 'accept', seat: i }); } }
          break;
        }
      }
    }
    if (sf.soup && this.staffCd.soup <= 0 && !this.pour) {
      for (i = 0; i < this.slots.length; i++) {
        sl = this.slots[i];
        if (sl && !sl.bowl.soup) {
          sl.bowl.soup = { type: sl.order.soup, grade: this.rng.chance(0.6) ? 'perfect' : 'ok', level: 0.8 };
          sl.bowl.heat = 100; this.staffCd.soup = D;
          this.emit('staff', { kind: 'soup', slot: sl }); break;
        }
      }
    }
    if (sf.noodle) {
      // 割り当て済みの釜が時間になったら上げる
      for (i = 0; i < this.pots.length; i++) {
        var p = this.pots[i];
        if (p.state === 'boil' && p.auto) {
          if (this.slots[p.auto.idx] !== p.auto || p.auto.bowl.noodle) { p.auto = null; continue; }
          if (p.t >= p.autoT && p.auto.bowl.soup) { this.liftInto(p, p.auto, true); this.emit('staff', { kind: 'noodle' }); }
        } else if (p.state === 'nobi') { p.state = 'idle'; p.lock = 0.3; this.stats.waste += 40; }
      }
      if (this.staffCd.noodle <= 0) {
        for (i = 0; i < this.slots.length; i++) {
          sl = this.slots[i];
          if (!sl || !sl.bowl.soup || sl.bowl.noodle) { continue; }
          var assigned = this.pots.some(function (pp) { return pp.auto === sl; });
          if (assigned) { continue; }
          var idle = this.pots.filter(function (pp) { return pp.state === 'idle' && pp.lock <= 0; })[0];
          if (!idle) { break; }
          idle.state = 'boil'; idle.t = 0; idle.auto = sl;
          idle.autoT = this.hardTime(sl.order.hard) + (this.rng.next() - 0.35) * 1.2;
          this.emit('noodleIn', { i: this.pots.indexOf(idle), byStaff: true });
          this.staffCd.noodle = D; break;
        }
      }
    }
    if (sf.topping && this.staffCd.topping <= 0) {
      for (i = 0; i < this.slots.length; i++) {
        sl = this.slots[i];
        if (!sl || !sl.bowl.noodle) { continue; }
        var miss = sl.order.tops.filter(function (id) { return sl.bowl.tops.indexOf(id) < 0; })[0];
        if (miss) { this.addTopping(sl, miss, true); this.staffCd.topping = D * 0.7; break; }
      }
    }
    if (sf.serve && this.staffCd.serve <= 0) {
      for (i = 0; i < this.slots.length; i++) {
        sl = this.slots[i];
        if (sl && sl.ready && sl.readyT > 1.0) { this.serveSlot(i); this.staffCd.serve = D; this.emit('staff', { kind: 'serve' }); break; }
      }
    }
    if (sf.gyoza && this.staffCd.gyoza <= 0 && this.grills.length) {
      var cooking = 0;
      for (i = 0; i < this.grills.length; i++) {
        var g = this.grills[i];
        if (g.state === 'cook' || g.state === 'cook2' || g.state === 'flip') { cooking++; }
      }
      for (i = 0; i < this.grills.length; i++) {
        var gg = this.grills[i];
        if (gg.state === 'flip' && gg.t > 0.5) { this.tapGrill(i); this.staffCd.gyoza = 0.5; break; }
        if (gg.state === 'done') {
          // 注文待ちの丼があれば直接、なければ保温ケースへ
          var need = this.slots.filter(function (s2) { return s2 && s2.order.gyoza && !s2.gyoza; })[0];
          if (need) { var prev = this.sel; this.sel = need.idx; this.tapGrill(i); this.sel = prev; }
          else { this.tapGrill(i); }
          this.staffCd.gyoza = 0.5; break;
        }
        if (gg.state === 'burnt') { this.tapGrill(i); this.staffCd.gyoza = 0.5; break; }
        if (gg.state === 'empty' && this.stock.length + cooking < this.d.stockCap && !this.closed) {
          this.tapGrill(i); this.staffCd.gyoza = 0.8; break;
        }
      }
      // 在庫から注文待ちの丼へ
      for (i = 0; i < this.slots.length; i++) {
        sl = this.slots[i];
        if (sl && sl.order.gyoza && !sl.gyoza && this.stock.length) {
          sl.gyoza = this.stock.shift();
          this.emit('plate', { slot: sl, item: sl.gyoza, toSlot: true, byStaff: true });
          break;
        }
      }
    }
  };

  RP.Service = Service;
})(window.RP);
