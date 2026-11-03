/* 開発用スプライトシート（?scene=sheet）。素材の目視確認専用。 */
(function (RP) {
  'use strict';
  var G = RP.gfx, T = RP.text;
  var t = 0;

  RP.scene.register('sheet', {
    enter: function () { t = 0; },
    update: function (dt) { t += dt; },
    draw: function () {
      G.clear('night');
      var names = ['ic_soup', 'ic_h_bari', 'ic_h_katame', 'ic_h_futsu', 'ic_h_yawa', 'ic_negi', 'ic_nori', 'ic_menma', 'ic_egg', 'ic_chashu',
        'ic_gyoza', 'ic_beer', 'ic_rice', 'ic_ok', 'ic_x', 'ic_star', 'ic_coin', 'ic_trash'];
      names.forEach(function (n, i) {
        var o = {};
        if (n === 'ic_soup') { o.pal = { x: 'shoyu' }; }
        if (n.indexOf('ic_h_') === 0) { o.pal = { x: 'maroon' }; }
        G.sprite(n, 6 + i * 12, 4, Object.assign({ sx: 1 }, o));
        G.sprite(n, 6 + (i % 9) * 40, 20 + Math.floor(i / 9) * 22, Object.assign({ sx: 2 }, o));
      });
      G.sprite('bowl_empty', 6, 66, { sx: 1 });
      G.sprite('dish_dirty', 40, 66, { sx: 1 });
      G.sprite('lantern', 70, 62);
      G.sprite('cat', 84, 62);
      G.sprite('dog', 100, 64);
      G.sprite('plant', 120, 62);
      G.sprite('queue_fig', 136, 64, { pal: { C: 'blue', s: 'skin' } });
      // 客の見本
      var types = RP.CUSTOMERS.types, x = 6;
      var moods = ['normal', 'happy', 'angry', 'eat', 'sour', 'wait'];
      var rng = new RP.Rng(5);
      for (var i = 0; i < types.length; i++) {
        var ty = types[i];
        var look = { hair: ty.hairs[0], hairCol: RP.CUSTOMERS.hairCols[i % 8], body: ty.bodies[0], c1: RP.CUSTOMERS.clothes[i][0], c2: RP.CUSTOMERS.clothes[i][1],
                     skin: 'skin', glasses: ty.hairs[0] === 'glasses' };
        var mood = moods[Math.floor(t / 1.2 + i) % moods.length];
        G.ctx.drawImage(RP.cust.canvas(look, mood, Math.floor(t * 4) % 2), 6 + i * 46, 84, 44, 60);
        T.draw(ty.name.slice(0, 3), 6 + i * 46, 146, 'white');
        void rng; void x;
      }
    }
  });
})(window.RP);
