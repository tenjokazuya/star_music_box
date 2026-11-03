/* 固定パレット。スプライトは chars の1文字でこの色を指す。数値(色)の正本はここ。 */
(function (RP) {
  'use strict';

  // 名前付き色（UI・コードから RP.gfx.rect(.., 'red') のように使う）
  var c = {
    ink:     '#14101c',
    shade:   '#2a2438',
    gray:    '#5a5468',
    silver:  '#9a96a8',
    cream:   '#f6efdc',
    white:   '#ffffff',
    red:     '#d8382c',
    maroon:  '#8c1f2a',
    orange:  '#f08a2c',
    yellow:  '#f8d848',
    gold:    '#c89420',
    brown:   '#8a5a30',
    wood:    '#4e3020',
    skin:    '#f4c49c',
    skinD:   '#d08c68',
    pink:    '#f08ca8',
    purple:  '#6a3c8c',
    blue:    '#3c6cd0',
    navy:    '#1c2c6c',
    cyan:    '#58c8e8',
    night:   '#101838',
    green:   '#48b04c',
    forest:  '#1e6034',
    lime:    '#a8d848',
    noodle:  '#f0d890',
    shoyu:   '#a8642c',
    miso:    '#d89c3c',
    tonkotsu:'#f0e0b8',
    shio:    '#e6d98a',
    wall:    '#2e2a48',
    woodL:   '#a06a3c',
    woodD:   '#6a4226',
    steel:   '#7c8aa0',
    steelD:  '#4a566c',
    paper:   '#e8dcc0',
    paperD:  '#b8a880'
  };

  // スプライト文字 → 色名
  var chars = {
    K: 'ink', k: 'shade', g: 'gray', G: 'silver', w: 'cream', W: 'white',
    r: 'red', R: 'maroon', o: 'orange', y: 'yellow', Y: 'gold',
    n: 'brown', N: 'wood', s: 'skin', S: 'skinD', p: 'pink', P: 'purple',
    b: 'blue', B: 'navy', c: 'cyan', d: 'night', e: 'green', E: 'forest', l: 'lime',
    t: 'noodle', T: 'shoyu', m: 'miso', h: 'tonkotsu', i: 'steel', I: 'steelD',
    a: 'paper', A: 'paperD'
  };

  RP.PAL = { c: c, chars: chars };
})(window.RP);
