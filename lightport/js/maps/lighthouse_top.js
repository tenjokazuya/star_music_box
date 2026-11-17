/* lighthouse_top.js — とうだい さいじょうかい（ひを ともす場面。ゲーム最大の見せ場）
 * このマップのフラグ: lt_seen, lamp_set(ランプに火が入った), lamp_lit(世界が明るくなる)
 * 流れ: どうぐ 3つを順に はめる → ひが ともる → 外から見た とうだい（むら）→ みなとの エンディング
 */
(function () {
  'use strict';

  var g = Game.mapkit.grid(10, 9, 'S');
  g.rect(0, 0, 10, 2, 'W');
  g.vline(0, 2, 6, '#'); g.vline(9, 2, 6, '#');
  g.hline(0, 8, 10, '#'); g.set(5, 8, 'D');

  function hasAllParts(S) { return S.flag('got_oil') && S.flag('got_lens') && S.flag('got_flint'); }

  async function ceremony(S) {
    if (!hasAllParts(S)) {
      await S.say(['おおきな ランプが ある。', 'あぶらも レンズも ひも まだ たりない。\nどうぐを そろえてから また こよう。'], null);
      return;
    }
    await S.say(['ここが とうだいの いちばん うえ。', 'おじいちゃんが まいにち ひを ともして いた\nばしょだ。'], null);
    var i = await S.ask('…ひを ともそう。', ['ともす', 'まだ']);
    if (i === 1) { return; }
    S.stopBgm(1.0);
    await S.wait(40);
    await S.say('まず、 あぶらを ランプに そそぐ。', null);
    S.take('oil'); S.sfx('set_item'); await S.wait(26); S.sfx('splash', { vol: 0.35 }); await S.wait(34);
    await S.say('つぎに、 レンズを はめこむ。', null);
    S.take('lens'); S.sfx('glass'); await S.wait(60);
    await S.say('さいごに、 ひうちいしを うちあわせる…。', null);
    S.take('flint');
    await S.wait(20);
    S.sfx('spark'); Game.gfx.flash('#fff0b0', 10, 0.4); await S.wait(30);
    S.sfx('spark'); Game.gfx.flash('#fff0b0', 10, 0.4); await S.wait(30);
    S.sfx('spark'); Game.gfx.flash('#fff0b0', 12, 0.5); await S.wait(24);
    S.sfx('ignite');
    Game.gfx.flash('#ffffff', 46, 1);
    Game.gfx.shake(2, 40);
    S.set('lamp_set');
    S.bgm('lamp', { fade: 0.1 });
    await S.wait(46);
    S.sfx('whoosh'); S.sfx('beam');
    await S.wait(140);
    await S.say(['…ひが ともった！', 'まぶしい ひかりが、 とうだいから\nうみへ ひろがっていく。'], null);
    await S.wait(30);
    S.sfx('horn_far');
    await S.wait(100);
    await S.say('…とおくで、 ふねの ふえが こたえた。', null);
    await S.wait(20);
    // 外から みた とうだい（むらの そら）
    await S.fade('out', 50, '#fff6d0');
    await S.warp('village', 26, 9, 'up', { noFade: true, noAutosave: true });
    await S.wait(30);
    await S.fade('in', 70);
    await S.wait(50);
    S.set('lamp_lit');
    S.sfx('beam');
    await S.pan(26, 3, 0.035);
    await S.wait(170);
    S.sfx('horn');
    await S.wait(200);
    await S.fade('out', 60, '#000000');
    await S.warp('harbor', 12, 8, 'down', { noFade: true });
  }

  Game.maps.register({
    id: 'lighthouse_top', name: 'とうだい さいじょうかい', indoor: true,
    bg: '#06060e',
    legend: { S: 'stone', W: 'stonewall', '#': 'void', D: 'stairs_d' },
    ground: g.rows(),
    bgm: 'lighthouse', ambient: ['windhigh'], tint: 'none', step: 'stone',

    props: [
      { type: 'window_round', x: 1, y: 1 }, { type: 'window_round', x: 3, y: 1 },
      { type: 'window_round', x: 6, y: 1 }, { type: 'window_round', x: 8, y: 1 },
      { type: 'torch', x: 2, y: 1 }, { type: 'torch', x: 7, y: 1 },
      { type: 'barrel', x: 1, y: 5 }, { type: 'barrel', x: 8, y: 5 },
      { type: 'table_s', x: 8, y: 3 }
    ],

    /** 火が入ったあとの光（放射状の光線とまぶしさ） */
    overlay: function (g, F) {
      if (!Game.save.flag('lamp_set')) { return; }
      var cx = 80 - F.cam.x, cy = 34 - F.cam.y, t = F.tick;
      g.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 10; i++) {
        var a = t * 0.012 + i * (Math.PI * 2 / 10);
        var w = 0.06 + (i % 2) * 0.03;
        g.fillStyle = 'rgba(255,238,160,' + (0.09 + (i % 3) * 0.02) + ')';
        g.beginPath(); g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a - w) * 220, cy + Math.sin(a - w) * 220);
        g.lineTo(cx + Math.cos(a + w) * 220, cy + Math.sin(a + w) * 220);
        g.closePath(); g.fill();
      }
      var r = 26 + Math.sin(t / 8) * 2;
      [[1, 'rgba(255,230,140,0.10)'], [0.72, 'rgba(255,236,160,0.12)'], [0.44, 'rgba(255,248,210,0.16)']].forEach(function (s) {
        g.fillStyle = s[1];
        var rr = Math.round(r * s[0] * 1.7);
        for (var y = -rr; y <= rr; y++) { var ww = Math.floor(Math.sqrt(rr * rr - y * y)); g.fillRect(Math.round(cx - ww), Math.round(cy + y), ww * 2 + 1, 1); }
      });
      g.globalCompositeOperation = 'source-over';
    },

    events: [
      { id: 'down', x: 5, y: 8, zone: true, run: async function (S) { await S.warp('lighthouse2', 5, 4, 'down', { sfx: 'stairs', frames: 10 }); } },

      {
        id: 'lamp', x: 4, y: 3, w: 2, sprite: 'lamp_big', pages: [
          { if: 'lamp_set', sprite: 'lamp_lit', run: async function (S) { await S.say('あたたかい ひが ゆれている。', null); } },
          { run: ceremony }
        ]
      },
      {
        id: 'first', x: 5, y: 7, trigger: 'auto', pages: [{
          if: { not: 'lt_seen' }, run: async function (S) {
            S.set('lt_seen');
            await S.say('まどの そとには、 まっくらな うみが\nひろがっている。', null);
            await S.say('まんなかに、 おおきな ランプが ある。', null);
          }
        }]
      },
      { id: 'ob_win', x: 1, y: 1, trigger: 'talk', run: async function (S) { await S.say('まどの そとには なにも みえない。\nただ、 かぜの おとが ひびく。', null); } },
      { id: 'ob_win2', x: 8, y: 1, trigger: 'talk', run: async function (S) { await S.say('きりの むこうに、 ちいさな ひとつの あかりが\nゆれた ような…。', null); } },
      { id: 'ob_table', x: 8, y: 3, trigger: 'talk', run: async function (S) { await S.say('ランプを みがく ぬのが のこされている。', null); } },
      { id: 'ob_barrel', x: 1, y: 5, trigger: 'talk', run: async function (S) { await S.say('とうだいの ひを ともす ための\nあぶらの あとが ついている。', null); } }
    ]
  });
})();
