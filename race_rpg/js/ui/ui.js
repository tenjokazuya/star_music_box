/* UI部品: ウィンドウ / メッセージ / 選択肢 / メニュー / 帯演出 / トースト
 * テキスト中の '|' は改ページ、'\n' は改行
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input;
  var UI = RR.UI = { stack: [], toasts: [] };

  // ---------- ウィンドウ描画 ----------
  var SKINS = {
    blue: { o: '#080c18', l: '#e8f0ff', m: '#7888c8', t: '#30408c', b: '#18205a', d: '#24307a' },
    dark: { o: '#000000', l: '#a8b0c8', m: '#485070', t: '#181c2c', b: '#0c0e18', d: '#141828' },
    paper: { o: '#281808', l: '#fff8e0', m: '#c8a870', t: '#f0e0b8', b: '#d8c090', d: '#e4d0a4' },
    red: { o: '#180404', l: '#ffe0d0', m: '#c86050', t: '#802820', b: '#501410', d: '#682018' }
  };
  UI.SKINS = SKINS;
  var winCache = {};
  UI.win = function (g, x, y, w, h, skin) {
    skin = skin || 'blue';
    w = Math.round(w); h = Math.round(h);
    var key = w + 'x' + h + skin, c = winCache[key];
    if (!c) {
      var s = SKINS[skin];
      c = U.canvas(w, h);
      var q = c.g;
      // 本体のグラデーション（ディザで2色を混ぜる）
      for (var yy = 0; yy < h; yy++) {
        var t = yy / Math.max(1, h - 1);
        for (var xx = 0; xx < w; xx++) {
          var th = ((xx + yy) & 1) ? 0.33 : 0.66;
          q.fillStyle = t < 0.5 ? (t * 2 > th ? s.d : s.t) : ((t - 0.5) * 2 > th ? s.b : s.d);
          q.fillRect(xx, yy, 1, 1);
        }
      }
      // 枠
      q.fillStyle = s.o;
      q.fillRect(1, 0, w - 2, 1); q.fillRect(1, h - 1, w - 2, 1); q.fillRect(0, 1, 1, h - 2); q.fillRect(w - 1, 1, 1, h - 2);
      q.fillStyle = s.l;
      q.fillRect(2, 1, w - 4, 1); q.fillRect(1, 2, 1, h - 4); q.fillRect(2, h - 2, w - 4, 1); q.fillRect(w - 2, 2, 1, h - 4);
      q.fillStyle = s.m;
      q.fillRect(2, 2, w - 4, 1); q.fillRect(2, 2, 1, h - 4);
      q.fillStyle = s.o;
      q.globalAlpha = 0.35;
      q.fillRect(2, h - 3, w - 4, 1); q.fillRect(w - 3, 2, 1, h - 4);
      q.globalAlpha = 1;
      // 角
      q.clearRect(0, 0, 1, 1); q.clearRect(w - 1, 0, 1, 1); q.clearRect(0, h - 1, 1, 1); q.clearRect(w - 1, h - 1, 1, 1);
      winCache[key] = c;
    }
    g.drawImage(c, Math.round(x), Math.round(y));
  };
  UI.textColor = function (skin) { return skin === 'paper' ? '#382810' : '#f8f8f8'; };
  UI.shadowColor = function (skin) { return skin === 'paper' ? '#d8c090' : '#101828'; };

  // 点滅するカーソル ▶
  UI.cursor = function (g, x, y, skin) {
    var bob = (RR.Game.frame >> 3) & 1;
    F.draw(g, '▶', x + bob, y, skin === 'paper' ? '#a03818' : '#f8e060');
  };

  // ---------- ウィジェット基盤 ----------
  UI.open = function (w) {
    return new Promise(function (res) {
      w._res = res;
      w.t = 0;
      UI.stack.push(w);
    });
  };
  function close(w, val) {
    var i = UI.stack.indexOf(w);
    if (i >= 0) UI.stack.splice(i, 1);
    In.consume();
    if (w._res) w._res(val);
  }
  UI.close = close;
  UI.busy = function () { return UI.stack.length > 0; };
  UI.update = function () {
    var top = UI.stack[UI.stack.length - 1];
    if (top) {
      top.t++;
      top.update();
      In.consume();
    }
    UI.toasts = UI.toasts.filter(function (t) { t.t++; return t.t < t.life; });
    if (UI.bannerW) { UI.bannerW.t++; if (UI.bannerW.t > UI.bannerW.life) { var b = UI.bannerW; UI.bannerW = null; b.res(); } }
  };
  UI.draw = function (g) {
    UI.stack.forEach(function (w) { w.draw(g); });
    drawToasts(g);
    if (UI.bannerW) drawBanner(g, UI.bannerW);
  };

  // ---------- メッセージ ----------
  function Message(name, text, opt) {
    this.name = name ? F.expand(name) : '';
    this.opt = opt || {};
    this.skin = this.opt.skin || 'blue';
    var pages = [];
    String(text).split('|').forEach(function (p) {
      var lines = F.wrap(p, 222);
      for (var i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
    });
    this.pages = pages;
    this.page = 0;
    this.shown = 0;
    this.acc = 0;
    this.nameColor = this.opt.color || '#f8e060';
  }
  Message.prototype.total = function () {
    var n = 0;
    this.pages[this.page].forEach(function (l) { n += l.replace(/\{[a-zN]\}/g, '').length; });
    return n;
  };
  Message.prototype.update = function () {
    if (RR.DEBUG && RR.Debug && RR.Debug.auto && !this.logged) { this.logged = true; RR.Debug.hookMessage(this); }
    if (RR.DEBUG && RR.Debug && RR.Debug.auto && !this.keep) { close(this); return; }
    var speed = [0.5, 1, 2, 99][RR.Settings.data.text == null ? 1 : RR.Settings.data.text];
    var total = this.total();
    if (this.shown < total) {
      var sp = (In.held('b') ? 4 : 1) * speed;
      this.acc += sp;
      var before = this.shown;
      while (this.acc >= 1 && this.shown < total) { this.shown++; this.acc -= 1; }
      if ((this.shown >> 1) !== (before >> 1) && !this.opt.silent) RR.Audio.sfx('blip');
      if (In.pressed('a')) this.shown = total;
    } else if (In.pressed('a') || (this.opt.auto && this.t > this.opt.auto)) {
      if (this.page < this.pages.length - 1) {
        this.page++; this.shown = 0; this.acc = 0;
        RR.Audio.sfx('cursor');
      } else {
        close(this);
      }
    }
  };
  Message.prototype.draw = function (g) {
    var top = this.opt.pos === 'top';
    var y = top ? 2 : 110, x = 2, w = 236, h = 48;
    UI.win(g, x, y, w, h, this.skin);
    if (this.name) {
      var nw = F.measure(this.name) + 12;
      var ny = top ? y + h - 2 : y - 12;
      UI.win(g, x + 4, ny, nw, 15, this.skin === 'paper' ? 'paper' : 'red');
      F.draw(g, this.name, x + 10, ny + 1, this.nameColor);
    }
    var lines = this.pages[this.page], left = this.shown;
    var tc = UI.textColor(this.skin), sc = UI.shadowColor(this.skin);
    for (var i = 0; i < lines.length; i++) {
      var plain = lines[i].replace(/\{[a-zN]\}/g, '').length;
      if (left <= 0) break;
      F.draw(g, lines[i], x + 8, y + 5 + i * F.LINE, tc, { count: left, shadow: sc });
      left -= plain;
    }
    if (this.shown >= this.total() && !this.opt.auto) {
      var bob = (RR.Game.frame >> 4) & 1;
      F.draw(g, this.page < this.pages.length - 1 ? '▼' : '▼', x + w - 14, y + h - 12 + bob, '#f8e060');
    }
  };
  UI.say = function (name, text, opt) { return UI.open(new Message(name, text, opt)); };
  UI.msg = function (text, opt) { return UI.open(new Message('', text, opt)); };

  // ---------- 選択肢 ----------
  function Choice(items, opt) {
    this.items = items.map(F.expand);
    this.opt = opt || {};
    this.sel = this.opt.def || 0;
    var w = 0;
    this.items.forEach(function (s) { w = Math.max(w, F.measure(s)); });
    this.w = w + 26;
    this.h = this.items.length * 13 + 10;
    this.x = this.opt.x != null ? this.opt.x : 238 - this.w;
    this.y = this.opt.y != null ? this.opt.y : 108 - this.h;
  }
  Choice.prototype.update = function () {
    var n = this.items.length;
    if (RR.DEBUG && RR.Debug && RR.Debug.auto) { var pick = Math.min(n - 1, RR.Debug.nextChoice()); RR.Debug.log.push('  [せんたく] ' + this.items[pick]); close(this, pick); return; }
    if (In.repeat('up')) { this.sel = (this.sel + n - 1) % n; RR.Audio.sfx('cursor'); }
    if (In.repeat('down')) { this.sel = (this.sel + 1) % n; RR.Audio.sfx('cursor'); }
    if (In.pressed('a')) { RR.Audio.sfx('ok'); close(this, this.sel); }
    else if (In.pressed('b') && this.opt.cancel !== false) { RR.Audio.sfx('cancel'); close(this, n - 1); }
  };
  Choice.prototype.draw = function (g) {
    UI.win(g, this.x, this.y, this.w, this.h);
    for (var i = 0; i < this.items.length; i++) {
      F.draw(g, this.items[i], this.x + 18, this.y + 6 + i * 13, '#f8f8f8');
      if (i === this.sel) UI.cursor(g, this.x + 6, this.y + 6 + i * 13);
    }
  };
  // メッセージを出しながら選択肢（メッセージは消さずに残す）
  UI.choice = function (items, opt) { return UI.open(new Choice(items, opt)); };
  UI.ask = function (name, text, items, opt) {
    var m = new Message(name, text, { silent: false });
    m.keep = true;
    if (RR.DEBUG && RR.Debug && RR.Debug.auto) { RR.Debug.hookMessage(m); m.shown = 1e9; m.page = m.pages.length - 1; }
    var self = this;
    return new Promise(function (res) {
      // メッセージ表示が終わったらその上に選択肢
      m.update = (function (orig) {
        return function () {
          var total = this.total();
          if (this.page === this.pages.length - 1 && this.shown >= total) {
            if (!this._asked) {
              this._asked = true;
              var c = new Choice(items, opt);
              c._res = function (v) { close(m); res(v); };
              c.t = 0;
              UI.stack.push(c);
            }
            return;
          }
          orig.call(this);
        };
      })(m.update);
      m.t = 0;
      m._res = function () { };
      UI.stack.push(m);
    });
  };

  // ---------- 汎用リストメニュー ----------
  // opt: {title, items:[{label,right,disabled,desc,color}], x,y,w,rows, sel, cancel, onMove(i), drawExtra(g,menu), skin}
  function Menu(opt) {
    this.opt = opt;
    this.items = opt.items;
    this.sel = U.clamp(opt.sel || 0, 0, Math.max(0, this.items.length - 1));
    this.rows = opt.rows || Math.min(this.items.length, 8);
    this.scroll = 0;
    this.x = opt.x == null ? 8 : opt.x;
    this.y = opt.y == null ? 8 : opt.y;
    this.w = opt.w || 140;
    this.rowH = opt.rowH || 13;
    this.h = (opt.title ? 15 : 0) + this.rows * this.rowH + 10;
    this.fix();
  }
  Menu.prototype.fix = function () {
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + this.rows) this.scroll = this.sel - this.rows + 1;
  };
  Menu.prototype.update = function () {
    var n = this.items.length, moved = false;
    if (n && In.repeat('up')) { this.sel = (this.sel + n - 1) % n; moved = true; }
    if (n && In.repeat('down')) { this.sel = (this.sel + 1) % n; moved = true; }
    if (n && this.opt.lr) {
      if (In.repeat('left')) { this.opt.lr(this.items[this.sel], -1, this); }
      if (In.repeat('right')) { this.opt.lr(this.items[this.sel], 1, this); }
    }
    if (moved) { RR.Audio.sfx('cursor'); this.fix(); if (this.opt.onMove) this.opt.onMove(this.sel, this); }
    if (In.pressed('a') && n) {
      var it = this.items[this.sel];
      if (it.disabled) { RR.Audio.sfx('error'); return; }
      RR.Audio.sfx('ok');
      close(this, this.sel);
    } else if (In.pressed('b') && this.opt.cancel !== false) {
      RR.Audio.sfx('cancel');
      close(this, -1);
    } else if (this.opt.extra) {
      var r = this.opt.extra(this);
      if (r != null) close(this, r);
    }
  };
  Menu.prototype.draw = function (g) {
    var o = this.opt, x = this.x, y = this.y, skin = o.skin || 'blue';
    UI.win(g, x, y, this.w, this.h, skin);
    var ty = y + 5;
    if (o.title) {
      F.draw(g, o.title, x + 8, ty, '#f8e060');
      g.fillStyle = '#7888c8';
      g.fillRect(x + 6, ty + 11, this.w - 12, 1);
      ty += 15;
    }
    for (var r = 0; r < this.rows; r++) {
      var i = this.scroll + r;
      if (i >= this.items.length) break;
      var it = this.items[i];
      var col = it.disabled ? '#707890' : (it.color || UI.textColor(skin));
      var iy = ty + r * this.rowH;
      if (it.icon) it.icon(g, x + 16, iy);
      F.draw(g, it.label, x + 16 + (it.icon ? 12 : 0), iy, col, { shadow: UI.shadowColor(skin) });
      if (it.right != null) F.draw(g, String(it.right), x + this.w - 8, iy, it.rightColor || col, { align: 'right', shadow: UI.shadowColor(skin) });
      if (i === this.sel) UI.cursor(g, x + 5, iy, skin);
    }
    if (this.scroll > 0) F.draw(g, '▲', x + this.w - 12, y + (o.title ? 14 : 2), '#a8b8f0');
    if (this.scroll + this.rows < this.items.length) F.draw(g, '▼', x + this.w - 12, y + this.h - 10, '#a8b8f0');
    if (o.drawExtra) o.drawExtra(g, this);
  };
  UI.menu = function (opt) { return UI.open(new Menu(opt)); };
  UI.Menu = Menu;

  // 説明ウィンドウ（下部）
  UI.descBox = function (g, text, skin) {
    UI.win(g, 2, 126, 236, 32, skin || 'blue');
    var lines = F.wrap(text || '', 222);
    for (var i = 0; i < Math.min(2, lines.length); i++) F.draw(g, lines[i], 10, 131 + i * F.LINE, '#f8f8f8');
  };

  // 所持金ウィンドウ
  UI.moneyBox = function (g, x, y) {
    var S = RR.State.S;
    if (!S) return;
    var txt = '¥' + U.money(S.money);
    var w = Math.max(64, F.measure(txt) + 16);
    x = x == null ? 238 - w : x;
    y = y == null ? 2 : y;
    UI.win(g, x, y, w, 17);
    F.draw(g, txt, x + w - 8, y + 4, '#f8e060', { align: 'right' });
  };

  // ---------- トースト（画面上部の通知、入力を止めない） ----------
  UI.toast = function (text, color) {
    UI.toasts.push({ text: F.expand(text), color: color || '#f8f8f8', t: 0, life: 150 });
  };
  function drawToasts(g) {
    UI.toasts.forEach(function (t, i) {
      var w = F.measure(t.text) + 16;
      var slide = U.easeOut(Math.min(1, t.t / 10)) - U.easeIn(Math.max(0, (t.t - t.life + 12) / 12));
      var y = -18 + slide * (22 + i * 18);
      UI.win(g, 120 - w / 2, y, w, 17, 'dark');
      F.draw(g, t.text, 120, y + 4, t.color, { align: 'center' });
    });
  }

  // ---------- 帯演出（章タイトル等） ----------
  UI.banner = function (text, sub, opt) {
    opt = opt || {};
    RR.Audio.sfx('banner');
    return new Promise(function (res) {
      UI.bannerW = { text: F.expand(text), sub: sub ? F.expand(sub) : '', t: 0, life: opt.life || 150, res: res, color: opt.color || '#f8e060' };
    });
  };
  function drawBanner(g, b) {
    var t = b.t, L = b.life;
    var open = U.easeOut(Math.min(1, t / 16)), shut = U.easeIn(Math.max(0, (t - L + 16) / 16));
    var hh = 34 * (open - shut);
    var cy = 72;
    if (hh <= 0) return;
    g.fillStyle = 'rgba(0,0,0,0.78)';
    g.fillRect(0, cy - hh / 2, 240, hh);
    g.fillStyle = b.color;
    g.fillRect(0, cy - hh / 2, 240, 1);
    g.fillRect(0, cy + hh / 2 - 1, 240, 1);
    if (open < 1 || shut > 0) return;
    var slide = U.easeOutBack(Math.min(1, (t - 14) / 20));
    var x = U.lerp(-120, 120, slide);
    if (b.sub) {
      F.draw(g, b.sub, 240 - x, cy - 14, '#a8b8f0', { align: 'center' });
      F.draw(g, b.text, x, cy - 2, b.color, { align: 'center' });
    } else {
      F.draw(g, b.text, x, cy - 5, b.color, { align: 'center' });
    }
  }

  // ---------- 汎用：入力待ちだけのウィジェット ----------
  UI.waitKey = function () {
    return UI.open({ update: function () { if (In.pressed('a') || In.pressed('b')) close(this); }, draw: function () { } });
  };
  // 任意の更新/描画関数を持つモーダル
  UI.custom = function (obj) {
    obj.close = function (v) { close(obj, v); };
    return UI.open(obj);
  };
})();
