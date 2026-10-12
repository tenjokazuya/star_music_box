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
  var TILE = { VOID: 0, FLOOR: 1, WALL: 2, MUD: 3, ARROW: 4, PORTAL: 5, BUD: 6 };

  /** マップ文字の凡例 */
  var CH = {
    ORB: 'ABCD',      // ほしのこ（色A〜D）
    REV: '1234',      // さかさのこ（色A〜D）
    SOCKET: 'abcd',   // おうち（色A〜D）
    ARROW: '^>v<',    // ながれ（添字＝方向）
    PORTAL: '()[]',   // ワープ（組1=( ) 組2=[ ]）
  };

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
    return { pos: Int16Array.from(level.orbStart), filled: 0, bloom: 0 };
  }

  /** 状態を複製する */
  function cloneState(state) {
    return { pos: state.pos.slice(), filled: state.filled, bloom: state.bloom };
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
    return s + String.fromCharCode(state.filled, state.bloom);
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
            tk.events.push({
              type: steps[i] > 0 ? 'stop' : 'bump',
              orb: i,
              cell: pos[i],
              reason: why[i] === WHY_ORB ? 'orb' : 'wall',
            });
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
        }
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
      state: moved ? { pos: pos, filled: filled, bloom: bloom } : state,
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
