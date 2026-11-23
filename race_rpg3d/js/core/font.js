/* フォント: 実フォントで高解像度に描く（参照元の RR.Font と同じ API）
 * 論理座標 240x160 基準。1文字の高さは約 9。{y} {r} {g} {b} {w} で色、{N} で主人公名。
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U;
  var F = RR.Font = {};
  var STACK = RR.FONT_STACK = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP","Noto Sans CJK JP","Segoe UI","Helvetica Neue",Arial,sans-serif';
  var SIZE = 8.4;               // 基本フォントサイズ（論理px）
  var MEAS = 80;                // 計測用の大きいサイズ
  F.LINE = 11;
  F.H = 9;
  F.COLORS = { y: '#f8e060', r: '#f88878', g: '#78e888', b: '#88b8f8', w: '#f8f8f8', c: '#80e8f0', o: '#f8b060' };

  var mg = U.canvas(8, 8).g;
  mg.font = '700 ' + MEAS + 'px ' + STACK;
  var wcache = {};
  function widthOf(s) {
    var w = wcache[s];
    if (w == null) {
      if (Object.keys(wcache).length > 4000) wcache = {};
      w = wcache[s] = mg.measureText(s).width / MEAS * SIZE;
    }
    return w;
  }

  function expand(text) {
    text = String(text == null ? '' : text);
    if (text.indexOf('{N}') >= 0) {
      var n = (RR.State && RR.State.S && RR.State.S.name) || 'ソラ';
      text = text.split('{N}').join(n);
    }
    return text;
  }
  F.expand = expand;
  F.has = function () { return true; };
  F.adv = function (ch) { return widthOf(ch); };
  function strip(t) { return t.replace(/\{[a-zN]\}/g, ''); }
  // 制御コードを除いた幅
  F.measure = function (text, scale) {
    text = expand(text);
    var max = 0, lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) max = Math.max(max, widthOf(strip(lines[i])));
    return max * (scale || 1);
  };

  // text を幅 maxW で折り返した行配列
  F.wrap = function (text, maxW) {
    text = expand(text);
    var out = [];
    text.split('\n').forEach(function (para) {
      var line = '', lineW = 0, lastSpace = -1;
      for (var i = 0; i < para.length; i++) {
        var ch = para[i];
        if (ch === '{') {
          var e = para.indexOf('}', i);
          if (e > 0) { line += para.slice(i, e + 1); i = e; continue; }
        }
        var a = widthOf(ch);
        if (lineW + a > maxW && line.length) {
          if (lastSpace > 0) {
            out.push(line.slice(0, lastSpace));
            line = line.slice(lastSpace + 1);
            lineW = widthOf(strip(line));
          } else {
            out.push(line);
            line = ''; lineW = 0;
          }
          lastSpace = -1;
          if (ch === ' ') continue;
        }
        if (ch === ' ') lastSpace = line.length;
        line += ch; lineW += a;
      }
      out.push(line);
    });
    return out;
  };

  // 描画。opt: {shadow, scale, align, count(表示文字数), outline, alpha}
  F.draw = function (g, text, x, y, color, opt) {
    opt = opt || {};
    text = expand(text);
    color = color || '#f8f8f8';
    var scale = opt.scale || 1;
    var shadow = opt.shadow === undefined ? 'rgba(8,12,32,0.85)' : opt.shadow;
    var w = F.measure(text, scale);
    if (opt.align === 'center') x = x - w / 2;
    else if (opt.align === 'right') x = x - w;
    g.save();
    if (opt.alpha != null) g.globalAlpha *= opt.alpha;
    g.font = '700 ' + (SIZE * scale) + 'px ' + STACK;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    var sh = 0.55 * scale;
    if (opt.outline) {
      g.lineJoin = 'round'; g.lineWidth = Math.max(1, scale * 1.6); g.strokeStyle = opt.outline;
    }
    var cx = x, cy = y + F.H * scale / 2 + 0.2, col = color, shown = 0, run = '';
    function flush() {
      if (!run) return;
      if (opt.outline) g.strokeText(run, cx, cy);
      if (shadow) { g.fillStyle = shadow; g.fillText(run, cx + sh, cy + sh); }
      g.fillStyle = col;
      g.fillText(run, cx, cy);
      cx += widthOf(run) * scale;
      run = '';
    }
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '{') {
        var e = text.indexOf('}', i);
        if (e > 0) {
          var code = text.slice(i + 1, e);
          if (F.COLORS.hasOwnProperty(code)) { flush(); col = F.COLORS[code] || color; }
          i = e; continue;
        }
      }
      if (ch === '\n') { flush(); cx = x; cy += F.LINE * scale; continue; }
      if (opt.count != null && shown >= opt.count) break;
      shown++;
      run += ch;
    }
    flush();
    g.restore();
    return cx;
  };

  // 大きな文字（クレジットの漢字など）。実フォントで描く
  F.drawBig = function (g, ch, x, y, color, scale) {
    scale = scale || 1;
    g.save();
    g.font = '700 ' + (16 * scale) + 'px ' + STACK;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = color || '#fff';
    g.fillText(ch, x, y + 8 * scale);
    g.restore();
  };
  F.hasBig = function () { return true; };
  F.allChars = function () { return ''; };
})();
