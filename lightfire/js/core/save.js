/* save.js — ゲーム状態・フラグ・条件評価・セーブ/ロード・設定 */
(function () {
  'use strict';
  var KEY = 'pf_save_', SKEY = 'pf_settings_v1';
  var mem = {}; // localStorage が使えない環境用
  function lsGet(k) { try { var v = window.localStorage.getItem(k); return v === null ? (mem[k] || null) : v; } catch (e) { return mem[k] || null; } }
  function lsSet(k, v) { mem[k] = v; try { window.localStorage.setItem(k, v); } catch (e) { } }

  PF.state = null;
  PF.settings = { bgm: 7, sfx: 8, text: 1, vib: 1 };

  /* ---------- 新規ゲーム ---------- */
  PF.newState = function () {
    return {
      v: 1, flags: { ch: 0, 'fire.level': 3 },
      hero: { name: 'アカリ', lv: 1, exp: 0, hp: 32, mp: 8, weapon: 'stick', armor: 'cloth', acc: null, skills: [] },
      items: { herb: 3 }, gold: 30,
      map: { id: 'kotori_home', x: 3, y: 4, dir: 'd' },
      spawn: null, playTime: 0, steps: 0, clear: false
    };
  };

  /* ---------- フラグ・条件 ---------- */
  PF.flag = function (n) { var v = PF.state.flags[n]; return v === undefined ? false : v; };
  PF.setFlag = function (n, v) { PF.state.flags[n] = (v === undefined ? true : v); PF.emit('flag', n, PF.state.flags[n]); };
  PF.addFlag = function (n, d) { PF.setFlag(n, (PF.state.flags[n] || 0) + (d === undefined ? 1 : d)); };
  function arr(x) { return Array.isArray(x) ? x : [x]; }
  PF.cond = function (w, g) {
    if (!w) return true;
    if (typeof w === 'function') return !!w(g);
    var ok = true;
    if (w.flag !== undefined) arr(w.flag).forEach(function (f) { if (!PF.flag(f)) ok = false; });
    if (w.not !== undefined) arr(w.not).forEach(function (f) { if (PF.flag(f)) ok = false; });
    if (w.gte) { if (!((PF.flag(w.gte[0]) || 0) >= w.gte[1])) ok = false; }
    if (w.lt) { if (!((PF.flag(w.lt[0]) || 0) < w.lt[1])) ok = false; }
    if (w.eq) { if (PF.flag(w.eq[0]) !== w.eq[1]) ok = false; }
    if (w.item) arr(w.item).forEach(function (i) { if (!PF.hasItem(i)) ok = false; });
    if (w.all) w.all.forEach(function (c) { if (!PF.cond(c, g)) ok = false; });
    if (w.any) { var any = false; w.any.forEach(function (c) { if (PF.cond(c, g)) any = true; }); if (!any) ok = false; }
    if (w.fn && !w.fn(g)) ok = false;
    return ok;
  };

  /* ---------- 持ち物 ---------- */
  PF.hasItem = function (id) { return (PF.state.items[id] || 0) > 0; };
  PF.addItem = function (id, n) {
    n = n === undefined ? 1 : n;
    var v = (PF.state.items[id] || 0) + n; if (v <= 0) delete PF.state.items[id]; else PF.state.items[id] = Math.min(v, 99);
  };
  PF.addGold = function (n) { PF.state.gold = PF.clamp(PF.state.gold + n, 0, 99999); };

  /* ---------- セーブ ---------- */
  PF.save = {
    slots: 3,
    info: function (n) {
      var raw = lsGet(KEY + n); if (!raw) return null;
      try { var d = JSON.parse(raw); return d.meta ? d.meta : null; } catch (e) { return null; }
    },
    write: function (n) {
      var s = PF.state, m = PF.maps.current;
      var meta = { lv: s.hero.lv, time: Math.floor(s.playTime), place: (m && m.name) || '', clear: !!s.clear, at: Date.now(), ch: s.flags.ch || 0 };
      lsSet(KEY + n, JSON.stringify({ meta: meta, state: s }));
      return true;
    },
    read: function (n) {
      var raw = lsGet(KEY + n); if (!raw) return false;
      try { var d = JSON.parse(raw); PF.state = d.state; PF.migrate(); return true; } catch (e) { console.error(e); return false; }
    },
    erase: function (n) { try { window.localStorage.removeItem(KEY + n); } catch (e) { } delete mem[KEY + n]; },
    lastUsed: function () {
      var best = -1, t = 0;
      for (var i = 0; i < PF.save.slots; i++) { var m = PF.save.info(i); if (m && m.at > t) { t = m.at; best = i; } }
      return best;
    },
    any: function () { for (var i = 0; i < PF.save.slots; i++) if (PF.save.info(i)) return true; return false; },
    loadSettings: function () {
      var raw = lsGet(SKEY);
      if (raw) { try { var d = JSON.parse(raw); for (var k in d) PF.settings[k] = d[k]; } catch (e) { } }
      PF.audio.setVolume(PF.settings.bgm, PF.settings.sfx);
    },
    saveSettings: function () { lsSet(SKEY, JSON.stringify(PF.settings)); PF.audio.setVolume(PF.settings.bgm, PF.settings.sfx); }
  };
  // 旧バージョンのセーブを補完
  PF.migrate = function () {
    var d = PF.newState(), s = PF.state;
    for (var k in d) if (s[k] === undefined) s[k] = d[k];
    if (!s.flags) s.flags = { ch: 0 };
  };
})();
