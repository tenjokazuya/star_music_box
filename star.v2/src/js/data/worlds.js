(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * ワールド設定（見た目の色調・選択画面の一言）。音の設定（調・BGM・環境音）は src/js/audio/ 側にある。
   * story は選択画面で名前の下に出す一言（名前は繰り返さない）。
   * 仕様の正本: managements/project/game-design.md §1.1・§5・§8.3（ワールド6〜18は managements/project/expansion.md §2）。
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
    {
      id: 6,
      name: 'もりの いずみ',
      short: 'もり',
      story: 'おなじ いろの ほしのこだけ とおす もんが ある',
      theme: {
        sky: ['#03110c', '#0a2a1d', '#17402c'],
        accent: '#c8ff8a',
        tile: '#b5e48c', tileEdge: '#eaffd0',
        wallTop: '#3f7d4a', wallSide: '#1c3b24', wallGlow: '#9ae6a0',
        star: 0.5,
      },
    },
    {
      id: 7,
      name: 'こおりの ほこら',
      short: 'こおり',
      story: 'つるつるの かがみが、ほしのこの みちを ななめに まげる',
      theme: {
        sky: ['#05122a', '#0e2f55', '#2a6a8f'],
        accent: '#aef0ff',
        tile: '#bfe9ff', tileEdge: '#f0fbff',
        wallTop: '#7ab8e0', wallSide: '#2f5f8f', wallGlow: '#c8f2ff',
        star: 0.8,
      },
    },
    {
      id: 8,
      name: 'さばくの よぞら',
      short: 'さばく',
      story: 'すなの もんは、やじるしの むきにしか はいれない',
      theme: {
        sky: ['#120a24', '#3a1f4a', '#c46a4a'],
        accent: '#ffd98a',
        tile: '#f0d2a0', tileEdge: '#fff0cf',
        wallTop: '#b8895a', wallSide: '#6b4630', wallGlow: '#ffd98a',
        star: 0.9,
      },
    },
    {
      id: 9,
      name: 'あかりの みなと',
      short: 'みなと',
      story: 'ちょうちんの あかりの したで、もんと ぬかるみが まっている',
      theme: {
        sky: ['#071426', '#14304f', '#31567a'],
        accent: '#ffb35c',
        tile: '#9bc4e8', tileEdge: '#e0f0ff',
        wallTop: '#5c7fa8', wallSide: '#27405f', wallGlow: '#ffb35c',
        star: 0.6,
      },
    },
    {
      id: 10,
      name: 'ほしぞらの とうだい',
      short: 'とうだい',
      story: 'とうだいの ひかりが かがみで はねて、うずしおが よびこむ',
      theme: {
        sky: ['#050a1f', '#0c1c46', '#1c3a78'],
        accent: '#fff3b0',
        tile: '#a8b8ff', tileEdge: '#e8ecff',
        wallTop: '#5468b8', wallSide: '#242f6e', wallGlow: '#fff3b0',
        star: 1,
      },
    },
    {
      id: 11,
      name: 'ふかい うみの そこ',
      short: 'うみのそこ',
      story: 'ふかい うみで、さかさの こと いっぽうつうこうの もんが まつ',
      theme: {
        sky: ['#02070f', '#052033', '#0a4a5a'],
        accent: '#68f0ff',
        tile: '#5fd0e0', tileEdge: '#b8f4ff',
        wallTop: '#2a7f95', wallSide: '#0f3b4a', wallGlow: '#68f0ff',
        star: 0.05,
      },
    },
    {
      id: 12,
      name: 'からくりの まち',
      short: 'からくり',
      story: 'スイッチを ふむと、とびらが ひらいたり しまったり',
      theme: {
        sky: ['#140a1f', '#3a1f4a', '#6a3a5a'],
        accent: '#ffcf6b',
        tile: '#e0c48a', tileEdge: '#fff0c8',
        wallTop: '#9a6b3a', wallSide: '#4e3220', wallGlow: '#ffcf6b',
        star: 0.3,
      },
    },
    {
      id: 13,
      name: 'にじの はし',
      short: 'にじ',
      story: 'いろの もんと かがみが、にじいろに ならぶ はし',
      theme: {
        sky: ['#0e1b4a', '#2f4fa0', '#6fa8e0'],
        accent: '#ffd6f5',
        tile: '#cfe8ff', tileEdge: '#ffffff',
        wallTop: '#a88ae0', wallSide: '#5a3f9a', wallGlow: '#ffd0f0',
        star: 0.5,
      },
    },
    {
      id: 14,
      name: 'かざんの ほし',
      short: 'かざん',
      story: 'ぬかるみと かがみと いっぽうつうこうが ひしめく ほし',
      theme: {
        sky: ['#120505', '#3a0f0a', '#8a2a10'],
        accent: '#ff9a4a',
        tile: '#e8b090', tileEdge: '#ffe0c8',
        wallTop: '#6a4a50', wallSide: '#2a1a22', wallGlow: '#ff7a3a',
        star: 0.2,
      },
    },
    {
      id: 15,
      name: 'ゆめの ずかん',
      short: 'ゆめ',
      story: 'ページを めくると、スイッチと つぼみと もんが めざめる',
      theme: {
        sky: ['#150a30', '#3a1f6a', '#7a4ab0'],
        accent: '#ffc8f0',
        tile: '#c8d0ff', tileEdge: '#f2f4ff',
        wallTop: '#9a6ad0', wallSide: '#4a2a80', wallGlow: '#ffc8f0',
        star: 0.9,
      },
    },
    {
      id: 16,
      name: 'つきの うらがわ',
      short: 'つきのうら',
      story: 'しずかな うらがわで、さかさの こが かがみに ゆれる',
      theme: {
        sky: ['#06080f', '#14202e', '#2a3a4c'],
        accent: '#c8e0ff',
        tile: '#c0ccdc', tileEdge: '#f0f6ff',
        wallTop: '#8a98ac', wallSide: '#3a4658', wallGlow: '#d8ecff',
        star: 0.8,
      },
    },
    {
      id: 17,
      name: 'ほしの うみ',
      short: 'ほしのうみ',
      story: 'すべての しかけが うずまく、ほしくずの うみ',
      theme: {
        sky: ['#050515', '#1a0f45', '#3a1a7a'],
        accent: '#7ff5e0',
        tile: '#b0a8ff', tileEdge: '#e8e4ff',
        wallTop: '#5a4ab8', wallSide: '#2a1f78', wallGlow: '#7ff5e0',
        star: 1,
      },
    },
    {
      id: 18,
      name: 'ほしの たまてばこ',
      short: 'たまてばこ',
      story: 'いちばん おくで、オルゴールの しんが まっている',
      theme: {
        sky: ['#1a0830', '#4a1a6a', '#b0704a'],
        accent: '#ffe08a',
        tile: '#ffe9b8', tileEdge: '#fff8e0',
        wallTop: '#c89a3a', wallSide: '#6a4a1a', wallGlow: '#ffe08a',
        star: 1,
      },
    },
  ];

  Orgel.Worlds = WORLDS;
  if (typeof module !== 'undefined' && module.exports) { module.exports = WORLDS; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
