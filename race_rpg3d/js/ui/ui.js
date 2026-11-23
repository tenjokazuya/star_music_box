/* UI部品（高解像度）: ウィンドウ / メッセージ / 選択肢 / メニュー / 帯演出 / トースト
 * 参照元の RR.UI と同じ API。論理座標は 240x160 基準（実画面が広いときは RR.OX, RR.OY だけ余白がある）。
 * テキスト中の '|' は改ページ、'\n' は改行
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input;
  var UI = RR.UI = { stack: [], toasts: [] };

  // ---------- ウィンドウ描画（半透明ガラス調） ----------
  var SKINS = {
    blue: { t: 'rgba(52,72,160,0.92)', b: 'rgba(14,20,72,0.95)', edge: '#c8d8ff', hi: 'rgba(255,255,255,0.28)', sh: 'rgba(0,0,20,0.45)', m: '#7888c8' },
    dark: { t: 'rgba(30,34,52,0.9)', b: 'rgba(6,8,18,0.94)', edge: '#98a0c0', hi: 'rgba(255,255,255,0.18)', sh: 'rgba(0,0,0,0.5)', m: '#485070' },
    paper: { t: 'rgba(250,238,204,0.97)', b: 'rgba(224,200,150,0.97)', edge: '#7a5a30', hi: 'rgba(255,255,255,0.55)', sh: 'rgba(40,20,0,0.35)', m: '#c8a870' },
    red: { t: 'rgba(160,52,40,0.94)', b: 'rgba(70,16,12,0.96)', edge: '#ffd0c0', hi: 'rgba(255,255,255,0.25)', sh: 'rgba(30,0,0,0.5)', m: '#c86050' }
  };
  UI.SKINS = SKINS;
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }
  UI.roundRect = rr;
  UI.win = function (g, x, y, w, h, skin) {
    var s = SKINS[skin || 'blue'] || SKINS.blue;
    g.save();
    // 影
    rr(g, x + 0.6, y + 1.4, w, h, 3.4); g.fillStyle = s.sh; g.fill();
    // 本体
    var gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, s.t); gr.addColorStop(1, s.b);
    rr(g, x, y, w, h, 3.4); g.fillStyle = gr; g.fill();
    // 上面のハイライト
    var hg = g.createLinearGradient(0, y, 0, y + Math.min(h, 14));
    hg.addColorStop(0, s.hi); hg.addColorStop(1, 'rgba(255,255,255,0)');
    rr(g, x + 0.8, y + 0.8, w - 1.6, Math.min(h - 1.6, 14), 2.8); g.fillStyle = hg; g.fill();
    // 枠
    rr(g, x, y, w, h, 3.4); g.lineWidth = 0.9; g.strokeStyle = s.edge; g.stroke();
    rr(g, x + 1.6, y + 1.6, w - 3.2, h - 3.2, 2.4); g.lineWidth = 0.4; g.strokeStyle = s.m; g.globalAlpha = 0.6; g.stroke();
    g.restore();
  };
  UI.textColor = function (skin) { return skin === 'paper' ? '#382810' : '#f8f8f8'; };
  UI.shadowColor = function (skin) { return skin === 'paper' ? 'rgba(255,240,200,0.8)' : 'rgba(6,10,30,0.85)'; };

  // 画面全体（基準領域の座標系で見た実画面の範囲）
  UI.screen = function () { return { x: -RR.OX, y: -RR.OY, w: RR.VW, h: RR.VH }; };
  UI.bottom = function () { return 160 + RR.OY; };

  // 3D シーンの無い画面の背景（夜の峠の空気）
  UI.backdrop = function (g) {
    var W = RR.VW, H = RR.VH, t = RR.Game.frame;
    var gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#060818'); gr.addColorStop(0.6, '#10183a'); gr.addColorStop(1, '#1c2250');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 6; i++) {
      var x = ((i * 53 + t * (0.15 + i * 0.03)) % (W + 80)) - 40, y = 10 + i * (H / 6);
      var rg = g.createRadialGradient(x, y, 0, x, y, 40);
      rg.addColorStop(0, 'rgba(120,150,255,0.10)'); rg.addColorStop(1, 'rgba(120,150,255,0)');
      g.fillStyle = rg; g.fillRect(x - 40, y - 40, 80, 80);
    }
    g.restore();
    // ビネット
    var vg = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  };
  // 基準領域の外側を暗くして、モーダル画面を際立たせる
  UI.dim = function (g, a) {
    var s = UI.screen();
    g.fillStyle = 'rgba(2,4,14,' + (a == null ? 0.55 : a) + ')';
    g.fillRect(s.x, s.y, s.w, s.h);
  };

  // 点滅するカーソル ▶
  UI.cursor = function (g, x, y, skin) {
    var bob = Math.sin(RR.Game.frame * 0.18) * 0.8;
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
  function msgWidth() { return Math.min(RR.VW - 8, 300, RR.Game.padLandscape ? RR.VW * 0.6 : 999); }
  function Message(name, text, opt) {
    this.name = name ? F.expand(name) : '';
    this.opt = opt || {};
    this.skin = this.opt.skin || 'blue';
    var pages = [];
    var wrapW = msgWidth() - 20;
    String(text).split('|').forEach(function (p) {
      var lines = F.wrap(p, wrapW);
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
    var w = msgWidth(), h = 50;
    var x = (240 - w) / 2;
    var slide = U.easeOut(Math.min(1, this.t / 8));
    var y = top ? -RR.OY + 5 : UI.bottom() - h - 5;
    y += (top ? -1 : 1) * (1 - slide) * 14;
    g.save();
    g.globalAlpha = slide;
    UI.win(g, x, y, w, h, this.skin);
    if (this.name) {
      var nw = F.measure(this.name) + 16;
      var ny = top ? y + h - 3 : y - 12;
      UI.win(g, x + 6, ny, nw, 15, this.skin === 'paper' ? 'paper' : 'red');
      F.draw(g, this.name, x + 14, ny + 3, this.nameColor);
    }
    var lines = this.pages[this.page], left = this.shown;
    var tc = UI.textColor(this.skin), sc = UI.shadowColor(this.skin);
    for (var i = 0; i < lines.length; i++) {
      var plain = lines[i].replace(/\{[a-zN]\}/g, '').length;
      if (left <= 0) break;
      F.draw(g, lines[i], x + 10, y + 8 + i * F.LINE, tc, { count: left, shadow: sc });
      left -= plain;
    }
    if (this.shown >= this.total() && !this.opt.auto) {
      var bob = Math.sin(RR.Game.frame * 0.2) * 1.2;
      F.draw(g, '▼', x + w - 15, y + h - 14 + bob, '#f8e060');
    }
    g.restore();
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
    this.w = w + 30;
    this.h = this.items.length * 13 + 10;
    this.fixedPos = this.opt.x != null || this.opt.y != null;
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
    var x, y;
    if (this.fixedPos) { x = this.opt.x != null ? this.opt.x : 238 - this.w; y = this.opt.y != null ? this.opt.y : 108 - this.h; }
    else { x = 240 + RR.OX - 6 - this.w; y = UI.bottom() - 62 - this.h; }
    var pop = U.easeOut(Math.min(1, this.t / 6));
    g.save(); g.globalAlpha = pop;
    UI.win(g, x, y + (1 - pop) * 4, this.w, this.h);
    for (var i = 0; i < this.items.length; i++) {
      var iy = y + 6 + i * 13 + (1 - pop) * 4;
      if (i === this.sel) {
        g.fillStyle = 'rgba(255,255,255,0.16)'; UI.roundRect(g, x + 3, iy - 1.5, this.w - 6, 12.5, 2); g.fill();
        UI.cursor(g, x + 6, iy);
      }
      F.draw(g, this.items[i], x + 19, iy, i === this.sel ? '#ffffff' : '#d8e0f8');
    }
    g.restore();
  };
  // メッセージを出しながら選択肢（メッセージは消さずに残す）
  UI.choice = function (items, opt) { return UI.open(new Choice(items, opt)); };
  UI.ask = function (name, text, items, opt) {
    var m = new Message(name, text, { silent: false });
    m.keep = true;
    if (RR.DEBUG && RR.Debug && RR.Debug.auto) { RR.Debug.hookMessage(m); m.shown = 1e9; m.page = m.pages.length - 1; }
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
    var pop = U.easeOut(Math.min(1, this.t / 6));
    g.save(); g.globalAlpha = pop;
    UI.win(g, x, y, this.w, this.h, skin);
    var ty = y + 5;
    if (o.title) {
      F.draw(g, o.title, x + 9, ty, '#f8e060');
      g.fillStyle = 'rgba(136,152,216,0.8)';
      g.fillRect(x + 7, ty + 11.5, this.w - 14, 0.6);
      ty += 15;
    }
    for (var r = 0; r < this.rows; r++) {
      var i = this.scroll + r;
      if (i >= this.items.length) break;
      var it = this.items[i];
      var col = it.disabled ? '#7a82a0' : (it.color || UI.textColor(skin));
      var iy = ty + r * this.rowH;
      if (i === this.sel) {
        g.fillStyle = skin === 'paper' ? 'rgba(160,56,24,0.18)' : 'rgba(255,255,255,0.15)';
        UI.roundRect(g, x + 3, iy - 1.5, this.w - 6, this.rowH - 0.5, 2); g.fill();
      }
      if (it.icon) it.icon(g, x + 16, iy);
      F.draw(g, it.label, x + 17 + (it.icon ? 12 : 0), iy, col, { shadow: UI.shadowColor(skin) });
      if (it.right != null) F.draw(g, String(it.right), x + this.w - 9, iy, it.rightColor || col, { align: 'right', shadow: UI.shadowColor(skin) });
      if (i === this.sel) UI.cursor(g, x + 5, iy, skin);
    }
    if (this.scroll > 0) F.draw(g, '▲', x + this.w - 13, y + (o.title ? 14 : 2), '#a8b8f0');
    if (this.scroll + this.rows < this.items.length) F.draw(g, '▼', x + this.w - 13, y + this.h - 11, '#a8b8f0');
    if (o.drawExtra) o.drawExtra(g, this);
    g.restore();
  };
  UI.menu = function (opt) { return UI.open(new Menu(opt)); };
  UI.Menu = Menu;

  // 説明ウィンドウ（下部）
  UI.descBox = function (g, text, skin) {
    UI.win(g, 2, 126, 236, 32, skin || 'blue');
    var lines = F.wrap(text || '', 220);
    for (var i = 0; i < Math.min(2, lines.length); i++) F.draw(g, lines[i], 10, 131 + i * F.LINE, '#f8f8f8');
  };

  // 所持金ウィンドウ
  UI.moneyBox = function (g, x, y) {
    var S = RR.State.S;
    if (!S) return;
    var txt = '¥' + U.money(S.money);
    var w = Math.max(64, F.measure(txt) + 18);
    x = x == null ? 238 - w : x;
    y = y == null ? 2 : y;
    UI.win(g, x, y, w, 17);
    F.draw(g, txt, x + w - 9, y + 4, '#f8e060', { align: 'right' });
  };

  // ---------- トースト（画面上部の通知、入力を止めない） ----------
  UI.toast = function (text, color) {
    UI.toasts.push({ text: F.expand(text), color: color || '#f8f8f8', t: 0, life: 150 });
  };
  function drawToasts(g) {
    UI.toasts.forEach(function (t, i) {
      var w = F.measure(t.text) + 20;
      var slide = U.easeOut(Math.min(1, t.t / 10)) - U.easeIn(Math.max(0, (t.t - t.life + 12) / 12));
      var y = -RR.OY - 20 + slide * (26 + i * 19);
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
    var hh = 42 * (open - shut);
    var cy = 80;
    if (hh <= 0) return;
    var x0 = -RR.OX, W = RR.VW;
    var gr = g.createLinearGradient(0, cy - hh / 2, 0, cy + hh / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.0)'); gr.addColorStop(0.2, 'rgba(0,0,10,0.82)'); gr.addColorStop(0.8, 'rgba(0,0,10,0.82)'); gr.addColorStop(1, 'rgba(0,0,0,0.0)');
    g.fillStyle = gr;
    g.fillRect(x0, cy - hh / 2, W, hh);
    g.fillStyle = b.color;
    g.globalAlpha = 0.9;
    g.fillRect(x0, cy - hh / 2 + 3, W, 0.7);
    g.fillRect(x0, cy + hh / 2 - 3.7, W, 0.7);
    g.globalAlpha = 1;
    if (open < 1 || shut > 0) return;
    var slide = U.easeOutBack(Math.min(1, (t - 14) / 20));
    var x = U.lerp(-120, 120, slide);
    if (b.sub) {
      F.draw(g, b.sub, 240 - x, cy - 14, '#a8b8f0', { align: 'center' });
      F.draw(g, b.text, x, cy - 2, b.color, { align: 'center', scale: 1.5 });
    } else {
      F.draw(g, b.text, x, cy - 7, b.color, { align: 'center', scale: 1.5 });
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
