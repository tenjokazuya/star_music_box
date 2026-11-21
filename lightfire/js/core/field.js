/* field.js — フィールド（マップ探索）シーン：移動・衝突・NPC・パズル物体・演出 */
(function () {
  'use strict';
  var T = 16, W = PF.W, H = PF.H, SP = PF.sprites, Tl = PF.tiles, G = PF.gfx;
  var DUR_WALK = 10, DUR_RUN = 5;
  var HERO_LOOK = { hair: '#5a3220', skin: '#f8d0a0', cloth: '#e0583a', trim: '#fff0c0', pants: '#3c4a80', boots: '#4a2c18' };
  var SOLID = { npc: true, sign: true, chest: true, block: true, brazier: true, gate: true, barrier: true, bramble: true, iceblock: true, orb: true, deco: true, plate: false };

  /* ================= エンティティ ================= */
  function Ent(def, type) {
    this.def = def || {}; this.type = type; this.id = def.id;
    this.x = def.x | 0; this.y = def.y | 0; this.ox = 0; this.oy = 0; this.dir = def.dir || 'd';
    this.mv = 0; this.dur = DUR_WALK; this.par = 0; this.turnT = 0;
    this.solid = def.solid !== undefined ? def.solid : !!SOLID[type];
    this.home = { x: this.x, y: this.y }; this.ai = 30 + PF.rnd(90);
    this.lit = false; this.timer = -1; this.pressed = false; this.burn = 0; this.open = false; this.gone = false; this.emote = null;
    this.t = PF.rnd(60);
  }
  Ent.prototype.move = function (dir, dur) {
    var d = PF.DIRS[dir]; this.dir = dir; this.x += d.x; this.y += d.y;
    this.ox = -d.x * T; this.oy = -d.y * T; this.mv = this.dur = dur || DUR_WALK; this.par ^= 1;
  };
  Ent.prototype.step = function () {
    this.t++;
    if (this.mv > 0) {
      this.ox -= this.ox / this.mv; this.oy -= this.oy / this.mv; this.mv--;
      if (this.mv <= 0) { this.ox = this.oy = 0; if (this.onArrive) this.onArrive(this); }
    }
    if (this.turnT > 0) this.turnT--;
    if (this.emote && --this.emote.t <= 0) this.emote = null;
  };
  Ent.prototype.px = function () { return this.x * T + Math.round(this.ox); };
  Ent.prototype.py = function () { return this.y * T + Math.round(this.oy); };

  /* ================= フィールド ================= */
  var F = PF.field = {
    map: null, ents: [], zones: [], player: null, ember: null, lock: 0, particles: [], flakes: [],
    cam: { x: 120, y: 80, tw: null, follow: true }, entry: null, bannerT: 0, banner: '', puzzles: [],
    encSteps: 0, bumpCd: 0, pushHold: 0, lastArea: null, lightCanvas: null, running: false, seq: {}
  };

  /* ---- 読み込み ---- */
  // pos: {x,y,dir} または {entry:'name'}
  F.load = function (id, pos) {
    var map = PF.maps.resolve(id);
    PF.maps.current = map; F.map = map;
    var p = pos || {};
    if (p.entry) { var e = map.entries[p.entry]; if (!e) throw new Error(id + ': entry "' + p.entry + '" なし'); p = { x: e.x, y: e.y, dir: e.dir }; }
    F.ents = []; F.zones = []; F.particles = []; F.puzzles = []; F.seq = {};
    map.objs.forEach(function (o) { F.addObj(o); });
    F.applyPitFills(map);
    map.puzzles.forEach(function (q) {
      var done = q.flag ? !!PF.flag(q.flag) : false;
      // 穴の記録やボス撃破後の配置で、読み込み時にすでに解けている場合は 解決ずみとして扱う（会話を出さない）
      if (!done && q.kind === 'fn') { try { if (q.check(F)) { done = true; if (q.flag) PF.setFlag(q.flag); } } catch (e) { } }
      F.puzzles.push({ def: q, done: done });
    });
    var pl = new Ent({ id: 'player', x: p.x, y: p.y, dir: p.dir || 'd' }, 'player');
    pl.solid = true; pl.sheet = G.human(HERO_LOOK); pl.onArrive = onPlayerArrive;
    F.player = pl; F.ents.push(pl);
    F.ember = null;
    if (F.hasEmber()) { var em = new Ent({ id: 'ember', x: p.x, y: p.y, dir: p.dir || 'd' }, 'ember'); em.solid = false; F.ember = em; F.ents.push(em); }
    F.entry = { x: p.x, y: p.y, dir: p.dir || 'd' };
    F.cam.tw = null; F.cam.follow = true; F.cam.x = pl.x * T + 8; F.cam.y = pl.y * T + 8;
    F.encSteps = 0; F.pushHold = 0;
    F.flakes = [];
    if (map.snow) for (var i = 0; i < 46; i++) F.flakes.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 0.9, p: Math.random() * 6.28 });
    if (map.bgm) PF.audio.playBGM(map.bgm);
    PF.audio.ambience(map.ambience);
    PF.state.map = { id: id, x: p.x, y: p.y, dir: p.dir || 'd' };
    F.updatePuzzleState(true);
    F.autoBanner();
  };
  F.autoBanner = function () {
    var m = F.map; var area = m.area || m.name;
    if (m.showName !== false && area && area !== F.lastArea) { F.banner = area; F.bannerT = 110; }
    F.lastArea = area;
  };
  F.hasEmber = function () { return !!PF.flag('ember.joined') && !PF.flag('ember.away'); };
  F.refreshEmber = function () {
    var has = F.hasEmber();
    if (has && !F.ember) { var em = new Ent({ id: 'ember', x: F.player.x, y: F.player.y }, 'ember'); em.solid = false; F.ember = em; F.ents.push(em); }
    if (!has && F.ember) { F.ents.splice(F.ents.indexOf(F.ember), 1); F.ember = null; }
  };

  F.addObj = function (o) {
    if (o.when && !PF.cond(o.when)) return null;
    var type = o.type;
    if (type === 'warp' || type === 'trigger') { F.zones.push({ type: type, def: o, x: o.x, y: o.y, w: o.w || 1, h: o.h || 1 }); return null; }
    var e = new Ent(o, type);
    if (type === 'npc') {
      e.sheet = o.look ? G.human(o.look) : null;
      e.sprite = o.sprite ? SP[o.sprite] : null;
    }
    if (type === 'chest') e.open = !!PF.flag('chest.' + F.map.id + '.' + o.id);
    if (type === 'gate') { e.open = !!o.open; e.solid = !e.open; }
    if (type === 'brazier') { if (o.lit) { e.lit = true; } }
    if (type === 'deco') { e.sprite = SP[o.sprite]; }
    F.ents.push(e);
    return e;
  };
  F.find = function (id) { for (var i = 0; i < F.ents.length; i++) if (F.ents[i].id === id && !F.ents[i].gone) return F.ents[i]; return null; };
  F.remove = function (e) { e.gone = true; var i = F.ents.indexOf(e); if (i >= 0) F.ents.splice(i, 1); };
  F.group = function (name) { return F.ents.filter(function (e) { return e.def.group === name; }); };

  /* ---- 衝突 ---- */
  F.tile = function (x, y) { var m = F.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return Tl.defs['Z']; return Tl.defs[m.tiles[y][x]] || Tl.defs['.']; };
  F.entAt = function (x, y, ignore, solidOnly) {
    for (var i = 0; i < F.ents.length; i++) {
      var e = F.ents[i];
      if (e === ignore || e.gone || e.x !== x || e.y !== y) continue;
      if (e.type === 'ember') continue;
      if (solidOnly && !e.solid) continue;
      return e;
    }
    return null;
  };
  F.passable = function (x, y, ignore) {
    if (F.tile(x, y).solid) return false;
    return !F.entAt(x, y, ignore, true);
  };
  F.setTile = function (x, y, ch) { if (F.map.tiles[y]) F.map.tiles[y][x] = ch; };

  /* ---- 移動 ---- */
  F.busy = function () { return F.lock > 0 || PF.modals.length > 0; };
  F.running_ = function () { return PF.input.down('b') && PF.flag('norun') !== true; };

  F.moveEnt = function (e, dir, dur) {
    e.move(dir, dur);
    if (e === F.player && F.ember) {
      // ヒダネは 一歩遅れて 付いてくる
      var em = F.ember, d = PF.DIRS[dir], bx = F.player.x - d.x, by = F.player.y - d.y;
      if (em.x !== bx || em.y !== by) { if (Math.abs(bx - em.x) + Math.abs(by - em.y) === 1) em.move(PF.dirFromDelta(bx - em.x, by - em.y), dur); else { em.x = bx; em.y = by; em.ox = em.oy = 0; } }
    }
  };
  F.tryMove = function (dir, dur, forced) {
    var pl = F.player, d = PF.DIRS[dir], nx = pl.x + d.x, ny = pl.y + d.y;
    if (!forced && pl.dir !== dir) { pl.dir = dir; pl.turnT = 4; F.pushHold = 0; return false; } // 向き変更のみ（短い押しで向きだけ変える）
    pl.dir = dir;
    if (pl.turnT > 0 && !forced) return false;
    if (F.passable(nx, ny, pl)) { F.moveEnt(pl, dir, dur); F.pushHold = 0; return true; }
    var b = F.entAt(nx, ny, pl, true);
    if (b && b.type === 'block' && !forced) {
      F.pushHold++;
      if (F.pushHold >= 10) {
        var bx = nx + d.x, by = ny + d.y, tdef = F.tile(bx, by), ok = false, pit = false;
        if (bx >= 0 && by >= 0 && bx < F.map.w && by < F.map.h) {
          if ((tdef.pit || tdef.lava) && !F.entAt(bx, by, b, true)) { ok = true; pit = true; }
          else if (!tdef.solid && !F.entAt(bx, by, b, true)) ok = true;
        }
        if (ok) {
          PF.sfx('push'); b.move(dir, dur + 2); F.moveEnt(pl, dir, dur + 2); F.pushHold = 0;
          b.onArrive = pit ? function (bb) { F.blockFall(bb); } : function (bb) { F.updatePuzzleState(); };
          return true;
        } else { if (F.pushHold === 10) PF.sfx('bump'); }
      }
      return false;
    }
    F.pushHold = 0;
    if (F.bumpCd <= 0 && pl.mv === 0) { PF.sfx('bump'); F.bumpCd = 18; }
    return false;
  };
  function dirBtn(d) { return { u: 'up', d: 'down', l: 'left', r: 'right' }[d]; }

  F.blockFall = function (b) {
    var lava = F.tile(b.x, b.y).lava;
    PF.sfx(lava ? 'fire_off' : 'fall'); F.spark(b.x * T + 8, b.y * T + 8, 10, lava ? '#ff8a30' : '#8a8aa0');
    F.setTile(b.x, b.y, lava ? 'a' : '+');
    // 埋めた穴は 部屋を出入りしても残す（どのブロックを使ったかも記録する）。
    // 記録が無いと、穴を一つだけ埋めて通り抜けたあと戻れなくなる（ブロックが穴の向こう側で復元されるため）
    PF.setFlag('pit.' + F.map.id + '.' + b.x + '_' + b.y, b.id || true);
    F.remove(b); F.updatePuzzleState();
  };
  // 読み込み時: 記録された「埋めた穴」を床にし、使われたブロックを取り除く
  F.applyPitFills = function (map) {
    var pre = 'pit.' + map.id + '.', fl = PF.state.flags;
    Object.keys(fl).forEach(function (k) {
      if (k.indexOf(pre) !== 0 || !fl[k]) return;
      var xy = k.slice(pre.length).split('_'), x = +xy[0], y = +xy[1], t = F.tile(x, y);
      if (t.pit || t.lava) F.setTile(x, y, t.lava ? 'a' : '+');
      if (typeof fl[k] === 'string') { var b = F.find(fl[k]); if (b && b.type === 'block') F.remove(b); }
    });
  };

  /* ---- 到着処理 ---- */
  function onPlayerArrive(pl) {
    PF.state.steps++;
    if (F.map.encounter && F.mayEncounter()) { /* 戦闘は下で開始 */ }
    // 氷の上は滑る
    var t = F.tile(pl.x, pl.y);
    if (t.ice) {
      var d = PF.DIRS[pl.dir];
      if (F.passable(pl.x + d.x, pl.y + d.y, pl)) { F.moveEnt(pl, pl.dir, DUR_RUN); pl._slide = true; return; }
    }
    pl._slide = false;
    F.updatePuzzleState();
    if (F.lock === 0) F.checkZones();
  }
  F.checkZones = function () {
    var pl = F.player;
    for (var i = 0; i < F.zones.length; i++) {
      var z = F.zones[i], d = z.def;
      if (pl.x < z.x || pl.y < z.y || pl.x >= z.x + z.w || pl.y >= z.y + z.h) continue;
      if (d.cond && !PF.cond(d.cond)) continue;
      if (z.type === 'warp') {
        if (d.needs && !PF.cond(d.needs)) { if (d.deny) F.run(d.deny); else continue; return; }
        F.warp(d); return;
      }
      if (z.type === 'trigger') {
        if (d.once && PF.flag(d.once)) continue;
        F.run(function (g) { if (d.once) PF.setFlag(d.once); return d.run(g); }); return;
      }
    }
    F.rollEncounter();
  };
  F.mayEncounter = function () { return false; };
  F.rollEncounter = function () {
    var enc = F.map.encounter; if (!enc || PF.flag('noenc') || F.busy()) return;
    for (var ti = 0; ti < F.ents.length; ti++) { var te = F.ents[ti]; if (te.type === 'brazier' && te.lit && te.timer > 0) return; } // 時限パズル中は敵が出ない
    var pl = F.player, t = F.tile(pl.x, pl.y);
    if (enc.grassOnly && !t.grass) return;
    F.encSteps++;
    var tname = typeof enc.table === 'function' ? enc.table(pl.x, pl.y) : enc.table;
    var tb = PF.db.encounters[tname]; if (!tb) return;
    if (F.encSteps < 6) return;
    var rate = tb.rate * (enc.rate || 1);
    if (Math.random() < rate) {
      F.encSteps = 0;
      var n = 1 + (Math.random() < 0.5 ? PF.rnd(tb.max) : 0), ids = [], tot = 0;
      tb.list.forEach(function (q) { tot += q[1]; });
      for (var i = 0; i < n; i++) { var r = Math.random() * tot, acc = 0; for (var k = 0; k < tb.list.length; k++) { acc += tb.list[k][1]; if (r < acc) { ids.push(tb.list[k][0]); break; } } }
      F.run(function (g) { return g.battle(ids, { bg: tb.bg }); });
    }
  };

  F.warp = function (d) {
    var to = d.to, pos = d.entry ? { entry: d.entry } : { x: d.tx, y: d.ty, dir: d.dir };
    F.run(function (g) { return g.warp(to, pos, d.sfx); });
  };

  /* ---- スクリプト実行 ---- */
  F.run = function (fn) {
    F.lock++;
    var res;
    try { res = Promise.resolve(fn(PF.script)); } catch (e) { console.error(e); res = Promise.resolve(); }
    return res.catch(function (e) { if (e !== PF.ABORT) { console.error(e); PF.lastError = e; } }).then(function () { F.lock = Math.max(0, F.lock - 1); });
  };

  /* ---- 調べる ---- */
  F.interact = function () {
    var pl = F.player, d = PF.DIRS[pl.dir], tx = pl.x + d.x, ty = pl.y + d.y;
    var e = F.entAt(tx, ty, pl, false);
    if (!e && F.tile(tx, ty).counter) e = F.entAt(tx + d.x, ty + d.y, pl, false);
    if (!e) { var tdef = F.tile(tx, ty); return false; }
    return F.interactWith(e);
  };
  F.interactWith = function (e) {
    var def = e.def, pl = F.player;
    switch (e.type) {
      case 'npc':
        if (!def.noturn) e.dir = PF.OPP[pl.dir];
        if (def.talk) { F.run(function (g) { return def.talk(g, e); }); return true; }
        return false;
      case 'sign':
        F.run(function (g) { return def.talk ? def.talk(g, e) : g.say(def.text); }); return true;
      case 'chest':
        if (e.open) { F.run(function (g) { return g.say('からっぽだ。'); }); return true; }
        F.run(function (g) { return F.openChest(g, e); }); return true;
      case 'brazier':
        F.run(function (g) { return F.igniteBrazier(g, e); }); return true;
      case 'barrier': case 'bramble': case 'iceblock':
        F.run(function (g) { return F.burnThing(g, e); }); return true;
      case 'orb': case 'deco': case 'gate':
        if (def.talk) { F.run(function (g) { return def.talk(g, e); }); return true; }
        if (e.type === 'gate') { F.run(function (g) { return g.say(def.text || 'とびらは しまっている。'); }); return true; }
        return false;
    }
    return false;
  };

  F.openChest = async function (g, e) {
    var def = e.def; PF.sfx('open'); e.open = true; PF.setFlag('chest.' + F.map.id + '.' + def.id);
    await PF.wait(16);
    if (def.gold) { PF.addGold(def.gold); PF.audio.jingle('item'); await g.say(def.gold + 'ゴールドを てにいれた!'); }
    else if (def.item) {
      var it = PF.db.items[def.item], n = def.n || 1;
      PF.addItem(def.item, n); PF.audio.jingle('item');
      await g.say(it.name + (n > 1 ? ' ×' + n : '') + 'を てにいれた!');
      if (def.after) await def.after(g);
    }
  };

  /* ---- 火の力 ---- */
  F.canIgnite = function () { return !!PF.flag('ember.joined'); };
  F.emberFly = function (tx, ty) {
    var em = F.ember; if (!em) return Promise.resolve();
    em.fly = { tx: tx * T, ty: ty * T, t: 0 };
    return PF.waitUntil(function () { return !em.fly; });
  };
  async function needFire(g, e, msg) {
    if (!F.canIgnite()) { await g.say(msg || 'ひを つける ものが あれば…。'); return false; }
    return true;
  }
  F.igniteBrazier = async function (g, e) {
    var def = e.def;
    if (!F.canIgnite()) { await g.say(def.noFire || 'ひが ともっていない しょくだい だ。'); return; }
    if (e.lit && !def.toggle) return;
    PF.sfx('ignite'); await F.emberFly(e.x, e.y);
    if (def.toggle) {
      // ライツアウト: 自分と link で指定した燭台の 点灯/消灯を 反転する
      var members = [e]; (def.link || []).forEach(function (id) { var o = F.find(id); if (o) members.push(o); });
      members.forEach(function (m) { F.setLit(m, !m.lit); });
    } else F.setLit(e, true);
    await F.afterIgnite(e);
    if (def.onLit && e.lit) await def.onLit(PF.script, e);
  };
  F.setLit = function (e, on) {
    e.lit = on; e.timer = on && e.def.timer ? e.def.timer : -1;
    if (on) F.spark(e.x * T + 8, e.y * T + 4, 8, '#ffb030', true); else PF.sfx('fire_off');
  };
  F.afterIgnite = async function (e) {
    var def = e.def, pz = F.puzzles;
    for (var i = 0; i < pz.length; i++) {
      var q = pz[i];
      if (q.done || q.def.group !== def.group || q.def.kind !== 'seq') continue;
      var s = F.seq[q.def.group] = F.seq[q.def.group] || [];
      s.push(def.key || e.id);
      var ok = true; for (var k = 0; k < s.length; k++) if (s[k] !== q.def.order[k]) ok = false;
      if (!ok) {
        await PF.wait(18); PF.sfx('error');
        F.group(def.group).forEach(function (m) { F.setLit(m, false); }); F.seq[q.def.group] = []; await PF.wait(10);
        if (q.def.failMsg) await PF.script.say(q.def.failMsg);
      }
    }
    F.updatePuzzleState();
  };
  F.burnThing = async function (g, e) {
    var def = e.def, t = e.type;
    if (!F.canIgnite()) { await g.say(def.noFire || (t === 'iceblock' ? 'こおりが みちを ふさいでいる。' : (t === 'bramble' ? 'かれた つるが からまっている。' : 'ふるい いたが うちつけて ある。'))); return; }
    PF.sfx(t === 'iceblock' ? 'ignite' : 'ignite'); await F.emberFly(e.x, e.y);
    e.burn = 1;
    for (var i = 0; i < 40; i++) { F.spark(e.x * T + 8, e.y * T + 8, 1, t === 'iceblock' ? '#a8e8ff' : '#ff9a30', t !== 'iceblock'); await PF.wait(1); e.burn++; }
    PF.sfx(t === 'iceblock' ? 'glass' : 'fire_off');
    F.spark(e.x * T + 8, e.y * T + 8, 14, t === 'iceblock' ? '#c8f4ff' : '#6a5a40');
    F.remove(e); if (def.flag) PF.setFlag(def.flag);
    if (def.then) await def.then(g);
  };

  /* ---- パズル状態 ---- */
  F.updatePuzzleState = function (silent) {
    // プレート
    var changed = false;
    F.ents.forEach(function (e) {
      if (e.type !== 'plate') return;
      var on = false, pl = F.player;
      F.ents.forEach(function (o) { if (o !== e && !o.gone && o.x === e.x && o.y === e.y && o.mv === 0 && (o.type === 'block' || (!e.def.blockOnly && o === pl))) on = true; });
      if (on !== e.pressed) { e.pressed = on; changed = true; if (!silent) PF.sfx(on ? 'switch' : 'tick'); }
    });
    F.puzzles.forEach(function (q) {
      if (q.done || F.lock > 0 && q.busy) return;
      var d = q.def, members = d.group ? F.group(d.group) : []; if (d.kind !== 'fn' && !members.length) return;
      var ok = true;
      if (d.kind === 'fn') ok = !!d.check(F);
      else if (d.kind === 'seq') { var s = F.seq[d.group] || []; ok = s.length === d.order.length && members.every(function (m) { return m.lit; }); }
      else ok = members.every(function (m) { return d.needs === 'pressed' ? m.pressed : m.lit; });
      if (ok && !silent) {
        q.done = true; if (d.flag) PF.setFlag(d.flag);
        F.run(async function (g) { await PF.wait(20); PF.audio.jingle('solve'); await g.shake(2, 30); await d.solved(g); });
      }
    });
  };

  /* ---- 演出補助 ---- */
  F.spark = function (x, y, n, col, up) {
    for (var i = 0; i < n; i++) F.particles.push({ x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * (up ? 0.4 : 1.4), vy: up ? -0.5 - Math.random() * 0.7 : (Math.random() - 0.8) * 1.4, life: 18 + PF.rnd(16), max: 34, col: col || '#fff', g: up ? 0 : 0.06 });
  };
  F.emote = function (e, sym, frames) { e.emote = { s: sym, t: frames || 40 }; };
  F.camTo = function (tx, ty, frames) {
    var c = F.cam; c.follow = false;
    return new Promise(function (res) { c.tw = { fx: c.x, fy: c.y, tx: tx * T + 8, ty: ty * T + 8, t: 0, n: Math.max(1, frames || 30), res: res }; });
  };
  F.camReset = function (frames) {
    var c = F.cam, pl = F.player;
    if (!frames) { c.follow = true; c.tw = null; return Promise.resolve(); }
    return new Promise(function (res) { c.tw = { fx: c.x, fy: c.y, tx: pl.px() + 8, ty: pl.py() + 8, t: 0, n: frames, res: function () { c.follow = true; res(); } }; });
  };

  /* ================= 更新 ================= */
  F.update = function (paused) {
    F.time = (F.time || 0) + 1;
    if (PF.state) PF.state.playTime += 1 / 60;
    var pl = F.player;
    if (!pl) return;
    if (F.bumpCd > 0) F.bumpCd--;
    if (F.bannerT > 0) F.bannerT--;
    for (var i = 0; i < F.ents.length; i++) F.ents[i].step();
    // 松明のタイマー
    F.ents.forEach(function (e) {
      // 時限燭台: メニューや会話で止まっている間は 時間が進まない
      if (!paused && e.type === 'brazier' && e.lit && e.timer > 0) { e.timer--; if (e.timer === 0) { F.setLit(e, false); F.updatePuzzleState(true); } }
      if (e.fly) { e.fly.t++; if (e.fly.t > 30) e.fly = null; }
    });
    updateParticles();
    // カメラ
    var c = F.cam;
    if (c.tw) { var tw = c.tw; tw.t++; var k = Math.min(1, tw.t / tw.n); k = k * k * (3 - 2 * k); c.x = tw.fx + (tw.tx - tw.fx) * k; c.y = tw.fy + (tw.ty - tw.fy) * k; if (tw.t >= tw.n) { c.tw = null; if (tw.res) tw.res(); } }
    else if (c.follow) { c.x = pl.px() + 8; c.y = pl.py() + 8; }
    if (paused || F.lock > 0) { return; }
    // 入力
    if (PF.input.pressed('start')) { PF.sfx('menu'); F.run(function (g) { return PF.menu.open(); }); return; }
    if (PF.input.pressed('select') && F.map.reset) { F.run(function (g) { return F.resetRoom(g); }); return; }
    if (pl.mv === 0) {
      if (PF.input.pressed('a') && F.interact()) return;
      var dir = PF.input.heldDir();
      if (dir) F.tryMove(dir, F.running_() ? DUR_RUN : DUR_WALK); else F.pushHold = 0;
    }
    // NPC の徘徊
    F.ents.forEach(function (e) {
      if (e.type !== 'npc' || !e.def.wander || e.mv > 0) return;
      if (--e.ai > 0) return;
      e.ai = 50 + PF.rnd(120);
      var dirs = ['u', 'd', 'l', 'r'], dd = PF.pick(dirs), v = PF.DIRS[dd], nx = e.x + v.x, ny = e.y + v.y;
      if (Math.abs(nx - e.home.x) > e.def.wander || Math.abs(ny - e.home.y) > e.def.wander) { e.dir = dd; return; }
      if (F.passable(nx, ny, e) && !(nx === pl.x && ny === pl.y)) e.move(dd, 16); else e.dir = dd;
    });
  };

  F.resetRoom = async function (g, noAsk) {
    if (!noAsk) { var ok = await g.confirm('このへやを さいしょから やりなおす?'); if (!ok) return; }
    PF.sfx('warp'); await PF.fx.fade(1, 12);
    var e = F.entry; F.lastArea = F.map.area || F.map.name;
    F.load(F.map.id, { x: e.x, y: e.y, dir: e.dir });
    await PF.fx.fade(0, 12);
  };

  function updateParticles() {
    for (var i = F.particles.length - 1; i >= 0; i--) {
      var p = F.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--;
      if (p.life <= 0) F.particles.splice(i, 1);
    }
    // 点火中の燭台からの火の粉
    if (F.time % 5 === 0) F.ents.forEach(function (e) { if (e.type === 'brazier' && e.lit && onScreen(e)) F.particles.push({ x: e.x * T + 8 + (Math.random() - 0.5) * 4, y: e.y * T + 2, vx: (Math.random() - 0.5) * 0.3, vy: -0.4 - Math.random() * 0.4, life: 16, max: 16, col: Math.random() < 0.5 ? '#ffb030' : '#ff6a1a', g: 0 }); });
    F.flakes.forEach(function (f) { f.y += f.s; f.x += Math.sin(f.p + F.time / 40) * 0.3 + 0.35; if (f.y > H) { f.y = -2; f.x = Math.random() * W; } if (f.x > W) f.x = 0; });
  }
  function onScreen(e) { var c = F.cam; return Math.abs(e.x * T + 8 - c.x) < 150 && Math.abs(e.y * T + 8 - c.y) < 100; }

  /* ================= 描画 ================= */
  function pixCircle(g, cx, cy, r) {
    for (var y = -r; y <= r; y++) { var hw = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.fillRect(cx - hw, cy + y, hw * 2, 1); }
  }
  F.draw = function (g) {
    var m = F.map; if (!m) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    var c = F.cam, mw = m.w * T, mh = m.h * T;
    var cx = mw <= W ? -(W - mw) / 2 : PF.clamp(c.x - W / 2, 0, mw - W);
    var cy = mh <= H ? -(H - mh) / 2 : PF.clamp(c.y - H / 2, 0, mh - H);
    cx = Math.round(cx); cy = Math.round(cy);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    var x0 = Math.max(0, Math.floor(cx / T)), x1 = Math.min(m.w - 1, Math.floor((cx + W - 1) / T));
    var y0 = Math.max(0, Math.floor(cy / T)), y1 = Math.min(m.h - 1, Math.floor((cy + H - 1) / T));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) Tl.draw(g, m.tiles[y][x], x * T - cx, y * T - cy, x, y, F.time || 0);
    // 床の物体
    var list = F.ents.filter(function (e) { return !e.gone; });
    list.forEach(function (e) { if (e.type === 'plate') drawEnt(g, e, cx, cy); });
    list = list.filter(function (e) { return e.type !== 'plate'; }).sort(function (a, b) { return (a.py() + (a.type === 'ember' ? 20 : 0)) - (b.py() + (b.type === 'ember' ? 20 : 0)); });
    list.forEach(function (e) { drawEnt(g, e, cx, cy); });
    // 粒子
    F.particles.forEach(function (p) { g.globalAlpha = Math.min(1, p.life / (p.max * 0.5)); g.fillStyle = p.col; g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), 2, 2); });
    g.globalAlpha = 1;
    if (m.dark) drawDark(g, cx, cy);
    if (m.snow) { g.fillStyle = '#f4f8ff'; F.flakes.forEach(function (f) { g.fillRect(Math.round(f.x), Math.round(f.y), f.s > 0.9 ? 2 : 1, f.s > 0.9 ? 2 : 1); }); }
    // 吹き出し
    list.forEach(function (e) { if (e.emote) { var b = SP.bubble[e.emote.s]; if (b) g.drawImage(b, e.px() - cx, e.py() - cy - 13 - (e.emote.t > 30 ? 0 : 0)); } });
    // エリア名
    if (F.bannerT > 0) {
      var a = Math.min(1, F.bannerT / 14, (110 - F.bannerT) / 10), w = PF.font.width(F.banner) + 20;
      g.globalAlpha = Math.max(0, a); PF.ui.window(g, Math.round((W - w) / 2), 6, w, 18); PF.ui.textC(g, F.banner, 120, 11, '#ffe070'); g.globalAlpha = 1;
    }
  };

  function drawEnt(g, e, cx, cy) {
    var x = e.px() - cx, y = e.py() - cy;
    if (x < -20 || y < -24 || x > W + 4 || y > H + 4) return;
    var t = F.time || 0;
    switch (e.type) {
      case 'player': case 'npc': {
        var spr, bob = 0;
        if (e.sheet) {
          var fr = e.mv > 0 ? (e.par ? 1 : 3) : 0; if (e.mv > 0 && e.mv < 3) fr = 0;
          if (e.mv > 0 && fr !== 0) bob = 1;
          spr = e.sheet[e.dir][fr];
          g.drawImage(SP.shadow, x, y);
        } else if (e.sprite) { spr = e.sprite[((t / 40) | 0) % e.sprite.length]; g.drawImage(SP.shadow, x, y); }
        if (spr) g.drawImage(spr, x, y - bob - 1);
        break;
      }
      case 'ember': {
        var em = e, ex = x, ey = y;
        if (em.fly) { var f = em.fly, k = f.t < 10 ? f.t / 10 : (f.t < 20 ? 1 : (30 - f.t) / 10); ex = x + (f.tx - cx - x) * k; ey = y + (f.ty - cy - y) * k - 3 * k; }
        var bob2 = Math.round(Math.sin(t / 8) * 1.5);
        if (!em.fly && em.mv === 0 && em.x === F.player.x && em.y === F.player.y) { ex -= 9; ey -= 5; }
        g.globalAlpha = 0.4; g.drawImage(SP.shadow, ex, ey + 2); g.globalAlpha = 1;
        g.drawImage(SP.ember[((t / 7) | 0) % 4], ex, ey - 4 + bob2);
        break;
      }
      case 'sign': if (!e.def.invisible) g.drawImage(SP.sign, x, y); break;
      case 'chest': g.drawImage(SP.chest[e.open ? 1 : 0], x, y); break;
      case 'block': g.drawImage(SP.block, x, y); break;
      case 'plate': g.drawImage(SP.plate[e.pressed ? 1 : 0], x, y); break;
      case 'brazier': {
        var img = e.lit ? SP.brazier[1 + ((t / 6) | 0) % 3] : SP.brazier[0];
        if (e.lit && e.timer > 0 && e.timer < 90 && (t % 8 < 3)) img = SP.brazier[0];
        g.drawImage(img, x, y); break;
      }
      case 'gate': if (!e.open) g.drawImage(SP.gate, x, y); break;
      case 'barrier': case 'bramble': case 'iceblock':
        if (e.burn > 0 && (t % 4 < 2)) g.globalAlpha = 0.7;
        g.drawImage(SP[e.type], x, y); g.globalAlpha = 1; break;
      case 'orb': g.drawImage(SP.orb[((t / 14) | 0) % 2], x, y); break;
      case 'deco':
        if (e.def.kind === 'greatfire') { var lv = PF.flag('fire.level') || 0; g.drawImage(SP.greatfire[lv][((t / 6) | 0) % 3], x - 8, y - 16); }
        else if (e.sprite) g.drawImage(Array.isArray(e.sprite) ? e.sprite[((t / (e.def.fast ? 6 : 40)) | 0) % e.sprite.length] : e.sprite, x + (e.def.dx || 0), y + (e.def.dy || 0));
        break;
    }
  }

  function drawDark(g, cx, cy) {
    var m = F.map;
    if (!F.lightCanvas) F.lightCanvas = PF.makeCanvas(W, H);
    var lc = F.lightCanvas, lg = lc.getContext('2d');
    lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
    lg.fillStyle = 'rgba(6,4,18,' + m.dark + ')'; lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-out';
    function light(px, py, r) {
      var fl = Math.round(Math.sin((F.time || 0) / 9 + px) * 1);
      lg.fillStyle = 'rgba(0,0,0,0.30)'; pixCircle(lg, px, py, r + fl + 6);
      lg.fillStyle = 'rgba(0,0,0,0.45)'; pixCircle(lg, px, py, r + fl);
      lg.fillStyle = 'rgba(0,0,0,0.9)'; pixCircle(lg, px, py, Math.round(r * 0.62) + fl);
    }
    var pl = F.player; light(pl.px() + 8 - cx, pl.py() + 8 - cy, F.hasEmber() ? 44 : 28);
    F.ents.forEach(function (e) {
      if (e.gone) return;
      if ((e.type === 'brazier' && e.lit) || e.def.light) light(e.px() + 8 - cx, e.py() + 8 - cy, e.def.light || 34);
      if (e.type === 'deco' && e.def.kind === 'greatfire') { var lv = PF.flag('fire.level') || 0; if (lv > 0) light(e.px() + 8 - cx, e.py() + 4 - cy, 22 + lv * 14); }
    });
    lg.globalCompositeOperation = 'source-over';
    g.drawImage(lc, 0, 0);
  }

  F.onEnter = function () { };
  F.onResume = function () { };
})();
