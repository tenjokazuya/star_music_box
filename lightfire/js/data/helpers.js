/* helpers.js — マップ記述を短くする補助（PF.h）。マップファイルから使う */
(function () {
  'use strict';
  var H = PF.h = {};
  H.hot = function (x, y, text) { return { type: 'sign', invisible: true, x: x, y: y, text: text }; };
  H.sign = function (x, y, text, id) { return { type: 'sign', id: id || ('sign_' + x + '_' + y), x: x, y: y, text: text }; };
  H.chest = function (id, x, y, item, n) { var o = { type: 'chest', id: id, x: x, y: y }; if (typeof item === 'number') o.gold = item; else { o.item = item; if (n) o.n = n; } return o; };
  H.warp = function (x, y, to, entry, sfx, w, h) { var o = { type: 'warp', x: x, y: y, to: to, entry: entry, sfx: sfx || 'stairs' }; if (w) o.w = w; if (h) o.h = h; return o; };
  H.light = function (id, x, y, r) { return { type: 'deco', id: id, x: x, y: y, light: r || 30, solid: false }; };
  H.block = function (id, x, y) { return { type: 'block', id: id, x: x, y: y }; };
  H.plate = function (id, x, y, group, blockOnly) { return { type: 'plate', id: id, x: x, y: y, group: group, blockOnly: !!blockOnly }; };
  H.gate = function (id, x, y, open) { return { type: 'gate', id: id, x: x, y: y, open: !!open, text: 'かたく とざされている。' }; };
  H.brazier = function (id, x, y, group, o) { var b = { type: 'brazier', id: id, x: x, y: y, group: group }; if (o) for (var k in o) b[k] = o[k]; return b; };
  // 人物。lines は 文字列 / 配列 / 関数(g)。who は 名前
  H.npc = function (id, look, x, y, dir, lines, who, o) {
    var n = { type: 'npc', id: id, x: x, y: y, dir: dir, look: typeof look === 'string' ? PF.db.look(look) : look };
    n.talk = typeof lines === 'function' ? function (g, e) { return lines(g, e, who); } : async function (g) { await g.say(lines, who); };
    if (o) for (var k in o) n[k] = o[k];
    return n;
  };
  // 解決済みパズルの部分: remove と gate(open) を返す
  H.solvedPart = function (map, pid, flag, ids, gates, extra) {
    var o = { when: { flag: flag }, remove: ids.concat(gates.map(function (g) { return g.id; })), objects: gates.map(function (g) { return { type: 'gate', id: g.id, x: g.x, y: g.y, open: true }; }) };
    if (extra) for (var k in extra) o[k] = extra[k];
    PF.maps.part(map, pid, o);
  };
  // 洞窟・塔の部屋を作る（四方を壁にして内側の床を掘る）
  H.cave = function (w, h, wall, floor) {
    var m = PF.mk.new(w, h, wall || 'X'); return m;
  };
  H.gold = function (n) { return n; };
})();
