/* battle.js — ターン制バトル */
(function () {
  'use strict';
  var U = PF.ui, C = U.C, F = PF.font, W = PF.W, H = PF.H;
  var B = PF.battle = {};
  var S = null; // 現在の戦闘

  /* ---------- ステータス計算 ---------- */
  B.calc = function (h) {
    var lv = h.lv, st = PF.db.stats, I = PF.db.items;
    var w = h.weapon && I[h.weapon], a = h.armor && I[h.armor], c = h.acc && I[h.acc];
    return {
      lv: lv, maxHp: st.maxHp(lv), maxMp: st.maxMp(lv) + (c && c.mp || 0),
      atk: st.atk(lv) + (w && w.atk || 0) + (c && c.atk || 0),
      def: st.def(lv) + (a && a.def || 0) + (c && c.def || 0),
      spd: st.spd(lv), mag: 6 + lv * 2.4, fire: !!(w && w.fire)
    };
  };
  B.expFor = function (lv) { return PF.db.stats.total(lv); };
  B.nextExp = function (h) { return h.lv >= PF.db.stats.maxLv ? 0 : B.expFor(h.lv + 1) - h.exp; };

  /* ---------- 準備 ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function newEnemy(id, i, n) {
    var d = PF.db.enemies[id], e = { id: id, def: d, name: d.name, hp: d.hp, maxHp: d.hp, atk: d.atk, df: d.def, spd: d.spd, spr: PF.monsters.make(d.sprite), alive: true, alpha: 1, dissolve: 0, shake: 0, flash: 0, guard: false, charging: false, t: PF.rnd(60) };
    var xs = n === 1 ? [120] : (n === 2 ? [80, 160] : [52, 120, 188]);
    e.x = xs[i]; e.size = e.spr.width; e.y = 88 - e.size + (e.size > 48 ? 4 : 0) - (n === 1 ? 4 : 0);
    return e;
  }

  /* ---------- 描画 ---------- */
  var scene = {
    overlay: false,
    update: function () {
      if (!S) return;
      S.t++;
      S.enemies.forEach(function (e) { e.t++; if (e.shake > 0) e.shake--; if (e.flash > 0) e.flash--; if (e.dying) { e.dissolve += 0.035; if (e.dissolve >= 1) { e.dying = false; e.alive = false; e.gone = true; } } });
      if (S.hshake > 0) S.hshake--;
      S.dispHp += Math.sign(S.hero.hp - S.dispHp) * Math.max(1, Math.abs(S.hero.hp - S.dispHp) / 12) | 0 || 0;
      if (Math.abs(S.hero.hp - S.dispHp) < 1.5) S.dispHp = S.hero.hp;
      S.dispMp += Math.sign(S.hero.mp - S.dispMp) * Math.max(1, Math.abs(S.hero.mp - S.dispMp) / 12) | 0 || 0;
      if (Math.abs(S.hero.mp - S.dispMp) < 1.5) S.dispMp = S.hero.mp;
      for (var i = S.fxs.length - 1; i >= 0; i--) { var f = S.fxs[i]; f.t++; if (f.update) f.update(f); if (f.t > f.life) S.fxs.splice(i, 1); }
      if (S.msg) { S.msg.upd(); }
      if (S.input) S.input.upd();
    },
    draw: function (g) {
      if (!S) return;
      g.fillStyle = '#0c1030'; g.fillRect(0, 0, W, H); // 下半分も毎フレーム塗る（フラッシュ演出が残像に重なって赤くならないように）
      g.drawImage(PF.monsters.bg(S.bg), 0, 0);
      if (S.flashBg > 0) { g.fillStyle = 'rgba(255,255,255,' + S.flashBg * 0.4 + ')'; g.fillRect(0, 0, W, 96); S.flashBg -= 0.1; }
      // 仲間のヒダネ
      g.globalAlpha = 0.4; g.drawImage(PF.sprites.shadow, 22, 80); g.globalAlpha = 1;
      g.drawImage(PF.sprites.ember[((S.t / 7) | 0) % 4], 22, 70 + Math.round(Math.sin(S.t / 9) * 2));
      S.enemies.forEach(drawEnemy.bind(null, g));
      S.fxs.forEach(function (f) { f.draw(g, f); });
      // 対象カーソル
      if (S.input && S.input.type === 'target') {
        var te = S.input.list[S.input.i];
        if (te && ((S.t / 8) | 0) % 2 === 0) F.draw(g, '▼', te.x - 4, te.y - 12, C.hi, { shadow: '#000' });
        U.window(g, 60, 74, 120, 14); U.textC(g, te.name, 120, 77, C.text);
      }
      drawStatus(g);
      drawBottom(g);
      if (S.sub) drawSub(g);
    }
  };
  function drawEnemy(g, e) {
    if (e.gone) return;
    var x = Math.round(e.x - e.size / 2), y = e.y + (e.dying ? 0 : Math.round(Math.sin(e.t / 14) * 1.5));
    if (e.shake > 0) x += (e.shake % 4 < 2 ? -2 : 2);
    if (e.flash > 0 && (e.flash % 4 < 2)) return;
    if (e.dying) {
      var rows = e.size;
      for (var r = 0; r < rows; r++) { if (((r * 7 + 3) % 16) / 16 < e.dissolve) continue; var off = Math.round(e.dissolve * 6 * ((r % 2) ? 1 : -1)); g.drawImage(e.spr, 0, r, e.size, 1, x + off, y + r, e.size, 1); }
    } else { g.drawImage(e.spr, x, y); if (e.guard) { g.globalAlpha = 0.5; g.fillStyle = '#80c0ff'; g.fillRect(x, y + e.size - 4, e.size, 2); g.globalAlpha = 1; } }
    if (e.charging && !e.dying) { g.globalAlpha = 0.25 + 0.2 * Math.sin(S.t / 3); g.fillStyle = '#ff3030'; g.fillRect(x, y, e.size, e.size); g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.globalCompositeOperation = 'source-over'; }
  }
  function drawStatus(g) {
    var h = S.hero, st = S.st, sx = 4, sy = 4;
    if (S.hshake > 0) sx += (S.hshake % 4 < 2 ? -2 : 2);
    U.window(g, sx, sy, 100, 40);
    U.text(g, h.name, sx + 8, sy + 5, C.text); U.text(g, 'Lv' + h.lv, sx + 62, sy + 5, C.hi);
    U.text(g, 'HP', sx + 8, sy + 16, C.red); U.textR(g, Math.round(S.dispHp) + '/' + st.maxHp, sx + 94, sy + 16, C.text);
    U.bar(g, sx + 8, sy + 26, 84, S.dispHp, st.maxHp, S.dispHp / st.maxHp < 0.3 ? '#f05050' : '#58d070');
    U.text(g, 'MP', sx + 8, sy + 28, C.blue); U.textR(g, Math.round(S.dispMp) + '/' + st.maxMp, sx + 94, sy + 28, C.text);
    if (S.guarding) U.icon(g, 'shield', sx + 46, sy + 6);
  }
  function drawBottom(g) {
    U.window(g, 4, 100, 232, 56);
    if (S.msg) {
      var m = S.msg, left = m.shown;
      for (var i = 0; i < m.lines.length; i++) { var ln = m.lines[i], n = Math.min(ln.length, Math.max(0, left)); left -= ln.length; if (n > 0) U.text(g, ln.slice(0, n), 12, 106 + i * 12); }
    } else if (S.input && (S.input.type === 'cmd' || S.input.type === 'target')) {
      var cmds = ['たたかう', 'わざ', 'ぼうぎょ', 'どうぐ', 'にげる'];
      for (var k = 0; k < cmds.length; k++) {
        var cx = 14 + (k % 2) * 62, cy = 108 + ((k / 2) | 0) * 14;
        U.text(g, cmds[k], cx + 10, cy, S.input.type === 'cmd' && S.cmdSel === k ? C.hi : (k === 4 && S.noFlee ? C.dim : C.text));
        if (S.cmdSel === k && S.input.type === 'cmd') U.cursor(g, cx, cy);
      }
      var alive = S.enemies.filter(function (e) { return e.alive; }), y0 = 108;
      U.window(g, 134, 104, 98, 48, { fill: '#10163c' });
      var counts = {}, order = [];
      alive.forEach(function (e) { if (!counts[e.name]) { counts[e.name] = 0; order.push(e.name); } counts[e.name]++; });
      order.forEach(function (nm, i) { U.text(g, nm + (counts[nm] > 1 ? '×' + counts[nm] : ''), 142, y0 + i * 12, C.text); });
      if (S.input.type === 'cmd') U.text(g, S.hero.name + 'は どうする?', 12, 140, C.dim);
    }
  }
  function drawSub(g) {
    var sub = S.sub, items = sub.items, vis = 5, top = Math.max(0, Math.min(sub.sel - 2, items.length - vis));
    U.window(g, 104, 22, 132, 74);
    for (var i = 0; i < vis && top + i < items.length; i++) {
      var it = items[top + i], y = 28 + i * 12, dis = it.disabled;
      U.text(g, it.label, 120, y, dis ? C.dim : C.text);
      if (it.right) U.textR(g, it.right, 230, y, dis ? C.dim : C.hi);
      if (top + i === sub.sel) U.cursor(g, 108, y);
    }
    if (!items.length) U.text(g, 'なにも ない', 120, 40, C.dim);
    if (sub.desc && items[sub.sel]) { U.text(g, items[sub.sel].desc || '', 12, 112, C.dim); }
    if (top > 0) F.draw(g, '▲', 224, 24, C.hi); if (top + vis < items.length) F.draw(g, '▼', 224, 84, C.hi);
  }

  /* ---------- メッセージ ---------- */
  function say(text, o) {
    o = o || {};
    return new Promise(function (res) {
      var lines = F.wrap(U.sub(text), 216).slice(0, 4), len = lines.join('').length, wait = 0, cnt = 0;
      var m = { lines: lines, shown: 0, upd: function () {
        if (m.shown < len) {
          cnt += (PF.input.down('a') || PF.input.down('b')) ? 3 : 1.2; while (cnt >= 1 && m.shown < len) { cnt--; m.shown++; if (m.shown % 3 === 0) PF.sfx('text'); }
          if (PF.input.pressed('a')) m.shown = len;
        } else {
          wait++;
          if (PF.input.pressed('a') || wait > (o.hold || 34)) { S.msg = null; res(); }
        }
      } };
      S.msg = m;
    });
  }
  B.say = say;
  function clearMsg() { S.msg = null; }

  /* ---------- 選択 ---------- */
  function pickList(items, o) { // items: [{label,right,disabled,desc,v}] → 選択された要素 or null
    o = o || {};
    return new Promise(function (res) {
      var sub = { items: items, sel: o.def || 0, desc: true }; S.sub = sub;
      S.input = { type: o.type || 'skill', upd: function () {
        var d = PF.input.dirRepeat();
        if (d === 'u' && items.length) { sub.sel = (sub.sel + items.length - 1) % items.length; PF.sfx('cursor'); }
        if (d === 'd' && items.length) { sub.sel = (sub.sel + 1) % items.length; PF.sfx('cursor'); }
        if (PF.input.pressed('a') && items.length) { if (items[sub.sel].disabled) { PF.sfx('error'); return; } PF.sfx('ok'); S.sub = null; S.input = null; res(items[sub.sel]); }
        else if (PF.input.pressed('b')) { PF.sfx('cancel'); S.sub = null; S.input = null; res(null); }
      } };
    });
  }
  function pickTarget() {
    var list = S.enemies.filter(function (e) { return e.alive; });
    if (list.length === 1) return Promise.resolve(list[0]);
    return new Promise(function (res) {
      S.input = { type: 'target', list: list, i: 0, upd: function () {
        var inp = S.input, d = PF.input.dirRepeat();
        if (d === 'l' || d === 'u') { inp.i = (inp.i + list.length - 1) % list.length; PF.sfx('cursor'); }
        if (d === 'r' || d === 'd') { inp.i = (inp.i + 1) % list.length; PF.sfx('cursor'); }
        if (PF.input.pressed('a')) { PF.sfx('ok'); var t = list[inp.i]; S.input = null; res(t); }
        else if (PF.input.pressed('b')) { PF.sfx('cancel'); S.input = null; res(null); }
      } };
    });
  }
  async function chooseCommand() {
    while (true) {
      var r = await new Promise(function (res) {
        S.input = { type: 'cmd', upd: function () {
          var d = PF.input.dirRepeat(), s = S.cmdSel;
          if (d === 'l') s = s % 2 === 1 ? s - 1 : s; if (d === 'r') s = (s % 2 === 0 && s + 1 < 5) ? s + 1 : s;
          if (d === 'u') s = s >= 2 ? s - 2 : s; if (d === 'd') s = s + 2 < 5 ? s + 2 : s;
          if (s !== S.cmdSel) { S.cmdSel = s; PF.sfx('cursor'); }
          if (PF.input.pressed('a')) { PF.sfx('ok'); S.input = null; res(S.cmdSel); }
        } };
      });
      var h = S.hero;
      if (r === 0) { var t = await pickTarget(); if (t) return { t: 'atk', target: t }; }
      else if (r === 1) {
        var sk = h.skills.map(function (id) { var s = PF.db.skills[id]; return { label: s.name, right: 'MP' + s.mp, disabled: h.mp < s.mp, desc: s.desc, v: id }; });
        var pick = await pickList(sk, { type: 'skill' });
        if (pick) {
          var skill = PF.db.skills[pick.v], tg = null;
          if (skill.kind === 'dmg' && skill.target === 'one') { tg = await pickTarget(); if (!tg) continue; }
          return { t: 'skill', id: pick.v, target: tg };
        }
      } else if (r === 2) return { t: 'guard' };
      else if (r === 3) {
        var its = Object.keys(PF.state.items).filter(function (id) { var it = PF.db.items[id]; return it.type === 'heal' || it.type === 'mp'; })
          .map(function (id) { var it = PF.db.items[id]; return { label: it.name, right: '×' + PF.state.items[id], desc: it.desc, v: id }; });
        var p2 = await pickList(its, { type: 'item' });
        if (p2) return { t: 'item', id: p2.v };
      } else if (r === 4) {
        if (S.noFlee) { PF.sfx('error'); await say('にげられない!'); continue; }
        return { t: 'flee' };
      }
    }
  }

  /* ---------- 演出（エフェクト） ---------- */
  function fx(o) { o.t = 0; S.fxs.push(o); return new Promise(function (res) { var old = o.update; o.done = res; var life = o.life; o.update = function (f) { if (old) old(f); if (f.t >= life - 1 && f.done) { var d = f.done; f.done = null; d(); } }; }); }
  function slashFx(e) {
    PF.sfx('hit'); e.shake = 14; e.flash = 8;
    return fx({ life: 12, draw: function (g, f) {
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; var k = f.t / 12, cx = e.x, cy = e.y + e.size / 2;
      g.beginPath(); g.moveTo(cx - 20 + k * 6, cy - 20); g.lineTo(cx + 20 - k * 6, cy + 20); g.stroke();
      g.strokeStyle = '#ffe070'; g.beginPath(); g.moveTo(cx - 16, cy - 22 + k * 8); g.lineTo(cx + 18, cy + 18 - k * 4); g.stroke();
    } });
  }
  function fireFx(targets) {
    PF.sfx('fireball');
    var ex = 30, ey = 76;
    return fx({ life: 44, draw: function (g, f) {
      var k = f.t / 44, i;
      targets.forEach(function (e) {
        var tx = e.x, ty = e.y + e.size / 2;
        if (f.t < 20) { var kk = f.t / 20, x = ex + (tx - ex) * kk, y = ey + (ty - ey) * kk - Math.sin(kk * Math.PI) * 16; g.fillStyle = '#ff6a1a'; g.fillRect(x - 4, y - 4, 8, 8); g.fillStyle = '#ffd060'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#ffee80'; g.fillRect(x - 1, y - 1, 2, 2); g.fillStyle = '#ff6a1a'; g.fillRect(x - 10 * kk, y - 1, 5, 2); }
        else { var r = (f.t - 20) / 24; for (i = 0; i < 14; i++) { var a = i * 0.45 + r, d = r * 26 + (i % 3) * 3; g.fillStyle = i % 2 ? '#ff6a1a' : '#ffd060'; var s = 5 - r * 4; g.fillRect(tx + Math.cos(a) * d - s / 2, ty + Math.sin(a) * d - s / 2, Math.max(1, s), Math.max(1, s)); } g.fillStyle = 'rgba(255,200,80,' + (1 - r) * 0.6 + ')'; g.fillRect(tx - 18, ty - 18, 36, 36); }
      });
      if (f.t === 20) { targets.forEach(function (e) { e.shake = 16; e.flash = 10; }); S.flashBg = 1; PF.sfx('crit'); }
    } });
  }
  function healFx() {
    PF.sfx('heal');
    return fx({ life: 36, draw: function (g, f) {
      for (var i = 0; i < 10; i++) { var x = 14 + i * 9, y = 40 - ((f.t * 1.2 + i * 7) % 36); g.fillStyle = i % 2 ? '#80ffb0' : '#d0ffe0'; g.fillRect(x, y, 2, 2); g.fillRect(x - 1, y + 1, 4, 1); }
    } });
  }
  function popup(text, x, y, col) {
    S.fxs.push({ t: 0, life: 40, draw: function (g, f) { var yy = y - Math.min(f.t, 12) * 0.8 + (f.t > 12 ? 0 : 0); U.text(g, text, x - F.width(text) / 2, yy, col || '#fff', { outline: '#000' }); } });
  }

  /* ---------- ダメージ処理 ---------- */
  function heroDamageTo(e, base, o) {
    o = o || {};
    var dmg = base * rnd(0.88, 1.12) - e.df * (o.magic ? 0.3 : 0.55) * (e.guard ? 1.8 : 1);
    var tag = '';
    if (!o.magic && Math.random() < 0.07) { dmg *= 1.7; tag = 'crit'; }
    if (o.elem === 'fire') { if (e.def.weak === 'fire') { dmg *= 1.45; tag = tag || 'weak'; } else if (e.def.resist === 'fire') { dmg *= 0.35; tag = 'resist'; } }
    return { dmg: Math.max(1, Math.round(dmg)), tag: tag };
  }
  async function hitEnemy(e, r) {
    e.hp = Math.max(0, e.hp - r.dmg); popup(String(r.dmg), e.x, e.y + 10, r.tag === 'crit' ? '#ffe070' : '#ffffff');
    if (r.tag === 'crit') await say('かいしんの いちげき!', { hold: 12 });
    if (r.tag === 'weak') await say('こうかは ばつぐんだ!', { hold: 12 });
    if (r.tag === 'resist') await say('あまり きいていない…', { hold: 12 });
    await say(e.name + 'に ' + r.dmg + 'の ダメージ!', { hold: 18 });
    if (e.hp <= 0) await kill(e);
  }
  async function kill(e) {
    PF.sfx('die'); e.dying = true; e.dissolve = 0; e.charging = false;
    await PF.waitUntil(function () { return !e.dying; });
    await say(e.name + 'を たおした!', { hold: 16 });
  }
  function aliveEnemies() { return S.enemies.filter(function (e) { return e.alive; }); }

  /* ---------- 行動 ---------- */
  async function heroAct(a) {
    var h = S.hero, st = S.st;
    S.guarding = false;
    if (a.t === 'atk') {
      var e = a.target.alive ? a.target : aliveEnemies()[0]; if (!e) return;
      await say(h.name + 'の こうげき!', { hold: 10 }); PF.sfx('swing');
      await slashFx(e);
      var r = heroDamageTo(e, st.atk * (st.fire ? 1.05 : 1), { elem: st.fire ? 'fire' : null });
      await hitEnemy(e, r);
    } else if (a.t === 'skill') {
      var sk = PF.db.skills[a.id]; h.mp -= sk.mp;
      await say(h.name + 'は 「' + sk.name + '」を つかった!', { hold: 12 });
      if (sk.kind === 'dmg') {
        var tg = sk.target === 'all' ? aliveEnemies() : [a.target && a.target.alive ? a.target : aliveEnemies()[0]];
        await fireFx(tg);
        for (var i = 0; i < tg.length; i++) {
          var base = (sk.base + st.mag * sk.power) * (st.fire ? 1.15 : 1);
          await hitEnemy(tg[i], heroDamageTo(tg[i], base, { magic: true, elem: sk.elem }));
        }
      } else if (sk.kind === 'heal') {
        await healFx(); var amt = Math.min(st.maxHp - h.hp, Math.round(sk.base + st.mag * 1.2)); h.hp += amt; popup(String(amt), 40, 50, '#80ffb0');
        await say('HPが ' + amt + ' かいふくした!', { hold: 16 });
      } else if (sk.kind === 'buff') {
        PF.sfx('magic'); S.buff = { turns: sk.turns, def: sk.def }; await say('ぼうぎょりょくが あがった!', { hold: 16 });
      }
    } else if (a.t === 'guard') {
      S.guarding = true; await say(h.name + 'は みを まもっている。', { hold: 14 });
    } else if (a.t === 'item') {
      var it = PF.db.items[a.id]; PF.addItem(a.id, -1);
      await say(h.name + 'は ' + it.name + 'を つかった!', { hold: 10 });
      if (it.hp) { var hh = Math.min(st.maxHp - h.hp, it.hp); h.hp += hh; await healFx(); popup(String(hh), 40, 50, '#80ffb0'); }
      if (it.mp) { var mm = Math.min(st.maxMp - h.mp, it.mp); h.mp += mm; PF.sfx('heal'); }
      await say((it.hp ? 'HPが ' + Math.min(it.hp, it.hp) + ' ' : '') + (it.mp ? 'MPが ' + it.mp + ' ' : '') + 'かいふくした!', { hold: 16 });
    }
  }
  async function enemyAct(e) {
    var h = S.hero, st = S.st;
    e.guard = false;
    var acts = e.def.acts || [{ w: 1, t: 'atk' }], act;
    if (e.charging) act = { t: 'bigatk' };
    else { var tot = 0; acts.forEach(function (a) { tot += a.w; }); var r = Math.random() * tot, acc = 0; for (var i = 0; i < acts.length; i++) { acc += acts[i].w; if (r < acc) { act = acts[i]; break; } } }
    if (act.t === 'charge') { e.charging = true; await say(act.msg || e.name + 'は ちからを ためている…', { hold: 30 }); return; }
    if (act.t === 'heal') { var amt = Math.round(e.maxHp * 0.18); e.hp = Math.min(e.maxHp, e.hp + amt); PF.sfx('heal'); await say(act.msg || e.name + 'は かいふくした!', { hold: 24 }); return; }
    if (act.t === 'guard') { e.guard = true; await say(act.msg || e.name + 'は みを かためた!', { hold: 24 }); return; }
    var big = act.t === 'bigatk';
    await say(e.name + (big ? 'の はげしい こうげき!' : 'の こうげき!'), { hold: 10 });
    e.charging = false;
    var def = st.def * (S.buff ? S.buff.def : 1) * (S.guarding ? 2 : 1);
    var dmg = Math.max(1, Math.round(e.atk * (big ? (S.guarding ? 1.4 : 2.4) : 1) * rnd(0.85, 1.15) - def * 0.5));
    if (!big && Math.random() < 0.06) { dmg = 0; await say(h.name + 'は ひらりと よけた!', { hold: 18 }); return; }
    PF.sfx('hurt'); S.hshake = 14; PF.fx.shake(2, 12); PF.fx.flash('#ff4040', 0.4);
    h.hp = Math.max(0, h.hp - dmg); popup(String(dmg), 50, 36, '#ff9090');
    await say(h.name + 'は ' + dmg + 'の ダメージを うけた!', { hold: 20 });
  }

  /* ---------- 勝利・レベルアップ ---------- */
  async function victory() {
    var h = S.hero, exp = 0, gold = 0;
    S.enemies.forEach(function (e) { exp += e.def.exp; gold += e.def.gold; });
    PF.audio.stopBGM(0.2);
    var jp = PF.audio.jingle('fanfare');
    await say(h.name + 'は たたかいに しょうりした!', { hold: 30 });
    await say(exp + 'の けいけんちを えた!', { hold: 20 });
    if (gold) { PF.addGold(gold); await say(gold + 'ゴールドを てにいれた!', { hold: 20 }); }
    h.exp += exp;
    // ドロップ
    for (var i = 0; i < S.enemies.length; i++) { var d = S.enemies[i].def.drop; if (d && Math.random() < d[1]) { PF.addItem(d[0], 1); await say(PF.db.items[d[0]].name + 'を ひろった!', { hold: 20 }); } }
    await B.levelCheck(true);
    await jp;
  }
  B.levelCheck = async function (inBattle) {
    var h = PF.state.hero, st = PF.db.stats, sayf = inBattle ? say : PF.ui.say;
    while (h.lv < st.maxLv && h.exp >= st.total(h.lv + 1)) {
      var before = B.calc(h); h.lv++; var after = B.calc(h);
      h.hp = Math.min(after.maxHp, h.hp + (after.maxHp - before.maxHp)); h.mp = Math.min(after.maxMp, h.mp + (after.maxMp - before.maxMp));
      if (inBattle) { S.st = after; PF.audio.jingle('levelup'); }
      var msg = h.name + 'は レベル' + h.lv + 'に あがった!\fHP +' + (after.maxHp - before.maxHp) + '  MP +' + (after.maxMp - before.maxMp) + '\fこうげき +' + (after.atk - before.atk) + '  ぼうぎょ +' + (after.def - before.def);
      for (var i = 0; i < PF.db.learn.length; i++) { var L = PF.db.learn[i]; if (L.lv === h.lv && h.skills.indexOf(L.skill) < 0) { h.skills.push(L.skill); msg += '\f「' + PF.db.skills[L.skill].name + '」を おぼえた!'; } }
      if (inBattle) { var parts = msg.split('\f'); for (var p = 0; p < parts.length; p++) await say(parts[p], { hold: 40 }); }
      else await sayf(msg);
    }
  };

  /* ---------- メインフロー ---------- */
  B.run = async function (ids, opts) {
    opts = opts || {};
    var hero = PF.state.hero, st = B.calc(hero);
    var enemies = ids.map(function (id, i) { return newEnemy(id, i, ids.length); });
    var boss = enemies.some(function (e) { return e.def.boss; });
    S = { hero: hero, st: st, enemies: enemies, bg: opts.bg || (PF.maps.current && PF.maps.current.encounter && PF.db.encounters[PF.maps.current.encounter.table] ? PF.db.encounters[PF.maps.current.encounter.table].bg : 'plain'),
      fxs: [], t: 0, msg: null, input: null, sub: null, cmdSel: 0, hshake: 0, flashBg: 0, dispHp: hero.hp, dispMp: hero.mp, guarding: false, buff: null, noFlee: boss || !!opts.noFlee };
    if (opts.bg) S.bg = opts.bg;
    var prevBgm = PF.audio.currentBGM();
    var music = opts.music || (boss ? (enemies[0].def.bossMusic || 'boss') : 'battle');
    PF.audio.stopBGM(0.15);
    PF.sfx('warp'); PF.fx.flash('#ffffff', 1); await PF.wait(6); PF.fx.flash('#ffffff', 1);
    await PF.fx.wipe(1, 22);
    PF.scene.push(scene);
    PF.audio.playBGM(music);
    await PF.fx.wipe(0, 18);
    var result = 'win';
    if (opts.intro) await opts.intro({ say: say, S: S });
    if (boss) await say(enemies[0].name + 'が あらわれた!', { hold: 40 });
    else if (enemies.length === 1) await say(enemies[0].name + 'が あらわれた!', { hold: 26 });
    else await say(enemies[0].name + 'たちが あらわれた!', { hold: 26 });
    var turn = 0;
    while (true) {
      turn++;
      if (S.buff && --S.buff.turns < 0) { S.buff = null; }
      var cmd = await chooseCommand();
      var order = [{ who: 'hero', spd: st.spd * 1.2 + Math.random() * 3 + (cmd.t === 'guard' ? 99 : 0) }];
      aliveEnemies().forEach(function (e) { order.push({ who: e, spd: e.spd + Math.random() * 3 }); });
      order.sort(function (a, b) { return b.spd - a.spd; });
      if (cmd.t === 'flee') {
        await say(hero.name + 'は にげだした!', { hold: 10 });
        var avg = 0; aliveEnemies().forEach(function (e) { avg += e.spd; }); avg /= Math.max(1, aliveEnemies().length);
        if (Math.random() < PF.clamp(0.55 + (st.spd - avg) * 0.04, 0.25, 0.95)) { PF.sfx('flee'); await say('うまく にげきれた!', { hold: 20 }); result = 'flee'; break; }
        await say('しかし まわりこまれて しまった!', { hold: 24 });
        order = order.filter(function (o) { return o.who !== 'hero'; });
      }
      for (var i = 0; i < order.length; i++) {
        var o = order[i];
        if (o.who === 'hero') { if (cmd.t !== 'flee') await heroAct(cmd); if (!aliveEnemies().length) break; }
        else { if (!o.who.alive) continue; await enemyAct(o.who); if (hero.hp <= 0) break; }
      }
      if (!aliveEnemies().length) { result = 'win'; break; }
      if (hero.hp <= 0) { result = 'lose'; break; }
      if (opts.onTurn) { var stop = await opts.onTurn({ turn: turn, S: S, say: say }); if (stop) { result = stop; break; } }
    }
    if (result === 'win') await victory();
    else if (result === 'lose') { PF.audio.stopBGM(0.3); await say(hero.name + 'は めのまえが まっくらに なった…', { hold: 50 }); }
    S.msg = null;
    var finalEnemies = S.enemies; S = null;
    await PF.fx.wipe(1, 18);
    PF.scene.pop();
    if (result !== 'lose') { if (prevBgm) PF.audio.playBGM(prevBgm); else if (PF.maps.current && PF.maps.current.bgm) PF.audio.playBGM(PF.maps.current.bgm); }
    PF.input.clear();
    await PF.fx.wipe(0, 14);
    return result;
  };
})();
