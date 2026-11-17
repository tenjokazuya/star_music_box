/* saveselect.js — セーブデータ（3 つ）を選ぶ画面。つづきから / さいしょから / けす */
(function () {
  'use strict';

  var W = Game.W, H = Game.H, ui = Game.ui, F = Game.font, COL = Game.ui.COL, save = Game.save, util = Game.util;
  var ROWS = 4;   // 3 スロット + せってい

  function startGame(slot, isNew) {
    Game.audio.sfx('title_start');
    Game.audio.bgm(null, { fade: 1.0 });
    Game.audio.ambient([]);
    Game.gfx.fadeOut(30, '#000000').then(function () {
      var s;
      if (isNew) { s = save.newGame(slot); Game.state.sprite = 'mio'; }
      else { save.load(slot); }
      Game.scenes.replace(Game.scenes.field, isNew ? { black: true } : { fadeFrames: 40 });
    });
  }

  var sel = Game.scenes.saveselect = {
    cur: 0, t: 0, slots: [], busy: false, bg: null,
    enter: function () {
      this.t = 0; this.busy = false;
      this.slots = save.list();
      ui.reset();
      Game.audio.bgm('title', { fade: 0.3 });
      Game.audio.ambient(['sea', 'night']);
      Game.gfx.setFade(1, '#000000');
      Game.gfx.fadeIn(16);
      Game.input.clear();
    },
    resume: function () { this.slots = save.list(); Game.input.clear(); },
    update: function () {
      this.t++;
      ui.update();
      if (ui.busy() || this.busy) { return; }
      if (Game.input.repeat('up')) { this.cur = (this.cur + ROWS - 1) % ROWS; Game.audio.sfx('cursor'); }
      if (Game.input.repeat('down')) { this.cur = (this.cur + 1) % ROWS; Game.audio.sfx('cursor'); }
      if (Game.input.pressed('b')) {
        Game.audio.sfx('cancel'); this.busy = true;
        Game.gfx.fadeOut(14, '#000000').then(function () { Game.scenes.replace(Game.scenes.title); });
        return;
      }
      if (!Game.input.pressed('a')) { return; }
      var self = this;
      if (this.cur === 3) { Game.audio.sfx('ok'); Game.scenes.push(Game.scenes.settings); return; }
      var slot = this.cur + 1, data = this.slots[this.cur];
      Game.audio.sfx('ok');
      if (!data) {
        ui.say('このデータで はじめる？', null, { choices: ['はじめる', 'やめる'], cancel: 1 }).then(function (i) {
          if (i === 0) { self.busy = true; startGame(slot, true); }
        });
      } else {
        ui.say('データ ' + slot + ' を どうする？', null, { choices: ['つづきから', 'さいしょから', 'けす', 'もどる'], cancel: 3 }).then(function (i) {
          if (i === 0) { self.busy = true; startGame(slot, false); }
          else if (i === 1) {
            ui.say('いまの データは きえて、\\pさいしょから はじめるよ。いい？', null, { choices: ['はじめる', 'やめる'], cancel: 1 }).then(function (j) {
              if (j === 0) { save.erase(slot); self.busy = true; startGame(slot, true); }
            });
          } else if (i === 2) {
            ui.say('データ ' + slot + ' を けす。\\pもとには もどせないよ。', null, { choices: ['けす', 'やめる'], cancel: 1 }).then(function (j) {
              if (j === 0) { save.erase(slot); Game.audio.sfx('buzz'); self.slots = save.list(); }
            });
          }
        });
      }
    },
    draw: function (g) {
      // 背景（夜の海のぼかし）
      g.fillStyle = '#0c1440'; g.fillRect(0, 0, W, H);
      for (var y = 0; y < H; y += 4) {
        var k = y / H;
        g.fillStyle = k < 0.5 ? '#101a52' : '#142a6a';
        g.fillRect(0, y, W, 2);
        for (var x = (y / 4 % 2) * 6; x < W; x += 12) { g.fillStyle = '#1c3a86'; g.fillRect((x + this.t * 0.3 + y) % W | 0, y + 2, 4, 1); }
      }
      for (var s = 0; s < 24; s++) {
        var sx = (s * 53) % W, sy = (s * 37) % 80;
        if ((this.t + s * 11) % 70 < 50) { g.fillStyle = '#b8c0ff'; g.fillRect(sx, sy, 1, 1); }
      }
      ui.text(g, 'データを えらぶ', 12, 3, COL.accent);
      for (var i = 0; i < 3; i++) { this.drawSlot(g, i); }
      // せってい
      var on = this.cur === 3;
      ui.window(g, 8, 135, 224, 20, on ? { border: '#ffe890' } : { border: '#8890b0' });
      ui.text(g, 'せってい', 22, 141, on ? COL.accent : COL.text);
      if (on) { F.draw(g, '▶', 12 + (Math.floor(this.t / 12) % 2), 141, COL.accent); }
      ui.draw(g);
    },
    drawSlot: function (g, i) {
      var y = 14 + i * 40, on = this.cur === i, d = this.slots[i];
      ui.window(g, 8, y, 224, 36, on ? { border: '#ffe890', fill: '#1c2c6c', fill2: '#243680' } : { border: '#8890b0' });
      if (on) { F.draw(g, '▶', 12 + (Math.floor(this.t / 12) % 2), y + 13, COL.accent); }
      ui.text(g, 'データ ' + (i + 1), 24, y + 6, on ? COL.accent : COL.text);
      if (!d) {
        ui.text(g, '── あたらしく はじめる ──', 120, y + 20, COL.dim, { align: 'center' });
        return;
      }
      var sm = save.summary(d);
      ui.text(g, sm.place, 24, y + 20, COL.text);
      ui.text(g, util.formatTime(d.playSec), 224, y + 6, COL.text, { align: 'right' });
      // 3 つのどうぐ
      var ids = ['oil', 'lens', 'flint'], flags = ['got_oil', 'got_lens', 'got_flint'];
      for (var k = 0; k < 3; k++) {
        var got = !!d.flags[flags[k]];
        g.globalAlpha = got ? 1 : 0.28;
        g.drawImage(Game.items.icon(ids[k]), 112 + k * 18, y + 17);
        g.globalAlpha = 1;
      }
      F.draw(g, '★', 172, y + 20, sm.stars ? '#ffd860' : COL.dim);
      ui.text(g, '×' + sm.stars, 183, y + 20, COL.text);
      if (sm.cleared) { ui.text(g, 'クリア！', 224, y + 20, '#ffd860', { align: 'right' }); }
    }
  };
})();
