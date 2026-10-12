(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Util = Orgel.Util;
  var Sprites = Orgel.Sprites;
  var Engine = Orgel.Engine;
  var Ease = Util.Ease;
  var clamp = Util.clamp;
  var lerp = Util.lerp;
  var rgba = Util.rgba;
  var TAU = Math.PI * 2;
  var TILE = Engine.TILE;

  /**
   * 盤面の表示とアニメーション再生。
   * エンジンが返すトレース（技術設計書 §5.3）を時間軸に展開し、伸縮・衝突の弾み・帰宅・ワープ・開花などを演出する。
   *
   *   var view = BoardView.create(cv);          // cv は Canvas.create の戻り値
   *   view.setWorld(world);                     // 色調（Worlds[n]）
   *   view.setLevel(level, state);              // ステージを表示
   *   view.play(result, onDone);                // Engine.step(..., {trace:true}) の結果を再生
   *   view.setState(state, {pop:true});         // undo/reset などで静止状態へ切り替える
   *   view.onEvent = function (e) {...};        // 効果音などのフック（e.type: tilt/stop/bump/home/mud/flow/warp/bloom/end/noop）
   */

  var CONFIG = {
    TICK_MS: 72,         // 1ティック（1マス進む時間）の標準
    MIN_TICK_MS: 42,     // 長い移動のときの下限
    MAX_RUN_MS: 950,     // 1手の移動演出の目標上限（超えそうならティックを速める）
    MAX_CELL: 104,       // セルの最大サイズ(px)
    MARGIN_SIDE: 20,     // 左右の余白
    MARGIN_SIDE_NARROW: 10, // 幅520px未満（スマートフォン縦持ち）の左右の余白。盤面を少しでも大きく使う
    STRETCH: 0.17,       // 移動中の伸び
    IMPACT_MS: 380,      // 衝突の弾みが続く時間
    HOME_MS: 420,        // 帰宅演出の長さ
    BLOOM_MS: 420,       // 開花演出の長さ
    DOOR_MS: 280,        // とびらの開閉の長さ
    HINT_MS: 3200,       // ヒント矢印の表示時間
    NUDGE_MS: 220,       // 無効手のぷるぷるの長さ
    TRAIL_EVERY: 26,     // 残像を出す間隔(ms)
    INPUT_READY_PAD: 30, // 最後の移動が終わってから次の入力を受けるまでの余裕(ms)
  };

  var DIR_VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  /** 区間 [0,1] のゆるやかな減速（直前の等速から速度が連続する）。終端の速度は 0.35 */
  function outPartial(u) { return u + 0.65 * (u * u - u * u * u); }
  /** ゆるやかな加速（始端の速度が 0.35、終端は等速につながる） */
  function inPartial(u) { return 1 - outPartial(1 - u); }

  function create(cv) {
    var ctx = cv.ctx;
    var view = {
      level: null,
      world: Orgel.Worlds[0],
      onEvent: null,
      reduced: false,
      marks: false,
      layout: { cell: 60, ox: 0, oy: 0, pad: 0 },
      margins: { top: 96, bottom: 88, side: null },
    };

    var statik = null;          // 静的レイヤ { canvas, pad, w, h }
    var orbPos = [];            // 静止時の各ほしのこのセル（-1 は帰宅済み）
    var orbFx = [];             // ほしのこごとの演出状態
    var filledMask = 0;         // 表示上の使用済みおうち
    var bloomMask = 0;          // 表示上の咲いたつぼみ
    var socketFlash = [];       // おうちの点灯時刻
    var bloomAt = [];           // つぼみの開花時刻
    var cellFlash = {};         // ながれ・ワープ・もん・かがみ・スイッチの光 {cell: 時刻}
    var cellDeny = {};          // もん・とびらに入れなかった光 {cell: 時刻}
    var swView = 0;             // 表示上の とびらの状態（スイッチの状態 0/1）
    var swAt = -1e9;            // とびらが切りかわった時刻
    var anim = null;            // 再生中のアニメーション
    var hint = null;            // ヒント矢印 { dir, t0 }
    var nudge = null;           // 無効手のぷるぷる { dir, t0 }
    var lean = { x: 0, y: 0, tx: 0, ty: 0, shake: 0, sdir: 0 };
    var trailPS = Orgel.Particles.create();
    var fxPS = Orgel.Particles.create();
    var now = 0;
    var portalIndex = {};       // ワープのセル → 組の番号(0/1)
    var needsStatic = true;

    function emit(name, data) {
      if (view.onEvent) {
        data = data || {};
        data.type = name;
        view.onEvent(data);
      }
    }

    // -----------------------------------------------------------------------
    // レイアウトと静的レイヤ
    // -----------------------------------------------------------------------

    function computeLayout() {
      var lv = view.level;
      if (!lv) return;
      var w = cv.width;
      var h = cv.height;
      var side = view.margins.side != null ? view.margins.side : (w < 520 ? CONFIG.MARGIN_SIDE_NARROW : CONFIG.MARGIN_SIDE);
      var availW = w - side * 2;
      var availH = h - view.margins.top - view.margins.bottom;
      var cell = Math.floor(Math.min(CONFIG.MAX_CELL, availW / lv.w, availH / lv.h));
      cell = Math.max(24, cell);
      var bw = cell * lv.w;
      var bh = cell * lv.h;
      view.layout.cell = cell;
      view.layout.ox = Math.floor((w - bw) / 2);
      view.layout.oy = Math.floor(view.margins.top + (availH - bh) / 2);
      view.layout.pad = Math.ceil(cell * 0.7);
      needsStatic = true;
    }

    function buildStatic() {
      var lv = view.level;
      var L = view.layout;
      var c = L.cell;
      var th = view.world.theme;
      var W = c * lv.w + L.pad * 2;
      var H = c * lv.h + L.pad * 2;
      var canvas = statik && statik.canvas ? statik.canvas : root.document.createElement('canvas');
      canvas.width = Math.round(W * cv.dpr);
      canvas.height = Math.round(H * cv.dpr);
      var g = canvas.getContext('2d');
      g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.translate(L.pad, L.pad);

      var x, y, i;
      // 盤の影
      g.save();
      g.shadowColor = 'rgba(4,2,16,0.55)';
      g.shadowBlur = c * 0.35;
      g.shadowOffsetY = c * 0.12;
      g.fillStyle = 'rgba(4,2,16,0.6)';
      for (y = 0; y < lv.h; y++) {
        for (x = 0; x < lv.w; x++) {
          var t0 = lv.tile[y * lv.w + x];
          if (t0 === TILE.VOID || t0 === TILE.WALL) continue;
          Sprites.roundRect(g, x * c + c * 0.045, y * c + c * 0.045, c * 0.91, c * 0.91, c * 0.16);
          g.fill();
        }
      }
      g.restore();

      // 床と縁
      for (y = 0; y < lv.h; y++) {
        for (x = 0; x < lv.w; x++) {
          i = y * lv.w + x;
          var t1 = lv.tile[i];
          if (t1 === TILE.VOID || t1 === TILE.WALL) continue;
          Sprites.drawFloorTile(g, x * c, y * c, c, th, (x + y) & 1);
        }
      }
      for (y = 0; y < lv.h; y++) {
        for (x = 0; x < lv.w; x++) {
          i = y * lv.w + x;
          var t2 = lv.tile[i];
          if (t2 === TILE.VOID) continue;   // かべも盤の一部として縁を引く
          var sides = [0, 1, 2, 3].map(function (d) {
            var nx = x + Engine.DX[d];
            var ny = y + Engine.DY[d];
            if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h) return true;
            return lv.tile[ny * lv.w + nx] === TILE.VOID;
          });
          if (sides[0] || sides[1] || sides[2] || sides[3]) Sprites.drawRim(g, x * c, y * c, c, th, sides);
        }
      }
      // かべ（上の行から順に重ねる）
      for (y = 0; y < lv.h; y++) {
        for (x = 0; x < lv.w; x++) {
          if (lv.tile[y * lv.w + x] === TILE.WALL) Sprites.drawWall(g, x * c, y * c, c, th);
        }
      }
      statik = { canvas: canvas, w: W, h: H };
      needsStatic = false;
    }

    // -----------------------------------------------------------------------
    // 状態の設定
    // -----------------------------------------------------------------------

    function resetFx() {
      var lv = view.level;
      orbFx = [];
      for (var i = 0; i < lv.nOrbs; i++) {
        orbFx.push({
          phase: Math.random() * TAU,
          nextBlink: now + 1500 + Math.random() * 3500,
          blinkUntil: 0,
          impactT: -1e9, impactAmp: 0, impactAng: 0,
          mouthUntil: 0, mouthStyle: 'smile',
          homeT: -1e9, homeCell: 0, popT: -1e9,
          nudge: 0,
        });
      }
      socketFlash = [];
      bloomAt = [];
      cellFlash = {};
      cellDeny = {};
      swAt = -1e9;
      for (i = 0; i < lv.nSockets; i++) socketFlash.push(-1e9);
      for (i = 0; i < lv.nBuds; i++) bloomAt.push(-1e9);
    }

    view.setWorld = function (world) {
      view.world = world || Orgel.Worlds[0];
      needsStatic = true;
    };

    /** 盤面の外側の余白(px)。side を省くと画面幅に応じた標準の余白（横持ちのスマートフォンでは、左右の列の幅を渡す） */
    view.setMargins = function (top, bottom, side) {
      view.margins.top = top;
      view.margins.bottom = bottom;
      view.margins.side = side == null ? null : side;
      computeLayout();
    };

    view.setLevel = function (level, state) {
      view.level = level;
      anim = null;
      hint = null;
      nudge = null;
      portalIndex = {};
      var pairCount = 0;
      for (var i = 0; i < level.w * level.h; i++) {
        if (level.tile[i] === TILE.PORTAL && portalIndex[i] === undefined) {
          portalIndex[i] = pairCount;
          portalIndex[level.portalTo[i]] = pairCount;
          pairCount++;
        }
      }
      trailPS.clear();
      fxPS.clear();
      resetFx();
      computeLayout();
      var st0 = state || Engine.initialState(level);
      swView = st0.sw | 0;
      view.setState(st0, { pop: true });
    };

    /** 静止状態へ切り替える（undo・reset・開始時）。pop=true でほしのこが「ぽよん」と現れる */
    view.setState = function (state, opts) {
      var lv = view.level;
      anim = null;
      var prevHome = orbPos.slice();
      orbPos = [];
      for (var i = 0; i < lv.nOrbs; i++) {
        orbPos.push(state.pos[i]);
        var fx = orbFx[i];
        fx.impactT = -1e9;
        fx.homeT = -1e9;
        // 帰宅状態から戻ってきた／開始時のほしのこは「ぽよん」と出す
        if (opts && opts.pop && (state.pos[i] >= 0)) {
          fx.popT = now + i * 50;
        } else if (prevHome[i] === -1 && state.pos[i] >= 0) {
          fx.popT = now;
        }
      }
      filledMask = state.filled;
      bloomMask = state.bloom;
      if ((state.sw | 0) !== swView) { swView = state.sw | 0; swAt = now; }
      for (var s = 0; s < lv.nSockets; s++) socketFlash[s] = ((filledMask >> s) & 1) ? -1e9 + 1 : -1e9;
      for (var b = 0; b < lv.nBuds; b++) bloomAt[b] = ((bloomMask >> b) & 1) ? -1e9 + 1 : -1e9;
    };

    view.isBusy = function () { return !!anim && now < anim.readyAt; };
    view.isPlaying = function () { return !!anim; };

    view.nudge = function (dir) {
      nudge = { dir: dir, t0: now };
      for (var i = 0; i < orbFx.length; i++) {
        if (orbPos[i] >= 0) { orbFx[i].mouthUntil = now + 380; orbFx[i].mouthStyle = 'ouch'; }
      }
      if (!view.reduced) { lean.shake = 1; lean.sdir = dir; }
      emit('noop', { dir: dir });
    };

    view.showHint = function (dir) {
      hint = { dir: dir, t0: now };
    };
    view.clearHint = function () { hint = null; };

    // -----------------------------------------------------------------------
    // アニメーションの組み立て
    // -----------------------------------------------------------------------

    /**
     * Engine.step の結果（trace=true）を再生する。完了時に onDone を呼ぶ。
     * 移動の終わりの少し後（INPUT_READY_PAD）で isBusy() が false になり、次の入力を受けられる。
     */
    view.play = function (res, onDone, dir) {
      finalizeAnim();
      var lv = view.level;
      var ticks = res.ticks || [];
      var moveTicks = 0;
      var i, k, j;
      for (k = 0; k < ticks.length; k++) if (ticks[k].moves.length) moveTicks = k + 1;
      var tickMs = clamp(CONFIG.MAX_RUN_MS / Math.max(1, moveTicks), CONFIG.MIN_TICK_MS, CONFIG.TICK_MS);

      var segs = [];
      for (i = 0; i < lv.nOrbs; i++) segs.push([]);
      var events = [];
      for (k = 0; k < ticks.length; k++) {
        var tk = ticks[k];
        for (j = 0; j < tk.moves.length; j++) {
          var mv = tk.moves[j];
          segs[mv.orb].push({ k: k, from: mv.from, to: mv.to, dir: mv.dir, entry: mv.entry });
        }
        for (j = 0; j < tk.events.length; j++) {
          var ev = tk.events[j];
          var at = (ev.type === 'stop' || ev.type === 'bump') ? k * tickMs : (k + 1) * tickMs;
          events.push({ t: at, ev: ev });
        }
      }
      events.sort(function (a, b) { return a.t - b.t; });

      var moveEnd = moveTicks * tickMs;
      var homeEnd = 0;
      events.forEach(function (e) { if (e.ev.type === 'home') homeEnd = Math.max(homeEnd, e.t + CONFIG.HOME_MS); });
      anim = {
        t0: now,
        tickMs: tickMs,
        segs: segs,
        events: events,
        next: 0,
        moveEnd: moveEnd,
        endAt: now + Math.max(moveEnd, homeEnd) + 40,
        readyAt: now + moveEnd + CONFIG.INPUT_READY_PAD,
        result: res,
        onDone: onDone,
        doneCalled: false,
        lastTrail: [],
        dir: dir,
      };
      if (!view.reduced && dir != null) { lean.tx = DIR_VEC[dir][0]; lean.ty = DIR_VEC[dir][1]; }
      emit('tilt', { dir: dir, ticks: moveTicks, tickMs: tickMs, orbs: res.state.pos.length });
      hint = null;
      nudge = null;
    };

    /** 入力を受けられる状態になったことを通知する（移動が終わった直後。演出の余韻はまだ続く） */
    function notifyReady() {
      if (!anim || anim.doneCalled) return;
      anim.doneCalled = true;
      lean.tx = 0;
      lean.ty = 0;
      emit('end', { solved: anim.result.solved });
      if (anim.onDone) anim.onDone(anim.result);
    }

    /** 再生中のアニメーションを終え、静止状態に反映する（演出の余韻が残る場合は fx の時刻で続く） */
    function finalizeAnim() {
      if (!anim) return;
      notifyReady();
      var st = anim.result.state;
      for (var i = 0; i < orbPos.length; i++) orbPos[i] = st.pos[i];
      filledMask = st.filled;
      bloomMask = st.bloom;
      if ((st.sw | 0) !== swView) { swView = st.sw | 0; swAt = now; }
      anim = null;
    }

    // -----------------------------------------------------------------------
    // イベント処理（効果音・粒子）
    // -----------------------------------------------------------------------

    function cellCenter(cell) {
      var L = view.layout;
      var lv = view.level;
      return { x: L.ox + ((cell % lv.w) + 0.5) * L.cell, y: L.oy + (((cell / lv.w) | 0) + 0.5) * L.cell };
    }

    function dust(x, y, dirVec, color, count, spread) {
      var c = view.layout.cell;
      for (var i = 0; i < count; i++) {
        var a = Math.atan2(dirVec[1], dirVec[0]) + (Math.random() - 0.5) * spread;
        var sp = c * (0.5 + Math.random() * 1.1);
        fxPS.emit({ kind: 'dust', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - c * 0.2,
          life: 360 + Math.random() * 220, size: c * (0.035 + Math.random() * 0.035), grow: -c * 0.04, drag: 3.5, color: color, alpha: 1 });
      }
    }

    function sparkle(x, y, color, count, power) {
      var c = view.layout.cell;
      for (var i = 0; i < count; i++) {
        var a = (i / count) * TAU + Math.random() * 0.4;
        var sp = c * (0.9 + Math.random() * 1.6) * power;
        fxPS.emit({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 520 + Math.random() * 380, size: c * (0.08 + Math.random() * 0.09), drag: 2.4, color: color,
          rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 6, gravity: c * 0.5 });
      }
    }

    function handleEvent(e, abs) {
      var lv = view.level;
      var c = view.layout.cell;
      var ev = e.ev;
      var p, fx, col;
      switch (ev.type) {
        case 'stop':
        case 'bump':
          fx = orbFx[ev.orb];
          if (ev.type === 'stop') {
            fx.impactT = abs;
            fx.impactAmp = ev.reason === 'orb' ? 0.2 : 0.24;
            fx.impactAng = Sprites.DIR_ANGLE[orbDirNow(ev.orb)];
            fx.mouthUntil = abs + 260;
            fx.mouthStyle = 'ouch';
            p = cellCenter(ev.cell);
            var dv = DIR_VEC[orbDirNow(ev.orb)];
            dust(p.x + dv[0] * c * 0.36, p.y + dv[1] * c * 0.36 + c * 0.2, [-dv[0], -dv[1] - 0.4], '#efe4ff', 4, 1.6);
          } else {
            fx.nudge = abs;
            fx.mouthUntil = abs + 300;
            fx.mouthStyle = 'ouch';
          }
          if (ev.block) cellDeny[ev.block.cell] = abs;
          emit(ev.type, { orb: ev.orb, cell: ev.cell, reason: ev.reason, color: lv.orbColor[ev.orb], block: ev.block });
          break;
        case 'mud':
          fx = orbFx[ev.orb];
          fx.impactT = abs;
          fx.impactAmp = 0.34;
          fx.impactAng = Sprites.DIR_ANGLE[orbDirNow(ev.orb)];
          fx.mouthUntil = abs + 420;
          fx.mouthStyle = 'ouch';
          p = cellCenter(ev.cell);
          dust(p.x, p.y + c * 0.1, [0, -1], '#a27a58', 7, 3.2);
          emit('mud', { orb: ev.orb, cell: ev.cell, color: lv.orbColor[ev.orb] });
          break;
        case 'flow':
          cellFlash[ev.cell] = abs;
          p = cellCenter(ev.cell);
          sparkle(p.x, p.y, '#a8f0ff', 3, 0.5);
          emit('flow', { orb: ev.orb, cell: ev.cell, dir: ev.dir, color: lv.orbColor[ev.orb] });
          break;
        case 'warp':
          cellFlash[ev.entry] = abs;
          cellFlash[ev.exit] = abs;
          p = cellCenter(ev.entry);
          sparkle(p.x, p.y, '#d9c8ff', 4, 0.6);
          p = cellCenter(ev.exit);
          sparkle(p.x, p.y, '#9ffff0', 5, 0.7);
          emit('warp', { orb: ev.orb, entry: ev.entry, exit: ev.exit, color: lv.orbColor[ev.orb] });
          break;
        case 'gate':
          cellFlash[ev.cell] = abs;
          p = cellCenter(ev.cell);
          col = Sprites.ORB_COLORS[lv.orbColor[ev.orb]];
          sparkle(p.x, p.y, col.light, 5, 0.6);
          fxPS.emit({ kind: 'ring', x: p.x, y: p.y, life: 460, size: c * 0.18, grow: c * 1.1, color: col.glow, alpha: 0.7 });
          emit('gate', { orb: ev.orb, cell: ev.cell, color: lv.orbColor[ev.orb] });
          break;
        case 'mirror':
          cellFlash[ev.cell] = abs;
          p = cellCenter(ev.cell);
          sparkle(p.x, p.y, '#dff6ff', 5, 0.7);
          emit('mirror', { orb: ev.orb, cell: ev.cell, from: ev.from, to: ev.to, color: lv.orbColor[ev.orb] });
          break;
        case 'oneway':
          cellFlash[ev.cell] = abs;
          p = cellCenter(ev.cell);
          sparkle(p.x, p.y, '#ffe3a0', 3, 0.5);
          emit('oneway', { orb: ev.orb, cell: ev.cell, dir: ev.dir, color: lv.orbColor[ev.orb] });
          break;
        case 'switch':
          cellFlash[ev.cell] = abs;
          p = cellCenter(ev.cell);
          sparkle(p.x, p.y, '#ffe0a0', 6, 0.8);
          fxPS.emit({ kind: 'ring', x: p.x, y: p.y, life: 520, size: c * 0.15, grow: c * 1.3, color: '#ffd98a', alpha: 0.8 });
          emit('switch', { orb: ev.orb, cell: ev.cell, color: lv.orbColor[ev.orb] });
          break;
        case 'door':
          swView = ev.closed ? 0 : 1;
          swAt = abs;
          if (!view.reduced) { lean.shake = Math.max(lean.shake, 0.55); lean.sdir = 2; }
          emit('door', { closed: ev.closed });
          break;
        case 'home':
          fx = orbFx[ev.orb];
          fx.homeT = abs;
          fx.homeCell = ev.cell;
          socketFlash[ev.socket] = abs;
          filledMask |= (1 << ev.socket);
          col = Sprites.ORB_COLORS[lv.orbColor[ev.orb]];
          p = cellCenter(ev.cell);
          fxPS.emit({ kind: 'ring', x: p.x, y: p.y, life: 620, size: c * 0.2, grow: c * 1.8, color: col.glow, alpha: 0.9 });
          fxPS.emit({ kind: 'ring', x: p.x, y: p.y, life: 820, size: c * 0.1, grow: c * 2.4, color: '#ffffff', alpha: 0.5 });
          sparkle(p.x, p.y, col.light, 12, 1);
          sparkle(p.x, p.y, '#ffffff', 5, 0.7);
          emit('home', { orb: ev.orb, cell: ev.cell, socket: ev.socket, color: lv.orbColor[ev.orb] });
          break;
        case 'bloom':
          bloomAt[ev.bud] = abs;
          bloomMask |= (1 << ev.bud);
          p = cellCenter(ev.cell);
          sparkle(p.x, p.y, '#ffd0ea', 9, 0.9);
          fxPS.emit({ kind: 'ring', x: p.x, y: p.y, life: 560, size: c * 0.15, grow: c * 1.5, color: '#ffb3dc', alpha: 0.8 });
          emit('bloom', { cell: ev.cell, bud: ev.bud });
          break;
        default:
          break;
      }
    }

    /** そのほしのこの最後の移動方向（衝突の向きの演出用） */
    function orbDirNow(orb) {
      if (!anim) return 1;
      var s = anim.segs[orb];
      if (!s.length) return anim.dir == null ? 1 : anim.dir;
      return s[s.length - 1].dir;
    }

    // -----------------------------------------------------------------------
    // ほしのこの表示位置と変形の計算
    // -----------------------------------------------------------------------

    /** そのほしのこの現在の見た目（セル座標 x,y と変形）を返す */
    function orbVisual(i) {
      var lv = view.level;
      var fx = orbFx[i];
      var out = { x: 0, y: 0, sx: 1, sy: 1, angle: 0, scale: 1, alpha: 1, eyes: 'open', mouth: 'smile', look: [0, 0], bob: 0, moving: false, glow: 0.55, shadow: 1, tilt: 0 };
      var cell = orbPos[i];
      var segs = anim ? anim.segs[i] : null;
      var e = anim ? now - anim.t0 : 0;
      var c = view.layout.cell;

      // 位置
      var homeEvTime = -1;
      if (anim && segs && segs.length) {
        var tm = anim.tickMs;
        var first = segs[0];
        var last = segs[segs.length - 1];
        if (e < first.k * tm) {
          out.x = first.from % lv.w; out.y = (first.from / lv.w) | 0;
        } else if (e >= (last.k + 1) * tm) {
          var fc = last.to;
          out.x = fc % lv.w; out.y = (fc / lv.w) | 0;
        } else {
          var j = Math.min(segs.length - 1, Math.floor(e / tm) - first.k);
          if (j < 0) j = 0;
          var sg = segs[j];
          var u = clamp((e - sg.k * tm) / tm, 0, 1);
          var isFirst = j === 0;
          var isLast = j === segs.length - 1;
          var fx0 = sg.from % lv.w, fy0 = (sg.from / lv.w) | 0;
          var tx = sg.to % lv.w, ty = (sg.to / lv.w) | 0;
          out.moving = true;
          var dv = DIR_VEC[sg.dir];
          out.look = [dv[0], dv[1]];
          out.angle = Sprites.DIR_ANGLE[sg.dir];
          if (sg.entry !== undefined) {
            // ワープ: 入口へ吸い込まれて縮み、出口で元の大きさに戻る
            var ex = sg.entry % lv.w, ey = (sg.entry / lv.w) | 0;
            if (u < 0.6) {
              var uu = Ease.inQuad(u / 0.6);
              out.x = lerp(fx0, ex, uu); out.y = lerp(fy0, ey, uu);
              out.scale = lerp(1, 0.25, uu);
              out.alpha = lerp(1, 0.6, uu);
            } else {
              var vv = (u - 0.6) / 0.4;
              out.x = tx; out.y = ty;
              out.scale = lerp(0.25, 1, Ease.outBack(vv));
              out.alpha = lerp(0.6, 1, vv);
            }
          } else {
            var uk = u;
            if (isFirst && isLast) uk = Ease.inOutQuad(u);
            else if (isFirst) uk = inPartial(u);
            else if (isLast) uk = outPartial(u);
            out.x = lerp(fx0, tx, uk); out.y = lerp(fy0, ty, uk);
          }
          var ramp = isFirst ? clamp(u * 3, 0, 1) : 1;
          var relax = isLast ? 1 - clamp((u - 0.7) / 0.3, 0, 1) * 0.6 : 1;
          var st = CONFIG.STRETCH * ramp * relax * (view.reduced ? 0.4 : 1);
          out.sx = 1 + st;
          out.sy = 1 - st * 0.65;
          out.mouth = 'o';
        }
        // 帰宅の時刻（このほしのこの home イベント）
        if (fx.homeT > -1e8) homeEvTime = fx.homeT;
      } else if (cell >= 0) {
        out.x = cell % lv.w; out.y = (cell / lv.w) | 0;
      } else if (fx.homeT > -1e8 && now - fx.homeT < CONFIG.HOME_MS) {
        // 帰宅演出の余韻（静止状態に反映された後も、おうちの上で縮んでいく）
        out.x = fx.homeCell % lv.w; out.y = (fx.homeCell / lv.w) | 0;
      } else {
        out.alpha = 0;
      }

      // 帰宅（おうちに吸い込まれる）
      if (fx.homeT > -1e8) {
        var tau = now - fx.homeT;
        var hu = clamp(tau / CONFIG.HOME_MS, 0, 1);
        if (tau < 0) hu = 0;
        out.scale *= Math.max(0, 1 - Ease.inQuad(hu));
        out.alpha *= 1 - clamp((hu - 0.55) / 0.45, 0, 1);
        out.y -= hu * 0.12;
        out.tilt = hu * 0.9;
        out.eyes = 'happy';
        out.mouth = 'happy';
        out.sx = 1; out.sy = 1;
        out.glow = 0.55 + hu * 0.8;
        if (hu >= 1) out.alpha = 0;
        homeEvTime = fx.homeT;
      }

      // 衝突の弾み
      var itau = now - fx.impactT;
      if (itau >= 0 && itau < CONFIG.IMPACT_MS && !out.moving && homeEvTime < 0) {
        var amp = fx.impactAmp * (view.reduced ? 0.4 : 1);
        var spr = Math.exp(-itau / 110) * Math.cos(itau / 52);
        out.angle = fx.impactAng;
        out.sx = 1 - amp * spr;
        out.sy = 1 + amp * 0.85 * spr;
      }
      // 登場の「ぽよん」
      var ptau = now - fx.popT;
      if (ptau >= 0 && ptau < 520) {
        var pu = ptau / 520;
        out.scale *= Ease.outBack(clamp(pu * 1.6, 0, 1));
        out.alpha *= clamp(pu * 4, 0, 1);
      } else if (ptau < 0) {
        out.scale = 0;
        out.alpha = 0;
      }
      // 無効手のぷるぷる
      if (nudge) {
        var ntau = now - nudge.t0;
        if (ntau < CONFIG.NUDGE_MS && cell >= 0 && !out.moving) {
          var nv = DIR_VEC[nudge.dir];
          var amt = Math.sin((ntau / CONFIG.NUDGE_MS) * Math.PI) * 0.08 * (view.reduced ? 0.3 : 1);
          out.x += nv[0] * amt;
          out.y += nv[1] * amt;
          out.look = [nv[0], nv[1]];
        }
      }
      // 表情
      if (!out.moving && homeEvTime < 0) {
        if (now < fx.mouthUntil) {
          out.mouth = fx.mouthStyle;
          out.eyes = fx.mouthStyle === 'ouch' ? 'ouch' : 'open';
        } else {
          if (now >= fx.nextBlink) { fx.blinkUntil = now + 130; fx.nextBlink = now + 2200 + Math.random() * 3800; }
          if (now < fx.blinkUntil) out.eyes = 'blink';
        }
        if (!view.reduced) out.bob = Math.sin(now * 0.0024 + fx.phase) * c * 0.012;
      } else if (out.moving) {
        out.eyes = 'open';
      }
      return out;
    }

    // -----------------------------------------------------------------------
    // 毎フレームの描画
    // -----------------------------------------------------------------------

    function drawDynamicTiles(g) {
      var lv = view.level;
      var L = view.layout;
      var c = L.cell;
      var th = view.world.theme;
      var x, y, i, cx, cy;
      for (y = 0; y < lv.h; y++) {
        for (x = 0; x < lv.w; x++) {
          i = y * lv.w + x;
          var t = lv.tile[i];
          if (t === TILE.VOID || t === TILE.WALL || t === TILE.FLOOR && lv.socketAt[i] < 0) continue;
          var px = L.ox + x * c;
          var py = L.oy + y * c;
          cx = px + c / 2;
          cy = py + c / 2;
          if (t === TILE.MUD) {
            Sprites.drawMud(g, cx, cy, c, now, i);
          } else if (t === TILE.ARROW) {
            var fl = cellFlash[i] ? Math.max(0, 1 - (now - cellFlash[i]) / 420) : 0;
            Sprites.drawFlow(g, px, py, c, lv.arrowDir[i], now, fl);
          } else if (t === TILE.PORTAL) {
            var pf = cellFlash[i] ? Math.max(0, 1 - (now - cellFlash[i]) / 500) : 0;
            Sprites.drawPortal(g, cx, cy, c, portalIndex[i] || 0, now, pf);
          } else if (t === TILE.GATE) {
            var gf = cellFlash[i] ? Math.max(0, 1 - (now - cellFlash[i]) / 520) : 0;
            var gd = cellDeny[i] ? Math.max(0, 1 - (now - cellDeny[i]) / 360) : 0;
            Sprites.drawGate(g, cx, cy, c, lv.gateColor[i], now, { flash: gf, deny: gd, marks: view.marks });
          } else if (t === TILE.MIRROR) {
            var mf = cellFlash[i] ? Math.max(0, 1 - (now - cellFlash[i]) / 460) : 0;
            Sprites.drawMirror(g, cx, cy, c, lv.mirrorKind[i], now, mf);
          } else if (t === TILE.ONEWAY) {
            var of = cellFlash[i] ? Math.max(0, 1 - (now - cellFlash[i]) / 420) : 0;
            var od = cellDeny[i] ? Math.max(0, 1 - (now - cellDeny[i]) / 360) : 0;
            Sprites.drawOneway(g, cx, cy, c, lv.onewayDir[i], now, { flash: of, deny: od });
          } else if (t === TILE.SWITCH) {
            var sf2 = cellFlash[i] ? Math.max(0, 1 - (now - cellFlash[i]) / 520) : 0;
            Sprites.drawSwitch(g, cx, cy, c, now, { sw: swView, flash: sf2 });
          } else if (t === TILE.DOOR) {
            var closedNow = lv.doorInit[i] ^ swView;
            var du = clamp((now - swAt) / CONFIG.DOOR_MS, 0, 1);
            var amt = du >= 1 ? closedNow : (closedNow ? Ease.outQuad(du) : 1 - Ease.outQuad(du));
            var dd = cellDeny[i] ? Math.max(0, 1 - (now - cellDeny[i]) / 300) : 0;
            Sprites.drawDoor(g, px + Math.sin(dd * 24) * c * 0.02 * dd, py, c, amt, now, swView);
          } else if (t === TILE.BUD) {
            var b = lv.budAt[i];
            if ((bloomMask >> b) & 1) {
              var gr = clamp((now - bloomAt[b]) / CONFIG.BLOOM_MS, 0, 1);
              Sprites.drawFlowerWall(g, px, py, c, th, Ease.outBack(gr), now);
            } else {
              Sprites.drawBud(g, cx, cy, c, now, i);
            }
          }
          var s = lv.socketAt[i];
          if (s >= 0) {
            var filled = (filledMask >> s) & 1;
            var sf = socketFlash[s] > -1e8 ? Math.max(0, 1 - (now - socketFlash[s]) / 700) : 0;
            Sprites.drawSocket(g, cx, cy, c, lv.sockColor[s], { t: now, filled: filled, flash: sf, phase: s * 1.7, marks: view.marks });
          }
        }
      }
    }

    function drawOrbs(g) {
      var lv = view.level;
      var L = view.layout;
      var c = L.cell;
      var R = c * 0.38;
      var order = [];
      for (var i = 0; i < lv.nOrbs; i++) order.push(i);
      var vis = {};
      for (i = 0; i < lv.nOrbs; i++) vis[i] = orbVisual(i);
      order.sort(function (a, b) { return vis[a].y - vis[b].y; });
      for (var n = 0; n < order.length; n++) {
        var k = order[n];
        var v = vis[k];
        if (v.alpha <= 0.01) continue;
        var cx = L.ox + (v.x + 0.5) * c;
        var cy = L.oy + (v.y + 0.5) * c;
        // 残像（移動中）
        if (v.moving && !view.reduced) {
          var last = anim.lastTrail[k] || 0;
          if (now - last >= CONFIG.TRAIL_EVERY) {
            anim.lastTrail[k] = now;
            var col = Sprites.ORB_COLORS[lv.orbColor[k]];
            trailPS.emit({ kind: 'glow', x: cx, y: cy, size: R * 1.05, life: 300, color: col.glow, alpha: 0.4 });
          }
        }
        Sprites.drawOrb(g, cx, cy, R, lv.orbColor[k], {
          sx: v.sx, sy: v.sy, angle: v.angle, scale: v.scale, alpha: v.alpha, bob: v.bob,
          rev: !!lv.orbRev[k], eyes: v.eyes, mouth: v.mouth, look: v.look, glow: v.glow, shadow: v.shadow, tilt: v.tilt,
        });
        if (view.marks) Sprites.drawMark(g, cx + R * 0.78, cy + R * 0.78, R * 0.36, lv.orbColor[k], v.alpha);
      }
    }

    /** ヒント: かたむける向きの辺に光の帯と矢印を出す（盤の内側に描くのでHUDと重ならない） */
    function drawHint(g) {
      if (!hint) return;
      var tt = now - hint.t0;
      if (tt > CONFIG.HINT_MS) { hint = null; return; }
      var L = view.layout;
      var lv = view.level;
      var c = L.cell;
      var bw = lv.w * c;
      var bh = lv.h * c;
      var fade = Math.min(1, tt / 200) * Math.min(1, (CONFIG.HINT_MS - tt) / 400);
      var p = 0.5 + 0.5 * Math.sin(tt * 0.008);
      var d = hint.dir;
      var accent = view.world.theme.accent;
      var band = c * 0.95;
      var x0 = L.ox, y0 = L.oy, gx0, gy0, gx1, gy1, rx, ry, rw, rh;
      if (d === 0) { rx = x0; ry = y0; rw = bw; rh = band; gx0 = 0; gy0 = y0; gx1 = 0; gy1 = y0 + band; }
      else if (d === 2) { rx = x0; ry = y0 + bh - band; rw = bw; rh = band; gx0 = 0; gy0 = y0 + bh; gx1 = 0; gy1 = y0 + bh - band; }
      else if (d === 3) { rx = x0; ry = y0; rw = band; rh = bh; gx0 = x0; gy0 = 0; gx1 = x0 + band; gy1 = 0; }
      else { rx = x0 + bw - band; ry = y0; rw = band; rh = bh; gx0 = x0 + bw; gy0 = 0; gx1 = x0 + bw - band; gy1 = 0; }
      g.save();
      g.globalAlpha = fade;
      g.globalCompositeOperation = 'lighter';
      var grad = g.createLinearGradient(gx0, gy0, gx1, gy1);
      grad.addColorStop(0, rgba(accent, 0.18 + 0.2 * p));
      grad.addColorStop(1, rgba(accent, 0));
      g.fillStyle = grad;
      g.fillRect(rx, ry, rw, rh);
      g.restore();
      // 矢印（辺の中央・内側）
      var ax = L.ox + bw / 2 + DIR_VEC[d][0] * (bw / 2 - c * 0.5);
      var ay = L.oy + bh / 2 + DIR_VEC[d][1] * (bh / 2 - c * 0.5);
      g.save();
      g.globalAlpha = fade;
      Sprites.drawHintArrow(g, ax, ay, c * 0.42, d, p, accent);
      g.restore();
    }

    view.draw = function (g, api) {
      now = api.time;
      if (!view.level) return;
      if (needsStatic) buildStatic();
      var dt = api.dt;
      var L = view.layout;
      var c = L.cell;
      var lv = view.level;
      var th = view.world.theme;

      // 再生中のイベントを進める
      if (anim) {
        while (anim.next < anim.events.length && anim.t0 + anim.events[anim.next].t <= now) {
          handleEvent(anim.events[anim.next], anim.t0 + anim.events[anim.next].t);
          anim.next++;
        }
        if (now >= anim.readyAt) notifyReady();
        if (now >= anim.endAt) finalizeAnim();
      }

      // 傾きの演出（盤面全体をほんの少し傾ける）
      var rate = 1 - Math.exp(-dt * 0.016);
      lean.x += (lean.tx - lean.x) * rate;
      lean.y += (lean.ty - lean.y) * rate;
      if (lean.shake > 0) lean.shake = Math.max(0, lean.shake - dt / 220);
      var shk = Math.sin(lean.shake * 18) * lean.shake * c * 0.05;
      var sv = DIR_VEC[lean.sdir];
      var bcx = L.ox + lv.w * c / 2;
      var bcy = L.oy + lv.h * c / 2;

      trailPS.density = view.reduced ? 0 : 1;
      fxPS.density = view.reduced ? 0.35 : 1;
      trailPS.update(dt);
      fxPS.update(dt);

      g.save();
      g.translate(bcx + lean.x * c * 0.04 + sv[0] * shk, bcy + lean.y * c * 0.04 + sv[1] * shk);
      g.rotate(lean.x * 0.014);
      g.translate(-bcx, -bcy);

      g.drawImage(statik.canvas, L.ox - L.pad, L.oy - L.pad, statik.w, statik.h);
      drawDynamicTiles(g);
      trailPS.draw(g);
      drawOrbs(g);
      fxPS.draw(g);
      drawHint(g);
      g.restore();
      void th;
    };

    cv.on('resize', function () { computeLayout(); });
    return view;
  }

  var BoardView = { CONFIG: CONFIG, create: create };

  Orgel.BoardView = BoardView;
  if (typeof module !== 'undefined' && module.exports) { module.exports = BoardView; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
