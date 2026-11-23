/* マップ登録 / 構築 / 進行度別レイヤーの適用 / 事前描画 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, T = RR.Tiles, Props = RR.Props;
  var TS = 16;
  var Maps = RR.Maps = { defs: {}, layers: {}, order: 0 };

  // 地形（変化しない部分）
  Maps.defineMap = function (id, def) { def.id = id; Maps.defs[id] = def; };
  // 進行度で有効になるレイヤー
  Maps.layer = function (mapId, layerId, def) {
    def.id = layerId; def.map = mapId; def._order = Maps.order++;
    var arr = Maps.layers[mapId] = Maps.layers[mapId] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === layerId) { arr[i] = def; return; }
    arr.push(def);
  };
  Maps.activeLayers = function (mapId, S) {
    return (Maps.layers[mapId] || []).filter(function (l) {
      try { return !l.when || l.when(S, RR.State); } catch (e) { RR.reportError(e); return false; }
    });
  };

  // ---------- ビルダー ----------
  function Builder(def) {
    this.w = def.w; this.h = def.h;
    this.ground = new Array(def.w * def.h);
    this.solidOv = {};
    this.props = [];
    this.warps = {};
    this.lights = [];
    this.spots = {};
    this.events = [];
    this.fill(def.base || 'grass');
  }
  var B = Builder.prototype;
  B.inb = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; };
  B.set = function (x, y, id) { if (this.inb(x, y)) this.ground[y * this.w + x] = id; return this; };
  B.get = function (x, y) { return this.inb(x, y) ? this.ground[y * this.w + x] : null; };
  B.fill = function (id) { for (var i = 0; i < this.ground.length; i++) this.ground[i] = id; return this; };
  B.rect = function (x, y, w, h, id) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) this.set(i, j, id); return this; };
  B.hline = function (x1, x2, y, id) { return this.rect(Math.min(x1, x2), y, Math.abs(x2 - x1) + 1, 1, id); };
  B.vline = function (x, y1, y2, id) { return this.rect(x, Math.min(y1, y2), 1, Math.abs(y2 - y1) + 1, id); };
  B.border = function (id, t) {
    t = t || 1;
    this.rect(0, 0, this.w, t, id); this.rect(0, this.h - t, this.w, t, id);
    this.rect(0, 0, t, this.h, id); this.rect(this.w - t, 0, t, this.h, id);
    return this;
  };
  // 文字列でまとめて地形を置く
  B.ascii = function (x, y, rows, legend) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j][i];
      if (legend[ch]) this.set(x + i, y + j, legend[ch]);
    }
    return this;
  };
  B.prop = function (type, x, y, o) {
    o = o || {};
    o.type = type; o.x = x; o.y = y;
    this.props.push(o);
    return o;
  };
  B.building = function (x, y, w, h, o) { o = o || {}; o.w = w; o.h = h; return this.prop('building', x, y, o); };
  B.tree = function (x, y, kind) { return this.prop('tree', x, y, { kind: kind }); };
  B.trees = function (list, kind) { var self = this; list.forEach(function (p) { self.tree(p[0], p[1], p[2] || kind); }); return this; };
  B.lamp = function (x, y, o) { return this.prop('lamp', x, y, o); };
  B.solid = function (x, y, v) { this.solidOv[x + ',' + y] = v === undefined ? true : v; return this; };
  B.warp = function (x, y, to) { this.warps[x + ',' + y] = to; return this; };
  B.door = function (x, y, to) { to.door = true; return this.warp(x, y, to); };
  B.light = function (px, py, r, c) { this.lights.push({ x: px, y: py, r: r, c: c || '#f8e0a0' }); return this; };
  B.spot = function (name, x, y, dir) { this.spots[name] = { x: x, y: y, dir: dir || 'down' }; return this; };
  // 調べると反応する物（看板など）を地形側に書く場合
  B.check = function (x, y, run) { this.events.push({ x: x, y: y, on: 'talk', run: run }); return this; };
  Maps.Builder = Builder;

  // ---------- 構築（マップに入るたびに呼ぶ） ----------
  Maps.load = function (id) {
    var def = Maps.defs[id];
    if (!def) throw new Error('map not found: ' + id);
    var S = RR.State.S;
    var M = new Builder(def);
    def.build(M, S);
    var layers = Maps.activeLayers(id, S);
    layers.forEach(function (l) {
      if (l.tiles) l.tiles.forEach(function (t) { M.set(t.x, t.y, t.g); });
      if (l.build) l.build(M, S);
    });
    var map = {
      id: id, def: def, w: M.w, h: M.h, name: def.name || '', ground: M.ground,
      solid: new Uint8Array(M.w * M.h), warps: M.warps, props: M.props, lights: M.lights.slice(),
      spots: M.spots, npcs: [], events: M.events.slice(), enters: [], layers: layers, anim: [], dyn: [],
      dark: def.dark, ambient: def.ambient, bgm: def.bgm, amb: def.amb
    };
    // レイヤーのNPC・イベント（後のレイヤーが同IDを上書き）
    var npcIdx = {};
    layers.forEach(function (l) {
      (l.npcs || []).forEach(function (n) {
        if (n.when && !n.when(S, RR.State)) return;
        if (npcIdx.hasOwnProperty(n.id)) map.npcs[npcIdx[n.id]] = n;
        else { npcIdx[n.id] = map.npcs.length; map.npcs.push(n); }
      });
      (l.events || []).forEach(function (e) { map.events.push(e); });
      if (l.enter) map.enters.push(l.enter);
      if (l.bgm) map.bgm = typeof l.bgm === 'function' ? l.bgm(S) : l.bgm;
      if (l.dark != null) map.dark = l.dark;
      if (l.ambient) map.ambient = l.ambient;
    });
    map.npcs = map.npcs.filter(function (n) { return !n.removed; });
    // 衝突
    for (var i = 0; i < map.ground.length; i++) {
      var td = T.defs[map.ground[i]];
      if (td && td.solid) map.solid[i] = 1;
    }
    map.props.forEach(function (p) {
      var d = Props.defs[p.type];
      if (!d) return;
      var cells;
      if (p.nosolid) cells = [];
      else if (d.solid) cells = d.solid(p);
      else { var sz = d.size(p); cells = []; for (var y = 0; y < sz[1]; y++) for (var x = 0; x < sz[0]; x++) cells.push([x, y]); }
      cells.forEach(function (c) {
        var xx = p.x + c[0], yy = p.y + c[1];
        if (xx >= 0 && yy >= 0 && xx < map.w && yy < map.h) map.solid[yy * map.w + xx] = 1;
      });
      if (p.dynamic) map.dyn.push(p);
    });
    for (var k in M.solidOv) {
      var xy = k.split(',');
      map.solid[(+xy[1]) * map.w + (+xy[0])] = M.solidOv[k] ? 1 : 0;
    }
    return map;
  };

  Maps.tileAt = function (map, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return null;
    return map.ground[y * map.w + x];
  };

})();
