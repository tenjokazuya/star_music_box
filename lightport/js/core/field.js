/* field.js — マップ上の世界: マップ読み込み、移動、イベント、押し物、カメラ、描画、画面効果
 *
 * マップ定義は Game.maps.register({...}) で登録する（js/maps/*.js）。書式は managements/30_design/map-script-guide.md。
 * シーン Game.scenes.field が Game.field を使って動く。
 */
(function () {
  'use strict';

  var T = Game.T, W = Game.W, H = Game.H;
  var util = Game.util, save = Game.save, ui = Game.ui;

  /* ---- マップの登録先 ---- */
  Game.maps = {
    list: {},
    register: function (def) {
      if (!def || !def.id) { throw new Error('マップに id がない'); }
      this.list[def.id] = def;
    }
  };

  var F = Game.field = {
    map: null,        // 実行時のマップ
    player: null,
    ents: [],
    tick: 0,
    cam: { x: 0, y: 0, pan: null, panSpeed: 0.14 },
    running: false,   // スクリプト実行中
    transition: false,
    lastMapName: null
  };

  var M = null, P = null, ents = [];
  var tint = { cur: [255, 255, 255], target: [255, 255, 255] };
  var particles = [];
  var fogCv = null;
  var shadowCv = null;
  var waiters = [];     // { n, resolve } フレーム待ち

  function key(x, y) { return x + ',' + y; }

  /* ================= 時間帯 ================= */
  var TOD = {
    day:     [255, 255, 255],
    dawn:    [255, 222, 200],
    dusk:    [255, 218, 178],
    evening: [228, 188, 214],
    night:   [156, 166, 232],
    deep:    [134, 146, 214]
  };
  F.TOD = TOD;
  F.timeOfDay = function () {
    if (save.flag('cleared')) { return 'day'; }
    if (save.flag('lamp_lit')) { return 'dawn'; }
    var n = 0;
    ['got_oil', 'got_lens', 'got_flint'].forEach(function (f) { if (save.flag(f)) { n++; } });
    return ['dusk', 'evening', 'night', 'deep'][n];
  };

  /* ================= マップの読み込み ================= */
  function tileName(def, ch) {
    var n = def.legend[ch];
    if (!n) { throw new Error(def.id + ': 凡例にない文字「' + ch + '」'); }
    return n;
  }

  function buildGround(m) {
    var w = m.w, h = m.h, defs = Game.tiles.defs;
    var anyAnim = false;
    for (var y = 0; y < h; y++) { for (var x = 0; x < w; x++) { if (defs[m.ground[y][x]].anim) { anyAnim = true; } } }
    function nbAt(x, y) {
      return function (dx, dy) {
        var xx = Math.max(0, Math.min(w - 1, x + dx)), yy = Math.max(0, Math.min(h - 1, y + dy));
        return m.ground[yy][xx];
      };
    }
    var base = Game.gfx.create(w * T, h * T);
    for (var y2 = 0; y2 < h; y2++) {
      for (var x2 = 0; x2 < w; x2++) { Game.tiles.draw(base.g, m.ground[y2][x2], x2, y2, 0, nbAt(x2, y2)); }
    }
    m.frames = [base.canvas];
    if (anyAnim) {
      for (var f = 1; f < Game.tiles.ANIM_FRAMES; f++) {
        var o = Game.gfx.create(w * T, h * T);
        o.g.drawImage(base.canvas, 0, 0);
        for (var y3 = 0; y3 < h; y3++) {
          for (var x3 = 0; x3 < w; x3++) {
            if (defs[m.ground[y3][x3]].anim) { Game.tiles.draw(o.g, m.ground[y3][x3], x3, y3, f, nbAt(x3, y3)); }
          }
        }
        m.frames.push(o.canvas);
      }
    }
  }

  function makeEntity(raw, kind) {
    var e = {
      raw: raw, id: raw.id, kind: kind || 'event',
      tx: raw.x || 0, ty: raw.y || 0, w: raw.w || 1, h: raw.h || 1,
      px: 0, py: 0, dir: raw.dir || 'down',
      moving: false, step: 0, to: null, speed: 1, moveRes: null,
      anim: 0, frame: 0, hidden: false, solid: false, cur: {}, page: null,
      home: { x: raw.x || 0, y: raw.y || 0 }, wanderT: 60 + Math.floor(Math.random() * 120),
      pressed: false, sort: 0
    };
    e.px = e.tx * T; e.py = e.ty * T;
    return e;
  }

  /** イベントの現在のページを選び、見た目と挙動を更新する */
  function evalEntity(e) {
    var raw = e.raw, page = null;
    if (raw.pages) {
      for (var i = 0; i < raw.pages.length; i++) {
        if (save.test(raw.pages[i].if)) { page = raw.pages[i]; break; }
      }
    } else {
      page = raw.if === undefined || save.test(raw.if) ? raw : null;
    }
    e.page = page;
    var cur = {};
    e.override = e.override || {};
    var keys = ['sprite', 'solid', 'trigger', 'wander', 'facePlayer', 'name', 'light', 'sparkle', 'push', 'plate', 'warp', 'fx', 'noShadow', 'speed', 'frames', 'zone'];
    keys.forEach(function (k) { if (raw[k] !== undefined) { cur[k] = raw[k]; } });
    if (page) { keys.concat(['run', 'dir']).forEach(function (k) { if (page[k] !== undefined) { cur[k] = page[k]; } }); }
    if (raw.run !== undefined && cur.run === undefined && !raw.pages) { cur.run = raw.run; }
    if (e.override.sprite) { cur.sprite = e.override.sprite; }
    e.cur = cur;
    e.hidden = !page || (page.hidden === true) || (raw.hidden === true && !(page && page.hidden === false));
    e.solid = cur.solid !== undefined ? !!cur.solid : (!!cur.sprite && !cur.sparkle && !cur.warp && !cur.zone && !cur.plate);
    // ページが切り替わったときだけ、位置と向きを決め直す（押した岩や話しかけた向きを戻さない）
    var pageIdx = raw.pages ? raw.pages.indexOf(page) : 0;
    var pageChanged = e.pageIdx === undefined || e.pageIdx !== pageIdx;
    e.pageIdx = pageIdx;
    if (pageChanged && page && page.x !== undefined && !e.moving) { e.tx = page.x; e.ty = page.y; e.px = e.tx * T; e.py = e.ty * T; }
    if (pageChanged && page && page.dir && !e.moving) { e.dir = page.dir; }
    if (e.override.hidden !== undefined) { e.hidden = e.override.hidden; }
    if (cur.push) { e.solid = true; }
    if (!cur.trigger) {
      if (cur.warp || cur.zone) { cur.trigger = 'step'; }
      else if (cur.run) { cur.trigger = 'talk'; }
    }
  }

  function addProp(m, name, x, y) {
    var pr = Game.props.get(name);
    var e = makeEntity({ x: x, y: y, w: pr.fw, h: pr.fh }, 'prop');
    e.prop = pr; e.propName = name; e.solid = pr.solid; e.sort = (y + pr.fh) * T;
    if (pr.floor) { e.sort = -1; }
    e.static = true;
    return e;
  }

  F.refresh = function () {
    ents.forEach(function (e) { if (e.kind === 'event') { evalEntity(e); } });
    updateTint(false);
  };

  function loadMap(id) {
    var def = Game.maps.list[id];
    if (!def) { throw new Error('マップがない: ' + id); }
    var m = { def: def, id: id, name: def.name, h: def.ground.length, w: def.ground[0].length };
    m.bg = def.bg || '#000000';
    m.ground = def.ground.map(function (row, y) {
      if (row.length !== m.w) { throw new Error(id + ': ground の ' + y + ' 行目の長さが違う (' + row.length + ' != ' + m.w + ')'); }
      var a = [];
      for (var x = 0; x < row.length; x++) { a.push(tileName(def, row.charAt(x))); }
      return a;
    });
    m.solid = [];
    for (var y = 0; y < m.h; y++) {
      m.solid.push([]);
      for (var x = 0; x < m.w; x++) { m.solid[y].push(!!Game.tiles.defs[m.ground[y][x]].solid); }
    }
    M = F.map = m;
    buildGround(m);

    ents = []; particles = [];
    // 小物（文字の並び）
    if (def.objects) {
      var legend = def.objLegend || {};
      def.objects.forEach(function (row, y) {
        for (var x = 0; x < row.length; x++) {
          var ch = row.charAt(x);
          if (ch === '.' || ch === ' ') { continue; }
          var pn = legend[ch];
          if (!pn) { throw new Error(id + ': objLegend にない文字「' + ch + '」'); }
          ents.push(addProp(m, pn, x, y));
        }
      });
    }
    (def.props || []).forEach(function (p) {
      var e = addProp(m, p.type, p.x, p.y);
      if (p.id) { e.id = p.id; }
      if (p.hidden) { e.hidden = true; }
      ents.push(e);
    });
    // 小物の当たり判定
    ents.forEach(function (e) {
      if (e.kind !== 'prop' || !e.solid) { return; }
      var pr = e.prop;
      for (var yy = 0; yy < pr.fh; yy++) {
        for (var xx = 0; xx < pr.fw; xx++) {
          var cx = e.tx + xx, cy = e.ty + yy;
          if (pr.shape === 'house' && yy === pr.fh - 1 && xx === pr.doorX) { continue; }
          if (cx >= 0 && cy >= 0 && cx < m.w && cy < m.h) { m.solid[cy][cx] = true; }
        }
      }
    });
    (def.blocked || []).forEach(function (b) {
      for (var yy = 0; yy < (b.h || 1); yy++) { for (var xx = 0; xx < (b.w || 1); xx++) { if (m.solid[b.y + yy]) { m.solid[b.y + yy][b.x + xx] = true; } } }
    });
    // イベント
    (def.events || []).forEach(function (raw) {
      var e = makeEntity(raw, 'event');
      if (raw.sprite && typeof raw.sprite === 'string' && !Game.sprites.specs[raw.sprite] && ['cat', 'cat2', 'gull', 'crab'].indexOf(raw.sprite) < 0 && !Game.props.has(raw.sprite)) {
        throw new Error(id + ': スプライトがない ' + raw.sprite);
      }
      ents.push(e);
    });
    ents.forEach(function (e) { if (e.kind === 'event') { evalEntity(e); } });
    return m;
  }

  /* ================= 当たり判定 ================= */
  function inEnt(e, x, y) { return x >= e.tx && x < e.tx + e.w && y >= e.ty && y < e.ty + e.h; }
  function entBlocks(e) { return !e.hidden && e.solid && e.kind !== 'prop'; }
  /** 移動中の物は行き先も占有しているとみなす */
  function entAt(x, y, skip, pred) {
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e === skip || e.hidden) { continue; }
      if (pred && !pred(e)) { continue; }
      if (inEnt(e, x, y)) { return e; }
      if (e.moving && e.to && e.to.x === x && e.to.y === y) { return e; }
    }
    return null;
  }
  F.entAt = entAt;

  function tileSolid(x, y) {
    if (x < 0 || y < 0 || x >= M.w || y >= M.h) { return true; }
    return M.solid[y][x];
  }
  function blockedBy(x, y, skip) {
    if (tileSolid(x, y)) { return { tile: true }; }
    var e = entAt(x, y, skip, function (q) { return q.solid && q.kind !== 'prop'; });
    if (e) { return { ent: e }; }
    return null;
  }
  F.blockedBy = blockedBy;

  /* ================= 移動 ================= */
  function startMove(e, dir, speed) {
    var d = util.DIRS[dir];
    e.dir = dir; e.moving = true; e.step = 0; e.speed = speed || 1;
    e.to = { x: e.tx + d.x, y: e.ty + d.y };
    e.walkFoot = !e.walkFoot;
  }
  function advanceMove(e) {
    e.step += e.speed;
    var d = util.DIRS[e.dir];
    var s = Math.min(16, e.step);
    e.px = e.tx * T + d.x * s; e.py = e.ty * T + d.y * s;
    if (e.step >= 16) {
      e.tx = e.to.x; e.ty = e.to.y; e.px = e.tx * T; e.py = e.ty * T;
      e.moving = false; e.to = null; e.step = 0;
      if (e.moveRes) { var r = e.moveRes; e.moveRes = null; r(); }
      return true;
    }
    return false;
  }

  function stepSound(p) {
    var name = M.ground[p.ty] ? M.ground[p.ty][p.tx] : 'grass';
    var t = Game.tiles.defs[name];
    var type = t ? t.step : 'grass';
    if (M.def.step) { type = M.def.step; }
    Game.audio.sfx('step_' + type, { rate: 0.92 + (p.walkFoot ? 0.1 : 0), vol: p.speed > 1 ? 0.85 : 1 });
  }

  function playerArrive() {
    var p = P;
    Game.state.steps++;
    stepSound(p);
    if (p.speed > 1 && Math.random() < 0.5) { particles.push({ t: 'dust', x: p.px + 8, y: p.py + 14, vx: (Math.random() - 0.5) * 0.3, vy: -0.15, life: 14, max: 14 }); }
    if (p.scripted) { return; }
    // 足もとのイベント
    var hit = [];
    ents.forEach(function (e) {
      if (e.hidden || e.kind !== 'event' || e.cur.trigger !== 'step') { return; }
      if (inEnt(e, p.tx, p.ty)) { hit.push(e); }
    });
    if (hit.length) {
      var e0 = hit[0];
      if (e0.cur.warp) { F.warp(e0.cur.warp, e0); }
      else if (e0.cur.run) { F.run(e0.cur.run, e0); }
    }
  }

  /** プレイヤーを 1 歩動かそうとする */
  function tryMove(dir) {
    var p = P, d = util.DIRS[dir];
    var nx = p.tx + d.x, ny = p.ty + d.y;
    var b = blockedBy(nx, ny, p);
    if (!b) {
      startMove(p, dir, Game.input.held('b') ? 2 : 1);
      return true;
    }
    if (b.ent) {
      var e = b.ent;
      if (e.cur.push && !e.moving) {
        var bx = nx + d.x, by = ny + d.y;
        var onExit = entAt(bx, by, e, function (q) { return q.kind === 'event' && (q.cur.warp || q.cur.zone); });
        if (!onExit && !blockedBy(bx, by, e) && !entAt(bx, by, e, function (q) { return q === p || q.solid; })) {
          startMove(p, dir, 1); startMove(e, dir, 1); e.pushedBy = p;
          Game.audio.sfx('push');
          return true;
        }
      }
      if (e.cur.trigger === 'touch' && e.cur.run) { F.run(e.cur.run, e); return false; }
    }
    // ぶつかった
    if (!p.bumpCool) { Game.audio.sfx('bump'); p.bumpCool = 14; }
    return false;
  }

  function tryInteract() {
    var p = P, d = util.DIRS[p.dir];
    var fx = p.tx + d.x, fy = p.ty + d.y;
    // 立っている場所のイベント（きらめきなど）
    var cands = ents.filter(function (e) {
      return !e.hidden && e.kind === 'event' && e.cur.run && e.cur.trigger === 'talk' && (inEnt(e, fx, fy) || (e.cur.sparkle && inEnt(e, p.tx, p.ty)));
    });
    if (!cands.length) { return false; }
    var e = cands[0];
    if (e.cur.facePlayer !== false && e.cur.sprite && !e.cur.sparkle && !e.cur.push && !Game.props.has(e.cur.sprite)) { e.dir = util.DIRS[p.dir].opp; }
    F.run(e.cur.run, e);
    return true;
  }

  /* ================= 板（プレート）と反応 ================= */
  function updatePlates(silent) {
    ents.forEach(function (e) {
      if (e.kind !== 'event' || !e.cur.plate || e.hidden) { return; }
      var on = !!entAt(e.tx, e.ty, e, function (q) { return q.cur && q.cur.push && !q.moving; });
      var fl = 'plate:' + e.id;
      if (on !== save.flag(fl)) {
        save.set(fl, on);
        if (!silent) { Game.audio.sfx(on ? 'plate' : 'plate_off'); }
        e.pressed = on;
      }
    });
  }

  F.checkReactions = function () {
    if (F.running || F.transition || !M) { return; }
    var rs = M.def.reactions;
    if (!rs) { return; }
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.once && save.flag(r.once)) { continue; }
      if (save.test(r.if)) {
        if (r.once) { save.set(r.once); }
        F.run(r.run, null);
        return;
      }
    }
  };

  /* ================= スクリプトの実行 ================= */
  F.run = function (fn, ev) {
    if (F.running) { return Promise.resolve(); }
    F.running = true;
    var S = Game.script.make(ev);
    var p = Promise.resolve().then(function () { return fn(S); });
    return p.catch(function (err) { Game.fail('script', err); }).then(function () {
      F.running = false;
      F.refresh();
      if (F.pendingAuto) { F.pendingAuto = false; return runAutoEvents(); }
      F.checkReactions();
    });
  };

  /** n フレーム待つ（Promise） */
  F.wait = function (n) {
    return new Promise(function (resolve) {
      if (n <= 0) { resolve(); return; }
      waiters.push({ n: n, resolve: resolve });
    });
  };

  /** 画面の切り替え。to: { map, x, y, dir, fx: 'fade'|'iris'|'none', sfx: 'door_open'|'stairs'|... } */
  F.warp = function (to, ev) {
    if (F.transition) { return Promise.resolve(); }
    F.transition = true;
    var wasRunning = F.running;
    F.running = true;
    var same = to.map === M.id;
    var fxk = to.fx || 'fade';
    var seq = Promise.resolve();
    if (to.sfx) { Game.audio.sfx(to.sfx); }
    if (!to.noFade) {
      if (fxk === 'iris' && P) { seq = Game.gfx.irisClose(P.px - F.cam.x + 8, P.py - F.cam.y + 8, 20); }
      else { seq = Game.gfx.fadeOut(to.frames || 14); }
    }
    return seq.then(function () {
      if (!same) { F.enterMap(to.map, to.x, to.y, to.dir || 'down', false); }
      else { placePlayer(to.x, to.y, to.dir || P.dir); snapCamera(); }
      return F.wait(4);
    }).then(function () {
      var open = to.noFade ? Promise.resolve() : (fxk === 'iris' ? Game.gfx.irisOpen(P.px - F.cam.x + 8, P.py - F.cam.y + 8, 20) : Game.gfx.fadeIn(to.frames || 14));
      return open;
    }).then(function () {
      F.transition = false;
      F.running = wasRunning;
      if (!same && !to.noAutosave) { autosave(); }
      if (wasRunning) { F.pendingAuto = !same; return null; }
      return runAutoEvents();
    });
  };

  function autosave() {
    if (save.slot && !Game.debugNoSave) { save.commit(); }
  }

  function runAutoEvents() {
    if (F.running) { return Promise.resolve(); }
    var chain = Promise.resolve();
    var def = M.def;
    var autos = ents.filter(function (e) { return e.kind === 'event' && !e.hidden && e.cur.trigger === 'auto' && e.cur.run; });
    autos.forEach(function (e) {
      chain = chain.then(function () { if (!e.hidden && M.def === def) { return F.run(e.cur.run, e); } });
    });
    if (def.onEnter) { chain = chain.then(function () { return F.run(def.onEnter, null); }); }
    return chain.then(function () { F.checkReactions(); });
  }

  function placePlayer(x, y, dir) {
    P.tx = x; P.ty = y; P.px = x * T; P.py = y * T; P.dir = dir || 'down'; P.moving = false; P.step = 0; P.to = null;
  }

  /** マップに入る（位置を決めて BGM・環境音・色を整える） */
  F.enterMap = function (id, x, y, dir, runAuto) {
    var prevName = M ? M.name : null;
    loadMap(id);
    if (!P) {
      P = makeEntity({ x: x, y: y }, 'player');
      P.cur = {}; P.walkFoot = false; P.turn = 0; P.id = 'player';
    }
    F.player = P; F.ents = ents;
    ents.push(P);
    placePlayer(x, y, dir);
    P.hidden = false; P.sprite = Game.state.sprite || 'mio';
    Game.state.map = id;
    var def = M.def;
    var bgm = typeof def.bgm === 'function' ? def.bgm() : def.bgm;
    Game.audio.bgm(bgm || null);
    var amb = typeof def.ambient === 'function' ? def.ambient() : def.ambient;
    Game.audio.ambient(amb || []);
    snapCamera();
    updateTint(true);
    updatePlates(true);
    if (M.name && M.name !== prevName && !def.noBanner) { ui.banner(M.name); }
    if (runAuto) { return runAutoEvents(); }
    return Promise.resolve();
  };

  F.snapshot = function () {
    if (!P || !M) { return; }
    var s = Game.state;
    s.map = M.id; s.x = P.tx; s.y = P.ty; s.dir = P.dir;
  };

  /* ================= カメラ ================= */
  function camTarget() {
    var cx, cy;
    if (F.cam.pan) { cx = F.cam.pan.x * T + 8 - W / 2; cy = F.cam.pan.y * T + 8 - H / 2; }
    else { cx = P.px + 8 - W / 2; cy = P.py + 8 - H / 2; }
    var mw = M.w * T, mh = M.h * T;
    cx = mw <= W ? -Math.floor((W - mw) / 2) : Math.max(0, Math.min(mw - W, cx));
    cy = mh <= H ? -Math.floor((H - mh) / 2) : Math.max(0, Math.min(mh - H, cy));
    return { x: cx, y: cy };
  }
  function snapCamera() { var t = camTarget(); F.cam.x = Math.round(t.x); F.cam.y = Math.round(t.y); }
  function updateCamera() {
    var t = camTarget();
    if (F.cam.pan) {
      F.cam.x += (t.x - F.cam.x) * F.cam.panSpeed; F.cam.y += (t.y - F.cam.y) * F.cam.panSpeed;
      if (Math.abs(t.x - F.cam.x) < 0.5) { F.cam.x = t.x; }
      if (Math.abs(t.y - F.cam.y) < 0.5) { F.cam.y = t.y; }
    } else if (F.cam.returning) {
      F.cam.x += (t.x - F.cam.x) * 0.2; F.cam.y += (t.y - F.cam.y) * 0.2;
      if (Math.abs(t.x - F.cam.x) < 1 && Math.abs(t.y - F.cam.y) < 1) { F.cam.returning = false; }
    } else { F.cam.x = Math.round(t.x); F.cam.y = Math.round(t.y); }
  }
  F.pan = function (x, y, speed) {
    F.cam.pan = { x: x, y: y }; F.cam.panSpeed = speed || 0.14;
    return new Promise(function (resolve) {
      var n = 0;
      (function check() {
        n++;
        var t = camTarget();
        if ((Math.abs(t.x - F.cam.x) < 1 && Math.abs(t.y - F.cam.y) < 1) || n > 240) { resolve(); } else { waiters.push({ n: 1, resolve: check }); }
      })();
    });
  };
  F.unpan = function () {
    F.cam.pan = null; F.cam.returning = true;
    return F.wait(1).then(function () {
      return new Promise(function (resolve) {
        var n = 0;
        (function check() {
          n++;
          if (!F.cam.returning || n > 120) { resolve(); } else { waiters.push({ n: 1, resolve: check }); }
        })();
      });
    });
  };

  /* ================= 色（時間帯） ================= */
  function tintFor() {
    var t = M.def.tint;
    if (t === 'none') { return [255, 255, 255]; }
    if (typeof t === 'function') { t = t(); }
    if (t === 'auto' || t === undefined) { return M.def.indoor ? [255, 255, 255] : TOD[F.timeOfDay()]; }
    if (typeof t === 'string' && TOD[t]) { return TOD[t]; }
    if (typeof t === 'string' && t.charAt(0) === '#') { return util.rgb(t); }
    return t;
  }
  function updateTint(snap) {
    if (!M) { return; }
    tint.target = tintFor();
    if (snap) { tint.cur = tint.target.slice(); }
  }

  /* ================= 更新 ================= */
  function updateEntity(e) {
    if (e === P) { return; }
    // 動き
    if (e.moving) {
      e.anim++;
      advanceMove(e);
      if (!e.moving && e.cur.push) { updatePlates(); F.checkReactions(); }
      return;
    }
    // うろうろ
    var wd = e.cur.wander;
    if (wd && !e.hidden && !F.running && !F.transition && !ui.busy()) {
      e.wanderT--;
      if (e.wanderT <= 0) {
        e.wanderT = 50 + Math.floor(Math.random() * 110);
        var dirs = ['up', 'down', 'left', 'right'];
        var dir = dirs[Math.floor(Math.random() * 4)];
        var d = util.DIRS[dir];
        var nx = e.tx + d.x, ny = e.ty + d.y;
        var r = wd.radius === undefined ? 2 : wd.radius;
        e.dir = dir;
        if (Math.abs(nx - e.home.x) <= r && Math.abs(ny - e.home.y) <= r && !blockedBy(nx, ny, e) && !(nx === P.tx && ny === P.ty) && !(P.moving && P.to.x === nx && P.to.y === ny)) {
          startMove(e, dir, 0.8);
        }
      }
    }
  }

  function updatePlayer() {
    var p = P;
    if (p.bumpCool > 0) { p.bumpCool--; }
    if (p.moving) {
      p.anim++;
      if (advanceMove(p)) {
        playerArrive();
        if (!F.running && !F.transition && !ui.busy() && !p.moving) {
          var dir = Game.input.direction();
          if (dir && p.turn <= 0) { p.dir = dir; tryMove(dir); }
        }
      }
      return;
    }
    p.anim = 0;
    if (F.running || F.transition || ui.busy()) { return; }
    if (Game.input.pressed('start')) { Game.audio.sfx('menu_open'); Game.scenes.push(Game.scenes.menu); return; }
    if (Game.input.pressed('a')) { if (tryInteract()) { return; } }
    var dir2 = Game.input.direction();
    if (p.turn > 0) { p.turn--; }
    if (dir2) {
      if (p.dir !== dir2) {
        p.dir = dir2;
        if (Game.input.holdFrames(dir2) < 9) { p.turn = 5; return; }
      }
      if (p.turn <= 0) { tryMove(dir2); }
    }
  }

  F.update = function () {
    F.tick++;
    Game.frame++;
    if (F.tick % 60 === 0 && !Game.debugFreeze) { Game.state.playSec++; }
    // 待ち
    for (var i = waiters.length - 1; i >= 0; i--) {
      waiters[i].n--;
      if (waiters[i].n <= 0) { var w = waiters.splice(i, 1)[0]; w.resolve(); }
    }
    if (!M) { return; }
    updatePlayer();
    ents.forEach(function (e) {
      if (e.kind === 'event' || e.cur.push) { updateEntity(e); }
      if (e.kind === 'event') { e.anim++; }
    });
    // 色をなめらかに
    for (var k = 0; k < 3; k++) {
      var dv = tint.target[k] - tint.cur[k];
      tint.cur[k] += Math.abs(dv) < 0.6 ? dv : dv * 0.04;
    }
    updateCamera();
    updateParticles();
    if (!F.running && !F.transition && !ui.busy() && F.tick % 6 === 0) { F.checkReactions(); }
  };

  /* ================= 粒（ホタル・葉・ほこり・光） ================= */
  function spawnParticles() {
    var fx = M.def.fx || [];
    var cx = F.cam.x, cy = F.cam.y;
    if (fx.indexOf('fireflies') >= 0 && particles.filter(function (p) { return p.t === 'ff'; }).length < 14 && Math.random() < 0.08) {
      particles.push({ t: 'ff', x: cx + Math.random() * W, y: cy + 20 + Math.random() * (H - 30), vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.2, life: 240 + Math.random() * 200, max: 400, ph: Math.random() * 6 });
    }
    if (fx.indexOf('leaves') >= 0 && Math.random() < 0.03) {
      particles.push({ t: 'leaf', x: cx + Math.random() * (W + 40) - 20, y: cy - 4, vx: -0.3 - Math.random() * 0.3, vy: 0.3 + Math.random() * 0.25, life: 400, max: 400, ph: Math.random() * 6 });
    }
    if (fx.indexOf('dust') >= 0 && Math.random() < 0.05) {
      particles.push({ t: 'mote', x: cx + Math.random() * W, y: cy + Math.random() * H, vx: 0.05, vy: -0.05, life: 200, max: 200, ph: Math.random() * 6 });
    }
    if (fx.indexOf('seaglint') >= 0 && Math.random() < 0.15) {
      // 水面のきらめき
      for (var tries = 0; tries < 6; tries++) {
        var gx = Math.floor((cx + Math.random() * W) / T), gy = Math.floor((cy + Math.random() * H) / T);
        if (M.ground[gy] && M.ground[gy][gx] && Game.tiles.defs[M.ground[gy][gx]].water) {
          particles.push({ t: 'glint', x: gx * T + Math.random() * 14, y: gy * T + Math.random() * 14, vx: 0, vy: 0, life: 22, max: 22 });
          break;
        }
      }
    }
  }
  function updateParticles() {
    spawnParticles();
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life--; p.x += p.vx; p.y += p.vy;
      if (p.t === 'ff') { p.vx += (Math.random() - 0.5) * 0.04; p.vy += (Math.random() - 0.5) * 0.04; p.vx *= 0.97; p.vy *= 0.97; }
      if (p.t === 'leaf') { p.vx = -0.35 + Math.sin(F.tick / 20 + p.ph) * 0.25; }
      if (p.life <= 0) { particles.splice(i, 1); }
    }
  }
  function drawParticles(g) {
    var cx = Math.round(F.cam.x), cy = Math.round(F.cam.y);
    particles.forEach(function (p) {
      var x = Math.round(p.x - cx), y = Math.round(p.y - cy);
      if (p.t === 'ff') {
        var a = Math.sin((F.tick + p.ph * 20) / 14);
        if (a < -0.2) { return; }
        g.fillStyle = '#e8f4a0'; g.fillRect(x, y, 1, 1);
        if (a > 0.5) { g.fillStyle = 'rgba(232,244,160,0.35)'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
      } else if (p.t === 'leaf') {
        g.fillStyle = (Math.floor(F.tick / 10 + p.ph) % 2) ? '#7ccc6a' : '#3f9650'; g.fillRect(x, y, 2, 1); g.fillRect(x + 1, y + 1, 1, 1);
      } else if (p.t === 'dust') {
        g.fillStyle = 'rgba(240,230,200,' + (p.life / p.max * 0.8).toFixed(2) + ')'; g.fillRect(x, y, 2, 2);
      } else if (p.t === 'mote') {
        g.fillStyle = 'rgba(255,244,200,0.5)'; g.fillRect(x, y, 1, 1);
      } else if (p.t === 'glint') {
        var k = p.life / p.max;
        g.fillStyle = '#ffffff';
        g.fillRect(x, y, 1, 1);
        if (k > 0.3 && k < 0.8) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
      }
    });
  }

  /* ================= 描画 ================= */
  function drawSpriteOf(g, e, cx, cy) {
    var spr = e.cur.sprite;
    if (!spr) { return; }
    var px = Math.round(e.px) - cx, py = Math.round(e.py) - cy;
    if (px < -24 || py < -32 || px > W + 8 || py > H + 24) { return; }
    if (Game.props.has(spr)) {
      var pr = Game.props.get(spr);
      var fr = pr.frames[Math.floor(F.tick / pr.rate) % pr.frames.length];
      if (e.cur.fx === 'plate' && pr.frames.length > 1) { fr = pr.frames[e.pressed ? 1 : 0]; }
      g.drawImage(fr, px, py + T - pr.h);
      return;
    }
    var set = Game.sprites.get(spr);
    var dir = e.dir;
    var isAnimal = !set.down;
    var frames = set[dir] || set.left;
    if (isAnimal) { frames = (dir === 'right') ? set.right : set.left; if (dir === 'up' || dir === 'down') { frames = e.lastH === 'right' ? set.right : set.left; } else { e.lastH = dir; } }
    var f = 0;
    if (e.moving) { f = (e.step >= 3 && e.step < 13) ? (e.walkFoot ? 1 : 2) : 0; }
    else if (isAnimal && spr.indexOf('cat') === 0) { f = (Math.floor(F.tick / 40) % 5 === 0) ? 1 : 0; }
    var cv = frames[Math.min(f, frames.length - 1)];
    if (spr === 'gull' && e.cur.fx === 'fly') { cv = (e.dir === 'right' ? set.flyR : set.fly)[Math.floor(F.tick / 8) % 2]; }
    var h = cv.height;
    var off = (f > 0 && !isAnimal) ? 0 : 0;
    g.drawImage(cv, px, py + T - h + off);
  }

  function drawShadow(g, e, cx, cy) {
    if (e.cur && e.cur.noShadow) { return; }
    var px = Math.round(e.px) - cx, py = Math.round(e.py) - cy;
    g.drawImage(shadowCv, px + 2, py + 11);
  }

  function drawSparkle(g, e, cx, cy) {
    var px = Math.round(e.px) - cx + 8, py = Math.round(e.py) - cy + 8;
    var ph = (F.tick + e.tx * 13 + e.ty * 7) % 60;
    var k = ph < 40 ? 0 : (ph < 46 ? 1 : (ph < 52 ? 2 : (ph < 56 ? 1 : 0)));
    if (ph < 40) { g.fillStyle = '#ffffff'; g.fillRect(px - 1 + ((ph >> 3) % 2) * 2, py - 1 + ((ph >> 4) % 2), 1, 1); return; }
    var c = k === 2 ? '#ffffff' : '#fff4b0';
    g.fillStyle = c;
    g.fillRect(px, py - 3 - k, 1, 7 + k * 2);
    g.fillRect(px - 3 - k, py, 7 + k * 2, 1);
    g.fillStyle = '#ffffff'; g.fillRect(px - 1, py - 1, 3, 3);
    g.fillStyle = '#f6d04a'; g.fillRect(px, py, 1, 1);
  }

  function drawWorld(g) {
    var cx = Math.round(F.cam.x), cy = Math.round(F.cam.y);
    // 背景
    g.fillStyle = M.bg; g.fillRect(0, 0, W, H);
    // 地面
    var fi = M.frames.length > 1 ? Math.floor(F.tick / Game.tiles.ANIM_RATE) % M.frames.length : 0;
    var src = M.frames[fi];
    var sx = Math.max(0, cx), sy = Math.max(0, cy);
    var sw = Math.min(src.width - sx, W - (sx - cx)), sh = Math.min(src.height - sy, H - (sy - cy));
    if (sw > 0 && sh > 0) { g.drawImage(src, sx, sy, sw, sh, sx - cx, sy - cy, sw, sh); }

    // 床の飾り・きらめき
    var list = [];
    ents.forEach(function (e) {
      if (e.hidden) { return; }
      if (e.kind === 'prop') {
        if (e.prop.floor) { var fr = e.prop.frames[0]; g.drawImage(fr, e.tx * T - cx, (e.ty + e.prop.fh) * T - e.prop.h - cy); }
        else { list.push(e); }
      } else if (e.kind === 'event') {
        if (e.cur.sparkle) { drawSparkle(g, e, cx, cy); return; }
        if (e.cur.sprite) {
          var isFloor = Game.props.has(e.cur.sprite) && Game.props.get(e.cur.sprite).floor;
          if (isFloor) { drawSpriteOf(g, e, cx, cy); } else { list.push(e); }
        }
      } else if (e === P) { list.push(e); }
    });
    // かげ
    list.forEach(function (e) {
      if (e.kind === 'prop') { return; }
      var spr = e.kind === 'player' ? 'mio' : e.cur.sprite;
      if (spr && !Game.props.has(spr) && spr !== 'gull') { drawShadow(g, e, cx, cy); }
    });
    // 高さ順
    list.forEach(function (e) { e.sortY = (e.kind === 'prop') ? e.sort : Math.round(e.py) + T; });
    list.sort(function (a, b) { return a.sortY - b.sortY; });
    list.forEach(function (e) {
      if (e.kind === 'prop') {
        var pr = e.prop;
        var px = e.tx * T - cx, py = (e.ty + pr.fh) * T - pr.h - cy;
        if (px > W || py > H || px + pr.w < 0 || py + pr.h < 0) { return; }
        g.drawImage(pr.frames[Math.floor(F.tick / pr.rate) % pr.frames.length], px, py);
      } else if (e === P) {
        drawPlayer(g, cx, cy);
      } else { drawSpriteOf(g, e, cx, cy); }
    });
    drawParticles(g);
  }

  function drawPlayer(g, cx, cy) {
    var p = P;
    var set = Game.sprites.get(p.sprite || 'mio');
    var f = 0;
    if (p.moving) { f = (p.step >= 3 && p.step < 13) ? (p.walkFoot ? 1 : 2) : 0; }
    var cv = set[p.dir][f];
    var px = Math.round(p.px) - cx, py = Math.round(p.py) - cy;
    g.drawImage(cv, px, py + T - cv.height);
  }

  function drawLights(g) {
    // やみ（ほらあななど）
    if (M.def.dark) {
      var ov = darkCv;
      var og = ov.getContext('2d');
      og.globalCompositeOperation = 'source-over';
      og.fillStyle = 'rgba(6,4,14,0.86)'; og.fillRect(0, 0, W, H);
      og.globalCompositeOperation = 'destination-out';
      var cx = Math.round(F.cam.x), cy = Math.round(F.cam.y);
      var lantern = save.has('lantern') ? 1 : 0.55;
      var flick = Math.sin(F.tick / 9) * 1.2 + Math.sin(F.tick / 4.3) * 0.6;
      var bx = Math.round(P.px - cx + 8), by = Math.round(P.py - cy + 8);
      hole(og, bx, by, (40 + flick) * lantern + 6, 1);
      ents.forEach(function (e) {
        if (e.hidden || !e.cur || !e.cur.light) { return; }
        hole(og, Math.round(e.px - cx + 8), Math.round(e.py - cy + 6), e.cur.light + Math.sin(F.tick / 5 + e.tx) * 1.2, 0.9);
      });
      g.drawImage(ov, 0, 0);
      // あたたかい光
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(80,50,10,0.18)';
      discSteps(g, bx, by, (30 + flick) * lantern, [0.5, 0.35, 0.2], 'rgba(70,44,8,0.16)');
      g.globalCompositeOperation = 'source-over';
    }
  }
  function hole(og, x, y, r, a) {
    var steps = [[1.0, 0.18], [0.82, 0.22], [0.64, 0.3], [0.46, 0.4], [0.3, 1]];
    steps.forEach(function (s) {
      og.fillStyle = 'rgba(0,0,0,' + (s[1] * a) + ')';
      discFill(og, x, y, Math.max(1, Math.round(r * s[0])));
    });
  }
  function discFill(g, cx, cy, r) {
    for (var y = -r; y <= r; y++) {
      var w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }
  function discSteps(g, cx, cy, r, ks, color) {
    g.fillStyle = color;
    ks.forEach(function (k) { discFill(g, cx, cy, Math.round(r * k)); });
  }
  var darkCv = null;

  function drawTint(g) {
    var c = tint.cur;
    if (c[0] > 252 && c[1] > 252 && c[2] > 252) { return; }
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  }

  /** 夜の明かり（ランプのまわりの光の輪） */
  function drawGlows(g) {
    var tc = tint.cur;
    if (tc[0] > 235 && tc[2] > 235) { return; }
    var cx = Math.round(F.cam.x), cy = Math.round(F.cam.y);
    g.globalCompositeOperation = 'lighter';
    ents.forEach(function (e) {
      if (e.hidden) { return; }
      var gl = null, ox = 8, oy = 4;
      if (e.kind === 'prop' && e.propName === 'lamppost') { gl = 26; ox = 8; oy = (e.ty + 1) * T - 26 - cy - e.ty * T + e.ty * T; }
      if (!gl) { return; }
      var x = e.tx * T - cx + 8, y = (e.ty + 1) * T - 24 - cy;
      var fl = 1 + Math.sin(F.tick / 11 + e.tx) * 0.04;
      discSteps(g, x, y, gl * fl, [1, 0.7, 0.4], 'rgba(90,70,20,0.16)');
    });
    var wl = M.def.windowLights;
    if (wl) {
      wl.forEach(function (w) {
        discSteps(g, w.x * T - cx + 8, w.y * T - cy + 8, w.r || 14, [1, 0.62], 'rgba(90,70,20,0.18)');
      });
    }
    g.globalCompositeOperation = 'source-over';
  }

  function drawBeam(g) {
    var b = M.def.beam;
    if (!b || !save.flag('lamp_lit')) { return; }
    var cx = F.cam.x, cy = F.cam.y;
    var x0 = b.x * T + 8 - cx, y0 = b.y * T + 8 - cy;
    var ang = F.tick * 0.010 + 0.6;
    g.globalCompositeOperation = 'lighter';
    [[0.20, 0.07], [0.12, 0.08], [0.05, 0.1]].forEach(function (w) {
      [ang, ang + Math.PI].forEach(function (a) {
        g.fillStyle = 'rgba(255,240,170,' + w[1] + ')';
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x0 + Math.cos(a - w[0]) * 420, y0 + Math.sin(a - w[0]) * 420 * 0.72);
        g.lineTo(x0 + Math.cos(a + w[0]) * 420, y0 + Math.sin(a + w[0]) * 420 * 0.72);
        g.closePath(); g.fill();
      });
    });
    g.globalCompositeOperation = 'source-over';
  }

  function drawFog(g) {
    var amt = M.def.fog;
    if (!amt) { return; }
    var a = typeof amt === 'function' ? amt() : amt;
    if (!a) { return; }
    if (!fogCv) { makeFog(); }
    g.globalAlpha = a;
    var ox = -((F.tick * 0.25 + F.cam.x * 0.3) % 256), oy = -((F.tick * 0.05 + F.cam.y * 0.3) % 160);
    for (var x = ox - 256; x < W; x += 256) {
      for (var y = oy - 160; y < H; y += 160) { g.drawImage(fogCv, Math.round(x), Math.round(y)); }
    }
    g.globalAlpha = 1;
  }
  function makeFog() {
    var o = Game.gfx.create(256, 160);
    var r = util.rng(77);
    o.g.fillStyle = '#d8e0f0';
    for (var i = 0; i < 70; i++) {
      var x = r.int(256), y = r.int(160), w = 16 + r.int(40), h = 3 + r.int(8);
      for (var dx = -1; dx <= 1; dx++) { o.g.fillRect(((x + dx * 256) % 256 + 256) % 256, y, w, h); }
    }
    // 8 ドットごとの粗い点描でふわっと見せる
    o.g.globalCompositeOperation = 'destination-out';
    for (var yy = 0; yy < 160; yy++) { for (var xx = (yy % 2); xx < 256; xx += 2) { if ((xx + yy * 3) % 5 === 0) { o.g.fillRect(xx, yy, 1, 1); } } }
    fogCv = o.canvas;
  }

  F.draw = function (g) {
    if (!M) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    g.save();
    if (Game.gfx.shakeX || Game.gfx.shakeY) { g.translate(Game.gfx.shakeX, Game.gfx.shakeY); }
    drawWorld(g);
    drawTint(g);
    drawGlows(g);
    drawLights(g);
    drawBeam(g);
    drawFog(g);
    if (M.def.overlay) { M.def.overlay(g, F); }
    g.restore();
    if (Game.debug) { drawDebug(g); }
  };

  function drawDebug(g) {
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, 90, 10);
    Game.font.draw(g, P.tx + ',' + P.ty + ' ' + M.id, 2, 3, '#ffffff');
  }

  /* ================= 押し物のやりなおし ================= */
  F.resetPuzzle = function () {
    ents.forEach(function (e) {
      if (e.kind === 'event' && e.cur.push && !e.moving) {
        e.tx = e.home.x; e.ty = e.home.y; e.px = e.tx * T; e.py = e.ty * T;
      }
    });
    ents.forEach(function (e) { if (e.kind === 'event' && e.cur.plate) { save.clear('plate:' + e.id); e.pressed = false; } });
    updatePlates();
    Game.audio.sfx('warp');
    Game.gfx.flash('#ffffff', 14, 0.6);
  };
  F.canResetPuzzle = function () { return !!(M && M.def.puzzle && !(M.def.puzzle.solvedFlag && save.flag(M.def.puzzle.solvedFlag))); };

  /* ================= 調べる・取得 ================= */
  F.getEntity = function (id) {
    for (var i = 0; i < ents.length; i++) { if (ents[i].id === id) { return ents[i]; } }
    return null;
  };
  F.startMove = startMove;
  F.advanceMove = advanceMove;
  F.evalEntity = evalEntity;
  F.updatePlates = updatePlates;
  F.updateTint = updateTint;
  F.addParticle = function (p) { particles.push(p); };
  F.entities = function () { return ents; };
  F.currentMap = function () { return M; };
  F.cameraSnap = snapCamera;
  /** デバッグ・検証用: 位置を直接動かす */
  F.teleport = function (x, y, dir) { placePlayer(x, y, dir || P.dir); snapCamera(); };

  /* ================= シーン ================= */
  Game.scenes.field = {
    enter: function (arg) {
      shadowCv = shadowCv || Game.gfx.make(12, 5, function (g) {
        g.fillStyle = 'rgba(20,10,40,0.30)'; g.fillRect(2, 0, 8, 5); g.fillRect(0, 1, 12, 3);
        g.fillStyle = 'rgba(20,10,40,0.18)'; g.fillRect(1, 0, 10, 1); g.fillRect(1, 4, 10, 1);
      }, true);
      darkCv = darkCv || Game.gfx.create(W, H).canvas;
      var s = Game.state;
      P = null; M = null; ents = []; F.running = false; F.transition = false;
      ui.reset();
      F.cam.pan = null;
      Game.gfx.setFade(1, '#000000');
      F.enterMap(s.map, s.x, s.y, s.dir, false).then(function () {
        if (arg && arg.black) { return null; }
        return Game.gfx.fadeIn(arg && arg.fadeFrames ? arg.fadeFrames : 30);
      }).then(function () {
        if (arg && arg.start) { return F.run(arg.start, null).then(function () { return runAutoEvents(); }); }
        return runAutoEvents();
      });
    },
    update: function () {
      ui.update();
      F.update();
    },
    draw: function (g) { F.draw(g); if (Game.scenes.top() === Game.scenes.field) { ui.draw(g); } },
    resume: function () { Game.input.clear(); updateTint(false); }
  };
})();
