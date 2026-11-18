/* kotori_home / 序章のあと（おばあちゃんは ほこらの ひの ばんを している） */
(function () {
  'use strict';
  PF.maps.part('kotori_home', 'after', {
    when: { flag: 'prologue.left' },
    objects: [
      { type: 'sign', invisible: true, x: 7, y: 2, text: 'おばあちゃんの ひざかけが かかっている。\nいまは だれも いない。', when: { gte: ['ch', 1] } }
    ]
  });
})();
