/* スプライト定義（文字列ドット絵）。文字の意味は js/data/palette.js の chars を参照。
 * 'x' は pal で色を差し替えるための予約文字（スープ色・チップ色など）。 */
(function (RP) {
  'use strict';
  var G = RP.gfx;

  // ---- アイコン(9x9) ----
  G.defSprite('ic_soup', [
    '.........',
    '.KKKKKKK.',
    'KxxxxxxxK',
    'KxWxxxxxK',
    'KwwwwwwwK',
    '.KwwwwwK.',
    '..KKKKK..',
    '.........',
    '.........'
  ]);
  G.defSprite('ic_h_bari', [
    'KKKKKKKKK',
    'KxxxxxxxK',
    'KxwxwxwxK',
    'KxwxwxwxK',
    'KxwxwxwxK',
    'KxwxwxwxK',
    'KxwxwxwxK',
    'KxxxxxxxK',
    'KKKKKKKKK'
  ]);
  G.defSprite('ic_h_katame', [
    'KKKKKKKKK',
    'KxxxxxxxK',
    'KxwxwxwxK',
    'KxwxwxwxK',
    'KxxwxwxwK',
    'KxxwxwxwK',
    'KxwxwxwxK',
    'KxxxxxxxK',
    'KKKKKKKKK'
  ]);
  G.defSprite('ic_h_futsu', [
    'KKKKKKKKK',
    'KxwxwxwxK',
    'KxxwxwxwK',
    'KxwxwxwxK',
    'KxxwxwxwK',
    'KxwxwxwxK',
    'KxxwxwxwK',
    'KxwxwxwxK',
    'KKKKKKKKK'
  ]);
  G.defSprite('ic_h_yawa', [
    'KKKKKKKKK',
    'KxxxxxxxK',
    'KxwwxwwxK',
    'KxwwxwwxK',
    'KxwwwwwxK',
    'KxxwwwxxK',
    'KxxwwwxxK',
    'KxxxxxxxK',
    'KKKKKKKKK'
  ]);
  G.defSprite('ic_negi', [
    '.........',
    '.lE...lE.',
    '.El...El.',
    '...lE....',
    '..lEl..lE',
    '..El...El',
    '.lE.lE...',
    '.El.El...',
    '.........'
  ]);
  G.defSprite('ic_nori', [
    '.........',
    'KKKKKKKKK',
    'KEEEEEEEK',
    'KEKEEEKEK',
    'KEEEEEEEK',
    'KEEKEEEEK',
    'KEEEEEEEK',
    'KKKKKKKKK',
    '.........'
  ]);
  G.defSprite('ic_menma', [
    '.........',
    'KKK......',
    'KttKK....',
    '.KttKKK..',
    '..KttttKK',
    '...KKKttK',
    '.....KKKK',
    '.........',
    '.........'
  ]);
  G.defSprite('ic_egg', [
    '.........',
    '..KKKKK..',
    '.KWWWWWK.',
    'KWWoyoWWK',
    'KWoyyyoWK',
    'KWWoyoWWK',
    '.KWWWWWK.',
    '..KKKKK..',
    '.........'
  ]);
  G.defSprite('ic_chashu', [
    '.........',
    '..KKKKK..',
    '.KnnnnnK.',
    'KnpppppnK',
    'KnpwwwpnK',
    'KnpppppnK',
    '.KnnnnnK.',
    '..KKKKK..',
    '.........'
  ]);
  G.defSprite('ic_gyoza', [
    '.........',
    '.........',
    '..KKKKK..',
    '.KtttttK.',
    'KtTtTtTtK',
    'KnnnnnnnK',
    '.KKKKKKK.',
    '.........',
    '.........'
  ]);
  G.defSprite('ic_beer', [
    '..WWWW...',
    '.WWWWWW..',
    'KKKKKKK..',
    'KyoyyyKKK',
    'KyyyyyK.K',
    'KyoyyyK.K',
    'KyyyyyKKK',
    'KKKKKKK..',
    '.........'
  ]);
  G.defSprite('ic_rice', [
    '.........',
    '..WWWWW..',
    '.WWWWWWW.',
    'KKKKKKKKK',
    'KwwwwwwwK',
    '.KwwwwwK.',
    '..KKKKK..',
    '.........',
    '.........'
  ]);
  G.defSprite('ic_ok', [
    '.........',
    '.......ll',
    '......ll.',
    '.l...ll..',
    '.ll.ll...',
    '..lll....',
    '...l.....',
    '.........',
    '.........'
  ]);
  G.defSprite('ic_x', [
    '.........',
    '.rr...rr.',
    '..rr.rr..',
    '...rrr...',
    '....r....',
    '...rrr...',
    '..rr.rr..',
    '.rr...rr.',
    '.........'
  ]);
  G.defSprite('ic_star', [
    '....y....',
    '....y....',
    '...yyy...',
    'yyyyyyyyy',
    '.yyyyyyy.',
    '..yyyyy..',
    '..yyyyy..',
    '.yyy.yyy.',
    '.yy...yy.'
  ]);
  G.defSprite('ic_coin', [
    '..YYY..',
    '.YyyyY.',
    'YyYyyyY',
    'YyYyyyY',
    'YyYyyyY',
    '.YyyyY.',
    '..YYY..'
  ]);
  G.defSprite('ic_trash', [
    '...KKK...',
    'KKKKKKKKK',
    '.KGGGGGK.',
    '.KGKGKGK.',
    '.KGKGKGK.',
    '.KGKGKGK.',
    '.KGGGGGK.',
    '..KKKKK..',
    '.........'
  ]);

  // ---- どんぶり（盤面用 18x9）----
  G.defSprite('bowl_empty', [
    '..KKKKKKKKKKKKKK..',
    '.KwwwwwwwwwwwwwwK.',
    'KwWwwwwwwwwwwwwwwK',
    'KwwwwwwwwwwwwwwwwK',
    '.KwwwwwwwwwwwwwwK.',
    '..KwrwrwrwrwrwwK..',
    '...KKKKKKKKKKKK...',
    '....KKKKKKKKKK....',
    '..................'
  ]);

  // 皿が残った席の表示（14x6）
  G.defSprite('dish_dirty', [
    '..KKKKKKKKKK..',
    '.KwwwwwwwwwwK.',
    'KwTTTwwwTTwwwK',
    '.KwwwwwwwwwwK.',
    '..KKKKKKKKKK..',
    '..............'
  ]);

  // ---- 暖簾の一片・提灯 ----
  G.defSprite('lantern', [
    '...KK...',
    '..KKKK..',
    '.KrrrrK.',
    'KrRrrRrK',
    'KrrwwrrK',
    'KrrwwrrK',
    'KrRrrRrK',
    '.KrrrrK.',
    '..KKKK..',
    '...KK...'
  ]);

  // 招き猫（12x14）
  G.defSprite('cat', [
    '.K......K...',
    'KwK....KwK..',
    'KwwKKKKwwK..',
    'KwwwwwwwwK..',
    'KwKwwwwKwK..',
    'KwwwrrwwwK..',
    '.KwwwwwwK.KK',
    '..KwwyywK.KK',
    '.KwwwyywwKwK',
    '.KwwwwwwwKK.',
    '.KwwwwwwwK..',
    '.KwwwwwwwK..',
    '.KKwwwwwKK..',
    '..KKKKKKK...'
  ]);

  // 看板犬（16x12）
  G.defSprite('dog', [
    '...KK.......KK..',
    '..KnnK.....KnnK.',
    '..KnnKKKKKKKnnK.',
    '...KnwwwwwwwnK..',
    '...KwKwwwwKwwK..',
    '...KwwwwKKwwwK..',
    '....KwwwrrwwK...',
    '....KKwwwwKK....',
    '...KnnKKKKnnK...',
    '...KnnK..KnnK...',
    '...KKK....KKK...',
    '................'
  ]);

  // 観葉植物（10x16）
  G.defSprite('plant', [
    '..l..E....',
    '.lEl.lE.l.',
    '.EllEElEl.',
    'lEllEEllEl',
    '.lEElEEEl.',
    '..lEEEEl..',
    '...EEEE...',
    '....EE....',
    '..KKKKKK..',
    '.KnnnnnnK.',
    '.KnnnnnnK.',
    '.KNnnnnNK.',
    '..KNnnNK..',
    '..KKKKKK..',
    '..........',
    '..........'
  ]);
})(window.RP);
