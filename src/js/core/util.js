(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * 描画・演出で使う小さな数学・色の関数集。画面にも音にも依存しない。
   */

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** 0〜1 の t を、区間 [a, b] の 0〜1 に変換して返す（範囲外は 0/1 に丸める） */
  function range01(t, a, b) {
    return clamp((t - a) / (b - a), 0, 1);
  }

  var Ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return 1 - (1 - t) * (1 - t); },
    inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    /** 行き過ぎてから戻る（ぽよん） */
    outBack: function (t) {
      var c1 = 1.70158;
      var c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    /** ばね（ぷるぷる） */
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    },
  };

  /** '#rrggbb' → [r, g, b] */
  function hexToRgb(hex) {
    var h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /** '#rrggbb' と透明度から 'rgba(...)' を作る */
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /** 2色を混ぜる（t=0 で a、t=1 で b）。結果は '#rrggbb' */
  function mix(hexA, hexB, t) {
    var a = hexToRgb(hexA);
    var b = hexToRgb(hexB);
    var out = '#';
    for (var i = 0; i < 3; i++) {
      var v = Math.round(lerp(a[i], b[i], t));
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return out;
  }

  /** 明るくする（白に近づける）。amount は 0〜1 */
  function lighten(hex, amount) {
    return mix(hex, '#ffffff', amount);
  }

  /** 暗くする（黒に近づける）。amount は 0〜1 */
  function darken(hex, amount) {
    return mix(hex, '#000000', amount);
  }

  var Util = {
    clamp: clamp,
    lerp: lerp,
    range01: range01,
    Ease: Ease,
    hexToRgb: hexToRgb,
    rgba: rgba,
    mix: mix,
    lighten: lighten,
    darken: darken,
  };

  Orgel.Util = Util;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Util; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
