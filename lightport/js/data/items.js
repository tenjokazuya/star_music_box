/* items.js — 持ち物の定義。名前・説明（1 行 20 字以内で 2 行まで）・アイコン（16×16、実行時に生成） */
(function () {
  'use strict';

  function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

  var defs = {
    lantern: {
      name: 'ランプ', desc: 'くらい ところを\nてらす てさげランプ。',
      icon: function (g) {
        rect(g, 6, 1, 4, 2, '#6a6a84'); rect(g, 7, 0, 2, 2, '#8a8aa4');
        rect(g, 4, 3, 8, 10, '#4a4a62'); rect(g, 5, 4, 6, 8, '#fff0a0'); rect(g, 6, 5, 2, 4, '#ffffff'); rect(g, 8, 8, 2, 3, '#f6c84a');
        rect(g, 3, 13, 10, 2, '#6a6a84'); rect(g, 3, 13, 10, 1, '#9a9ab4');
        rect(g, 7, 3, 1, 10, '#4a4a62');
      }
    },
    lh_key: {
      name: 'とうだいの かぎ', desc: 'とうだいの とびらを\nあける ふるい かぎ。',
      icon: function (g) {
        rect(g, 3, 2, 6, 6, '#f6d04a'); rect(g, 4, 3, 4, 4, '#241a2e'); rect(g, 3, 2, 6, 1, '#fff0a0'); rect(g, 3, 2, 1, 6, '#fff0a0');
        rect(g, 8, 6, 5, 2, '#f6d04a'); rect(g, 11, 6, 2, 5, '#f6d04a'); rect(g, 9, 9, 2, 2, '#dca828');
        rect(g, 11, 10, 3, 2, '#f6d04a'); rect(g, 8, 6, 5, 1, '#fff0a0');
      }
    },
    memo: {
      name: 'めもちょう', desc: 'ひを ともすのに いる\nものが かいてある。',
      icon: function (g) {
        rect(g, 3, 1, 10, 14, '#f4e8cc'); rect(g, 3, 1, 10, 1, '#ffffff'); rect(g, 3, 14, 10, 1, '#c8b894'); rect(g, 12, 1, 1, 14, '#c8b894');
        rect(g, 3, 1, 2, 14, '#a03038');
        for (var y = 4; y < 13; y += 3) { rect(g, 6, y, 5, 1, '#6a5a50'); }
      }
    },
    store_key: {
      name: 'そうこの かぎ', desc: 'みなとの そうこを\nあける かぎ。',
      icon: function (g) {
        rect(g, 2, 3, 5, 5, '#c4c4d8'); rect(g, 3, 4, 3, 3, '#241a2e'); rect(g, 2, 3, 5, 1, '#f0f0fa');
        rect(g, 6, 5, 8, 2, '#c4c4d8'); rect(g, 6, 5, 8, 1, '#f0f0fa'); rect(g, 10, 7, 2, 3, '#a0a0b8'); rect(g, 13, 7, 2, 4, '#a0a0b8');
      }
    },
    oil: {
      name: 'あぶら', desc: 'とうだいの あかりに\nつかう あぶら。',
      icon: function (g) {
        rect(g, 6, 1, 4, 3, '#6a4426'); rect(g, 5, 4, 6, 2, '#8a5c34');
        rect(g, 3, 6, 10, 9, '#e8a830'); rect(g, 3, 6, 10, 1, '#f8d870'); rect(g, 3, 6, 2, 9, '#f8d870'); rect(g, 11, 6, 2, 9, '#b07818');
        rect(g, 5, 9, 6, 4, '#f6f0d0'); rect(g, 7, 10, 2, 2, '#e8a830');
      }
    },
    glasses: {
      name: 'めがね', desc: 'ハルばあさんの めがね。\nかるく ゆがんでいる。',
      icon: function (g) {
        rect(g, 1, 5, 6, 6, '#6a5a50'); rect(g, 2, 6, 4, 4, '#bce8f8'); rect(g, 9, 5, 6, 6, '#6a5a50'); rect(g, 10, 6, 4, 4, '#bce8f8');
        rect(g, 7, 7, 2, 1, '#6a5a50'); rect(g, 2, 6, 2, 1, '#ffffff'); rect(g, 10, 6, 2, 1, '#ffffff');
        rect(g, 0, 7, 1, 2, '#6a5a50'); rect(g, 15, 7, 1, 2, '#6a5a50');
      }
    },
    lens: {
      name: 'レンズ', desc: 'とうだいの ひかりを\nとおくへ とどける。',
      icon: function (g) {
        Game.gfx.disc(g, 8, 8, 7, '#5a9cc8'); Game.gfx.disc(g, 8, 8, 6, '#8cc8e8'); Game.gfx.disc(g, 7, 7, 4, '#c0e8f8');
        rect(g, 4, 4, 2, 2, '#ffffff'); px(g, 6, 3, '#ffffff'); px(g, 3, 6, '#ffffff');
        for (var i = 0; i < 3; i++) { rect(g, 3 + i * 3, 12 - i, 1, 1, '#5a9cc8'); }
      }
    },
    flint: {
      name: 'ひうちいし', desc: 'うちあわせると\nひが でる いし。',
      icon: function (g) {
        rect(g, 2, 7, 6, 6, '#8a8aa0'); rect(g, 3, 6, 4, 1, '#b0b0c4'); rect(g, 2, 7, 6, 1, '#b0b0c4'); rect(g, 2, 12, 6, 1, '#5c5c78');
        rect(g, 8, 5, 6, 6, '#6c6c88'); rect(g, 9, 4, 4, 1, '#9a9ab4'); rect(g, 8, 5, 6, 1, '#9a9ab4'); rect(g, 8, 10, 6, 1, '#40405a');
        px(g, 7, 3, '#fff4b0'); px(g, 9, 1, '#f6d04a'); px(g, 5, 2, '#f6d04a'); px(g, 8, 3, '#ffffff'); px(g, 6, 4, '#f08a3c');
      }
    },
    letter: {
      name: 'ふるい てがみ', desc: 'ほらあなの たからばこに\nはいって いた てがみ。',
      icon: function (g) {
        rect(g, 1, 3, 14, 10, '#f0e2c0'); rect(g, 1, 3, 14, 1, '#ffffff'); rect(g, 1, 12, 14, 1, '#c8b488');
        for (var i = 0; i < 6; i++) { px(g, 2 + i, 4 + i, '#c8b488'); px(g, 13 - i, 4 + i, '#c8b488'); }
        rect(g, 6, 7, 4, 4, '#c04040'); rect(g, 7, 8, 2, 2, '#e07070');
      }
    },
    star: {
      name: 'ほしの かけら', desc: 'ひかりを ためこんだ\nちいさな ほしの かたち。',
      icon: function (g) {
        var c = '#f6d04a', l = '#fff4b0', d = '#dca828';
        rect(g, 7, 1, 2, 3, c); rect(g, 6, 4, 4, 2, c); rect(g, 1, 6, 14, 2, c); rect(g, 3, 8, 10, 2, c);
        rect(g, 4, 10, 3, 3, c); rect(g, 9, 10, 3, 3, c); rect(g, 3, 13, 2, 1, c); rect(g, 11, 13, 2, 1, c);
        rect(g, 7, 1, 1, 3, l); rect(g, 2, 6, 5, 1, l); rect(g, 6, 4, 1, 2, l);
        rect(g, 9, 8, 4, 1, d); rect(g, 10, 11, 2, 2, d);
      }
    }
  };

  var cache = {};
  Game.items = {
    defs: defs,
    name: function (id) { return defs[id] ? defs[id].name : id; },
    icon: function (id) {
      if (cache[id]) { return cache[id]; }
      var d = defs[id];
      var cv = Game.gfx.make(16, 16, function (g) { if (d) { d.icon(g); } });
      cache[id] = cv;
      return cv;
    }
  };
})();
