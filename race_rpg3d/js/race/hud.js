/* レースHUD（高解像度）。画面の実サイズ sc = UI.screen() に沿って配置する */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, C = RR.Course, UI = RR.UI;
  var HUD = RR.RaceHUD = {};

  function panel(g, x, y, w, h, alpha) {
    var gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(18,24,48,' + (alpha || 0.78) + ')'); gr.addColorStop(1, 'rgba(6,8,18,' + (alpha || 0.78) + ')');
    UI.roundRect(g, x, y, w, h, 3); g.fillStyle = gr; g.fill();
    UI.roundRect(g, x, y, w, h, 3); g.lineWidth = 0.6; g.strokeStyle = 'rgba(170,185,240,0.45)'; g.stroke();
  }
  HUD.box = panel;

  // タイヤ温度の色: 冷=青緑 適温=緑 → 黄 → 橙 → 赤
  HUD.tempColor = function (sp, T) {
    var x = (T - sp.heatOpt) / sp.heatRange;
    if (x < -0.7) return '#3890b0';
    if (x < 0.35) return '#48d058';
    if (x < 0.6) return '#d8d040';
    if (x < 0.85) return '#e88830';
    return '#e83828';
  };

  HUD.draw = function (g, R, sc) {
    var car = R.player, sp = car.sp;
    var L = sc.x, Tp = sc.y, W = sc.w, H = sc.h;
    var i, frame = RR.Game.frame;
    // ---- 速度計（右下）----
    var land = !!RR.Game.padLandscape; // 横向きでソフトキーを重ねている時は、下の左右を空ける
    var px = land ? L + W - 124 : L + W - 112, py = land ? Tp + 6 : Tp + H - 58, pw = 106, ph = 52;
    panel(g, px, py, pw, ph);
    var kmh = Math.round(car.kmh());
    F.draw(g, U.pad(kmh, 3, ' '), px + 74, py + 5, '#f8f8f8', { scale: 3, align: 'right', shadow: 'rgba(0,0,0,0.6)' });
    F.draw(g, 'KM/H', px + 76, py + 19, '#a8b0d0');
    // ギア
    var gear = car.reverse ? 'R' : String(car.gear);
    var gx = px + 82, gy = py + 5;
    UI.roundRect(g, gx, gy, 19, 27, 2.5); g.fillStyle = R.mt ? 'rgba(104,64,24,0.9)' : 'rgba(40,52,100,0.9)'; g.fill();
    F.draw(g, gear, gx + 9.5, gy + 3, car.shiftT > 0 ? '#f8e060' : '#f8f8f8', { scale: 2.2, align: 'center' });
    F.draw(g, R.mt ? 'MT' : 'AT', gx + 9.5, gy + 20, '#a8b0d0', { align: 'center', scale: 0.8 });
    // 回転計（セグメント）
    var segs = 22, frac = U.clamp(car.rpm / sp.redline, 0, 1.05), lit = Math.round(frac * segs);
    var flash = frac > 0.93 && Math.sin(frame * 0.8) > 0;
    for (i = 0; i < segs; i++) {
      var col = i < 12 ? '#48c858' : i < 17 ? '#e0d040' : '#e84030';
      if (i >= lit) col = 'rgba(70,80,110,0.55)';
      if (flash && i >= 17) col = '#ffffff';
      g.fillStyle = col;
      var h = 3 + (i / segs) * 5;
      g.fillRect(px + 6 + i * 4, py + ph - 6 - h, 3, h);
    }
    if (R.mt && frac > 0.92) F.draw(g, 'UP!', px + 8, py + 6, '#f8e060');
    // ---- タイム・差（左上）----
    var tx = L + 6, ty = Tp + 6;
    panel(g, tx, ty, 92, R.rival || R.cfg.target ? 36 : 22);
    F.draw(g, U.time(R.time * 1000), tx + 7, ty + 5, '#f8f8f8', { scale: 1.6 });
    if (R.rival) {
      var gap = R.player.s - R.rival.car.s;
      var txt = (gap >= 0 ? '+' : '-') + Math.abs(Math.round(gap)) + 'M';
      F.draw(g, gap >= 0 ? 'リード' : 'ビハインド', tx + 7, ty + 22, gap >= 0 ? '#78e878' : '#f87868');
      F.draw(g, txt, tx + 86, ty + 22, gap >= 0 ? '#78e878' : '#f87868', { align: 'right' });
    } else if (R.cfg.target) {
      F.draw(g, 'もくひょう', tx + 7, ty + 22, '#a8b0d0');
      F.draw(g, U.time(R.cfg.target), tx + 86, ty + 22, '#f8e060', { align: 'right' });
    }
    // ---- 進捗バー（右）----
    var bx = L + W - 12, by = Tp + 14, bh = Math.min(H * 0.5, 84);
    panel(g, bx - 4, by - 6, 14, bh + 12, 0.6);
    g.fillStyle = 'rgba(90,100,140,0.8)'; g.fillRect(bx + 1, by, 4, bh);
    var c = R.course;
    var prog = function (s) { return by + bh - U.clamp((s - c.startS) / (c.finishS - c.startS), 0, 1) * bh; };
    g.fillStyle = '#f8f8f8'; g.fillRect(bx - 1, by - 1, 8, 1.4);
    if (R.rival) { var ry = prog(R.rival.car.s); g.fillStyle = '#5890f0'; UI.roundRect(g, bx - 1, ry - 1.6, 8, 3.2, 1.4); g.fill(); }
    var pyy = prog(car.s); g.fillStyle = '#f85048'; UI.roundRect(g, bx - 2, pyy - 2.2, 10, 4.4, 1.6); g.fill();
    // ---- タイヤ（荷重=円の大きさ、温度=色）（左下）----
    var wx = L + 6, wy = land ? Tp + 44 : Tp + H - 74;
    g.save();
    if (land) { g.translate(wx, wy); g.scale(0.7, 0.7); g.translate(-wx, -wy); } // 横向きは小さく
    panel(g, wx, wy, 46, 68);
    var cx = wx + 23;
    UI.roundRect(g, cx - 6, wy + 14, 12, 40, 4); g.fillStyle = 'rgba(70,84,128,0.9)'; g.fill();
    UI.roundRect(g, cx - 4, wy + 24, 8, 8, 2); g.fillStyle = 'rgba(24,32,56,0.9)'; g.fill();
    var pos = [[cx - 14, wy + 22], [cx + 14, wy + 22], [cx - 14, wy + 46], [cx + 14, wy + 46]];
    for (i = 0; i < 4; i++) {
      var load = car.Fz[i];
      var r = U.clamp(2.6 + load / 800, 2.6, 8.4);
      var tc = HUD.tempColor(sp, car.T[i]);
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(pos[i][0], pos[i][1] + 0.8, r + 0.5, 0, 7); g.fill();
      g.fillStyle = tc; g.beginPath(); g.arc(pos[i][0], pos[i][1], r, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(pos[i][0] - r * 0.3, pos[i][1] - r * 0.3, r * 0.35, 0, 7); g.fill();
      if (car.slide[i] > 0.7 && Math.sin(frame * 0.9) > 0) { g.strokeStyle = '#ffffff'; g.lineWidth = 0.9; g.beginPath(); g.arc(pos[i][0], pos[i][1], r + 1.4, 0, 7); g.stroke(); }
    }
    F.draw(g, Math.round(Math.max(car.T[0], car.T[1])) + '', cx, wy + 4, '#a8b0d0', { align: 'center', scale: 0.85 });
    F.draw(g, Math.round(Math.max(car.T[2], car.T[3])) + '', cx, wy + 57, '#a8b0d0', { align: 'center', scale: 0.85 });
    g.restore();
    // ---- コーナー予告 ----
    drawWarning(g, R, sc);
  };

  // 先のコーナーを探して看板を出す
  function drawWarning(g, R, sc) {
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
    var maxK = 0;
    for (var e = 0; e < 40; e += 2) { var kk = Math.abs(c.pts[C.idx(c, car.s + best.d + e)].k); if (kk > maxK) maxK = kk; }
    var name = maxK > 1 / 19 ? 'ヘアピン' : maxK > 1 / 30 ? 'きつい' : 'ゆるい';
    var col = maxK > 1 / 19 ? '#f86848' : maxK > 1 / 30 ? '#f8c048' : '#78d8f8';
    var dir = best.k > 0 ? '▶' : '◀';
    var txt = best.k > 0 ? name + ' ' + dir : dir + ' ' + name;
    var w = F.measure(txt) + 18;
    var x = 120 - w / 2, y = sc.y + 8;
    if (maxK > 1 / 19 && Math.sin(R.warnT * 0.4) > 0 && best.d < 70) return; // 近いヘアピンは点滅
    panel(g, x, y, w, 26);
    F.draw(g, txt, 120, y + 4, col, { align: 'center', scale: 1.1 });
    F.draw(g, Math.round(best.d / 10) * 10 + 'M', 120, y + 16, '#a8b0d0', { align: 'center', scale: 0.85 });
  }
})();
