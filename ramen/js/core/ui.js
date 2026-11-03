/* UI部品：パネル・ゲージ・ボタン・メニュー・ダイアログ・ソフトキー。 */
(function (RP) {
  'use strict';

  var UI = RP.ui = {};
  var G = RP.gfx, T = RP.text, I = RP.input;

  function se(name, o) { if (RP.se && RP.se.play) { RP.se.play(name, o); } }
  UI.se = se;

  // ---- パネル（ガラケー風ウィンドウ） ----
  // o: { fill, border, title, titleCol, shadow(true), inner }
  UI.panel = function (x, y, w, h, o) {
    o = o || {};
    x = Math.round(x); y = Math.round(y);
    if (o.shadow !== false) { G.alpha(0.45); G.rrect(x + 2, y + 2, w, h, 'ink'); G.alpha(1); }
    G.rrect(x, y, w, h, o.border || 'cream');
    G.rrect(x + 1, y + 1, w - 2, h - 2, o.fill || 'night');
    if (o.inner) { G.frame(x + 3, y + 3, w - 6, h - 6, o.inner); }
    if (o.title) {
      var tw = T.measure(o.title) + 10;
      G.rrect(x + 6, y - 6, tw, 12, o.border || 'cream');
      T.draw(o.title, x + 11, y - 5, o.titleCol || 'ink');
    }
  };

  // ---- ゲージ ----
  // o: { fill, bg, border, zones:[{a,b,col}], marker(0..1), vertical }
  UI.gauge = function (x, y, w, h, v, o) {
    o = o || {};
    v = RP.util.clamp(v, 0, 1);
    G.rect(x, y, w, h, o.border || 'ink');
    G.rect(x + 1, y + 1, w - 2, h - 2, o.bg || 'shade');
    var iw = w - 2, ih = h - 2, i;
    if (o.zones) {
      for (i = 0; i < o.zones.length; i++) {
        var z = o.zones[i];
        if (o.vertical) {
          G.rect(x + 1, y + 1 + Math.round(ih * (1 - z.b)), iw, Math.max(1, Math.round(ih * (z.b - z.a))), z.col);
        } else {
          G.rect(x + 1 + Math.round(iw * z.a), y + 1, Math.max(1, Math.round(iw * (z.b - z.a))), ih, z.col);
        }
      }
    }
    if (o.fill) {
      if (o.vertical) {
        var fh = Math.round(ih * v);
        G.rect(x + 1, y + 1 + ih - fh, iw, fh, o.fill);
      } else {
        G.rect(x + 1, y + 1, Math.round(iw * v), ih, o.fill);
      }
    }
    if (o.marker !== undefined) {
      var m = RP.util.clamp(o.marker, 0, 1);
      if (o.vertical) { G.rect(x - 1, y + 1 + Math.round((ih - 1) * (1 - m)), w + 2, 1, 'white'); }
      else { G.rect(x + 1 + Math.round((iw - 1) * m), y - 1, 1, h + 2, 'white'); }
    }
  };

  // 点滅する選択カーソル（▶）
  UI.cursor = function (x, y, color) {
    var bob = Math.floor(performance.now() / 250) % 2;
    var c = color || 'yellow';
    x += bob;
    G.rect(x, y, 1, 7, c); G.rect(x + 1, y + 1, 1, 5, c); G.rect(x + 2, y + 2, 1, 3, c); G.rect(x + 3, y + 3, 1, 1, c);
  };

  // ---- ボタン ----
  // o: { x,y,w,h,label,onClick,col,textCol,enabled,sub,se,size }
  function Button(o) {
    this.x = o.x; this.y = o.y; this.w = o.w; this.h = o.h;
    this.label = o.label; this.sub = o.sub; this.onClick = o.onClick;
    this.col = o.col || 'maroon'; this.textCol = o.textCol || 'white';
    this.enabled = o.enabled !== false; this.se = o.se; this.size = o.size;
    this.pressed = false; this.flash = 0; this.focus = false;
  }
  Button.prototype.update = function (dt) {
    if (this.flash > 0) { this.flash -= dt; }
    this.pressed = this.enabled && !!I.isDownIn(this.x, this.y, this.w, this.h);
    var t = I.tapIn(this.x, this.y, this.w, this.h);
    if (t) {
      if (this.enabled) {
        this.flash = 0.12;
        se(this.se || 'ok');
        if (this.onClick) { this.onClick(this); }
        return true;
      }
      se('error');
    }
    return false;
  };
  Button.prototype.activate = function () {
    if (!this.enabled) { se('error'); return; }
    this.flash = 0.12; se(this.se || 'ok');
    if (this.onClick) { this.onClick(this); }
  };
  Button.prototype.draw = function () {
    var down = this.pressed || this.flash > 0;
    var oy = down ? 1 : 0;
    var base = this.enabled ? this.col : 'gray';
    G.rrect(this.x, this.y + 2, this.w, this.h, 'ink');
    G.rrect(this.x, this.y + oy, this.w, this.h, this.focus ? 'yellow' : 'cream');
    G.rrect(this.x + 1, this.y + 1 + oy, this.w - 2, this.h - 2, base);
    if (!down) { G.rect(this.x + 2, this.y + 1, this.w - 4, 1, 'white'); G.alpha(0.35); G.rect(this.x + 2, this.y + 1, this.w - 4, 1, 'white'); G.alpha(1); }
    var tc = this.enabled ? this.textCol : 'silver';
    if (this.sub) {
      T.draw(this.label, this.x + this.w / 2, this.y + 3 + oy, tc, { align: 'c', shadow: 'ink', size: this.size });
      T.draw(this.sub, this.x + this.w / 2, this.y + this.h - 13 + oy, this.enabled ? 'yellow' : 'silver', { align: 'c', shadow: 'ink' });
    } else {
      T.draw(this.label, this.x + this.w / 2, this.y + Math.round((this.h - (this.size || 12)) / 2) + oy, tc, { align: 'c', shadow: 'ink', size: this.size });
    }
  };
  UI.Button = Button;

  // ---- メニュー（縦リスト：キー/パッド/タップ/ドラッグスクロール対応） ----
  // items: [{ label, sub, enabled, id, tag, col }]
  // o: { x,y,w,rowH,rows,onSelect(item,idx),onMove(item,idx),cursor(idx初期), fill }
  function Menu(items, o) {
    this.items = items; this.x = o.x; this.y = o.y; this.w = o.w;
    this.rowH = o.rowH || 16; this.rows = o.rows || items.length;
    this.onSelect = o.onSelect; this.onMove = o.onMove; this.onTapRow = o.onTapRow;
    this.index = o.cursor || 0; this.scroll = 0; this.fill = o.fill;
    this.drag = null; this.scrollPx = 0;
    this.drawRow = o.drawRow || null;
    this.tapSelects = o.tapSelects !== false;
    this.ensureVisible();
  }
  Menu.prototype.setItems = function (items, keepIndex) {
    this.items = items;
    if (!keepIndex) { this.index = 0; }
    this.index = RP.util.clamp(this.index, 0, Math.max(0, items.length - 1));
    this.ensureVisible();
  };
  Menu.prototype.ensureVisible = function () {
    if (this.index < this.scroll) { this.scroll = this.index; }
    if (this.index >= this.scroll + this.rows) { this.scroll = this.index - this.rows + 1; }
    this.scroll = RP.util.clamp(this.scroll, 0, Math.max(0, this.items.length - this.rows));
  };
  Menu.prototype.move = function (d) {
    if (!this.items.length) { return; }
    var n = this.items.length;
    this.index = (this.index + d + n) % n;
    this.ensureVisible();
    se('cursor');
    if (this.onMove) { this.onMove(this.items[this.index], this.index); }
  };
  Menu.prototype.select = function () {
    var it = this.items[this.index];
    if (!it) { return; }
    if (it.enabled === false) { se('error'); if (this.onSelect) { this.onSelect(it, this.index, true); } return; }
    se('ok');
    if (this.onSelect) { this.onSelect(it, this.index, false); }
  };
  Menu.prototype.rowAt = function (px, py) {
    if (px < this.x || px >= this.x + this.w || py < this.y || py >= this.y + this.rows * this.rowH) { return -1; }
    var r = Math.floor((py - this.y) / this.rowH) + this.scroll;
    return r < this.items.length ? r : -1;
  };
  Menu.prototype.update = function () {
    if (I.nav('up')) { this.move(-1); }
    if (I.nav('down')) { this.move(1); }
    if (I.pressed('ok')) { this.select(); }
    // ポインタ：タップで選択、縦ドラッグでスクロール
    var h = this.rows * this.rowH, self = this;
    var t = I.peekTapIn(this.x, this.y, this.w, h);
    if (t && !this.drag) { this.drag = { id: t.id, y0: t.y, row: this.rowAt(t.x, t.y), moved: false, scroll0: this.scroll }; t.used = true; }
    if (this.drag) {
      var cur = null, pts = I.pointerList();
      for (var i = 0; i < pts.length; i++) { if (pts[i].id === this.drag.id) { cur = pts[i]; } }
      if (cur && cur.down) {
        var dy = cur.y - this.drag.y0;
        if (Math.abs(dy) > 6 && this.items.length > this.rows) { this.drag.moved = true; }
        if (this.drag.moved) {
          var ns = RP.util.clamp(Math.round(this.drag.scroll0 - dy / this.rowH), 0, Math.max(0, this.items.length - this.rows));
          if (ns !== this.scroll) { this.scroll = ns; se('cursor'); }
        }
      }
      var rel = null;
      for (var j = 0; j < I.releases.length; j++) { if (I.releases[j].id === this.drag.id) { rel = I.releases[j]; } }
      if (rel) {
        var d = this.drag; this.drag = null;
        if (!d.moved && d.row >= 0) {
          var rr = this.rowAt(rel.x, rel.y);
          if (rr === d.row) {
            var changed = this.index !== d.row;
            this.index = d.row;
            if (this.onTapRow) { this.onTapRow(this.items[d.row], d.row, changed); }
            if (this.tapSelects) { this.select(); }
          }
        }
      }
    }
    void self;
  };
  Menu.prototype.draw = function () {
    var vis = Math.min(this.rows, this.items.length - this.scroll);
    for (var i = 0; i < vis; i++) {
      var idx = this.scroll + i, it = this.items[idx];
      var y = this.y + i * this.rowH;
      var sel = idx === this.index;
      if (this.drawRow) { this.drawRow(it, idx, this.x, y, this.w, this.rowH, sel); continue; }
      if (sel) { G.rect(this.x, y, this.w, this.rowH - 1, 'maroon'); G.rect(this.x, y, this.w, 1, 'red'); }
      var enabled = it.enabled !== false;
      T.draw(it.label, this.x + 12, y + Math.floor((this.rowH - 12) / 2), enabled ? (it.col || 'white') : 'gray', { shadow: sel ? 'ink' : null });
      if (it.sub) { T.draw(it.sub, this.x + this.w - 4, y + Math.floor((this.rowH - 12) / 2), enabled ? 'yellow' : 'gray', { align: 'r' }); }
      if (sel) { UI.cursor(this.x + 3, y + Math.floor((this.rowH - 7) / 2)); }
    }
    // スクロールバー
    if (this.items.length > this.rows) {
      var bh = this.rows * this.rowH;
      G.rect(this.x + this.w + 1, this.y, 2, bh, 'shade');
      var th = Math.max(6, Math.round(bh * this.rows / this.items.length));
      var ty = Math.round((bh - th) * this.scroll / (this.items.length - this.rows));
      G.rect(this.x + this.w + 1, this.y + ty, 2, th, 'silver');
    }
  };
  UI.Menu = Menu;

  // ---- ダイアログ（モーダル） ----
  // open({ title, text, choices:[{label,value}], onChoose(value), width, cancelValue })
  function Dialog() { this.active = false; this.menu = null; this.t = 0; }
  Dialog.prototype.open = function (o) {
    this.active = true; this.t = 0; this.o = o;
    var w = o.width || 232;
    this.lines = T.wrap(o.text || '', w - 20);
    var choices = o.choices || [{ label: 'OK', value: true }];
    this.w = w;
    this.h = 22 + this.lines.length * 14 + 6 + choices.length * 16 + 8;
    this.x = Math.round((RP.W - w) / 2);
    this.y = Math.round((RP.H - this.h) / 2);
    var self = this;
    this.menu = new Menu(choices.map(function (c) { return { label: c.label, value: c.value }; }), {
      x: this.x + 14, y: this.y + 22 + this.lines.length * 14 + 6, w: w - 28, rowH: 16, rows: choices.length,
      onSelect: function (it) { self.close(it.value); }
    });
    se('window');
  };
  Dialog.prototype.close = function (value) {
    this.active = false;
    if (this.o && this.o.onChoose) { this.o.onChoose(value); }
  };
  Dialog.prototype.update = function (dt) {
    if (!this.active) { return false; }
    this.t += dt;
    if (I.pressed('cancel') && this.o.cancelValue !== undefined) { se('cancel'); this.close(this.o.cancelValue); return true; }
    this.menu.update();
    // ダイアログ外のタップは吸収
    I.taps.forEach(function (t) { t.used = true; });
    return true;
  };
  Dialog.prototype.draw = function () {
    if (!this.active) { return; }
    G.alpha(0.6); G.rect(0, 0, RP.W, RP.H, 'ink'); G.alpha(1);
    var pop = Math.min(1, this.t / 0.12);
    var yOff = Math.round((1 - pop) * 8);
    UI.panel(this.x, this.y + yOff, this.w, this.h, { title: this.o.title, fill: 'night', border: 'cream' });
    for (var i = 0; i < this.lines.length; i++) {
      T.draw(this.lines[i], this.x + 10, this.y + yOff + 14 + i * 14, 'white');
    }
    if (pop >= 1) { this.menu.draw(); }
  };
  UI.Dialog = Dialog;

  // ---- ソフトキー（画面下端。ガラケーのキー表示） ----
  // 戻り値: 'left' | 'right' | 'center' | null（タップされたもの）
  var SK_H = 12;
  UI.SOFT_H = SK_H;
  UI.softkeys = function (left, right, center, o) {
    o = o || {};
    var y = RP.H - SK_H;
    G.rect(0, y, RP.W, SK_H, 'ink');
    G.rect(0, y, RP.W, 1, 'gray');
    var res = null;
    if (left) {
      T.draw(left, 6, y, o.leftCol || 'cream');
      if (!o.noInput && I.tapIn(0, y - 2, 110, SK_H + 2)) { res = 'left'; se('cancel'); }
    }
    if (right) {
      T.draw(right, RP.W - 6, y, o.rightCol || 'cream', { align: 'r' });
      if (!o.noInput && I.tapIn(RP.W - 110, y - 2, 110, SK_H + 2)) { res = 'right'; se('ok'); }
    }
    if (center) {
      T.draw(center, RP.W / 2, y, o.centerCol || 'yellow', { align: 'c' });
      if (!o.noInput && I.tapIn(RP.W / 2 - 50, y - 2, 100, SK_H + 2)) { res = 'center'; se('ok'); }
    }
    return res;
  };

  // 背景の市松・ストライプ（メニュー背景用）
  UI.stripes = function (t, c1, c2) {
    G.rect(0, 0, RP.W, RP.H, c1 || 'night');
    var off = Math.floor(t * 8) % 16;
    for (var x = -16; x < RP.W + 16; x += 16) {
      for (var y = -16; y < RP.H + 16; y += 16) {
        if ((((x + y) / 16) & 1) === 0) { G.rect(x + off, y + off, 8, 8, c2 || 'shade'); }
      }
    }
  };

  // アウトライン付き大文字
  UI.big = function (str, x, y, col, o) {
    o = o || {};
    T.draw(str, x, y, col, { size: o.size || 24, align: o.align || 'c', outline: o.outline || 'ink', shadow: o.shadow, bold: o.bold !== false });
  };
})(window.RP);
