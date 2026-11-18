/* world — ワールドマップ（フィールド）。町や ほこらへの入口は 地形の上の 小さな建物 */
(function () {
  'use strict';
  var h = PF.h, m = PF.mk.new(56, 44, '.');
  // 地域: 北=雪原 / 南=草原 / 東=海 / 北東=火山灰
  m.rect(0, 0, 56, 21, 'n'); m.rect(39, 0, 17, 21, 'a');
  m.rect(49, 22, 7, 22, '~'); m.vline(48, 22, 22, 's');
  // 木・飾り（先に散布し、道や建物であとから上書きする）
  m.scatter(0, 22, 48, 22, '#', 0.10, 3, ['.']);
  m.scatter(0, 0, 36, 21, 'T', 0.08, 4, ['n']); m.scatter(0, 0, 36, 21, 'G', 0.02, 8, ['n']);
  m.scatter(39, 0, 17, 21, 'R', 0.05, 9, ['a']);
  m.scatter(0, 22, 48, 22, '"', 0.06, 11, ['.']);
  // 山並み（雪原・火山へは 切り通しだけ）
  m.rect(0, 20, 56, 3, '^'); m.rect(36, 0, 3, 20, '^'); m.border('T', 1);
  m.rect(19, 20, 3, 3, ','); m.rect(44, 20, 3, 3, ',');
  // 川と橋
  m.rect(26, 23, 2, 21, '~');
  // 道
  m.path([[6, 36], [6, 37], [44, 37]], ',', 1);
  m.path([[42, 37], [42, 35]], ',', 1);
  m.path([[20, 37], [20, 14], [23, 14]], ',', 1);
  m.rect(19, 21, 3, 1, ','); m.set(20, 20, ',');
  m.path([[44, 36], [44, 18]], ',', 2);
  m.rect(26, 37, 2, 1, 'B');
  // 町
  var ko = m.house(5, 33, 3, { roof: 'red' }); m.house(9, 33, 3, { roof: 'blue' });
  var na = m.house(41, 32, 3, { roof: 'blue' }); m.house(45, 32, 3, { roof: 'red' });
  var fu = m.house(22, 10, 3, { roof: 'blue' }); m.house(26, 10, 3, { roof: 'red' });
  var kz = m.house(45, 14, 3, { roof: 'red' }); m.house(49, 14, 3, { roof: 'red' });
  m.set(ko.frontX, ko.frontY, ','); m.set(na.frontX, na.frontY, ','); m.set(fu.frontX, fu.frontY, ','); m.set(kz.frontX, kz.frontY, ',');
  m.path([[fu.frontX, fu.frontY], [fu.frontX, 14]], ',', 1);
  // 北の湖と塔
  m.rect(22, 5, 14, 5, 'i'); m.rect(22, 10, 14, 1, 'n');
  m.rect(22, 0, 14, 4, 'n'); m.stamp(27, 0, ['333', '444', 'NDN', 'D0D']);
  m.set(26, 3, 'P'); m.set(30, 3, 'P'); m.set(25, 1, 'Y'); m.set(31, 1, 'Y');
  var tw = { doorX: 28, doorY: 3, frontX: 28, frontY: 4 };
  // 寄り道の宝箱（地形を整えてから objects で置く）
  var chests = [[3, 28, '.', 'herb2', 3], [30, 41, '.', 'tea2', 2], [45, 26, '.', 'ring2', 1], [8, 17, 'n', 'herb3', 2], [31, 14, 'n', 'steelsw', 1], [53, 3, 'a', 'charm', 1], [40, 12, 'a', 'tea2', 3], [14, 12, 'n', 'wing', 3], [20, 30, '.', 160, 0], [51, 17, 'a', 'chain', 1]];
  chests.forEach(function (c) { m.set(c[0], c[1], c[2]); });
  PF.maps.base('world', {
    name: 'ひろい ゆきぐに', area: null, showName: false, rows: m.rows(), bgm: 'field', ambience: ['wind'], fill: '.',
    encounter: { table: function (x, y) { if (y <= 19 && x >= 39) return 'volcano'; if (y <= 21) return 'snow'; if (x >= 36 && y >= 22) return 'port'; return 'field'; } },
    entries: {
      kotori: { x: ko.frontX, y: ko.frontY + 1, dir: 'd' }, nagi: { x: na.frontX, y: na.frontY + 1, dir: 'd' },
      fubuki: { x: fu.frontX, y: fu.frontY + 1, dir: 'd' }, kazan: { x: kz.frontX, y: kz.frontY + 1, dir: 'd' }, tower: { x: tw.frontX, y: tw.frontY + 1, dir: 'd' }
    },
    objects: [
      { type: 'warp', x: ko.doorX, y: ko.doorY, to: 'kotori', entry: 'south', sfx: 'door' },
      { type: 'warp', x: na.doorX, y: na.doorY, to: 'nagi', entry: 'world', sfx: 'door' },
      { type: 'warp', x: fu.doorX, y: fu.doorY, to: 'fubuki', entry: 'world', sfx: 'door' },
      { type: 'warp', x: kz.doorX, y: kz.doorY, to: 'kazan', entry: 'world', sfx: 'door' },
      { type: 'warp', x: tw.doorX, y: tw.doorY, to: 'tower_1', entry: 'door', sfx: 'stairs' },
      { type: 'trigger', x: 19, y: 21, w: 3, h: 1, cond: { lt: ['ch', 3] }, run: async function (g) { await g.deny('ふぶきで ゆきみちが みえない。\nいまは すすめそうに ない。', 'd'); } },
      { type: 'trigger', x: 44, y: 21, w: 3, h: 1, cond: { lt: ['ch', 4] }, run: async function (g) { await g.deny('あつい かぜが ふきあれて いる。\nいまは すすめそうに ない。', 'd'); } },
      { type: 'sign', id: 's1', x: 7, y: 36, text: '← コトリむら\n→ みなとまち ナギ' },
      { type: 'sign', id: 's2', x: 21, y: 36, text: '↑ ゆきの みち\nふぶきの さとへ つづく' },
      { type: 'sign', id: 's3', x: 43, y: 36, text: '↑ あつい かぜの みち\nかざんへ つづく' }
    ].concat(chests.map(function (c, i) { return typeof c[3] === 'number' ? h.chest('w' + i, c[0], c[1], c[3]) : h.chest('w' + i, c[0], c[1], c[3], c[4] > 1 ? c[4] : undefined); }))
  });
})();
