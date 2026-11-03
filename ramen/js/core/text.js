/* 日本語のドット文字描画。
 * システムフォントを論理12pxで1文字ずつ描き、アルファを2値化して「ドット」にする。
 * 外部フォント不要で file:// でも動く。将来ビットマップフォントへ差し替える場合も
 * このファイルの glyphMask() だけを置き換えれば済む。 */
(function (RP) {
  'use strict';

  var T = RP.text = {};

  var FONT = '"MS Gothic","ＭＳ ゴシック","Osaka-Mono","Noto Sans Mono CJK JP","Noto Sans CJK JP",' +
             '"Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",monospace';
  var SIZE = 12;
  T.SIZE = SIZE;
  T.LINE = 14;          // 行送り
  T.baseline = 10;      // alphabetic baseline のY位置（12px枠内）。フォント差があれば調整
  T.threshold = 120;    // アルファ2値化のしきい値

  var scratch = document.createElement('canvas');
  scratch.width = 64; scratch.height = 64;   // 大きい文字（ロゴ等 〜48px）も入る大きさ
  var sctx = scratch.getContext('2d', { willReadFrequently: true });

  var maskCache = {};   // key → { w, h, bits:Uint8Array }
  var glyphCache = {};  // styleKey → { ch → canvas }
  var styleCount = 0;

  function isHalf(ch) {
    var c = ch.charCodeAt(0);
    return c < 0x80 || (c >= 0xFF61 && c <= 0xFF9F);
  }
  T.advance = function (ch, size) {
    size = size || SIZE;
    return isHalf(ch) ? Math.ceil(size / 2) : size;
  };

  // 1文字分の2値マスクを作る（ここがフォント依存部分）
  function glyphMask(ch, size, bold) {
    var key = ch + '|' + size + (bold ? 'b' : '');
    var m = maskCache[key];
    if (m) { return m; }
    var adv = T.advance(ch, size);
    var w = adv + (bold ? 1 : 0), h = size + 2;
    sctx.clearRect(0, 0, scratch.width, scratch.height);
    sctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    sctx.textBaseline = 'alphabetic';
    sctx.textAlign = 'left';
    sctx.fillStyle = '#fff';
    sctx.fillText(ch, 0, Math.round(T.baseline * size / SIZE));
    var img = sctx.getImageData(0, 0, w, h);
    var bits = new Uint8Array(w * h);
    for (var i = 0; i < w * h; i++) {
      bits[i] = img.data[i * 4 + 3] >= T.threshold ? 1 : 0;
    }
    m = { w: w, h: h, bits: bits };
    maskCache[key] = m;
    return m;
  }

  function paint(cx, mask, ox, oy, color) {
    cx.fillStyle = color;
    for (var y = 0; y < mask.h; y++) {
      for (var x = 0; x < mask.w; x++) {
        if (mask.bits[y * mask.w + x]) { cx.fillRect(ox + x, oy + y, 1, 1); }
      }
    }
  }

  // スタイル付きの1文字キャンバス（縁取り/影込み）。1pxの余白(PAD)を持つ。
  var PAD = 2;
  function glyphCanvas(ch, st) {
    var bucket = glyphCache[st.key];
    if (!bucket) {
      if (styleCount > 300) { glyphCache = {}; styleCount = 0; }
      bucket = glyphCache[st.key] = {};
      styleCount++;
    }
    var cv = bucket[ch];
    if (cv) { return cv; }
    var mask = glyphMask(ch, st.size, st.bold);
    var m = RP.gfx.make(mask.w + PAD * 2, mask.h + PAD * 2);
    var cx = m.ctx;
    if (st.outline) {
      var o = st.outline, offs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (var i = 0; i < offs.length; i++) { paint(cx, mask, PAD + offs[i][0], PAD + offs[i][1], o); }
    }
    if (st.shadow) { paint(cx, mask, PAD + 1, PAD + 1, st.shadow); }
    paint(cx, mask, PAD, PAD, st.color);
    bucket[ch] = m.canvas;
    return m.canvas;
  }

  function style(color, o) {
    o = o || {};
    var st = {
      size: o.size || SIZE,
      bold: !!o.bold,
      color: RP.gfx.color(color || 'white'),
      outline: o.outline ? RP.gfx.color(o.outline) : null,
      shadow: o.shadow ? RP.gfx.color(o.shadow) : null
    };
    st.key = st.size + '|' + (st.bold ? 'b' : '') + '|' + st.color + '|' + (st.outline || '') + '|' + (st.shadow || '');
    return st;
  }

  T.measure = function (str, size) {
    size = size || SIZE;
    var best = 0, cur = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === '\n') { best = Math.max(best, cur); cur = 0; continue; }
      cur += T.advance(ch, size);
    }
    return Math.max(best, cur);
  };

  // o: { align:'l'|'c'|'r', size, bold, outline, shadow, max(最大文字数:タイプライタ), alpha }
  T.draw = function (str, x, y, color, o) {
    str = String(str);
    o = o || {};
    var st = style(color, o);
    var ctx = RP.gfx.ctx;
    var lineH = o.lineH || (st.size + 2);
    var lines = str.split('\n');
    var shown = 0, max = o.max === undefined ? Infinity : o.max;
    if (o.alpha !== undefined && o.alpha < 1) { ctx.globalAlpha = o.alpha; }
    for (var l = 0; l < lines.length; l++) {
      var line = lines[l];
      var w = T.measure(line, st.size);
      var cx = Math.round(x);
      if (o.align === 'c') { cx = Math.round(x - w / 2); }
      else if (o.align === 'r') { cx = Math.round(x - w); }
      var cy = Math.round(y + l * lineH);
      for (var i = 0; i < line.length; i++) {
        if (shown >= max) { break; }
        var ch = line.charAt(i);
        if (ch !== ' ' && ch !== '　') {
          ctx.drawImage(glyphCanvas(ch, st), cx - PAD, cy - PAD);
        }
        cx += T.advance(ch, st.size);
        shown++;
      }
      if (shown >= max) { break; }
    }
    if (o.alpha !== undefined && o.alpha < 1) { ctx.globalAlpha = 1; }
  };

  // 禁則つき折り返し。戻り値: 行配列
  var NO_HEAD = '、。，．・？！」』）ー…ぁぃぅぇぉっゃゅょァィゥェォッャュョ,.?!)';
  var NO_TAIL = '「『（(';
  // 行頭禁則の文字が溢れるときは、直前の1文字ごと次の行へ送る（追い出し）。行は常に maxW 以内に収まる。
  T.wrap = function (str, maxW, size) {
    size = size || SIZE;
    var out = [], paras = String(str).split('\n');
    for (var p = 0; p < paras.length; p++) {
      var line = '', w = 0, s = paras[p];
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i), a = T.advance(ch, size);
        if (w + a > maxW && line.length > 0) {
          var carry = '';
          if (NO_HEAD.indexOf(ch) >= 0 && line.length > 1) { carry = line.charAt(line.length - 1); line = line.slice(0, -1); }
          while (line.length > 1 && NO_TAIL.indexOf(line.charAt(line.length - 1)) >= 0) { carry = line.charAt(line.length - 1) + carry; line = line.slice(0, -1); }
          out.push(line); line = carry; w = T.measure(carry, size);
        }
        line += ch; w += a;
      }
      out.push(line);
    }
    return out;
  };

  // 文字数を数える（タイプライタ用。改行は数えない）
  T.count = function (str) { return String(str).replace(/\n/g, '').length; };

  // 起動時に頻出文字を先に焼いておく（初回描画のカクつき防止）
  T.warm = function (str) {
    var seen = {};
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (seen[ch] || ch === '\n') { continue; }
      seen[ch] = 1;
      glyphMask(ch, SIZE, false);
    }
  };
})(window.RP);
