(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Engine = Orgel.Engine || require('./engine.js');

  /**
   * ソルバー（幅優先探索）。ステージ検証・難易度指標・ゲーム内ヒントに使う。
   * 状態は Engine.key で重複排除する（同じ種類のほしのこの並び違いは同一視）。
   * 仕様の正本: managements/project/tech-design.md §6。
   */

  var CONFIG = {
    SOLVE_MAX_STATES: 600000,    // solve の探索状態数の上限（既定）
    ANALYZE_MAX_STATES: 600000,  // analyze の探索状態数の上限（既定）
    HINT_MAX_STATES: 150000,     // hint の探索状態数の上限
    HINT_MAX_MS: 400,            // hint の探索時間の上限（ミリ秒）
  };

  /** 経路（方向の配列）を親リンクからたどって作る */
  function buildPath(parent, pdir, idx) {
    var path = [];
    while (parent[idx] >= 0) {
      path.push(pdir[idx]);
      idx = parent[idx];
    }
    return path.reverse();
  }

  /**
   * 最短手数の解を求める（BFS）。
   * @param {object} level Level
   * @param {object=} start 開始状態（省略時は初期状態）
   * @param {{maxStates:number, maxMs:number}=} opts 打ち切り条件
   * @returns {{solvable:boolean, length:number, path:?number[], explored:number, truncated:boolean, loops:boolean}}
   *   truncated=true のときは「解なし」とは限らない（探索を打ち切った）
   */
  function solve(level, start, opts) {
    var maxStates = (opts && opts.maxStates) || CONFIG.SOLVE_MAX_STATES;
    var deadline = (opts && opts.maxMs) ? Date.now() + opts.maxMs : 0;
    var s0 = start || Engine.initialState(level);
    if (Engine.isSolved(level, s0)) {
      return { solvable: true, length: 0, path: [], explored: 1, truncated: false, loops: false };
    }
    var states = [s0];
    var parent = [-1];
    var pdir = [-1];
    var seen = new Map();
    seen.set(Engine.key(level, s0), 0);
    var sawLoop = false;

    for (var head = 0; head < states.length; head++) {
      if (deadline && (head & 255) === 0 && Date.now() > deadline) {
        return { solvable: false, length: -1, path: null, explored: states.length, truncated: true, loops: sawLoop };
      }
      var cur = states[head];
      for (var d = 0; d < 4; d++) {
        var r = Engine.step(level, cur, d);
        if (!r.moved) continue;
        if (r.loops) sawLoop = true;
        var k = Engine.key(level, r.state);
        if (seen.has(k)) continue;
        var idx = states.length;
        seen.set(k, idx);
        states.push(r.state);
        parent.push(head);
        pdir.push(d);
        if (r.solved) {
          var path = buildPath(parent, pdir, idx);
          return { solvable: true, length: path.length, path: path, explored: states.length, truncated: false, loops: sawLoop };
        }
        if (states.length >= maxStates) {
          return { solvable: false, length: -1, path: null, explored: states.length, truncated: true, loops: sawLoop };
        }
      }
    }
    return { solvable: false, length: -1, path: null, explored: states.length, truncated: false, loops: sawLoop };
  }

  /**
   * 初期状態から到達できる全状態を探索し、難易度の指標を返す（検証ツール用）。
   * @param {object} level Level
   * @param {{maxStates:number}=} opts
   * @returns {object}
   *   solvable      解があるか
   *   par           最短手数（解なしなら -1）
   *   states        到達可能な状態数
   *   transitions   有効な遷移の総数
   *   solutionCount 最短解の個数（方向列として異なるもの）
   *   firstMoves    最短解の最初の一手になりうる向き（0=上 1=右 2=下 3=左）
   *   deadStates    もうクリアできない状態の数／deadRatio その割合
   *   maxDepth      初期状態からの最大距離
   *   avgBranch     1状態あたりの平均の有効手数
   *   randomP       でたらめに（4方向を等確率で）操作したとき、par の何倍の手数以内に解ける確率 { x2, x4 }
   *   loops         ながれの環が発生したか
   *   truncated     状態数の上限で打ち切ったか（true なら指標は不完全）
   */
  function analyze(level, opts) {
    var maxStates = (opts && opts.maxStates) || CONFIG.ANALYZE_MAX_STATES;
    var s0 = Engine.initialState(level);
    var states = [s0];
    var depth = [0];
    var ways = [1];
    var edges = [];
    var solvedAt = [];
    var seen = new Map();
    seen.set(Engine.key(level, s0), 0);
    var sawLoop = false;
    var truncated = false;
    var transitions = 0;
    var head, d, i, j;

    for (head = 0; head < states.length; head++) {
      var cur = states[head];
      var out = [];
      var isSolved = Engine.isSolved(level, cur);
      solvedAt.push(isSolved ? 1 : 0);
      if (!isSolved) {
        for (d = 0; d < 4; d++) {
          var r = Engine.step(level, cur, d);
          if (!r.moved) continue;
          if (r.loops) sawLoop = true;
          var k = Engine.key(level, r.state);
          var idx = seen.get(k);
          if (idx === undefined) {
            if (states.length >= maxStates) { truncated = true; continue; }
            idx = states.length;
            seen.set(k, idx);
            states.push(r.state);
            depth.push(depth[head] + 1);
            ways.push(0);
          }
          if (depth[idx] === depth[head] + 1) ways[idx] += ways[head];
          out.push(idx);
          transitions++;
        }
      }
      edges.push(out);
    }

    var n = states.length;

    // 解のある状態からの逆向き探索で「ゴールまでの距離」を求める
    var preds = new Array(n);
    for (i = 0; i < n; i++) preds[i] = [];
    for (i = 0; i < n; i++) {
      for (j = 0; j < edges[i].length; j++) preds[edges[i][j]].push(i);
    }
    var dist = new Int32Array(n).fill(-1);
    var queue = [];
    for (i = 0; i < n; i++) {
      if (solvedAt[i]) { dist[i] = 0; queue.push(i); }
    }
    for (var qh = 0; qh < queue.length; qh++) {
      var cu = queue[qh];
      for (j = 0; j < preds[cu].length; j++) {
        var pr = preds[cu][j];
        if (dist[pr] < 0) { dist[pr] = dist[cu] + 1; queue.push(pr); }
      }
    }

    var par = dist[0]; // 初期状態からゴールまでの最短手数（-1 なら解なし）
    var solutionCount = 0;
    var maxDepth = 0;
    var dead = 0;
    var nonTerminal = 0;
    for (i = 0; i < n; i++) {
      if (depth[i] > maxDepth) maxDepth = depth[i];
      if (solvedAt[i]) {
        if (depth[i] === par) solutionCount += ways[i];
      } else {
        nonTerminal++;
        if (dist[i] < 0) dead++;
      }
    }

    // 最短解の最初の一手
    var firstMoves = [];
    if (par > 0) {
      for (d = 0; d < 4; d++) {
        var r0 = Engine.step(level, s0, d);
        if (!r0.moved) continue;
        var i0 = seen.get(Engine.key(level, r0.state));
        if (i0 !== undefined && dist[i0] >= 0 && dist[i0] + 1 === par) firstMoves.push(d);
      }
    }

    // でたらめな操作で解ける確率（4方向を等確率で選び、動けない手は何も起こらない）
    function randomSolveProb(horizon) {
      var p = new Float64Array(n);
      var q = new Float64Array(n);
      p[0] = 1;
      var absorbed = 0;
      for (var t = 0; t < horizon; t++) {
        q.fill(0);
        for (var s = 0; s < n; s++) {
          var mass = p[s];
          if (mass === 0) continue;
          var es = edges[s];
          var share = mass / 4;
          for (var e = 0; e < es.length; e++) q[es[e]] += share;
          q[s] += share * (4 - es.length);
        }
        for (var u = 0; u < n; u++) {
          if (solvedAt[u] && q[u] > 0) { absorbed += q[u]; q[u] = 0; }
        }
        var tmp = p; p = q; q = tmp;
      }
      return absorbed;
    }

    var randomP = { x2: 0, x4: 0 };
    if (par > 0 && !truncated) {
      randomP.x2 = randomSolveProb(par * 2);
      randomP.x4 = randomSolveProb(par * 4);
    }

    return {
      solvable: par >= 0,
      par: par,
      states: n,
      transitions: transitions,
      solutionCount: solutionCount,
      firstMoves: firstMoves,
      deadStates: dead,
      deadRatio: nonTerminal ? dead / nonTerminal : 0,
      maxDepth: maxDepth,
      avgBranch: nonTerminal ? transitions / nonTerminal : 0,
      randomP: randomP,
      loops: sawLoop,
      truncated: truncated,
    };
  }

  /**
   * ゲーム内ヒント: 現在の状態からの最短解の第一手を返す。
   * @param {object} level Level
   * @param {object} state 現在の状態
   * @param {{maxStates:number, maxMs:number}=} opts
   * @returns {{status:string, dir:number, length:number}}
   *   status: 'ok'（dir が第一手。すでに解けていれば dir=-1）／'stuck'（もう解けない）／'timeout'（探索を打ち切った）
   */
  function hint(level, state, opts) {
    var res = solve(level, state, {
      maxStates: (opts && opts.maxStates) || CONFIG.HINT_MAX_STATES,
      maxMs: (opts && opts.maxMs) || CONFIG.HINT_MAX_MS,
    });
    if (res.solvable) return { status: 'ok', dir: res.path.length ? res.path[0] : -1, length: res.length };
    if (res.truncated) return { status: 'timeout', dir: -1, length: -1 };
    return { status: 'stuck', dir: -1, length: -1 };
  }

  var Solver = { CONFIG: CONFIG, solve: solve, analyze: analyze, hint: hint };

  Orgel.Solver = Solver;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Solver; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
