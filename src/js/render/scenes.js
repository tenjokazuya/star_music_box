(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Util = Orgel.Util;
  var Sprites = Orgel.Sprites;
  var Ease = Util.Ease;
  var clamp = Util.clamp;
  var TAU = Math.PI * 2;

  /**
   * 盤面のない場面（タイトル・ワールドクリア・エンディング）をキャンバスに描く。
   *   var scenes = Scenes.create(cv);
   *   scenes.draw(ctx, api, name, params);   // name: 'title' | 'worldclear' | 'ending'
   * 背景は別（Background）。ここでは背景の上に重ねるほしのこ・星座・紙吹雪を描く。
   */

  var CONFIG = {
    TITLE_ORBS: 4,
    CONFETTI_PER_SEC: 22,
  };

  function create(cv) {
    var particles = Orgel.Particles.create();
    var scenes = { reduced: false };
    var orbState = [];
    var lastName = '';
    var confettiAcc = 0;
    var t0 = 0;
    var endPhaseSeen = 0;     // エンディングで最後に見たphase（切り替わりの検出用）
    var endPhaseAt = 0;       // 「おしまい」に切り替わった時刻
    var endProgAt = 0;        // そのときの星座の進み具合

    for (var i = 0; i < 12; i++) {
      orbState.push({ phase: Math.random() * TAU, hopAt: 1500 + Math.random() * 3000, hopT: -1e9, blinkAt: 1000 + Math.random() * 3000, blinkT: -1e9 });
    }

    function blink(o, now) {
      if (now >= o.blinkAt) { o.blinkT = now; o.blinkAt = now + 2200 + Math.random() * 3600; }
      return now - o.blinkT < 130;
    }

    /** 跳ねる動き。戻り値は { dy: 高さ(0〜1), land: 着地直後の潰れ(0〜1) } */
    function hop(o, now, every) {
      if (now >= o.hopAt) { o.hopT = now; o.hopAt = now + every * (0.7 + Math.random() * 0.8); }
      var tt = (now - o.hopT) / 620;
      if (tt >= 0 && tt < 1) return { dy: Math.sin(tt * Math.PI), land: 0 };
      var lt = (now - o.hopT - 620) / 260;
      return { dy: 0, land: lt >= 0 && lt < 1 ? Math.sin(lt * Math.PI) * Math.exp(-lt * 2) : 0 };
    }

    // ---- タイトル: 丘の上でのんびり待つ4体 ----
    function drawTitle(ctx, api, p) {
      var w = api.width;
      var h = api.height;
      var now = api.time;
      var R = Math.max(16, Math.min(w, h) * 0.05);
      var narrow = w < 700 || h > w * 1.2;
      var look = [clamp(p.px || 0, -1, 1), clamp(p.py || 0, -1, 1)];
      for (var i = 0; i < CONFIG.TITLE_ORBS; i++) {
        var o = orbState[i];
        var x, y;
        if (p.compact) {
          // 横持ちのスマートフォン: メニューが右半分に出るので、4体とも左の丘に並べる
          x = w * (0.07 + i * 0.12);
          y = h - R * 1.9 - (i % 2) * R * 0.5;
        } else if (narrow) {
          x = w * (0.2 + i * 0.2);
          y = h - R * 1.9 - (i % 2) * R * 0.5;
        } else {
          var side = i < 2 ? 0 : 1;
          var idx = i % 2;
          x = side === 0 ? w * (0.1 + idx * 0.1) : w * (0.8 + idx * 0.1);
          y = h * 0.84 - (idx ? R * 0.9 : 0);
        }
        var hp = scenes.reduced ? { dy: 0, land: 0 } : hop(o, now, 4200);
        var bob = scenes.reduced ? 0 : Math.sin(now * 0.0022 + o.phase) * R * 0.04;
        var jump = hp.dy * R * 1.5;
        Sprites.drawOrb(ctx, x, y - jump + bob, R, i % 4, {
          sx: 1 + hp.land * 0.18 - hp.dy * 0.06, sy: 1 - hp.land * 0.2 + hp.dy * 0.1, angle: Math.PI / 2,
          eyes: blink(o, now) ? 'blink' : 'open', mouth: hp.dy > 0 ? 'happy' : 'smile',
          look: look, glow: 0.6, shadow: 1 - hp.dy * 0.5,
        });
      }
    }

    // ---- ワールドクリア: よろこぶほしのこと紙吹雪 ----
    function drawWorldClear(ctx, api, p) {
      var w = api.width;
      var h = api.height;
      var now = api.time;
      var R = Math.max(18, Math.min(w, h) * 0.055);
      var n = 4;
      // 背の低い画面では、ボタンの下に収まるよう低く小さく跳ねる
      var compact = !!(p && p.compact);
      var baseY = compact ? h - R * 1.7 : h - Math.max(R * 2.6, h * 0.14);
      var jumpH = compact ? 1.0 : 1.8;
      for (var i = 0; i < n; i++) {
        var o = orbState[i];
        var x = w * (0.5 + (i - (n - 1) / 2) * 0.17);
        var tt = (now * 0.0016 + i * 0.7) % 2;
        var up = tt < 1 ? Math.sin(tt * Math.PI) : 0;
        var land = tt >= 1 ? Math.max(0, Math.sin((tt - 1) * Math.PI)) * 0.4 : 0;
        Sprites.drawOrb(ctx, x, baseY - up * R * jumpH, R, i % 4, {
          sx: 1 + land * 0.2, sy: 1 - land * 0.22 + up * 0.08, angle: Math.PI / 2,
          eyes: 'happy', mouth: 'happy', glow: 0.8, shadow: 1 - up * 0.5, look: [0, 0],
        });
        void o;
      }
      // 紙吹雪（ワールドの差し色と白）
      var accent = (p && p.accent) || '#ffe08a';
      if (!scenes.reduced) {
        confettiAcc += api.dt * CONFIG.CONFETTI_PER_SEC / 1000;
        while (confettiAcc >= 1) {
          confettiAcc -= 1;
          particles.emit({
            kind: Math.random() < 0.5 ? 'spark' : 'glow', x: Math.random() * w, y: -10,
            vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 90, life: 4200, size: 5 + Math.random() * 7,
            color: [accent, '#ffffff', '#ffb3d9', '#9ffff0'][(Math.random() * 4) | 0], alpha: 0.9, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 4,
          });
        }
      }
    }

    // ---- エンディング: ねむるほしのこの星座 ----
    function drawEnding(ctx, api, p) {
      var w = api.width;
      var h = api.height;
      var now = api.time;
      var phase = p && p.phase ? p.phase : 0;        // 0=ことばの場面 1=おしまいの場面
      var prog = clamp((now - t0) / 12000, 0, 1);      // 星座が描かれていく進み具合
      // 途中で「おしまい」へ飛ばされても、星座は少しのあいだに最後まで描き切る
      if (phase !== endPhaseSeen) { endPhaseSeen = phase; endPhaseAt = now; endProgAt = prog; }
      if (phase) prog = endProgAt + (1 - endProgAt) * clamp((now - endPhaseAt) / 1800, 0, 1);
      var m = Math.min(w, h);
      var cx = w * 0.5;
      var compact = !!(p && p.compact);                // 背の低い画面では星座を小さくして、文字と重ならないようにする
      var cy = h * (phase ? (compact ? 0.17 : 0.2) : 0.3);
      var r = m * (phase ? (compact ? 0.1 : 0.15) : (compact ? 0.2 : 0.24));
      var alpha = phase ? 0.7 : 1;
      var pts = [];
      var n = 10;
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (i / n) * TAU;
        var rr = i % 2 === 0 ? r : r * 0.4;       // 偶数番は星の先端、奇数番はくぼみ
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      // 星座の線（先端から先端へ少しずつつながる）
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      var drawn = prog * n;
      for (var k = 0; k < n; k++) {
        var seg = clamp(drawn - k, 0, 1);
        if (seg <= 0) continue;
        var pa = pts[k];
        var pb = pts[(k + 1) % n];
        ctx.strokeStyle = 'rgba(255,240,190,' + (0.55 * seg) + ')';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pa[0] + (pb[0] - pa[0]) * seg, pa[1] + (pb[1] - pa[1]) * seg);
        ctx.stroke();
      }
      ctx.restore();
      // 先端にねむるほしのこ、くぼみに小さな光
      var R = Math.max(9, m * (phase ? 0.03 : 0.042));
      ctx.save();
      ctx.globalAlpha = alpha;
      for (var j = 0; j < n; j++) {
        var show = clamp(drawn - j + 0.6, 0, 1);
        if (show <= 0) continue;
        if (j % 2 === 0) {
          var bob = scenes.reduced ? 0 : Math.sin(now * 0.0014 + j) * R * 0.1;
          Sprites.drawOrb(ctx, pts[j][0], pts[j][1] + bob, R, (j / 2) % 4, { scale: Ease.outBack(show), alpha: show, eyes: 'sleep', mouth: 'sleep', glow: 0.9, shadow: 0 });
          if (!scenes.reduced && Math.random() < 0.004) {
            particles.emit({ kind: 'spark', x: pts[j][0] + R, y: pts[j][1] - R, vx: 10, vy: -22, life: 1800, size: R * 0.5, color: '#fff1b8', alpha: 0.8, rot: 0, spin: 0.5 });
          }
        } else {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * show * (0.6 + 0.4 * Math.sin(now * 0.003 + j));
          var gs = Orgel.Particles.glowSprite('#fff1b8');
          ctx.drawImage(gs, pts[j][0] - R * 0.9, pts[j][1] - R * 0.9, R * 1.8, R * 1.8);
          ctx.restore();
        }
      }
      var cg = clamp(drawn - n + 0.6, 0, 1);
      if (cg > 0) Sprites.drawOrb(ctx, cx, cy, R * 1.3, 1, { scale: Ease.outBack(cg), alpha: cg, eyes: 'sleep', mouth: 'sleep', glow: 1.1, shadow: 0 });
      ctx.restore();
    }

    scenes.draw = function (ctx, api, name, params) {
      if (name !== lastName) {
        lastName = name;
        t0 = api.time;
        endPhaseSeen = 0;
        particles.clear();
        confettiAcc = 0;
      }
      particles.density = scenes.reduced ? 0.3 : 1;
      particles.update(api.dt);
      if (name === 'title') drawTitle(ctx, api, params || {});
      else if (name === 'worldclear') drawWorldClear(ctx, api, params || {});
      else if (name === 'ending') drawEnding(ctx, api, params || {});
      particles.draw(ctx);
    };

    scenes.reset = function () { lastName = ''; };
    return scenes;
  }

  var Scenes = { CONFIG: CONFIG, create: create };

  Orgel.Scenes = Scenes;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Scenes; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
