/* フィールドシーン: 歩行 / NPC / 会話 / ワープ / カメラ / 夜のライティング */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, In = RR.Input, F = RR.Font, Maps = RR.Maps, Props = RR.Props;
  var TS = 16;
  var DXY = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  RR.DXY = DXY; RR.OPP = OPP;

  // ---------- アクター ----------
  function Actor(o) {
    this.id = o.id || 'npc';
    this.def = o;
    this.x = o.x; this.y = o.y;
    this.px = o.x * TS; this.py = o.y * TS;
    this.dir = o.dir || 'down';
    this.moving = false;
    this.tx = this.x; this.ty = this.y;
    this.speed = o.speed || 1;
    this.step = 0;
    this.frame = 0;
    this.home = { x: o.x, y: o.y };
    this.wander = o.wander || 0;
    this.waitT = 30 + Math.floor(Math.random() * 120);
    this.queue = [];
    this.visible = o.hidden ? false : true;
    this.solid = o.solid !== false;
    this.emote = null;
    this.look = resolveLook(o.look);
  }
  function resolveLook(l) {
    if (!l) return null;
    if (typeof l === 'string') return (RR.Looks && RR.Looks[l]) || null;
    return l;
  }
  RR.resolveLook = resolveLook;
  Actor.prototype.setLook = function (l) { this.look = resolveLook(l); };
  Actor.prototype.occupies = function (x, y) {
    return this.visible && this.solid && ((this.x === x && this.y === y) || (this.moving && this.tx === x && this.ty === y));
  };
  Actor.prototype.startMove = function (dir) {
    var d = DXY[dir];
    this.dir = dir;
    this.tx = this.x + d[0]; this.ty = this.y + d[1];
    this.moving = true;
    this.step++;
  };
  Actor.prototype.update = function () {
    if (this.moving) {
      var gx = this.tx * TS, gy = this.ty * TS;
      var sp = this.speed;
      this.px = U.approach(this.px, gx, sp);
      this.py = U.approach(this.py, gy, sp);
      var remain = Math.abs(gx - this.px) + Math.abs(gy - this.py);
      this.frame = remain > 6 ? ((this.step & 1) ? 1 : 2) : 0;
      if (remain === 0) {
        this.moving = false;
        this.x = this.tx; this.y = this.ty;
        this.frame = 0;
        if (this.onArrive) { var f = this.onArrive; this.onArrive = null; f(); }
      }
    }
    if (this.emote) { this.emote.t--; if (this.emote.t <= 0) this.emote = null; }
  };
  RR.Actor = Actor;

  // ---------- フィールド ----------
  var Field = RR.Field = {
    opaque: true, countTime: true,
    map: null, player: null, actors: [], running: 0,
    camTarget: null, zoomTarget: 1, nameT: 0, lastName: '', letter: 0, letterTarget: 0,
    busyWarp: false, frame: 0
  };

  Field.enter = function (arg) {
    arg = arg || {};
    var S = RR.State.S;
    var pos = arg.map ? arg : S.pos;
    Field.running = 0;
    Field.busyWarp = false;
    Field.loadMap(pos.map, pos.x, pos.y, pos.dir);
    if (arg.fadeIn !== false) { RR.FX.fade = 1; RR.FX.fadeIn(20); }
    Field.afterEnter();
  };
  Field.resume = function () { };

  Field.makePlayer = function (x, y, dir) {
    var p = new Actor({ id: 'player', x: x, y: y, dir: dir || 'down', look: 'player' });
    return p;
  };

  Field.loadMap = function (id, x, y, dir, keepBgm) {
    var S = RR.State.S;
    var map = Maps.load(id);
    Field.map = map;
    var spot = (typeof x === 'string') ? map.spots[x] : null;
    if (spot) { dir = dir || spot.dir; y = spot.y; x = spot.x; }
    Field.player = Field.makePlayer(x, y, dir);
    Field.actors = [];
    map.npcs.forEach(function (n) { Field.actors.push(new Actor(n)); });
    S.pos = { map: id, x: x, y: y, dir: dir || 'down' };
    Field.camTarget = null;
    RR.Field3D.setMap(map);
    Field.snapCamera();
    if (!keepBgm) { if (map.bgm) RR.Audio.bgm(map.bgm); else if (map.bgm === null) RR.Audio.stopBgm(); }
    RR.Audio.ambient(map.amb || (map.dark ? 'night' : 'indoor'));
    if (map.name && map.name !== Field.lastName) { Field.nameT = 150; Field.lastName = map.name; }
  };

  // レースやバイトから戻った時に、その場所の音を戻す
  Field.restoreAudio = function () {
    var m = Field.map;
    if (!m || RR.Scene.top() !== Field) return;
    if (m.bgm) RR.Audio.bgm(m.bgm);
    RR.Audio.ambient(m.amb || (m.dark ? 'night' : 'indoor'));
  };

  // マップ入場後: enter フック → auto イベント
  Field.afterEnter = function () {
    var map = Field.map;
    var hooks = map.enters.slice();
    var autos = map.events.filter(function (e) { return e.on === 'auto'; });
    if (!hooks.length && !autos.length) return;
    RR.Script.run(async function (E) {
      await RR.wait(2);
      for (var i = 0; i < hooks.length; i++) { await hooks[i](E); if (Field.map !== map) return; }
      for (i = 0; i < autos.length; i++) {
        var ev = autos[i];
        if (!eventActive(ev)) continue;
        if (ev.once) RR.State.setFlag(evFlag(ev));
        await ev.run(E);
        if (Field.map !== map) return;
      }
    });
  };

  function evFlag(ev) { return 'ev_' + Field.map.id + '_' + (ev.id || (ev.x + '_' + ev.y)); }
  function eventActive(ev) {
    if (ev.once && RR.State.flag(evFlag(ev))) return false;
    if (ev.when) { try { if (!ev.when(RR.State.S, RR.State)) return false; } catch (e) { RR.reportError(e); return false; } }
    return true;
  }
  function eventAt(x, y, kind) {
    var evs = Field.map.events;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.on !== kind) continue;
      var w = e.w || 1, h = e.h || 1;
      if (x >= e.x && x < e.x + w && y >= e.y && y < e.y + h && eventActive(e)) return e;
    }
    return null;
  }

  Field.actor = function (id) {
    if (id === 'player') return Field.player;
    for (var i = 0; i < Field.actors.length; i++) if (Field.actors[i].id === id) return Field.actors[i];
    return null;
  };

  Field.blocked = function (x, y, self) {
    var m = Field.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    if (m.solid[y * m.w + x]) return true;
    if (Field.player !== self && Field.player.occupies(x, y)) return true;
    for (var i = 0; i < Field.actors.length; i++) {
      var a = Field.actors[i];
      if (a !== self && a.occupies(x, y)) return true;
    }
    return false;
  };

  Field.snapCamera = function () { RR.Field3D.snapCam(); };

  Field.locked = function () {
    return Field.running > 0 || RR.UI.busy() || Field.busyWarp || RR.Scene.top() !== Field;
  };

  Field.update = function () {
    Field.frame++;
    var p = Field.player;
    if (!Field.locked() && !p.moving) {
      if (In.pressed('start')) { RR.Audio.sfx('open'); RR.Script.run(function (E) { return RR.Menu.open(E); }); return; }
      if (In.pressed('a')) { if (interact()) return; }
      var dir = null;
      if (In.held('up')) dir = 'up';
      else if (In.held('down')) dir = 'down';
      else if (In.held('left')) dir = 'left';
      else if (In.held('right')) dir = 'right';
      if (dir) {
        var run = In.held('b');
        p.speed = run ? 2.67 : 1.6;
        var walking = Field.frame - (p.lastArrive || -99) <= 2;
        if (p.dir !== dir && In.holdTime(dir) < 5 && !walking) { p.dir = dir; p.turnT = 5; }
        if (p.turnT > 0) p.turnT--;
        else {
          var d = DXY[dir];
          p.dir = dir;
          if (!Field.blocked(p.x + d[0], p.y + d[1], p)) {
            p.startMove(dir);
            p.onArrive = arrive;
            if ((p.step & 1) === 0) RR.Audio.sfx('step');
          } else if (Field.frame % 20 === 0) {
            RR.Audio.sfx('bump');
          }
        }
      } else { p.turnT = 0; }
    }
    p.update();
    // NPC
    var locked = Field.running > 0 || RR.UI.busy();
    Field.actors.forEach(function (a) {
      if (a.queue.length && !a.moving) {
        var cmd = a.queue[0];
        if (cmd.wait > 0) { cmd.wait--; }
        else {
          a.queue.shift();
          if (cmd.dir) {
            if (cmd.force || !Field.blocked(a.x + DXY[cmd.dir][0], a.y + DXY[cmd.dir][1], a)) { a.startMove(cmd.dir); }
            else { a.dir = cmd.dir; a.queue.unshift({ wait: 8 }); a.queue.splice(1, 0, cmd); }
          }
          if (cmd.done) cmd.done();
        }
      } else if (!locked && a.wander && !a.moving && a.visible) {
        if (--a.waitT <= 0) {
          a.waitT = 60 + Math.floor(Math.random() * 160);
          var dirs = ['up', 'down', 'left', 'right'];
          var dd = dirs[Math.floor(Math.random() * 4)];
          var v = DXY[dd];
          var nx = a.x + v[0], ny = a.y + v[1];
          if (Math.abs(nx - a.home.x) <= a.wander && Math.abs(ny - a.home.y) <= a.wander && !Field.blocked(nx, ny, a) && !eventAt(nx, ny, 'step') && !Field.map.warps[nx + ',' + ny]) {
            a.speed = 1; a.startMove(dd);
          } else a.dir = dd;
        }
      } else if (!locked && a.def.turn && !a.moving && Field.frame % a.def.turn === 0) {
        a.dir = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
      }
      a.update();
    });
    if (Field.nameT > 0) Field.nameT--;
    Field.letter = U.approach(Field.letter, Field.letterTarget, 1.5);
  };

  function arrive() {
    var p = Field.player, m = Field.map;
    p.lastArrive = Field.frame;
    RR.State.S.pos = { map: m.id, x: p.x, y: p.y, dir: p.dir };
    var w = m.warps[p.x + ',' + p.y];
    if (w) {
      if (w.when && !w.when(RR.State.S)) { /* 無効 */ }
      else { Field.warpTo(w); return; }
    }
    var ev = eventAt(p.x, p.y, 'step');
    if (ev) {
      if (ev.once) RR.State.setFlag(evFlag(ev));
      RR.Script.run(ev.run);
    }
  }

  function interact() {
    var p = Field.player, d = DXY[p.dir];
    var x = p.x + d[0], y = p.y + d[1];
    var target = null;
    Field.actors.forEach(function (a) { if (!target && a.visible && a.x === x && a.y === y && !a.moving) target = a; });
    // カウンター越し
    if (!target) {
      var pr = propAt(x, y);
      if (pr && (pr.type === 'counter' || pr.type === 'counter1' || pr.over)) {
        Field.actors.forEach(function (a) { if (!target && a.visible && a.x === x + d[0] && a.y === y + d[1]) target = a; });
      }
    }
    if (target && target.def.talk) {
      if (target.def.face !== false) target.dir = OPP[p.dir];
      RR.Script.run(function (E) { return target.def.talk(E, target); }, target);
      return true;
    }
    var ev = eventAt(x, y, 'talk');
    if (ev) {
      if (ev.once) RR.State.setFlag(evFlag(ev));
      RR.Script.run(ev.run);
      return true;
    }
    return false;
  }
  function propAt(x, y) {
    var ps = Field.map.props;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], d = Props.defs[p.type];
      if (!d) continue;
      var sz = d.size(p);
      if (x >= p.x && x < p.x + sz[0] && y >= p.y && y < p.y + sz[1]) return p;
    }
    return null;
  }
  Field.propAt = propAt;

  // マップ移動
  Field.warpTo = function (w) {
    if (Field.busyWarp) return Promise.resolve();
    Field.busyWarp = true;
    var door = !!w.door;
    if (door) RR.Audio.sfx('door');
    return RR.FX.fadeOut(door ? 10 : 14).then(function () {
      Field.loadMap(w.map, w.x, w.y, w.dir);
      return RR.wait(4);
    }).then(function () {
      Field.busyWarp = false;
      Field.afterEnter();
      return RR.FX.fadeIn(door ? 10 : 14);
    });
  };

  // ---------- 描画 ----------
  Field.draw3d = function () { RR.Field3D.render(); };
  // 2D の重ね描き（黒帯・マップ名）。座標は基準領域（240x160）+ 余白
  Field.draw = function (g) {
    var m = Field.map;
    if (!m) return;
    var sc = RR.UI.screen();
    if (Field.letter > 0) {
      var lh = Field.letter * (sc.h / 160);
      g.fillStyle = '#000';
      g.fillRect(sc.x, sc.y, sc.w, lh); g.fillRect(sc.x, sc.y + sc.h - lh, sc.w, lh);
    }
    if (Field.nameT > 0 && m.name) drawMapName(g, m.name);
  };
  function drawMapName(g, name) {
    var t = Field.nameT;
    var slide = t > 130 ? (150 - t) / 20 : t < 20 ? t / 20 : 1;
    var w = F.measure(name) + 24;
    var y = -RR.OY + Math.round(-24 + slide * 30);
    RR.UI.win(g, -RR.OX + 6, y, w, 18, 'dark');
    F.draw(g, name, -RR.OX + 18, y + 4.5, '#f8f8f8');
  }
})();
