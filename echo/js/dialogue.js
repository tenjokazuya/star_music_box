/* dialogue.js ― 会話イベント（通信ウィンドウ風ポートレート・表情・タイプライター・発話音）
 * 画面座標で描画。テキストは画面下の横長ウィンドウ、ポートレートは右上に飛び出す通信枠に表示。 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, G = EB.Gfx, U = EB.U;

  var cur = null;
  var BOX_X = 4, BOX_W = 312, BOX_H = 72, TEXT_W = 286, FS = 14, LH = 16;   // 本文は14px（12pxより潰れにくい）

  function wrap(text) {
    var out = [], paras = text.split('\n');
    for (var p = 0; p < paras.length; p++) {
      var s = paras[p], line = '', w = 0;
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i), cw = EB.Font.width(ch, FS);
        // 句読点・閉じ括弧は行頭に置かず、行末にぶら下げる（禁則処理）
        var hang = '。、．，」』）！？'.indexOf(ch) >= 0 && w + cw <= TEXT_W + 12;
        if (w + cw > TEXT_W && !hang) { out.push(line); line = ''; w = 0; }
        line += ch; w += cw;
      }
      out.push(line);
    }
    return out.join('\n');
  }

  var Dialogue = {
    get active() { return !!cur; },
    cancel: function () { cur = null; },
    wrap: wrap,
    start: function (id, onEnd) {
      id = EB.Scenario.resolve(id);
      var lines = EB.Scenario.scenes[id];
      if (!lines) { if (onEnd) onEnd(); return; }
      cur = { id: id, lines: lines, idx: 0, shown: 0, t: 0, openT: 0, closing: false, closeT: 0, onEnd: onEnd, wait: 0, slide: 10, key: '' };
      Dialogue._begin();
      EB.Audio.se('radio');
    },
    _begin: function () {
      var l = cur.lines[cur.idx];
      cur.line = l; cur.sp = EB.Scenario.speakers[l[0]]; cur.text = wrap(l[1]); cur.full = cur.text.length; cur.shown = 0; cur.wait = 0;
      cur.emo = l[3] || 'normal';
      var key = EB.Portrait.keyFor(l[0], l[2]);
      if (key !== cur.key) { cur.key = key; cur.slide = 10; }
    },
    update: function () {
      if (!cur) return;
      var In = EB.Input, c = cur;
      c.t++;
      if (c.slide > 0 && c.openT >= 12) c.slide--;
      if (!c.closing && c.openT < 12) { c.openT++; return; }
      if (c.closing) {
        c.closeT++;
        if (c.closeT > 10) { var cb = c.onEnd; cur = null; if (cb) cb(); }
        return;
      }
      var tap = In.peekTap(); if (tap) In.takeTap();
      var adv = In.pressed.ok || In.pressed.shot || In.pressed.cancel || !!tap;
      if (c.shown < c.full) {
        if (c.t % 2 === 0) {
          c.shown++;
          var ch = c.text.charAt(c.shown - 1);
          if (ch !== ' ' && ch !== '\n' && ch !== '。' && ch !== '、' && (c.shown & 1)) EB.Audio.blip(c.sp.blip, c.sp.kind);
        }
        if (adv) c.shown = c.full;
      } else {
        c.wait++;
        if (adv && c.wait > 8) {
          c.idx++;
          if (c.idx >= c.lines.length) { c.closing = true; c.closeT = 0; EB.Audio.se('radio'); }
          else { Dialogue._begin(); EB.Audio.se('cursor'); }
        }
      }
    },
    draw: function (ctx) {
      if (!cur) return;
      var c = cur, k = c.closing ? 1 - c.closeT / 10 : Math.min(1, c.openT / 12);
      var h = Math.round(BOX_H * U.easeOut(k)), y = CFG.H - 6 - h;
      if (h < 8) return;
      var sp = c.sp;
      G.frame(BOX_X, y, BOX_W, h, { bg: '#060a24' });
      if (k < 1) return;
      var talking = c.shown < c.full;

      // 通信枠（ポートレート）
      var blink = (c.t % 230) < 5;
      var pt = EB.Portrait.get(c.key, talking && ((c.t >> 3) & 1), c.emo, blink);
      var fw = pt.w + 6, fh = pt.h + 6;
      var slideX = Math.round(U.easeOut(c.slide / 10) * (fw + 8));
      var fx = BOX_X + BOX_W - fw - 4 + slideX, fy = y - fh + 3;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, CFG.W, CFG.H); ctx.clip();
      G.frame(fx, fy, fw, fh, { bg: '#05081c', b1: sp.color, b2: '#1c2c70' });
      ctx.drawImage(pt.c, fx + 3, fy + 3);
      // 通信中のインジケータ
      if ((c.t >> 4) & 1) { ctx.fillStyle = talking ? '#ff6060' : '#60ff90'; ctx.fillRect(fx + 6, fy + 6, 3, 3); }
      ctx.restore();

      // 名前タブ
      var nm = c.line[2] || sp.name, tw = EB.Font.width(nm, FS) + 14;
      G.frame(BOX_X + 6, y - 14, tw, 17, { bg: '#0a1240', b1: sp.color, b2: '#1c2c70' });
      G.text(nm, BOX_X + 13, y - 9, sp.color, { shadow: '#000', size: FS });

      // 本文
      var lines = c.text.substring(0, c.shown).split('\n');
      for (var i = 0; i < lines.length; i++) G.text(lines[i], BOX_X + 10, y + 10 + i * LH, '#ffffff', { shadow: '#101840', size: FS });
      if (!talking && ((c.t >> 4) & 1)) G.text('~', BOX_X + BOX_W - 12, y + h - 12, '#ffe060');
    }
  };
  EB.Dialogue = Dialogue;
})();
