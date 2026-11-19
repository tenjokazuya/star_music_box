/* きゅうどう（旧道）: クリア後に行ける隠しエリア（地形） */
(function () {
  'use strict';
  var RR = window.RR;
  RR.Maps.defineMap('kyudo', {
    w: 24, h: 22, name: 'きゅうどう', bgm: 'pass', amb: 'fog', dark: true, ambient: '#4c5078',
    build: function (M) {
      M.fill('forest');
      M.rect(4, 0, 16, 22, 'grass');
      // 荒れた旧道（ところどころ土がむき出し）
      M.rect(10, 0, 4, 22, 'road');
      [[10, 4], [13, 6], [11, 9], [12, 13], [10, 16], [13, 18]].forEach(function (p) { M.set(p[0], p[1], 'dirt'); });
      M.rect(9, 2, 1, 6, 'rail'); M.rect(14, 10, 1, 7, 'rail');
      M.rect(4, 0, 6, 2, 'rock'); M.rect(15, 0, 5, 3, 'rock');
      // 広場（頂上）
      M.rect(6, 2, 12, 5, 'gravel');
      M.prop('statue', 6, 3); M.prop('lantern', 8, 2); M.prop('rocks', 16, 6); M.prop('rocks', 5, 9);
      M.prop('busstop', 15, 8);
      M.trees([[4, 11, 'pine'], [17, 12, 'pine'], [5, 15, 'pine'], [17, 17, 'pine'], [4, 19, 'pine']]);
      M.prop('bush', 8, 12); M.prop('bush', 15, 15); M.prop('bush', 9, 19);
      M.lamp(9, 9, { r: 30, c: '#c8d0f8' });
      M.check(6, 3, async function (E) { await E.msg('こけむした いしの ぞうだ。|むかしの はしりやが あんぜんを いのった ものらしい。'); });
      M.check(15, 8, async function (E) { await E.msg('ふるい バスていの ひょうしき。|もう つかわれていない。'); });
      for (var x = 10; x <= 13; x++) M.warp(x, 21, { map: 'town', x: 'oldroad' });
      M.spot('entry', 12, 20, 'up');
    }
  });
})();
