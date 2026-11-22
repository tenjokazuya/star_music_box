/* 配置物（建物・木・街灯・自販機・家具など）
 * 各定義: size(o)->[w,h](タイル), solid(o)->[[dx,dy],..], draw(D,o,px,py), lights(o,px,py)->[{x,y,r,c}]
 * D.low / D.high に描く（high はキャラより手前に描かれる）
 */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, P = RR.Pal, F = RR.Font;
  var Props = RR.Props = { defs: {} };
  var TS = 16;

  function L(g) {
    return {
      g: g,
      px: function (x, y, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); },
      rect: function (x, y, w, h, c) { if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); },
      alpha: function (a) { g.globalAlpha = a; }
    };
  }
  Props.layer = L;

  // 立体的な箱（上面・前面・影）
  function box(d, x, y, w, h, col, topH) {
    var r = P.ramp(col);
    topH = topH == null ? Math.min(4, h >> 2) : topH;
    d.rect(x, y, w, h, r.base);
    d.rect(x, y, w, topH, r.lt);
    d.rect(x, y, w, 1, r.hi);
    d.rect(x, y + topH, w, 1, r.sh);
    d.rect(x + w - 1, y + topH, 1, h - topH, r.sh);
    d.rect(x, y + h - 1, w, 1, r.dk);
    d.rect(x, y, 1, h, r.lt);
  }
  function outlineRect(d, x, y, w, h, c) { d.rect(x, y, w, 1, c); d.rect(x, y + h - 1, w, 1, c); d.rect(x, y, 1, h, c); d.rect(x + w - 1, y, 1, h, c); }
  function disc(d, cx, cy, r, ramp, dither) {
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
      var q = x * x + y * y;
      if (q > r * r + r * 0.6) continue;
      var lv = (x + y) / (r * 2);
      var c = lv < -0.35 ? ramp.hi : lv < -0.05 ? ramp.lt : lv < 0.3 ? ramp.base : ramp.sh;
      if (q > (r - 1) * (r - 1) + r && lv > 0) c = ramp.dk;
      if (dither && c === ramp.lt && P.dither(cx + x, cy + y) > 0.6) c = ramp.base;
      d.px(cx + x, cy + y, c);
    }
  }
  function groundShadow(d, x, y, w, h) {
    d.alpha(0.28); d.rect(x, y, w, h, '#000018'); d.alpha(1);
  }
  Props.box = box; Props.disc = disc;

  function def(type, o) {
    o.type = type;
    if (!o.size) o.size = function () { return [1, 1]; };
    Props.defs[type] = o;
  }
  Props.def = def;

  // ---------- 建物 ----------
  var ROOF = {
    red: '#a83c30', blue: '#3c5090', green: '#307048', gray: '#5c5c70', brown: '#7c4c30', black: '#303040', orange: '#c86830', teal: '#287878'
  };
  var WALL = {
    cream: '#e0d0a8', white: '#e8e8f0', brick: '#a85840', wood: '#9c6c40', gray: '#9c9cac', blue: '#90a8c8', pink: '#e8c0c0', green: '#a8c098', dark: '#585868'
  };
  def('building', {
    size: function (o) { return [o.w, o.h]; },
    solid: function (o) {
      var s = [], wallRows = o.wallRows || Math.min(2, o.h - 1), doors = [].concat(o.door == null ? [] : o.door);
      for (var y = 1; y < o.h; y++) for (var x = 0; x < o.w; x++) {
        if (y === o.h - 1 && doors.indexOf(x) >= 0) continue;
        s.push([x, y]);
      }
      return s;
    },
    draw: function (D, o, px, py) {
      var w = o.w * TS, h = o.h * TS;
      var wallRows = o.wallRows || Math.min(2, o.h - 1);
      var roofH = h - wallRows * TS;
      var lo = D.low, hi = D.high;
      var wall = WALL[o.wall] || o.wall || WALL.cream;
      var wr = P.ramp(wall);
      var wy = py + roofH;
      // 壁
      lo.rect(px, wy, w, wallRows * TS, wr.base);
      if (o.wall === 'wood') for (var yy = wy + 3; yy < py + h; yy += 4) lo.rect(px, yy, w, 1, wr.sh);
      else if (o.wall === 'brick') {
        for (yy = wy; yy < py + h; yy += 4) {
          lo.rect(px, yy + 3, w, 1, wr.dk);
          for (var xx = px + (((yy - wy) >> 2) & 1) * 4; xx < px + w; xx += 8) lo.rect(xx, yy, 1, 3, wr.sh);
        }
      } else {
        for (yy = wy; yy < py + h; yy++) for (xx = px; xx < px + w; xx++) if (U.hash2(xx, yy, 3) > 0.93) lo.px(xx, yy, wr.lt);
      }
      lo.rect(px, wy, w, 2, wr.sh); // 軒の影
      lo.rect(px, py + h - 3, w, 3, P.shade(wall, -0.4)); // 基礎
      lo.rect(px, wy, 1, wallRows * TS, wr.lt); lo.rect(px + w - 1, wy, 1, wallRows * TS, wr.sh);
      // シャッター（ガレージ）
      var doors = [].concat(o.door == null ? [] : o.door);
      if (o.shutter) {
        var sx = px + o.shutter.x * TS + 2, sw = o.shutter.w * TS - 4, sy = wy + 4, sh = py + h - sy - 2;
        lo.rect(sx - 1, sy - 1, sw + 2, sh + 1, '#303038');
        for (yy = 0; yy < sh; yy += 3) { lo.rect(sx, sy + yy, sw, 2, o.shutter.open ? '#181820' : '#a8acbc'); lo.rect(sx, sy + yy + 2, sw, 1, o.shutter.open ? '#101018' : '#707484'); }
        if (o.shutter.open) { lo.rect(sx, sy, sw, 3, '#a8acbc'); }
      }
      // 窓
      var winY = wy + (wallRows > 1 ? 6 : 3);
      var lit = o.lit !== false;
      for (var tx = 0; tx < o.w; tx++) {
        var isDoor = doors.indexOf(tx) >= 0;
        var inShutter = o.shutter && tx >= o.shutter.x && tx < o.shutter.x + o.shutter.w;
        if (isDoor || inShutter || o.noWin) continue;
        if (o.shopWin) {
          // 大きなガラス窓（店）
          var gx = px + tx * TS + 1, gy = wy + 4, gw = 14, gh = wallRows * TS - 9;
          lo.rect(gx - 1, gy - 1, gw + 2, gh + 2, '#d8dce8');
          lo.rect(gx, gy, gw, gh, lit ? '#f0d878' : '#203048');
          if (lit) { lo.rect(gx, gy + gh - 4, gw, 4, '#d8b050'); for (var k = 0; k < 3; k++) lo.rect(gx + 2 + k * 4, gy + gh - 7, 2, 3, ['#e85848', '#48a8e8', '#58c858'][k]); }
          lo.rect(gx + 2, gy + 1, 1, 4, '#fff8d0'); lo.rect(gx + 3, gy + 1, 1, 2, '#fff8d0');
          continue;
        }
        if ((tx + (o.winOff || 0)) % 2 === 1 && o.w > 2) continue;
        var wx = px + tx * TS + 3;
        lo.rect(wx - 1, winY - 1, 12, 10, '#e8ecf4');
        lo.rect(wx, winY, 10, 8, lit ? '#f0d070' : '#283850');
        lo.rect(wx + 4, winY, 1, 8, '#c8ccd8'); lo.rect(wx, winY + 3, 10, 1, '#c8ccd8');
        lo.rect(wx + 1, winY + 1, 2, 1, lit ? '#fff8c8' : '#5878a0');
        lo.rect(wx - 1, winY + 9, 12, 1, wr.dk);
        if (lit) lo.rect(wx, winY + 5, 10, 3, '#d8a848');
      }
      // ドア（fakeDoor は描くだけで入れない）
      doors.concat(o.fakeDoor || []).forEach(function (dx) {
        var dxp = px + dx * TS + 3, dyp = py + h - 15;
        if (o.glassDoor) {
          lo.rect(dxp - 1, dyp - 1, 12, 15, '#c8ccd8');
          lo.rect(dxp, dyp, 10, 14, '#f0d878'); lo.rect(dxp + 4, dyp, 2, 14, '#a8acb8');
          lo.rect(dxp + 1, dyp + 1, 1, 5, '#fff8d0');
        } else {
          lo.rect(dxp - 1, dyp - 1, 12, 15, '#3c2818');
          lo.rect(dxp, dyp, 10, 14, '#7c4c28'); lo.rect(dxp, dyp, 10, 1, '#a06c3c');
          lo.rect(dxp + 2, dyp + 2, 6, 4, '#f0d070'); lo.rect(dxp + 7, dyp + 8, 2, 1, '#e8c860');
        }
        lo.rect(dxp - 2, py + h - 1, 14, 1, '#8c8c98');
      });
      // 屋根
      var rc = ROOF[o.roof] || o.roof || ROOF.red;
      var rr = P.ramp(rc);
      if (o.roof === 'flat' || o.flat) {
        var fc = P.ramp(o.flatC || '#a0a0b0');
        lo.rect(px, py, w, roofH, fc.base);
        lo.rect(px, py, w, 2, fc.hi);
        lo.rect(px + 2, py + 3, w - 4, roofH - 6, fc.sh);
        lo.rect(px + 3, py + 4, w - 6, roofH - 8, fc.base);
        lo.rect(px, py + roofH - 2, w, 2, fc.dk);
        if (o.ac) { box(lo, px + w - 18, py + 5, 10, 7, '#c0c4cc', 3); }
      } else {
        for (var ry = 0; ry < roofH; ry++) {
          var band = ry % 4;
          var c = band === 0 ? rr.lt : band === 3 ? rr.sh : rr.base;
          if (ry < 2) c = rr.hi;
          lo.rect(px, py + ry, w, 1, c);
          if (band === 1) for (var sx2 = px + ((ry >> 2) & 1) * 4; sx2 < px + w; sx2 += 8) lo.px(sx2, py + ry, rr.sh);
        }
        // 端の暗い縁
        lo.rect(px, py, 1, roofH, rr.dk); lo.rect(px + w - 1, py, 1, roofH, rr.dk);
        lo.rect(px - 1, py + roofH - 2, w + 2, 2, rr.dk);
        lo.rect(px + w / 2 - 1, py, 2, 2, rr.hi);
      }
      // 最上段は手前に（キャラが建物の裏に回った時に隠れる）
      hi.g.drawImage(lo.g.canvas, px, py, w, TS, px, py, w, TS);
      // ひさし（看板より先に描く。看板が ひさしに 隠れないように）
      if (o.awning) {
        var ac = P.ramp(o.awning);
        var ax = px + 2, ay = wy + 1, aw = w - 4;
        for (var i = 0; i < aw; i++) lo.rect(ax + i, ay, 1, 5, ((i >> 2) & 1) ? '#f0f0f0' : ac.base);
        lo.rect(ax, ay + 5, aw, 1, ac.dk);
        for (i = 0; i < aw; i += 4) lo.rect(ax + i, ay + 5, 2, 1, ac.sh);
      }
      // 看板（ひさしがある店は ひさしの上、軒先に掛ける）
      if (o.sign) {
        var tw = F.measure(o.sign) + 8;
        var sxp = px + Math.round((w - tw) / 2), syp = o.awning ? wy - 12 : wy - 6;
        if (o.signX != null) sxp = px + o.signX;
        var sc = o.signC || '#c83830';
        var sr = P.ramp(sc);
        lo.rect(sxp - 1, syp - 1, tw + 2, 13, '#181020');
        lo.rect(sxp, syp, tw, 11, sr.base); lo.rect(sxp, syp, tw, 1, sr.hi); lo.rect(sxp, syp + 10, tw, 1, sr.dk);
        F.draw(lo.g, o.sign, sxp + 4, syp + 1, o.signT || '#f8f8f8', { shadow: sr.dk });
      }
    },
    lights: function (o, px, py) {
      var out = [], w = o.w * TS, h = o.h * TS;
      var wallRows = o.wallRows || Math.min(2, o.h - 1);
      var wy = py + h - wallRows * TS;
      var doors = [].concat(o.door == null ? [] : o.door);
      if (o.lit !== false) {
        for (var tx = 0; tx < o.w; tx++) {
          if (doors.indexOf(tx) >= 0) { if (o.glassDoor) out.push({ x: px + tx * TS + 8, y: py + h - 6, r: 22, c: '#f8e0a0' }); continue; }
          if (o.shutter && tx >= o.shutter.x && tx < o.shutter.x + o.shutter.w) continue;
          if (o.noWin) continue;
          if (!o.shopWin && (tx + (o.winOff || 0)) % 2 === 1 && o.w > 2) continue;
          out.push({ x: px + tx * TS + 8, y: wy + 10, r: o.shopWin ? 26 : 16, c: o.shopWin ? '#f8e8b0' : '#f8d890' });
        }
      }
      if (o.sign) out.push({ x: px + w / 2, y: wy - 1, r: 20, c: o.signGlow || '#f8a080' });
      if (o.shutter && o.shutter.open) out.push({ x: px + (o.shutter.x + o.shutter.w / 2) * TS, y: py + h - 8, r: 30, c: '#f8f0d0' });
      return out;
    }
  });

  // ---------- 木 ----------
  def('tree', {
    size: function () { return [2, 1]; },
    draw: function (D, o, px, py) {
      var kind = o.kind || 'round';
      var base = kind === 'sakura' ? '#e0a0b8' : kind === 'pine' ? '#245c38' : kind === 'autumn' ? '#c86830' : '#2c6c34';
      var ramp = P.ramp(base);
      groundShadow(D.low, px + 4, py + 10, 24, 5);
      // 幹
      D.low.rect(px + 13, py - 2, 6, 14, '#5c3818'); D.low.rect(px + 13, py - 2, 2, 14, '#7c5028'); D.low.rect(px + 18, py - 2, 1, 14, '#3c2410');
      D.low.rect(px + 11, py + 10, 10, 2, '#4c2c14');
      // 樹冠（上2タイルは手前レイヤー）
      var cx = px + 16, cy = py - 14;
      var tgt = D.high;
      if (kind === 'pine') {
        for (var i = 0; i < 4; i++) {
          var ry = cy - 12 + i * 8, rw = 4 + i * 3;
          for (var y = 0; y < 9; y++) {
            var ww = Math.round(rw * (y + 1) / 9);
            for (var x = -ww; x <= ww; x++) {
              var c = x < -ww / 3 ? ramp.lt : x > ww / 2 ? ramp.sh : ramp.base;
              if (y === 8) c = ramp.dk;
              tgt.px(cx + x, ry + y, c);
            }
          }
        }
        return;
      }
      var blobs = [[0, -2, 11], [-8, 4, 8], [8, 4, 8], [-5, -9, 7], [6, -9, 7], [0, 7, 8]];
      blobs.forEach(function (b) { disc(tgt, cx + b[0], cy + b[1], b[2], { hi: ramp.lt, lt: ramp.lt, base: ramp.base, sh: ramp.sh, dk: ramp.dk }, true); });
      // ハイライトの粒
      var rnd = U.rng(px * 31 + py);
      for (i = 0; i < 9; i++) {
        var hx = cx - 10 + Math.floor(rnd() * 14), hy = cy - 12 + Math.floor(rnd() * 12);
        tgt.px(hx, hy, ramp.hi); tgt.px(hx + 1, hy, ramp.lt);
      }
      if (kind === 'sakura') for (i = 0; i < 12; i++) tgt.px(cx - 12 + Math.floor(rnd() * 24), cy - 10 + Math.floor(rnd() * 20), '#f8e0ec');
    }
  });
  def('bush', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 11, 14, 4);
      var ramp = P.ramp(o.c || '#347c3c');
      disc(D.low, px + 8, py + 8, 6, ramp, true);
      disc(D.low, px + 5, py + 6, 3, ramp, false);
      if (o.flowers) { D.low.px(px + 5, py + 5, '#f890b0'); D.low.px(px + 10, py + 7, '#f8f8f8'); D.low.px(px + 8, py + 10, '#f890b0'); }
    }
  });

  // ---------- 街灯 ----------
  def('lamp', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 4, py + 12, 9, 3);
      D.low.rect(px + 6, py + 13, 5, 2, '#383840');
      D.low.rect(px + 7, py - 2, 3, 15, '#585868'); D.low.rect(px + 7, py - 2, 1, 15, '#8888a0');
      var h = D.high;
      h.rect(px + 7, py - 22, 3, 20, '#585868'); h.rect(px + 7, py - 22, 1, 20, '#8888a0');
      h.rect(px + 4, py - 26, 9, 4, '#404050'); h.rect(px + 4, py - 26, 9, 1, '#6c6c80');
      h.rect(px + 5, py - 22, 7, 2, '#fff8c8');
    },
    lights: function (o, px, py) { return [{ x: px + 8, y: py - 14, r: o.r || 46, c: o.c || '#f8e0a0' }]; }
  });

  // ---------- 自販機 ----------
  def('vending', {
    draw: function (D, o, px, py) {
      var col = o.c || '#c83838';
      var r = P.ramp(col);
      groundShadow(D.low, px + 1, py + 12, 15, 4);
      var lo = D.low, hi = D.high;
      // 下段
      lo.rect(px + 1, py - 1, 14, 15, r.base); lo.rect(px + 1, py - 1, 1, 15, r.lt); lo.rect(px + 14, py - 1, 1, 15, r.sh);
      lo.rect(px + 3, py + 8, 10, 4, '#181820'); lo.rect(px + 3, py + 8, 10, 1, '#383840');
      lo.rect(px + 11, py + 1, 2, 4, '#e8e8f0');
      lo.rect(px + 1, py + 13, 14, 1, r.dk);
      // 上段（手前）
      hi.rect(px + 1, py - 10, 14, 9, r.base); hi.rect(px + 1, py - 10, 14, 1, r.hi); hi.rect(px + 1, py - 10, 1, 9, r.lt); hi.rect(px + 14, py - 10, 1, 9, r.sh);
      hi.rect(px + 3, py - 8, 10, 6, '#f0f0f8');
      var dc = ['#e84848', '#4890e8', '#f8c838', '#48c868', '#f8f8f8', '#8848c8'];
      for (var i = 0; i < 5; i++) { hi.rect(px + 3 + i * 2, py - 7, 1, 3, dc[i % dc.length]); hi.px(px + 3 + i * 2, py - 3, '#e8e060'); }
      lo.rect(px + 3, py, 10, 1, '#e8e8f0');
      for (i = 0; i < 5; i++) lo.px(px + 3 + i * 2, py + 1, '#40e060');
    },
    lights: function (o, px, py) { return [{ x: px + 8, y: py - 4, r: 24, c: '#d0e8f8' }]; }
  });

  // ---------- 駐車中の車 ----------
  def('car', {
    size: function (o) { return o.dir === 'h' ? [2, 1] : [1, 2]; },
    draw: function (D, o, px, py) {
      if (o.dynamic) return; // 動的に描く（自分の車）
      Props.drawCar(D.low.g, o, px, py);
    }
  });
  Props.drawCar = function (g, o, px, py) {
    var spr = RR.Sprites.carTop(o.model || 'comet', o.color || 'white', 2, o.dirt || 0);
    g.save();
    g.globalAlpha = 0.3; g.fillStyle = '#000018';
    if (o.dir === 'h') g.fillRect(px + 1, py + 3, 31, 13); else g.fillRect(px + 2, py + 2, 14, 31);
    g.globalAlpha = 1;
    if (o.dir === 'h') {
      g.translate(px + 16, py + 8);
      g.rotate(o.flip ? -Math.PI / 2 : Math.PI / 2);
      g.drawImage(spr, Math.round(-spr.width / 2), Math.round(-spr.height / 2));
    } else {
      g.translate(px + 8, py + 16);
      if (o.flip) g.rotate(Math.PI);
      g.drawImage(spr, Math.round(-spr.width / 2), Math.round(-spr.height / 2));
    }
    g.restore();
  };

  // ---------- 小物 ----------
  def('sign', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 3, py + 12, 11, 3);
      D.low.rect(px + 7, py + 4, 2, 10, '#5c3818');
      box(D.low, px + 1, py - 4, 14, 10, o.c || '#a07040', 2);
      D.low.rect(px + 3, py, 10, 1, '#5c3818'); D.low.rect(px + 3, py + 2, 8, 1, '#5c3818');
    }
  });
  def('board', { // 掲示板
    size: function () { return [2, 1]; },
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 2, py + 12, 28, 3);
      D.low.rect(px + 3, py, 2, 14, '#5c3818'); D.low.rect(px + 27, py, 2, 14, '#5c3818');
      box(D.low, px + 1, py - 8, 30, 14, '#7c5028', 2);
      D.low.rect(px + 3, py - 5, 26, 9, '#d8c8a0');
      D.low.rect(px + 5, py - 4, 8, 6, '#f8f8f0'); D.low.rect(px + 15, py - 3, 6, 5, '#f8d0d0'); D.low.rect(px + 23, py - 4, 4, 6, '#d0e0f8');
    }
  });
  def('bench', {
    size: function () { return [2, 1]; },
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 2, py + 11, 28, 4);
      D.low.rect(px + 3, py + 8, 2, 5, '#383840'); D.low.rect(px + 27, py + 8, 2, 5, '#383840');
      box(D.low, px + 1, py + 4, 30, 5, '#a06838', 2);
      box(D.low, px + 1, py - 3, 30, 5, '#a06838', 2);
    }
  });
  def('pole', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 4, py + 12, 8, 3);
      D.low.rect(px + 6, py - 4, 5, 17, '#7c7468'); D.low.rect(px + 6, py - 4, 1, 17, '#a09888');
      var h = D.high;
      h.rect(px + 6, py - 40, 5, 36, '#7c7468'); h.rect(px + 6, py - 40, 1, 36, '#a09888');
      h.rect(px + 1, py - 36, 15, 2, '#5c544c'); h.px(px + 2, py - 37, '#c8c8d0'); h.px(px + 14, py - 37, '#c8c8d0');
    }
  });
  def('postbox', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 3, py + 12, 11, 3);
      box(D.low, px + 3, py - 2, 10, 15, '#c83030', 3);
      D.low.rect(px + 5, py + 3, 6, 1, '#401010');
      D.high.rect(px + 2, py - 4, 12, 3, '#a02020'); D.high.rect(px + 2, py - 4, 12, 1, '#e05050');
    }
  });
  def('trash', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 3, py + 12, 10, 3);
      box(D.low, px + 4, py + 2, 8, 11, '#4c6c9c', 2);
      D.low.rect(px + 5, py + 6, 6, 1, '#384c70');
    }
  });
  def('busstop', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 3, py + 12, 10, 3);
      D.low.rect(px + 4, py + 11, 8, 3, '#585868');
      D.low.rect(px + 7, py - 6, 2, 18, '#9898a8');
      var h = D.high;
      h.rect(px + 7, py - 14, 2, 8, '#9898a8');
      disc(h, px + 8, py - 18, 5, P.ramp('#e8e8f0'), false);
      h.rect(px + 5, py - 19, 7, 2, '#3858b0');
    }
  });
  def('phone', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 12, 15, 4);
      box(D.low, px + 1, py - 4, 14, 17, '#38a058', 2);
      D.low.rect(px + 3, py - 1, 10, 11, '#a8d8b8'); D.low.rect(px + 6, py + 2, 4, 5, '#286840');
      box(D.high, px + 1, py - 12, 14, 8, '#38a058', 2);
    },
    lights: function (o, px, py) { return [{ x: px + 8, y: py, r: 18, c: '#d8f8e0' }]; }
  });
  def('barrier', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 12, 15, 3);
      D.low.rect(px + 2, py + 6, 2, 8, '#d0d0d8'); D.low.rect(px + 12, py + 6, 2, 8, '#d0d0d8');
      for (var i = 0; i < 16; i++) D.low.rect(px + i, py + 1, 1, 5, ((i >> 1) & 1) ? '#f8f8f8' : '#e03030');
      D.low.rect(px, py + 6, 16, 1, '#702020');
    },
    lights: function (o, px, py) { return o.blink ? [{ x: px + 8, y: py + 2, r: 10, c: '#f86040' }] : []; }
  });
  def('cone', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 3, py + 12, 10, 3);
      D.low.rect(px + 3, py + 12, 10, 2, '#c84818');
      for (var y = 0; y < 12; y++) {
        var w = 1 + (y >> 1);
        D.low.rect(px + 8 - w, py + y, w * 2, 1, (y > 4 && y < 7) ? '#f0f0f0' : '#f06828');
      }
    }
  });
  def('drum', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 2, py + 12, 13, 3);
      box(D.low, px + 3, py, 10, 13, o.c || '#3868a8', 3);
      D.low.rect(px + 3, py + 5, 10, 1, '#203858'); D.low.rect(px + 3, py + 9, 10, 1, '#203858');
    }
  });
  def('tires', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 12, 15, 3);
      for (var i = 0; i < 3; i++) {
        var y = py + 9 - i * 5;
        D.low.rect(px + 2, y, 12, 5, '#202024'); D.low.rect(px + 2, y, 12, 1, '#404048'); D.low.rect(px + 5, y + 1, 6, 2, '#101014');
      }
    }
  });
  def('crate', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 12, 15, 3);
      box(D.low, px + 1, py, 14, 13, '#a87c48', 3);
      D.low.rect(px + 1, py + 7, 14, 1, '#6c4c28'); D.low.rect(px + 7, py + 3, 1, 10, '#6c4c28');
    }
  });
  def('lantern', { // 石灯籠
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 2, py + 12, 12, 3);
      box(D.low, px + 4, py + 6, 8, 7, '#8c8c98', 1);
      box(D.low, px + 6, py - 2, 4, 8, '#8c8c98', 1);
      box(D.high, px + 3, py - 8, 10, 6, '#9c9ca8', 1);
      D.high.rect(px + 5, py - 6, 6, 3, '#f8d878');
      box(D.high, px + 2, py - 11, 12, 3, '#7c7c88', 1);
    },
    lights: function (o, px, py) { return [{ x: px + 8, y: py - 5, r: 22, c: '#f8c070' }]; }
  });
  def('torii', {
    size: function () { return [4, 1]; },
    solid: function () { return [[0, 0], [3, 0]]; },
    draw: function (D, o, px, py) {
      var red = P.ramp('#c83828');
      [px + 5, px + 53].forEach(function (x) {
        D.low.rect(x, py - 2, 6, 15, red.base); D.low.rect(x, py - 2, 2, 15, red.lt); D.low.rect(x + 5, py - 2, 1, 15, red.sh);
        D.low.rect(x - 1, py + 11, 8, 3, '#303038');
        D.high.rect(x, py - 36, 6, 34, red.base); D.high.rect(x, py - 36, 2, 34, red.lt); D.high.rect(x + 5, py - 36, 1, 34, red.sh);
      });
      D.high.rect(px - 2, py - 44, 68, 5, '#282830'); D.high.rect(px - 2, py - 44, 68, 1, '#484858');
      D.high.rect(px + 1, py - 39, 62, 4, red.base); D.high.rect(px + 1, py - 39, 62, 1, red.lt);
      D.high.rect(px + 3, py - 30, 58, 3, red.base); D.high.rect(px + 3, py - 30, 58, 1, red.lt);
      D.high.rect(px + 29, py - 35, 6, 5, '#282830');
    }
  });
  def('pump', { // 給油機
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 12, 15, 4);
      box(D.low, px + 2, py - 2, 12, 15, '#e8e8f0', 2);
      D.low.rect(px + 4, py + 1, 8, 5, '#203040'); D.low.rect(px + 5, py + 2, 5, 1, '#48e080');
      D.low.rect(px + 2, py + 8, 12, 3, '#d83030');
      box(D.high, px + 2, py - 9, 12, 7, '#d83030', 2);
    },
    lights: function (o, px, py) { return [{ x: px + 8, y: py, r: 16, c: '#e0f0ff' }]; }
  });
  def('canopy', { // ガソリンスタンドの屋根（当たり判定なし、手前に描く）
    size: function (o) { return [o.w, o.h]; },
    solid: function () { return []; },
    draw: function (D, o, px, py) {
      var w = o.w * TS, h = 14;
      var y = py - 18;
      D.high.rect(px, y, w, h, '#e8e8f0'); D.high.rect(px, y, w, 2, '#ffffff');
      D.high.rect(px, y + 4, w, 4, '#d83030'); D.high.rect(px, y + h - 2, w, 2, '#9898a8');
      for (var i = 0; i < o.w; i += 3) D.high.rect(px + i * TS + 6, y + h, 4, 2, '#fff8e0');
    },
    lights: function (o, px, py) {
      var out = [];
      for (var i = 0; i < o.w; i += 3) out.push({ x: px + i * TS + 8, y: py + 8, r: 44, c: '#f0f4ff' });
      return out;
    }
  });
  def('flowerbed', {
    size: function () { return [2, 1]; },
    draw: function (D, o, px, py) {
      box(D.low, px + 1, py + 6, 30, 8, '#9c8c7c', 2);
      var rnd = U.rng(px + py * 7);
      for (var i = 0; i < 14; i++) {
        var x = px + 3 + Math.floor(rnd() * 26), y = py + 2 + Math.floor(rnd() * 6);
        D.low.px(x, y + 1, '#307838'); D.low.px(x, y, ['#f87888', '#f8e060', '#f8f8f8', '#b088f0'][i % 4]);
      }
    }
  });
  def('statue', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 12, 15, 4);
      box(D.low, px + 2, py + 4, 12, 9, '#8c8c98', 2);
      box(D.high, px + 5, py - 10, 6, 14, '#a8a8b4', 2);
      disc(D.high, px + 8, py - 13, 3, P.ramp('#a8a8b4'), false);
    }
  });
  def('fountain', {
    size: function () { return [2, 2]; },
    draw: function (D, o, px, py) {
      disc(D.low, px + 16, py + 16, 14, P.ramp('#a0a0b0'), false);
      disc(D.low, px + 16, py + 16, 11, { hi: '#68a0d8', lt: '#4880c0', base: '#3868a8', sh: '#284c88', dk: '#183060' }, false);
      box(D.low, px + 13, py + 6, 6, 12, '#b0b0c0', 2);
      D.high.rect(px + 15, py - 2, 2, 8, '#a8d0f8'); D.high.px(px + 14, py - 3, '#d8f0ff'); D.high.px(px + 17, py - 3, '#d8f0ff');
    }
  });
  def('rocks', {
    draw: function (D, o, px, py) {
      groundShadow(D.low, px + 1, py + 11, 14, 4);
      disc(D.low, px + 6, py + 9, 5, P.ramp('#8c8070'), false);
      disc(D.low, px + 11, py + 10, 4, P.ramp('#7c7060'), false);
    }
  });
  def('wire_gate', { // 旧道の封鎖ゲート
    size: function () { return [3, 1]; },
    draw: function (D, o, px, py) {
      D.low.rect(px + 2, py - 6, 3, 20, '#707480'); D.low.rect(px + 43, py - 6, 3, 20, '#707480');
      for (var x = 5; x < 43; x += 3) for (var y = -4; y < 12; y += 3) { D.low.px(px + x, py + y, '#9ca0b0'); D.low.px(px + x + 1, py + y + 1, '#9ca0b0'); }
      D.low.rect(px + 5, py - 5, 38, 1, '#9ca0b0'); D.low.rect(px + 5, py + 12, 38, 1, '#9ca0b0');
      box(D.low, px + 16, py, 16, 9, '#f0e040', 1);
      D.low.rect(px + 18, py + 3, 12, 2, '#202020');
    }
  });

  // ---------- 屋内 ----------
  function furn(type, w, h, drawFn, extra) {
    var o = { size: function () { return [w, h]; }, draw: drawFn };
    if (extra) for (var k in extra) o[k] = extra[k];
    def(type, o);
  }
  furn('counter', 3, 1, function (D, o, px, py) {
    var c = o.c || '#8c5c34';
    box(D.low, px, py - 4, 48, 17, c, 5);
    D.low.rect(px, py + 12, 48, 1, '#201410');
    if (o.register) { box(D.low, px + 30, py - 12, 12, 9, '#383840', 3); D.low.rect(px + 32, py - 10, 8, 2, '#40e080'); }
  });
  furn('counter1', 1, 1, function (D, o, px, py) {
    box(D.low, px, py - 4, 16, 17, o.c || '#8c5c34', 5);
  });
  furn('shelf', 2, 1, function (D, o, px, py) {
    var c = o.c || '#a07850';
    box(D.low, px + 1, py - 14, 30, 27, c, 2);
    var cols = o.goods || ['#e85848', '#48a8e8', '#f8c838', '#58c858', '#f8f8f8', '#c868c8'];
    for (var r = 0; r < 3; r++) {
      var y = py - 11 + r * 8;
      D.low.rect(px + 3, y + 6, 26, 1, P.shade(c, -0.4));
      for (var i = 0; i < 6; i++) D.low.rect(px + 4 + i * 4, y + 1 + (i % 2), 3, 5 - (i % 2), cols[(i + r * 2) % cols.length]);
    }
  });
  furn('fridge_case', 2, 1, function (D, o, px, py) { // 冷蔵ケース
    box(D.low, px + 1, py - 14, 30, 27, '#d8dce8', 2);
    D.low.rect(px + 3, py - 11, 26, 20, '#a8d0f0');
    for (var r = 0; r < 3; r++) for (var i = 0; i < 6; i++) D.low.rect(px + 4 + i * 4, py - 10 + r * 7, 3, 5, ['#e85848', '#f8f8f8', '#48a868', '#f8c838'][(i + r) % 4]);
    D.low.rect(px + 15, py - 11, 1, 20, '#e8ecf8');
  }, { lights: function (o, px, py) { return [{ x: px + 16, y: py - 2, r: 20, c: '#e0f0ff' }]; } });
  furn('table', 2, 1, function (D, o, px, py) {
    groundShadow(D.low, px + 2, py + 10, 28, 4);
    D.low.rect(px + 3, py + 4, 2, 9, '#5c3818'); D.low.rect(px + 27, py + 4, 2, 9, '#5c3818');
    box(D.low, px + 1, py - 2, 30, 8, o.c || '#a87040', 3);
    if (o.bowl) { disc(D.low, px + 10, py + 1, 3, P.ramp('#f0f0f0'), false); disc(D.low, px + 22, py + 1, 3, P.ramp('#f0f0f0'), false); }
  });
  furn('table1', 1, 1, function (D, o, px, py) {
    groundShadow(D.low, px + 2, py + 10, 12, 4);
    D.low.rect(px + 7, py + 4, 2, 9, '#5c3818');
    box(D.low, px + 1, py - 2, 14, 7, o.c || '#a87040', 3);
  });
  furn('stool', 1, 1, function (D, o, px, py) {
    D.low.rect(px + 7, py + 4, 2, 9, '#707080');
    disc(D.low, px + 8, py + 3, 4, P.ramp(o.c || '#c83838'), false);
  }, { solid: function () { return []; } });
  furn('chair', 1, 1, function (D, o, px, py) {
    box(D.low, px + 3, py - 4, 10, 6, o.c || '#8c5c34', 2);
    box(D.low, px + 3, py + 3, 10, 6, o.c || '#8c5c34', 2);
    D.low.rect(px + 4, py + 9, 2, 4, '#4c2c14'); D.low.rect(px + 10, py + 9, 2, 4, '#4c2c14');
  });
  furn('bed', 1, 2, function (D, o, px, py) {
    box(D.low, px, py - 2, 16, 33, '#7c5030', 3);
    D.low.rect(px + 1, py + 1, 14, 28, '#f0f0f8');
    D.low.rect(px + 1, py + 10, 14, 19, o.c || '#4868b8'); D.low.rect(px + 1, py + 10, 14, 2, P.shade(o.c || '#4868b8', 0.3));
    box(D.low, px + 3, py + 2, 10, 6, '#ffffff', 2);
  });
  furn('tv', 1, 1, function (D, o, px, py) {
    box(D.low, px + 1, py + 2, 14, 11, '#5c3c24', 2);
    box(D.low, px + 1, py - 9, 14, 11, '#282830', 2);
    D.low.rect(px + 3, py - 7, 10, 7, '#4878c8'); D.low.rect(px + 4, py - 6, 3, 1, '#a8d0f8');
  }, { lights: function (o, px, py) { return [{ x: px + 8, y: py - 3, r: 18, c: '#b0d0ff' }]; } });
  furn('sofa', 2, 1, function (D, o, px, py) {
    var c = o.c || '#a04848';
    groundShadow(D.low, px + 1, py + 11, 30, 4);
    box(D.low, px + 1, py - 6, 30, 10, c, 2);
    box(D.low, px + 1, py + 2, 30, 10, c, 3);
    box(D.low, px, py - 2, 4, 14, P.shade(c, -0.15), 2); box(D.low, px + 28, py - 2, 4, 14, P.shade(c, -0.15), 2);
  });
  furn('plant', 1, 1, function (D, o, px, py) {
    groundShadow(D.low, px + 3, py + 12, 10, 3);
    box(D.low, px + 4, py + 5, 8, 8, '#a85c38', 2);
    var r = P.ramp('#3c8c44');
    disc(D.low, px + 8, py + 1, 5, r, true);
    disc(D.high, px + 6, py - 4, 3, r, false); disc(D.high, px + 10, py - 5, 3, r, false);
  });
  furn('bookshelf', 1, 1, function (D, o, px, py) {
    box(D.low, px + 1, py - 14, 14, 27, '#7c5030', 2);
    for (var r = 0; r < 3; r++) for (var i = 0; i < 5; i++) D.low.rect(px + 3 + i * 2, py - 11 + r * 8, 2, 6, ['#c84040', '#4060c0', '#40a060', '#e0b040', '#8848a8'][(i + r * 2) % 5]);
  });
  furn('desk', 2, 1, function (D, o, px, py) {
    box(D.low, px + 1, py - 4, 30, 10, '#8c6440', 3);
    D.low.rect(px + 3, py + 6, 2, 7, '#5c3818'); D.low.rect(px + 27, py + 6, 2, 7, '#5c3818');
    if (o.pc) { box(D.low, px + 6, py - 14, 12, 10, '#d0d0d8', 2); D.low.rect(px + 8, py - 12, 8, 6, '#3878c0'); }
  });
  furn('stove', 2, 1, function (D, o, px, py) { // ラーメン屋の厨房
    box(D.low, px + 1, py - 6, 30, 19, '#b8bcc8', 4);
    disc(D.low, px + 9, py - 4, 5, P.ramp('#808490'), false); disc(D.low, px + 23, py - 4, 5, P.ramp('#808490'), false);
    D.low.rect(px + 6, py - 5, 6, 2, '#f0f0f0');
  }, { lights: function (o, px, py) { return [{ x: px + 16, y: py - 6, r: 16, c: '#f8b060' }]; } });
  furn('lift', 3, 2, function (D, o, px, py) { // 整備リフト
    D.low.rect(px + 2, py + 4, 44, 24, '#4c4c58');
    D.low.rect(px + 4, py + 6, 6, 20, '#d8c040'); D.low.rect(px + 38, py + 6, 6, 20, '#d8c040');
    for (var y = 6; y < 26; y += 4) { D.low.rect(px + 4, py + y, 6, 1, '#202020'); D.low.rect(px + 38, py + y, 6, 1, '#202020'); }
  }, { solid: function () { return []; } });
  furn('toolbox', 1, 1, function (D, o, px, py) {
    box(D.low, px + 1, py - 4, 14, 17, '#c83030', 2);
    for (var i = 0; i < 3; i++) { D.low.rect(px + 2, py - 1 + i * 5, 12, 1, '#781818'); D.low.rect(px + 6, py + 1 + i * 5, 4, 1, '#d0d0d8'); }
  });
  furn('partsrack', 2, 1, function (D, o, px, py) {
    box(D.low, px + 1, py - 14, 30, 27, '#707488', 2);
    for (var r = 0; r < 3; r++) {
      var y = py - 11 + r * 8;
      D.low.rect(px + 3, y + 6, 26, 1, '#383848');
      D.low.rect(px + 4, y, 6, 6, '#202024'); D.low.rect(px + 6, y + 2, 2, 2, '#808088');
      box(D.low, px + 12, y + 1, 7, 5, ['#d83030', '#3060c8', '#e0b030'][r], 1);
      D.low.rect(px + 21, y + 2, 7, 3, '#c0c4d0');
    }
  });
  furn('poster', 1, 1, function (D, o, px, py) {
    var c = o.c || '#e85848';
    if (o.sticker) {
      D.low.rect(px + 2, py + 4, 12, 7, '#181820'); D.low.rect(px + 3, py + 5, 10, 5, '#c83850');
      D.low.rect(px + 4, py + 6, 3, 1, '#f8f8f8'); D.low.rect(px + 8, py + 6, 4, 1, '#f8f8f8'); D.low.rect(px + 4, py + 8, 7, 1, '#f8f8f8');
      return;
    }
    D.low.rect(px + 2, py + 1, 12, 13, '#f0f0f0');
    D.low.rect(px + 3, py + 2, 10, 8, c);
    D.low.rect(px + 4, py + 6, 8, 3, '#202028'); D.low.rect(px + 5, py + 5, 5, 1, '#202028');
    D.low.rect(px + 3, py + 11, 10, 1, '#808088');
  }, { solid: function () { return []; }, wall: true });
  furn('window_in', 1, 1, function (D, o, px, py) {
    D.low.rect(px + 1, py + 1, 14, 11, '#e8ecf4');
    D.low.rect(px + 2, py + 2, 12, 9, '#182448');
    D.low.px(px + 4, py + 4, '#f8f8d0'); D.low.px(px + 10, py + 3, '#f8f8d0'); D.low.px(px + 7, py + 7, '#f8f8d0');
    D.low.rect(px + 7, py + 2, 1, 9, '#e8ecf4');
  }, { solid: function () { return []; }, wall: true });
  furn('clock', 1, 1, function (D, o, px, py) {
    disc(D.low, px + 8, py + 6, 5, P.ramp('#d8b070'), false);
    disc(D.low, px + 8, py + 6, 3, P.ramp('#f8f8f0'), false);
    D.low.rect(px + 8, py + 3, 1, 3, '#202020'); D.low.rect(px + 8, py + 6, 2, 1, '#202020');
  }, { solid: function () { return []; }, wall: true });
  furn('fridge', 1, 1, function (D, o, px, py) {
    box(D.low, px + 1, py - 14, 14, 27, '#e8ecf4', 2);
    D.low.rect(px + 1, py - 4, 14, 1, '#9ca0b0'); D.low.rect(px + 12, py - 10, 1, 4, '#9ca0b0');
  });
  furn('kitchen', 2, 1, function (D, o, px, py) {
    box(D.low, px, py - 6, 32, 19, '#e0e0e8', 4);
    D.low.rect(px + 4, py - 5, 10, 3, '#9ca0b0'); disc(D.low, px + 24, py - 4, 3, P.ramp('#606070'), false);
  });
  furn('rug', 2, 2, function (D, o, px, py) {
    var c = P.ramp(o.c || '#c05050');
    D.low.rect(px + 2, py + 2, 28, 28, c.base); D.low.rect(px + 4, py + 4, 24, 24, c.lt); D.low.rect(px + 6, py + 6, 20, 20, c.base);
    for (var i = 0; i < 28; i += 3) { D.low.px(px + 2 + i, py + 1, c.sh); D.low.px(px + 2 + i, py + 30, c.sh); }
  }, { solid: function () { return []; }, floor: true });
  furn('lamp_in', 1, 1, function (D, o, px, py) {
    D.low.rect(px + 7, py - 2, 2, 14, '#606070'); D.low.rect(px + 4, py + 11, 8, 2, '#404050');
    D.high.rect(px + 3, py - 10, 10, 8, '#f8e0a0'); D.high.rect(px + 3, py - 10, 10, 1, '#fff8d0'); D.high.rect(px + 3, py - 3, 10, 1, '#c8a060');
  }, { lights: function (o, px, py) { return [{ x: px + 8, y: py - 6, r: 30, c: '#f8d890' }]; } });
  furn('arcade', 1, 1, function (D, o, px, py) {
    box(D.low, px + 1, py - 12, 14, 25, '#3040a0', 2);
    D.low.rect(px + 3, py - 9, 10, 8, '#101018'); D.low.rect(px + 4, py - 8, 8, 6, ['#e04040', '#40c060', '#4080e0'][(px >> 4) % 3]);
    D.low.rect(px + 3, py + 1, 10, 3, '#202028'); D.low.px(px + 5, py + 2, '#f8e040'); D.low.px(px + 10, py + 2, '#e04040');
  }, { lights: function (o, px, py) { return [{ x: px + 8, y: py - 5, r: 18, c: '#c0a0ff' }]; } });
  furn('pot', 1, 1, function (D, o, px, py) { // 寸胴
    box(D.low, px + 2, py - 2, 12, 14, '#b8bcc8', 3);
    D.low.rect(px + 3, py - 4, 10, 2, '#e8e8f0');
  });

  furn('trophy', 1, 1, function (D, o, px, py) {
    var r = P.ramp(o.c || '#d0a030');
    box(D.low, px + 2, py + 6, 12, 7, '#5c3818', 2);
    D.low.rect(px + 7, py + 1, 2, 5, r.sh);
    var big = o.big ? 1 : 0;
    D.high.rect(px + 4 - big, py - 7 - big, 8 + big * 2, 6 + big, r.base);
    D.high.rect(px + 4 - big, py - 7 - big, 2, 6 + big, r.hi);
    D.high.rect(px + 2 - big, py - 6, 2, 3, r.sh); D.high.rect(px + 12 + big, py - 6, 2, 3, r.sh);
    D.low.rect(px + 5, py, 6, 2, r.base);
  }, { lights: function (o, px, py) { return o.big ? [{ x: px + 8, y: py - 4, r: 16, c: '#f8e0a0' }] : []; } });
  furn('helmet', 1, 1, function (D, o, px, py) {
    box(D.low, px + 2, py + 6, 12, 7, '#5c3818', 2);
    disc(D.high, px + 8, py + 0, 6, P.ramp('#f0f0f8'), false);
    D.high.rect(px + 4, py + 0, 9, 3, '#283048'); D.high.rect(px + 5, py, 3, 1, '#6880b0');
    D.high.rect(px + 2, py - 3, 12, 1, '#c83838');
  });
  furn('photo', 1, 1, function (D, o, px, py) {
    D.low.rect(px + 2, py + 2, 12, 10, '#7c5030'); D.low.rect(px + 3, py + 3, 10, 8, '#f8c890');
    D.low.rect(px + 3, py + 8, 10, 3, '#5c4870'); D.low.px(px + 5, py + 7, '#202028'); D.low.px(px + 8, py + 7, '#202028'); D.low.px(px + 11, py + 7, '#202028');
  }, { solid: function () { return []; }, wall: true });
  furn('neon', 1, 1, function (D, o, px, py) {
    D.low.rect(px + 1, py + 2, 14, 10, '#181020');
    D.low.rect(px + 2, py + 4, 4, 1, '#f848a0'); D.low.rect(px + 2, py + 4, 1, 6, '#f848a0'); D.low.rect(px + 2, py + 9, 4, 1, '#f848a0');
    D.low.rect(px + 8, py + 4, 1, 6, '#48f0f0'); D.low.rect(px + 8, py + 4, 5, 1, '#48f0f0'); D.low.rect(px + 12, py + 4, 1, 6, '#48f0f0');
  }, { solid: function () { return []; }, wall: true, lights: function (o, px, py) { return [{ x: px + 8, y: py + 8, r: 22, c: '#f070c0', flicker: true }]; } });
  furn('aquarium', 1, 1, function (D, o, px, py) {
    box(D.low, px + 1, py + 4, 14, 9, '#383848', 2);
    D.low.rect(px + 2, py - 6, 12, 10, '#2858a0'); D.low.rect(px + 2, py - 6, 12, 2, '#a0d0f8');
    D.low.px(px + 5, py - 2, '#f88838'); D.low.px(px + 6, py - 2, '#f88838'); D.low.px(px + 10, py + 0, '#f8e040'); D.low.rect(px + 3, py + 1, 1, 3, '#40a060'); D.low.rect(px + 12, py, 1, 4, '#40a060');
  }, { lights: function (o, px, py) { return [{ x: px + 8, y: py - 2, r: 18, c: '#80c0f8' }]; } });
  furn('kotatsu', 2, 1, function (D, o, px, py) {
    groundShadow(D.low, px + 1, py + 10, 30, 4);
    D.low.rect(px + 1, py - 1, 30, 14, '#b84848'); D.low.rect(px + 1, py - 1, 30, 2, '#d86868');
    for (var i = 0; i < 30; i += 4) D.low.rect(px + 1 + i, py + 4, 2, 9, '#a03838');
    box(D.low, px + 3, py - 4, 26, 6, '#a87040', 2);
    disc(D.low, px + 20, py - 2, 2, P.ramp('#f8a030'), false);
  });

  // 家具配置用のアイテム（家の模様替え）も同じ描画を使う
  Props.drawIcon = function (g, type, o, x, y) {
    var d = Props.defs[type];
    if (!d) return;
    var sz = d.size(o || {});
    var c = U.canvas(sz[0] * TS + 16, sz[1] * TS + 24);
    var D = { low: L(c.g), high: L(c.g) };
    d.draw(D, o || {}, 8, 20);
    g.drawImage(c, Math.round(x - 8), Math.round(y - 20));
  };
})();
