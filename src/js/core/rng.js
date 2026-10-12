(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * シード付き乱数（mulberry32）。
   * 同じシードなら必ず同じ列を返す。ステージ生成・テスト・BGMのバリエーションで使う。
   * Math.random は再現性が必要な処理では使わない。
   */

  /**
   * 文字列から32bitのシード値を作る（FNV-1a）。
   * @param {string} text 元の文字列
   * @returns {number} 符号なし32bit整数
   */
  function hashString(text) {
    var h = 0x811c9dc5;
    var s = String(text);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /**
   * 乱数生成器を作る。
   * @param {number|string} seed シード（数値または文字列）
   * @returns {{next:function():number, int:function(number):number, range:function(number,number):number,
   *            pick:function(Array):*, shuffle:function(Array):Array, chance:function(number):boolean}}
   */
  function create(seed) {
    var a = (typeof seed === 'string' ? hashString(seed) : (seed >>> 0)) || 0x9e3779b9;

    /** 0以上1未満の乱数 */
    function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** 0以上 n 未満の整数 */
    function int(n) {
      return Math.floor(next() * n);
    }

    /** lo 以上 hi 以下の整数（両端を含む） */
    function range(lo, hi) {
      return lo + int(hi - lo + 1);
    }

    /** 配列からランダムに1つ選ぶ */
    function pick(arr) {
      return arr[int(arr.length)];
    }

    /** 配列を破壊的にシャッフルして返す（Fisher-Yates） */
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = int(i + 1);
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    /** 確率 p で true */
    function chance(p) {
      return next() < p;
    }

    return { next: next, int: int, range: range, pick: pick, shuffle: shuffle, chance: chance };
  }

  var Rng = { create: create, hashString: hashString };

  Orgel.Rng = Rng;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Rng; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
