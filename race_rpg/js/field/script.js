/* イベントスクリプト実行系。スクリプトは async (E) => {...} で書く。API一覧は managements/project/03_技術設計.md */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, UI = RR.UI, St = RR.State;
  var Script = RR.Script = {};

  Script.run = function (fn, self) {
    var Field = RR.Field;
    Field.running++;
    var E = Script.api(self);
    var p;
    try { p = Promise.resolve(fn(E, self)); } catch (e) { p = Promise.reject(e); }
    return p.catch(function (e) { RR.reportError(e); }).then(function (v) {
      Field.running = Math.max(0, Field.running - 1);
      RR.Input.consume();
      return v;
    });
  };

  // 移動コマンド 'UULLDR' / 'U3 L2' 形式
  function parsePath(path) {
    var out = [], map = { U: 'up', D: 'down', L: 'left', R: 'right' };
    var m, re = /([UDLRW])(\d*)/g;
    while ((m = re.exec(path))) {
      var n = m[2] ? parseInt(m[2], 10) : 1;
      if (m[1] === 'W') { out.push({ wait: n * 8 }); continue; }
      for (var i = 0; i < n; i++) out.push({ dir: map[m[1]] });
    }
    return out;
  }

  Script.api = function (self) {
    var Field = RR.Field;
    var E = {
      self: self,
      get S() { return St.S; },
      get stage() { return St.S.stage; },
      get money() { return St.S.money; },
      get name() { return St.S.name; },
      U: U,
      // ---- 会話 ----
      say: function (name, text, opt) { return UI.say(name, text, opt); },
      msg: function (text, opt) { return UI.msg(text, opt); },
      ask: function (name, text, items, opt) { return UI.ask(name, text, items, opt); },
      choice: function (items, opt) { return UI.choice(items, opt); },
      // ---- フラグ ----
      flag: function (k) { return St.flag(k); },
      setFlag: function (k, v) { St.setFlag(k, v); },
      num: function (k) { return St.num(k); },
      addNum: function (k, n) { St.addNum(k, n); },
      setStage: function (n) { St.S.stage = n; },
      // ---- お金 ----
      addMoney: function (n, quiet) {
        St.addMoney(n);
        if (!quiet) {
          RR.Audio.sfx(n >= 0 ? 'coin' : 'register');
          UI.toast((n >= 0 ? '+¥' : '-¥') + U.money(Math.abs(n)), n >= 0 ? '#f8e060' : '#f88878');
        }
      },
      pay: function (n) {
        if (St.S.money < n) return false;
        E.addMoney(-n);
        return true;
      },
      // ---- 待機・演出 ----
      wait: function (f) { return RR.wait(f); },
      fadeOut: function (f, c) { return RR.FX.fadeOut(f, c); },
      fadeIn: function (f) { return RR.FX.fadeIn(f); },
      flash: function (f, c) { return RR.FX.flash(f, c); },
      shake: function (m, f) { if (RR.Settings.data.shake !== false) RR.FX.shake(m, f); },
      banner: function (t, sub, opt) { return UI.banner(t, sub, opt); },
      toast: function (t, c) { UI.toast(t, c); },
      letterbox: function (on) { Field.letterTarget = on ? 18 : 0; return RR.wait(14); },
      camera: function (x, y, speed) {
        Field.camTarget = { x: x * 16 + 8 - RR.W / 2, y: y * 16 + 8 - RR.H / 2, speed: speed || 2 };
        return new Promise(function (res) {
          RR.every(function () {
            var c = Field.camPos();
            if (Math.abs(Field.cam.x - c.x) < 1 && Math.abs(Field.cam.y - c.y) < 1) { res(); return true; }
            return false;
          });
        });
      },
      cameraReset: function () {
        var t = Field.camTarget;
        Field.camTarget = null;
        if (!t) return Promise.resolve();
        // 戻りは補間
        var from = { x: Field.cam.x, y: Field.cam.y };
        var to = Field.camPos();
        Field.camTarget = { x: from.x, y: from.y, speed: 3 };
        Field.camTarget.x = to.x; Field.camTarget.y = to.y;
        return new Promise(function (res) {
          RR.every(function () {
            if (Math.abs(Field.cam.x - to.x) < 1 && Math.abs(Field.cam.y - to.y) < 1) { Field.camTarget = null; res(); return true; }
            return false;
          });
        });
      },
      // ---- 音 ----
      bgm: function (id, opt) { RR.Audio.bgm(id, opt); },
      stopBgm: function (f) { RR.Audio.stopBgm(f); },
      sfx: function (id) { RR.Audio.sfx(id); },
      ambient: function (k) { RR.Audio.ambient(k); },
      // ---- キャラ ----
      actor: function (id) { return Field.actor(id); },
      face: function (id, dir) {
        var a = Field.actor(id);
        if (!a) return;
        if (dir === 'player' || (dir && dir.length > 5 && Field.actor(dir))) {
          var b = Field.actor(dir === 'player' ? 'player' : dir);
          var dx = b.x - a.x, dy = b.y - a.y;
          a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        } else if (dir) a.dir = dir;
      },
      move: function (id, path, opt) {
        var a = Field.actor(id);
        if (!a) return Promise.resolve();
        opt = opt || {};
        var cmds = parsePath(path);
        a.speed = opt.speed || (id === 'player' ? 1.6 : 1.3);
        if (!cmds.length) return Promise.resolve();
        return new Promise(function (res) {
          cmds.forEach(function (c) { c.force = opt.force; });
          if (id === 'player') {
            // プレイヤーは独自に処理
            var i = 0;
            var next = function () {
              if (i >= cmds.length) { res(); return; }
              var c = cmds[i++];
              if (c.wait) { RR.wait(c.wait).then(next); return; }
              a.startMove(c.dir);
              a.onArrive = function () { St.S.pos = { map: Field.map.id, x: a.x, y: a.y, dir: a.dir }; next(); };
            };
            next();
          } else {
            cmds[cmds.length - 1].done = function () {
              var wait = function () { if (!a.moving) { res(); return true; } return false; };
              if (!wait()) RR.every(wait);
            };
            a.queue = a.queue.concat(cmds);
          }
        });
      },
      emote: function (id, ch, frames) {
        var a = Field.actor(id);
        if (!a) return Promise.resolve();
        frames = frames || 40;
        a.emote = { ch: ch || '!', t: frames, max: frames };
        RR.Audio.sfx(ch === '?' ? 'question' : 'exclaim');
        return RR.wait(frames);
      },
      show: function (id) { var a = Field.actor(id); if (a) a.visible = true; },
      hide: function (id) { var a = Field.actor(id); if (a) a.visible = false; },
      spawn: function (def) {
        var a = new RR.Actor(def);
        Field.actors.push(a);
        return a;
      },
      remove: function (id) { Field.actors = Field.actors.filter(function (a) { return a.id !== id; }); },
      teleport: function (id, x, y, dir) {
        var a = Field.actor(id);
        if (!a) return;
        a.x = a.tx = x; a.y = a.ty = y; a.px = x * 16; a.py = y * 16; a.moving = false;
        if (dir) a.dir = dir;
        if (id === 'player') { St.S.pos = { map: Field.map.id, x: x, y: y, dir: a.dir }; Field.snapCamera(); }
      },
      // ---- マップ ----
      warp: function (map, x, y, dir, door) { return Field.warpTo({ map: map, x: x, y: y, dir: dir, door: !!door }); },
      reload: function () {
        var p = Field.player;
        Field.loadMap(Field.map.id, p.x, p.y, p.dir, true);
      },
      // ---- システム ----
      race: function (id, opt) { return RR.Race.run(id, opt); },
      shop: function (id) { return RR.Shop.open(id); },
      food: function (id) { return RR.Shop.food(id); },
      garage: function () { return RR.Garage.open(); },
      dealer: function () { return RR.Shop.dealer(); },
      minigame: function (id) { return RR.Minigames.run(id); },
      decorate: function () { return RR.Decorate.open(); },
      giveFurniture: function (id, n, quiet) {
        RR.Data.giveFurniture(id, n || 1);
        if (!quiet) {
          var it = RR.Data.furniture[id];
          RR.Audio.sfx('get');
          return UI.msg('{y}' + (it ? it.name : id) + '{w} を てにいれた!');
        }
        return Promise.resolve();
      },
      hasFurniture: function (id) { return RR.Data.hasFurniture(id); },
      save: function (quiet) {
        var ok = St.save();
        RR.Audio.sfx('save');
        if (!quiet) UI.toast(ok ? 'セーブ しました' : 'セーブ できません でした');
        return ok;
      },
      ending: function () { return RR.Ending.play(); },
      gameOver: function (text) { return RR.GameOver.play(text); },
      record: function (rival) { return RR.Data.record(rival); },
      won: function (rival) { var r = St.S.records[rival]; return !!(r && r.w > 0); },
      goal: function (text) { St.S.flags.goal = text; if (text) UI.toast('もくてき: ' + text, '#f8e060'); },
      chapter: function (n, title) {
        St.S.stage = n;
        RR.Audio.bgm('victory');
        return UI.banner(title, RR.CHAPTERS[n] || '', { life: 200 });
      },
      car: function () { return RR.Data.currentCar(); },
      rating: function () { return RR.Data.rating(RR.Data.currentCar()); }
    };
    return E;
  };
})();
