/* objectives.js — めもちょうに出す「いまの めあて」。フラグの状態から決まる（フラグ名は managements/30_design/flags.md） */
(function () {
  'use strict';
  var f = function (n) { return Game.save.flag(n); };

  Game.objectives = {
    /** 文字列の配列を返す（1 要素 = 1 項目） */
    current: function () {
      var out = [];
      if (!f('intro_done')) { return out; }
      if (f('cleared')) {
        out.push('みんなの えがおが もどった。');
        if (Game.save.count('star_') < 5) { out.push('ほしの かけらが まだ どこかに ある。'); }
        return out;
      }
      if (f('lamp_lit')) { out.push('みなとへ もどろう。'); return out; }
      if (!f('talked_grandpa')) { out.push('おじいちゃんに はなしを きいてみよう。'); return out; }
      var parts = ['got_oil', 'got_lens', 'got_flint'].filter(function (k) { return !f(k); });
      if (!parts.length) {
        out.push('3つ そろった。とうだいの てっぺんで ひを ともそう。');
        return out;
      }
      if (!f('got_oil')) {
        if (f('got_store_key')) { out.push('あぶら: そうこの なかに ある はず。'); }
        else if (f('gen_asked')) { out.push('あぶら: そうこの かぎを すなはまで さがそう。'); }
        else { out.push('あぶら: みなとの ゲンさんに きいてみよう。'); }
      }
      if (!f('got_lens')) {
        if (f('got_glasses')) { out.push('レンズ: めがねを ハルばあさんに とどけよう。'); }
        else if (f('haru_asked')) { out.push('レンズ: ハルばあさんの めがねを もりで さがそう。'); }
        else { out.push('レンズ: もりの ガラスこうぼうへ いこう。'); }
      }
      if (!f('got_flint')) {
        if (f('cave_solved')) { out.push('ひうちいし: ほらあなの おくの はこを あけよう。'); }
        else if (f('rock_moved')) { out.push('ひうちいし: ほらあなの なかを すすもう。'); }
        else { out.push('ひうちいし: もりの おくの ほらあなを さがそう。'); }
      }
      return out;
    }
  };
})();
