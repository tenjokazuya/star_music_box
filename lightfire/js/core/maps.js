/* maps.js — マップ登録（基本 + 部品）と、進行フラグに応じた解決 */
(function () {
  'use strict';
  var bases = {}, parts = {};
  var M = PF.maps = {
    current: null,
    // 基本マップ: 地形(rows)・不変の物体・BGM など
    base: function (id, def) { def.id = id; bases[id] = def; },
    // マップ部品: フラグ条件 when を満たすときだけ重ねる（NPC・イベント・地形の差し替え）
    part: function (id, pid, def) { def.id = pid; def.map = id; (parts[id] = parts[id] || []).push(def); },
    ids: function () { return Object.keys(bases); },
    raw: function (id) { return bases[id]; },
    partsOf: function (id) { return parts[id] || []; },

    // opts.all=true で when を無視して全部品を重ねる（静的検証用）
    resolve: function (id, opts) {
      opts = opts || {};
      var b = bases[id];
      if (!b) throw new Error('マップ未定義: ' + id);
      var rows = b.rows.map(function (r) { return r.split(''); });
      var h = rows.length, w = rows[0].length;
      var objs = [], entries = {}, onEnter = [], puzzles = [];
      var out = {
        puzzles: puzzles, area: b.area, showName: b.showName,
        id: id, name: b.name || id, w: w, h: h, tiles: rows, bgm: b.bgm, ambience: b.ambience || [], encounter: b.encounter || null,
        dark: b.dark || 0, snow: !!b.snow, reset: !!b.reset, indoor: !!b.indoor, objs: objs, entries: entries, onEnter: onEnter, hint: b.hint
      };
      var fill = b.fill || '.';
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var ch = rows[y][x], mk = b.marks && b.marks[ch];
        if (mk) {
          rows[y][x] = mk.under || fill;
          if (mk.entry) entries[mk.entry] = { x: x, y: y, dir: mk.dir || 'd' };
          else { var o = {}; for (var k in mk) if (k !== 'under') o[k] = mk[k]; o.x = x; o.y = y; objs.push(o); }
        } else if (!PF.tiles.defs[ch]) { throw new Error(id + ': 未定義のタイル文字 "' + ch + '" (' + x + ',' + y + ')'); }
      }
      (b.entries ? Object.keys(b.entries) : []).forEach(function (k) { entries[k] = b.entries[k]; });
      (b.objects || []).forEach(function (o) { objs.push(o); });
      if (b.onEnter) onEnter.push(b.onEnter);
      if (b.puzzles) b.puzzles.forEach(function (q) { puzzles.push(q); });
      // 部品
      var used = [];
      (parts[id] || []).forEach(function (p) {
        if (!opts.all && !PF.cond(p.when)) return;
        used.push(p.id);
        if (p.convert) rows.forEach(function (r) { for (var i = 0; i < r.length; i++) if (p.convert[r[i]]) r[i] = p.convert[r[i]]; });
        if (p.tiles) p.tiles.forEach(function (t) { if (rows[t.y]) rows[t.y][t.x] = t.ch; });
        if (p.patch) p.patch.rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] !== ' ' && rows[p.patch.y + j]) rows[p.patch.y + j][p.patch.x + i] = r[i]; });
        if (p.remove) p.remove.forEach(function (rid) { for (var i = objs.length - 1; i >= 0; i--) if (objs[i].id === rid) objs.splice(i, 1); });
        if (p.objects) p.objects.forEach(function (o) { objs.push(o); });
        if (p.entries) for (var e in p.entries) entries[e] = p.entries[e];
        if (p.bgm) out.bgm = p.bgm;
        if (p.ambience) out.ambience = p.ambience;
        if (p.encounter !== undefined) out.encounter = p.encounter;
        if (p.dark !== undefined) out.dark = p.dark;
        if (p.snow !== undefined) out.snow = p.snow;
        if (p.onEnter) onEnter.push(p.onEnter);
        if (p.puzzles) p.puzzles.forEach(function (q) { puzzles.push(q); });
        if (p.reset !== undefined) out.reset = p.reset;
        if (p.hint !== undefined) out.hint = p.hint;
      });
      out.parts = used;
      objs.forEach(function (o, i) { if (!o.id) o.id = o.type + '_' + o.x + '_' + o.y; });
      return out;
    }
  };
})();
