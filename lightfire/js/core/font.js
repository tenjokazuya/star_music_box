/* font.js — ビットマップ文字描画
   かな・漢字: 実行環境の日本語フォントを 10px で描き、しきい値で2値化した「ドット文字」にする（外部フォントファイル不使用）。
   英数・記号 ▶▼♪ など: 自作の 5x7 ビットマップ。
   日本語フォントが見つからない環境では、自作 7x7 かな(font_data.js)に自動で切り替える。 */
(function () {
  'use strict';
  var D = PF.fontData;
  var SZ = 10, CELL_H = 12, THR = 100;
  var STACK = '"Meiryo","Yu Gothic","Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans CJK JP","Noto Sans JP","Droid Sans Fallback","MS Gothic",sans-serif';
  var cache = {}, sysOK = null;

  // 内蔵フォールバック用: 濁点/半濁点の合成表
  var VOICED = {}, HALF = {};
  (function () {
    function reg(plain, voiced, tbl) { for (var i = 0; i < plain.length; i++) tbl[voiced[i]] = plain[i]; }
    reg('かきくけこさしすせそたちつてとはひふへほ', 'がぎぐげござじずぜぞだぢづでどばびぶべぼ', VOICED);
    reg('カキクケコサシスセソタチツテトハヒフヘホ', 'ガギグゲゴザジズゼゾダヂヅデドバビブベボ', VOICED);
    reg('はひふへほ', 'ぱぴぷぺぽ', HALF); reg('ハヒフヘホ', 'パピプペポ', HALF);
    VOICED['ヴ'] = 'ウ';
  })();
  var MARK_D = [[5, 0], [7, 0], [4, 1], [6, 1]], MARK_H = [[5, 0], [6, 0], [7, 0], [5, 1], [7, 1]];
  var UI_SYM = { '▶': 1, '▼': 1, '▽': 1, '▲': 1, '♪': 1, '★': 1, '♥': 1, '◆': 1 };

  function detect() {
    if (sysOK !== null) return sysOK;
    try {
      var c = PF.makeCanvas(24, 16), g = c.getContext('2d', { willReadFrequently: true }), a = [];
      ['あ', 'ん', '火', 'ヒ'].forEach(function (ch) {
        g.clearRect(0, 0, 24, 16); g.font = SZ + 'px ' + STACK; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(ch, 2, 2);
        a.push(Array.prototype.join.call(g.getImageData(0, 0, 24, 16).data, ','));
      });
      sysOK = true;
      for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) if (a[i] === a[j]) sysOK = false;
      if (a[0].indexOf('255') < 0 && a[0].replace(/[0,]/g, '') === '') sysOK = false;
    } catch (e) { sysOK = false; }
    return sysOK;
  }
  PF.font_sys = function () { return detect(); };

  function builtin(ch) {
    var up = ch.toUpperCase();
    if (D.ascii[ch]) return { rows: D.ascii[ch], w: 5, adv: ch === ' ' ? 5 : 6, y: 2 };
    if (D.ascii[up]) return { rows: D.ascii[up], w: 5, adv: 6, y: 2 };
    if (D.kana[ch]) return { rows: D.kana[ch], w: 7, adv: 8, y: 2 };
    var base = VOICED[ch], mark = MARK_D;
    if (!base) { base = HALF[ch]; mark = MARK_H; }
    if (base && D.kana[base]) return { rows: D.kana[base], w: 7, adv: 8, y: 2, mark: mark };
    return null;
  }
  function isAscii(ch) { var c = ch.charCodeAt(0); return c < 128; }
  function advance(ch) {
    if (D.ascii[ch] || D.ascii[ch.toUpperCase()]) return ch === ' ' ? 5 : 6;
    if (UI_SYM[ch]) return 8;
    if (isAscii(ch)) return 6;
    return detect() ? SZ : 8;
  }

  function glyph(ch, color) {
    var key = ch + color, c = cache[key];
    if (c) return c;
    var useBuiltin = isAscii(ch) || UI_SYM[ch] || !detect();
    if (useBuiltin) {
      var bm = builtin(ch);
      c = PF.makeCanvas(10, CELL_H);
      if (bm) {
        var x = c.getContext('2d'); x.fillStyle = color;
        for (var r = 0; r < bm.rows.length && r < 7; r++) { var row = bm.rows[r]; for (var q = 0; q < row.length && q < 7; q++) if (row.charAt(q) === '#') x.fillRect(q, bm.y + r, 1, 1); }
        if (bm.mark) for (var m = 0; m < bm.mark.length; m++) x.fillRect(bm.mark[m][0], bm.mark[m][1], 1, 1);
      }
      c._adv = advance(ch);
    } else {
      c = PF.makeCanvas(SZ + 1, CELL_H);
      var g = c.getContext('2d', { willReadFrequently: true });
      g.font = SZ + 'px ' + STACK; g.textBaseline = 'top'; g.fillStyle = color; g.fillText(ch, 0, 1);
      var d = g.getImageData(0, 0, c.width, c.height), a = d.data;
      for (var i = 3; i < a.length; i += 4) a[i] = a[i] > THR ? 255 : 0;
      g.putImageData(d, 0, 0);
      c._adv = SZ;
    }
    cache[key] = c;
    return c;
  }

  var F = PF.font = {
    LINE: 12, CELL_H: CELL_H, TOP: 0, SZ: SZ,
    width: function (s) { var w = 0; for (var i = 0; i < s.length; i++) w += advance(s.charAt(i)); return w; },
    char: function (ctx, ch, x, y, color) { var g = glyph(ch, color); ctx.drawImage(g, x, y); return g._adv; },
    draw: function (ctx, s, x, y, color, o) {
      o = o || {}; color = color || '#ffffff';
      if (o.outline) {
        var offs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
        for (var k = 0; k < offs.length; k++) F.draw(ctx, s, x + offs[k][0], y + offs[k][1], o.outline);
      } else if (o.shadow) F.draw(ctx, s, x + 1, y + 1, o.shadow);
      var cx = x;
      for (var i = 0; i < s.length; i++) cx += F.char(ctx, s.charAt(i), cx, y, color);
      return cx - x;
    },
    drawC: function (ctx, s, cxm, y, color, o) { F.draw(ctx, s, Math.round(cxm - F.width(s) / 2), y, color, o); },
    drawR: function (ctx, s, xr, y, color, o) { F.draw(ctx, s, xr - F.width(s), y, color, o); },
    // 整数倍に拡大（タイトルロゴ等）
    drawScaled: function (ctx, s, x, y, color, sc, o) {
      o = o || {};
      for (var pass = 0; pass < (o.outline ? 2 : 1); pass++) {
        var cx = x;
        for (var i = 0; i < s.length; i++) {
          var g = glyph(s.charAt(i), pass === 0 && o.outline ? o.outline : color), w = g.width * sc, h = g.height * sc;
          if (pass === 0 && o.outline) { for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) ctx.drawImage(g, cx + dx * sc, y + dy * sc, w, h); }
          else ctx.drawImage(g, cx, y, w, h);
          cx += g._adv * sc;
        }
      }
    },
    widthScaled: function (s, sc) { return F.width(s) * sc; },
    // 大字(16x16): 漢字のクレジット用。システムフォントが使えるときはそれを 16px で 2値化。なければ 自作ビットマップ
    big: function (ctx, ch, x, y, color, sc) {
      sc = sc || 1;
      if (detect() || !D.big[ch]) {
        var key = 'big' + ch + color, c = cache[key];
        if (!c) {
          c = PF.makeCanvas(18, 18); var g = c.getContext('2d');
          g.font = 'bold 16px ' + STACK; g.textBaseline = 'top'; g.fillStyle = color; g.fillText(ch, 1, 0);
          var d = g.getImageData(0, 0, 18, 18), a = d.data;
          for (var i = 3; i < a.length; i += 4) a[i] = a[i] > 110 ? 255 : 0;
          g.putImageData(d, 0, 0); cache[key] = c;
        }
        ctx.drawImage(c, x, y, 18 * sc, 18 * sc); return;
      }
      var rows = D.big[ch]; ctx.fillStyle = color;
      for (var r = 0; r < rows.length; r++) for (var q = 0; q < 16 && q < rows[r].length; q++) if (rows[r].charAt(q) === '#') ctx.fillRect(x + q * sc, y + r * sc, sc, sc);
    },
    // 折り返し（\n 対応）。maxW はピクセル
    wrap: function (text, maxW) {
      var lines = [], paras = String(text).split('\n');
      for (var p = 0; p < paras.length; p++) {
        var cur = '', w = 0, s = paras[p];
        for (var i = 0; i < s.length; i++) {
          var ch = s.charAt(i), a = advance(ch);
          if (w + a > maxW) { lines.push(cur); cur = ''; w = 0; }
          cur += ch; w += a;
        }
        lines.push(cur);
      }
      return lines;
    }
  };
})();
