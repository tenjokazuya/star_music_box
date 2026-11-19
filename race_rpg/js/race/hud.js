/* レースHUD */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, C = RR.Course;
  var HUD = RR.RaceHUD = {};

  function box(g, x, y, w, h) {
    g.fillStyle = 'rgba(8,10,20,0.72)';
    g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2);
    g.fillStyle = 'rgba(160,170,210,0.35)';
    g.fillRect(x + 1, y, w - 2, 1);
  }
  HUD.box = box;

  // タイヤ温度の色: 冷=青緑 適温=緑 → 黄 → 橙 → 赤
  HUD.tempColor = function (sp, T) {
    var x = (T - sp.heatOpt) / sp.heatRange;
    if (x < -0.7) return '#3890b0';
    if (x < 0.35) return '#48d058';
    if (x < 0.6) return '#d8d040';
    if (x < 0.85) return '#e88830';
    return '#e83828';
  };

  HUD.draw = function (g, R) {
    var car = R.player, sp = car.sp;
    // ---- 速度・ギア・回転計 ----
    box(g, 2, 2, 86, 31);
    var kmh = Math.round(car.kmh());
    F.draw(g, U.pad(kmh, 3, ' '), 4, 4, '#f8f8f8', { scale: 2 });
    F.draw(g, 'KM/H', 43, 13, '#a8b0d0');
    var gear = car.reverse ? 'R' : String(car.gear);
    g.fillStyle = R.mt ? '#583818' : '#283058';
    g.fillRect(72, 4, 14, 17);
    F.draw(g, gear, 74, 4, car.shiftT > 0 ? '#f8e060' : '#f8f8f8', { scale: 2 });
    F.draw(g, R.mt ? 'MT' : 'AT', 72, 21, '#8890b0');
    // 回転計
    var segs = 16, frac = U.clamp(car.rpm / sp.redline, 0, 1.05);
    var lit = Math.round(frac * segs);
    var flash = frac > 0.93 && (RR.Game.frame >> 2) & 1;
    for (var i = 0; i < segs; i++) {
      var col = i < 9 ? '#48c858' : i < 13 ? '#e0d040' : '#e84030';
      if (i >= lit) col = '#283040';
      if (flash && i >= 13) col = '#ffffff';
      g.fillStyle = col;
      g.fillRect(6 + i * 4, 28 - Math.min(3, i >> 2), 3, 2 + Math.min(3, i >> 2));
    }
    if (R.mt && frac > 0.92) F.draw(g, 'R▲', 72, 21, '#f8e060');
    // ---- タイム・差 ----
    box(g, 168, 2, 70, 27);
    F.draw(g, U.time(R.time * 1000), 234, 4, '#f8f8f8', { align: 'right' });
    if (R.rival) {
      var gap = R.player.s - R.rival.car.s;
      var txt = (gap >= 0 ? '+' : '-') + Math.abs(Math.round(gap)) + 'M';
      F.draw(g, gap >= 0 ? 'リード' : 'ビハインド', 172, 16, gap >= 0 ? '#78e878' : '#f87868');
      F.draw(g, txt, 234, 16, gap >= 0 ? '#78e878' : '#f87868', { align: 'right' });
    } else if (R.cfg.target) {
      F.draw(g, 'もくひょう', 172, 16, '#a8b0d0');
      F.draw(g, U.time(R.cfg.target), 234, 16, '#f8e060', { align: 'right' });
    }
    // ---- 進捗バー ----
    var bx = 231, by = 34, bh = 92;
    box(g, bx - 3, by - 3, 11, bh + 6);
    g.fillStyle = '#404860'; g.fillRect(bx + 1, by, 3, bh);
    var c = R.course;
    var prog = function (s) { return by + bh - U.clamp((s - c.startS) / (c.finishS - c.startS), 0, 1) * bh; };
    g.fillStyle = '#f8f8f8'; g.fillRect(bx - 1, by - 1, 7, 2);
    if (R.rival) { var ry = Math.round(prog(R.rival.car.s)); g.fillStyle = '#5890f0'; g.fillRect(bx - 1, ry - 1, 7, 3); }
    var py = Math.round(prog(car.s)); g.fillStyle = '#f85048'; g.fillRect(bx - 2, py - 2, 9, 4); g.fillStyle = '#ffd0c8'; g.fillRect(bx - 1, py - 1, 7, 2);
    // ---- タイヤ（荷重=円の大きさ、温度=色） ----
    var tx = 4, ty = 104;
    box(g, tx - 2, ty - 2, 40, 54);
    // 車体
    g.fillStyle = '#384058'; g.fillRect(tx + 13, ty + 6, 10, 38);
    g.fillStyle = '#485070'; g.fillRect(tx + 14, ty + 7, 8, 36);
    g.fillStyle = '#202838'; g.fillRect(tx + 14, ty + 16, 8, 5);
    var pos = [[tx + 8, ty + 12], [tx + 28, ty + 12], [tx + 8, ty + 38], [tx + 28, ty + 38]];
    for (i = 0; i < 4; i++) {
      var load = car.Fz[i];
      var r = U.clamp(2 + load / 900, 2, 8);
      var tc = HUD.tempColor(sp, car.T[i]);
      circle(g, pos[i][0], pos[i][1], r, tc);
      if (car.slide[i] > 0.7 && (RR.Game.frame >> 1) & 1) ring(g, pos[i][0], pos[i][1], r + 1, '#ffffff');
    }
    F.draw(g, Math.round(Math.max(car.T[0], car.T[1])) + '', tx + 18, ty - 1, '#a8b0d0', { align: 'center' });
    F.draw(g, Math.round(Math.max(car.T[2], car.T[3])) + '', tx + 18, ty + 42, '#a8b0d0', { align: 'center' });
    // ---- コーナー予告 ----
    drawWarning(g, R);
  };

  function circle(g, cx, cy, r, col) {
    g.fillStyle = col;
    for (var y = -r; y <= r; y++) {
      var w = Math.floor(Math.sqrt(r * r - y * y + r * 0.5));
      g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(Math.round(cx - r / 2), Math.round(cy - r / 2), 2, 1);
  }
  function ring(g, cx, cy, r, col) {
    g.fillStyle = col;
    for (var a = 0; a < 24; a++) {
      var t = a / 24 * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 1, 1);
    }
  }

  // 先のコーナーを探して看板を出す
  function drawWarning(g, R) {
    var c = R.course, car = R.player;
    var best = null;
    for (var d = 25; d < 130; d += 4) {
      var s = car.s + d;
      if (s > c.finishS) break;
      var k = c.pts[C.idx(c, s)].k;
      if (Math.abs(k) > 1 / 48) { best = { d: d, k: k }; break; }
    }
    if (!best) { R.warnT = 0; return; }
    R.warnT = (R.warnT || 0) + 1;
    // 角の強さ
    var maxK = 0;
    for (var e = 0; e < 40; e += 2) { var kk = Math.abs(c.pts[C.idx(c, car.s + best.d + e)].k); if (kk > maxK) maxK = kk; }
    var name = maxK > 1 / 19 ? 'ヘアピン' : maxK > 1 / 30 ? 'きつい' : 'ゆるい';
    var col = maxK > 1 / 19 ? '#f86848' : maxK > 1 / 30 ? '#f8c048' : '#78d8f8';
    var dir = best.k > 0 ? '▶' : '◀';
    var txt = best.k > 0 ? name + ' ' + dir : dir + ' ' + name;
    var w = F.measure(txt) + 14;
    var x = 120 - w / 2, y = 36;
    if (maxK > 1 / 19 && (R.warnT >> 3) & 1 && best.d < 70) return; // 近いヘアピンは点滅
    box(g, x, y, w, 15);
    F.draw(g, txt, 120, y + 3, col, { align: 'center' });
    F.draw(g, Math.round(best.d / 10) * 10 + 'M', 120, y + 15, '#a8b0d0', { align: 'center' });
  }
})();
