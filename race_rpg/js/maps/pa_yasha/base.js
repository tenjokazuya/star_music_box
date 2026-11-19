/* ヤシャ パーキング: 常駐の走り屋 */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  RR.Maps.layer('pa_yasha', 'base', {
    npcs: [
      { id: 'jin', x: 5, y: 7, dir: 'right', look: 'man3', talk: K.racer('ジン', 'jin', { hello: 'ヤシャに くるとは いい どきょうだ。', win: 'ヤシャで まけるとは...', lose: 'ヤシャは あまくない。' }) },
      { id: 'kai', x: 20, y: 7, dir: 'left', look: 'racer1', talk: K.racer('カイ', 'kai', { hello: 'オロチ どうしなら まけない。...あんたは なに のり?', win: 'まさか そっちが はやいとは。', lose: 'オロチの はなさきを みたか!' }) },
      { id: 'akane', x: 9, y: 9, dir: 'up', look: 'woman1', when: function (S) { return S.stage >= 5; }, talk: K.racer('アカネ', 'akane', { hello: 'ヌシに かった ひと ね。ためさせて もらうわ。', win: 'うわさ いじょう ね。', lose: 'ヌシに かったのは まぐれ?' }) },
      { id: 'ta', x: 15, y: 11, dir: 'up', look: 'man1', talk: K.timeAttack('タイムキーパー', 'ta_yasha') }
    ]
  });
})();
