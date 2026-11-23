/* 人物の見た目プリセット（RR.Looks.<名前>）。NPC の look に名前で指定できる */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Looks = {
    player: { skin: 'light', hair: 'short', hairC: 'brown', top: '#d04838', bottom: '#384068', shoes: '#f0f0f0', style: 'jacket', accent: '#f0f0f0' },
    tetsu: { skin: 'tan', hair: 'band', hairC: 'black', top: '#486078', bottom: '#384050', extra: ['beard', 'band'], accent: '#f0f0f0' },
    mio: { skin: 'light', hair: 'pony', hairC: 'brown', top: '#e8e8f0', bottom: '#d04848', accent: '#f8d048', blush: true },
    kenta: { skin: 'tan', hair: 'spiky', hairC: 'blond', top: '#30a060', bottom: '#303038', kid: true },
    saki: { skin: 'light', hair: 'long', hairC: 'black', top: '#282838', bottom: '#202028', style: 'jacket', accent: '#c83850' },
    gou: { skin: 'tan', hair: 'bald', top: '#e8c030', bottom: '#303040', style: 'jacket', accent: '#202020', extra: ['beard'] },
    shinobu: { skin: 'pale', hair: 'bob', hairC: 'gray', top: '#5c6c88', bottom: '#2c3040', style: 'coat', accent: '#a0a8c0', eyes: 'closed' },
    kurosawa: { skin: 'light', hair: 'short', hairC: 'black', top: '#202028', bottom: '#181820', style: 'coat', accent: '#b02838', extra: ['glasses'] },
    hayami: { skin: 'tan', hair: 'old', hairC: 'white', top: '#e8e8f0', bottom: '#585868', style: 'jacket', accent: '#3858a0' },
    grandma: { skin: 'light', hair: 'bun', hairC: 'gray', top: '#906078', bottom: '#584050', style: 'dress' },
    // 町の人
    oldman: { skin: 'tan', hair: 'old', hairC: 'gray', top: '#7c6c50', bottom: '#484038', extra: ['beard'] },
    oldwoman: { skin: 'light', hair: 'bun', hairC: 'white', top: '#5c7888', bottom: '#404858', style: 'dress' },
    boy: { skin: 'light', hair: 'short', hairC: 'black', top: '#3878c8', bottom: '#383838', kid: true },
    girl: { skin: 'light', hair: 'pony', hairC: 'black', top: '#f088a8', bottom: '#f8f8f8', kid: true, style: 'dress', accent: '#f8f048' },
    man1: { skin: 'light', hair: 'short', hairC: 'black', top: '#506080', bottom: '#303038' },
    man2: { skin: 'tan', hair: 'spiky', hairC: 'brown', top: '#a04040', bottom: '#384050' },
    man3: { skin: 'light', hair: 'cap', hairC: 'black', top: '#3c7c4c', bottom: '#383840', accent: '#e8e8f0' },
    woman1: { skin: 'light', hair: 'long', hairC: 'brown', top: '#c86880', bottom: '#404860' },
    woman2: { skin: 'pale', hair: 'bob', hairC: 'black', top: '#8878c8', bottom: '#303040' },
    worker: { skin: 'tan', hair: 'cap', hairC: 'black', top: '#2c5ca8', bottom: '#2c5ca8', accent: '#e8c030' },
    clerk: { skin: 'light', hair: 'short', hairC: 'brown', top: '#38a058', bottom: '#383840', extra: ['apron'], accent: '#f0f0f0' },
    clerk2: { skin: 'light', hair: 'pony', hairC: 'black', top: '#e8e8f0', bottom: '#404858', extra: ['apron'], accent: '#3070c0' },
    chef: { skin: 'tan', hair: 'band', hairC: 'black', top: '#f0f0f0', bottom: '#383838', extra: ['band', 'apron'], accent: '#f0f0f0' },
    cafe: { skin: 'light', hair: 'bun', hairC: 'brown', top: '#5c3c2c', bottom: '#2c2c34', extra: ['apron'], accent: '#e8dcc8' },
    racer1: { skin: 'light', hair: 'spiky', hairC: 'red', top: '#202028', bottom: '#202028', style: 'jacket', accent: '#e8c030' },
    racer2: { skin: 'tan', hair: 'short', hairC: 'black', top: '#f0f0f8', bottom: '#384068', style: 'jacket', accent: '#3060c0' },
    racer3: { skin: 'light', hair: 'long', hairC: 'blond', top: '#a83850', bottom: '#202028' },
    racer4: { skin: 'light', hair: 'cap', hairC: 'brown', top: '#e87028', bottom: '#303038', accent: '#202028' },
    racer5: { skin: 'dark', hair: 'spiky', hairC: 'black', top: '#5038a0', bottom: '#202028', style: 'jacket', accent: '#e8e8f0' },
    racer6: { skin: 'pale', hair: 'bob', hairC: 'pink', top: '#f0f0f0', bottom: '#5060a0' },
    monk: { skin: 'tan', hair: 'bald', top: '#584838', bottom: '#584838', style: 'coat', accent: '#f0f0f0' }
  };
})();
