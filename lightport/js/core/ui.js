/* ui.js — ウィンドウ、会話、選択肢、マップ名バナー、アイテム入手の表示、ナレーション */
(function () {
  'use strict';

  var W = Game.W, H = Game.H;
  var F = Game.font;
  var LINE = 13;
  var ui = Game.ui = { LINE: LINE };

  var COL = {
    text: '#f8f4e8', shadow: '#0a0e24', accent: '#ffd860', dim: '#8890b0',
    ink: '#0a0e24', gold: '#f1e2a8', mid: '#5a6cb8', navy: '#16224e', navy2: '#1e2e64'
  };
  ui.COL = COL;

  /** GBA 風のウィンドウ（角を 1 ドット欠いた二重枠） */
  ui.window = function (g, x, y, w, h, opt) {
    opt = opt || {};
    function body(c, ix, iw, ih, iy) {
      g.fillStyle = c;
      g.fillRect(x + ix, y + iy + 1, iw, ih - 2);
      g.fillRect(x + ix + 1, y + iy, iw - 2, ih);
    }
    body(COL.ink, 0, w, h, 0);
    body(opt.border || COL.gold, 1, w - 2, h - 2, 1);
    body(COL.mid, 2, w - 4, h - 4, 2);
    g.fillStyle = opt.fill || COL.navy;
    g.fillRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = opt.fill2 || COL.navy2;
    g.fillRect(x + 3, y + 3, w - 6, 2);
    // すみの飾り
    g.fillStyle = opt.border || COL.gold;
    g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x + w - 2, y + 1, 1, 1);
    g.fillRect(x + 1, y + h - 2, 1, 1); g.fillRect(x + w - 2, y + h - 2, 1, 1);
  };

  ui.text = function (g, s, x, y, color, opt) {
    return F.draw(g, s, x, y, color || COL.text, Object.assign({ shadow: COL.shadow }, opt || {}));
  };

  /** 縮小・拡大しながら開くウィンドウ（t: 0〜1） */
  ui.windowAnim = function (g, x, y, w, h, t, opt) {
    if (t >= 1) { ui.window(g, x, y, w, h, opt); return true; }
    var hh = Math.max(4, Math.round(h * Game.util.ease.outCubic(Math.max(0, t))));
    ui.window(g, x, y + Math.round((h - hh) / 2), w, hh, opt);
    return false;
  };

  var frame = 0;

  /* ================= 会話 ================= */
  var d = { state: 'closed', t: 0, pages: [], pageI: 0, shown: 0, acc: 0, who: null, resolve: null, rate: 1, auto: 0, autoT: 0, blip: 0 };
  var TEXT_W = 214;          // 1 行の幅(px)
  var DLG = { x: 3, y: 107, w: 234, h: 50 };

  var VOICES = { 'ミオ': 1.15, 'おかあさん': 1.05, 'おじいちゃん': 0.7, 'ココ': 1.4, 'ゲンさん': 0.62, 'ハルばあさん': 0.85, 'タケ': 1.25, 'おとうさん': 0.75 };
  ui.voices = VOICES;

  function paginate(text) {
    var lines = F.wrap(text, TEXT_W);
    var pages = [];
    for (var i = 0; i < lines.length; i += 3) { pages.push(lines.slice(i, i + 3)); }
    // \p で明示的にページを分ける
    return pages.length ? pages : [['']];
  }

  /** 会話を出す。Promise は最後のページを閉じたとき解決。opts: { auto: フレーム数, rate: 声の高さ } */
  ui.say = function (text, who, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var parts = String(text).split('\\p');
      var pages = [];
      parts.forEach(function (p) { paginate(p).forEach(function (pg) { pages.push(pg); }); });
      d.pages = pages; d.pageI = 0; d.shown = 0; d.acc = 0;
      d.who = who || null; d.resolve = resolve;
      d.rate = opts.rate || (who && VOICES[who]) || 1;
      d.auto = opts.auto || 0; d.autoT = 0;
      d.choices = opts.choices || null; d.chOpts = { cancel: opts.cancel, start: opts.start }; d.chBusy = false;
      if (d.state === 'closed' || d.state === 'closing' && d.t > 1) {
        d.state = 'opening'; d.t = 0; Game.audio.sfx('win_open');
      } else if (d.state === 'closing') {
        d.state = 'typing';   // 同じフレームで次の会話が来たら開き直さない
      } else { d.state = 'typing'; }
      if (d.state === 'opening') { d.t = 0; }
    });
  };
  ui.dialogOpen = function () { return d.state !== 'closed'; };

  function speedPerFrame() {
    var s = Game.settings.textSpeed;
    var base = s === 1 ? 0.34 : (s === 3 ? 1.0 : 0.5);
    return base * (Game.input.held('a') || Game.input.held('b') ? 3 : 1);
  }
  function pageLen(pg) { var n = 0; pg.forEach(function (l) { n += l.length; }); return n; }

  function updateDialog() {
    if (d.state === 'closed') { return; }
    if (d.state === 'opening') {
      d.t += 1 / 5;
      if (d.t >= 1) { d.state = 'typing'; d.t = 1; }
      return;
    }
    if (d.state === 'closing') {
      d.t += 1;
      if (d.t === 1) { Game.audio.sfx('win_close'); }
      if (d.t > 5) { d.state = 'closed'; }
      return;
    }
    var pg = d.pages[d.pageI], total = pageLen(pg);
    if (d.state === 'typing') {
      d.acc += speedPerFrame();
      while (d.acc >= 1 && d.shown < total) {
        d.acc -= 1; d.shown++;
        // 何文字目か → 文字を調べて声を鳴らす
        var k = d.shown, ch = '';
        for (var i = 0; i < pg.length; i++) { if (k <= pg[i].length) { ch = pg[i].charAt(k - 1); break; } k -= pg[i].length; }
        if (ch && ch !== ' ' && '、。！？…「」'.indexOf(ch) < 0 && (d.blip++ % 2 === 0)) {
          Game.audio.sfx('text', { rate: d.rate * (0.96 + Math.random() * 0.08) });
        }
      }
      if (Game.input.pressed('a') && d.shown < total) { d.shown = total; d.acc = 0; }
      if (d.shown >= total) { d.state = 'wait'; d.autoT = 0; }
    } else if (d.state === 'wait') {
      d.autoT++;
      if (d.choices && d.pageI >= d.pages.length - 1) {
        if (!d.chBusy) {
          d.chBusy = true;
          ui.choice(d.choices, d.chOpts).then(function (i) {
            var r2 = d.resolve; d.resolve = null; d.choices = null;
            d.state = 'closing'; d.t = 0;
            if (r2) { r2(i); }
          });
        }
        return;
      }
      var go = Game.input.pressed('a') || Game.input.pressed('b') || (d.auto && d.autoT > d.auto);
      if (go) {
        if (d.pageI < d.pages.length - 1) {
          d.pageI++; d.shown = 0; d.acc = 0; d.state = 'typing';
          Game.audio.sfx('next');
        } else {
          var r = d.resolve; d.resolve = null;
          d.state = 'closing'; d.t = 0;
          if (r) { r(); }
        }
      }
    }
  }

  function drawDialog(g) {
    if (d.state === 'closed') { return; }
    var k = d.state === 'opening' ? d.t : (d.state === 'closing' ? Math.max(0, 1 - d.t / 5) : 1);
    if (!ui.windowAnim(g, DLG.x, DLG.y, DLG.w, DLG.h, k)) { return; }
    var pg = d.pages[d.pageI], left = d.shown;
    for (var i = 0; i < pg.length; i++) {
      var s = pg[i];
      var part = left >= s.length ? s : s.slice(0, Math.max(0, left));
      left -= s.length;
      if (part.length) { ui.text(g, part, DLG.x + 8, DLG.y + 11 + i * LINE); }
      if (left <= 0) { break; }
    }
    if (d.who) {
      var tw = F.width(d.who) + 12;
      ui.window(g, DLG.x + 6, DLG.y - 10, tw, 15, { border: '#c8d8ff' });
      ui.text(g, d.who, DLG.x + 12, DLG.y - 5, COL.accent);
    }
    if (d.state === 'wait' && Math.floor(frame / 16) % 2 === 0) {
      var last = d.pageI >= d.pages.length - 1;
      var yy = DLG.y + DLG.h - 12 + (Math.floor(frame / 16) % 4 === 0 ? 0 : 0);
      F.draw(g, last ? '▼' : '▼', DLG.x + DLG.w - 16, yy, COL.accent);
    }
  }

  /* ================= 選択肢 ================= */
  var ch = { open: false, items: [], cur: 0, resolve: null, cancel: -1, t: 0, x: 0, y: 0, w: 0, h: 0 };

  /** 選択肢を出す。戻り値は選んだ番号。opts: { cancel: B で選ばれる番号(なければ無効), at: 'dialog'|'center' } */
  ui.choice = function (items, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      ch.items = items; ch.cur = opts.start || 0; ch.resolve = resolve; ch.cancel = opts.cancel === undefined ? -1 : opts.cancel;
      var wmax = 0;
      items.forEach(function (s) { wmax = Math.max(wmax, F.width(s)); });
      ch.w = wmax + 28; ch.h = items.length * 15 + 10;
      ch.x = W - ch.w - 5;
      ch.y = (d.state !== 'closed') ? DLG.y - ch.h - 1 : Math.floor((H - ch.h) / 2);
      if (opts.center) { ch.x = Math.floor((W - ch.w) / 2); ch.y = Math.floor((H - ch.h) / 2); }
      ch.open = true; ch.t = 0;
      Game.audio.sfx('choice');
    });
  };
  ui.choiceOpen = function () { return ch.open; };

  function updateChoice() {
    if (!ch.open) { return; }
    ch.t++;
    if (ch.t < 3) { return; }
    var n = ch.items.length;
    if (Game.input.repeat('up')) { ch.cur = (ch.cur + n - 1) % n; Game.audio.sfx('cursor'); }
    if (Game.input.repeat('down')) { ch.cur = (ch.cur + 1) % n; Game.audio.sfx('cursor'); }
    if (Game.input.pressed('a')) { finish(ch.cur, 'ok'); }
    else if (Game.input.pressed('b') && ch.cancel >= 0) { finish(ch.cancel, 'cancel'); }
  }
  function finish(i, snd) {
    ch.open = false;
    Game.audio.sfx(snd);
    var r = ch.resolve; ch.resolve = null;
    if (r) { r(i); }
  }
  function drawChoice(g) {
    if (!ch.open) { return; }
    ui.window(g, ch.x, ch.y, ch.w, ch.h);
    for (var i = 0; i < ch.items.length; i++) {
      var y = ch.y + 7 + i * 15;
      ui.text(g, ch.items[i], ch.x + 20, y, i === ch.cur ? COL.accent : COL.text);
      if (i === ch.cur) { F.draw(g, '▶', ch.x + 8 + (Math.floor(frame / 12) % 2), y, COL.accent); }
    }
  }

  /* ================= マップ名バナー ================= */
  var bn = { text: '', t: 999 };
  ui.banner = function (text) { bn.text = text; bn.t = 0; };
  function drawBanner(g) {
    if (bn.t > 130) { return; }
    var w = F.width(bn.text) + 22, h = 20;
    var y;
    if (bn.t < 12) { y = Math.round(-h + (h + 4) * Game.util.ease.outCubic(bn.t / 12)); }
    else if (bn.t > 112) { y = Math.round(4 - (h + 4) * Game.util.ease.inQuad((bn.t - 112) / 18)); }
    else { y = 4; }
    ui.window(g, 4, y, w, h);
    ui.text(g, bn.text, 15, y + 6, COL.text);
    // 左の小さな飾り（ひし形）
    g.fillStyle = COL.accent; g.fillRect(8, y + 9, 3, 1); g.fillRect(9, y + 8, 1, 3);
  }

  /* ================= アイテム入手の表示 ================= */
  var ip = { id: null, t: 0, label: '', big: false };
  ui.itemPopup = function (id, label) { ip.id = id; ip.t = 0; ip.label = label || Game.items.name(id); };
  ui.hideItemPopup = function () { ip.id = null; };
  function drawItemPopup(g) {
    if (!ip.id) { return; }
    ip.t++;
    var k = Math.min(1, ip.t / 8);
    var w = Math.max(72, F.width(ip.label) + 20), h = 50;
    var x = Math.floor((W - w) / 2), y = 28;
    var hh = Math.round(h * Game.util.ease.outBack(k));
    ui.window(g, x, y + Math.round((h - hh) / 2), w, Math.max(6, hh), { border: '#ffe890' });
    if (k < 1) { return; }
    // 大きなアイコン（2 倍）とまわりのきらめき
    var icon = Game.items.icon(ip.id);
    var bob = Math.round(Math.sin(ip.t / 9) * 1.5);
    g.drawImage(icon, 0, 0, 16, 16, Math.floor(W / 2) - 16, y + 6 + bob, 32, 32);
    for (var i = 0; i < 6; i++) {
      var a = ip.t / 20 + i * Math.PI / 3, rr = 22 + Math.sin(ip.t / 7 + i) * 3;
      var sx = Math.round(W / 2 + Math.cos(a) * rr), sy = Math.round(y + 22 + Math.sin(a) * rr * 0.6);
      g.fillStyle = (Math.floor(ip.t / 5) + i) % 2 ? '#fff4b0' : '#ffffff';
      g.fillRect(sx, sy, 1, 1); g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3);
    }
    ui.text(g, ip.label, Math.floor(W / 2), y + 38, COL.accent, { align: 'center' });
  }

  /* ================= ナレーション（黒地に文字だけ） ================= */
  var nr = { open: false, lines: [], shown: 0, acc: 0, resolve: null, opt: {}, t: 0, done: false, fade: 0 };
  /** lines: 文字列の配列（1 要素 = 1 行）。A で次へ。opts: { color, y, hold } */
  ui.narrate = function (lines, opts) {
    return new Promise(function (resolve) {
      nr.lines = lines; nr.shown = 0; nr.acc = 0; nr.resolve = resolve; nr.opt = opts || {}; nr.t = 0; nr.done = false; nr.open = true;
    });
  };
  function updateNarrate() {
    if (!nr.open) { return; }
    nr.t++;
    var total = 0;
    nr.lines.forEach(function (l) { total += l.length + 6; });
    if (!nr.done) {
      nr.acc += 0.45 * (Game.input.held('a') ? 3 : 1);
      var prev = nr.shown;
      nr.shown = Math.min(total, Math.floor(nr.acc));
      if (nr.shown > prev && nr.shown % 3 === 0) { Game.audio.sfx('text', { rate: 0.8, vol: 0.7 }); }
      if (Game.input.pressed('a') && nr.shown < total) { nr.acc = total; nr.shown = total; }
      if (nr.shown >= total) { nr.done = true; nr.t = 0; }
    } else {
      if ((nr.opt.hold && nr.t > nr.opt.hold) || (!nr.opt.hold && Game.input.pressed('a') && nr.t > 8)) {
        nr.open = false;
        var r = nr.resolve; nr.resolve = null; if (r) { r(); }
      }
    }
  }
  function drawNarrate(g) {
    if (!nr.open) { return; }
    var left = nr.shown, y0 = nr.opt.y || 52;
    for (var i = 0; i < nr.lines.length; i++) {
      var s = nr.lines[i];
      var n = Math.max(0, Math.min(s.length, left));
      left -= s.length + 6;
      if (n > 0) { ui.text(g, s.slice(0, n), W / 2, y0 + i * 20, nr.opt.color || COL.text, { align: 'center', shadow: nr.opt.shadow || '#000000' }); }
      if (left <= 0) { break; }
    }
    if (nr.done && !nr.opt.hold && Math.floor(frame / 16) % 2 === 0) { F.draw(g, '▼', W / 2 - 4, 140, COL.accent); }
  }

  /* ================= 吹き出し（! ? ♪ など） ================= */
  ui.emotes = [];
  ui.emote = function (kind, getPos) {
    ui.emotes.push({ kind: kind, getPos: getPos, t: 0 });
    Game.audio.sfx('emote');
  };
  function drawEmotes(g) {
    for (var i = ui.emotes.length - 1; i >= 0; i--) {
      var e = ui.emotes[i];
      e.t++;
      if (e.t > 50) { ui.emotes.splice(i, 1); continue; }
      var p = e.getPos();
      var bob = e.t < 8 ? -Math.round(Game.util.ease.outBounce(e.t / 8) * 4) : -4;
      var x = Math.round(p.x) + 4, y = Math.round(p.y) - 16 + bob;
      g.fillStyle = '#ffffff'; g.fillRect(x - 2, y - 2, 12, 12);
      g.fillRect(x - 1, y - 3, 10, 1); g.fillRect(x - 1, y + 10, 10, 1);
      g.fillStyle = '#241a2e'; g.fillRect(x - 3, y - 1, 1, 10); g.fillRect(x + 10, y - 1, 1, 10); g.fillRect(x - 2, y - 3, 12, 1); g.fillRect(x - 2, y + 10, 12, 1);
      g.fillRect(x + 1, y + 11, 3, 1); g.fillRect(x + 1, y + 12, 2, 1);
      var c = e.kind === '!' ? '#e8403c' : '#3a5ac8';
      F.draw(g, e.kind === '♪' ? '♪' : e.kind, x + 1, y + 1, c);
    }
  }

  /* ================= まとめ ================= */
  ui.update = function () {
    frame++;
    bn.t++;
    updateDialog();
    updateChoice();
    updateNarrate();
  };
  ui.draw = function (g) {
    drawBanner(g);
    drawItemPopup(g);
    drawDialog(g);
    drawChoice(g);
    drawEmotes(g);
  };
  /** フェードより上に出すもの（ナレーション） */
  ui.drawTop = function (g) { drawNarrate(g); };
  /** 会話・選択肢・ナレーションが出ている間は true（プレイヤー操作を止める） */
  ui.busy = function () { return d.state !== 'closed' || ch.open || nr.open; };
  ui.reset = function () {
    d.state = 'closed'; d.resolve = null; ch.open = false; ch.resolve = null; nr.open = false; ip.id = null; ui.emotes = []; bn.t = 999;
  };
  ui.tick = function () { return frame; };
})();
