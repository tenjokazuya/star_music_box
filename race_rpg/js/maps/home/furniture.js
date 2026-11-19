/* 家の家具（セーブデータの配置から置く）と、家具を調べた時の反応 */
(function () {
  'use strict';
  var RR = window.RR;
  var TIPS = [
    'タイヤは あたためると よく くいつく。|でも すべらせすぎると ねつで たれて しまう。',
    'ブレーキを ふむと まえに おもさが のる。|まがりはじめに すこし ブレーキを のこすと はなさきが いれやすい。',
    'アクセルを ふみすぎると うしろが ながれる。|まがりおわって ハンドルを もどしながら ふむのが コツ。',
    'LSDを いれると たちあがりで ちからが にげにくく なる。',
    'マニュアルに すると L と R で ギアを かえられる。|はやめに おとすと エンジンブレーキが きく。',
    'ヘアピンの まえには がめんの うえに よこくが でる。|みのがさないように しよう。',
    'パーツは つかうほど いたむ。|こわれは しないが せいのうが おちていく。テツさんに なおして もらおう。',
    'かべに こすると エアロや サスが いたむ。'
  ];
  var TV = [
    'ニュース「こんやも さんかんぶは ひえこむ でしょう。」',
    'クイズばんぐみを やっている。こたえは わからなかった。',
    'ふるい レースの ビデオが ながれている。',
    'てんきよほう「あしたも はれ。ほしが よく みえそうです。」'
  ];
  RR.Maps.layer('home', 'furniture', {
    build: function (M, S) {
      var D = RR.Data;
      (S.furniture.placed || []).forEach(function (p) {
        var f = D.furniture[p.id];
        if (!f) return;
        var o = Object.assign({}, f.opts);
        M.prop(f.prop, p.x, p.y, o);
        var sz = RR.Props.defs[f.prop].size(o);
        var run = react(p.id);
        for (var j = 0; j < sz[1]; j++) for (var i = 0; i < sz[0]; i++) M.check(p.x + i, p.y + j, run);
      });
    }
  });
  function react(id) {
    var D = RR.Data;
    return async function (E) {
      var f = D.furniture[id];
      if (id === 'bed') {
        var c = await E.ask('', 'ベッドだ。すこし やすむ?', ['ねむる', 'やめる']);
        if (c !== 0) return;
        E.stopBgm(1);
        await E.fadeOut(40);
        E.sfx('sleep');
        await E.wait(120);
        E.save(true);
        await E.fadeIn(40);
        E.bgm('home');
        await E.msg('ぐっすり ねむった。|(きろく しました)');
      } else if (id === 'desk_pc') {
        var n = E.num('pc_tip');
        E.addNum('pc_tip');
        await E.msg('パソコンで はしりの こつを しらべた。|' + TIPS[n % TIPS.length]);
      } else if (id === 'tv') {
        await E.msg(TV[Math.floor(Math.random() * TV.length)]);
      } else if (id === 'arcade') {
        E.sfx('beep');
        await E.msg('ふるい レースゲームだ。|すこし あそんだ。ハイスコアは でなかった。');
      } else if (id === 'kotatsu') {
        await E.msg('こたつに はいった。|...でられなく なりそうだ。');
      } else if (id === 'clock') {
        await E.msg('じいちゃんの かけどけい。|カチ カチと おとを たてている。');
      } else if (id === 'shelf_book') {
        await E.msg('くるまの ざっしが ならんでいる。|ふせんが たくさん はってある。');
      } else {
        await E.msg('{y}' + f.name + '{w}|' + (f.desc || ''));
      }
    };
  }
})();
