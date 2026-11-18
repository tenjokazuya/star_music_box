/* npcs.js — 人物の見た目プリセット（PF.db.looks）。マップ側は PF.db.look('granny') のように使う */
(function () {
  'use strict';
  var L = PF.db.looks = {
    granny:   { hair: '#dcdce8', skin: '#f0c898', cloth: '#8a4a7a', trim: '#e8d0a0', pants: '#6a3a60', dress: true, apron: true },
    kota:     { hair: '#3a2a1a', skin: '#f8d0a0', cloth: '#4a9ad8', trim: '#fff0c0', pants: '#4a5a8a', boots: '#4a2c18' },
    elder:    { hair: '#e8e8f0', skin: '#f0c898', cloth: '#5a6a4a', trim: '#c8b078', pants: '#4a5a3a', beard: true, dress: true },
    baker:    { hair: '#8a5a2a', skin: '#f4c494', cloth: '#e8e0d0', trim: '#d8b060', pants: '#5a4a3a', apron: true, hat: '#f4f0e8' },
    woman:    { hair: '#a04a2a', skin: '#f8d0a8', cloth: '#d86a8a', trim: '#fff0c0', pants: '#7a4a5a', long: true, dress: true },
    woman2:   { hair: '#3a3a5a', skin: '#f4c8a0', cloth: '#6a9a6a', trim: '#f0e8c0', pants: '#4a6a4a', long: true, dress: true },
    man:      { hair: '#4a3a2a', skin: '#f0c090', cloth: '#7a6a4a', trim: '#d8c898', pants: '#4a4a5a', boots: '#3a2a1a' },
    man2:     { hair: '#2a2a3a', skin: '#e8b888', cloth: '#a05a3a', trim: '#e8d0a0', pants: '#3a3a5a', beard: true },
    girl:     { hair: '#e0a040', skin: '#f8d8b0', cloth: '#e07a9a', trim: '#ffffff', pants: '#8a5a7a', long: true, dress: true },
    boy:      { hair: '#5a3a1a', skin: '#f8d0a0', cloth: '#6aa860', trim: '#fff0c0', pants: '#4a5a3a' },
    sailor:   { hair: '#2a2a4a', skin: '#e0b080', cloth: '#f0f0f8', trim: '#3a5aa8', pants: '#3a4a7a', hat: '#2a3a78' },
    captain:  { hair: '#aab0c0', skin: '#dca878', cloth: '#2a3a78', trim: '#f0c840', pants: '#2a2a4a', beard: true, hat: '#1a2a68' },
    fur:      { hair: '#6a4a3a', skin: '#f4c8a8', cloth: '#a89a8a', trim: '#f4f0e8', pants: '#5a4a3a', hat: '#d8d0c0' },
    fur2:     { hair: '#d8d8e0', skin: '#f0c8a0', cloth: '#7a8aa8', trim: '#f4f4ff', pants: '#4a5a78', long: true, dress: true, hat: '#e8e8f4' },
    smith:    { hair: '#3a2a2a', skin: '#d8a070', cloth: '#7a3a2a', trim: '#2a2a2a', pants: '#3a2a2a', beard: true, apron: true },
    smith2:   { hair: '#c04a2a', skin: '#e8b888', cloth: '#a04a2a', trim: '#f0d8a0', pants: '#3a2a2a', long: true },
    monk:     { hair: '#e0e0e8', skin: '#f0c898', cloth: '#4a5a9a', trim: '#e8d890', pants: '#3a4a8a', bald: true, beard: true, dress: true },
    knight:   { hair: '#4a4a6a', skin: '#e8c8a8', cloth: '#8a9ab8', trim: '#e8f0ff', pants: '#5a6a88', hat: '#aab8d0' },
    spirit:   { hair: '#f8f0d8', skin: '#fff0e0', cloth: '#f0c860', trim: '#ffffff', pants: '#e8b050', long: true, dress: true },
    shadowman:{ hair: '#1c1830', skin: '#8a8aa8', cloth: '#2a2448', trim: '#a0e0ff', pants: '#1c1838', long: true, dress: true }
  };
  PF.db.look = function (n, over) { var o = {}, k; for (k in L[n]) o[k] = L[n][k]; if (over) for (k in over) o[k] = over[k]; return o; };
})();
