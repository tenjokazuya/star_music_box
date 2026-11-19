/* 人物スプライト生成（16x24, 下/上/右/左 × 立ち/歩き2コマ） */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, P = RR.Pal;
  var W = 16, H = 24;
  var DIRS = ['down', 'up', 'right', 'left'];
  var cache = {};

  // look: {skin, hair, hairC, top, bottom, shoes, extra:[...], style}
  function build(look) {
    var key = JSON.stringify(look);
    if (cache[key]) return cache[key];
    var sheet = U.canvas(W * 3, H * 4);
    for (var di = 0; di < 3; di++) {
      for (var f = 0; f < 3; f++) {
        var p = new RR.Painter(W, H);
        drawPerson(p, look, DIRS[di], f);
        p.outline(0.3);
        sheet.g.drawImage(p.c, f * W, di * H);
      }
    }
    // 左向き = 右向きの反転
    for (f = 0; f < 3; f++) {
      var fl = RR.Painter.flipX(sheet, f * W, 2 * H, W, H);
      sheet.g.drawImage(fl, f * W, 3 * H);
    }
    var spr = { sheet: sheet, w: W, h: H };
    cache[key] = spr;
    return spr;
  }

  function cols(look) {
    var skin = P.C.skin[look.skin || 'light'] || look.skin;
    var hair = P.C.hair[look.hairC || 'black'] || look.hairC;
    return {
      S: skin, s: P.shade(skin, -0.22), ss: P.shade(skin, -0.4),
      H: hair, h: P.shade(hair, -0.35), i: P.shade(hair, 0.35),
      C: look.top || '#3858b0', c: P.shade(look.top || '#3858b0', -0.3), D: P.shade(look.top || '#3858b0', 0.25),
      P: look.bottom || '#383848', p: P.shade(look.bottom || '#383848', -0.3),
      K: look.shoes || '#302028', k: P.shade(look.shoes || '#302028', 0.3),
      E: '#201828', W: '#f8f8f8', M: P.shade(skin, -0.35),
      A: look.accent || '#f8f8f8', a: P.shade(look.accent || '#f8f8f8', -0.25)
    };
  }

  function drawPerson(p, look, dir, f) {
    var c = cols(look);
    var ex = look.extra || [];
    var bob = (f === 0) ? 0 : 1; // 歩きコマで1px沈む
    var tall = look.kid ? 2 : 0;  // 子供は低い
    var oy = bob + tall;
    if (dir === 'down') front(p, c, look, ex, f, oy);
    else if (dir === 'up') back(p, c, look, ex, f, oy);
    else side(p, c, look, ex, f, oy);
  }

  // ---- 共通パーツ ----
  function legsFront(p, c, f, oy, look) {
    var dress = look.style === 'dress';
    var y0 = 18 + oy;
    if (dress) {
      p.span(y0 - 1, 4, 11, c.C); p.span(y0, 4, 11, c.c);
      p.px(4, y0 - 1, c.D);
    }
    // 左脚(画面左) / 右脚
    var lUp = f === 1 ? 1 : 0, rUp = f === 2 ? 1 : 0;
    var lenBase = 21 + (look.kid ? 0 : 0);
    // 左
    p.rect(5, y0, 3, 3 - lUp, dress ? c.S : c.P);
    p.px(7, y0, dress ? c.s : c.p);
    p.rect(5, y0 + 3 - lUp, 3, 1, c.K);
    p.px(5, y0 + 3 - lUp, c.k);
    // 右
    p.rect(8, y0, 3, 3 - rUp, dress ? c.s : c.p);
    p.rect(8, y0 + 3 - rUp, 3, 1, c.K);
  }
  function torsoFront(p, c, look, ex, f, oy) {
    var y = 12 + oy;
    var jacket = look.style === 'jacket' || look.style === 'coat';
    // 首
    p.span(y, 6, 9, c.s);
    // 胴
    for (var r = 1; r <= 5; r++) {
      p.span(y + r, 4, 11, c.C);
      p.px(4, y + r, c.D);
      p.px(11, y + r, c.c);
      p.px(10, y + r, c.c);
    }
    p.span(y + 1, 5, 10, c.C);
    if (jacket) {
      p.vspan(7, y + 1, y + 5, c.A); p.vspan(8, y + 1, y + 5, c.a);
      p.px(6, y + 1, c.c); p.px(9, y + 1, c.c);
    } else if (look.style !== 'dress') {
      p.span(y + 1, 6, 9, c.D); // 襟
      p.px(7, y + 1, c.s); p.px(8, y + 1, c.s);
    }
    if (look.style === 'coat') { p.span(y + 6, 4, 11, c.C); p.px(11, y + 6, c.c); }
    if (ex.indexOf('apron') >= 0) {
      p.rect(5, y + 2, 6, 5, c.A); p.vspan(10, y + 2, y + 6, c.a);
    }
    // ベルト
    if (look.style !== 'dress' && look.style !== 'coat') p.span(y + 5, 5, 10, c.p);
    // 腕（歩きで振る）
    var swing = f === 1 ? -1 : f === 2 ? 1 : 0;
    p.vspan(3, y + 1, y + 4 + swing, c.C); p.px(3, y + 5 + swing, c.S);
    p.vspan(12, y + 1, y + 4 - swing, c.c); p.px(12, y + 5 - swing, c.s);
  }
  function headFront(p, c, look, ex, oy) {
    var y = oy;
    // 顔
    p.span(y + 4, 4, 11, c.S);
    for (var r = 5; r <= 9; r++) p.span(y + r, 3, 12, c.S);
    p.span(y + 10, 4, 11, c.S);
    p.span(y + 11, 5, 10, c.s);
    p.vspan(12, y + 5, y + 9, c.s);
    p.px(11, y + 10, c.s);
    // 目
    var eyeY = y + 7;
    if (look.eyes === 'closed') { p.span(eyeY + 1, 5, 6, c.E); p.span(eyeY + 1, 9, 10, c.E); }
    else {
      p.rect(5, eyeY, 2, 2, c.E); p.rect(9, eyeY, 2, 2, c.E);
      p.px(5, eyeY, c.W); p.px(9, eyeY, c.W);
    }
    // 頬と口
    if (look.blush) { p.px(4, y + 9, '#f09090'); p.px(11, y + 9, '#f09090'); }
    p.span(y + 10, 7, 8, c.M);
    if (ex.indexOf('beard') >= 0) { p.span(y + 10, 5, 10, c.h); p.span(y + 11, 6, 9, c.h); }
    if (ex.indexOf('glasses') >= 0) {
      p.span(eyeY - 1, 4, 7, '#283040'); p.span(eyeY - 1, 8, 11, '#283040');
      p.px(4, eyeY, '#283040'); p.px(7, eyeY, '#283040'); p.px(8, eyeY, '#283040'); p.px(11, eyeY, '#283040');
      p.px(6, eyeY, '#a0c8f0'); p.px(10, eyeY, '#a0c8f0');
    }
    hairFront(p, c, look, ex, y);
  }
  function hairFront(p, c, look, ex, y) {
    var st = look.hair || 'short';
    if (st === 'bald') {
      p.span(y + 2, 5, 10, c.S); p.span(y + 3, 4, 11, c.S); p.px(5, y + 2, P.shade(c.S, 0.3));
      p.vspan(3, y + 5, y + 7, c.H); p.vspan(12, y + 5, y + 7, c.h);
      return;
    }
    // 頭頂
    p.span(y + 1, 5, 10, c.H);
    p.span(y + 2, 4, 11, c.H);
    p.span(y + 3, 3, 12, c.H);
    p.span(y + 4, 3, 12, c.H);
    p.px(5, y + 2, c.i); p.px(6, y + 2, c.i); p.px(4, y + 3, c.i);
    p.px(11, y + 3, c.h); p.px(12, y + 4, c.h);
    if (st === 'spiky') {
      p.px(4, y, c.H); p.px(7, y, c.H); p.px(10, y, c.H); p.px(2, y + 3, c.H); p.px(13, y + 3, c.h);
      p.span(y + 5, 3, 12, c.H); p.px(5, y + 5, c.S); p.px(8, y + 5, c.S); p.px(10, y + 5, c.S);
      p.px(3, y + 6, c.H); p.px(12, y + 6, c.h);
    } else if (st === 'long' || st === 'pony' || st === 'bob') {
      p.span(y + 5, 3, 12, c.H);
      p.px(6, y + 5, c.S); p.px(7, y + 5, c.S); p.px(9, y + 5, c.S);
      var low = st === 'long' ? 14 : st === 'bob' ? 10 : 7;
      p.vspan(2, y + 4, y + low, c.H); p.vspan(3, y + 6, y + low - 1, c.H);
      p.vspan(13, y + 4, y + low, c.h); p.vspan(12, y + 6, y + low - 1, c.h);
      if (st === 'pony') { p.px(13, y + 2, c.H); p.px(14, y + 3, c.h); }
    } else if (st === 'cap') {
      p.span(y + 1, 4, 11, c.A); p.span(y + 2, 3, 12, c.A); p.span(y + 3, 3, 12, c.A);
      p.px(5, y + 2, P.shade(c.A, 0.3)); p.span(y + 3, 10, 12, c.a);
      p.span(y + 4, 2, 13, c.a); // つば
      p.span(y + 5, 3, 12, c.H); p.px(6, y + 5, c.S); p.px(7, y + 5, c.S); p.px(8, y + 5, c.S); p.px(9, y + 5, c.S);
    } else if (st === 'bun') {
      p.span(y - 1, 6, 9, c.H); p.span(y, 6, 9, c.H); p.px(7, y - 1, c.i);
      p.span(y + 5, 3, 12, c.H); p.px(5, y + 5, c.S); p.px(6, y + 5, c.S); p.px(9, y + 5, c.S); p.px(10, y + 5, c.S);
    } else if (st === 'old') {
      p.span(y + 1, 5, 10, c.S); p.span(y + 2, 5, 10, c.S); p.px(6, y + 1, P.shade(c.S, 0.3));
      p.span(y + 3, 3, 4, c.H); p.span(y + 3, 11, 12, c.H);
      p.vspan(3, y + 4, y + 7, c.H); p.vspan(12, y + 4, y + 7, c.h);
      p.span(y + 4, 5, 10, c.S);
    } else {
      // short
      p.span(y + 5, 3, 12, c.H);
      p.px(5, y + 5, c.S); p.px(6, y + 5, c.S); p.px(8, y + 5, c.S); p.px(9, y + 5, c.S); p.px(10, y + 5, c.S);
      p.px(3, y + 6, c.H); p.px(12, y + 6, c.h);
    }
    if (ex.indexOf('band') >= 0) { p.span(y + 4, 3, 12, c.A); p.px(12, y + 4, c.a); }
  }

  function front(p, c, look, ex, f, oy) {
    legsFront(p, c, f, oy, look);
    torsoFront(p, c, look, ex, f, oy);
    headFront(p, c, look, ex, oy);
  }

  function back(p, c, look, ex, f, oy) {
    legsFront(p, c, f === 1 ? 2 : f === 2 ? 1 : 0, oy, look);
    // 胴（背中）
    var y = 12 + oy;
    p.span(y, 6, 9, c.s);
    for (var r = 1; r <= 5; r++) { p.span(y + r, 4, 11, c.C); p.px(4, y + r, c.D); p.px(11, y + r, c.c); }
    if (look.style === 'coat') { p.span(y + 6, 4, 11, c.C); }
    if (look.style !== 'dress' && look.style !== 'coat') p.span(y + 5, 5, 10, c.p);
    if (ex.indexOf('apron') >= 0) p.span(y + 3, 4, 11, c.A);
    var swing = f === 1 ? 1 : f === 2 ? -1 : 0;
    p.vspan(3, y + 1, y + 4 + swing, c.C); p.px(3, y + 5 + swing, c.S);
    p.vspan(12, y + 1, y + 4 - swing, c.c); p.px(12, y + 5 - swing, c.s);
    // 頭（後ろ）
    var hy = oy, st = look.hair || 'short';
    for (var rr = 4; rr <= 9; rr++) p.span(hy + rr, 3, 12, c.S);
    p.span(hy + 10, 4, 11, c.s); p.span(hy + 11, 5, 10, c.s);
    if (st === 'bald' || st === 'old') {
      p.span(hy + 2, 5, 10, c.S); p.span(hy + 3, 4, 11, c.S);
      p.span(hy + 6, 3, 12, c.H); p.span(hy + 7, 3, 12, c.H); p.span(hy + 8, 4, 11, c.h);
      return;
    }
    p.span(hy + 1, 5, 10, c.H); p.span(hy + 2, 4, 11, c.H);
    for (rr = 3; rr <= 9; rr++) p.span(hy + rr, 3, 12, c.H);
    p.span(hy + 10, 4, 11, c.h);
    p.px(5, hy + 2, c.i); p.px(4, hy + 3, c.i); p.px(5, hy + 3, c.i);
    p.vspan(12, hy + 4, hy + 9, c.h);
    if (st === 'long') { p.span(hy + 11, 3, 12, c.H); p.span(hy + 12, 3, 12, c.H); p.span(hy + 13, 4, 11, c.h); }
    if (st === 'pony') { p.span(hy + 10, 6, 9, c.H); p.span(hy + 11, 6, 9, c.H); p.span(hy + 12, 7, 8, c.h); p.span(hy + 4, 6, 9, c.A); }
    if (st === 'bun') { p.span(hy - 1, 6, 9, c.H); p.span(hy, 6, 9, c.H); }
    if (st === 'spiky') { p.px(4, hy, c.H); p.px(7, hy, c.H); p.px(10, hy, c.H); p.px(2, hy + 4, c.H); p.px(13, hy + 4, c.h); }
    if (st === 'cap') {
      p.span(hy + 1, 4, 11, c.A); p.span(hy + 2, 3, 12, c.A); p.span(hy + 3, 3, 12, c.A); p.span(hy + 4, 3, 12, c.a);
    }
  }

  function side(p, c, look, ex, f, oy) {
    var y = 12 + oy;
    var dress = look.style === 'dress';
    // 脚（横向き）
    var y0 = 18 + oy;
    if (f === 0) {
      p.rect(6, y0, 3, 3, dress ? c.S : c.P); p.px(8, y0, c.p);
      p.rect(6, y0 + 3, 4, 1, c.K);
    } else {
      var a = f === 1 ? 1 : -1;
      // 前脚
      p.rect(7 + a, y0, 2, 3, dress ? c.S : c.P); p.rect(7 + a, y0 + 3, 3, 1, c.K);
      // 後脚
      p.rect(6 - a, y0, 2, 3, dress ? c.s : c.p); p.rect(5 - a, y0 + 3, 3, 1, c.k);
    }
    if (dress) { p.span(y0 - 1, 5, 10, c.C); p.span(y0, 5, 10, c.c); }
    // 胴
    p.span(y, 7, 9, c.s);
    for (var r = 1; r <= 5; r++) { p.span(y + r, 5, 10, c.C); p.px(10, y + r, c.D); p.px(5, y + r, c.c); }
    if (look.style === 'coat') p.span(y + 6, 5, 10, c.C);
    if (look.style === 'jacket' || look.style === 'coat') p.vspan(10, y + 1, y + 5, c.A);
    if (ex.indexOf('apron') >= 0) p.rect(9, y + 2, 2, 5, c.A);
    if (look.style !== 'dress' && look.style !== 'coat') p.span(y + 5, 5, 10, c.p);
    // 腕
    var sw = f === 1 ? 1 : f === 2 ? -1 : 0;
    p.vspan(7 + sw, y + 1, y + 4, c.c); p.px(7 + sw, y + 5, c.S);
    // 頭（右向き）
    var hy = oy;
    p.span(hy + 4, 4, 11, c.S);
    for (var rr = 5; rr <= 9; rr++) p.span(hy + rr, 3, 12, c.S);
    p.span(hy + 10, 4, 11, c.S); p.span(hy + 11, 5, 10, c.s);
    p.px(13, hy + 8, c.S); // 鼻
    p.vspan(3, hy + 5, hy + 9, c.s);
    // 目
    if (look.eyes === 'closed') p.span(hy + 8, 9, 10, c.E);
    else { p.rect(10, hy + 7, 2, 2, c.E); p.px(10, hy + 7, c.W); }
    p.px(11, hy + 10, c.M);
    if (ex.indexOf('beard') >= 0) { p.span(hy + 10, 8, 11, c.h); p.span(hy + 11, 8, 10, c.h); }
    if (ex.indexOf('glasses') >= 0) { p.span(hy + 6, 8, 12, '#283040'); p.px(12, hy + 7, '#283040'); p.px(11, hy + 7, '#a0c8f0'); }
    // 髪
    var st = look.hair || 'short';
    if (st === 'bald' || st === 'old') {
      p.span(hy + 2, 5, 10, c.S); p.span(hy + 3, 4, 11, c.S);
      p.rect(3, hy + 4, 4, 4, c.H); p.vspan(3, hy + 4, hy + 8, c.h);
      if (st === 'old') p.span(hy + 3, 3, 5, c.H);
      return;
    }
    p.span(hy + 1, 5, 10, c.H); p.span(hy + 2, 4, 11, c.H); p.span(hy + 3, 3, 12, c.H); p.span(hy + 4, 3, 12, c.H);
    p.span(hy + 5, 3, 7, c.H); p.px(11, hy + 5, c.H); p.px(12, hy + 5, c.H);
    p.rect(3, hy + 6, 4, 3, c.H); p.vspan(3, hy + 5, hy + 9, c.h);
    p.px(7, hy + 2, c.i); p.px(8, hy + 2, c.i); p.px(9, hy + 3, c.i);
    if (st === 'long') { p.rect(2, hy + 6, 5, 8, c.H); p.vspan(2, hy + 6, hy + 13, c.h); }
    if (st === 'bob') { p.rect(2, hy + 6, 5, 4, c.H); p.vspan(2, hy + 6, hy + 10, c.h); }
    if (st === 'pony') { p.rect(1, hy + 4, 2, 6, c.H); p.px(1, hy + 10, c.h); p.px(3, hy + 4, c.A); }
    if (st === 'bun') { p.rect(2, hy, 4, 3, c.H); }
    if (st === 'spiky') { p.px(5, hy, c.H); p.px(8, hy, c.H); p.px(2, hy + 2, c.H); p.px(1, hy + 4, c.h); p.px(11, hy + 1, c.H); }
    if (st === 'cap') {
      p.span(hy + 1, 4, 11, c.A); p.span(hy + 2, 3, 12, c.A); p.span(hy + 3, 3, 12, c.A);
      p.span(hy + 4, 8, 14, c.a); p.px(6, hy + 2, P.shade(c.A, 0.3));
    }
    if (ex.indexOf('band') >= 0) p.span(hy + 4, 3, 12, c.A);
  }

  var Sprites = RR.Sprites = RR.Sprites || {};
  Sprites.person = build;
  Sprites.DIRS = DIRS;
  // 描画: dir, frame(0..2)
  Sprites.drawPerson = function (g, spr, dir, frame, x, y) {
    var di = DIRS.indexOf(dir);
    if (di < 0) di = 0;
    g.drawImage(spr.sheet, frame * W, di * H, W, H, Math.round(x), Math.round(y), W, H);
  };

  // 影（足元の楕円）
  var shadowC = null;
  Sprites.shadow = function (g, x, y) {
    if (!shadowC) {
      shadowC = U.canvas(12, 4);
      shadowC.g.fillStyle = 'rgba(0,0,16,0.35)';
      shadowC.g.fillRect(2, 0, 8, 4); shadowC.g.fillRect(0, 1, 12, 2);
    }
    g.drawImage(shadowC, Math.round(x - 6), Math.round(y - 2));
  };
})();
