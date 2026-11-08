/* player.js ― 自機：移動・ショット・オプション・ボム・被弾 */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, U = EB.U, Spr = EB.Spr, G = EB.Gfx, FX = EB.FX;
  var FW = CFG.FW, FH = CFG.FH, TAU = U.TAU;

  var shots = [], i;
  for (i = 0; i < CFG.MAX_PSHOTS; i++) shots.push({ on: false });
  var scur = 0;

  function allocShot() {
    for (var k = 0; k < shots.length; k++) {
      scur = (scur + 1) % shots.length;
      if (!shots[scur].on) return shots[scur];
    }
    return null;
  }
  // kind: 'm'=メイン 'o'=オプション 'ms'=ミサイル
  function shot(x, y, ang, spd, dmg, kind) {
    var s = allocShot(); if (!s) return;
    s.on = true; s.x = x; s.y = y; s.kind = kind; s.dmg = dmg; s.age = 0; s.spd = spd; s.ang = ang;
    s.vx = Math.cos(ang) * spd; s.vy = Math.sin(ang) * spd; s.tgt = null;
  }
  var UP = -U.PI / 2;

  var Player = {
    shots: shots,
    reset: function (W) {
      var P = W.player;
      P.x = FW / 2; P.y = FH - 34; P.alive = true; P.state = 'alive'; P.inv = 90; P.dyingT = 0; P.respawnT = 0;
      P.shotT = 0; P.bank = 0; P.anim = 0; P.focus = false; P.opt = [{ x: P.x - 16, y: P.y + 4 }, { x: P.x + 16, y: P.y + 4 }];
      P.msT = 0; P.hitFlash = 0;
      for (var k = 0; k < shots.length; k++) shots[k].on = false;
    },

    update: function (W, canShoot) {
      var P = W.player, In = EB.Input, A = EB.Audio;
      P.anim++;
      if (P.inv > 0) P.inv--;
      if (P.hitFlash > 0) P.hitFlash--;
      // ----- 状態別 -----
      if (P.state === 'dead') return;
      if (P.state === 'dying') {
        P.dyingT--;
        if (In.pressed.bomb && W.bombs > 0 && W.bombT <= 0) { Player.bomb(W, true); }
        else if (P.dyingT <= 0) Player.die(W);
        return;
      }
      if (P.state === 'respawn') {
        P.respawnT--;
        P.y = U.lerp(P.y, FH - 36, 0.08);
        if (P.respawnT <= 0) P.state = 'alive';
      }
      // ----- 移動 -----
      var focus = In.slow;
      P.focus = focus;
      var sp = focus ? CFG.PLAYER_SLOW : CFG.PLAYER_SPEED;
      var dx = In.dx, dy = In.dy;
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      P.x = U.clamp(P.x + dx * sp, 5, FW - 5);
      if (P.state !== 'respawn') P.y = U.clamp(P.y + dy * sp, 8, FH - 8);
      P.bank = U.lerp(P.bank, In.dx, 0.25);
      // オプション位置
      var lvl = Math.min(4, Math.floor(W.power));
      var tx = focus ? 8 : 17, ty = focus ? -7 : 5;
      P.opt[0].x = U.lerp(P.opt[0].x, P.x - tx, 0.25); P.opt[0].y = U.lerp(P.opt[0].y, P.y + ty, 0.25);
      P.opt[1].x = U.lerp(P.opt[1].x, P.x + tx, 0.25); P.opt[1].y = U.lerp(P.opt[1].y, P.y + ty, 0.25);
      // ----- ボム -----
      if (In.pressed.bomb && canShoot && W.bombs > 0 && W.bombT <= 0) Player.bomb(W, false);
      // ----- ショット -----
      if (P.shotT > 0) P.shotT--;
      if (In.shot && canShoot && W.bombT <= 0 && P.shotT <= 0) {
        P.shotT = 4;
        Player.fire(W, P, focus, lvl);
        A.se('shot', lvl);
      }
    },

    fire: function (W, P, focus, lvl) {
      var x = P.x, y = P.y - 9;
      var d = focus ? 1.25 : 1.0;
      if (focus) {
        if (lvl === 0) shot(x, y, UP, 8, 1.6, 'm');
        else if (lvl === 1) { shot(x - 3, y, UP, 8, 1.4, 'm'); shot(x + 3, y, UP, 8, 1.4, 'm'); }
        else if (lvl === 2) { shot(x, y - 2, UP, 8.5, 1.5, 'm'); shot(x - 5, y, UP, 8, 1.3, 'm'); shot(x + 5, y, UP, 8, 1.3, 'm'); }
        else if (lvl === 3) { shot(x - 2, y - 2, UP, 8.5, 1.5, 'm'); shot(x + 2, y - 2, UP, 8.5, 1.5, 'm'); shot(x - 6, y, UP, 8, 1.3, 'm'); shot(x + 6, y, UP, 8, 1.3, 'm'); }
        else { shot(x - 2, y - 2, UP, 9, 1.7, 'm'); shot(x + 2, y - 2, UP, 9, 1.7, 'm'); shot(x - 6, y, UP, 8.5, 1.5, 'm'); shot(x + 6, y, UP, 8.5, 1.5, 'm'); shot(x, y - 4, UP, 9, 1.7, 'm'); }
      } else {
        if (lvl === 0) shot(x, y, UP, 8, 1.2, 'm');
        else if (lvl === 1) { shot(x - 3, y, UP, 8, 1.0, 'm'); shot(x + 3, y, UP, 8, 1.0, 'm'); }
        else if (lvl === 2) { shot(x, y, UP, 8, 1.0, 'm'); shot(x - 4, y + 2, UP - 0.16, 8, 0.9, 'm'); shot(x + 4, y + 2, UP + 0.16, 8, 0.9, 'm'); }
        else if (lvl === 3) { shot(x, y, UP, 8, 1.0, 'm'); shot(x - 4, y + 2, UP - 0.15, 8, 0.9, 'm'); shot(x + 4, y + 2, UP + 0.15, 8, 0.9, 'm'); }
        else { shot(x, y, UP, 8.5, 1.1, 'm'); shot(x - 3, y + 1, UP - 0.12, 8, 1.0, 'm'); shot(x + 3, y + 1, UP + 0.12, 8, 1.0, 'm'); shot(x - 6, y + 3, UP - 0.3, 8, 0.9, 'm'); shot(x + 6, y + 3, UP + 0.3, 8, 0.9, 'm'); }
      }
      // オプション
      if (lvl >= 2 && (P.anim & 1) === 0) {
        var oa = focus ? 0 : 0.1;
        shot(P.opt[0].x, P.opt[0].y - 4, UP - oa, 8, 0.8, 'o');
        if (lvl >= 3) shot(P.opt[1].x, P.opt[1].y - 4, UP + oa, 8, 0.8, 'o');
      }
      // ミサイル
      if (lvl >= 4) {
        P.msT++;
        if (P.msT % 6 === 0) {
          shot(P.opt[0].x, P.opt[0].y, UP - 0.5, 2.4, 2.2, 'ms');
          shot(P.opt[1].x, P.opt[1].y, UP + 0.5, 2.4, 2.2, 'ms');
          EB.Audio.se('shot2');
        }
      }
    },

    updateShots: function (W) {
      var en = W.enemies;
      for (var k = 0; k < shots.length; k++) {
        var s = shots[k];
        if (!s.on) continue;
        s.age++;
        if (s.kind === 'ms') {
          // 追尾
          if (!s.tgt || s.tgt.dead || s.tgt.hp <= 0) {
            var best = null, bd = 1e9;
            for (var e = 0; e < en.length; e++) {
              var E = en[e]; if (E.dead || !E.targetable) continue;
              var dd = U.dist2(s.x, s.y, E.x, E.y);
              if (dd < bd) { bd = dd; best = E; }
            }
            s.tgt = best;
          }
          if (s.tgt) {
            var ta = Math.atan2(s.tgt.y - s.y, s.tgt.x - s.x), df = U.wrapAng(ta - s.ang);
            s.ang += U.clamp(df, -0.12, 0.12);
          } else s.ang = U.lerp(s.ang, UP, 0.05);
          s.spd = Math.min(7, s.spd + 0.18);
          s.vx = Math.cos(s.ang) * s.spd; s.vy = Math.sin(s.ang) * s.spd;
          if ((s.age & 1) === 0) FX.glow(s.x - s.vx * 1.5, s.y - s.vy * 1.5, '#ffa040');
        }
        s.x += s.vx; s.y += s.vy;
        if (s.y < -12 || s.y > FH + 12 || s.x < -12 || s.x > FW + 12) s.on = false;
      }
    },

    // ボム「共鳴パルス」
    bomb: function (W, saved) {
      var P = W.player;
      W.bombs--; W.bombT = CFG.BOMB_FRAMES; W.bombsUsed++;
      P.inv = Math.max(P.inv, CFG.BOMB_INVULN);
      if (saved) { P.state = 'alive'; P.dyingT = 0; }
      EB.Audio.se('bomb');
      FX.flash('#9fd8ff', 22, 0.75); FX.shake(5, 40);
      FX.ring(P.x, P.y, 6, 150, 40, '#bfe8ff');
      FX.ring(P.x, P.y, 2, 100, 28, '#ffffff');
    },

    hit: function (W) {
      var P = W.player;
      if (P.inv > 0 || P.state !== 'alive' || W.cleared) return;
      if (EB.Cheat.invincible) return;          // 無敵モード（隠しコマンド）：被弾しない
      P.state = 'dying'; P.dyingT = CFG.DEATHBOMB_FRAMES;
      P.hitFlash = 8;
      FX.shake(3, 12);
      EB.Audio.se('hitBoss');
      EB.Platform.vibrate(30);
    },
    die: function (W) {
      var P = W.player, lost = Math.max(1, Math.min(4, Math.floor(W.power) + 1));
      FX.explode(P.x, P.y, 1, true);
      EB.Audio.se('pdie');
      FX.flash('#ffffff', 10, 0.6); FX.shake(6, 30);
      FX.spark(P.x, P.y, 26, '#80c8ff', 1.6);
      W.deaths++; W.stageDeaths++;
      W.lives--;
      W.power = Math.max(0, W.power - 1);
      for (var k = 0; k < lost; k++) EB.Items.spawn('p', P.x + (k - lost / 2) * 8, P.y, { vx: (k - lost / 2) * 0.6, vy: -2 });
      EB.Bullets.clear('spark');
      if (W.lives < 0) {
        P.state = 'dead'; P.alive = false;
        W.onGameOver();
      } else {
        W.bombs = Math.max(W.bombs, W.startBombs);
        P.state = 'respawn'; P.respawnT = 50; P.inv = CFG.RESPAWN_INVULN;
        P.x = FW / 2; P.y = FH + 24;
        W.shotDelay = 20;
      }
    },

    draw: function (ctx, W) {
      var P = W.player;
      if (P.state === 'dead') return;
      var blink = P.inv > 0 && ((P.anim >> 1) & 1) && P.state !== 'dying';
      var lvl = Math.min(4, Math.floor(W.power));
      // オプション
      if (lvl >= 2) {
        var os = Spr.option[(P.anim >> 3) & 1];
        ctx.drawImage(os.c, Math.round(P.opt[0].x - os.ox), Math.round(P.opt[0].y - os.oy));
        if (lvl >= 3) ctx.drawImage(os.c, Math.round(P.opt[1].x - os.ox), Math.round(P.opt[1].y - os.oy));
      }
      if (!blink) {
        var fi = P.bank < -0.35 ? 0 : (P.bank > 0.35 ? 2 : 1);
        var fl = Spr.flame[(P.anim >> 1) % 3];
        ctx.drawImage(fl.c, Math.round(P.x - 3.5 - 3.5 - 0.5), Math.round(P.y + 9));
        ctx.drawImage(fl.c, Math.round(P.x - 3.5 + 3.5 + 0.5), Math.round(P.y + 9));
        var s = Spr.player[fi];
        if (P.state === 'dying') s = G.flashOf(s);
        ctx.drawImage(s.c, Math.round(P.x - s.ox), Math.round(P.y - s.oy));
      }
      // 無敵モード中は自機の周りに光のリングを出す
      if (EB.Cheat.invincible && P.state !== 'dying') {
        var rr = 11 + Math.sin(P.anim * 0.2) * 1.2;
        ctx.globalAlpha = 0.75; ctx.fillStyle = ((P.anim >> 2) & 1) ? '#ffe060' : '#ffffff';
        for (var q = 0; q < 16; q++) {
          var an = q / 16 * TAU + P.anim * 0.05;
          ctx.fillRect(Math.round(P.x + Math.cos(an) * rr), Math.round(P.y + Math.sin(an) * rr), 1, 1);
        }
        ctx.globalAlpha = 1;
      }
      // 低速時は当たり判定表示
      if (P.focus && P.state !== 'dying') {
        var cx = Math.round(P.x), cy = Math.round(P.y);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 1, 5, 3); ctx.fillRect(cx - 1, cy - 2, 3, 5);
        ctx.fillStyle = '#ff3050'; ctx.fillRect(cx - 1, cy - 1, 3, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, cy, 1, 1);
      }
    },

    drawShots: function (ctx) {
      for (var k = 0; k < shots.length; k++) {
        var s = shots[k];
        if (!s.on) continue;
        var sp, idx;
        if (s.kind === 'ms') { idx = ((Math.round((s.ang + U.PI / 2) / TAU * 32) % 32) + 32) % 32; sp = Spr.missileRot[idx]; }
        else {
          idx = ((Math.round((s.ang + U.PI / 2) / TAU * 32) % 32) + 32) % 32;
          sp = (s.kind === 'o' ? Spr.pshotOptRot : Spr.pshotRot)[idx];
        }
        ctx.drawImage(sp.c, Math.round(s.x - sp.ox), Math.round(s.y - sp.oy));
      }
    },

    // ボムの描画（共鳴パルス）
    drawBomb: function (ctx, W) {
      if (W.bombT <= 0) return;
      var P = W.player, t = (CFG.BOMB_FRAMES - W.bombT), k = t / CFG.BOMB_FRAMES;
      var R = U.easeOut(Math.min(1, t / 70)) * 240;
      var fade = W.bombT < 30 ? W.bombT / 30 : 1;
      var cx = Math.round(P.x), cy = Math.round(P.y);
      ctx.save();
      ctx.globalAlpha = 0.22 * fade;
      ctx.fillStyle = '#7fc8ff';
      for (var r = R; r > 0; r -= 18) {
        // 同心の円環（ドット）
        var n = Math.max(16, Math.round(r * 1.5));
        ctx.globalAlpha = (0.55 - r / R * 0.4) * fade;
        ctx.fillStyle = (Math.round(r / 18) & 1) ? '#bfeaff' : '#6aa8ff';
        for (var a = 0; a < n; a++) {
          var an = a / n * TAU + k * 3;
          ctx.fillRect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 2, 2);
        }
      }
      // 放射する光線
      ctx.globalAlpha = 0.55 * fade; ctx.fillStyle = '#ffffff';
      for (var q = 0; q < 12; q++) {
        var ang = q / 12 * TAU + k * 2;
        for (var d = 8; d < R; d += 5) ctx.fillRect(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d), 1, 1);
      }
      ctx.restore();
    }
  };
  EB.Player = Player;
})();
