(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * ワールド設定（見た目の色調・選択画面の一言）。音の設定（調・BGM・環境音）は src/js/audio/ 側にある。
   * story は選択画面で名前の下に出す一言（名前は繰り返さない）。
   * 仕様の正本: managements/project/game-design.md §1.1・§5・§8.3。
   *
   * theme の意味:
   *   sky       空・背景のグラデーション（上→下）
   *   accent    差し色（光・強調）
   *   tile      床タイルの色（上面）／tileEdge 縁の光
   *   wallTop / wallSide / wallGlow  かべ（水晶ブロック）の上面・側面・光
   *   star      星の量（0〜1）
   */
  var WORLDS = [
    {
      id: 1,
      name: 'ゆうぐれの おか',
      short: 'おか',
      story: 'さいしょの ほしのこが ころがっている',
      theme: {
        sky: ['#1b1440', '#5a2a6e', '#e8825a'],
        accent: '#ffd166',
        tile: '#b79cff', tileEdge: '#e6d9ff',
        wallTop: '#6a5aa8', wallSide: '#35296b', wallGlow: '#b79cff',
        star: 0.7,
      },
    },
    {
      id: 2,
      name: 'ひかりの どうくつ',
      short: 'どうくつ',
      story: 'ぬかるみと みずの ながれに ごようじん',
      theme: {
        sky: ['#04141a', '#082d38', '#0d4a52'],
        accent: '#7ff5e0',
        tile: '#6fe8d8', tileEdge: '#c8fff6',
        wallTop: '#2f8a93', wallSide: '#12474f', wallGlow: '#7ff5e0',
        star: 0.15,
      },
    },
    {
      id: 3,
      name: 'つきよの うみ',
      short: 'うみ',
      story: 'うずしおが ほしのこを べつの ばしょへ つれていく',
      theme: {
        sky: ['#050c24', '#0a1d4a', '#0d2a5c'],
        accent: '#9fc7ff',
        tile: '#8fb8ff', tileEdge: '#dbe9ff',
        wallTop: '#3d62b0', wallSide: '#1b3470', wallGlow: '#9fc7ff',
        star: 0.9,
      },
    },
    {
      id: 4,
      name: 'くもの うえ',
      short: 'くも',
      story: 'ここでは ほしのこが さかさまに ころがる',
      theme: {
        sky: ['#14123a', '#3b2a78', '#d97ab5'],
        accent: '#ffb3d9',
        tile: '#f0c8ff', tileEdge: '#fff0ff',
        wallTop: '#8e6bc4', wallSide: '#473476', wallGlow: '#ffb3d9',
        star: 0.6,
      },
    },
    {
      id: 5,
      name: 'ほしの ちゅうしん',
      short: 'ちゅうしん',
      story: 'つぼみが さくと、みちが かわる',
      theme: {
        sky: ['#07040f', '#2a1060', '#6a2aa8'],
        accent: '#ffe08a',
        tile: '#d9b8ff', tileEdge: '#fff2c8',
        wallTop: '#7a4fc0', wallSide: '#3a1f78', wallGlow: '#ffe08a',
        star: 1.0,
      },
    },
  ];

  Orgel.Worlds = WORLDS;
  if (typeof module !== 'undefined' && module.exports) { module.exports = WORLDS; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
