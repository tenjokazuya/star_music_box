/* キリハラ町: 旧道へのゲート（クリア前は封鎖、クリア後に開く） */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.layer('town', 'oldroad_closed', {
    when: function (S) { return S.stage < 5; },
    build: function (M) {
      M.prop('wire_gate', 11, 3);
      M.check(12, 3, async function (E) { await E.msg('さくで ふさがれている。|「この さき きゅうどう。つうこうどめ」'); });
      M.check(11, 3, async function (E) { await E.msg('さくで ふさがれている。|「この さき きゅうどう。つうこうどめ」'); });
      M.check(13, 3, async function (E) { await E.msg('さくで ふさがれている。|「この さき きゅうどう。つうこうどめ」'); });
    }
  });
  RR.Maps.layer('town', 'oldroad_open', {
    when: function (S) { return S.stage >= 5; },
    build: function (M) {
      M.prop('cone', 11, 3); M.prop('barrier', 14, 3);
      M.warp(12, 0, { map: 'kyudo', x: 'entry' }); M.warp(13, 0, { map: 'kyudo', x: 'entry' });
    }
  });
})();
