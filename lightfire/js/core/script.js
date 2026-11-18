/* script.js — イベントスクリプト API（g）。マップ側の async 関数から呼ぶ */
(function () {
  'use strict';
  var F = PF.field;
  PF.ABORT = { abort: true };

  function ent(e) { return typeof e === 'string' ? (e === 'player' ? F.player : (e === 'ember' ? F.ember : F.find(e))) : e; }
  function dirsOf(p) { return Array.isArray(p) ? p : String(p).split(''); }

  var g = PF.script = {
    F: F,
    /* ---- 会話 ---- */
    say: function (text, who, opts) { return PF.ui.say(Array.isArray(text) ? text.join('\f') : text, who, opts); },
    choice: function (items, opts) { return PF.ui.choice(items, opts); },
    confirm: function (text, who) { return PF.ui.confirm(text, who); },
    banner: function (text, frames, col) { return PF.ui.banner(text, frames, col); },
    wait: function (f) { return PF.wait(f); },
    // 進めない場所: メッセージのあと 一歩 戻す
    deny: async function (text, back) { await g.say(text); await g.walk(F.player, back || 'u', { dur: 10 }); },

    /* ---- フラグ・持ち物 ---- */
    flag: function (n) { return PF.flag(n); },
    set: function (n, v) { PF.setFlag(n, v); },
    add: function (n, d) { PF.addFlag(n, d); },
    has: function (id) { return PF.hasItem(id); },
    gold: function (n) { PF.addGold(n); },
    give: async function (id, n, opts) {
      n = n === undefined ? 1 : n; var it = PF.db.items[id]; PF.addItem(id, n);
      if (opts && opts.silent) return;
      PF.audio.jingle('item'); await g.say(it.name + (n > 1 ? ' ×' + n : '') + 'を てにいれた!');
    },
    take: function (id, n) { PF.addItem(id, -(n === undefined ? 1 : n)); },
    learn: async function (id) {
      var h = PF.state.hero; if (h.skills.indexOf(id) >= 0) return;
      h.skills.push(id); PF.sfx('get'); await g.say(h.name + 'は 「' + PF.db.skills[id].name + '」を おぼえた!');
    },
    heal: function (silent) { var h = PF.state.hero, s = PF.battle.calc(h); h.hp = s.maxHp; h.mp = s.maxMp; if (!silent) PF.sfx('heal'); },

    /* ---- エンティティ ---- */
    obj: function (id) { return ent(id); },
    npc: function (id) { return ent(id); },
    get player() { return F.player; },
    get ember() { return F.ember; },
    face: function (e, d) { e = ent(e); if (!e) return; if (d === 'player') d = PF.dirFromDelta(F.player.x - e.x, F.player.y - e.y); e.dir = d; },
    facePlayer: function (e) { g.face(e, 'player'); },
    place: function (e, x, y, d) { e = ent(e); if (!e) return; e.x = x; e.y = y; e.ox = e.oy = 0; e.mv = 0; if (d) e.dir = d; },
    emote: function (e, s, f) { e = ent(e); if (e) F.emote(e, s, f); return PF.wait(f || 30); },
    hide: function (id) { var e = ent(id); if (e) F.remove(e); },
    spawn: function (def) { return F.addObj(def); },
    // 歩かせる。path は 'uurr' や ['u','r']。opts.dur でフレーム数
    walk: async function (e, path, opts) {
      e = ent(e); if (!e) return; opts = opts || {};
      var dur = opts.dur || 12, ds = dirsOf(path);
      for (var i = 0; i < ds.length; i++) {
        var d = ds[i], v = PF.DIRS[d];
        if (e === F.player) { if (!F.tryMove(d, dur, true)) { e.dir = d; await PF.wait(4); continue; } }
        else {
          e.dir = d;
          if (!opts.ghost && !F.passable(e.x + v.x, e.y + v.y, e)) { await PF.wait(4); continue; }
          e.move(d, dur);
        }
        await PF.waitUntil(function () { return e.mv === 0; });
        if (opts.pause) await PF.wait(opts.pause);
      }
    },
    walkTo: async function (e, x, y, opts) {
      e = ent(e); if (!e) return; opts = opts || {};
      var dx = x - e.x, dy = y - e.y, hx = (dx > 0 ? 'r' : 'l').repeat(Math.abs(dx)), vy = (dy > 0 ? 'd' : 'u').repeat(Math.abs(dy));
      await g.walk(e, opts.first === 'y' ? vy + hx : hx + vy, opts);
    },
    // 複数同時に歩かせる [[ent,path],...]
    walkAll: function (list, opts) { return Promise.all(list.map(function (q) { return g.walk(q[0], q[1], opts); })); },

    /* ---- 演出 ---- */
    shake: function (amp, frames) { PF.fx.shake(amp, frames); PF.sfx('rumble'); return PF.wait(frames); },
    flash: function (c) { PF.fx.flash(c); return PF.wait(8); },
    fade: function (to, f, c) { return PF.fx.fade(to, f || 20, c); },
    cam: function (x, y, f) { return F.camTo(x, y, f); },
    camReset: function (f) { return F.camReset(f); },
    bgm: function (id) { PF.audio.playBGM(id); },
    stopBgm: function (f) { PF.audio.stopBGM(f); },
    sfx: function (n) { PF.sfx(n); },
    jingle: function (n) { return PF.audio.jingle(n); },
    ambience: function (l) { PF.audio.ambience(l); },
    spark: function (x, y, n, c) { F.spark(x * 16 + 8, y * 16 + 8, n || 10, c || '#ffd060'); },
    setTile: function (x, y, ch) { F.setTile(x, y, ch); },
    dark: function (v) { F.map.dark = v; },

    /* ---- パズル物体 ---- */
    openGate: async function (id, opts) {
      var e = ent(id); if (!e || e.open) return;
      PF.sfx('rumble'); PF.fx.shake(1, 40);
      F.spark(e.x * 16 + 8, e.y * 16 + 8, 12, '#8a8aa0');
      await PF.wait(40); e.open = true; e.solid = false;
    },
    light: function (id, on) { var e = ent(id); if (e) F.setLit(e, on !== false); },

    /* ---- マップ移動 ---- */
    runEnter: async function () {
      var hooks = F.map.onEnter.slice();
      for (var i = 0; i < hooks.length; i++) await hooks[i](g);
    },
    warp: async function (to, pos, sfx) {
      PF.sfx(sfx || 'door'); await PF.fx.fade(1, 14);
      F.load(to, pos); PF.input.clear();
      await PF.fx.fade(0, 14);
      await g.runEnter();
    },
    refresh: function () { var pl = F.player, e = F.entry; F.load(F.map.id, { x: pl.x, y: pl.y, dir: pl.dir }); F.entry = e; },
    refreshEmber: function () { F.refreshEmber(); },
    giveEmber: async function () { PF.setFlag('ember.joined'); F.refreshEmber(); },

    /* ---- システム ---- */
    battle: async function (ids, opts) {
      var res = await PF.battle.run(ids, opts || {});
      if (res === 'lose') { await PF.game.gameOver(); throw PF.ABORT; }
      return res;
    },
    shop: function (id) { return PF.menu.shop(id); },
    inn: function (price, who) { return PF.menu.inn(price, who); },
    save: function () { return PF.menu.saveOnly(); },
    ending: function () { return PF.game.ending(); },
    toTitle: function () { PF.game.toTitle(); throw PF.ABORT; }
  };
})();
