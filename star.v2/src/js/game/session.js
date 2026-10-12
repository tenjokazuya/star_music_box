(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Engine = Orgel.Engine || require('../core/engine.js');

  /**
   * プレイセッション: 1ステージのプレイ状態（現在の状態・手数・もどす履歴・クリア判定）。
   * 画面や演出には依存しない。仕様: managements/project/game-design.md §3。
   */

  /**
   * ★の数を返す（企画書 §3）。★3＝par以内、★2＝par＋max(2, par÷2を四捨五入)以内、★1＝クリア。
   * @param {number} par 最短手数
   * @param {number} moves クリアまでの手数
   * @returns {number} 1〜3
   */
  function starsFor(par, moves) {
    if (moves <= par) return 3;
    if (moves <= par + Math.max(2, Math.round(par / 2))) return 2;
    return 1;
  }

  /** ★2・★3 の手数のしきい値を返す（表示用） */
  function starLimits(par) {
    return { three: par, two: par + Math.max(2, Math.round(par / 2)) };
  }

  /**
   * @param {object} level Engine.parse の結果
   * @returns {object} session
   */
  function create(level) {
    var initial = Engine.initialState(level);
    var s = {
      level: level,
      state: initial,
      history: [],
      moves: 0,
      undos: 0,
      hints: 0,
      solved: false,
      startedAt: Date.now(),
    };

    /**
     * かたむける。有効手なら状態を進めて { moved:true, result } を返す。無効手は { moved:false }。
     * result は Engine.step の結果（trace つき）。
     */
    s.tilt = function (dir) {
      if (s.solved) return { moved: false, result: null };
      var r = Engine.step(level, s.state, dir, { trace: true });
      if (!r.moved) return { moved: false, result: r };
      s.history.push(s.state);
      s.state = r.state;
      s.moves++;
      s.solved = r.solved;
      return { moved: true, result: r };
    };

    /** 1手もどす。もどせなければ null、もどせたら新しい状態を返す */
    s.undo = function () {
      if (!s.history.length) return null;
      s.state = s.history.pop();
      s.moves--;
      s.undos++;
      s.solved = false;
      return s.state;
    };

    /** 最初からやりなおす。初期状態を返す */
    s.reset = function () {
      s.state = initial;
      s.history = [];
      s.moves = 0;
      s.solved = false;
      return s.state;
    };

    s.canUndo = function () { return s.history.length > 0; };
    s.stars = function () { return starsFor(level.par, s.moves); };
    return s;
  }

  var Session = { create: create, starsFor: starsFor, starLimits: starLimits };

  Orgel.Session = Session;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Session; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
