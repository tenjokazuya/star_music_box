/* forest / クリア後: 雪がとけた 春の もり */
(function () {
  'use strict';
  PF.maps.part('forest', 'spring', { when: { flag: 'clear' }, convert: { n: '.', T: '#', G: '#' }, snow: false, bgm: 'village', ambience: ['birds'] });
})();
