(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * かたむけ規則のシミュレーションエンジン（画面・音に依存しない純粋ロジック）。
   * 仕様の正本: managements/project/tech-design.md §3〜§5。仕様を変えるときは先に文書を直す。
   *
   * 使い方:
   *   var level = Orgel.Engine.parse(def);              // ステージ定義 → Level（不変。内部に作業用バッファを持つ）
   *   var state = Orgel.Engine.initialState(level);     // 初期状態
   *   var r = Orgel.Engine.step(level, state, DIR.R, { trace: true });   // 右へかたむける
   *   r.moved / r.state / r.ticks / r.solved
   */

  var CONFIG = {
    MIN_SIZE: 3,   // 盤面の最小サイズ（縦横）
    MAX_SIZE: 9,   // 盤面の最大サイズ（縦横）
    MAX_ORBS: 8,   // ほしのこの最大数（おうちのビットマスクを小さく保つため）
    MAX_BUDS: 16,  // つぼみの最大数
  };

  /** 方向: 0=上 1=右 2=下 3=左 */
  var DIR = { U: 0, R: 1, D: 2, L: 3 };
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];

  /** タイル種別（おうちは FLOOR 扱いで socketAt により別管理） */
  var TILE = { VOID: 0, FLOOR: 1, WALL: 2, MUD: 3, ARROW: 4, PORTAL: 5, BUD: 6, GATE: 7, MIRROR: 8, ONEWAY: 9, SWITCH: 10, DOOR: 11 };

  /** マップ文字の凡例 */
  var CH = {
    ORB: 'ABCD',      // ほしのこ（色A〜D）
    REV: '1234',      // さかさのこ（色A〜D）
    SOCKET: 'abcd',   // おうち（色A〜D）
    ARROW: '^>v<',    // ながれ（添字＝方向）
    PORTAL: '()[]',   // ワープ（組1=( ) 組2=[ ]）
    GATE: 'fghi',     // いろの もん（色A〜D。その色のほしのこだけ通れる）
    MIRROR: 'pq',     // こおりの かがみ（p=「／」 q=「＼」。到着したとき向きが直角に曲がる）
    ONEWAY: 'nesw',   // すなの もん（上・右・下・左へだけ入れる）
    SWITCH: '!',      // スイッチ（到着のたびに、とびらが開閉を切り替える）
    DOOR: '=-',       // とびら（=はじめ閉じている -はじめ開いている）
  };

  /** かがみで向きが変わる表（添字＝進んできた向き）。p=「／」: 上→右・右→上・下→左・左→下 / q=「＼」: 上→左・右→下・下→右・左→上 */
  var MIRROR_TURN = [[1, 0, 3, 2], [3, 2, 1, 0]];
  /** 入れなかった理由の種類（イベントの block.kind 用） */
  var BLOCK_KIND = ['', 'gate', 'oneway', 'door'];

  var WHY_WALL = 1; // 止まった理由: かべ・盤外・咲いたつぼみ
  var WHY_ORB = 2;  // 止まった理由: 別のほしのこ（行列の先頭が止まった／すれ違い／同じ到達セル）

  /** 配列 pos の中で cell にいるほしのこの番号（いなければ -1） */
  function orbAt(pos, n, cell) {
    for (var k = 0; k < n; k++) {
      if (pos[k] === cell) return k;
    }
    return -1;
  }

  /**
   * ステージ定義から Level を作る。問題があれば problems に日本語で積む。
   * @param {object} def ステージ定義
   * @param {{lenient:boolean}=} opts lenient=true で「ほしのことおうちの数の一致」を検査しない（テスト・実験用）
   * @returns {{level: ?object, problems: string[]}}
   */
  function buildLevel(def, opts) {
    var lenient = !!(opts && opts.lenient);
    var problems = [];
    var rows = def && def.map;
    if (!Array.isArray(rows) || rows.length === 0) {
      return { level: null, problems: ['map が空、または配列ではありません'] };
    }
    var h = rows.length;
    var w = typeof rows[0] === 'string' ? rows[0].length : 0;
    for (var r = 0; r < h; r++) {
      if (typeof rows[r] !== 'string') {
        problems.push('map の ' + (r + 1) + ' 行目が文字列ではありません');
      } else if (rows[r].length !== w) {
        problems.push('map の ' + (r + 1) + ' 行目の長さ(' + rows[r].length + ')が1行目(' + w + ')と違います');
      }
    }
    if (w < CONFIG.MIN_SIZE || h < CONFIG.MIN_SIZE || w > CONFIG.MAX_SIZE || h > CONFIG.MAX_SIZE) {
      problems.push('盤面の大きさ ' + w + '×' + h + ' は ' + CONFIG.MIN_SIZE + '〜' + CONFIG.MAX_SIZE + ' の範囲外です');
    }
    if (problems.length) return { level: null, problems: problems };

    var size = w * h;
    var tile = new Uint8Array(size);
    var arrowDir = new Int8Array(size).fill(-1);
    var socketAt = new Int16Array(size).fill(-1);
    var portalTo = new Int16Array(size).fill(-1);
    var budAt = new Int16Array(size).fill(-1);
    var portalChar = new Array(size);
    var gateColor = new Int8Array(size).fill(-1);
    var mirrorKind = new Int8Array(size).fill(-1);
    var onewayDir = new Int8Array(size).fill(-1);
    var doorInit = new Int8Array(size).fill(-1);
    var nSwitches = 0;
    var nDoors = 0;
    var orbs = [];
    var socks = [];
    var buds = [];
    var portalEnds = [[-1, -1], [-1, -1]];

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ch = rows[y].charAt(x);
        var idx = y * w + x;
        var k;
        if (ch === ' ') {
          tile[idx] = TILE.VOID;
        } else if (ch === '.') {
          tile[idx] = TILE.FLOOR;
        } else if (ch === '#') {
          tile[idx] = TILE.WALL;
        } else if ((k = CH.ORB.indexOf(ch)) >= 0) {
          tile[idx] = TILE.FLOOR;
          orbs.push({ cell: idx, color: k, rev: 0 });
        } else if ((k = CH.REV.indexOf(ch)) >= 0) {
          tile[idx] = TILE.FLOOR;
          orbs.push({ cell: idx, color: k, rev: 1 });
        } else if ((k = CH.SOCKET.indexOf(ch)) >= 0) {
          tile[idx] = TILE.FLOOR;
          socketAt[idx] = socks.length;
          socks.push({ cell: idx, color: k });
        } else if (ch === 'm') {
          tile[idx] = TILE.MUD;
        } else if ((k = CH.ARROW.indexOf(ch)) >= 0) {
          tile[idx] = TILE.ARROW;
          arrowDir[idx] = k;
        } else if ((k = CH.PORTAL.indexOf(ch)) >= 0) {
          tile[idx] = TILE.PORTAL;
          portalChar[idx] = ch;
          if (portalEnds[k >> 1][k & 1] !== -1) {
            problems.push('ワープ「' + ch + '」が2個以上あります (' + x + ',' + y + ')');
          }
          portalEnds[k >> 1][k & 1] = idx;
        } else if (ch === '*') {
          tile[idx] = TILE.BUD;
          budAt[idx] = buds.length;
          buds.push(idx);
        } else if ((k = CH.GATE.indexOf(ch)) >= 0) {
          tile[idx] = TILE.GATE;
          gateColor[idx] = k;
        } else if ((k = CH.MIRROR.indexOf(ch)) >= 0) {
          tile[idx] = TILE.MIRROR;
          mirrorKind[idx] = k;
        } else if ((k = CH.ONEWAY.indexOf(ch)) >= 0) {
          tile[idx] = TILE.ONEWAY;
          onewayDir[idx] = k;   // n/e/s/w の順が 上/右/下/左（方向 0〜3）
        } else if (ch === CH.SWITCH) {
          tile[idx] = TILE.SWITCH;
          nSwitches++;
        } else if ((k = CH.DOOR.indexOf(ch)) >= 0) {
          tile[idx] = TILE.DOOR;
          doorInit[idx] = k === 0 ? 1 : 0;   // = は閉、- は開
          nDoors++;
        } else {
          problems.push('(' + x + ',' + y + ') に定義されていない文字「' + ch + '」があります');
        }
      }
    }

    // ほしのこ・おうちの数の整合（色ごとに同数）
    if (orbs.length < 1) problems.push('ほしのこが1体もいません');
    if (orbs.length > CONFIG.MAX_ORBS) problems.push('ほしのこが多すぎます（最大 ' + CONFIG.MAX_ORBS + '）');
    if (buds.length > CONFIG.MAX_BUDS) problems.push('つぼみが多すぎます（最大 ' + CONFIG.MAX_BUDS + '）');
    var orbCount = [0, 0, 0, 0];
    var sockCount = [0, 0, 0, 0];
    orbs.forEach(function (o) { orbCount[o.color]++; });
    socks.forEach(function (s) { sockCount[s.color]++; });
    for (var c = 0; c < 4; c++) {
      if (!lenient && orbCount[c] !== sockCount[c]) {
        problems.push('色' + 'ABCD'.charAt(c) + ' のほしのこ(' + orbCount[c] + ')とおうち(' + sockCount[c] + ')の数が違います');
      }
    }

    // スイッチととびらは、両方あるか、両方ないか（片方だけでは切り替えるものが無い／切り替わらない）
    if (nSwitches > 0 && nDoors === 0) problems.push('スイッチがあるのに、とびらがありません');
    if (nDoors > 0 && nSwitches === 0) problems.push('とびらがあるのに、スイッチがありません');

    // ワープは各組の両端がそろっていて、隣り合っていないこと
    for (var pr = 0; pr < 2; pr++) {
      var a = portalEnds[pr][0];
      var b = portalEnds[pr][1];
      if ((a === -1) !== (b === -1)) {
        problems.push('ワープ組' + (pr + 1) + ' の片方しかありません');
      } else if (a !== -1) {
        var dist = Math.abs((a % w) - (b % w)) + Math.abs(((a / w) | 0) - ((b / w) | 0));
        if (dist < 2) problems.push('ワープ組' + (pr + 1) + ' の両端が隣り合っています');
        portalTo[a] = b;
        portalTo[b] = a;
      }
    }

    if (problems.length) return { level: null, problems: problems };

    var n = orbs.length;
    var groups = {};
    orbs.forEach(function (o, i) {
      var g = o.color * 2 + o.rev;
      (groups[g] || (groups[g] = [])).push(i);
    });

    var level = {
      id: (def && def.id) || '',
      name: (def && def.name) || '',
      hint: (def && def.hint) || '',
      par: (def && typeof def.par === 'number') ? def.par : 0,
      sol: (def && typeof def.sol === 'string') ? def.sol : '',   // 最短解（U/R/D/L の文字列）。ヒントの即答に使う
      world: (def && def.world) || 0,
      stage: (def && def.stage) || 0,
      w: w,
      h: h,
      maxTicks: 4 * w * h + 16,
      tile: tile,
      arrowDir: arrowDir,
      socketAt: socketAt,
      portalTo: portalTo,
      portalChar: portalChar,
      budAt: budAt,
      gateColor: gateColor,
      mirrorKind: mirrorKind,
      onewayDir: onewayDir,
      doorInit: doorInit,
      hasSwitch: nSwitches > 0,
      buds: buds,
      nBuds: buds.length,
      hasPortal: portalEnds[0][0] !== -1 || portalEnds[1][0] !== -1,
      nOrbs: n,
      orbColor: orbs.map(function (o) { return o.color; }),
      orbRev: orbs.map(function (o) { return o.rev; }),
      orbStart: Int16Array.from(orbs.map(function (o) { return o.cell; })),
      nSockets: socks.length,
      sockCell: socks.map(function (s) { return s.cell; }),
      sockColor: socks.map(function (s) { return s.color; }),
      groups: Object.keys(groups).map(function (g) { return groups[g]; }),
      // step() が使う作業用バッファ（Level は1つの実行コンテキストでのみ使うこと）
      _mdir: new Int8Array(n),
      _nxt: new Int16Array(n),
      _dst: new Int16Array(n),
      _blk: new Uint8Array(n),
      _why: new Uint8Array(n),
      _steps: new Int16Array(n),
      _arr: new Uint8Array(n),
      _budBefore: new Uint8Array(buds.length),
      _bk: new Uint8Array(n),   // 入れなかった理由（BLOCK_KIND の添字。0=なし）
      _bc: new Int16Array(n),   // 入れなかったセル
    };
    return { level: level, problems: [] };
  }

  /**
   * ステージ定義を検証して問題の配列を返す（例外は投げない）。問題が無ければ空配列。
   * @param {object} def ステージ定義
   * @param {{lenient:boolean}=} opts buildLevel と同じ
   * @returns {string[]}
   */
  function validate(def, opts) {
    return buildLevel(def, opts).problems;
  }

  /**
   * ステージ定義を Level に変換する。不正なら日本語メッセージつきの例外。
   * @param {object} def ステージ定義（技術設計書 §3）
   * @param {{lenient:boolean}=} opts buildLevel と同じ
   * @returns {object} Level
   */
  function parse(def, opts) {
    var res = buildLevel(def, opts);
    if (res.problems.length) {
      throw new Error('ステージ「' + ((def && def.id) || '?') + '」の定義が不正です:\n- ' + res.problems.join('\n- '));
    }
    return res.level;
  }

  /** 初期状態を作る */
  function initialState(level) {
    return { pos: Int16Array.from(level.orbStart), filled: 0, bloom: 0, sw: 0 };
  }

  /** 状態を複製する */
  function cloneState(state) {
    return { pos: state.pos.slice(), filled: state.filled, bloom: state.bloom, sw: state.sw | 0 };
  }

  /** 全員が帰宅したか */
  function isSolved(level, state) {
    for (var i = 0; i < level.nOrbs; i++) {
      if (state.pos[i] >= 0) return false;
    }
    return true;
  }

  /**
   * 状態を一意な文字列にする（探索の重複排除用）。
   * 色・さかさが同じほしのこは区別しない（位置を昇順に並べ替えて正規化する）。
   */
  function key(level, state) {
    var groups = level.groups;
    var pos = state.pos;
    var s = '';
    for (var g = 0; g < groups.length; g++) {
      var idx = groups[g];
      if (idx.length === 1) {
        s += String.fromCharCode(pos[idx[0]] + 1);
      } else {
        var tmp = [];
        for (var k = 0; k < idx.length; k++) tmp.push(pos[idx[k]] + 1);
        tmp.sort(function (p, q) { return p - q; });
        for (var m = 0; m < tmp.length; m++) s += String.fromCharCode(tmp[m]);
      }
    }
    return s + String.fromCharCode(state.filled, state.bloom, state.sw | 0);
  }

  /**
   * 1手（かたむけ）を進める。技術設計書 §5 の規則どおり。
   * 入力の state は変更しない。無効手（何も動かない）のときは入力の state をそのまま返す。
   *
   * @param {object} level Level
   * @param {object} state 現在の State（静止状態）
   * @param {number} dir かたむける向き（DIR.U/R/D/L）
   * @param {{trace:boolean}=} opts trace=true で演出用のティック記録を返す
   * @returns {{moved:boolean, state:object, ticks:?Array, solved:boolean, loops:boolean}}
   *   ticks[t].moves  : { orb, from, to, dir, entry? }  そのティックの移動（entry=ワープ入口セル）
   *   ticks[t].events : そのティックの出来事。type は
   *     'stop'/'bump'（ティック開始時点で発生: 動いた後に止まった／1マスも動けなかった。reason='wall'|'orb'）
   *     'home'/'mud'/'flow'/'warp'/'bloom'/'loop'（ティック終了時点で発生）
   */
  function step(level, state, dir, opts) {
    var wantTrace = !!(opts && opts.trace);
    var w = level.w;
    var h = level.h;
    var n = level.nOrbs;
    var tile = level.tile;
    var socketAt = level.socketAt;
    var sockColor = level.sockColor;
    var portalTo = level.portalTo;
    var budAt = level.budAt;
    var buds = level.buds;
    var arrowDir = level.arrowDir;
    var orbColor = level.orbColor;
    var gateColor = level.gateColor;
    var onewayDir = level.onewayDir;
    var doorInit = level.doorInit;
    var mirrorKind = level.mirrorKind;
    var bk = level._bk;
    var bc = level._bc;
    var mdir = level._mdir;
    var nxt = level._nxt;
    var dst = level._dst;
    var blk = level._blk;
    var why = level._why;
    var steps = level._steps;
    var arr = level._arr;

    var pos = state.pos.slice();
    var filled = state.filled;
    var bloom = state.bloom;
    var sw = state.sw | 0;
    var moved = false;
    var loops = false;
    var ticks = wantTrace ? [] : null;
    var i, j, k;

    for (i = 0; i < n; i++) {
      steps[i] = 0;
      mdir[i] = pos[i] < 0 ? -1 : (level.orbRev[i] ? (dir + 2) & 3 : dir);
    }

    for (var tick = 0; ; tick++) {
      var movers = 0;
      for (i = 0; i < n; i++) {
        if (mdir[i] >= 0) movers++;
      }
      if (movers === 0) break;

      var tk = wantTrace ? { moves: [], events: [] } : null;

      // 安全装置: 打ち切り（ながれが環になっている場合）
      if (tick >= level.maxTicks) {
        loops = true;
        for (i = 0; i < n; i++) {
          if (mdir[i] >= 0) {
            if (wantTrace) tk.events.push({ type: 'loop', orb: i, cell: pos[i] });
            mdir[i] = -1;
          }
        }
        if (wantTrace) ticks.push(tk);
        break;
      }

      // 1. 各ほしのこの「次のセル」と「到達セル（ワープ先）」を決める
      for (i = 0; i < n; i++) {
        blk[i] = 1;
        nxt[i] = -1;
        dst[i] = -1;
        why[i] = 0;
        arr[i] = 0;
        bk[i] = 0;
        bc[i] = 0;
        if (mdir[i] < 0) continue;
        var d = mdir[i];
        var p = pos[i];
        var nx = (p % w) + DX[d];
        var ny = ((p / w) | 0) + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) { why[i] = WHY_WALL; continue; }
        var q = ny * w + nx;
        var t = tile[q];
        if (t === TILE.VOID || t === TILE.WALL || (t === TILE.BUD && ((bloom >> budAt[q]) & 1))) {
          why[i] = WHY_WALL;
          continue;
        }
        // いろの もん（ほかの色には かべ）・すなの もん（矢印の向きにだけ入れる）・閉じたとびら
        if (t === TILE.GATE && gateColor[q] !== orbColor[i]) { why[i] = WHY_WALL; bk[i] = 1; bc[i] = q; continue; }
        if (t === TILE.ONEWAY && onewayDir[q] !== d) { why[i] = WHY_WALL; bk[i] = 2; bc[i] = q; continue; }
        if (t === TILE.DOOR && (doorInit[q] ^ sw)) { why[i] = WHY_WALL; bk[i] = 3; bc[i] = q; continue; }
        nxt[i] = q;
        dst[i] = (t === TILE.PORTAL) ? portalTo[q] : q;
        blk[i] = 0;
      }

      // 2. 衝突の解決（ブロックが確定しなくなるまで繰り返す）
      var changed = true;
      while (changed) {
        changed = false;
        for (i = 0; i < n; i++) {
          if (mdir[i] < 0 || blk[i]) continue;
          // (a) 進む先（ワープ入口・出口）に止まっている／ブロックされたほしのこがいる
          j = orbAt(pos, n, nxt[i]);
          if (j >= 0 && (mdir[j] < 0 || blk[j])) { blk[i] = 1; why[i] = WHY_ORB; changed = true; continue; }
          if (dst[i] !== nxt[i]) {
            j = orbAt(pos, n, dst[i]);
            if (j >= 0 && (mdir[j] < 0 || blk[j])) { blk[i] = 1; why[i] = WHY_ORB; changed = true; continue; }
          }
          // (b) 同じセルを目指す／(c) すれ違い → 両方ブロック
          for (k = 0; k < n; k++) {
            if (k === i || mdir[k] < 0 || blk[k]) continue;
            if (dst[k] === dst[i] || (dst[i] === pos[k] && dst[k] === pos[i])) {
              blk[i] = 1; blk[k] = 1;
              why[i] = WHY_ORB; why[k] = WHY_ORB;
              changed = true;
              break;
            }
          }
        }
      }

      // 3. ブロックされたほしのこはこのかたむけの残りの間、停止する
      for (i = 0; i < n; i++) {
        if (mdir[i] >= 0 && blk[i]) {
          if (wantTrace) {
            var bev = {
              type: steps[i] > 0 ? 'stop' : 'bump',
              orb: i,
              cell: pos[i],
              reason: why[i] === WHY_ORB ? 'orb' : 'wall',
            };
            if (bk[i]) bev.block = { cell: bc[i], kind: BLOCK_KIND[bk[i]] };
            tk.events.push(bev);
          }
          mdir[i] = -1;
        }
      }

      // つぼみの「ティック開始時に誰かが乗っていたか」を記録
      for (var b = 0; b < level.nBuds; b++) {
        level._budBefore[b] = ((bloom >> b) & 1) ? 0 : (orbAt(pos, n, buds[b]) >= 0 ? 1 : 0);
      }

      // 4. 残ったほしのこが同時に移動する
      for (i = 0; i < n; i++) {
        if (mdir[i] < 0) continue;
        var from = pos[i];
        pos[i] = dst[i];
        steps[i]++;
        arr[i] = 1;
        moved = true;
        if (wantTrace) {
          var mv = { orb: i, from: from, to: dst[i], dir: mdir[i] };
          if (nxt[i] !== dst[i]) mv.entry = nxt[i];
          tk.moves.push(mv);
        }
      }

      // 5. 到着したセルでの効果（ほしのこ番号の小さい順）
      var swCount = 0;
      for (i = 0; i < n; i++) {
        if (!arr[i]) continue;
        var c = pos[i];
        if (nxt[i] !== dst[i] && wantTrace) tk.events.push({ type: 'warp', orb: i, entry: nxt[i], exit: c });
        var s = socketAt[c];
        if (s >= 0 && !((filled >> s) & 1) && sockColor[s] === orbColor[i]) {
          filled |= (1 << s);
          pos[i] = -1;
          mdir[i] = -1;
          if (wantTrace) tk.events.push({ type: 'home', orb: i, cell: c, socket: s });
          continue;
        }
        var tt = tile[c];
        if (tt === TILE.MUD) {
          mdir[i] = -1;
          if (wantTrace) tk.events.push({ type: 'mud', orb: i, cell: c });
        } else if (tt === TILE.ARROW) {
          mdir[i] = arrowDir[c];
          if (wantTrace) tk.events.push({ type: 'flow', orb: i, cell: c, dir: arrowDir[c] });
        } else if (tt === TILE.MIRROR) {
          var d0 = mdir[i];
          var d1 = MIRROR_TURN[mirrorKind[c]][d0];
          mdir[i] = d1;
          if (wantTrace) tk.events.push({ type: 'mirror', orb: i, cell: c, from: d0, to: d1 });
        } else if (tt === TILE.SWITCH) {
          swCount++;
          if (wantTrace) tk.events.push({ type: 'switch', orb: i, cell: c });
        } else if (wantTrace) {
          if (tt === TILE.GATE) tk.events.push({ type: 'gate', orb: i, cell: c });
          else if (tt === TILE.ONEWAY) tk.events.push({ type: 'oneway', orb: i, cell: c, dir: mdir[i] });
        }
      }

      // スイッチ: このティックに着いたほしのこが奇数なら、とびらが切り替わる（次のティックの計画から効く）
      if (swCount & 1) {
        sw ^= 1;
        if (wantTrace) tk.events.push({ type: 'door', closed: sw === 0 });
      }

      // 6. つぼみ: ティック開始時に乗っていて、終了時に誰もいなければ咲く
      for (b = 0; b < level.nBuds; b++) {
        if (!level._budBefore[b]) continue;
        if (orbAt(pos, n, buds[b]) < 0) {
          bloom |= (1 << b);
          if (wantTrace) tk.events.push({ type: 'bloom', cell: buds[b], bud: b });
        }
      }

      if (wantTrace) ticks.push(tk);
    }

    var solved = true;
    for (i = 0; i < n; i++) {
      if (pos[i] >= 0) { solved = false; break; }
    }
    return {
      moved: moved,
      state: moved ? { pos: pos, filled: filled, bloom: bloom, sw: sw } : state,
      ticks: ticks,
      solved: solved,
      loops: loops,
    };
  }

  /**
   * 状態を文字の行にして返す（デバッグ・テスト用）。
   * ほしのこは大文字（さかさは数字）、未使用のおうちは小文字、使用済みのおうちは床、咲いたつぼみはかべ。
   * @returns {string[]}
   */
  function toRows(level, state) {
    var rows = [];
    for (var y = 0; y < level.h; y++) {
      var row = '';
      for (var x = 0; x < level.w; x++) {
        var idx = y * level.w + x;
        var o = orbAt(state.pos, level.nOrbs, idx);
        if (o >= 0) {
          row += level.orbRev[o] ? CH.REV.charAt(level.orbColor[o]) : CH.ORB.charAt(level.orbColor[o]);
          continue;
        }
        var s = level.socketAt[idx];
        if (s >= 0) {
          row += ((state.filled >> s) & 1) ? '.' : CH.SOCKET.charAt(level.sockColor[s]);
          continue;
        }
        switch (level.tile[idx]) {
          case TILE.VOID: row += ' '; break;
          case TILE.FLOOR: row += '.'; break;
          case TILE.WALL: row += '#'; break;
          case TILE.MUD: row += 'm'; break;
          case TILE.ARROW: row += CH.ARROW.charAt(level.arrowDir[idx]); break;
          case TILE.PORTAL: row += level.portalChar[idx]; break;
          case TILE.BUD: row += ((state.bloom >> level.budAt[idx]) & 1) ? '#' : '*'; break;
          case TILE.GATE: row += CH.GATE.charAt(level.gateColor[idx]); break;
          case TILE.MIRROR: row += CH.MIRROR.charAt(level.mirrorKind[idx]); break;
          case TILE.ONEWAY: row += CH.ONEWAY.charAt(level.onewayDir[idx]); break;
          case TILE.SWITCH: row += CH.SWITCH; break;
          case TILE.DOOR: row += (level.doorInit[idx] ^ (state.sw | 0)) ? CH.DOOR.charAt(0) : CH.DOOR.charAt(1); break;   // いまの開閉の状態
          default: row += '?';
        }
      }
      rows.push(row);
    }
    return rows;
  }

  var Engine = {
    CONFIG: CONFIG,
    DIR: DIR,
    DX: DX,
    DY: DY,
    TILE: TILE,
    CH: CH,
    MIRROR_TURN: MIRROR_TURN,
    BLOCK_KIND: BLOCK_KIND,
    parse: parse,
    validate: validate,
    initialState: initialState,
    cloneState: cloneState,
    isSolved: isSolved,
    key: key,
    step: step,
    toRows: toRows,
  };

  Orgel.Engine = Engine;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Engine; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
