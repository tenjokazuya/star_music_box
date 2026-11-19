/* バイトのミニゲーム: せんしゃ（ガソリンスタンド）/ ナットしめ（ガレージ）/ もりつけ（ラーメン屋）
 * RR.Minigames.run(id) → {score, pay}（お金はここで加算する）
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input, UI = RR.UI, P = RR.Pal;
  var MG = RR.Minigames = {};

  var INFO = {
    wash: { title: 'せんしゃ', rule: 'じゅうじキーで スポンジを うごかし|Aを おしている あいだ よごれが おちる。|じかん いっぱい ピカピカに しよう!' },
    nut: { title: 'ナットしめ', rule: 'ひょうじ された ボタンを すばやく おせ!|まちがえると やりなおし。|4ほんの タイヤを はやく こうかん しよう。' },
    ramen: { title: 'もりつけ', rule: 'ちゅうもんを おぼえて その じゅんばんに|◀▶で えらんで Aで のせる。Bで やりなおし。|たくさん だして おきゃくを まんぞく させよう。' }
  };

  MG.run = function (id) {
    var sc = Object.create(Base);
    sc.kind = id;
    RR.Audio.sfx('swoosh');
    return RR.FX.fadeOut(16).then(function () {
      var p = RR.Scene.push(sc, id);
      RR.FX.fadeIn(16);
      return p;
    }).then(function (res) {
      if (RR.Field) RR.Field.restoreAudio();
      return RR.FX.fadeIn(12).then(function () { return res; });
    });
  };

  var Base = {
    opaque: true,
    enter: function (id) {
      this.state = 'intro'; this.t = 0; this.score = 0; this.time = 0;
      this.game = GAMES[id];
      this.game.init(this);
      RR.Audio.bgm('minigame');
    },
    update: function () {
      this.t++;
      if (this.state === 'intro') { if (this.t > 20 && In.pressed('a')) { this.state = 'count'; this.t = 0; RR.Audio.sfx('ok'); } return; }
      if (this.state === 'count') {
        if (this.t % 40 === 1 && this.t < 120) RR.Audio.sfx('beep');
        if (this.t >= 120) { this.state = 'play'; this.t = 0; RR.Audio.sfx('go'); }
        return;
      }
      if (this.state === 'play') {
        this.time += 1 / 60;
        this.game.update(this);
        if (this.time >= this.game.limit || this.cleared) { this.finish(); }
        return;
      }
      if (this.state === 'result') {
        if (this.t > 40 && In.pressed('a')) {
          RR.Audio.sfx('ok');
          var self = this;
          RR.FX.fadeOut(16).then(function () { RR.Audio.stopBgm(0.2); RR.Scene.pop({ score: self.score, pay: self.pay, rank: self.rank }); });
          this.state = 'done';
        }
      }
    },
    finish: function () {
      this.state = 'result'; this.t = 0;
      var r = this.game.result(this);
      this.pay = r.pay; this.rank = r.rank;
      RR.State.addMoney(this.pay);
      var S = RR.State.S;
      if (S) { S.stats.jobs[this.kind] = (S.stats.jobs[this.kind] || 0) + 1; var bk = 'job_best_' + this.kind; if (!S.flags[bk] || this.score > S.flags[bk]) S.flags[bk] = this.score; }
      RR.Audio.stopBgm(0.2);
      RR.Audio.sfx(r.rank === 'S' || r.rank === 'A' ? 'trophy' : 'coin');
    },
    draw: function (g) {
      this.game.draw(g, this);
      var info = INFO[this.kind];
      // 上部の時間
      if (this.state === 'play' || this.state === 'count') {
        var left = Math.max(0, Math.ceil(this.game.limit - this.time));
        RR.RaceHUD.box(g, 196, 2, 42, 14);
        F.draw(g, 'のこり' + left, 234, 5, left <= 5 ? '#f86858' : '#f8f8f8', { align: 'right' });
      }
      if (this.state === 'intro') {
        UI.win(g, 20, 30, 200, 100);
        F.draw(g, info.title, 120, 38, '#f8e060', { align: 'center', scale: 2 });
        info.rule.split('|').forEach(function (l, i) { F.draw(g, l, 30, 66 + i * 13, '#f8f8f8'); });
        if ((this.t >> 4) & 1) F.draw(g, 'Aで はじめる', 120, 114, '#a8f8c0', { align: 'center' });
      } else if (this.state === 'count') {
        RR.Race.bigText(g, String(3 - Math.floor(this.t / 40)), 120, 70, '#f8f8f8', 3, this.t % 40);
      } else if (this.state === 'result' || this.state === 'done') {
        UI.win(g, 40, 40, 160, 80);
        F.draw(g, 'おつかれさま!', 120, 48, '#f8e060', { align: 'center' });
        F.draw(g, this.game.scoreText(this), 120, 66, '#f8f8f8', { align: 'center' });
        F.draw(g, 'ランク ' + this.rank, 120, 80, this.rank === 'S' ? '#f8e060' : '#c8d0f0', { align: 'center' });
        F.draw(g, 'バイトだい +¥' + U.money(this.pay), 120, 96, '#f8e060', { align: 'center' });
      }
    }
  };

  var GAMES = {};

  // ---------- せんしゃ ----------
  GAMES.wash = {
    limit: 40,
    init: function (s) {
      s.sx = 120; s.sy = 80; s.cars = 0; s.bub = [];
      this.newCar(s);
    },
    newCar: function (s) {
      var models = ['hayate', 'regulus', 'tsubame', 'sylph', 'raiden'];
      var colors = ['red', 'white', 'blue', 'black', 'yellow', 'green'];
      s.car = RR.Sprites.carTop(U.pick(models), U.pick(colors), 2, 0);
      s.cw = s.car.width * 2; s.ch = s.car.height * 2;
      s.cx = 120 - s.cw / 2; s.cy = 82 - s.ch / 2;
      // 汚れの格子（4px毎）
      s.gw = Math.ceil(s.cw / 4); s.gh = Math.ceil(s.ch / 4);
      s.dirt = new Float32Array(s.gw * s.gh);
      var rnd = U.rng(Math.floor(Math.random() * 1e6));
      for (var i = 0; i < 9; i++) {
        var bx = rnd() * s.gw, by = rnd() * s.gh, r = 2 + rnd() * 4;
        for (var y = 0; y < s.gh; y++) for (var x = 0; x < s.gw; x++) {
          var d = Math.sqrt((x - bx) * (x - bx) + (y - by) * (y - by));
          if (d < r) s.dirt[y * s.gw + x] = Math.max(s.dirt[y * s.gw + x], 1 - d / r * 0.5);
        }
      }
      s.slide = 0;
      s.dirt0 = 0;
      for (var k = 0; k < s.dirt.length; k++) s.dirt0 += s.dirt[k];
    },
    clean: function (s) {
      var tot = 0;
      for (var i = 0; i < s.dirt.length; i++) tot += s.dirt[i];
      return 1 - tot / Math.max(1e-6, s.dirt0);
    },
    update: function (s) {
      var sp = 2.4;
      if (In.held('left')) s.sx -= sp; if (In.held('right')) s.sx += sp;
      if (In.held('up')) s.sy -= sp; if (In.held('down')) s.sy += sp;
      s.sx = U.clamp(s.sx, 20, 220); s.sy = U.clamp(s.sy, 20, 150);
      if (s.slide > 0) { s.slide++; if (s.slide > 40) this.newCar(s); return; }
      if (In.held('a')) {
        var gx = (s.sx - s.cx) / 4, gy = (s.sy - s.cy) / 4;
        var hit = false;
        for (var y = Math.floor(gy - 3); y <= gy + 3; y++) for (var x = Math.floor(gx - 3); x <= gx + 3; x++) {
          if (x < 0 || y < 0 || x >= s.gw || y >= s.gh) continue;
          var k = y * s.gw + x;
          if (s.dirt[k] > 0) { s.dirt[k] = Math.max(0, s.dirt[k] - 0.06); hit = true; }
        }
        if (RR.Game.frame % 8 === 0) RR.Audio.sfx('scrub');
        if (hit && RR.Game.frame % 3 === 0) s.bub.push({ x: s.sx + (Math.random() - 0.5) * 14, y: s.sy + (Math.random() - 0.5) * 14, t: 0 });
        if (this.clean(s) >= 0.97) {
          s.cars++; s.score = s.cars; s.slide = 1;
          RR.Audio.sfx('correct'); UI.toast('ピカピカ! ' + s.cars + 'だいめ', '#a0f8c0');
        }
      }
      s.bub = s.bub.filter(function (b) { b.t++; b.y -= 0.3; return b.t < 40; });
    },
    draw: function (g, s) {
      g.fillStyle = '#6c7c8c'; g.fillRect(0, 0, 240, 160);
      for (var y = 0; y < 160; y += 16) { g.fillStyle = '#62707e'; g.fillRect(0, y, 240, 1); }
      g.fillStyle = '#d8d040'; g.fillRect(60, 0, 3, 160); g.fillRect(177, 0, 3, 160);
      var off = s.slide ? (s.slide < 20 ? -s.slide * 10 : (40 - s.slide) * 10) : 0;
      g.save(); g.imageSmoothingEnabled = false;
      g.drawImage(s.car, s.cx, s.cy + off, s.cw, s.ch);
      g.restore();
      // 汚れ
      if (!s.slide) {
        for (var gy = 0; gy < s.gh; gy++) for (var gx = 0; gx < s.gw; gx++) {
          var d = s.dirt[gy * s.gw + gx];
          if (d <= 0.05) continue;
          var x = s.cx + gx * 4, yy = s.cy + gy * 4;
          g.globalAlpha = Math.min(0.85, d);
          g.fillStyle = ((gx + gy) & 1) ? '#6c5434' : '#8c7048';
          g.fillRect(x, yy, 4, 4);
        }
        g.globalAlpha = 1;
      }
      s.bub.forEach(function (b) { g.fillStyle = b.t > 30 ? '#c0e0f8' : '#f8f8f8'; g.fillRect(Math.round(b.x), Math.round(b.y), 2, 2); });
      // スポンジ
      var on = In.held('a');
      g.fillStyle = '#202020'; g.fillRect(s.sx - 9, s.sy - 6, 18, 12);
      g.fillStyle = on ? '#f8d040' : '#f8e870'; g.fillRect(s.sx - 8, s.sy - 5, 16, 10);
      g.fillStyle = '#f8f8c0'; g.fillRect(s.sx - 8, s.sy - 5, 16, 2);
      F.draw(g, 'きれい ' + Math.round(U.clamp(this.clean(s), 0, 1) * 100) + '%', 4, 4, '#f8f8f8');
      F.draw(g, s.cars + ' だい', 4, 16, '#f8e060');
    },
    result: function (s) {
      var pay = s.cars * 450 + Math.round(U.clamp(this.clean(s), 0, 1) * 200);
      var rank = s.cars >= 5 ? 'S' : s.cars >= 4 ? 'A' : s.cars >= 2 ? 'B' : 'C';
      return { pay: pay, rank: rank };
    },
    scoreText: function (s) { return 'あらった くるま ' + s.cars + ' だい'; }
  };

  // ---------- ナットしめ ----------
  var KEYS = ['up', 'down', 'left', 'right', 'a', 'b'];
  var KEYLABEL = { up: '↑', down: '↓', left: '←', right: '→', a: 'A', b: 'B' };
  GAMES.nut = {
    limit: 45,
    init: function (s) { s.wheel = 0; s.nut = 0; s.miss = 0; s.done = 0; s.combo = 0; s.best = 0; s.shake = 0; this.next(s); },
    next: function (s) { s.key = U.pick(KEYS); s.kt = 0; },
    update: function (s) {
      s.kt++;
      if (s.shake > 0) s.shake--;
      var pressed = null;
      KEYS.forEach(function (k) { if (In.pressed(k)) pressed = k; });
      if (s.wheelT > 0) { s.wheelT--; return; }
      if (!pressed) return;
      if (pressed === s.key) {
        s.nut++; s.done++; s.combo++; s.best = Math.max(s.best, s.combo);
        RR.Audio.sfx('ratchet');
        s.score = s.done * 10 + s.best * 5 - s.miss * 8;
        if (s.nut >= 5) {
          s.nut = 0; s.wheel++;
          RR.Audio.sfx('correct');
          if (s.wheel >= 4) { s.cleared = true; s.clearTime = s.time; return; }
          s.wheelT = 30;
          UI.toast('タイヤ ' + s.wheel + ' / 4', '#a0f8c0');
        }
        this.next(s);
      } else {
        s.miss++; s.combo = 0; s.shake = 10;
        RR.Audio.sfx('wrong');
        s.nut = Math.max(0, s.nut - 1);
        s.score = s.done * 10 + s.best * 5 - s.miss * 8;
      }
    },
    draw: function (g, s) {
      g.fillStyle = '#303440'; g.fillRect(0, 0, 240, 160);
      g.fillStyle = '#3c4050'; for (var y = 0; y < 160; y += 20) g.fillRect(0, y, 240, 10);
      var cx = 120 + (s.shake ? (Math.random() - 0.5) * 4 : 0), cy = 82;
      // タイヤとホイール
      var R = 44;
      for (var yy = -R; yy <= R; yy++) {
        var w = Math.floor(Math.sqrt(R * R - yy * yy));
        g.fillStyle = '#161618'; g.fillRect(cx - w, cy + yy, w * 2, 1);
      }
      for (yy = -30; yy <= 30; yy++) {
        var w2 = Math.floor(Math.sqrt(900 - yy * yy));
        g.fillStyle = yy < -10 ? '#c8ccd8' : yy < 10 ? '#a8acb8' : '#888c98'; g.fillRect(cx - w2, cy + yy, w2 * 2, 1);
      }
      g.fillStyle = '#585c68'; g.fillRect(cx - 6, cy - 6, 12, 12);
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        var nx = Math.round(cx + Math.cos(a) * 18), ny = Math.round(cy + Math.sin(a) * 18);
        var tight = i < s.nut;
        var cur = i === s.nut && !s.cleared && !(s.wheelT > 0);
        g.fillStyle = tight ? '#48c058' : '#505058'; g.fillRect(nx - 4, ny - 4, 8, 8);
        g.fillStyle = tight ? '#88e898' : '#808088'; g.fillRect(nx - 3, ny - 3, 6, 2);
        if (cur) {
          var pulse = (RR.Game.frame >> 3) & 1;
          g.fillStyle = pulse ? '#f8e060' : '#f8a040';
          g.fillRect(nx - 6, ny - 6, 12, 1); g.fillRect(nx - 6, ny + 5, 12, 1); g.fillRect(nx - 6, ny - 6, 1, 12); g.fillRect(nx + 5, ny - 6, 1, 12);
        }
      }
      if (!s.cleared && !(s.wheelT > 0)) {
        RR.UI.win(g, 100, 132, 40, 22, 'red');
        F.draw(g, KEYLABEL[s.key], 120, 135, '#f8f8f8', { align: 'center', scale: 2 });
      }
      F.draw(g, 'タイヤ ' + Math.min(4, s.wheel + 1) + '/4', 4, 4, '#f8f8f8');
      F.draw(g, 'ミス ' + s.miss, 4, 16, s.miss ? '#f87868' : '#a0a8c0');
      F.draw(g, 'れんぞく ' + s.combo, 4, 28, '#f8e060');
    },
    result: function (s) {
      var bonus = s.cleared ? Math.max(0, Math.round((this.limit - s.clearTime) * 40)) : 0;
      var pay = s.done * 50 + bonus - s.miss * 20;
      pay = Math.max(200, pay);
      var rank = s.cleared && s.miss <= 1 && s.clearTime < 25 ? 'S' : s.cleared && s.miss <= 3 ? 'A' : s.cleared ? 'B' : 'C';
      return { pay: pay, rank: rank };
    },
    scoreText: function (s) { return s.cleared ? 'こうかん かんりょう ' + Math.round(s.clearTime) + 'びょう' : 'しめた ナット ' + s.done + ' こ'; }
  };

  // ---------- もりつけ ----------
  var TOPS = [
    { id: 'chashu', name: 'チャーシュー', c: '#c87850', c2: '#f0b890' },
    { id: 'negi', name: 'ネギ', c: '#48a848', c2: '#a0e090' },
    { id: 'menma', name: 'メンマ', c: '#a88040', c2: '#d8b870' },
    { id: 'naruto', name: 'なると', c: '#f8f0f0', c2: '#e86078' },
    { id: 'egg', name: 'たまご', c: '#f8f0d8', c2: '#f8b030' },
    { id: 'nori', name: 'のり', c: '#203828', c2: '#406850' }
  ];
  function topIcon(g, t, x, y) {
    g.fillStyle = '#101010'; g.fillRect(x - 1, y - 1, 14, 14);
    g.fillStyle = t.c; g.fillRect(x, y, 12, 12);
    g.fillStyle = t.c2;
    if (t.id === 'naruto') { g.fillRect(x + 4, y + 4, 4, 4); g.fillRect(x + 3, y + 3, 6, 1); }
    else if (t.id === 'egg') { g.fillRect(x + 3, y + 3, 6, 6); }
    else if (t.id === 'negi') { g.fillRect(x + 2, y + 2, 2, 2); g.fillRect(x + 7, y + 5, 2, 2); g.fillRect(x + 4, y + 8, 2, 2); }
    else g.fillRect(x + 1, y + 1, 10, 3);
  }
  GAMES.ramen = {
    limit: 60,
    init: function (s) { s.served = 0; s.miss = 0; s.cursor = 0; this.order(s); },
    order: function (s) {
      var n = Math.min(5, 3 + Math.floor(s.served / 3));
      s.ord = []; for (var i = 0; i < n; i++) s.ord.push(Math.floor(Math.random() * TOPS.length));
      s.bowl = []; s.show = 100; s.mood = 0;
    },
    update: function (s) {
      if (s.show > 0) { s.show--; if (In.pressed('a')) s.show = 0; return; }
      if (s.serveT > 0) { s.serveT--; if (s.serveT === 0) this.order(s); return; }
      if (In.repeat('left')) { s.cursor = (s.cursor + TOPS.length - 1) % TOPS.length; RR.Audio.sfx('cursor'); }
      if (In.repeat('right')) { s.cursor = (s.cursor + 1) % TOPS.length; RR.Audio.sfx('cursor'); }
      if (In.pressed('b') && s.bowl.length) { s.bowl.pop(); RR.Audio.sfx('cancel'); }
      if (In.pressed('a')) {
        var k = s.bowl.length;
        s.bowl.push(s.cursor);
        RR.Audio.sfx('place');
        if (s.ord[k] !== s.cursor) {
          RR.Audio.sfx('wrong'); s.miss++; s.mood = -1;
          UI.toast('ちがう! さいしょから', '#f8a0a0');
          s.bowl = [];
          return;
        }
        if (s.bowl.length === s.ord.length) {
          s.served++; s.score = s.served; s.mood = 1; s.serveT = 40;
          RR.Audio.sfx('correct');
          UI.toast('おまち! ' + s.served + 'はいめ', '#a0f8c0');
        }
      }
    },
    draw: function (g, s) {
      g.fillStyle = '#5c3c28'; g.fillRect(0, 0, 240, 160);
      g.fillStyle = '#7c5434'; g.fillRect(0, 96, 240, 64);
      g.fillStyle = '#9c6c44'; g.fillRect(0, 96, 240, 2);
      // おきゃく
      var spr = RR.Sprites.person(RR.Looks[['man1', 'woman1', 'oldman', 'racer2', 'girl'][s.served % 5]]);
      g.save(); g.imageSmoothingEnabled = false;
      g.drawImage(spr.sheet, 0, 0, 16, 24, 20, 30, 32, 48);
      g.restore();
      if (s.mood) F.draw(g, s.mood > 0 ? '♥' : '×', 56, 30, s.mood > 0 ? '#f86890' : '#f84040');
      // ちゅうもん
      UI.win(g, 64, 8, 172, 44, 'paper');
      F.draw(g, 'ちゅうもん', 70, 12, '#382810', { shadow: null });
      for (var i = 0; i < s.ord.length; i++) {
        if (s.show > 0 || s.serveT > 0) topIcon(g, TOPS[s.ord[i]], 72 + i * 20, 28);
        else { g.fillStyle = '#a89070'; g.fillRect(72 + i * 20, 28, 12, 12); F.draw(g, '?', 75 + i * 20, 29, '#382810', { shadow: null }); }
      }
      if (s.show > 0) { g.fillStyle = '#c84030'; g.fillRect(72, 44, Math.round(s.show / 100 * 150), 2); }
      // どんぶり
      g.fillStyle = '#e0e0e8'; g.fillRect(90, 100, 60, 8); g.fillStyle = '#c03030'; g.fillRect(94, 108, 52, 14); g.fillStyle = '#902020'; g.fillRect(100, 122, 40, 3);
      g.fillStyle = '#e8c070'; g.fillRect(94, 100, 52, 4);
      s.bowl.forEach(function (k, i) { topIcon(g, TOPS[k], 96 + i * 10, 90 - (i & 1) * 4); });
      // えらぶ
      for (var t = 0; t < TOPS.length; t++) {
        var x = 30 + t * 32, y = 134;
        topIcon(g, TOPS[t], x, y);
        if (t === s.cursor) { g.fillStyle = '#f8e060'; g.fillRect(x - 3, y - 3, 18, 1); g.fillRect(x - 3, y + 14, 18, 1); g.fillRect(x - 3, y - 3, 1, 18); g.fillRect(x + 14, y - 3, 1, 18); }
      }
      F.draw(g, TOPS[s.cursor].name, 120, 150, '#f8f8f8', { align: 'center' });
      F.draw(g, s.served + ' はい', 4, 4, '#f8e060');
    },
    result: function (s) {
      var pay = s.served * 300 - s.miss * 50;
      pay = Math.max(200, pay);
      var rank = s.served >= 10 ? 'S' : s.served >= 7 ? 'A' : s.served >= 4 ? 'B' : 'C';
      return { pay: pay, rank: rank };
    },
    scoreText: function (s) { return 'だした ラーメン ' + s.served + ' はい'; }
  };
})();
