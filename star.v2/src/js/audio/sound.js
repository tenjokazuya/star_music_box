(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * 音の窓口。画面・ゲームロジックはここだけを呼ぶ（効果音・環境音・BGMの実体は Phase 4 で登録される）。
   * 実体（impl）が無い・音が使えない環境では、何も起きない（例外も出さない）。
   *
   *   Sound.sfx('ui_click');                    // 効果音
   *   Sound.scene('play', worldId);             // 画面に合わせて BGM と環境音を切り替える
   *                                             //   'boot' | 'title' | 'select' | 'play' | 'worldclear' | 'ending'
   *   Sound.jingle('clear', {stars: 3});        // ジングル（BGMを一時的に下げて鳴らす）
   *   Sound.applySettings(settings);            // セーブデータの設定（音量・ミュート）を反映
   */

  var Sound = {
    impl: null,

    /** 実体を登録する（Sfx / Music / Ambience を束ねたもの） */
    register: function (impl) { Sound.impl = impl; },

    sfx: function (id, opts) {
      if (Sound.impl && Sound.impl.sfx) Sound.impl.sfx(id, opts || {});
    },
    scene: function (name, worldId) {
      if (Sound.impl && Sound.impl.scene) Sound.impl.scene(name, worldId || 1);
    },
    jingle: function (id, opts) {
      if (Sound.impl && Sound.impl.jingle) Sound.impl.jingle(id, opts || {});
    },
    applySettings: function (s) {
      if (Sound.impl && Sound.impl.applySettings) Sound.impl.applySettings(s);
    },
    /** ユーザー操作の中で呼ぶ。音の準備ができたら true */
    unlock: function () {
      var eng = Orgel.Audio ? Orgel.Audio.ensure() : null;
      if (eng && Sound.impl && Sound.impl.attach) Sound.impl.attach(eng);
      return !!eng;
    },
  };

  Orgel.Sound = Sound;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Sound; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
