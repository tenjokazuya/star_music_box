/* game.js ― ゲーム本体シーン：ステージ進行・当たり判定・スコア・HUD・ポーズ */
(function () {
  'use strict';
  var EB = (typeof window !== 'undefined' ? window : globalThis).EB;
  var CFG = EB.CFG, U = EB.U, G = EB.Gfx, FX = EB.FX, Bullets = EB.Bullets, Items = EB.Items, Enemies = EB.Enemies, Player = EB.Player, A = EB.Audio, In = EB.Input;
  var FW = CFG.FW, FH = CFG.FH;

  // ================= ワールド状態 =================
  var W = EB.W = {
    player: { x: 96, y: 190, alive: true, state: 'alive', inv: 0, opt: [{ x: 0, y: 0 }, { x: 0, y: 0 }] },
    enemies: Enemies.list, boss: null, bg: null, diff: CFG.DIFF.normal, diffKey: 'normal',
    frame: 0, stageIdx: 0, score: 0, hi: 0, lives: 2, bombs: 3, startBombs: 3, power: 0, graze: 0, kills: 0, deaths: 0, stageDeaths: 0,
    bombT: 0, bombsUsed: 0, stageBombs: 0, stageGraze: 0, gemChain: 0, gemChainT: 0, nextExtend: 0,
    shakeMag: 0, shakeT: 0, flashT: 0, flashMax: 1, flashA: 0.8, flashColor: '#fff', hitstop: 0, cleared: false, shotDelay: 0,
    continues: 0,
    addScore: function (v) {
      W.score += v;
      while (W.nextExtend < CFG.EXTEND_SCORES.length && W.score >= CFG.EXTEND_SCORES[W.nextExtend]) { W.nextExtend++; W.addLife(true); }
      if (W.score > W.hi) W.hi = W.score;
    },
    addPower: function (v) {
      var old = Math.floor(W.power);
      W.power = Math.min(4, W.power + v);
      if (Math.floor(W.power) > old) { A.se('power'); FX.text(W.player.x, W.player.y - 16, 'POWER UP', '#ffe060'); FX.ring(W.player.x, W.player.y, 4, 26, 16, '#ffe060'); }
    },
    addLife: function (ext) {
      if (W.lives < 8) W.lives++;
      A.se('oneup'); FX.text(W.player.x, W.player.y - 16, ext ? 'EXTEND' : '1UP', '#80ff90'); FX.flash('#a0ffb0', 10, 0.35);
    },
    onGameOver: function () { Game.gameOver(); },
    onBossDefeated: function (e) { Game.bossDefeated(e); }
  };

  // ================= Game シーン =================
  var st = null;             // ステージ進行
  var phase = 'intro';       // intro / play / clear / over
  var phaseT = 0;
  var paused = false, pauseSel = 0;
  var warnT = 0, warnPending = null;
  var clearT = 0, tally = null;
  var overT = 0, contSel = 0, contT = 0;
  var fadeIn = 0;
  var stageStartSnapshot = null;

  function snapshot() { return { score: W.score, lives: W.lives, bombs: W.bombs, power: W.power }; }

  var Game = {
    // ---- 開始 ----
    startNew: function (diffKey, opt) {
      opt = opt || {};
      W.diffKey = diffKey; W.diff = CFG.DIFF[diffKey];
      Bullets.setDifficulty(W.diff);
      W.score = 0; W.lives = EB.Settings.lives; W.startBombs = 3; W.bombs = 3; W.power = 0; W.graze = 0; W.kills = 0; W.deaths = 0; W.bombsUsed = 0;
      W.nextExtend = 0; W.continues = 0; W.hi = EB.Save.hi(diffKey);
      U.rng.seed(20260101);
      Game.beginStage(opt.stage || 0);
    },
    beginStage: function (idx) {
      W.stageIdx = idx;
      EB.Dialogue.cancel();
      W.cleared = false; W.boss = null; W.bombT = 0; W.frame = 0; W.stageDeaths = 0; W.stageBombs = W.bombsUsed; W.stageGraze = W.graze;
      Enemies.reset(); Bullets.reset(); Items.reset(); FX.reset();
      W.bg = EB.BG.make(idx);
      Player.reset(W);
      st = { ev: EB.StageBuild(idx), i: 0, clock: 0, block: null, def: EB.Stages[idx] };
      phase = 'intro'; phaseT = 0; paused = false; warnT = 0; warnPending = null; fadeIn = 30;
      stageStartSnapshot = snapshot();
      A.stop(0.5);
      A.ambient(st.def.amb);
      A.se('warp');
      EB.Save.setProgress(idx);
    },
    enter: function (opt) {
      opt = opt || {};
      if (opt.next) Game.beginStage(W.stageIdx + 1);
      else Game.startNew(opt.diff || 'normal', opt);
      EB.Scene.fadeIn(24);
    },
    exit: function () { A.stop(0.4); A.stopAmbient(0.6); A.duck(false); },

    // ---- 更新 ----
    update: function () {
      if (EB.Input.pressed.pause && phase !== 'over' && !(phase === 'intro' && phaseT < 5)) { Game.togglePause(); }
      if (paused) { Game.updatePause(); return; }
      if (W.hitstop > 0) { W.hitstop--; return; }
      W.frame++; phaseT++;
      if (W.flashT > 0) W.flashT--;
      if (W.shakeT > 0) W.shakeT--; else W.shakeMag = 0;
      if (W.gemChainT > 0) { W.gemChainT--; if (W.gemChainT <= 0) W.gemChain = 0; }
      if (W.shotDelay > 0) W.shotDelay--;

      if (phase === 'intro') {
        W.bg.update(1.4);
        if (phaseT === 40) A.play(st.def.bgm, { fadeIn: 0.5 });
        if (phaseT > 150) { phase = 'play'; phaseT = 0; }
        Player.update(W, false);
        Game.updateWorldFx();
        return;
      }
      if (phase === 'clear') { Game.updateClear(); return; }
      if (phase === 'over') { Game.updateOver(); return; }

      // ---- play ----
      var talking = EB.Dialogue.active, bossFight = !!W.boss, scrollMul = bossFight ? 1.6 : 1;
      W.bg.update(scrollMul);
      if (warnT > 0) Game.updateWarn();
      else Game.updateTimeline();
      EB.Dialogue.update();
      Player.update(W, !talking && !W.cleared && W.shotDelay <= 0);
      Player.updateShots(W);
      Enemies.update(W);
      Bullets.update();
      Items.update(W);
      FX.update();
      if (W.bombT > 0) Game.updateBomb();
      Game.collide();
    },

    updateWorldFx: function () { FX.update(); Items.update(W); },

    // ---- タイムライン ----
    updateTimeline: function () {
      if (EB.Dialogue.active) return;
      if (st.block) {
        var b = st.block;
        if (b === 'boss') { if (!W.boss) st.block = null; return; }
        if (b === 'wait') { if (!Enemies.anyAlive()) st.block = null; return; }
        if (b === 'dialog') return;
        return;
      }
      st.clock++;
      while (st.i < st.ev.length && st.ev[st.i].t <= st.clock) {
        var e = st.ev[st.i++];
        if (e.type === 'fn') e.fn(W);
        else if (e.type === 'dialog') {
          Bullets.clear('spark');
          st.block = 'dialog';
          A.duck(true);
          EB.Dialogue.start(e.id, function () { st.block = null; A.duck(false); });
          break;
        }
        else if (e.type === 'boss') { Game.startBossWarning(e.id); st.block = 'boss'; break; }
        else if (e.type === 'wait') { st.block = 'wait'; break; }
        else if (e.type === 'end') { Game.stageClear(); break; }
      }
    },

    startBossWarning: function (id) {
      warnT = 170; warnPending = id;
      A.se('warning');
      A.stop(0.5);
      EB.FX.shake(2, 60);
    },
    updateWarn: function () {
      warnT--;
      if (warnT === 90 && warnPending) {
        var id = warnPending; warnPending = null;
        var def = EB.Bosses.defs[id];
        EB.Bosses.spawn(id, W);
        A.play(def.bgm, { fadeIn: 0.3 });
      }
      if (warnT <= 0 && W.boss) { /* 戦闘開始 */ }
    },
    bossDefeated: function (e) {
      Bullets.clear('gem');
      if (e.mid) { A.play(st.def.bgm, { fadeIn: 1.5 }); }
      else { A.play('story', { fadeIn: 2.0, fadeOut: 0.2 }); }
      W.hitstop = 8;
    },

    // ---- ボム処理 ----
    updateBomb: function () {
      W.bombT--;
      var P = W.player, t = CFG.BOMB_FRAMES - W.bombT;
      var R = U.easeOut(Math.min(1, t / 70)) * 240;
      // 弾消し
      var L = Bullets.list;
      for (var i = 0; i < L.length; i++) {
        var b = L[i];
        if (!b.on) continue;
        if (U.dist2(b.x, b.y, P.x, P.y) < R * R) { b.on = false; if (i % 3 === 0) FX.spark(b.x, b.y, 1, '#bfe8ff', 0.6); }
      }
      Bullets.beams.length = 0;
      // 敵ダメージ
      for (var k = 0; k < Enemies.list.length; k++) {
        var e = Enemies.list[k];
        if (e.dead) continue;
        if (U.dist2(e.x, e.y, P.x, P.y) < (R + e.r) * (R + e.r)) Enemies.damage(e, e.isBoss ? 0.9 : 3.2, W);
      }
      if (W.bombT === 0) { A.se('bombEnd'); FX.flash('#ffffff', 10, 0.4); }
      if (t % 3 === 0) FX.glow(P.x + U.rng.range(-8, 8), P.y + U.rng.range(-8, 8), '#bfe8ff');
    },

    // ---- 当たり判定 ----
    collide: function () {
      var P = W.player, i, j;
      // 自機ショット → 敵
      var S = Player.shots, en = Enemies.list;
      for (i = 0; i < S.length; i++) {
        var s = S[i];
        if (!s.on) continue;
        for (j = 0; j < en.length; j++) {
          var e = en[j];
          if (e.dead || (!e.targetable && !e.isBoss)) continue;
          if (e.isBoss && e.state !== 'fight') continue;
          var rr = e.r + 3;
          if (U.dist2(s.x, s.y, e.x, e.y) < rr * rr) {
            s.on = false;
            Enemies.damage(e, s.dmg, W);
            FX.spark(s.x, s.y, 1, '#bfeaff', 0.6);
            break;
          }
        }
      }
      if (!P.alive || P.state === 'dead') return;
      // 弾 → 自機
      var hitR = CFG.PLAYER_HIT_R, grazeR = CFG.PLAYER_GRAZE_R;
      var L = Bullets.list, px = P.x, py = P.y;
      var canHit = P.state === 'alive' && P.inv <= 0;
      for (i = 0; i < L.length; i++) {
        var b = L[i];
        if (!b.on || b.delay > 0) continue;
        var dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
        var rh = b.r + hitR;
        if (d2 < rh * rh) {
          if (canHit) { Player.hit(W); canHit = false; }
        } else if (!b.grazed && d2 < (b.r + grazeR) * (b.r + grazeR) && P.state !== 'dying') {
          b.grazed = true; W.graze++;
          W.addScore(10 + Math.min(40, Math.floor(W.graze / 20) * 5));
          A.se('graze'); FX.spark(px + dx * 0.5, py + dy * 0.5, 1, '#ffffff', 0.5);
        }
      }
      // ビーム
      if (canHit && Bullets.hitBeam(px, py, hitR)) { Player.hit(W); canHit = false; }
      // 敵本体
      if (canHit) {
        for (j = 0; j < en.length; j++) {
          var e2 = en[j];
          if (e2.dead || (!e2.targetable && !e2.isBoss) || e2.hidden) continue;
          var rb = e2.r * 0.8 + hitR + 2;
          if (U.dist2(e2.x, e2.y, px, py) < rb * rb) { Player.hit(W); break; }
        }
      }
    },

    // ---- ステージクリア ----
    stageClear: function () {
      phase = 'clear'; phaseT = 0; clearT = 0; W.cleared = true;
      Bullets.clear('gem'); Enemies.killAll(W, 'gem');
      A.stop(1.0);
      tally = Game.makeTally();
    },
    makeTally: function () {
      var noMiss = W.stageDeaths === 0, noBomb = (W.bombsUsed - W.stageBombs) === 0;
      var graze = W.graze - W.stageGraze;
      var rows = [
        { label: 'STAGE CLEAR', v: 10000 * (W.stageIdx + 1) },
        { label: 'GRAZE x' + graze, v: graze * 50 },
        { label: noMiss ? 'NO MISS' : 'MISS ' + W.stageDeaths, v: noMiss ? 30000 : 0 },
        { label: noBomb ? 'NO BOMB' : 'BOMB USED', v: noBomb ? 20000 : 0 },
        { label: 'LIFE x' + Math.max(0, W.lives), v: Math.max(0, W.lives) * 5000 }
      ];
      return { rows: rows, shown: 0, cur: 0, total: 0, t: 0 };
    },
    updateClear: function () {
      clearT++;
      W.bg.update(2.5);
      Player.update(W, false);
      Player.updateShots(W);
      Items.update(W); FX.update(); Bullets.update();
      // プレイヤーを中央上へ
      var P = W.player;
      if (clearT > 20) { P.y -= Math.min(2.5, (clearT - 20) * 0.04); if (clearT > 150) P.y -= 3; }
      if (clearT === 4) A.se('stageClear');
      if (clearT > 80 && tally) {
        var tl = tally;
        tl.t++;
        if (tl.cur < tl.rows.length) {
          if (tl.t % 28 === 0) {
            tl.cur++;
            var r = tl.rows[tl.cur - 1];
            W.addScore(r.v);
            if (r.v > 0) A.se('tallyEnd'); else A.se('cursor');
          }
        } else if (!tl.done) {
          tl.done = true; tl.doneT = clearT;
        }
        if (tl.done && (In.pressed.ok || In.pressed.shot || clearT > tl.doneT + 220 || In.peekTap())) {
          In.takeTap();
          Game.nextStage();
        }
      }
    },
    nextStage: function () {
      if (W.stageIdx >= CFG.STAGES - 1) { Game.allClear(); return; }
      EB.Scene.go('game', 30, { next: true });
    },
    allClear: function () {
      EB.Scene.go('ending', 40, { score: W.score, diff: W.diffKey, deaths: W.deaths, graze: W.graze, continues: W.continues });
    },

    // ---- ゲームオーバー ----
    gameOver: function () {
      phase = 'over'; phaseT = 0; overT = 0; contSel = 0; contT = 600;
      EB.Dialogue.cancel();
      A.stop(0.3);
    },
    updateOver: function () {
      overT++;
      FX.update(); Bullets.update(); Items.update(W); W.bg.update(0.5);
      if (overT === 90) A.play('gameover', { fadeIn: 0.1 });
      if (overT < 150) return;
      // コンティニュー選択
      var left = 3 - W.continues;
      if (In.pressed.up || In.pressed.down) { contSel = 1 - contSel; A.se('cursor'); }
      var tap = In.takeTap();
      if (tap && tap.y > 120) { contSel = tap.y > 150 ? 1 : 0; if (contSel === 0 && left <= 0) contSel = 1; }
      contT--;
      var ok = In.pressed.ok || !!tap;
      if (contT <= 0) { ok = true; contSel = 1; }
      if (ok) {
        if (contSel === 0 && left > 0) {
          W.continues++; A.se('ok');
          W.lives = Math.max(1, EB.Settings.lives); W.bombs = 3; W.score = Math.floor(W.score * 0.5);
          W.power = Math.max(W.power, 1); W.player.inv = 0;
          Game.restartStage();
        } else {
          A.se('cancel');
          Game.finishRun();
        }
      }
    },
    // 走行終了（ゲームオーバー/中断）：ランクインならネームエントリーへ
    finishRun: function () {
      var pos = EB.Save.rank(W.diffKey, W.score);
      if (pos >= 0) EB.Scene.go('name', 30, { diff: W.diffKey, score: W.score, stage: W.stageIdx + 1, pos: pos });
      else EB.Scene.go('title', 30);
    },
    restartStage: function () {
      var idx = W.stageIdx;
      var keep = { score: W.score, lives: W.lives, bombs: W.bombs, power: W.power, cont: W.continues };
      Game.beginStage(idx);
      W.score = keep.score; W.lives = keep.lives; W.bombs = keep.bombs; W.power = keep.power; W.continues = keep.cont;
      W.nextExtend = 0; while (W.nextExtend < CFG.EXTEND_SCORES.length && W.score >= CFG.EXTEND_SCORES[W.nextExtend]) W.nextExtend++;
    },

    // ---- ポーズ ----
    togglePause: function () {
      paused = !paused; pauseSel = 0;
      A.se(paused ? 'pause' : 'unpause');
      A.duck(paused);
    },
    updatePause: function () {
      var items = 3;
      if (In.pressed.up) { pauseSel = (pauseSel + items - 1) % items; A.se('cursor'); }
      if (In.pressed.down) { pauseSel = (pauseSel + 1) % items; A.se('cursor'); }
      var tap = In.takeTap();
      if (tap) {
        for (var i = 0; i < items; i++) if (Math.abs(tap.y - (104 + i * 18)) < 9 && tap.x > 50 && tap.x < 270) { pauseSel = i; In.pressed.ok = true; }
      }
      if (In.pressed.cancel) { Game.togglePause(); return; }
      if (In.pressed.ok) {
        if (pauseSel === 0) Game.togglePause();
        else if (pauseSel === 1) { paused = false; A.duck(false); A.se('ok'); Game.restartFresh(); }
        else { paused = false; A.duck(false); A.se('cancel'); Game.finishRun(); }
      }
    },
    restartFresh: function () {
      var idx = W.stageIdx, s = stageStartSnapshot;
      Game.beginStage(idx);
      W.score = s.score; W.lives = s.lives; W.bombs = s.bombs; W.power = s.power;
    },

    // ================= 描画 =================
    draw: function (ctx) {
      // 背景
      ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, CFG.W, CFG.H);
      ctx.save();
      ctx.beginPath(); ctx.rect(CFG.FX, CFG.FY, FW, FH); ctx.clip();
      var sx = 0, sy = 0;
      if (W.shakeT > 0) { sx = Math.round((U.fxRng.next() - 0.5) * 2 * W.shakeMag); sy = Math.round((U.fxRng.next() - 0.5) * 2 * W.shakeMag); }
      ctx.translate(CFG.FX + sx, CFG.FY + sy);
      W.bg.draw(ctx);
      Items.draw(ctx);
      Enemies.draw(ctx);
      Player.drawShots(ctx);
      if (phase !== 'over') Player.draw(ctx, W);
      Bullets.drawBeams(ctx);
      Bullets.draw(ctx);
      Player.drawBomb(ctx, W);
      FX.draw(ctx);
      Game.drawFieldOverlay(ctx);
      ctx.restore();
      // フラッシュ
      if (W.flashT > 0) {
        ctx.globalAlpha = W.flashA * (W.flashT / W.flashMax);
        ctx.fillStyle = W.flashColor; ctx.fillRect(CFG.FX, CFG.FY, FW, FH); ctx.globalAlpha = 1;
      }
      Game.drawHud(ctx);
      EB.Dialogue.draw(ctx);
      Game.drawOverlays(ctx);
    },

    drawFieldOverlay: function (ctx) {
      // ボスHPバー・名称
      var b = W.boss;
      if (b && b.state !== 'dying') {
        var ratio = Math.max(0, b.hp / b.maxhp), ph = b.def.phases.length;
        var w = 150, x = 21;
        ctx.fillStyle = '#000'; ctx.fillRect(x - 1, 3, w + 2, 6);
        ctx.fillStyle = '#401020'; ctx.fillRect(x, 4, w, 4);
        ctx.fillStyle = b.inv > 0 ? '#ffffff' : (ratio < 0.3 ? '#ff5050' : '#ff9a40'); ctx.fillRect(x, 4, Math.round(w * (b.inv > 0 ? Math.min(1, (70 - b.inv) / 40) : ratio)), 4);
        for (var i = b.pi + 1; i < ph; i++) { ctx.fillStyle = '#ffe060'; ctx.fillRect(x + w + 4 + (i - b.pi - 1) * 5, 4, 3, 4); }
        G.text(b.def.name, x, 11, '#ffffff', { shadow: '#000' });
        if (b.timeLeft > 0 && b.state === 'fight') G.text(U.pad(Math.ceil(b.timeLeft / 60), 2), FW - 10, 11, b.timeLeft < 600 ? '#ff6060' : '#ffffff', { align: 'r', shadow: '#000' });
        if (b.nameT > 0 && b.phaseName) {
          var a = Math.min(1, b.nameT / 20, (140 - b.nameT) / 10);
          G.text('— ' + b.phaseName + ' —', FW / 2, 90, '#ffe8a0', { align: 'c', shadow: '#401000', a: Math.max(0, a) });
        }
      }
      // WARNING
      if (warnT > 0) {
        var wa = warnT > 20 ? 1 : warnT / 20, blink = (warnT >> 3) & 1;
        ctx.globalAlpha = 0.55 * wa; ctx.fillStyle = '#a00018'; ctx.fillRect(0, 84, FW, 56); ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff2040';
        for (var x2 = -((W.frame * 2) % 16); x2 < FW; x2 += 16) { ctx.fillRect(x2, 84, 8, 3); ctx.fillRect(x2 + 8, 137, 8, 3); }
        if (blink) {
          G.text('WARNING', FW / 2, 102, '#ffffff', { align: 'c', outline: '#c00020' });
          G.text('巨大な機械反応が接近中', FW / 2, 118, '#ffd0d0', { align: 'c', shadow: '#400010' });
        }
      }
    },

    drawHud: function (ctx) {
      var X = CFG.PX, f = G.frame;
      // 外枠
      G.frame(CFG.FX - 3, CFG.FY - 3, FW + 6, FH + 6, { bg: 'rgba(0,0,0,0)', b1: '#5a7acc', b2: '#1c2c70' });
      // 右パネル背景
      ctx.fillStyle = '#080c24'; ctx.fillRect(CFG.FX + FW + 4, 0, CFG.W - (CFG.FX + FW + 4), CFG.H);
      ctx.fillStyle = '#0c1438'; for (var y = 0; y < CFG.H; y += 4) ctx.fillRect(CFG.FX + FW + 4, y, CFG.W - (CFG.FX + FW + 4), 1);
      ctx.fillStyle = '#080c24'; ctx.fillRect(0, 0, CFG.FX - 3, CFG.H);
      G.text('ECHO BEACON', X + 52, 10, '#8cb4ff', { align: 'c', shadow: '#10204a' });
      G.text('HI-SCORE', X, 26, '#ffe060', { shadow: '#402000' });
      G.text(U.pad(W.hi, 9, ' '), X + 100, 36, '#ffffff', { align: 'r', shadow: '#202040' });
      G.text('SCORE', X, 50, '#80e0ff', { shadow: '#102040' });
      G.text(U.pad(W.score, 9, ' '), X + 100, 60, '#ffffff', { align: 'r', shadow: '#202040' });
      // 残機
      G.text('LIFE', X, 80, '#ff9090', { shadow: '#400010' });
      for (var i = 0; i < Math.max(0, W.lives); i++) ctx.drawImage(EB.Spr.lifeIcon.c, X + 32 + i * 10, 78);
      // ボム
      G.text('BOMB', X, 96, '#90d0ff', { shadow: '#102050' });
      for (var j = 0; j < W.bombs; j++) ctx.drawImage(EB.Spr.bombIcon.c, X + 32 + j * 10, 94);
      // パワー
      G.text('POWER', X, 114, '#ffd080', { shadow: '#402000' });
      var pw = W.power, lvl = Math.floor(pw);
      ctx.fillStyle = '#101030'; ctx.fillRect(X, 124, 100, 7);
      var wbar = Math.round(100 * pw / 4);
      ctx.fillStyle = lvl >= 4 ? '#ffe060' : '#ff9030'; ctx.fillRect(X, 124, wbar, 7);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X, 124, wbar, 1);
      ctx.fillStyle = '#000'; for (var k = 1; k < 4; k++) ctx.fillRect(X + k * 25, 124, 1, 7);
      G.text(lvl >= 4 ? 'MAX' : 'Lv.' + lvl, X + 100, 134, lvl >= 4 ? '#ffe060' : '#ffffff', { align: 'r', shadow: '#000' });
      // グレイズ
      G.text('GRAZE', X, 148, '#a0ffb0', { shadow: '#103020' });
      G.text(U.pad(W.graze, 6, ' '), X + 100, 148, '#ffffff', { align: 'r', shadow: '#202040' });
      // ステージ
      G.text('STAGE ' + (W.stageIdx + 1), X, 168, '#ffffff', { shadow: '#202040' });
      G.text(CFG.DIFF[W.diffKey].name, X + 100, 168, W.diffKey === 'hard' ? '#ff6060' : (W.diffKey === 'easy' ? '#80ff90' : '#80c0ff'), { align: 'r', shadow: '#000' });
      // 場所
      if (st) G.text(st.def.place.length > 8 ? st.def.place.substring(0, 8) + '…' : st.def.place, X, 184, '#8090c0', {});
      if (EB.Cheat.invincible) G.text('INVINCIBLE', X, 202, ((W.frame >> 4) & 1) ? '#ffe060' : '#ffffff', { shadow: '#402000' });
      G.text('FPS', X, 220, '#405080', {});
      G.text(U.pad(Math.round(EB.fps || 60), 2), X + 24, 220, '#405080', {});
      if (EB.Audio.isMuted()) G.text('MUTE', X + 100, 220, '#ff6060', { align: 'r' });
    },

    drawOverlays: function (ctx) {
      var fx = CFG.FX, fy = CFG.FY;
      // ステージタイトル
      if (phase === 'intro') {
        var t = phaseT, a = t < 20 ? t / 20 : (t > 120 ? Math.max(0, (150 - t) / 30) : 1);
        ctx.globalAlpha = a;
        var slide = t < 24 ? (1 - U.easeOut(t / 24)) * 60 : 0;
        ctx.fillStyle = 'rgba(0,0,20,0.55)'; ctx.fillRect(fx, fy + 78, FW, 66);
        G.text('STAGE ' + (W.stageIdx + 1), fx + FW / 2 - slide, fy + 86, '#ffe060', { align: 'c', outline: '#402000' });
        G.text(st.def.name, fx + FW / 2 + slide, fy + 102, '#ffffff', { align: 'c', shadow: '#101840' });
        G.text(st.def.place, fx + FW / 2, fy + 120, '#a0c0ff', { align: 'c', shadow: '#101840' });
        ctx.globalAlpha = 1;
      }
      // クリア集計
      if (phase === 'clear') {
        var ca = Math.min(1, clearT / 30);
        ctx.globalAlpha = ca;
        G.frame(fx + 8, fy + 40, FW - 16, 140, { bg: 'rgba(4,8,30,0.9)' });
        G.text('STAGE ' + (W.stageIdx + 1) + ' CLEAR!', fx + FW / 2, fy + 50, '#ffe060', { align: 'c', outline: '#402000' });
        if (tally) {
          for (var i = 0; i < tally.cur; i++) {
            var r = tally.rows[i];
            G.text(r.label, fx + 18, fy + 76 + i * 15, r.v > 0 ? '#ffffff' : '#7080a0', { shadow: '#101840' });
            G.text(r.v > 0 ? U.commas(r.v) : '-', fx + FW - 18, fy + 76 + i * 15, r.v > 0 ? '#80ffb0' : '#7080a0', { align: 'r', shadow: '#101840' });
          }
          if (tally.done && ((clearT >> 4) & 1)) G.text('PUSH SHOT', fx + FW / 2, fy + 164, '#ffffff', { align: 'c', shadow: '#000' });
        }
        ctx.globalAlpha = 1;
      }
      // ゲームオーバー / コンティニュー
      if (phase === 'over') {
        var oa = Math.min(1, overT / 60);
        ctx.fillStyle = 'rgba(0,0,0,' + (0.6 * oa) + ')'; ctx.fillRect(fx, fy, FW, FH);
        ctx.globalAlpha = oa;
        G.text('GAME OVER', fx + FW / 2, fy + 60, '#ff5060', { align: 'c', outline: '#300010' });
        if (overT >= 150) {
          var left = 3 - W.continues;
          G.text('CONTINUE?  ' + U.pad(Math.max(0, Math.ceil(contT / 60)), 2), fx + FW / 2, fy + 100, '#ffffff', { align: 'c', shadow: '#000' });
          var ys = [fy + 124, fy + 144];
          G.text(left > 0 ? 'はい（残り' + left + '回）' : 'はい（なし）', fx + FW / 2, ys[0], left > 0 ? (contSel === 0 ? '#ffe060' : '#a0a0c0') : '#505060', { align: 'c', shadow: '#000' });
          G.text('いいえ（タイトルへ）', fx + FW / 2, ys[1], contSel === 1 ? '#ffe060' : '#a0a0c0', { align: 'c', shadow: '#000' });
          G.text('~', fx + 30, ys[contSel], '#ffe060', {});
          G.text('SCORE ' + U.commas(W.score), fx + FW / 2, fy + 180, '#80e0ff', { align: 'c', shadow: '#000' });
        }
        ctx.globalAlpha = 1;
      }
      // ポーズ
      if (paused) {
        ctx.fillStyle = 'rgba(0,0,10,0.72)'; ctx.fillRect(0, 0, CFG.W, CFG.H);
        G.frame(60, 70, 200, 100, { bg: 'rgba(6,10,40,0.95)' });
        G.text('PAUSE', 160, 80, '#ffe060', { align: 'c', shadow: '#402000' });
        var labels = ['ゲームに戻る', 'ステージをやり直す', 'タイトルへ戻る'];
        for (var j = 0; j < 3; j++) {
          G.text(labels[j], 160, 98 + j * 18, j === pauseSel ? '#ffffff' : '#7a88b8', { align: 'c', shadow: '#000' });
          if (j === pauseSel) G.text('~', 76, 102 + j * 18 - 4, '#ffe060');
        }
      }
    },

    isPaused: function () { return paused; },
    getPhase: function () { return phase; },
    autoPause: function () {
      if (!paused && phase !== 'over' && phase !== 'clear') { paused = true; pauseSel = 0; A.duck(true); }
    }
  };
  EB.Game = Game;
})();
