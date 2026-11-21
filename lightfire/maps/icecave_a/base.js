/* icecave_a — こおりの ほこら 1: 氷の ゆかを すべって 柱に ぶつかり、出口の 通路を 目指す（配置は tools/ice_gen.js で探索・検証済み 7手） */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 2, 12, 8, 'I'); m.set(8, 10, '+'); m.set(8, 11, '/'); m.set(8, 1, '+'); m.set(8, 0, '+');
  [[3, 8], [7, 3], [6, 9], [8, 5], [7, 5], [5, 7], [13, 4], [12, 9], [5, 6]].forEach(function (p) { m.set(p[0], p[1], 'P'); });
  // 氷の盤面の中には 柱(P)以外の かたい物を 置かない（置くと すべり道が止まり、tools/ice_gen.js の探索結果と ずれて 解けなくなる）。灯りは light 物体だけにする
  PF.maps.base('icecave_a', {
    name: 'こおりの ほこら', area: 'こおりの ほこら', rows: m.rows(), bgm: 'ice', ambience: ['snow', 'cave'], dark: 0.35, reset: true,
    encounter: { table: 'ice' }, wingTo: { map: 'fubuki', pos: { entry: 'shrine' } },
    hint: 'こおりの うえは すべって とまらない。\nはしらに ぶつかって とまる ことを りようしよう。\nまんなかの みちを のぼれば でぐちに つくよ。',
    entries: { door: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 1, dir: 'd' } },
    objects: [
      h.warp(8, 11, 'fubuki', 'shrine', 'stairs'), h.warp(8, 0, 'icecave_b', 'south', 'stairs'),
      h.light('l1', 2, 2, 24), h.light('l2', 13, 2, 24), h.light('l3', 13, 9, 24),
      // 出口の手前までたどりついたら 解決ずみ。氷が ひびわれて 歩ける ゆかに なる（戻り道が すべって詰まないように）
      { type: 'trigger', x: 8, y: 1, once: 'ic.a_solved', run: async function (g) {
        await g.say(['こおりの ゆかが きしんで、こまかく ひびわれた。', 'これなら あるいて もどれそうだ。']);
        g.refresh();
      } }
    ]
  });
})();
