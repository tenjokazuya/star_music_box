/* scenes.js ― シーン管理・設定・セーブ・起動/タイトル/選択/オプション/ハイスコア/ストーリー/エンディング */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB, CFG = EB.CFG, U = EB.U, G = EB.Gfx, A = EB.Audio, In = EB.Input, Spr = EB.Spr;
  var CW = CFG.W, CH = CFG.H;

  // ================= 設定 =================
  var Settings = EB.Settings = {
    bgm: 7, se: 8, amb: 6, lives: 2, scanline: false,
    load: function () {
      var s = EB.Platform.storage.get('settings', null);
      if (s) for (var k in Settings) if (typeof Settings[k] !== 'function' && s[k] !== undefined) Settings[k] = s[k];
      Settings.apply();
    },
    save: function () {
      EB.Platform.storage.set('settings', { bgm: Settings.bgm, se: Settings.se, amb: Settings.amb, lives: Settings.lives, scanline: Settings.scanline });
    },
    apply: function () {
      A.setVolume('bgm', Settings.bgm / 10); A.setVolume('se', Settings.se / 10); A.setVolume('amb', Settings.amb / 10);
      G.setScanline(Settings.scanline);
    }
  };

  // ================= セーブ（ハイスコア） =================
  var Save = EB.Save = {
    data: null,
    _load: function () {
      if (!Save.data) Save.data = EB.Platform.storage.get('save', { tables: {}, progress: 0 });
      return Save.data;
    },
    table: function (diff) {
      var d = Save._load();
      if (!d.tables[diff]) {
        d.tables[diff] = [
          { score: 100000, stage: 5, name: 'LUCA' }, { score: 60000, stage: 4, name: 'NOA' }, { score: 40000, stage: 3, name: 'ECHO' },
          { score: 20000, stage: 2, name: 'BEACON' }, { score: 10000, stage: 1, name: 'SIGNAL' }
        ];
      }
      return d.tables[diff];
    },
    hi: function (diff) { return Save.table(diff)[0].score; },
    // ランクイン順位（圏外は -1）
    rank: function (diff, score) {
      if (!score) return -1;
      var t = Save.table(diff);
      for (var i = 0; i < t.length; i++) if (score > t[i].score) return i;
      return -1;
    },
    insert: function (diff, score, stage, name) {
      var pos = Save.rank(diff, score);
      if (pos < 0) return -1;
      var t = Save.table(diff), nm = String(name || '').replace(/\s+$/, '');
      t.splice(pos, 0, { score: score, stage: stage || 1, name: nm || 'YOU' });
      t.length = 5;
      EB.Platform.storage.set('save', Save.data);
      return pos;
    },
    setProgress: function (idx) { var d = Save._load(); if (idx > d.progress) { d.progress = idx; EB.Platform.storage.set('save', d); } }
  };

  // ================= シーン管理 =================
  var BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  var Scene = EB.Scene = {
    scenes: {}, cur: null, name: '', f: { p: 0, dir: 0, dur: 1, next: null, params: null, t: 0 }, frame: 0,
    register: function (n, s) { Scene.scenes[n] = s; },
    start: function (n, params) { Scene._switch(n, params); Scene.f.p = 0; Scene.f.dir = 0; },
    go: function (n, dur, params) {
      if (Scene.f.dir === 1) return;
      Scene.f.dir = 1; Scene.f.dur = Math.max(1, dur || 20); Scene.f.t = 0; Scene.f.next = n; Scene.f.params = params;
    },
    fadeIn: function (dur) { Scene.f.dir = -1; Scene.f.dur = Math.max(1, dur || 20); Scene.f.t = 0; Scene.f.p = 1; },
    _switch: function (n, params) {
      if (Scene.cur && Scene.cur.exit) Scene.cur.exit();
      Scene.cur = Scene.scenes[n]; Scene.name = n;
      Scene.cur.enter && Scene.cur.enter(params || {});
    },
    update: function () {
      var f = Scene.f;
      Scene.frame++;
      if (f.dir === 1) {
        f.t++; f.p = Math.min(1, f.t / f.dur);
        if (f.t >= f.dur) {
          f.dir = 0; var n = f.next; f.next = null;
          Scene._switch(n, f.params);
          if (f.dir === 0) { f.dir = -1; f.t = 0; f.p = 1; f.dur = 20; }
        }
        // フェード中も背景は動かす
        if (Scene.cur.update && f.t < f.dur) Scene.cur.update(true);
        return;
      }
      if (f.dir === -1) { f.t++; f.p = Math.max(0, 1 - f.t / f.dur); if (f.t >= f.dur) { f.dir = 0; f.p = 0; } }
      Scene.cur.update(false);
    },
    draw: function (ctx) {
      Scene.cur.draw(ctx);
      var p = Scene.f.p;
      if (p > 0) {
        ctx.fillStyle = '#000';
        if (p >= 1) { ctx.fillRect(0, 0, CW, CH); return; }
        for (var by = 0; by < 30; by++) for (var bx = 0; bx < 40; bx++) {
          if (BAYER[(by & 7) * 8 + (bx & 7)] / 64 < p) ctx.fillRect(bx * 8, by * 8, 8, 8);
        }
      }
    }
  };

  // ---- 共通部品 ----
  function ring(ctx, cx, cy, r, color, a) {
    ctx.globalAlpha = a; ctx.fillStyle = color;
    var n = Math.max(16, Math.round(r * 1.7));
    for (var i = 0; i < n; i++) { var an = i / n * U.TAU; ctx.fillRect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 1, 1); }
    ctx.globalAlpha = 1;
  }
  function stars(seed) {
    var r = U.makeRng(seed), s = [];
    for (var i = 0; i < 100; i++) s.push({ x: r.int(0, CW - 1), y: r.int(0, CH - 1), l: i % 3, p: r.int(0, 80) });
    return {
      t: 0,
      update: function (m) { this.t++; for (var i = 0; i < s.length; i++) { s[i].y += (0.12 + s[i].l * 0.25) * (m || 1); if (s[i].y >= CH) s[i].y -= CH; } },
      draw: function (ctx) {
        var cols = ['#4a5a9a', '#8aa0e0', '#ffffff'];
        for (var i = 0; i < s.length; i++) {
          var tw = ((this.t + s[i].p) >> 4) % 6 === 0;
          ctx.fillStyle = tw ? '#ffffff' : cols[s[i].l];
          ctx.fillRect(s[i].x, Math.round(s[i].y), s[i].l === 2 ? 2 : 1, s[i].l === 2 ? 2 : 1);
        }
      }
    };
  }
  var bgGrad = null;
  function drawBackdrop(ctx) {
    if (!bgGrad) bgGrad = EB.BG.bandGradient(CW, CH, [[0, '#02030c'], [0.6, '#080e30'], [1, '#18286c']], 4);
    ctx.drawImage(bgGrad, 0, 0);
  }
  // 選択肢リスト（タップ対応）。戻り値: 決定した番号 / -1
  function listInput(sc, n, y0, dy, x0, x1) {
    if (In.pressed.up) { sc.sel = (sc.sel + n - 1) % n; A.se('cursor'); }
    if (In.pressed.down) { sc.sel = (sc.sel + 1) % n; A.se('cursor'); }
    var tap = In.takeTap();
    if (tap) {
      for (var i = 0; i < n; i++) if (tap.y >= y0 + i * dy - 3 && tap.y < y0 + i * dy + dy - 3 && tap.x >= x0 && tap.x <= x1) {
        if (sc.sel === i) return i;
        sc.sel = i; A.se('cursor'); return -1;
      }
    }
    if (In.pressed.ok) return sc.sel;
    return -1;
  }
  function drawList(ctx, items, sel, cx, y0, dy, t, opt) {
    opt = opt || {};
    for (var i = 0; i < items.length; i++) {
      var on = i === sel, y = y0 + i * dy;
      if (on) {
        var w = G.textW(items[i]) + 32;
        ctx.fillStyle = 'rgba(70,110,255,0.28)'; ctx.fillRect(Math.round(cx - w / 2), y - 3, w, dy - 2);
        ctx.fillStyle = '#8cb4ff'; ctx.fillRect(Math.round(cx - w / 2), y - 3, w, 1); ctx.fillRect(Math.round(cx - w / 2), y + dy - 6, w, 1);
        if ((t >> 3) & 1 || true) G.text('~', Math.round(cx - w / 2) + 5, y + 1, '#ffe060');
      }
      G.text(items[i], cx, y, on ? '#ffffff' : '#7a88b8', { align: 'c', shadow: '#000' });
    }
  }

  // ================= 起動画面 =================
  Scene.register('boot', {
    enter: function () { this.t = 0; this.st = stars(3); },
    update: function (fading) {
      this.t++; this.st.update(1);
      if (fading) return;
      var tap = In.takeTap();
      if (this.t > 20 && (In.anyPressed || tap)) {
        A.unlock(); A.se('start'); Scene.go('title', 28);
      }
    },
    draw: function (ctx) {
      ctx.fillStyle = '#02030c'; ctx.fillRect(0, 0, CW, CH);
      this.st.draw(ctx);
      var a = Math.min(1, this.t / 40);
      ctx.globalAlpha = a;
      var logo = EB.Logo('ECHO BEACON', 3, '#ffffff', '#6aa4ff');
      ctx.drawImage(logo.c, Math.round(CW / 2 - logo.w / 2), 70);
      G.text('― 遠き救難信号 ―', CW / 2, 106, '#a0c0ff', { align: 'c', shadow: '#102050' });
      if ((this.t >> 5) & 1 || this.t < 60) G.text(EB.touchUI ? 'TAP TO START' : 'PRESS START', CW / 2, 170, '#ffffff', { align: 'c', shadow: '#202060' });
      G.text(EB.touchUI ? 'タッチで開始します（音が出ます）' : 'Z / Enter / ゲームパッド / クリック', CW / 2, 190, '#6a7ab0', { align: 'c' });
      ctx.globalAlpha = 1;
    }
  });

  // ================= タイトル =================
  var TITLE_ITEMS = ['ゲームスタート', 'ストーリー', 'ハイスコア', 'オプション'];
  Scene.register('title', {
    enter: function () {
      this.t = 0; this.sel = 0; this.st = stars(7);
      A.play('title', { fadeIn: 1.0 }); A.ambient('space');
      this.ships = [];
    },
    update: function (fading) {
      this.t++; this.st.update(1);
      if (fading) return;
      if (this.t % 500 === 250) this.ships.push({ x: U.fxRng.range(30, 290), y: CH + 20, v: U.fxRng.range(1.4, 2.4) });
      for (var i = this.ships.length - 1; i >= 0; i--) { this.ships[i].y -= this.ships[i].v; if (this.ships[i].y < -30) this.ships.splice(i, 1); }
      var r = listInput(this, 4, 148, 20, 80, 240);
      if (r >= 0) {
        A.se('ok');
        if (r === 0) Scene.go('select', 20);
        else if (r === 1) Scene.go('story', 24);
        else if (r === 2) Scene.go('scores', 20);
        else Scene.go('options', 20);
      }
    },
    draw: function (ctx) {
      drawBackdrop(ctx);
      this.st.draw(ctx);
      // 遠くの青い星（地球）と、そこへ向かう信号リング
      var ep = Spr.earth || (Spr.earth = EB.Planet(22, { seed: 3, cloud: true, light: [-0.7, -0.5] }));
      ctx.drawImage(ep.c, 262, 24);
      var t = this.t;
      for (var k = 0; k < 3; k++) {
        var p = ((t + k * 80) % 240) / 240;
        ring(ctx, 160, 90, 10 + p * 190, '#5a8cff', (1 - p) * 0.55);
      }
      this.ships.forEach(function (s) {
        var sp = Spr.player[1];
        ctx.drawImage(Spr.flame[(t >> 1) % 3].c, Math.round(s.x - 7), Math.round(s.y + 9)); ctx.drawImage(Spr.flame[(t >> 1) % 3].c, Math.round(s.x), Math.round(s.y + 9));
        ctx.drawImage(sp.c, Math.round(s.x - sp.ox), Math.round(s.y - sp.oy));
      });
      // ロゴ
      var drop = t < 40 ? (1 - U.easeOutBack(Math.min(1, t / 40))) * -90 : 0;
      var logo = EB.Logo('ECHO BEACON', 4, '#ffffff', '#5a9cff');
      ctx.drawImage(logo.c, Math.round(CW / 2 - logo.w / 2), Math.round(46 + drop));
      var sa = Math.min(1, Math.max(0, (t - 30) / 30));
      G.text('― 遠き救難信号 ―', CW / 2, 96, '#b8d0ff', { align: 'c', shadow: '#10204a', a: sa });
      if (t > 40) {
        ctx.globalAlpha = Math.min(1, (t - 40) / 20);
        drawList(ctx, TITLE_ITEMS, this.sel, CW / 2, 148, 20, t);
        ctx.globalAlpha = 1;
      }
      G.text('VER ' + CFG.VERSION, 6, 228, '#405080');
      if (EB.Cheat.invincible) G.text('INVINCIBLE', 6, 216, ((t >> 4) & 1) ? '#ffe060' : '#ffffff', { shadow: '#402000' });
      G.text('HI ' + U.commas(EB.Save.hi('normal')), CW - 6, 228, '#8090c0', { align: 'r' });
    }
  });

  // ================= 難易度選択 =================
  var DIFF_DESC = {
    easy: ['弾が遅く数少なめ', 'はじめての宇宙へ'],
    normal: ['標準的な難易度', '旅の基準の設定'],
    hard: ['弾が速く数も多い', '覚悟ある者のみ']
  };
  // 隠しコマンド（左左右左右左右右）で無敵モードを切り替える。正式仕様：難易度選択画面なら、どの難易度にカーソルがあっても入力できる。
  // 上下の入力・3秒以上の間隔でリセット
  var CHEAT_CODE = 'LLRLRLRR';
  function cheatInput(sc) {
    var P = In.pressed, k = P.left ? 'L' : (P.right ? 'R' : '');
    if (P.up || P.down || (sc.clast !== undefined && Scene.frame - sc.clast > 180)) sc.cbuf = '';
    if (!k) return;
    sc.clast = Scene.frame;
    sc.cbuf = (sc.cbuf + k).slice(-CHEAT_CODE.length);
    if (sc.cbuf === CHEAT_CODE) {
      sc.cbuf = '';
      EB.Cheat.invincible = !EB.Cheat.invincible;
      sc.msgOn = EB.Cheat.invincible; sc.msgT = 150; sc.flashT = 14;
      A.se(EB.Cheat.invincible ? 'cheat' : 'cheatOff');
    }
  }

  Scene.register('select', {
    enter: function () { this.t = 0; this.sel = 1; this.st = stars(9); this.cbuf = ''; this.msgT = 0; this.flashT = 0; },
    update: function (fading) {
      this.t++; this.st.update(1);
      if (this.msgT > 0) this.msgT--;
      if (this.flashT > 0) this.flashT--;
      if (fading) return;
      if (In.pressed.cancel) { A.se('cancel'); Scene.go('title', 16); return; }
      var r = listInput(this, 3, 90, 38, 30, 290);
      cheatInput(this);
      if (r >= 0) {
        A.se('start'); A.stop(0.8);
        Scene.go('game', 40, { diff: CFG.DIFF_ORDER[r] });
      }
    },
    draw: function (ctx) {
      drawBackdrop(ctx); this.st.draw(ctx);
      G.text('難易度を選んでください', CW / 2, 34, '#ffe060', { align: 'c', shadow: '#402000' });
      G.text('DIFFICULTY', CW / 2, 52, '#8cb4ff', { align: 'c' });
      for (var i = 0; i < 3; i++) {
        var k = CFG.DIFF_ORDER[i], d = CFG.DIFF[k], on = i === this.sel, y = 90 + i * 38;
        G.frame(40, y - 6, 240, 34, { bg: on ? 'rgba(40,70,190,0.7)' : 'rgba(8,12,40,0.8)', b1: on ? '#ffe060' : '#5a7acc', b2: on ? '#a07010' : '#1c2c70' });
        G.text(d.name, 54, y, on ? '#ffffff' : '#8090c0', { shadow: '#000' });
        G.text(d.label, 54, y + 12, on ? '#ffe8a0' : '#6070a0', {});
        G.text(DIFF_DESC[k][0], 130, y, on ? '#ffffff' : '#7080b0', {});
        G.text(DIFF_DESC[k][1], 130, y + 12, on ? '#c0d0ff' : '#6070a0', {});
        G.text('HI', 256, y, '#ffe060', { align: 'r' });
        G.text(U.pad(EB.Save.hi(k), 7, ' '), 276, y + 12, '#ffffff', { align: 'r' });
        if (on && ((this.t >> 3) & 1)) G.text('~', 44, y + 8, '#ffe060');
      }
      G.text(EB.touchUI ? 'タップで決定 / BOMBで戻る' : 'Z:決定   X:戻る', CW / 2, 216, '#6a7ab0', { align: 'c' });
      if (this.flashT > 0) {
        ctx.globalAlpha = this.flashT / 14 * 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CW, CH); ctx.globalAlpha = 1;
      }
      if (this.msgT > 0) {
        var ma = Math.min(1, this.msgT / 20);
        if (this.msgOn) {
          G.text('INVINCIBLE MODE ON', CW / 2, 8, ((this.msgT >> 3) & 1) ? '#ffe060' : '#ffffff', { align: 'c', outline: '#402000', a: ma });
        } else {
          G.text('INVINCIBLE MODE OFF', CW / 2, 8, '#a0a8d0', { align: 'c', shadow: '#000', a: ma });
        }
      }
      if (EB.Cheat.invincible) G.text('INVINCIBLE', 6, 228, '#ffe060', { shadow: '#402000' });
    }
  });

  // ================= オプション =================
  Scene.register('options', {
    enter: function () { this.t = 0; this.sel = 0; this.st = stars(13); },
    exit: function () { Settings.save(); },
    update: function (fading) {
      this.t++; this.st.update(1);
      if (fading) return;
      var N = 8;
      if (In.pressed.cancel) { A.se('cancel'); Scene.go('title', 16); return; }
      if (In.pressed.up) { this.sel = (this.sel + N - 1) % N; A.se('cursor'); }
      if (In.pressed.down) { this.sel = (this.sel + 1) % N; A.se('cursor'); }
      var tap = In.takeTap();
      if (tap) {
        for (var i = 0; i < N; i++) if (Math.abs(tap.y - (60 + i * 18 + 5)) < 9) {
          if (tap.x > 190 && i < 5) { In.pressed.right = true; } else if (tap.x > 130 && tap.x <= 190 && i < 5) { In.pressed.left = true; }
          else if (i >= 5) In.pressed.ok = true;
          this.sel = i;
        }
      }
      var d = (In.pressed.right ? 1 : 0) - (In.pressed.left ? 1 : 0), s = this.sel;
      if (d !== 0 || (In.pressed.ok && s >= 4)) {
        if (s === 0) { Settings.bgm = U.clamp(Settings.bgm + d, 0, 10); Settings.apply(); A.se('cursor'); }
        else if (s === 1) { Settings.se = U.clamp(Settings.se + d, 0, 10); Settings.apply(); A.se('ok'); }
        else if (s === 2) { Settings.amb = U.clamp(Settings.amb + d, 0, 10); Settings.apply(); A.se('cursor'); }
        else if (s === 3) { Settings.lives = U.clamp(Settings.lives + d, 0, 5); A.se('cursor'); }
        else if (s === 4) { Settings.scanline = d !== 0 ? !Settings.scanline : !Settings.scanline; Settings.apply(); A.se('ok'); }
        else if (s === 5) { A.se('ok'); EB.Platform.isFullscreen() ? EB.Platform.exitFullscreen() : EB.Platform.requestFullscreen(); }
        else if (s === 6) { A.se('ok'); Scene.go('soundtest', 16); }
        else if (s === 7) { A.se('cancel'); Scene.go('title', 16); }
      } else if (In.pressed.ok && s < 4) { A.se('cursor'); }
    },
    draw: function (ctx) {
      drawBackdrop(ctx); this.st.draw(ctx);
      G.text('OPTION', CW / 2, 26, '#ffe060', { align: 'c', shadow: '#402000' });
      G.text('オプション', CW / 2, 42, '#8cb4ff', { align: 'c' });
      var labels = ['BGM 音量', 'SE 音量', '環境音 音量', '初期残機', 'スキャンライン', '全画面表示', 'サウンドテスト', '戻る'];
      var vals = [Settings.bgm, Settings.se, Settings.amb, Settings.lives, Settings.scanline, EB.Platform.isFullscreen(), null, null];
      G.frame(40, 52, 240, 158, { bg: 'rgba(8,12,40,0.85)' });
      for (var i = 0; i < 8; i++) {
        var y = 60 + i * 18, on = i === this.sel;
        if (on) { ctx.fillStyle = 'rgba(70,110,255,0.3)'; ctx.fillRect(46, y - 3, 228, 16); G.text('~', 50, y + 1, '#ffe060'); }
        G.text(labels[i], 62, y, on ? '#ffffff' : '#8090c0', { shadow: '#000' });
        if (i < 3) {
          for (var k = 0; k < 10; k++) { ctx.fillStyle = k < vals[i] ? (on ? '#ffe060' : '#a08030') : '#202850'; ctx.fillRect(160 + k * 10, y + 1, 8, 7); }
          G.text(String(vals[i]), 268, y, '#ffffff', { align: 'r' });
        } else if (i === 3) { G.text('< ' + vals[i] + ' >', 215, y, '#ffffff', { align: 'c', shadow: '#000' }); }
        else if (i === 4 || i === 5) { G.text(vals[i] ? 'ON' : 'OFF', 215, y, vals[i] ? '#80ff90' : '#ff8080', { align: 'c', shadow: '#000' }); }
      }
      G.text('←→:変更  X:戻る', CW / 2, 220, '#6a7ab0', { align: 'c' });
    }
  });

  // ================= サウンドテスト =================
  var ST_SE = [
    ['ショット', 'shot'], ['敵に命中', 'hit'], ['ボスに命中', 'hitBoss'], ['爆発・小', 'exp1'], ['爆発・中', 'exp2'], ['爆発・大', 'exp3'],
    ['中ボス撃破', 'midDie'], ['大ボス撃破', 'bossDie'], ['ボス断末魔', 'bossDying'], ['自機被弾', 'pdie'], ['ボム', 'bomb'],
    ['レーザー予告', 'laserWarn', 0.75], ['レーザー', 'laser', 0.6], ['ボス警告', 'warning'], ['ボス登場', 'bossIn'], ['フェーズ移行', 'phase'],
    ['アイテム', 'item'], ['パワーアップ', 'power'], ['1UP', 'oneup'], ['ワープ', 'warp'], ['決定', 'ok'], ['キュピーン', 'cheat']
  ];
  var ST_BGM = [
    ['タイトル', 'title'], ['ステージ1', 'st1'], ['ステージ2', 'st2'], ['ステージ3', 'st3'], ['ステージ4', 'st4'], ['ステージ5', 'st5'],
    ['中ボス', 'midboss'], ['ボス1', 'boss1'], ['ボス2', 'boss2'], ['ボス3', 'boss3'], ['ボス4', 'boss4'], ['ボス5(最終)', 'boss5'],
    ['会話', 'story'], ['エンディング(光)', 'ending'], ['エンディング(闇)', 'ending_dark'], ['ゲームオーバー', 'gameover'], ['ステージクリア', 'clear']
  ];
  var ST_ITEMS = [];
  ST_SE.forEach(function (e) { ST_ITEMS.push({ type: 'SE', label: e[0], id: e[1], arg: e[2] }); });
  ST_BGM.forEach(function (e) { ST_ITEMS.push({ type: 'BGM', label: e[0], id: e[1] }); });
  ST_ITEMS.push({ type: 'STOP', label: 'BGMを止める' });
  Scene.register('soundtest', {
    enter: function () { this.t = 0; this.sel = 0; this.top = 0; this.lv = 0; this.pk = 0; this.st = stars(23); this.last = ''; },
    exit: function () { A.play('title', { fadeIn: 0.5 }); },
    play: function (it) {
      if (it.type === 'SE') { A.se(it.id, it.arg); this.last = it.label; }
      else if (it.type === 'BGM') { A.play(it.id, { restart: true, fadeOut: 0.2 }); this.last = it.label; }
      else { A.stop(0.3); this.last = ''; }
    },
    update: function (fading) {
      this.t++; this.st.update(1);
      var lv = A.level(); this.lv = Math.max(this.lv * 0.9, lv); this.pk = Math.max(this.pk - 0.006, lv);
      if (fading) return;
      var N = ST_ITEMS.length, ROWS = 10;
      if (In.pressed.cancel) { A.se('cancel'); Scene.go('options', 16); return; }
      if (In.pressed.up) { this.sel = (this.sel + N - 1) % N; A.se('cursor'); }
      if (In.pressed.down) { this.sel = (this.sel + 1) % N; A.se('cursor'); }
      if (In.pressed.left) { this.sel = Math.max(0, this.sel - ROWS); A.se('cursor'); }
      if (In.pressed.right) { this.sel = Math.min(N - 1, this.sel + ROWS); A.se('cursor'); }
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel >= this.top + ROWS) this.top = this.sel - ROWS + 1;
      var tap = In.takeTap(), ok = In.pressed.ok;
      if (tap) {
        for (var i = 0; i < ROWS; i++) if (Math.abs(tap.y - (46 + i * 14 + 6)) < 7 && this.top + i < N) { this.sel = this.top + i; ok = true; }
        if (tap.y > 200) { A.se('cancel'); Scene.go('options', 16); return; }
      }
      if (ok) this.play(ST_ITEMS[this.sel]);
    },
    draw: function (ctx) {
      drawBackdrop(ctx); this.st.draw(ctx);
      G.text('SOUND TEST', CW / 2, 14, '#ffe060', { align: 'c', shadow: '#402000' });
      G.frame(30, 30, 260, 158, { bg: 'rgba(8,12,40,0.88)' });
      var ROWS = 10;
      for (var r = 0; r < ROWS; r++) {
        var idx = this.top + r;
        if (idx >= ST_ITEMS.length) break;
        var it = ST_ITEMS[idx], y = 46 + r * 14, on = idx === this.sel;
        if (on) { ctx.fillStyle = 'rgba(70,110,255,0.3)'; ctx.fillRect(34, y - 3, 252, 14); G.text('~', 38, y + 1, '#ffe060'); }
        var tc = it.type === 'SE' ? '#80d8ff' : (it.type === 'BGM' ? '#ffb070' : '#a0a8d0');
        G.text(it.type === 'STOP' ? '' : it.type, 50, y + 1, tc, {});
        G.text(it.label, 82, y, on ? '#ffffff' : '#8090c0', { shadow: '#000' });
      }
      if (this.top > 0) G.text('^', 270, 40, '#ffe060');
      if (this.top + ROWS < ST_ITEMS.length) G.text('v', 270, 176, '#ffe060');
      // 出力メーター
      G.text('LEVEL', 30, 196, '#6a7ab0');
      ctx.fillStyle = '#101838'; ctx.fillRect(68, 195, 222, 8);
      var w = Math.round(222 * Math.min(1, this.lv));
      for (var x = 0; x < w; x += 2) { var q = x / 222; ctx.fillStyle = q < 0.6 ? '#40e070' : (q < 0.85 ? '#ffe060' : '#ff5050'); ctx.fillRect(68 + x, 195, 2, 8); }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(68 + Math.round(222 * Math.min(1, this.pk)), 195, 2, 8);
      G.text('↑↓:選択  Z:再生  X:戻る', CW / 2, 220, '#6a7ab0', { align: 'c' });
    }
  });

  // ================= ハイスコア =================
  Scene.register('scores', {
    enter: function () { this.t = 0; this.tab = 1; this.st = stars(17); },
    update: function (fading) {
      this.t++; this.st.update(1);
      if (fading) return;
      if (In.pressed.cancel || In.pressed.ok) { A.se('cancel'); Scene.go('title', 16); return; }
      if (In.pressed.left) { this.tab = (this.tab + 2) % 3; A.se('cursor'); }
      if (In.pressed.right) { this.tab = (this.tab + 1) % 3; A.se('cursor'); }
      var tap = In.takeTap();
      if (tap) { if (tap.y < 70) { this.tab = (this.tab + 1) % 3; A.se('cursor'); } else { A.se('cancel'); Scene.go('title', 16); } }
    },
    draw: function (ctx) {
      drawBackdrop(ctx); this.st.draw(ctx);
      G.text('HIGH SCORES', CW / 2, 20, '#ffe060', { align: 'c', shadow: '#402000' });
      var k = CFG.DIFF_ORDER[this.tab], tb = EB.Save.table(k);
      for (var i = 0; i < 3; i++) {
        var kk = CFG.DIFF_ORDER[i], on = i === this.tab;
        G.text(CFG.DIFF[kk].name, 90 + i * 70, 44, on ? '#ffffff' : '#5a6aa0', { align: 'c', shadow: on ? '#102060' : null });
        if (on) { ctx.fillStyle = '#ffe060'; ctx.fillRect(70 + i * 70, 54, 40, 1); }
      }
      G.frame(50, 66, 220, 120, { bg: 'rgba(8,12,40,0.85)' });
      for (var j = 0; j < 5; j++) {
        var y = 78 + j * 20, col = j === 0 ? '#ffe060' : '#ffffff';
        G.text(String(j + 1), 64, y, col, { shadow: '#000' });
        G.text(tb[j].name, 84, y, col, { shadow: '#000' });
        G.text('ST' + tb[j].stage, 160, y, '#80c0ff', {});
        G.text(U.pad(tb[j].score, 8, ' '), 256, y, col, { align: 'r', shadow: '#000' });
      }
      G.text('←→:難易度   Z:戻る', CW / 2, 212, '#6a7ab0', { align: 'c' });
    }
  });

  // ================= ストーリー =================
  var STORY = [
    '宇宙のどこかで、ひとつの命令が',
    '終わりなく繰り返されている。',
    '',
    '「知的生命体を殲滅せよ」',
    '',
    '意思を持たない機械生命体は、',
    'マザー機の命令に従い、',
    '母艦と子機で編隊を組んで星々を巡る。',
    '',
    '子機が痕跡を見つけ、母艦が解析し、',
    'マザー機が艦隊をワープで送り込む。',
    'その圧倒的な物量に、',
    'いくつもの文明が声を失った。',
    '',
    'パイロット「ルカ」は、星々から届く',
    '救難信号に応え、母星を旅立つ。',
    '',
    '——それでも、いつも、あと一歩。',
    '',
    '',
    'まだ助けを求めている、',
    '誰かのために。'
  ];
  Scene.register('story', {
    enter: function () { this.t = 0; this.st = stars(21); A.play('story', { fadeIn: 1.0 }); },
    update: function (fading) {
      this.t++; this.st.update(0.6);
      if (fading) return;
      var tap = In.takeTap();
      if (In.pressed.cancel || In.pressed.ok || tap || this.t > 60 * 40) { A.se('cancel'); Scene.go('title', 20); }
    },
    draw: function (ctx) {
      drawBackdrop(ctx); this.st.draw(ctx);
      var y0 = CH - this.t * 0.55;
      for (var i = 0; i < STORY.length; i++) {
        var y = y0 + i * 18;
        if (y < -14 || y > CH) continue;
        var a = Math.min(1, Math.max(0, Math.min(y / 30, (CH - y) / 30)));
        G.text(STORY[i], CW / 2, Math.round(y), i === 3 || i === 17 ? '#ffe060' : '#e0e8ff', { align: 'c', shadow: '#10204a', a: a });
      }
      G.text('Z:スキップ', CW - 6, 228, '#405080', { align: 'r' });
    }
  });

  // ================= ネームエントリー =================
  var NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.! ';
  Scene.register('name', {
    enter: function (p) {
      this.p = p; this.t = 0; this.st = stars(41); this.pos = 0; this.idx = [0, 0, 0, 36, 36, 36]; this.done = false;
      A.play('story', { fadeIn: 1 });
    },
    update: function (fading) {
      this.t++; this.st.update(1);
      if (fading || this.done) return;
      var n = NAME_CHARS.length, i;
      if (In.pressed.up) { this.idx[this.pos] = (this.idx[this.pos] + 1) % n; A.se('cursor'); }
      if (In.pressed.down) { this.idx[this.pos] = (this.idx[this.pos] + n - 1) % n; A.se('cursor'); }
      if (In.pressed.right) { this.pos = Math.min(6, this.pos + 1); A.se('cursor'); }
      if (In.pressed.left) { this.pos = Math.max(0, this.pos - 1); A.se('cursor'); }
      var tap = In.takeTap(), okNow = In.pressed.ok;
      if (tap) {
        if (tap.y > 165) { this.pos = 6; okNow = true; }
        else {
          for (i = 0; i < 6; i++) if (tap.x > 77 + i * 26 && tap.x < 99 + i * 26) {
            this.pos = i;
            if (tap.y < 125) { this.idx[i] = (this.idx[i] + 1) % n; A.se('cursor'); }
            else { this.idx[i] = (this.idx[i] + n - 1) % n; A.se('cursor'); }
          }
        }
      }
      if (In.pressed.cancel && this.pos > 0) { this.pos--; A.se('cancel'); }
      if (okNow) {
        if (this.pos < 6) { this.pos++; A.se('ok'); }
        else {
          var name = '';
          for (var k = 0; k < 6; k++) name += NAME_CHARS.charAt(this.idx[k]);
          EB.Save.insert(this.p.diff, this.p.score, this.p.stage, name);
          A.se('start'); this.done = true; Scene.go('scores', 30);
        }
      }
    },
    draw: function (ctx) {
      drawBackdrop(ctx); this.st.draw(ctx);
      G.text('NEW RECORD!', CW / 2, 30, '#ffe060', { align: 'c', outline: '#402000' });
      G.text(CFG.DIFF[this.p.diff].name + '  RANK ' + (this.p.pos + 1), CW / 2, 50, '#80e0ff', { align: 'c', shadow: '#000' });
      G.text(U.commas(this.p.score), CW / 2, 66, '#ffffff', { align: 'c', shadow: '#000' });
      G.text('名前を入力してください', CW / 2, 88, '#c0d0ff', { align: 'c' });
      for (var i = 0; i < 6; i++) {
        var x = 80 + i * 26, on = i === this.pos;
        ctx.fillStyle = on ? 'rgba(70,110,255,0.45)' : 'rgba(20,30,90,0.6)'; ctx.fillRect(x - 3, 108, 22, 30);
        ctx.fillStyle = on ? '#ffe060' : '#3a4a9a'; ctx.fillRect(x - 3, 138, 22, 2);
        var ch = NAME_CHARS.charAt(this.idx[i]);
        if (ch !== ' ') {
          var big = EB.Logo(ch, 2, '#ffffff', on ? '#ffe060' : '#8cb4ff');
          ctx.drawImage(big.c, Math.round(x + 8 - big.w / 2), 110);
        }
        if (on && ((this.t >> 3) & 1)) { G.text('^', x + 8, 98, '#ffe060', { align: 'c' }); G.text('v', x + 8, 144, '#ffe060', { align: 'c' }); }
      }
      var okOn = this.pos >= 6;
      G.frame(120, 170, 80, 22, { bg: okOn ? 'rgba(70,110,255,0.7)' : 'rgba(8,12,40,0.8)', b1: okOn ? '#ffe060' : '#5a7acc' });
      G.text('OK', CW / 2, 176, okOn ? '#ffffff' : '#8090c0', { align: 'c', shadow: '#000' });
      G.text('上下:文字 左右:位置 Z:決定 X:戻る', CW / 2, 212, '#6a7ab0', { align: 'c' });
    }
  });

  // ================= エンディング =================
  var CREDITS = [
    ['ECHO BEACON', '― 遠き救難信号 ―'], ['', ''],
    ['ルカ', 'パイロット'], ['ノア', 'ナビゲーションAI'], ['', ''],
    ['PRODUCED BY', '天上　和哉'], ['', ''], ['', ''],
    ['PLAYED BY', 'あなた'], ['', ''], ['THE END', '']
  ];
  var BLIPS = [[58, 34], [128, 18], [214, 42], [262, 24], [170, 64], [96, 70]];   // 暗い結末で瞬く残存機の反応
  Scene.register('ending', {
    enter: function (p) {
      this.p = p || {}; this.t = 0; this.age = 0; this.dep = 0; this.phase = 0; this.st = stars(31); this.ey = 340; this.cy = CH;
      // 分岐：NORMAL以上かつノーコンティニュー → 光のエンディング（地球が見える）／それ以外 → 暗いエンディング（地球は現れない）
      // p.good は動作確認用の強制指定
      this.good = this.p.good !== undefined ? !!this.p.good : EB.isTrueEnding(this.p.diff, this.p.continues);
      this.bgm = this.good ? 'ending' : 'ending_dark';
      A.stop(0.5); A.stopAmbient(1);
      this.rank = (this.p.continues || 0) > 0 ? 'C' : ((this.p.deaths || 0) === 0 ? 'S' : ((this.p.deaths || 0) < 4 ? 'A' : 'B'));
      this.pos = EB.Save.rank(this.p.diff || 'normal', this.p.score || 0);
      this.earth = this.good ? EB.Planet(72, { seed: 3, cloud: true, light: [-0.65, -0.5] }) : null;
    },
    update: function (fading) {
      this.t++; this.age++;
      // 暗い結末：星の流れは遅く、ルカが出発すると加速していく
      this.st.update(this.good ? 0.4 : 0.15 + Math.min(this.dep * 0.03, 5));
      if (!this.good && this.phase >= 2) this.dep++;
      if (this.t === 30 && this.phase === 0) A.play(this.bgm, { fadeIn: 2 });
      if (this.phase === 0) {
        if (this.good && this.ey > 190) this.ey -= 0.35;
        if (this.t === 150) { this.phase = 1; EB.Dialogue.start(this.good ? 'ending' : 'ending_dark', function () { EB.Scene.cur.phase = 2; EB.Scene.cur.t = 0; }); }
      } else if (this.phase === 1) { EB.Dialogue.update(); }
      else if (this.phase === 2) {
        this.cy -= 0.45;
        var tap = In.takeTap();
        if (this.t > 60 * 22 || (this.t > 60 && (In.pressed.cancel))) { this.phase = 3; this.t = 0; }
      } else if (this.phase === 3) {
        var tap2 = In.takeTap();
        if (this.t > 120 && (In.pressed.ok || tap2)) {
          A.se('ok');
          if (this.pos >= 0) Scene.go('name', 40, { diff: this.p.diff || 'normal', score: this.p.score || 0, stage: 5, pos: this.pos });
          else Scene.go('title', 40);
        }
      }
    },
    draw: function (ctx) {
      drawBackdrop(ctx);
      if (!this.good) { ctx.fillStyle = 'rgba(0,0,10,0.4)'; ctx.fillRect(0, 0, CW, CH); }   // 暗い結末は背景をさらに沈める
      this.st.draw(ctx);
      var e = this.earth;
      if (this.good) {
        // 後光
        for (var k = 3; k > 0; k--) { ctx.globalAlpha = 0.06 * k; ctx.fillStyle = '#7ab4ff'; var r = 80 + (4 - k) * 5; ctx.fillRect(CW / 2 - r, Math.round(this.ey - 10 - (4 - k) * 2), r * 2, 4); }
        ctx.globalAlpha = 1;
        ctx.drawImage(e.c, Math.round(CW / 2 - e.ox), Math.round(this.ey - e.oy));
      } else if (this.dep > 0) {
        // 暗い結末：出発すると、遠くに残存機の赤い反応が瞬く（地球は現れない）
        var ba = Math.min(1, this.dep / 90);
        for (var q = 0; q < BLIPS.length; q++) {
          var pu = 0.5 + 0.5 * Math.sin(this.age * 0.08 + q * 1.7);
          ctx.fillStyle = '#ff3040';
          ctx.globalAlpha = ba * 0.2 * pu; ctx.fillRect(BLIPS[q][0] - 1, BLIPS[q][1] - 1, 4, 4);
          ctx.globalAlpha = ba * (0.35 + 0.65 * pu); ctx.fillRect(BLIPS[q][0], BLIPS[q][1], 2, 2);
        }
        ctx.globalAlpha = 1;
      }
      // ルカの機体（暗い結末：出発までは噴射を絞って漂い、出発で一気に加速して画面の上へ消える）
      var sx = CW / 2 + Math.sin(this.age * 0.02) * 6, sy = 130 - Math.min(this.age, 150) * 0.1 - this.dep * this.dep * 0.004;
      ctx.globalAlpha = (this.good || this.dep > 0) ? 1 : 0.4;
      ctx.drawImage(Spr.flame[(this.age >> 1) % 3].c, Math.round(sx - 7), Math.round(sy + 9)); ctx.drawImage(Spr.flame[(this.age >> 1) % 3].c, Math.round(sx), Math.round(sy + 9));
      ctx.globalAlpha = 1;
      ctx.drawImage(Spr.player[1].c, Math.round(sx - Spr.player[1].ox), Math.round(sy - Spr.player[1].oy));
      if (this.phase === 1) EB.Dialogue.draw(ctx);
      if (this.phase === 2) {
        ctx.fillStyle = 'rgba(0,0,16,0.55)'; ctx.fillRect(0, 0, CW, CH);
        for (var i = 0; i < CREDITS.length; i++) {
          var y = Math.round(this.cy + i * 26);
          if (y < -16 || y > CH) continue;
          var a = Math.min(1, Math.max(0, Math.min(y / 24, (CH - y) / 24)));
          var big = i === 0 || i === CREDITS.length - 1;
          G.text(CREDITS[i][0], CW / 2, y, big ? '#ffe060' : '#ffffff', { align: 'c', shadow: '#102050', a: a });
          if (CREDITS[i][1]) G.text(CREDITS[i][1], CW / 2, y + 12, '#a0c0ff', { align: 'c', a: a });
        }
      }
      if (this.phase === 3) {
        var fa = Math.min(1, this.t / 40);
        ctx.fillStyle = 'rgba(0,0,16,' + (0.7 * fa) + ')'; ctx.fillRect(0, 0, CW, CH);
        ctx.globalAlpha = fa;
        // 通常エンディングでは、特別エンディングの条件（NORMAL 以上＋ノーコンティニュー）だけをぼかして示す。そのぶん上の2行を詰める
        G.text('THE END', CW / 2, this.good ? 36 : 26, '#ffe060', { align: 'c', outline: '#402000' });
        G.text('救難信号は、もう誰からも届いていない。', CW / 2, this.good ? 60 : 48, '#c0d8ff', { align: 'c', shadow: '#10204a' });
        if (!this.good) G.text('NORMAL以上・ノーコンティニューで……？', CW / 2, 68, '#5a6aa0', { align: 'c' });
        G.frame(70, 88, 180, 96, { bg: 'rgba(6,10,40,0.9)' });
        G.text('RESULT', CW / 2, 96, '#80e0ff', { align: 'c' });
        G.text('SCORE', 84, 114, '#ffffff'); G.text(U.commas(this.p.score || 0), 236, 114, '#ffe060', { align: 'r' });
        G.text('GRAZE', 84, 128, '#ffffff'); G.text(U.commas(this.p.graze || 0), 236, 128, '#a0ffb0', { align: 'r' });
        G.text('MISS', 84, 142, '#ffffff'); G.text(String(this.p.deaths || 0), 236, 142, '#ff9090', { align: 'r' });
        G.text('CONTINUE', 84, 156, '#ffffff'); G.text(String(this.p.continues || 0), 236, 156, '#ff9090', { align: 'r' });
        G.text('RANK', 84, 170, '#ffffff'); G.text(this.rank, 236, 170, this.rank === 'S' ? '#ffe060' : '#ffffff', { align: 'r', shadow: '#000' });
        if (this.pos >= 0) G.text('NEW RECORD! ' + (this.pos + 1) + '位', CW / 2, 196, '#ff80c0', { align: 'c', shadow: '#000' });
        if (this.t > 120 && ((this.t >> 4) & 1)) G.text('PUSH Z', CW / 2, 216, '#ffffff', { align: 'c' });
        ctx.globalAlpha = 1;
      }
    }
  });

  // ゲーム本体は game.js の EB.Game を登録
  Scene.register('game', EB.Game);
})();
