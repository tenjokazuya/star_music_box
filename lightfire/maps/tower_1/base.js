/* tower_1 — きたのとう 1階: 氷の ゆかを すべる（配置は tools/ice_gen.js seed=5 で探索・検証済み 7手） */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 2, 12, 8, 'I'); m.set(8, 10, '+'); m.set(8, 11, '/'); m.set(8, 1, '+'); m.set(8, 0, '+');
  [[4, 9], [12, 9], [9, 2], [2, 3], [5, 6], [10, 7], [9, 9], [8, 7], [12, 7]].forEach(function (p) { m.set(p[0], p[1], 'P'); });
  m.set(2, 2, 'Y'); m.set(13, 2, 'Y'); m.set(13, 5, 'Y'); m.set(2, 8, 'Y');
  PF.maps.base('tower_1', {
    name: 'きたのとう 1かい', area: 'きたの とう', rows: m.rows(), bgm: 'tower', ambience: ['wind', 'snow'], dark: 0.4, reset: true,
    encounter: { table: 'tower' }, wingTo: { map: 'world', pos: { entry: 'tower' } },
    hint: 'こおりの ゆかは すべる。はしらに ぶつかって とまりながら、\nまんなかの でぐちの みちに はいろう。',
    entries: { door: { x: 8, y: 10, dir: 'u' }, north: { x: 8, y: 1, dir: 'd' } },
    objects: [
      h.warp(8, 11, 'world', 'tower', 'stairs'), h.warp(8, 0, 'tower_2', 'south', 'stairs'),
      h.light('l1', 2, 2, 26), h.light('l2', 13, 2, 26), h.light('l3', 13, 5, 26), h.light('l4', 2, 8, 26)
    ]
  });
})();
