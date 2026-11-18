/* font.js — 自作ビットマップフォントの読み込み・描画・折り返し
 *
 * 字形は 10×10 ドットの枠（座標 0〜9）。送り幅は 11。
 *   かな・記号: 「筆画」で定義する（折れ線を Bresenham でドットにする）。書式は font-data.js を参照。
 *   英数: 5 ドット幅のビットマップ。
 * 濁点・半濁点は基本字形の右上に重ねて作る（字形データには含めない）。
 * 描画 y は「字形の上端」。濁点は上へ最大 3 ドットはみ出す。
 * 大きな漢字（エンディング用）は 16×16 の別表（筆画、2 ドットの太さ）。
 */
(function () {
  'use strict';

  var GRID = 10;
  var F = Game.font = {
    GRID: GRID,
    ADV: 11,       // かなの送り幅
    LINE: 14,      // 行送り
    glyphs: {},    // 文字 → { rows:[...10行...], w, adv }
    big: {}        // 文字 → { rows:[...16行...] }
  };

  // 濁点・半濁点の組み合わせ（濁音 → 清音）
  var VOICED = {}, SEMI = {};
  (function () {
    var v = 'がか ぎき ぐく げけ ごこ ざさ じし ずす ぜせ ぞそ だた ぢち づつ でて どと ばは びひ ぶふ べへ ぼほ ゔう ' +
            'ガカ ギキ グク ゲケ ゴコ ザサ ジシ ズス ゼセ ゾソ ダタ ヂチ ヅツ デテ ドト バハ ビヒ ブフ ベヘ ボホ ヴウ';
    v.split(' ').forEach(function (p) { VOICED[p.charAt(0)] = p.charAt(1); });
    var s = 'ぱは ぴひ ぷふ ぺへ ぽほ パハ ピヒ プフ ペヘ ポホ';
    s.split(' ').forEach(function (p) { SEMI[p.charAt(0)] = p.charAt(1); });
  })();

  // 全角英数・小文字などを字形のある文字へ寄せる
  function normalize(ch) {
    var c = ch.charCodeAt(0);
    if (c >= 0xFF21 && c <= 0xFF3A) { return String.fromCharCode(c - 0xFF21 + 65); }
    if (c >= 0xFF41 && c <= 0xFF5A) { return String.fromCharCode(c - 0xFF41 + 65); }
    if (c >= 0xFF10 && c <= 0xFF19) { return String.fromCharCode(c - 0xFF10 + 48); }
    if (c >= 97 && c <= 122) { return String.fromCharCode(c - 32); }
    if (c === 0x3000) { return ' '; }
    return ch;
  }

  /* ---- 筆画 → ドット ---- */
  function makeGrid(n) {
    var g = [];
    for (var y = 0; y < n; y++) { g.push(new Array(n).fill(false)); }
    return g;
  }
  function plot(g, x, y, pen) {
    for (var dy = 0; dy < pen; dy++) {
      for (var dx = 0; dx < pen; dx++) {
        if (g[y + dy] && x + dx >= 0 && x + dx < g.length) { g[y + dy][x + dx] = true; }
      }
    }
  }
  function line(g, x0, y0, x1, y1, pen) {
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;
    for (;;) {
      plot(g, x0, y0, pen);
      if (x0 === x1 && y0 === y1) { break; }
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** 'x,y-x,y-... x,y-... +x,y !x,y' → 行の配列 */
  function rasterize(spec, n, pen) {
    var g = makeGrid(n);
    var erase = [];
    spec.split(/\s+/).forEach(function (tok) {
      if (!tok) { return; }
      if (tok.charAt(0) === '+') { var a = tok.slice(1).split(','); plot(g, +a[0], +a[1], pen); return; }
      if (tok.charAt(0) === '!') { var b = tok.slice(1).split(','); erase.push([+b[0], +b[1]]); return; }
      var pts = tok.split('-').map(function (p) { var q = p.split(','); return [+q[0], +q[1]]; });
      if (pts.length === 1) { plot(g, pts[0][0], pts[0][1], pen); }
      for (var i = 0; i + 1 < pts.length; i++) { line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pen); }
    });
    erase.forEach(function (e) { if (g[e[1]]) { g[e[1]][e[0]] = false; } });
    return g.map(function (r) { return r.map(function (v) { return v ? '#' : '.'; }).join(''); });
  }

  /** 筆画の定義（1 行 1 字: 「字 筆画 筆画 …」）を読む */
  function parseStrokes(blob, n, pen, store, adv) {
    blob.split(/\r?\n/).forEach(function (ln) {
      ln = ln.replace(/\s+$/, '');
      if (!ln || ln.charAt(0) === '#') { return; }
      var ch = ln.charAt(0);
      var spec = ln.slice(1).replace(/^\s+/, '');
      store[ch] = { rows: rasterize(spec, n, pen), w: n, adv: adv, spec: spec };
    });
  }

  /** ビットマップ字形（空行区切りのブロック: 1 行目が文字、続く行が字形）を読む。下そろえ（下に 1 行あける） */
  function parseBitmaps(blob, store) {
    var lines = blob.split(/\r?\n/);
    var block = [];
    function flush() {
      if (!block.length) { return; }
      var head = block[0].split(' ');
      var name = head[0];
      var bottom = 1;
      for (var k = 1; k < head.length; k++) { if (head[k].charAt(0) === 'b') { bottom = +head[k].slice(1); } }
      var rows = block.slice(1);
      block = [];
      if (name === 'SPACE') { store[' '] = { rows: [], w: 3, adv: 4 }; return; }
      var w = 0;
      rows.forEach(function (r) { if (r.length > w) { w = r.length; } });
      var blank = new Array(w + 1).join('.');
      for (var b = 0; b < bottom; b++) { rows.push(blank); }
      while (rows.length < GRID) { rows.unshift(blank); }
      store[name] = { rows: rows.slice(0, GRID), w: w, adv: w + 1 };
    }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].replace(/\s+$/, '');
      if (ln === '') { flush(); } else { block.push(ln); }
    }
    flush();
  }

  F.load = function () {
    var d = Game.fontData || {};
    F.glyphs = {}; F.big = {};
    parseStrokes(d.kana || '', GRID, 1, F.glyphs, F.ADV);
    parseBitmaps(d.bitmaps || '', F.glyphs);   // 英数など。かなを手で上書きしたいときもここに書ける
    parseStrokes(d.big || '', 16, 1, F.big, 17);
    cache = {}; bigCache = {};
  };

  function glyphOf(ch) {
    var g = F.glyphs[ch];
    if (g) { return g; }
    var n = normalize(ch);
    return F.glyphs[n] || null;
  }

  /** 文字の送り幅 */
  F.advance = function (ch) {
    if (ch === ' ') { return 5; }
    var base = VOICED[ch] || SEMI[ch] || ch;
    var g = glyphOf(base);
    return g ? g.adv : F.ADV;
  };
  F.width = function (str) {
    var w = 0;
    for (var i = 0; i < str.length; i++) { w += F.advance(str.charAt(i)); }
    return w;
  };
  /** 字形のない文字を返す（検証用） */
  F.missing = function (str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === '\n' || ch === ' ') { continue; }
      var base = VOICED[ch] || SEMI[ch] || ch;
      if (!glyphOf(base) && out.indexOf(ch) < 0) { out.push(ch); }
    }
    return out;
  };

  /* ---- 描画 ---- */
  var cache = {};      // 'color|ch' → canvas
  var bigCache = {};
  var MARK_DAKU = [[6, 0], [7, 1], [7, 2], [8, 0], [9, 1], [9, 2]];
  var MARK_HANDAKU = [[8, 0], [9, 1], [8, 2], [7, 1]];
  var TOP = 2;         // キャンバス内で字形上端の位置（濁点の余白）
  F.marks = { daku: MARK_DAKU, handaku: MARK_HANDAKU, top: TOP };   // tools/font-png.js が同じ位置で描くために公開

  function render(ch, color) {
    var key = color + '|' + ch;
    if (cache[key]) { return cache[key]; }
    var base = VOICED[ch] || SEMI[ch] || ch;
    var g = glyphOf(base);
    var cv = document.createElement('canvas');
    cv.width = (g ? g.adv : F.ADV) + 1;
    cv.height = TOP + GRID + 1;
    var c = cv.getContext('2d');
    c.fillStyle = color;
    if (g) {
      for (var y = 0; y < g.rows.length; y++) {
        var row = g.rows[y];
        var x = 0;
        while (x < row.length) {
          if (row.charAt(x) === '#') {
            var x0 = x;
            while (x < row.length && row.charAt(x) === '#') { x++; }
            c.fillRect(x0, TOP + y, x - x0, 1);
          } else { x++; }
        }
      }
      var marks = VOICED[ch] ? MARK_DAKU : (SEMI[ch] ? MARK_HANDAKU : null);
      if (marks) { marks.forEach(function (m) { c.fillRect(m[0], m[1], 1, 1); }); }
    } else {
      // 字形がない文字は四角（豆腐）
      c.fillRect(1, TOP + 1, 7, 1); c.fillRect(1, TOP + 8, 7, 1);
      c.fillRect(1, TOP + 1, 1, 8); c.fillRect(7, TOP + 1, 1, 8);
    }
    cache[key] = cv;
    return cv;
  }

  /**
   * 文字列を描く。戻り値は描き終わりの x。
   * opt: { shadow:'#色', outline:'#色', align:'left'|'center'|'right' }
   */
  F.draw = function (g, str, x, y, color, opt) {
    opt = opt || {};
    color = color || '#ffffff';
    if (opt.align === 'center') { x = Math.round(x - F.width(str) / 2); }
    else if (opt.align === 'right') { x = x - F.width(str); }
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      var adv = F.advance(ch);
      if (ch === ' ') { x += adv; continue; }
      if (opt.outline) {
        var oc = render(ch, opt.outline);
        g.drawImage(oc, x - 1, y - TOP);
        g.drawImage(oc, x + 1, y - TOP);
        g.drawImage(oc, x, y - TOP - 1);
        g.drawImage(oc, x, y - TOP + 1);
      }
      if (opt.shadow) { g.drawImage(render(ch, opt.shadow), x + 1, y - TOP + 1); }
      g.drawImage(render(ch, color), x, y - TOP);
      x += adv;
    }
    return x;
  };

  /** 16×16 の大きな字を描く */
  F.drawBig = function (g, ch, x, y, color) {
    var key = color + '|' + ch;
    var cv = bigCache[key];
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = 16; cv.height = 16;
      var c = cv.getContext('2d');
      c.fillStyle = color;
      var gl = F.big[ch];
      if (gl) {
        for (var yy = 0; yy < 16; yy++) {
          for (var xx = 0; xx < 16; xx++) {
            if (gl.rows[yy].charAt(xx) === '#') { c.fillRect(xx, yy, 1, 1); }
          }
        }
      }
      bigCache[key] = cv;
    }
    g.drawImage(cv, x, y);
  };
  F.drawBigText = function (g, str, x, y, color) {
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === ' ') { x += 10; continue; }
      F.drawBig(g, ch, x, y, color);
      x += 18;
    }
  };
  F.bigWidth = function (str) {
    var w = 0;
    for (var i = 0; i < str.length; i++) { w += str.charAt(i) === ' ' ? 10 : 18; }
    return w;
  };

  /* ---- 折り返し ---- */
  var NO_START = '、。，．」』）！？ー…〜・ぁぃぅぇぉっゃゅょァィゥェォッャュョ!?.,:)';
  var NO_END = '「『（(';

  /** 幅 maxW に収まるよう行に分ける（'\n' は改行として尊重する） */
  F.wrap = function (str, maxW) {
    var out = [];
    str.split('\n').forEach(function (para) {
      var line = '', w = 0;
      for (var i = 0; i < para.length; i++) {
        var ch = para.charAt(i);
        var a = F.advance(ch);
        if (w + a > maxW && line.length && ch !== ' ') {
          if (NO_START.indexOf(ch) >= 0) {
            line += ch; w += a;   // 行頭禁則: はみ出して置く
            continue;
          }
          var sp = line.lastIndexOf(' ');
          var carry = '';
          if (sp > 0) {
            carry = line.slice(sp + 1);
            line = line.slice(0, sp);
          } else if (NO_END.indexOf(line.charAt(line.length - 1)) >= 0) {
            carry = line.charAt(line.length - 1);
            line = line.slice(0, -1);
          }
          out.push(line);
          line = carry + ch;
          w = F.width(line);
        } else {
          if (ch === ' ' && w === 0) { continue; }
          line += ch; w += a;
        }
      }
      out.push(line);
    });
    return out;
  };

  F.load();
})();
