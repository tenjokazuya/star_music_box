(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * アプリ本体: 画面遷移（起動→タイトル→ステージ選択→プレイ→クリア→ワールドクリア→エンディング）を統括し、
   * キャンバス・盤面表示・入力・セッション・セーブ・UI・音の窓口をつなぐ。
   * 画面の流れの仕様: managements/project/game-design.md §2・§7。
   *
   * 開発用のURLパラメータ:
   *   ?stage=1-3        起動画面とタイトルを飛ばして、そのステージを直接遊ぶ
   *   ?screen=select    起動画面を飛ばしてその画面へ（title / select / worldclear / ending）
   *   ?world=3          ステージ選択やワールドクリアで使うワールド番号
   *   ?unlock=all       全ステージを開放する（確認用）
   */

  var CONFIG = {
    CLEAR_PANEL_DELAY_MS: 700,   // 最後のほしのこが帰ってからクリアのパネルを出すまで
    MESSAGE_MS: 2600,            // 一時メッセージの表示時間
    STUCK_CHECK: { maxStates: 30000, maxMs: 40 },   // 詰み判定・ヒントの、すぐ答える探索の上限（操作を妨げない短さ）
    // 大きな盤面で間に合わないときは、画面を止めないよう小分けにして探し続ける（SLICE ずつ、GAP あけて）
    SEARCH_SLICE_MS: 10,
    SEARCH_GAP_MS: 24,
    SEARCH_MAX_MS: 15000,
    SEARCH_MAX_STATES: 500000,
    ENDING_LINE_MS: 4800,        // エンディングの文が切り替わる間隔
    BG_FADE_MS: 700,             // 背景のクロスフェード
    // 横長で背の低い画面（スマートフォンの横持ち）。src/css/style.css の同名のメディアクエリと必ず同じにする
    COMPACT_QUERY: '(max-height: 500px) and (min-width: 560px)',
  };

  function create() {
    var doc = root.document;
    var Engine = Orgel.Engine;
    var Solver = Orgel.Solver;
    var Session = Orgel.Session;
    var Text = Orgel.Text;
    var Sound = Orgel.Sound;
    var levels = Orgel.Levels;
    var worlds = Orgel.Worlds;

    var params = new root.URLSearchParams(root.location.search);
    var unlockAll = params.get('unlock') === 'all';

    var save = Orgel.Save.create();
    var ui = Orgel.UI.create(doc);
    var canvas = doc.getElementById('stage');
    var cv = Orgel.Canvas.create(canvas);
    var view = Orgel.BoardView.create(cv);
    var scenes = Orgel.Scenes.create(cv);
    var input = Orgel.Input.create(canvas);
    var $ = ui.elements.$;

    var app = {
      save: save, ui: ui, cv: cv, view: view, input: input, scenes: scenes,
      state: 'boot', level: null, levelIndex: 0, session: null, selectWorld: 1, unlockAll: unlockAll,
    };

    var pending = null;          // 1手だけの先行入力
    var clearing = false;        // クリア演出中（操作を受け付けない）
    var clearTimer = 0;
    var messageTimer = 0;
    var playMs = 0;              // いまのステージで遊んだ時間（ポーズ中を除く）
    var par = { x: 0, y: 0, tx: 0, ty: 0 };   // 背景の視差（ポインタ位置に追従）
    var endingStart = 0;
    var endingTimers = [];
    var reducedMedia = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var compactMedia = root.matchMedia ? root.matchMedia(CONFIG.COMPACT_QUERY) : null;

    // -----------------------------------------------------------------------
    // 背景（クロスフェード）
    // -----------------------------------------------------------------------

    var bgCache = {};
    var bgCur = null;
    var bgPrev = null;
    var bgFade = 1;

    function getBg(id) {
      if (!bgCache[id]) {
        bgCache[id] = Orgel.Background.create(id);
        bgCache[id].resize(cv.width, cv.height, cv.dpr);
        bgCache[id].reduced = isReduced();
      }
      return bgCache[id];
    }

    function setBackground(id, instant) {
      var next = getBg(id);
      if (next === bgCur) return;
      bgPrev = bgCur;
      bgCur = next;
      bgFade = (instant || !bgPrev) ? 1 : 0;
    }

    function drawBackground(ctx, api) {
      var px = par.x;
      var py = par.y;
      if (bgFade < 1 && bgPrev) {
        bgPrev.draw(ctx, api.width, api.height, api.time, px, py);
        ctx.save();
        ctx.globalAlpha = bgFade;
        bgCur.draw(ctx, api.width, api.height, api.time, px, py);
        ctx.restore();
        bgFade = Math.min(1, bgFade + api.dt / CONFIG.BG_FADE_MS);
      } else {
        bgCur.draw(ctx, api.width, api.height, api.time, px, py);
      }
    }

    // -----------------------------------------------------------------------
    // 設定
    // -----------------------------------------------------------------------

    function isReduced() {
      return !!(save.data.settings.reduced || (reducedMedia && reducedMedia.matches));
    }

    function applySettings() {
      var s = save.data.settings;
      var reduced = isReduced();
      view.reduced = reduced;
      scenes.reduced = reduced;
      view.marks = !!s.marks;
      Object.keys(bgCache).forEach(function (k) { bgCache[k].reduced = reduced; });
      doc.body.classList.toggle('reduced', reduced);
      Sound.applySettings(s);
      ui.syncSettings(s);
    }

    function toggleMute() {
      var m = !save.data.settings.muted;
      save.setSetting('muted', m);
      applySettings();
      ui.toast(m ? Text.muted : Text.unmuted);
    }

    // -----------------------------------------------------------------------
    // プレイ画面（HUD・メッセージ）
    // -----------------------------------------------------------------------

    function updateHud() {
      var s = app.session;
      var lv = app.level;
      $('hud-stage').textContent = lv.id;
      $('hud-name').textContent = lv.name;
      $('hud-moves').textContent = String(s.moves);
      $('hud-par').textContent = String(lv.par);
      $('btn-undo').disabled = !s.canUndo();
      doc.querySelector('.hud-moves').classList.toggle('is-over', s.moves > lv.par);
    }

    function showMessage(text, ms, warn) {
      var el = $('hud-hint');
      el.textContent = text;
      el.hidden = !text;
      el.classList.toggle('is-warn', !!warn);
      root.clearTimeout(messageTimer);
      if (text && ms) messageTimer = root.setTimeout(restoreHint, ms);
    }

    function restoreHint() {
      var el = $('hud-hint');
      var h = app.level ? app.level.hint : '';
      el.textContent = h || '';
      el.hidden = !h;
      el.classList.remove('is-warn');
      $('btn-undo').classList.remove('is-attn');
    }

    /** 横長で背の低い画面（スマートフォンの横持ち）か */
    function isCompact() {
      return !!(compactMedia && compactMedia.matches);
    }

    function layout() {
      if (isCompact()) {
        // 上のHUD 1行ぶんだけ空ける。ヒントは左、ボタンは右の列に出るので、盤面は縦いっぱいに使える。
        // 左右は、列の幅（ヒントの吹き出しの最大幅 min(20vw, 190px) ＋ 端の余白14px ＋ すき間10px）だけ空ける
        view.setMargins(58, 12, Math.round(14 + Math.min(cv.width * 0.2, 190) + 10));
        return;
      }
      var narrow = cv.width < 640 || cv.height < 520;
      // 背が低くて幅のある窓（高さ520px未満・幅640px以上）は、盤面が縦いっぱいに広がるので、ヒントの吹き出し（上72px＋高さ約33px）の下に収める
      var shortWide = cv.height < 520 && cv.width >= 640;
      view.setMargins(shortWide ? 108 : (narrow ? 92 : 104), narrow ? 80 : 92);
    }

    // -----------------------------------------------------------------------
    // 状態の解析（詰み判定・ヒント）
    // -----------------------------------------------------------------------
    // 状態が変わるたびに、まず同梱の解と短い探索ですぐ答える。大きな盤面で間に合わなければ、画面を止めないよう
    // 小分けにして探し続ける。結果は、その状態にいる間だけ有効（ヒントのボタンは、結果が出ていれば すぐ答える）。

    var analysis = null;   // { session, state, result, search, t0, wantHint, timer }

    function cancelAnalysis() {
      if (analysis && analysis.timer) root.clearTimeout(analysis.timer);
      analysis = null;
    }

    /** その解析の対象の状態から、動いた・もどした・別の面になった */
    function analysisStale(a) {
      return app.state !== 'play' || app.session !== a.session || app.session.state !== a.state;
    }

    function startAnalysis() {
      cancelAnalysis();
      if (app.state !== 'play' || clearing || app.session.solved) return;
      var a = { session: app.session, state: app.session.state, result: null, search: null, t0: 0, wantHint: false, timer: 0 };
      analysis = a;
      var quick = Solver.hint(app.level, a.state, CONFIG.STUCK_CHECK);
      if (quick.status !== 'timeout') { a.result = quick; onAnalysis(a); return; }
      a.search = Solver.createSearch(app.level, a.state, { maxStates: CONFIG.SEARCH_MAX_STATES });
      a.t0 = Date.now();
      a.timer = root.setTimeout(function () { sliceAnalysis(a); }, CONFIG.SEARCH_GAP_MS);
    }

    function sliceAnalysis(a) {
      a.timer = 0;
      if (analysis !== a) return;
      if (analysisStale(a)) { analysis = null; return; }
      var res = a.search.step(CONFIG.SEARCH_SLICE_MS);
      if (!res && Date.now() - a.t0 > CONFIG.SEARCH_MAX_MS) res = a.search.abandon();
      if (!res) { a.timer = root.setTimeout(function () { sliceAnalysis(a); }, CONFIG.SEARCH_GAP_MS); return; }
      a.search = null;
      if (res.solvable) a.result = { status: 'ok', dir: res.path.length ? res.path[0] : -1, length: res.length };
      else a.result = { status: res.truncated ? 'timeout' : 'stuck', dir: -1, length: -1 };
      onAnalysis(a);
    }

    /** 解析の結果が出た。詰みなら責めずに教える。ヒントを待っていれば出す */
    function onAnalysis(a) {
      var r = a.result;
      if (r.status === 'stuck') {
        showMessage(Text.stuck, 0, true);
        $('btn-undo').classList.add('is-attn');
        Sound.sfx('stuck');
      } else if (!a.wantHint) {
        restoreHint();
      }
      if (a.wantHint) { a.wantHint = false; showHintResult(r); }
    }

    /** 手のあとなどに呼ぶ（詰んでいないか調べ、ヒントの用意をする） */
    function checkStuck() { startAnalysis(); }

    // -----------------------------------------------------------------------
    // プレイ時間
    // -----------------------------------------------------------------------

    function flushPlayTime() {
      if (playMs >= 1000) save.addStats({ seconds: Math.round(playMs / 1000) });
      playMs = 0;
    }

    // -----------------------------------------------------------------------
    // 画面遷移
    // -----------------------------------------------------------------------

    function indexOfLevel(id) {
      for (var i = 0; i < levels.length; i++) if (levels[i].id === id) return i;
      return 0;
    }

    function maxUnlockedWorld() {
      var m = 1;
      for (var i = 0; i < levels.length; i++) {
        if (save.isUnlocked(levels, i, unlockAll)) m = Math.max(m, levels[i].world);
      }
      return m;
    }

    function clearTimers() {
      root.clearTimeout(clearTimer);
      endingTimers.forEach(root.clearTimeout);
      endingTimers = [];
    }

    function goBoot() {
      app.state = 'boot';
      input.enabled = false;
      setBackground(1, true);
      ui.showScreen('boot');
      ui.focus('#btn-boot');
    }

    function goTitle() {
      flushPlayTime();
      clearTimers();
      clearing = false;
      app.state = 'title';
      input.enabled = false;
      ui.closeAllOverlays();
      var progressed = save.clearedCount() > 0;
      $('btn-start').hidden = progressed;
      $('btn-continue').hidden = !progressed;
      $('btn-ending').hidden = !save.data.flags.endingSeen;
      scenes.reset();
      setBackground(1);
      ui.showScreen('title');
      Sound.scene('title');
      ui.focus(progressed ? '#btn-continue' : '#btn-start');
    }

    function goSelect(world) {
      flushPlayTime();
      clearTimers();
      clearing = false;
      ui.closeAllOverlays();
      app.state = 'select';
      input.enabled = false;
      showSelect(world);
      ui.showScreen('select');
      ui.centerWorldTab(false);
      Sound.scene('select', world);
      ui.focus('.stage-card.is-next') || ui.focus('.stage-card:not(.is-locked)') || ui.focus('.world-tab.is-selected');
    }

    function showSelect(world) {
      app.selectWorld = world;
      setBackground(world);
      var ni = save.nextToPlay(levels);
      ui.renderSelect({
        levels: levels, worlds: worlds, save: save, world: world, unlockAll: unlockAll,
        nextId: ni >= 0 ? levels[ni].id : null,
        onWorld: function (w) {
          Sound.sfx('ui_click');
          showSelect(w);
          ui.centerWorldTab(true);
          Sound.scene('select', w);
          ui.focus('.world-tab.is-selected');
        },
        onPlay: function (id) { Sound.sfx('ui_click'); startStage(id); },
        onLocked: function () { Sound.sfx('ui_back'); ui.toast(Text.select.locked); },
      });
    }

    function startStage(id) {
      flushPlayTime();
      clearTimers();
      var idx = indexOfLevel(id);
      var def = levels[idx];
      app.levelIndex = idx;
      app.level = Engine.parse(def);
      app.session = Session.create(app.level);
      var world = worlds[def.world - 1];
      ui.closeAllOverlays();
      setBackground(world.id);
      view.setWorld(world);
      layout();
      view.setLevel(app.level, app.session.state);
      pending = null;
      clearing = false;
      app.state = 'play';
      input.enabled = true;
      restoreHint();
      updateHud();
      ui.showScreen('play');
      startAnalysis();
      Sound.scene('play', world.id);
      Sound.sfx('stage_start');
      save.addStats({ plays: 1 });
    }

    function goWorldClear(worldId) {
      clearTimers();
      var w = worlds[worldId - 1];
      var stars = 0;
      levels.forEach(function (lv) {
        if (lv.world !== worldId) return;
        var info = save.stageInfo(lv.id);
        if (info) stars += info.stars;
      });
      $('wc-world').textContent = 'ワールド ' + worldId + '  ' + w.name;
      $('wc-star-count').textContent = String(stars);
      $('wc-line').textContent = Text.worldClear.lines[worldId] || '';
      app.state = 'worldclear';
      app.worldClearId = worldId;
      input.enabled = false;
      ui.closeAllOverlays();
      scenes.reset();
      setBackground(worldId);
      ui.showScreen('worldclear');
      Sound.scene('worldclear', worldId);
      Sound.jingle('world_clear', { world: worldId });
      ui.focus('#wc-next');
    }

    /**
     * エンディング。kind は 'final'（ぜんぶのステージを終えたとき。見たことを記録する）か、
     * 'first'（30ステージのころのエンディング。そのころに見た人が、タイトルからもういちど見るとき）。
     */
    function goEnding(kind) {
      clearTimers();
      app.state = 'ending';
      input.enabled = false;
      ui.closeAllOverlays();
      scenes.reset();
      var stage = $('ending-text');
      stage.innerHTML = '';
      $('ending-end').classList.remove('is-show');
      endingStart = cv.time || 0;
      app.endingPhase = 0;
      setBackground('dawn');
      ui.showScreen('ending');
      Sound.scene('ending');
      if (kind !== 'first') save.markEndingSeen(levels.length);

      var lines = kind === 'first' ? Text.ending.firstLines : Text.ending.lines;
      lines.forEach(function (text, i) {
        var p = doc.createElement('p');
        p.textContent = text;
        stage.appendChild(p);
        endingTimers.push(root.setTimeout(function () { p.classList.add('is-in'); }, 1500 + i * CONFIG.ENDING_LINE_MS));
        if (i < lines.length - 1) {
          endingTimers.push(root.setTimeout(function () { p.classList.add('is-out'); }, 1500 + (i + 1) * CONFIG.ENDING_LINE_MS - 900));
        }
      });
      endingTimers.push(root.setTimeout(showEndingEnd, 1500 + lines.length * CONFIG.ENDING_LINE_MS + 600));
    }

    function showEndingEnd() {
      if (app.state !== 'ending' || app.endingPhase === 1) return;
      endingTimers.forEach(root.clearTimeout);
      endingTimers = [];
      app.endingPhase = 1;
      var d = save.data;
      $('ending-text').innerHTML = '';
      $('end-stars').textContent = save.totalStars() + ' / ' + levels.length * 3;
      $('end-moves').textContent = String(d.stats.moves);
      var sec = d.stats.seconds;
      var hh = Math.floor(sec / 3600);
      var mm = Math.floor((sec % 3600) / 60);
      $('end-time').textContent = (hh ? hh + 'じかん ' : '') + mm + 'ふん';
      $('ending-end').classList.add('is-show');
      ui.focus('#ending-title');
    }

    // -----------------------------------------------------------------------
    // プレイ中の操作
    // -----------------------------------------------------------------------

    function doTilt(dir) {
      var r = app.session.tilt(dir);
      if (!r.moved) {
        view.nudge(dir);
        return;
      }
      restoreHint();
      cancelAnalysis();
      view.play(r.result, onTiltDone, dir);
      updateHud();
    }

    function handleTilt(dir) {
      if (app.state !== 'play' || clearing || ui.topOverlay()) return;
      if (view.isBusy()) { pending = dir; return; }
      doTilt(dir);
    }

    function onTiltDone() {
      if (app.session.solved) {
        pending = null;
        onSolved();
        return;
      }
      if (pending !== null) {
        var d = pending;
        pending = null;
        doTilt(d);
        return;
      }
      root.setTimeout(checkStuck, 0);
    }

    function onSolved() {
      clearing = true;
      flushPlayTime();
      var s = app.session;
      var lv = app.level;
      var rec = save.recordClear(lv.id, s.moves, lv.par, s.hints);
      save.addStats({ moves: s.moves, undos: s.undos, hints: s.hints });
      Sound.jingle('clear', { stars: rec.stars });
      clearTimer = root.setTimeout(function () {
        ui.renderClear({
          stageId: lv.id, name: lv.name, moves: s.moves, par: lv.par, stars: rec.stars,
          newBest: rec.newBest && !rec.first, first: rec.first,
          onStar: function (n) { Sound.sfx('star', { n: n }); },
        });
        ui.openOverlay('clear');
        ui.focus('#clear-next');
      }, CONFIG.CLEAR_PANEL_DELAY_MS);
    }

    function doUndo() {
      if (app.state !== 'play' || clearing || ui.topOverlay()) return;
      var st = app.session.undo();
      if (!st) { Sound.sfx('noop'); return; }
      pending = null;
      Sound.sfx('undo');
      view.setState(st);
      restoreHint();
      updateHud();
      root.setTimeout(checkStuck, 0);
    }

    function doReset() {
      if (app.state !== 'play' || clearing || ui.topOverlay()) return;
      if (app.session.moves === 0) return;
      pending = null;
      Sound.sfx('reset');
      view.setState(app.session.reset(), { pop: true });
      restoreHint();
      updateHud();
      startAnalysis();
    }

    function showHintResult(h) {
      if (h.status === 'ok' && h.dir >= 0) {
        restoreHint();
        app.session.hints++;
        view.showHint(h.dir);
        Sound.sfx('hint');
      } else if (h.status === 'stuck') {
        showMessage(Text.hintStuck, CONFIG.MESSAGE_MS, true);
        Sound.sfx('stuck');
      } else {
        showMessage(Text.hintTooHard, CONFIG.MESSAGE_MS);
      }
    }

    function doHint() {
      if (app.state !== 'play' || clearing || ui.topOverlay() || view.isPlaying()) return;
      var a = analysis;
      if (!a || analysisStale(a)) { startAnalysis(); a = analysis; }
      if (!a) return;
      if (a.result) { showHintResult(a.result); return; }
      a.wantHint = true;                       // 探索の途中。結果が出たら出す
      showMessage(Text.hintBusy, 0);
    }

    function retryStage() {
      startStage(app.level.id);
    }

    /** クリア画面の「つぎへ」: 次のステージ／ワールドクリア／エンディング */
    function advance() {
      ui.closeOverlay('clear');
      var cur = levels[app.levelIndex];
      var nxt = levels[app.levelIndex + 1];
      if (!nxt) {
        // さいごの ステージ。まだ見ていない新しいエンディングがあれば出す（ステージが増えたあとも、同じ仕組みで出る）
        if (save.endingDue(levels.length)) goEnding('final');
        else goSelect(cur.world);
      } else if (nxt.world !== cur.world) {
        if (save.worldCleared(levels, cur.world) && save.markWorldSeen(cur.world)) goWorldClear(cur.world);
        else startStage(nxt.id);
      } else {
        startStage(nxt.id);
      }
    }

    // -----------------------------------------------------------------------
    // ポーズ・戻る
    // -----------------------------------------------------------------------

    function openPause() {
      if (app.state !== 'play' || clearing || ui.topOverlay()) return;
      Sound.sfx('ui_open');
      ui.openOverlay('pause');
      ui.focus('#pause-resume');
    }

    function closePause() {
      ui.closeOverlay('pause');
      Sound.sfx('ui_close');
      $('btn-menu').blur();
    }

    /** Esc／戻る操作 */
    function back() {
      var top = ui.topOverlay();
      if (top) {
        if (top === 'clear') return;
        ui.closeOverlay(top);
        Sound.sfx('ui_back');
        var below = ui.topOverlay();
        if (below === 'pause') ui.focus('#pause-resume');
        else if (!below && app.state === 'title') ui.focus(save.clearedCount() > 0 ? '#btn-continue' : '#btn-start');
        return;
      }
      if (app.state === 'play') openPause();
      else if (app.state === 'select') { Sound.sfx('ui_back'); goTitle(); }
      else if (app.state === 'ending' && app.endingPhase !== 1) showEndingEnd();
    }

    // -----------------------------------------------------------------------
    // 入力の接続
    // -----------------------------------------------------------------------

    input.onAction = function (name, data) {
      switch (name) {
        case 'tilt': handleTilt(data.dir); break;
        case 'undo': doUndo(); break;
        case 'reset': doReset(); break;
        case 'hint': doHint(); break;
        case 'pause': back(); break;
        case 'mute': if (app.state !== 'boot') toggleMute(); break;
        default: break;
      }
    };

    // ボタン: クリック時に効果音を鳴らす
    function on(id, fn) {
      $(id).addEventListener('click', function (e) {
        fn(e);
        if (app.state === 'play' && !ui.topOverlay()) e.currentTarget.blur();
      });
    }
    function click(id, fn) {
      on(id, function () { Sound.sfx('ui_click'); fn(); });
    }

    on('btn-boot', function () {
      Sound.unlock();
      applySettings();
      Sound.sfx('ui_click');
      goTitle();
    });

    click('btn-start', function () { startStage(levels[0].id); });
    click('btn-continue', function () {
      var ni = save.nextToPlay(levels);
      if (ni >= 0) startStage(levels[ni].id);
      else goSelect(worlds.length);
    });
    click('btn-select', function () {
      var ni = save.nextToPlay(levels);
      goSelect(ni >= 0 ? levels[ni].world : 1);
    });
    click('btn-help', function () { ui.renderHelp(maxUnlockedWorld()); ui.openOverlay('help'); ui.focus('#help-close'); });
    click('btn-settings', function () { ui.syncSettings(save.data.settings); ui.openOverlay('settings'); ui.focus('#set-bgm'); });
    click('btn-ending', function () { goEnding(save.data.flags.endingSeenAt >= levels.length ? 'final' : 'first'); });

    click('sel-back', function () { goTitle(); });

    // プレイ画面
    click('btn-menu', openPause);
    on('btn-undo', doUndo);
    on('btn-reset', doReset);
    on('btn-hint', doHint);

    // ポーズ
    click('pause-resume', function () { closePause(); });
    click('pause-restart', function () { ui.closeOverlay('pause'); doReset(); });
    click('pause-help', function () { ui.renderHelp(maxUnlockedWorld()); ui.openOverlay('help'); ui.focus('#help-close'); });
    click('pause-settings', function () { ui.syncSettings(save.data.settings); ui.openOverlay('settings'); ui.focus('#set-bgm'); });
    click('pause-select', function () { goSelect(app.level.world); });
    click('pause-title-btn', function () { goTitle(); });

    // クリア
    click('clear-next', advance);
    click('clear-retry', function () { ui.closeOverlay('clear'); retryStage(); });
    click('clear-select', function () { ui.closeOverlay('clear'); goSelect(app.level.world); });

    // ワールドクリア・エンディング
    click('wc-next', function () {
      var next = levels.filter(function (lv) { return lv.world === app.worldClearId + 1; })[0];
      if (next) startStage(next.id); else goSelect(app.worldClearId);
    });
    click('ending-title', function () { goTitle(); });
    doc.addEventListener('pointerdown', function () {
      if (app.state === 'ending' && app.endingPhase !== 1 && cv.time - endingStart > 800) showEndingEnd();
    });

    // 設定・あそびかた
    click('set-close', function () { ui.closeOverlay('settings'); ui.focus(app.state === 'title' ? '#btn-settings' : '#pause-resume'); });
    click('help-close', function () { ui.closeOverlay('help'); ui.focus(app.state === 'title' ? '#btn-help' : '#pause-resume'); });
    click('set-erase', function () {
      ui.confirm({
        title: Text.settings.eraseTitle, body: Text.settings.eraseBody, yes: Text.settings.eraseYes, no: Text.settings.eraseNo,
      }, function () {
        save.reset();
        applySettings();
        ui.toast(Text.settings.erased);
        ui.closeAllOverlays();
        goTitle();
      });
    });
    ui.onSetting(function (name, value) {
      save.setSetting(name, value);
      applySettings();
      if (name === 'sfx') Sound.sfx('ui_toggle');
    });

    // 画面が見えなくなったらポーズ（プレイ中のみ）
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) {
        flushPlayTime();
        if (app.state === 'play' && !clearing && !ui.topOverlay()) openPause();
      }
    });

    // 背景の視差（ポインタ位置）
    root.addEventListener('pointermove', function (e) {
      par.tx = (e.clientX / root.innerWidth) * 2 - 1;
      par.ty = (e.clientY / root.innerHeight) * 2 - 1;
    });

    // 盤面の出来事 → 効果音（効果音の実体は Phase 4。ここでは窓口の呼び出しだけを決めておく）
    var homeCount = 0;
    view.onEvent = function (e) {
      switch (e.type) {
        case 'tilt': homeCount = 0; Sound.sfx('tilt', { dir: e.dir, ticks: e.ticks, tickMs: e.tickMs, orbs: e.orbs }); break;
        case 'stop': Sound.sfx(e.reason === 'orb' ? 'stop_orb' : 'stop_wall', { color: e.color }); break;
        case 'bump': Sound.sfx('bump', { color: e.color }); break;
        case 'home': Sound.sfx('home', { color: e.color, n: homeCount++ }); break;
        case 'mud': Sound.sfx('stop_mud', { color: e.color }); break;
        case 'flow': Sound.sfx('flow', { color: e.color }); break;
        case 'warp': Sound.sfx('warp', { color: e.color }); break;
        case 'bloom': Sound.sfx('bloom'); break;
        case 'gate': Sound.sfx('gate', { color: e.color }); break;
        case 'mirror': Sound.sfx('mirror', { color: e.color }); break;
        case 'oneway': Sound.sfx('oneway', { color: e.color }); break;
        case 'switch': Sound.sfx('switch', { color: e.color }); break;
        case 'door': Sound.sfx('door'); break;
        case 'noop': Sound.sfx('noop'); break;
        default: break;
      }
    };

    // 起動画面を飛ばして始めた場合に備え、最初のユーザー操作でも音を有効にする
    var unlockEvents = ['pointerdown', 'keydown', 'touchend'];
    function unlockOnGesture() {
      if (Sound.unlock()) {
        applySettings();
        unlockEvents.forEach(function (n) { root.removeEventListener(n, unlockOnGesture, true); });
      }
    }
    unlockEvents.forEach(function (n) { root.addEventListener(n, unlockOnGesture, true); });

    // ボタンにカーソルを乗せたときの小さな音
    doc.addEventListener('pointerover', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.btn, .world-tab, .stage-card') && !t.closest('[disabled]')) {
        if (t !== app.lastHover) { app.lastHover = t; Sound.sfx('ui_hover'); }
      }
    });

    cv.on('resize', function (api) {
      Object.keys(bgCache).forEach(function (k) { bgCache[k].resize(api.width, api.height, api.dpr); });
      layout();
    });

    cv.add(function (ctx, api) {
      par.x += (par.tx - par.x) * 0.05;
      par.y += (par.ty - par.y) * 0.05;
      if (app.state === 'ending') {
        var total = (CONFIG.ENDING_LINE_MS * Text.ending.lines.length + 4000);
        bgCache.dawn.setProgress(Math.min(1, (api.time - endingStart) / total));
      }
      drawBackground(ctx, api);
      if (app.state === 'play') {
        view.draw(ctx, api);
        if (!ui.topOverlay() && !doc.hidden) playMs += api.dt;
      } else if (app.state === 'title') {
        scenes.draw(ctx, api, 'title', { px: par.x, py: par.y, compact: isCompact() });
      } else if (app.state === 'worldclear') {
        scenes.draw(ctx, api, 'worldclear', { accent: worlds[(app.worldClearId || 1) - 1].theme.accent, compact: isCompact() });
      } else if (app.state === 'ending') {
        scenes.draw(ctx, api, 'ending', { phase: app.endingPhase || 0, compact: isCompact() });
      }
    });

    // -----------------------------------------------------------------------
    // 起動
    // -----------------------------------------------------------------------

    app.go = { title: goTitle, select: goSelect, stage: startStage, worldClear: goWorldClear, ending: goEnding };
    app.handleTilt = handleTilt;
    app.advance = advance;

    app.boot = function () {
      ui.bindText();
      layout();
      applySettings();
      var stage = params.get('stage');
      var screen = params.get('screen');
      var world = Number(params.get('world')) || 1;
      if (stage) startStage(stage);
      else if (screen === 'title') goTitle();
      else if (screen === 'select') goSelect(world);
      else if (screen === 'worldclear') goWorldClear(world);
      else if (screen === 'ending') goEnding(params.get('kind') === 'first' ? 'first' : 'final');
      else goBoot();
      cv.start();
    };

    return app;
  }

  var App = { CONFIG: CONFIG, create: create };

  Orgel.App = App;
  if (typeof module !== 'undefined' && module.exports) { module.exports = App; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
