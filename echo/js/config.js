/* config.js ― 定数・設定値 */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var EB = root.EB = root.EB || {};

  // 救済用の隠し機能（難易度選択画面での隠しコマンドで切り替え。保存はしない＝起動のたびにOFF）
  EB.Cheat = { invincible: false };

  EB.CFG = {
    TITLE: 'ECHO BEACON',
    SUBTITLE: '遠き救難信号',
    VERSION: '1.0.0',
    // 論理解像度
    W: 320, H: 240,
    // プレイ空間（画面左）
    FX: 8, FY: 8, FW: 192, FH: 224,
    // 右ステータス領域
    PX: 208, PY: 8, PW: 104, PH: 224,
    FPS: 60,
    // 自機
    PLAYER_SPEED: 1.9,
    PLAYER_SLOW: 0.85,
    PLAYER_HIT_R: 1.5,
    PLAYER_GRAZE_R: 9,
    DEATHBOMB_FRAMES: 9,
    RESPAWN_INVULN: 150,
    BOMB_FRAMES: 150,
    BOMB_INVULN: 210,
    MAX_BULLETS: 1400,
    MAX_PSHOTS: 260,
    MAX_PARTICLES: 700,
    STAGES: 5,
    EXTEND_SCORES: [200000, 500000, 1000000, 2000000, 3000000, 5000000],
    // 難易度
    DIFF: {
      easy:   { name: 'EASY',   label: 'かんたん', spd: 0.82, cnt: 0.65, hp: 0.8,  aim: 0.7, rate: 1.15, score: 0.8 },
      normal: { name: 'NORMAL', label: 'ふつう',   spd: 1.0,  cnt: 1.0,  hp: 1.0,  aim: 1.0, rate: 1.0,  score: 1.0 },
      hard:   { name: 'HARD',   label: 'むずかしい', spd: 1.16, cnt: 1.4,  hp: 1.25, aim: 1.3, rate: 0.82, score: 1.3 }
    },
    DIFF_ORDER: ['easy', 'normal', 'hard']
  };

  // 特別エンディング（希望のある結末）の条件：NORMAL 以上で、ノーコンティニューのままクリア。
  // 満たさない場合は通常エンディング（暗い結末）になる。最終ステージ後の会話・エンディングの両方がこの判定を共用する。
  EB.isTrueEnding = function (diffKey, continues) {
    var o = EB.CFG.DIFF_ORDER;
    return o.indexOf(diffKey) >= o.indexOf('normal') && !continues;
  };
})();
