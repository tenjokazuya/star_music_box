/* tower_2 — きたのとう 2階: 左の部屋で ブロックを穴に落とし、右の部屋で 二つの板に ブロックを のせる */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(16, 14, 'X');
  m.rect(2, 3, 6, 8, '+'); m.rect(9, 3, 5, 8, '+'); m.rect(8, 6, 1, 2, '+'); m.set(8, 6, 'O'); m.set(8, 7, 'O');
  m.rect(4, 11, 1, 1, '+'); m.set(4, 12, '/'); m.rect(11, 0, 1, 3, '+');
  m.rect(2, 11, 1, 1, '+'); m.set(5, 9, 'P'); m.set(10, 9, 'P');
  m.set(2, 3, 'Y'); m.set(13, 3, 'Y'); m.set(13, 10, 'Y');
  PF.maps.base('tower_2', {
    name: 'きたのとう 2かい', area: 'きたの とう', rows: m.rows(), bgm: 'tower', ambience: ['wind'], dark: 0.4, reset: true,
    encounter: { table: 'tower' }, wingTo: { map: 'world', pos: { entry: 'tower' } },
    hint: 'ひだりの へやの ブロックで まんなかの あなを うめよう。\nみぎの へやの ブロックは ふたつの いたに のせる。\nよこに おしてから たてに おそう。',
    entries: { south: { x: 4, y: 10, dir: 'u' }, north: { x: 11, y: 3, dir: 'd' } },
    objects: [
      h.warp(4, 12, 'tower_1', 'north', 'stairs'), h.warp(11, 0, 'tower_3', 'south', 'stairs'),
      h.light('l1', 2, 3, 26), h.light('l2', 13, 3, 26), h.light('l3', 13, 10, 26),
      h.block('blk1', 5, 6), h.block('blk2', 5, 7),
      h.block('blk3', 10, 5), h.block('blk4', 10, 7),
      h.plate('pl1', 12, 4, 'p'), h.plate('pl2', 12, 8, 'p'),
      h.gate('gate_p', 11, 2), h.chest('c1', 3, 4, 'herb3'), h.chest('c2', 3, 10, 'tea2')
    ],
    puzzles: [
      { kind: 'fn', flag: 't.b_pits', check: function (F) { return !F.tile(8, 6).pit && !F.tile(8, 7).pit; }, solved: async function (g) { await g.say('みちが つながった!'); } },
      { kind: 'all', group: 'p', needs: 'pressed', flag: 't.b_plates', solved: async function (g) { await g.openGate('gate_p'); } }
    ]
  });
})();
