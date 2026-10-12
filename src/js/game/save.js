(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * セーブデータ。localStorage の `orgel.save.v1` に JSON で保存する。
   * 保存できない環境（プライベートモード等）でも例外で止まらず、メモリ上で動き続ける。
   * 読み込み時に型と範囲を検証し、壊れた値は既定値にフォールバックする。
   * 仕様: managements/project/tech-design.md §10、game-design.md §11。
   */

  var KEY = 'orgel.save.v1';

  function defaults() {
    return {
      v: 1,
      stages: {},   // 'W-S': { cleared, best(最少手数), stars(0〜3), hints(最少のヒント使用数ではなく累計) }
      settings: { bgm: 0.5, sfx: 0.8, amb: 0.5, master: 0.8, muted: false, reduced: false, marks: false },
      stats: { plays: 0, moves: 0, undos: 0, hints: 0, seconds: 0 },
      flags: { endingSeen: false, helpSeen: false, worlds: {} },
    };
  }

  function num(v, lo, hi, fallback) {
    return (typeof v === 'number' && isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : fallback;
  }
  function int(v, lo, hi, fallback) {
    return Math.round(num(v, lo, hi, fallback));
  }
  function bool(v, fallback) {
    return typeof v === 'boolean' ? v : fallback;
  }

  /** 読み込んだ値を検証して、安全な形に直す */
  function sanitize(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    var s = raw.settings || {};
    d.settings.bgm = num(s.bgm, 0, 1, d.settings.bgm);
    d.settings.sfx = num(s.sfx, 0, 1, d.settings.sfx);
    d.settings.amb = num(s.amb, 0, 1, d.settings.amb);
    d.settings.master = num(s.master, 0, 1, d.settings.master);
    d.settings.muted = bool(s.muted, d.settings.muted);
    d.settings.reduced = bool(s.reduced, d.settings.reduced);
    d.settings.marks = bool(s.marks, d.settings.marks);
    var t = raw.stats || {};
    Object.keys(d.stats).forEach(function (k) { d.stats[k] = int(t[k], 0, 1e9, 0); });
    var f = raw.flags || {};
    d.flags.endingSeen = bool(f.endingSeen, false);
    d.flags.helpSeen = bool(f.helpSeen, false);
    if (f.worlds && typeof f.worlds === 'object') {
      Object.keys(f.worlds).forEach(function (w) {
        if (/^\d+$/.test(w) && f.worlds[w] === true) d.flags.worlds[w] = true;
      });
    }
    if (raw.stages && typeof raw.stages === 'object') {
      Object.keys(raw.stages).forEach(function (id) {
        if (!/^\d+-\d+$/.test(id)) return;
        var st = raw.stages[id];
        if (!st || typeof st !== 'object') return;
        d.stages[id] = {
          cleared: bool(st.cleared, false),
          best: int(st.best, 0, 9999, 0),
          stars: int(st.stars, 0, 3, 0),
          hints: int(st.hints, 0, 1e6, 0),
        };
        if (!d.stages[id].cleared) d.stages[id].stars = 0;
      });
    }
    return d;
  }

  /** localStorage が使えなければメモリ上の代用品を返す */
  function defaultStorage() {
    try {
      if (root.localStorage) {
        var probe = '__orgel_probe__';
        root.localStorage.setItem(probe, '1');
        root.localStorage.removeItem(probe);
        return root.localStorage;
      }
    } catch (err) { /* 使えない環境 */ }
    var mem = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; },
    };
  }

  /**
   * @param {{getItem:function, setItem:function, removeItem:function}=} storage 省略時は localStorage（無ければメモリ）
   */
  function create(storage) {
    var store = storage || defaultStorage();
    var data;

    function load() {
      try {
        var text = store.getItem(KEY);
        return sanitize(text ? JSON.parse(text) : null);
      } catch (err) {
        return defaults();
      }
    }

    function flush() {
      try {
        store.setItem(KEY, JSON.stringify(data));
        return true;
      } catch (err) {
        return false; // 容量不足・保存禁止でもゲームは続ける
      }
    }

    data = load();

    var save = {
      get data() { return data; },
      flush: flush,

      /** ステージの記録（なければ null） */
      stageInfo: function (id) { return data.stages[id] || null; },

      /**
       * クリアを記録する。
       * @returns {{first:boolean, newBest:boolean, stars:number}} first=初めてのクリア, newBest=最少手数を更新, stars=今回の★
       */
      recordClear: function (id, moves, par, hints) {
        var stars = Orgel.Session ? Orgel.Session.starsFor(par, moves) : (moves <= par ? 3 : 1);
        var cur = data.stages[id];
        var first = !cur || !cur.cleared;
        var newBest = first || moves < cur.best;
        if (!cur) cur = data.stages[id] = { cleared: false, best: 0, stars: 0, hints: 0 };
        cur.cleared = true;
        if (newBest) cur.best = moves;
        cur.stars = Math.max(cur.stars, stars);
        cur.hints += hints || 0;
        flush();
        return { first: first, newBest: newBest, stars: stars };
      },

      totalStars: function () {
        var n = 0;
        Object.keys(data.stages).forEach(function (id) { n += data.stages[id].stars; });
        return n;
      },

      clearedCount: function () {
        var n = 0;
        Object.keys(data.stages).forEach(function (id) { if (data.stages[id].cleared) n++; });
        return n;
      },

      /**
       * ステージが遊べるか。前のステージ（ワールドの1面目なら前ワールドの最終面）をクリアしていれば開放。
       * @param {object[]} levels ステージ定義（順序どおり）
       * @param {number} index levels の添字
       * @param {boolean=} unlockAll 全開放（?unlock=all）
       */
      isUnlocked: function (levels, index, unlockAll) {
        if (unlockAll || index <= 0) return true;
        var prev = data.stages[levels[index - 1].id];
        return !!(prev && prev.cleared);
      },

      /** 「つづきから」で遊ぶステージの添字（最初の未クリア面）。すべてクリア済みなら -1 */
      nextToPlay: function (levels) {
        for (var i = 0; i < levels.length; i++) {
          var st = data.stages[levels[i].id];
          if (!st || !st.cleared) return i;
        }
        return -1;
      },

      /** そのワールドのすべてのステージをクリアしたか */
      worldCleared: function (levels, world) {
        var any = false;
        for (var i = 0; i < levels.length; i++) {
          if (levels[i].world !== world) continue;
          any = true;
          var st = data.stages[levels[i].id];
          if (!st || !st.cleared) return false;
        }
        return any;
      },

      /** ワールドクリア演出を見たことを記録する。初めてなら true */
      markWorldSeen: function (world) {
        var key = String(world);
        if (data.flags.worlds[key]) return false;
        data.flags.worlds[key] = true;
        flush();
        return true;
      },

      setSetting: function (name, value) {
        var d = defaults().settings;
        if (!Object.prototype.hasOwnProperty.call(d, name)) return;
        if (typeof d[name] === 'boolean') data.settings[name] = !!value;
        else data.settings[name] = num(value, 0, 1, d[name]);
        flush();
      },

      setFlag: function (name, value) {
        data.flags[name] = !!value;
        flush();
      },

      addStats: function (add) {
        Object.keys(data.stats).forEach(function (k) {
          if (add && typeof add[k] === 'number') data.stats[k] += Math.max(0, Math.round(add[k]));
        });
        flush();
      },

      /** すべての進行を消す（設定も初期値に戻る） */
      reset: function () {
        data = defaults();
        try { store.removeItem(KEY); } catch (err) { /* 失敗しても続ける */ }
        return data;
      },
    };
    return save;
  }

  var Save = { KEY: KEY, create: create, sanitize: sanitize, defaults: defaults };

  Orgel.Save = Save;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Save; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
