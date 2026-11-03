/* 客のドット絵を部品から合成してキャッシュする。
 * 体(22x14) + 頭(14x12) + 髪 + 表情 + アクセサリ。キャンバスは 22x30、足元(下端中央)が基準。 */
(function (RP) {
  'use strict';

  var G = RP.gfx, U = RP.util;
  var CA = RP.cust = {};
  CA.W = 22; CA.H = 30;
  var HX = 4, HY = 5;   // 頭の左上

  var HEAD = [
    '..KKKKKKKKKK..',
    '.KssssssssssK.',
    'KssssssssssssK',
    'KssssssssssssK',
    'KssssssssssssK',
    'KssssssssssssK',
    'KssssssssssssK',
    'KssssssssssssK',
    '.KssssssssssK.',
    '.KSssssssssSK.',
    '..KSSssssSSK..',
    '...KKKKKKKK...'
  ];

  var cache = {};

  function shade(hex) { return U.mixHex(G.color(hex), '#14101c', 0.35); }

  function px(cx, x, y, w, h, col) { cx.fillStyle = G.color(col); cx.fillRect(x, y, w, h); }

  // 髪の領域：[dy, dx, w]（頭左上基準）。Kで1px縁取りしてから塗る
  var HAIR = {
    short:  [[-2, 3, 8], [-1, 1, 12], [0, 0, 14], [1, 0, 14], [2, 0, 2], [2, 12, 2], [3, 0, 1], [3, 13, 1]],
    side:   [[-2, 3, 8], [-1, 1, 12], [0, 0, 14], [1, 0, 14], [2, 0, 3], [2, 11, 3], [3, 0, 1], [3, 13, 1]],
    spiky:  [[-4, 3, 2], [-4, 7, 2], [-3, 2, 3], [-3, 6, 3], [-3, 10, 2], [-2, 1, 12], [-1, 0, 14], [0, 0, 14], [1, 0, 3], [1, 11, 3], [2, 0, 2], [2, 12, 2]],
    bob:    [[-2, 3, 8], [-1, 1, 12], [0, 0, 14], [1, 0, 14], [2, 0, 3], [2, 11, 3], [3, 0, 2], [3, 12, 2], [4, 0, 2], [4, 12, 2], [5, 0, 2], [5, 12, 2], [6, 0, 2], [6, 12, 2]],
    long:   [[-2, 3, 8], [-1, 1, 12], [0, 0, 14], [1, 0, 14], [2, 0, 3], [2, 11, 3], [3, 0, 2], [3, 12, 2], [4, 0, 2], [4, 12, 2], [5, 0, 2], [5, 12, 2], [6, 0, 2], [6, 12, 2], [7, 0, 2], [7, 12, 2], [8, 0, 2], [8, 12, 2]],
    bun:    [[-5, 5, 4], [-4, 4, 6], [-3, 5, 4], [-2, 3, 8], [-1, 1, 12], [0, 0, 14], [1, 0, 14], [2, 0, 2], [2, 12, 2], [3, 0, 1], [3, 13, 1]],
    bald:   [[3, 0, 1], [3, 13, 1], [4, 0, 1], [4, 13, 1]],
    towel:  [[3, 0, 1], [3, 13, 1]],
    mage:   [[-5, 5, 4], [-4, 4, 6], [-2, 3, 8], [-1, 1, 12], [0, 0, 14], [1, 0, 14], [2, 0, 2], [2, 12, 2]],
    glasses:[[-2, 3, 8], [-1, 1, 12], [0, 0, 14], [1, 0, 14], [2, 0, 2], [2, 12, 2], [3, 0, 1], [3, 13, 1]]
  };

  function drawHair(cx, look, back) {
    var spans = HAIR[look.hair] || HAIR.short;
    var col = look.hairCol, dark = shade(col);
    if (back) {
      if (look.hair === 'long') { px(cx, HX - 1, HY + 2, 16, 11, 'ink'); px(cx, HX, HY + 2, 14, 11, dark); }
      return;
    }
    // 縁取り
    cx.fillStyle = G.color('ink');
    spans.forEach(function (s) { cx.fillRect(HX + s[1] - 1, HY + s[0] - 1, s[2] + 2, 3); });
    cx.fillStyle = G.color(col);
    spans.forEach(function (s) { cx.fillRect(HX + s[1], HY + s[0], s[2], 1); });
    // つやと影
    if (look.hair !== 'bald' && look.hair !== 'towel') {
      px(cx, HX + 3, HY - 1, 3, 1, U.mixHex(G.color(col), '#ffffff', 0.35));
      px(cx, HX + 1, HY + 1, 12, 1, dark);
    }
    if (look.hair === 'bald') { px(cx, HX + 3, HY + 1, 2, 1, 'white'); px(cx, HX + 5, HY, 2, 1, 'white'); }
    if (look.hair === 'towel') {
      // 鉢巻き（タオル）
      px(cx, HX - 1, HY - 1, 16, 4, 'ink'); px(cx, HX, HY, 14, 2, 'white'); px(cx, HX, HY + 1, 14, 1, 'silver');
      px(cx, HX + 12, HY + 2, 3, 2, 'white');
      px(cx, HX - 1, HY - 2, 16, 1, 'ink'); px(cx, HX, HY - 1, 14, 1, 'cream');
    }
    if (look.hair === 'mage') { px(cx, HX + 6, HY - 4, 2, 1, U.mixHex(G.color(col), '#ffffff', 0.4)); }
  }

  function drawFace(cx, look, mood, frame) {
    var x = HX, y = HY;
    var ink = 'ink';
    if (mood === 'happy') {
      // ^ ^
      px(cx, x + 3, y + 6, 1, 1, ink); px(cx, x + 4, y + 5, 1, 1, ink); px(cx, x + 5, y + 6, 1, 1, ink);
      px(cx, x + 8, y + 6, 1, 1, ink); px(cx, x + 9, y + 5, 1, 1, ink); px(cx, x + 10, y + 6, 1, 1, ink);
      px(cx, x + 5, y + 8, 4, 1, ink); px(cx, x + 6, y + 9, 2, 1, 'red');
      px(cx, x + 1, y + 7, 2, 1, 'pink'); px(cx, x + 11, y + 7, 2, 1, 'pink');
    } else if (mood === 'angry') {
      px(cx, x + 2, y + 3, 1, 1, ink); px(cx, x + 3, y + 4, 2, 1, ink); px(cx, x + 5, y + 4, 1, 1, ink);
      px(cx, x + 11, y + 3, 1, 1, ink); px(cx, x + 9, y + 4, 2, 1, ink); px(cx, x + 8, y + 4, 1, 1, ink);
      px(cx, x + 3, y + 5, 2, 2, ink); px(cx, x + 9, y + 5, 2, 2, ink);
      px(cx, x + 5, y + 9, 1, 1, ink); px(cx, x + 6, y + 8, 2, 1, ink); px(cx, x + 8, y + 9, 1, 1, ink);
      px(cx, x + 1, y + 7, 2, 2, 'red'); px(cx, x + 11, y + 7, 2, 2, 'red');
      px(cx, x + 6, y + 1, 2, 1, 'red');
    } else if (mood === 'eat') {
      px(cx, x + 3, y + 6, 3, 1, ink); px(cx, x + 8, y + 6, 3, 1, ink);
      if (frame) { px(cx, x + 5, y + 8, 4, 2, ink); px(cx, x + 6, y + 9, 2, 1, 'red'); }
      else { px(cx, x + 6, y + 8, 2, 1, ink); }
      px(cx, x + 1, y + 7, 2, 1, 'pink'); px(cx, x + 11, y + 7, 2, 1, 'pink');
    } else if (mood === 'sour') {
      px(cx, x + 3, y + 5, 2, 2, ink); px(cx, x + 9, y + 5, 2, 2, ink);
      px(cx, x + 5, y + 9, 1, 1, ink); px(cx, x + 6, y + 8, 1, 1, ink); px(cx, x + 7, y + 9, 1, 1, ink); px(cx, x + 8, y + 8, 1, 1, ink);
    } else if (mood === 'wait') {
      px(cx, x + 3, y + 5, 2, 2, ink); px(cx, x + 9, y + 5, 2, 2, ink);
      px(cx, x + 3, y + 5, 1, 1, 'white'); px(cx, x + 9, y + 5, 1, 1, 'white');
      px(cx, x + 6, y + 9, 2, 1, ink);
    } else {
      px(cx, x + 3, y + 5, 2, 2, ink); px(cx, x + 9, y + 5, 2, 2, ink);
      px(cx, x + 3, y + 5, 1, 1, 'white'); px(cx, x + 9, y + 5, 1, 1, 'white');
      px(cx, x + 6, y + 8, 2, 1, ink);
    }
    if (look.glasses) {
      px(cx, x + 2, y + 4, 5, 1, ink); px(cx, x + 2, y + 7, 5, 1, ink); px(cx, x + 2, y + 5, 1, 2, ink); px(cx, x + 6, y + 5, 1, 2, ink);
      px(cx, x + 8, y + 4, 5, 1, ink); px(cx, x + 8, y + 7, 5, 1, ink); px(cx, x + 8, y + 5, 1, 2, ink); px(cx, x + 12, y + 5, 1, 2, ink);
      px(cx, x + 7, y + 5, 1, 1, ink);
    }
  }

  // 体（22x14）。y=16から。
  function drawBody(cx, look) {
    var c1 = look.c1, c2 = look.c2, by = 16;
    function row(dy, x0, x1, col) { px(cx, x0, by + dy, x1 - x0 + 1, 1, col); }
    // 肩の形（縁取り）
    var shape = [[6, 15], [3, 18], [1, 20], [0, 21]];
    var i;
    for (i = 0; i < 14; i++) {
      var sh = shape[Math.min(i, 3)];
      row(i, sh[0], sh[1], 'ink');
    }
    for (i = 0; i < 14; i++) {
      var s2 = shape[Math.min(i, 3)];
      row(i, s2[0] + 1, s2[1] - 1, c1);
    }
    // 影（両脇）
    px(cx, 2, by + 3, 2, 11, c2); px(cx, 18, by + 3, 2, 11, c2);
    switch (look.body) {
      case 'suit':
        px(cx, 8, by, 6, 5, 'white'); px(cx, 10, by, 2, 1, look.skin === 'skin' ? 'skin' : look.skin);
        px(cx, 10, by + 1, 2, 7, 'red'); px(cx, 10, by + 1, 2, 1, 'maroon');
        px(cx, 7, by, 1, 8, 'ink'); px(cx, 14, by, 1, 8, 'ink');
        px(cx, 5, by + 3, 1, 5, c2); px(cx, 16, by + 3, 1, 5, c2);
        break;
      case 'shirt':
        px(cx, 7, by, 8, 2, 'white'); px(cx, 9, by, 4, 1, look.skin);
        px(cx, 10, by + 2, 2, 12, 'white'); px(cx, 11, by + 3, 1, 1, 'gray'); px(cx, 11, by + 6, 1, 1, 'gray'); px(cx, 11, by + 9, 1, 1, 'gray');
        break;
      case 'gakuran':
        px(cx, 8, by, 6, 2, 'ink'); px(cx, 9, by, 4, 1, look.skin);
        px(cx, 11, by + 2, 1, 12, 'ink');
        px(cx, 9, by + 4, 2, 2, 'yellow'); px(cx, 9, by + 8, 2, 2, 'yellow'); px(cx, 12, by + 4, 1, 1, 'yellow'); px(cx, 12, by + 8, 1, 1, 'yellow');
        break;
      case 'tee':
        px(cx, 8, by, 6, 2, look.skin); px(cx, 7, by, 1, 1, c2); px(cx, 14, by, 1, 1, c2);
        px(cx, 4, by + 6, 14, 2, 'white');
        break;
      case 'blouse':
        px(cx, 8, by, 6, 3, 'white'); px(cx, 9, by, 4, 1, look.skin);
        px(cx, 9, by + 3, 4, 2, 'pink'); px(cx, 8, by + 4, 2, 2, 'pink'); px(cx, 12, by + 4, 2, 2, 'pink');
        break;
      case 'dress':
        px(cx, 7, by, 8, 4, look.skin); px(cx, 8, by + 4, 6, 1, c2);
        px(cx, 10, by + 5, 2, 2, 'yellow');
        break;
      case 'overall':
        px(cx, 8, by, 6, 3, 'white'); px(cx, 9, by, 4, 1, look.skin);
        px(cx, 6, by + 3, 2, 11, c2); px(cx, 14, by + 3, 2, 11, c2);
        px(cx, 8, by + 7, 6, 7, c2); px(cx, 9, by + 8, 4, 2, c1);
        break;
      case 'haori':
        px(cx, 8, by, 6, 1, look.skin); px(cx, 9, by + 1, 4, 14, 'cream');
        px(cx, 8, by + 1, 1, 13, 'ink'); px(cx, 13, by + 1, 1, 13, 'ink');
        px(cx, 5, by + 6, 3, 1, 'yellow'); px(cx, 14, by + 6, 3, 1, 'yellow');
        break;
      case 'sumo':
        // 素肌のぽっちゃり体
        for (i = 0; i < 14; i++) {
          var sh2 = shape[Math.min(i, 3)];
          row(i, sh2[0] + 1, sh2[1] - 1, look.skin);
        }
        px(cx, 2, by + 3, 2, 11, 'skinD'); px(cx, 18, by + 3, 2, 11, 'skinD');
        px(cx, 6, by + 4, 3, 1, 'skinD'); px(cx, 13, by + 4, 3, 1, 'skinD');
        px(cx, 10, by + 6, 2, 1, 'skinD'); px(cx, 8, by + 9, 6, 1, 'skinD');
        px(cx, 3, by + 12, 16, 2, 'purple');
        break;
      case 'blazer':
        px(cx, 8, by, 6, 6, 'white'); px(cx, 10, by, 2, 1, look.skin);
        px(cx, 7, by + 1, 2, 9, 'ink'); px(cx, 13, by + 1, 2, 9, 'ink');
        px(cx, 10, by + 1, 2, 3, 'blue');
        px(cx, 15, by + 6, 3, 1, 'white');
        break;
      default: break;
    }
  }

  // mood: normal/happy/angry/eat/sour/wait, frame: 0/1
  CA.canvas = function (look, mood, frame) {
    var key = look.hair + look.hairCol + look.body + look.c1 + look.skin + (look.glasses ? 'g' : '') + '|' + mood + (frame ? 1 : 0);
    if (cache[key]) { return cache[key]; }
    var m = G.make(CA.W, CA.H), cx = m.ctx;
    var skin = look.skin;
    drawBody(cx, look);
    drawHair(cx, look, true);
    // 頭
    var pal = { s: skin, S: skin === 'skin' ? 'skinD' : U.mixHex(G.color(skin), '#000000', 0.2) };
    var hc = G.bake('__head', pal);
    cx.drawImage(hc, HX, HY);
    drawFace(cx, look, mood, frame);
    drawHair(cx, look, false);
    cache[key] = m.canvas;
    return m.canvas;
  };

  G.defSprite('__head', HEAD);
  // 座席に座る前の小さな人影（行列用 8x14）
  G.defSprite('queue_fig', [
    '..KKKK..',
    '.KssssK.',
    '.KssssK.',
    '..KKKK..',
    '.KCCCCK.',
    'KCCCCCCK',
    'KCCCCCCK',
    'KCCCCCCK',
    '.KCCCCK.',
    '.KkKKkK.',
    '.KkKKkK.',
    '.KkKKkK.',
    '.KKK.KKK',
    '........'
  ]);
})(window.RP);
