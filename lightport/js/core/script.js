/* script.js — マップのスクリプトから使う API（S）
 *
 * スクリプトは async 関数: async function (S) { await S.say('...'); }
 * S のメソッドは、必要なものだけ await する。詳細は managements/30_design/map-script-guide.md。
 */
(function () {
  'use strict';

  var save = Game.save, ui = Game.ui, util = Game.util;
  var F = function () { return Game.field; };

  function entityOf(S, t) {
    var f = F();
    if (t === 'player') { return f.player; }
    if (t === undefined || t === null || t === 'self') { return S.self || f.player; }
    if (t.raw) { return t; }
    if (t._e) { return t._e; }
    var e = f.getEntity(t);
    if (!e) { throw new Error('イベントがない: ' + t); }
    return e;
  }

  function parseSteps(steps) {
    if (typeof steps === 'string') { return steps.split('').map(function (c) { return c; }); }
    return steps;
  }

  function handle(e) {
    var f = F();
    return {
      _e: e, id: e.id,
      get x() { return e.tx; }, get y() { return e.ty; }, get dir() { return e.dir; },
      show: function () { e.override = e.override || {}; e.override.hidden = false; e.hidden = false; },
      hide: function () { e.override = e.override || {}; e.override.hidden = true; e.hidden = true; },
      setPos: function (x, y) { e.tx = x; e.ty = y; e.px = x * Game.T; e.py = y * Game.T; },
      face: function (d) { e.dir = d; },
      sprite: function (name) { e.override = e.override || {}; e.override.sprite = name; e.cur.sprite = name; },
      move: function (steps, opts) { return Game.script.moveEntity(e, steps, opts); }
    };
  }

  function nameOf(ev) { return ev ? (ev.cur && ev.cur.name) || (ev.raw && ev.raw.name) || null : null; }

  function make(ev) {
    var S = {
      self: ev,

      /* ---- 会話 ---- */
      say: function (text, who) {
        var name = who === undefined ? nameOf(ev) : who;
        if (text instanceof Array) { text = text.join('\\p'); }
        return ui.say(text, name);
      },
      /** 会話のあとに選択肢を出す。選んだ番号を返す */
      ask: function (text, items, opts) {
        opts = opts || {};
        if (text instanceof Array) { text = text.join('\\p'); }
        var name = opts.who === undefined ? nameOf(ev) : opts.who;
        return ui.say(text, name, { choices: items, cancel: opts.cancel, start: opts.start });
      },
      choice: function (items, opts) { return ui.choice(items, opts); },
      narrate: function (lines, opts) { return ui.narrate(lines, opts); },
      banner: function (text) { ui.banner(text); },

      /* ---- 状態 ---- */
      flag: function (n) { return save.flag(n); },
      set: function (n, v) { save.set(n, v); F().refresh(); },
      clear: function (n) { save.clear(n); F().refresh(); },
      has: function (id) { return save.has(id); },
      count: function (prefix) { return save.count(prefix); },
      take: function (id) { save.take(id); },
      /** 持ち物を渡す。入手の演出つき。opts.text で文言を変える */
      give: function (id, opts) {
        opts = opts || {};
        return (async function () {
          save.give(id);
          var name = Game.items.name(id);
          ui.itemPopup(id, name);
          Game.gfx.flash('#fffbe0', 18, 0.45);
          var j = Game.audio.jingle(opts.jingle || 'get');
          await F().wait(22);
          if (opts.text !== false) { await ui.say(opts.text || ('ミオは ' + name + 'を てにいれた！'), null); }
          await j;
          ui.hideItemPopup();
          F().refresh();
        })();
      },

      /* ---- 時間と画面 ---- */
      wait: function (n) { return F().wait(n); },
      fade: function (kind, frames, color) {
        return kind === 'in' ? Game.gfx.fadeIn(frames) : Game.gfx.fadeOut(frames, color);
      },
      flash: function (color, frames, alpha) { Game.gfx.flash(color, frames, alpha); },
      shake: function (power, frames) { Game.gfx.shake(power || 3, frames || 20); },
      iris: function (kind, cx, cy, frames) {
        return kind === 'open' ? Game.gfx.irisOpen(cx, cy, frames) : Game.gfx.irisClose(cx, cy, frames);
      },
      pan: function (x, y, speed) { return F().pan(x, y, speed); },
      unpan: function () { return F().unpan(); },
      warp: function (map, x, y, dir, opts) {
        var to = Object.assign({ map: map, x: x, y: y, dir: dir }, opts || {});
        return F().warp(to, ev);
      },
      lockInput: function () { /* スクリプト実行中は常に操作できない */ },

      /* ---- 音 ---- */
      sfx: function (name, o) { Game.audio.sfx(name, o); },
      bgm: function (name, o) { Game.audio.bgm(name, o); },
      stopBgm: function (fade) { Game.audio.stopBgm(fade); },
      jingle: function (name) { return Game.audio.jingle(name); },
      ambient: function (list) { Game.audio.ambient(list); },

      /* ---- 人・物 ---- */
      /** イベントを扱う手: S.ev('npc1').hide() など */
      ev: function (id) { return handle(entityOf(S, id)); },
      move: function (target, steps, opts) { return Game.script.moveEntity(entityOf(S, target), steps, opts); },
      face: function (target, dir) {
        var e = entityOf(S, target);
        if (dir === 'player' || dir && dir.raw) { S.faceTo(target, dir); } else { e.dir = dir; }
      },
      faceTo: function (target, other) {
        var e = entityOf(S, target), o = entityOf(S, other);
        var dx = o.tx - e.tx, dy = o.ty - e.ty;
        if (Math.abs(dx) >= Math.abs(dy)) { e.dir = dx < 0 ? 'left' : 'right'; } else { e.dir = dy < 0 ? 'up' : 'down'; }
      },
      emote: function (target, kind) {
        var e = entityOf(S, target);
        ui.emote(kind || '!', function () { return { x: e.px - F().cam.x, y: e.py - F().cam.y }; });
        return F().wait(36);
      },
      glints: function (x, y, n) {
        for (var i = 0; i < (n || 8); i++) {
          F().addParticle({ t: 'glint', x: x * 16 + Math.random() * 16, y: y * 16 + Math.random() * 16, vx: 0, vy: -0.1, life: 18 + Math.random() * 14, max: 30 });
        }
      },
      timeOfDay: function () { return F().timeOfDay(); },
      refresh: function () { F().refresh(); },

      /* ---- セーブ・画面遷移 ---- */
      save: function () {
        return (async function () {
          Game.audio.sfx('save');
          var ok = save.commit();
          Game.gfx.flash('#e8f4ff', 20, 0.4);
          await ui.say(ok ? 'ここまでを きろくした。' : 'きろくできなかった。', null);
        })();
      },
      autosave: function () { save.commit(); },
      ending: function () { return Game.scenes.startEnding(); },
      toTitle: function () { return Game.scenes.toTitle(); },
      random: function (n) { return Math.floor(Math.random() * n); }
    };
    return S;
  }

  /** エンティティを歩かせる。steps は 'uurrd' のような文字列か配列（'u' 'd' 'l' 'r'、{wait:n}、{face:'up'}） */
  function moveEntity(e, steps, opts) {
    opts = opts || {};
    var list = parseSteps(steps);
    var speed = opts.speed || (opts.run ? 2 : 1);
    var f = F();
    return (async function () {
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (typeof s === 'object') {
          if (s.wait) { await f.wait(s.wait); }
          if (s.face) { e.dir = s.face; }
          continue;
        }
        var dir = util.DIR_KEYS[s] || s;
        await new Promise(function (res) {
          e.moveRes = res;
          f.startMove(e, dir, speed);
          if (e === f.player) { e.scripted = true; }
        });
        if (e === f.player) { e.scripted = false; }
      }
    })();
  }

  Game.script = {
    make: make,
    moveEntity: moveEntity,
    api: null,
    init: function () { Game.script.api = make(null); }
  };
  Game.script.init();
})();
