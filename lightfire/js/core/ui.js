/* ui.js — ウィンドウ・会話・選択肢などの UI 部品 */
(function () {
  'use strict';
  var F = PF.font;
  var C = { text: '#f8f8ff', dim: '#8890b4', hi: '#ffe070', shadow: '#0c1030', fill: '#18204c', b1: '#e8ecff', b2: '#5868b8', red: '#ff8080', green: '#80e890', blue: '#80c8ff' };
  var U = PF.ui = { C: C };

  U.window = function (g, x, y, w, h, o) {
    o = o || {};
    g.globalAlpha = o.alpha === undefined ? 0.97 : o.alpha;
    g.fillStyle = o.fill || C.fill; g.fillRect(x + 1, y + 1, w - 2, h - 2);
    g.globalAlpha = 1;
    g.fillStyle = C.b2; g.fillRect(x + 1, y, w - 2, 1); g.fillRect(x + 1, y + h - 1, w - 2, 1); g.fillRect(x, y + 1, 1, h - 2); g.fillRect(x + w - 1, y + 1, 1, h - 2);
    g.fillStyle = C.b1; g.fillRect(x + 2, y + 1, w - 4, 1); g.fillRect(x + 2, y + h - 2, w - 4, 1); g.fillRect(x + 1, y + 2, 1, h - 4); g.fillRect(x + w - 2, y + 2, 1, h - 4);
    g.fillStyle = o.fill || C.fill; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 2, y + 2, w - 4, 2);
  };
  U.text = function (g, s, x, y, col, o) { return F.draw(g, s, x, y, col || C.text, o || { shadow: C.shadow }); };
  U.textC = function (g, s, cx, y, col) { F.drawC(g, s, cx, y, col || C.text, { shadow: C.shadow }); };
  U.textR = function (g, s, xr, y, col) { F.drawR(g, s, xr, y, col || C.text, { shadow: C.shadow }); };
  U.icon = function (g, name, x, y) { var i = PF.gfx.icons[name]; if (i) g.drawImage(i, x, y); };
  U.bar = function (g, x, y, w, cur, max, col, bg) {
    g.fillStyle = '#080a1c'; g.fillRect(x - 1, y - 1, w + 2, 5);
    g.fillStyle = bg || '#3a3e68'; g.fillRect(x, y, w, 3);
    var n = Math.round(w * PF.clamp(cur / Math.max(1, max), 0, 1));
    g.fillStyle = col; g.fillRect(x, y, n, 3); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y, n, 1);
  };
  U.cursor = function (g, x, y) { if (((PF.time / 20) | 0) % 2 === 0) F.draw(g, '▶', x, y, C.hi); else F.draw(g, '▶', x + 1, y, C.hi); };
  U.sub = function (s) { return String(s).replace(/\{hero\}/g, PF.state ? PF.state.hero.name : 'アカリ'); };

  /* ---------- 会話ウィンドウ ---------- */
  var TB = { x: 4, y: 100, w: 232, h: 56, tx: 12, ty: 106, lh: 12, cols: 216, lines: 3 };
  U.TB = TB;
  function paginate(text) {
    var pages = [], parts = U.sub(text).split('\f');
    parts.forEach(function (part) {
      var lines = F.wrap(part, TB.cols);
      for (var i = 0; i < lines.length; i += TB.lines) pages.push(lines.slice(i, i + TB.lines));
    });
    return pages;
  }
  var SPEEDS = [0.5, 1, 2.5];
  // opts: who, top(上に表示), auto(自動で閉じるフレーム数), noWait
  U.say = function (text, who, opts) {
    opts = opts || {};
    var pages = paginate(text), pi = 0, shown = 0, wait = 0, cnt = 0, done = false, total = 0;
    function pageLen() { return pages[pi].join('').length; }
    var m = {
      update: function () {
        var inp = PF.input;
        if (opts.auto) { wait++; shown = pageLen(); if (wait > opts.auto) { if (pi < pages.length - 1) { pi++; shown = 0; wait = 0; } else PF.closeModal(m); } return; }
        if (shown < pageLen()) {
          var sp = SPEEDS[PF.settings.text === undefined ? 1 : PF.settings.text];
          if (inp.down('a') || inp.down('b')) sp *= 3;
          cnt += sp;
          while (cnt >= 1 && shown < pageLen()) { cnt -= 1; shown++; var ch = pages[pi].join('').charAt(shown - 1); if (ch !== '　' && ch !== ' ' && (shown % 2 === 0)) PF.sfx('text'); }
          if (inp.pressed('a') && shown > 1 && shown < pageLen() && wait > 4) shown = pageLen();
          wait++;
        } else {
          wait++;
          if (inp.pressed('a') || inp.pressed('b')) {
            if (pi < pages.length - 1) { pi++; shown = 0; wait = 0; cnt = 0; PF.sfx('cursor'); }
            else { PF.closeModal(m); }
          }
        }
      },
      draw: function (g) {
        var y0 = opts.top ? 4 : TB.y;
        U.window(g, TB.x, y0, TB.w, TB.h);
        if (who) { var nw = F.width(who) + 12; U.window(g, TB.x + 6, y0 - 11, nw, 15, { fill: '#2a3070' }); U.text(g, who, TB.x + 12, y0 - 9, C.hi); }
        var left = shown;
        for (var i = 0; i < pages[pi].length; i++) {
          var ln = pages[pi][i], n = Math.min(ln.length, Math.max(0, left)); left -= ln.length;
          if (n > 0) U.text(g, ln.slice(0, n), TB.tx, y0 + (TB.ty - TB.y) + i * TB.lh);
        }
        if (shown >= pageLen() && !opts.auto) {
          var by = y0 + TB.h - 11 + (((PF.time / 12) | 0) % 2);
          if (pi < pages.length - 1) F.draw(g, '▼', TB.x + TB.w - 14, by, C.hi); else F.draw(g, '▽', TB.x + TB.w - 14, by, C.dim);
        }
      }
    };
    return PF.openModal(m);
  };

  /* ---------- 選択肢 ---------- */
  // opts: x,y,(右下基準 default) cancel(Bで-1) def(初期) disabled:[idx]
  U.choice = function (items, opts) {
    opts = opts || {};
    var w = 20, i;
    for (i = 0; i < items.length; i++) w = Math.max(w, F.width(items[i]) + 22);
    var h = items.length * 12 + 10, x = opts.x !== undefined ? opts.x : PF.W - w - 6, y = opts.y !== undefined ? opts.y : (opts.top ? 8 : TB.y - h - 4);
    var sel = opts.def || 0;
    var m = {
      update: function () {
        var d = PF.input.dirRepeat();
        if (d === 'u') { sel = (sel + items.length - 1) % items.length; PF.sfx('cursor'); }
        if (d === 'd') { sel = (sel + 1) % items.length; PF.sfx('cursor'); }
        if (PF.input.pressed('a')) {
          if (opts.disabled && opts.disabled.indexOf(sel) >= 0) { PF.sfx('error'); return; }
          PF.sfx('ok'); PF.closeModal(m, sel);
        } else if (PF.input.pressed('b') && opts.cancel) { PF.sfx('cancel'); PF.closeModal(m, -1); }
      },
      draw: function (g) {
        U.window(g, x, y, w, h);
        for (var i = 0; i < items.length; i++) {
          var dis = opts.disabled && opts.disabled.indexOf(i) >= 0;
          U.text(g, items[i], x + 16, y + 6 + i * 12, dis ? C.dim : C.text);
          if (i === sel) U.cursor(g, x + 5, y + 6 + i * 12);
        }
      }
    };
    return PF.openModal(m);
  };
  U.confirm = function (text, who) {
    return U.say(text, who).then(function () { return U.choice(['はい', 'いいえ']); }).then(function (i) { return i === 0; });
  };

  /* ---------- 画面中央のメッセージ（演出用） ---------- */
  // text は \n で最大2行（1行は 224px まで）。長い文は 呼び出し側で \n を入れる（check_text.js が検査）
  U.banner = function (text, frames, col) {
    frames = frames || 90;
    var t = 0, lines = String(text).split('\n').slice(0, 2), bh = 26 + (lines.length - 1) * 14, by = 62 - (lines.length - 1) * 7;
    var m = {
      update: function () { t++; if (t > frames) PF.closeModal(m); },
      draw: function (g) {
        var a = Math.min(1, t / 12, (frames - t) / 12);
        g.globalAlpha = Math.max(0, a) * 0.85; g.fillStyle = '#000'; g.fillRect(0, by, PF.W, bh); g.globalAlpha = Math.max(0, a);
        for (var i = 0; i < lines.length; i++) U.textC(g, lines[i], 120, by + 10 + i * 14, col || C.hi);
        g.globalAlpha = 1;
      }
    };
    return PF.openModal(m);
  };
  // アイテム入手など
  U.itemGet = function (name, icon) {
    PF.sfx('get');
    return U.say(name + 'を てにいれた!', null, {}).then(function () { });
  };
  // 数値入力不要。確認のみ
})();
