/* menu.js — スタートメニュー（もちもの・めもちょう・きろく・せってい・パズルのやりなおし・タイトルへ）と設定画面 */
(function () {
  'use strict';

  var W = Game.W, H = Game.H;
  var ui = Game.ui, F = Game.font, COL = Game.ui.COL, util = Game.util, save = Game.save;

  /* ================= 設定（タイトルからも使う） ================= */
  var SET_ROWS = [
    { key: 'bgm', label: 'おんがく', kind: 'num' },
    { key: 'sfx', label: 'こうかおん', kind: 'num' },
    { key: 'amb', label: 'かんきょうおん', kind: 'num' },
    { key: 'textSpeed', label: 'もじの はやさ', kind: 'list', list: ['ゆっくり', 'ふつう', 'はやい'], base: 1 },
    { key: 'softkeys', label: 'ソフトキー', kind: 'list', list: ['じどう', 'ひょうじ', 'かくす'], map: ['auto', 'on', 'off'] },
    { key: 'lcd', label: 'がめん', kind: 'list', list: ['ふつう', 'えきしょうふう'], map: [false, true] },
    { key: 'vibrate', label: 'しんどう', kind: 'list', list: ['なし', 'あり'], map: [false, true] },
    { key: 'back', label: 'もどる', kind: 'back' }
  ];

  var settingsScene = Game.scenes.settings = {
    overlay: true,
    cur: 0, t: 0,
    enter: function () { this.cur = 0; this.t = 0; },
    update: function () {
      this.t++;
      var n = SET_ROWS.length;
      if (Game.input.repeat('up')) { this.cur = (this.cur + n - 1) % n; Game.audio.sfx('cursor'); }
      if (Game.input.repeat('down')) { this.cur = (this.cur + 1) % n; Game.audio.sfx('cursor'); }
      var row = SET_ROWS[this.cur];
      var dx = (Game.input.repeat('right') ? 1 : 0) - (Game.input.repeat('left') ? 1 : 0);
      if (row.kind === 'back') {
        if (Game.input.pressed('a') || Game.input.pressed('b') || Game.input.pressed('start')) { Game.audio.sfx('cancel'); Game.scenes.pop(); }
        return;
      }
      if (Game.input.pressed('b') || Game.input.pressed('start')) { Game.audio.sfx('cancel'); Game.scenes.pop(); return; }
      if (!dx && Game.input.pressed('a')) { dx = 1; }
      if (dx) {
        var s = Game.settings;
        if (row.kind === 'num') {
          var v = util.clamp(s[row.key] + dx, 0, 10);
          if (v === s[row.key] && Game.input.pressed('a')) { v = 0; }
          s[row.key] = v;
          Game.audio.applySettings();
          Game.audio.sfx(row.key === 'sfx' ? 'ok' : 'cursor');
        } else {
          var idx = row.map ? row.map.indexOf(s[row.key]) : s[row.key] - row.base;
          idx = (idx + dx + row.list.length) % row.list.length;
          s[row.key] = row.map ? row.map[idx] : idx + row.base;
          Game.audio.sfx('cursor');
          if (Game.display) { Game.display.layout(); }
        }
        Game.settings.save();
      }
    },
    draw: function (g) {
      g.fillStyle = 'rgba(8,10,30,0.6)'; g.fillRect(0, 0, W, H);
      ui.window(g, 12, 6, 216, 148);
      ui.text(g, 'せってい', 24, 14, COL.accent);
      for (var i = 0; i < SET_ROWS.length; i++) {
        var r = SET_ROWS[i], y = 32 + i * 15;
        var on = i === this.cur;
        if (on) { F.draw(g, '▶', 20 + (Math.floor(this.t / 12) % 2), y, COL.accent); }
        ui.text(g, r.label, 32, y, on ? COL.accent : COL.text);
        if (r.kind === 'num') {
          var v = Game.settings[r.key];
          for (var k = 0; k < 10; k++) {
            g.fillStyle = k < v ? (on ? '#ffd860' : '#8ab4f8') : '#2c3a74';
            g.fillRect(124 + k * 7, y + 1, 5, 8);
          }
          ui.text(g, String(v), 205, y, COL.text, { align: 'left' });
        } else if (r.kind === 'list') {
          var idx = r.map ? r.map.indexOf(Game.settings[r.key]) : Game.settings[r.key] - r.base;
          ui.text(g, '◀', 124, y, on ? COL.accent : COL.dim);
          ui.text(g, r.list[idx], 176, y, COL.text, { align: 'center' });
          ui.text(g, '▶', 216, y, on ? COL.accent : COL.dim);
        }
      }
    }
  };

  /* ================= もちもの ================= */
  var itemsScene = {
    overlay: true, cur: 0, t: 0, rows: [],
    enter: function () {
      this.cur = 0; this.t = 0;
      this.rows = Game.state.items.filter(function (id) { return id !== 'star'; }).map(function (id) { return { id: id, name: Game.items.name(id) }; });
      var stars = save.count('star_');
      if (stars > 0) { this.rows.push({ id: 'star', name: 'ほしの かけら', count: stars }); }
    },
    update: function () {
      this.t++;
      var n = this.rows.length;
      if (n && Game.input.repeat('up')) { this.cur = (this.cur + n - 1) % n; Game.audio.sfx('cursor'); }
      if (n && Game.input.repeat('down')) { this.cur = (this.cur + 1) % n; Game.audio.sfx('cursor'); }
      if (Game.input.pressed('b') || Game.input.pressed('start') || Game.input.pressed('a')) { Game.audio.sfx('cancel'); Game.scenes.pop(); }
    },
    draw: function (g) {
      g.fillStyle = 'rgba(8,10,30,0.55)'; g.fillRect(0, 0, W, H);
      ui.window(g, 6, 6, 228, 148);
      ui.text(g, 'もちもの', 18, 13, COL.accent);
      if (!this.rows.length) { ui.text(g, 'なにも もっていない。', 18, 40, COL.dim); return; }
      for (var i = 0; i < this.rows.length; i++) {
        var r = this.rows[i], y = 30 + i * 15;
        if (i === this.cur) { F.draw(g, '▶', 14 + (Math.floor(this.t / 12) % 2), y, COL.accent); }
        g.drawImage(Game.items.icon(r.id), 26, y - 3);
        ui.text(g, r.name + (r.count ? ' ×' + r.count : ''), 46, y, i === this.cur ? COL.accent : COL.text);
      }
      // せつめい
      var sel = this.rows[this.cur];
      var desc = Game.items.defs[sel.id].desc.split('\n');
      ui.window(g, 12, 112, 216, 36, { fill: '#101a40', fill2: '#16224e' });
      for (var k = 0; k < desc.length; k++) { ui.text(g, desc[k], 22, 119 + k * 13, COL.text); }
    }
  };

  /* ================= めもちょう ================= */
  var memoScene = {
    overlay: true, t: 0, lines: [],
    enter: function () {
      this.t = 0;
      this.lines = Game.objectives ? Game.objectives.current() : [];
    },
    update: function () {
      this.t++;
      if (Game.input.pressed('b') || Game.input.pressed('start') || Game.input.pressed('a')) { Game.audio.sfx('cancel'); Game.scenes.pop(); }
    },
    draw: function (g) {
      g.fillStyle = 'rgba(8,10,30,0.55)'; g.fillRect(0, 0, W, H);
      ui.window(g, 6, 6, 228, 148);
      ui.text(g, 'めもちょう', 18, 13, COL.accent);
      var y = 32;
      for (var i = 0; i < this.lines.length; i++) {
        var ls = F.wrap(this.lines[i], 196);
        for (var j = 0; j < ls.length; j++) {
          ui.text(g, (j === 0 ? '・' : '　') + ls[j], 18, y, COL.text);
          y += 14;
        }
        y += 4;
      }
      if (!this.lines.length) { ui.text(g, 'いまは なにも ない。', 18, 36, COL.dim); }
    }
  };

  /* ================= メインメニュー ================= */
  var menu = Game.scenes.menu = {
    overlay: true, cur: 0, t: 0, entries: [], open: 0,
    enter: function () {
      this.t = 0; this.open = 0;
      var self = this;
      this.entries = [
        { id: 'items', label: 'もちもの' },
        { id: 'memo', label: 'めもちょう' },
        { id: 'save', label: 'きろくする' }
      ];
      if (Game.field.canResetPuzzle()) { this.entries.push({ id: 'reset', label: 'パズルを もどす' }); }
      this.entries.push({ id: 'settings', label: 'せってい' });
      this.entries.push({ id: 'title', label: 'タイトルへ' });
      this.entries.push({ id: 'close', label: 'とじる' });
      if (this.cur >= this.entries.length) { this.cur = 0; }
      Game.field.snapshot();
    },
    resume: function () { this.t = 0; Game.input.clear(); },
    close: function () { Game.audio.sfx('menu_close'); Game.scenes.pop(); },
    update: function () {
      this.t++;
      this.open = Math.min(1, this.open + 0.25);
      ui.update();
      if (ui.busy()) { return; }
      var n = this.entries.length;
      if (Game.input.repeat('up')) { this.cur = (this.cur + n - 1) % n; Game.audio.sfx('cursor'); }
      if (Game.input.repeat('down')) { this.cur = (this.cur + 1) % n; Game.audio.sfx('cursor'); }
      if (Game.input.pressed('b') || Game.input.pressed('start')) { this.close(); return; }
      if (!Game.input.pressed('a')) { return; }
      var e = this.entries[this.cur];
      var self = this;
      Game.audio.sfx('ok');
      if (e.id === 'close') { this.close(); }
      else if (e.id === 'items') { Game.scenes.push(itemsScene); }
      else if (e.id === 'memo') { Game.scenes.push(memoScene); }
      else if (e.id === 'settings') { Game.scenes.push(settingsScene); }
      else if (e.id === 'reset') {
        ui.say('パズルを さいしょの ばしょに もどす？', null, { choices: ['はい', 'いいえ'], cancel: 1 }).then(function (i) {
          if (i === 0) { Game.scenes.pop(); Game.field.resetPuzzle(); }
        });
      } else if (e.id === 'save') {
        ui.say('ここまでを きろくする？', null, { choices: ['はい', 'いいえ'], cancel: 1 }).then(function (i) {
          if (i !== 0) { return; }
          Game.audio.sfx('save');
          Game.gfx.flash('#e8f4ff', 20, 0.4);
          var ok = save.commit();
          ui.say(ok ? 'きろくした。' : 'きろくできなかった。', null);
        });
      } else if (e.id === 'title') {
        ui.say('タイトルに もどる？\\pきろくしていない ぶんは きえるよ。', null, { choices: ['もどる', 'やめる'], cancel: 1 }).then(function (i) {
          if (i === 0) { Game.scenes.toTitle(); }
        });
      }
    },
    draw: function (g) {
      var k = this.open;
      var n = this.entries.length;
      var w = 96, h = n * 15 + 12;
      var x = W - w - 5, y = 5;
      // 左: じょうほう
      var s = Game.state;
      var map = Game.maps.list[s.map];
      ui.window(g, 5, 5, 128, 64);
      ui.text(g, 'ミオ', 14, 13, COL.accent);
      ui.text(g, map ? map.name : '', 14, 27, COL.text);
      ui.text(g, 'プレイ ' + util.formatTime(s.playSec), 14, 41, COL.text);
      var stars = save.count('star_');
      F.draw(g, '★', 14, 55, stars ? '#ffd860' : COL.dim);
      ui.text(g, '×' + stars, 25, 55, COL.text);
      // 右: コマンド
      var hh = Math.round(h * util.ease.outCubic(k));
      ui.window(g, x, y, w, Math.max(8, hh));
      if (k < 0.9) { return; }
      for (var i = 0; i < n; i++) {
        var yy = y + 9 + i * 15;
        var on = i === this.cur;
        if (on) { F.draw(g, '▶', x + 7 + (Math.floor(this.t / 12) % 2), yy, COL.accent); }
        ui.text(g, this.entries[i].label, x + 19, yy, on ? COL.accent : COL.text);
      }
      ui.draw(g);
    }
  };
})();
