/* icecave_a / 解決ずみ（またはボス撃破後＝帰り道）: 氷は ひびわれて 歩ける ゆかに なる */
(function () {
  'use strict';
  PF.maps.part('icecave_a', 'solved', { when: PF.h.anyFlag(['ic.a_solved', 'f.boss']), convert: { I: '+' } });
})();
