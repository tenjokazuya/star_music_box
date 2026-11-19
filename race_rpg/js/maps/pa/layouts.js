/* 峠のパーキングエリア 4か所: 地形（共通の形は RR.MapKit.pa） */
(function () {
  'use strict';
  var RR = window.RR, K = RR.MapKit;
  function pa(id, name, exitSpot, o) {
    o = o || {};
    RR.Maps.defineMap(id, {
      w: 24, h: 14, name: name, bgm: 'pass', amb: o.amb || 'pass', dark: true, ambient: o.ambient || '#5c6490',
      build: function (M) {
        K.pa(M, { w: 24, h: 14, exitX: 12, exit: { map: 'pass', x: exitSpot } });
        if (o.extra) o.extra(M);
        // 展望（ガードレールの向こう）
        M.check(6, 3, async function (E) { await E.msg(o.view || 'ガードレールの むこうは くらい たにだ。|とおくに まちの あかりが みえる。'); });
        M.check(17, 3, async function (E) { await E.msg(o.view || 'ガードレールの むこうは くらい たにだ。|とおくに まちの あかりが みえる。'); });
        M.check(18, 10, async function (E) { await E.msg(o.board || 'けいじばん: こんげつの はしりや しゅうかい は...|ぎっしり かきこまれている。'); });
        M.check(5, 10, async function (E) { await E.food('vending'); });
        M.check(6, 10, async function (E) { await E.food('vending'); });
      }
    });
  }
  pa('pa_tsuzura', 'ツヅラ パーキング', 'tsuzura', {
    extra: function (M) { M.prop('car', 4, 4, { model: 'sylph', color: 'white' }); M.prop('car', 8, 4, { model: 'hayate', color: 'red' }); },
    board: 'けいじばん: 「ツヅラは ヘアピン 7れんぞく。タイヤを たいせつに」'
  });
  pa('pa_hebi', 'ヘビノセ パーキング', 'hebi', {
    extra: function (M) { M.prop('car', 4, 4, { model: 'regulus', color: 'purple' }); M.prop('car', 6, 4, { model: 'raiden', color: 'blue' }); M.prop('car', 18, 4, { model: 'raiden', color: 'yellow' }); },
    board: 'けいじばん: 「ヘビノセは こうそく コーナーが つづく。パワーと ダウンフォース」'
  });
  pa('pa_kiri', 'キリガタニ パーキング', 'kiri', {
    amb: 'fog', ambient: '#7c8098',
    extra: function (M) { M.prop('car', 6, 4, { model: 'hayate', color: 'green' }); M.prop('car', 16, 4, { model: 'regulus', color: 'silver' }); },
    view: 'たには まっしろな きりに うまっている。|なにも みえない。',
    board: 'けいじばん: 「きりの よるは コースを おぼえて はしれ」'
  });
  pa('pa_yasha', 'ヤシャ パーキング', 'yasha', {
    ambient: '#585c88',
    extra: function (M) { M.prop('car', 4, 4, { model: 'regulus', color: 'white' }); M.prop('car', 8, 4, { model: 'orochi', color: 'red' }); M.prop('car', 18, 4, { model: 'orochi', color: 'black' }); M.prop('statue', 20, 9); },
    view: 'はるか したに キリハラの まちが みえる。|ここが いちばん たかい とうげだ。',
    board: 'けいじばん: 「ヤシャだけ ダウンヒル 2.2KM。ヌシに いどむ ものは じゅんびを おこたるな」'
  });
})();
