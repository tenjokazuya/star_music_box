/* とうげみち: 各峠の見張り番（章が進むと道をあける）
 * 見張りは走り屋仲間の決まりで「前の峠の頭に勝った者」だけを通す
 */
(function () {
  'use strict';
  var RR = window.RR;
  function gate(id, stageNeed, x, y, dir, text, openText, look) {
    // 閉じている間: 道の上に立つ
    RR.Maps.layer('pass', 'gate_' + id, {
      when: function (S) { return S.stage < stageNeed; },
      build: function (M) {
        // 'v' は縦に並んだ車線をふさぐ（コーンは上下）、'h' は横に並んだ車線（コーンは左右）
        if (dir === 'v') { M.prop('cone', x, y - 1); M.prop('cone', x, y + 1); }
        else { M.prop('cone', x - 1, y); M.prop('cone', x + 1, y); }
      },
      npcs: [{ id: 'guard_' + id, x: x, y: y, dir: 'down', look: look, talk: async function (E) { await E.say('みはり', text); } }]
    });
    // 開いた後: 道の脇に立つ
    RR.Maps.layer('pass', 'gate_' + id + '_open', {
      when: function (S) { return S.stage >= stageNeed; },
      npcs: [{ id: 'guard_' + id, x: dir === 'v' ? x : x - 1, y: dir === 'v' ? y - 1 : y, dir: 'down', look: look, talk: async function (E) { await E.say('みはり', openText); } }]
    });
  }
  gate('tsuzura', 1, 12, 31, 'v', 'ここから さきは ツヅラの みち だ。|まちの ケンタにも かてない やつは とおせないね。', 'ケンタに かったんだって? とおって いいぜ。', 'racer2');
  gate('hebi', 2, 18, 21, 'v', 'ヘビノセは ツヅラの かしらに かった やつ だけが|はしれる きまり なんだ。', 'サキさんに かった やつか。|ヘビノセの ゴウは つよいぞ。', 'racer5');
  gate('kiri', 3, 12, 11, 'v', 'キリガタニは きりが こい。|ヘビノセを こえた ものしか いれない きまりだ。', 'きりに のまれるなよ。', 'racer3');
  gate('yasha', 4, 15, 2, 'h', 'ヤシャは ヌシの やまだ。|かしらを ぜんぶ たおしてから こい。', 'ヌシが まってる。...がんばれよ。', 'man3');

  RR.Maps.layer('pass', 'base', {
    npcs: [
      {
        id: 'walker', x: 12, y: 36, dir: 'right', look: 'oldman', wander: 0,
        talk: RR.MapKit.lines('おじいさん', ['よるの さんぽ じゃ。|この みちは むかしから とうげへの いりぐち なんじゃよ。', 'とうげの はしりやは みな かしらの ゆうことを きく。|ふしぎな せかい じゃのう。'])
      }
    ]
  });
})();
