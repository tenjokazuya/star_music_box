/* save.js — ゲームの状態（フラグ・持ち物・位置）と、3 スロットのセーブ・ロード
 *
 * Game.state … 進行中のゲームの状態。マップのスクリプトはフラグと持ち物だけを見て応答を変える。
 * セーブデータ（JSON）: { v, map, x, y, dir, flags, items, playSec, steps, savedAt, cleared }
 */
(function () {
  'use strict';

  var VERSION = 1;
  var SLOTS = 3;

  var save = Game.save = {
    SLOTS: SLOTS,
    slot: 0,           // いま使っているスロット（1〜3）。0 = まだ選んでいない
    dirty: false
  };

  function fresh() {
    return {
      v: VERSION,
      map: 'house', x: 6, y: 5, dir: 'down',
      flags: {}, items: [],
      playSec: 0, steps: 0, savedAt: 0, cleared: false
    };
  }

  Game.state = fresh();

  save.newGame = function (slot) {
    Game.state = fresh();
    save.slot = slot;
    return Game.state;
  };

  /* ---- フラグと持ち物 ---- */
  save.flag = function (n) { return !!Game.state.flags[n]; };
  save.set = function (n, v) { Game.state.flags[n] = (v === undefined ? true : !!v); save.dirty = true; };
  save.clear = function (n) { delete Game.state.flags[n]; save.dirty = true; };
  save.count = function (prefix) {
    var n = 0;
    for (var k in Game.state.flags) {
      if (Object.prototype.hasOwnProperty.call(Game.state.flags, k) && k.indexOf(prefix) === 0 && Game.state.flags[k]) { n++; }
    }
    return n;
  };
  save.has = function (id) { return Game.state.items.indexOf(id) >= 0; };
  save.give = function (id) { if (!save.has(id)) { Game.state.items.push(id); } save.dirty = true; };
  save.take = function (id) {
    var i = Game.state.items.indexOf(id);
    if (i >= 0) { Game.state.items.splice(i, 1); }
    save.dirty = true;
  };

  /** 条件オブジェクトを評価する（マップのページ条件など） */
  save.test = function (c, S) {
    if (c === undefined || c === null || c === true) { return true; }
    if (typeof c === 'function') { return !!c(S || Game.script.api); }
    if (typeof c === 'string') { return save.flag(c); }
    if (c.flag !== undefined && !save.flag(c.flag)) { return false; }
    if (c.flags && !c.flags.every(save.flag)) { return false; }
    if (c.not !== undefined) {
      var nots = c.not instanceof Array ? c.not : [c.not];
      if (nots.some(save.flag)) { return false; }
    }
    if (c.item !== undefined && !save.has(c.item)) { return false; }
    if (c.items && !c.items.every(save.has)) { return false; }
    if (c.noItem !== undefined && save.has(c.noItem)) { return false; }
    if (c.all && !c.all.every(function (x) { return save.test(x, S); })) { return false; }
    if (c.any && !c.any.some(function (x) { return save.test(x, S); })) { return false; }
    if (c.fn && !c.fn(S || Game.script.api)) { return false; }
    return true;
  };

  /* ---- スロット ---- */
  function key(i) { return 'save.' + i; }

  save.read = function (i) {
    var s = Game.store.get(key(i), null);
    if (!s || s.v !== VERSION || !s.flags) { return null; }
    return s;
  };
  save.list = function () {
    var out = [];
    for (var i = 1; i <= SLOTS; i++) { out.push(save.read(i)); }
    return out;
  };
  save.write = function (i) {
    var s = Game.state;
    s.savedAt = Date.now();
    var copy = Game.util.deepCopy(s);
    Game.store.set(key(i), copy);
    save.dirty = false;
    return copy;
  };
  save.erase = function (i) { Game.store.remove(key(i)); };
  save.load = function (i) {
    var s = save.read(i);
    if (!s) { return null; }
    Game.state = s;
    save.slot = i;
    return s;
  };

  /** 現在の位置などを state に反映してから、現在のスロットに書く */
  save.commit = function () {
    if (!save.slot) { return false; }
    var F = Game.field;
    if (F && F.snapshot) { F.snapshot(); }
    save.write(save.slot);
    return true;
  };

  /** セーブ一覧に出す要約 */
  save.summary = function (s) {
    if (!s) { return null; }
    var map = Game.maps && Game.maps.list[s.map];
    var items = 0;
    ['got_oil', 'got_lens', 'got_flint'].forEach(function (f) { if (s.flags[f]) { items++; } });
    var stars = 0;
    for (var k in s.flags) { if (k.indexOf('star_') === 0 && s.flags[k]) { stars++; } }
    return { place: map ? map.name : '？', time: Game.util.formatTime(s.playSec), cleared: !!s.cleared, parts: items, stars: stars };
  };
})();
