/* エンディング（夜明けのヤシャ岳 → その後の人々 → クレジット）とゲームオーバー
 * クレジットは「PRODUCED BY 天上 和哉」の一文のみ
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input, P = RR.Pal;

  var dawn = null;
  function buildDawn() {
    var c = U.canvas(240, 160), g = c.g;
    var sky = ['#283068', '#584878', '#a05c78', '#e08070', '#f8b070', '#f8d890'];
    for (var y = 0; y < 120; y++) for (var x = 0; x < 240; x++) {
      var t = y / 120 * (sky.length - 1), i = Math.floor(t), f = t - i;
      g.fillStyle = f > P.dither(x, y) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i];
      g.fillRect(x, y, 1, 1);
    }
    var layers = [{ c: '#6c4c6c', h: 98, a: 16, f: 0.05, s: 2 }, { c: '#4c3454', h: 110, a: 12, f: 0.08, s: 5 }, { c: '#2c2038', h: 124, a: 10, f: 0.12, s: 1 }];
    layers.forEach(function (L) {
      for (var x = 0; x < 240; x++) {
        var top = L.h - Math.abs(Math.sin(x * L.f + L.s) * L.a) - Math.sin(x * L.f * 2.3) * L.a * 0.3;
        g.fillStyle = L.c; g.fillRect(x, Math.round(top), 1, 160);
      }
    });
    // 展望台の柵
    g.fillStyle = '#18101c'; g.fillRect(0, 138, 240, 22);
    for (x = 0; x < 240; x += 12) g.fillRect(x, 128, 2, 10);
    g.fillRect(0, 130, 240, 2);
    dawn = c;
  }

  // ---- その後の人々 ----
  function epilogue() {
    var S = RR.State.S;
    var list = [
      { look: 'tetsu', name: 'テツ', text: 'ガレージの シャッターは きょうも あいている。' },
      { look: 'mio', name: 'ミオ', text: 'スタンドの バイトは つづけている らしい。' },
      { look: 'kenta', name: 'ケンタ', text: 'コンビニの まえで こんどは じぶんが おしえる がわに なった。' },
      { look: 'saki', name: 'サキ', text: 'ツヅラの ヘアピンで あたらしい ラインを ためしている。' },
      { look: 'gou', name: 'ゴウ', text: 'ターボの おとが ヘビノセに ひびく。' },
      { look: 'shinobu', name: 'シノブ', text: S && S.flags.shinobu_quest ? 'きりの よるには ときどき ガレージに かおを だす。' : 'きりの たにで いまも ひとりで はしっている。' },
      { look: 'kurosawa', name: 'クロサワ', text: 'ヤシャの ちょうじょうで ときどき よあけを みている。' }
    ];
    return list;
  }

  var EndScene = {
    opaque: true,
    enter: function () {
      if (!dawn) buildDawn();
      this.t = 0; this.phase = 0; this.pt = 0;
      this.people = epilogue();
      this.idx = 0;
      RR.Audio.bgm('ending');
      RR.Audio.ambient('pass');
      RR.FX.fade = 1; RR.FX.fadeIn(60, '#fff');
      var car = RR.Data.currentCar();
      this.side = car ? RR.Sprites.carSide(car.model, car.color, 0) : null;
      this.lines = [
        'ヤシャの やまに あさひが のぼる。',
        'ガレージは まもられた。',
        'よるは おわり また つぎの よるが くる。',
        'とうげの ひかりは きえない。'
      ];
    },
    update: function () {
      this.t++; this.pt++;
      var fast = In.held('a') ? 2 : 1;
      this.pt += fast - 1;
      if (this.phase === 0 && this.pt > 260) { this.next(); }
      else if (this.phase === 1 && this.pt > 200) { this.pt = 0; this.idx++; if (this.idx >= this.people.length) this.next(); }
      else if (this.phase === 2 && this.pt > 520) { this.next(); }
    },
    next: function () {
      var self = this;
      if (this.busy) return;
      this.busy = true;
      RR.FX.fadeOut(40).then(function () {
        self.phase++; self.pt = 0; self.idx = Math.min(self.idx, self.people.length - 1);
        self.busy = false;
        if (self.phase >= 3) { RR.Scene.pop(true); return; }
        if (self.phase === 2) RR.Audio.stopBgm(4);
        RR.FX.fadeIn(40);
      });
    },
    draw: function (g) {
      var t = this.t;
      if (this.phase === 0) {
        g.drawImage(dawn, 0, 0);
        // 太陽
        var sy = Math.round(118 - Math.min(40, this.pt * 0.15));
        g.fillStyle = '#fff4c8';
        for (var y = -8; y <= 8; y++) { var w = Math.floor(Math.sqrt(64 - y * y)); g.fillRect(160 - w, sy + y, w * 2, 1); }
        g.drawImage(dawn, 0, 96, 240, 64, 0, 96, 240, 64);
        if (this.side) g.drawImage(this.side, 40, 112);
        var li = Math.min(this.lines.length - 1, Math.floor(this.pt / 65));
        F.draw(g, this.lines[li], 120, 20, '#ffffff', { align: 'center', shadow: '#5c3050' });
      } else if (this.phase === 1) {
        var p = this.people[Math.min(this.idx, this.people.length - 1)];
        var hue = ['#203050', '#304060', '#3c2c50', '#2c4040', '#40302c', '#283848', '#301c28'][this.idx % 7];
        g.fillStyle = hue; g.fillRect(0, 0, 240, 160);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        for (var i = 0; i < 12; i++) g.fillRect(0, i * 14 + (t >> 2) % 14, 240, 6);
        var spr = RR.Sprites.person(RR.Looks[p.look]);
        g.save(); g.imageSmoothingEnabled = false;
        var bob = ((t >> 4) & 1);
        g.drawImage(spr.sheet, 0, 0, 16, 24, 104, 30 + bob, 32, 48);
        g.restore();
        var a = U.clamp(Math.min(this.pt / 20, (200 - this.pt) / 20), 0, 1);
        g.globalAlpha = a;
        F.draw(g, p.name, 120, 86, '#f8e060', { align: 'center' });
        var lines = F.wrap(p.text, 210);
        lines.forEach(function (l, i) { F.draw(g, l, 120, 104 + i * 12, '#f8f8f8', { align: 'center' }); });
        g.globalAlpha = 1;
      } else if (this.phase === 2) {
        g.fillStyle = '#000'; g.fillRect(0, 0, 240, 160);
        var al = U.clamp(this.pt / 90, 0, 1) * U.clamp((520 - this.pt) / 60, 0, 1);
        g.globalAlpha = al;
        F.draw(g, 'PRODUCED BY', 120, 50, '#d0d0e0', { align: 'center', shadow: null });
        var name = ['天', '上', ' ', '和', '哉'];
        var x = 120 - (32 * 4 + 16) / 2;
        name.forEach(function (ch) {
          if (ch === ' ') { x += 16; return; }
          F.drawBig(g, ch, x, 68, '#f8f8f8', 2);
          x += 32;
        });
        g.globalAlpha = 1;
      }
    }
  };

  RR.Ending = {
    _scene: EndScene,
    play: function () {
      return RR.FX.fadeOut(60, '#fff').then(function () {
        RR.Audio.stopBgm(1);
        return RR.Scene.push(Object.create(EndScene));
      }).then(function () {
        RR.FX.fade = 1;
        RR.FX.fadeColor = '#000';
      });
    }
  };

  // ---------- ゲームオーバー ----------
  var GOScene = {
    opaque: true,
    enter: function (text) {
      this.t = 0; this.text = text || ''; this.sel = 0;
      RR.Audio.bgm('sad');
      RR.Audio.ambient('none');
      RR.FX.fade = 1; RR.FX.fadeIn(40);
    },
    update: function () {
      this.t++;
      if (this.t < 90 || this.done) return;
      if (In.repeat('up') || In.repeat('down')) { this.sel = 1 - this.sel; RR.Audio.sfx('cursor'); }
      if (In.pressed('a')) {
        RR.Audio.sfx('ok');
        this.done = true;
        var sel = this.sel, slot = RR.State.slot;
        RR.FX.fadeOut(40).then(function () {
          RR.Scene.stack.length = 0;
          if (sel === 0 && RR.State.load(slot)) RR.Scene.set(RR.Field);
          else RR.Scene.set(RR.Title, { menu: true });
        });
      }
    },
    draw: function (g) {
      g.fillStyle = '#100408'; g.fillRect(0, 0, 240, 160);
      for (var y = 0; y < 160; y += 2) { g.fillStyle = 'rgba(80,0,20,' + (0.15 + 0.1 * Math.sin(y * 0.1 + this.t * 0.02)) + ')'; g.fillRect(0, y, 240, 1); }
      RR.Race.bigText(g, 'GAME OVER', 120, 46, '#f86858', 2, this.t);
      var lines = [];
      this.text.split('|').forEach(function (t) { lines = lines.concat(F.wrap(t, 220)); });
      lines.forEach(function (l, i) { F.draw(g, l, 120, 70 + i * 12, '#f0d0d0', { align: 'center' }); });
      if (this.t >= 90) {
        ['さいごの きろくから', 'タイトルへ'].forEach(function (s, i) {
          F.draw(g, s, 100, 116 + i * 14, '#f8f8f8');
          if (i === this.sel) RR.UI.cursor(g, 86, 116 + i * 14);
        }, this);
      }
    }
  };
  RR.GameOver = {
    play: function (text) {
      return RR.FX.fadeOut(40).then(function () {
        RR.Scene.set(Object.create(GOScene), text);
        return new Promise(function () { }); // ここで物語は止まる
      });
    }
  };
})();
