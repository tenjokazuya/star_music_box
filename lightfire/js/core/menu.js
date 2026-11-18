/* menu.js — ポーズメニュー・ショップ・宿屋・セーブ画面・設定 */
(function () {
  'use strict';
  var U = PF.ui, C = U.C, F = PF.font, W = PF.W;
  var M = PF.menu = {};

  function timeStr(sec) { sec = Math.floor(sec); var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60; return h + ':' + PF.pad2(m); }
  function heroPanel(g, x, y, w, h) {
    var s = PF.state, hr = s.hero, st = PF.battle.calc(hr);
    U.window(g, x, y, w, h);
    var sh = PF.gfx.human({ hair: '#5a3220', skin: '#f8d0a0', cloth: '#e0583a', trim: '#fff0c0', pants: '#3c4a80', boots: '#4a2c18' });
    g.drawImage(sh.d[0], x + 8, y + 8);
    U.text(g, hr.name, x + 30, y + 7, C.text); U.text(g, 'Lv' + hr.lv, x + 30, y + 19, C.hi);
    U.text(g, 'HP', x + 8, y + 36, C.red); U.textR(g, hr.hp + '/' + st.maxHp, x + w - 8, y + 36, C.text); U.bar(g, x + 8, y + 46, w - 16, hr.hp, st.maxHp, '#58d070');
    U.text(g, 'MP', x + 8, y + 50, C.blue); U.textR(g, hr.mp + '/' + st.maxMp, x + w - 8, y + 50, C.text); U.bar(g, x + 8, y + 60, w - 16, hr.mp, st.maxMp, '#58a0ff');
    U.text(g, 'つぎまで', x + 8, y + 66, C.dim); U.textR(g, String(PF.battle.nextExp(hr)), x + w - 8, y + 66, C.text);
    U.icon(g, 'coin', x + 8, y + 80); U.textR(g, s.gold + 'G', x + w - 8, y + 79, C.hi);
    U.text(g, 'じかん', x + 8, y + 92, C.dim); U.textR(g, timeStr(s.playTime), x + w - 8, y + 92, C.text);
    var m = PF.maps.current; if (m) U.textC(g, m.name, x + w / 2, y + h - 14, C.dim);
  }
  M.heroPanel = heroPanel;

  /* ---- 汎用リスト ---- */
  // o: x,y,w,rows,items:[{label,right,disabled,desc,icon}], def, cancel, footer(g,item), title
  M.list = function (o) {
    var items = o.items, rows = o.rows || 8, x = o.x === undefined ? 4 : o.x, y = o.y === undefined ? 4 : o.y, w = o.w || 232, h = rows * 12 + 12 + (o.title ? 12 : 0);
    var sel = Math.min(o.def || 0, Math.max(0, items.length - 1)), top = 0;
    var m = {
      update: function () {
        var d = PF.input.dirRepeat();
        if (items.length) {
          if (d === 'u') { sel = (sel + items.length - 1) % items.length; PF.sfx('cursor'); }
          if (d === 'd') { sel = (sel + 1) % items.length; PF.sfx('cursor'); }
          if (o.sideKeys && (d === 'l' || d === 'r')) { PF.closeModal(m, { side: d, i: sel }); return; }
          if (PF.input.pressed('a')) { if (items[sel].disabled) { PF.sfx('error'); return; } PF.sfx('ok'); PF.closeModal(m, o.sideKeys ? { side: null, i: sel } : sel); return; }
        }
        if (PF.input.pressed('b')) { PF.sfx('cancel'); PF.closeModal(m, o.sideKeys ? { side: null, i: -1 } : -1); }
        if (sel < top) top = sel; if (sel >= top + rows) top = sel - rows + 1;
      },
      draw: function (g) {
        U.window(g, x, y, w, h);
        var oy = y + 6;
        if (o.title) { U.text(g, o.title, x + 10, oy, C.hi); oy += 12; }
        for (var i = 0; i < rows && top + i < items.length; i++) {
          var it = items[top + i], yy = oy + i * 12, dis = it.disabled;
          if (it.icon) U.icon(g, it.icon, x + 16, yy + 1);
          U.text(g, it.label, x + (it.icon ? 26 : 16), yy, dis ? C.dim : (it.col || C.text));
          if (it.right) U.textR(g, it.right, x + w - 8, yy, dis ? C.dim : C.hi);
          if (top + i === sel) U.cursor(g, x + 5, yy);
        }
        if (!items.length) U.text(g, o.empty || 'なにも ない', x + 16, oy, C.dim);
        if (top > 0) F.draw(g, '▲', x + w - 14, y + 3, C.hi);
        if (top + rows < items.length) F.draw(g, '▼', x + w - 14, y + h - 12, C.hi);
        if (o.footer && items[sel]) o.footer(g, items[sel], sel);
      }
    };
    return PF.openModal(m);
  };
  function descBar(g, text) { U.window(g, 4, 118, 232, 38); if (text) F.wrap(text, 216).slice(0, 2).forEach(function (l, i) { U.text(g, l, 12, 124 + i * 12, C.text); }); }

  /* ---- トップメニュー ---- */
  var TOP = ['ステータス', 'どうぐ', 'わざ', 'そうび', 'ヒント', 'セーブ', 'せってい', 'タイトルへ'];
  function topMenu(def) {
    var sel = def || 0;
    var m = {
      update: function () {
        var d = PF.input.dirRepeat();
        if (d === 'u') { sel = (sel + TOP.length - 1) % TOP.length; PF.sfx('cursor'); }
        if (d === 'd') { sel = (sel + 1) % TOP.length; PF.sfx('cursor'); }
        if (PF.input.pressed('a')) { PF.sfx('ok'); PF.closeModal(m, sel); }
        else if (PF.input.pressed('b') || PF.input.pressed('start')) { PF.sfx('cancel'); PF.closeModal(m, -1); }
      },
      draw: function (g) {
        U.window(g, 4, 4, 92, 6 + TOP.length * 16 + 6);
        for (var i = 0; i < TOP.length; i++) { U.text(g, TOP[i], 24, 12 + i * 16, i === sel ? C.hi : C.text); if (i === sel) U.cursor(g, 11, 12 + i * 16); }
        heroPanel(g, 100, 4, 136, 152);
      }
    };
    return PF.openModal(m);
  }
  M.open = async function () {
    PF.audio.duck(true);
    var sel = 0;
    while (true) {
      var r = await topMenu(sel); if (r < 0) break; sel = r;
      if (r === 0) await statusScreen();
      else if (r === 1) await itemsScreen();
      else if (r === 2) await skillsScreen();
      else if (r === 3) await equipScreen();
      else if (r === 4) { var f = await hintScreen(); if (f) break; }
      else if (r === 5) await M.saveScreen(false);
      else if (r === 6) await M.settings();
      else if (r === 7) { var ok = await U.confirm('タイトルがめんに もどる?\nセーブしていない ぶんは きえるよ。'); if (ok) { PF.audio.duck(false); PF.game.toTitle(); throw PF.ABORT; } }
    }
    PF.audio.duck(false);
  };

  /* ---- ステータス ---- */
  function statusScreen() {
    var hr = PF.state.hero, st = PF.battle.calc(hr), I = PF.db.items;
    var m = {
      update: function () { if (PF.input.pressed('b') || PF.input.pressed('a')) { PF.sfx('cancel'); PF.closeModal(m); } },
      draw: function (g) {
        U.window(g, 4, 4, 232, 152);
        U.text(g, hr.name, 14, 12, C.text); U.text(g, 'Lv' + hr.lv, 70, 12, C.hi);
        var rows = [['HP', hr.hp + ' / ' + st.maxHp], ['MP', hr.mp + ' / ' + st.maxMp], ['こうげき', String(st.atk)], ['ぼうぎょ', String(st.def)], ['すばやさ', String(st.spd)], ['けいけんち', String(hr.exp)], ['つぎのLvまで', String(PF.battle.nextExp(hr))]];
        rows.forEach(function (r, i) { U.text(g, r[0], 14, 28 + i * 12, C.dim); U.textR(g, r[1], 120, 28 + i * 12, C.text); });
        U.text(g, 'そうび', 134, 12, C.hi);
        [['weapon', 'ぶき'], ['armor', 'ぼうぐ'], ['acc', 'かざり']].forEach(function (q, i) { U.text(g, q[1], 134, 28 + i * 24, C.dim); U.text(g, hr[q[0]] ? I[hr[q[0]]].name : '---', 142, 40 + i * 24, C.text); });
        U.text(g, 'おぼえた わざ', 14, 116, C.hi);
        U.text(g, hr.skills.length ? hr.skills.map(function (s) { return PF.db.skills[s].name; }).join(' ') : '---', 14, 130, C.text);
      }
    };
    return PF.openModal(m);
  }

  /* ---- どうぐ ---- */
  async function itemsScreen() {
    var sel = 0;
    while (true) {
      var ids = Object.keys(PF.state.items), I = PF.db.items;
      ids.sort(function (a, b) { var ta = I[a].type === 'key' ? 1 : 0, tb = I[b].type === 'key' ? 1 : 0; return ta - tb; });
      var items = ids.map(function (id) { return { label: I[id].name, icon: I[id].icon, right: I[id].type === 'key' ? '' : '×' + PF.state.items[id], desc: I[id].desc, id: id }; });
      var r = await M.list({ items: items, rows: 8, y: 4, def: sel, footer: function (g, it) { descBar(g, it.desc); }, empty: 'どうぐを もっていない' });
      if (r < 0) return; sel = r;
      var id = ids[r], it = I[id], hr = PF.state.hero, st = PF.battle.calc(hr);
      if (it.type === 'heal' || it.type === 'mp') {
        if ((it.hp && hr.hp >= st.maxHp && !it.mp) || (it.mp && !it.hp && hr.mp >= st.maxMp)) { PF.sfx('error'); await U.say('いまは つかっても いみが ない。'); continue; }
        PF.addItem(id, -1); if (it.hp) hr.hp = Math.min(st.maxHp, hr.hp + it.hp); if (it.mp) hr.mp = Math.min(st.maxMp, hr.mp + it.mp);
        PF.sfx('heal'); await U.say(hr.name + 'は ' + it.name + 'を つかった!');
      } else if (it.type === 'equip') { await doEquip(id); }
      else if (it.type === 'warp') {
        var mp = PF.maps.current, exit = mp && PF.maps.raw(mp.id).wingTo;
        if (!exit) { PF.sfx('error'); await U.say('ここでは つかえない。'); continue; }
        var ok = await U.confirm('ダンジョンの でぐちへ もどる?');
        if (ok) { PF.addItem(id, -1); PF.audio.duck(false); PF.field.run(function (g) { return g.warp(exit.map, exit.pos, 'warp'); }); throw PF.ABORT; }
      } else { await U.say(it.desc); }
    }
  }
  async function doEquip(id) {
    var hr = PF.state.hero, it = PF.db.items[id], slot = it.slot, old = hr[slot];
    PF.addItem(id, -1); if (old && old !== 'stick' && old !== 'cloth') PF.addItem(old, 1);
    hr[slot] = id; var st = PF.battle.calc(hr); hr.hp = Math.min(hr.hp, st.maxHp); hr.mp = Math.min(hr.mp, st.maxMp);
    PF.sfx('ok'); await U.say(it.name + 'を そうびした!');
  }

  /* ---- わざ ---- */
  async function skillsScreen() {
    var hr = PF.state.hero, sel = 0;
    while (true) {
      var items = hr.skills.map(function (id) { var s = PF.db.skills[id]; return { label: s.name, right: 'MP' + s.mp, desc: s.desc, id: id }; });
      var r = await M.list({ items: items, rows: 8, def: sel, footer: function (g, it) { descBar(g, it.desc); }, empty: 'まだ わざを おぼえていない' });
      if (r < 0) return; sel = r;
      var s = PF.db.skills[items[r].id], st = PF.battle.calc(hr);
      if (s.kind === 'heal') {
        if (hr.mp < s.mp) { PF.sfx('error'); await U.say('MPが たりない。'); continue; }
        if (hr.hp >= st.maxHp) { PF.sfx('error'); await U.say('いまは つかっても いみが ない。'); continue; }
        hr.mp -= s.mp; hr.hp = Math.min(st.maxHp, hr.hp + Math.round(s.base + st.mag * 1.2)); PF.sfx('heal'); await U.say(hr.name + 'の 「' + s.name + '」!\nHPが かいふくした。');
      } else await U.say('たたかいの ときに つかう わざだ。');
    }
  }

  /* ---- そうび ---- */
  async function equipScreen() {
    var hr = PF.state.hero, I = PF.db.items, slots = [['weapon', 'ぶき'], ['armor', 'ぼうぐ'], ['acc', 'かざり']], sel = 0;
    while (true) {
      var items = slots.map(function (q) { return { label: q[1], right: hr[q[0]] ? I[hr[q[0]]].name : '---', slot: q[0], desc: hr[q[0]] ? I[hr[q[0]]].desc : '' }; });
      var r = await M.list({ items: items, rows: 3, y: 4, def: sel, footer: function (g, it) { descBar(g, it.desc); } }); if (r < 0) return; sel = r;
      var slot = slots[r][0];
      var cands = Object.keys(PF.state.items).filter(function (id) { return I[id].type === 'equip' && I[id].slot === slot; });
      var cur = PF.battle.calc(hr);
      var list = cands.map(function (id) {
        var old = hr[slot]; hr[slot] = id; var n = PF.battle.calc(hr); hr[slot] = old;
        var d = (n.atk - cur.atk) ? 'こうげき ' + (n.atk - cur.atk > 0 ? '+' : '') + (n.atk - cur.atk) : (n.def - cur.def ? 'ぼうぎょ ' + (n.def - cur.def > 0 ? '+' : '') + (n.def - cur.def) : (n.maxMp - cur.maxMp ? 'MP ' + (n.maxMp - cur.maxMp > 0 ? '+' : '') + (n.maxMp - cur.maxMp) : ''));
        return { label: I[id].name, icon: I[id].icon, right: d, desc: I[id].desc, id: id };
      });
      var off = hr[slot] && hr[slot] !== 'stick' && hr[slot] !== 'cloth' ? [{ label: 'はずす', right: '', desc: 'そうびを はずす', id: null }] : [];
      var all = list.concat(off), pick = await M.list({ items: all, rows: 5, y: 40, x: 4, def: 0, footer: function (g, it) { descBar(g, it.desc); }, empty: 'そうびできる ものが ない' });
      if (pick < 0) continue;
      if (all[pick].id) await doEquip(all[pick].id);
      else { PF.addItem(hr[slot], 1); hr[slot] = null; PF.sfx('ok'); }
    }
  }

  /* ---- ヒント ---- */
  async function hintScreen() {
    var m = PF.maps.current, hint = m && m.hint, who = PF.field.hasEmber() ? 'ヒダネ' : null;
    var txt = typeof hint === 'function' ? hint() : hint;
    if (m && m.reset) {
      var c = await U.choice(['ヒントを ききたい', 'へやを やりなおす', 'やめる'], { cancel: true, x: 100, y: 60 });
      if (c === 1) { var ok = await U.confirm('このへやを さいしょから やりなおす?'); if (ok) { PF.audio.duck(false); PF.field.run(function (g) { return PF.field.resetRoom(g, true); }); throw PF.ABORT; } return false; }
      if (c !== 0) return false;
    }
    if (!txt) { await U.say(who ? 'ヒダネは ちいさく ゆれている。このへやには きになる ことは ないようだ。' : 'ここで ヒントに なりそうな ことは ない。'); return false; }
    if (who) await U.say('ヒダネの ゆらめきから、こんな ことが つたわってきた。');
    await U.say(txt); return false;
  }

  /* ---- セーブ ---- */
  M.saveScreen = async function (fromPoint) {
    var sel = 0;
    while (true) {
      var items = [];
      for (var i = 0; i < PF.save.slots; i++) {
        var inf = PF.save.info(i);
        items.push({ label: 'スロット' + (i + 1), right: inf ? 'Lv' + inf.lv + ' ' + timeStr(inf.time) : 'あき', desc: inf ? inf.place + (inf.clear ? '  クリアずみ' : '') : 'データなし' });
      }
      var r = await M.list({ items: items, rows: 3, y: 30, def: sel, title: 'どこに セーブする?', footer: function (g, it) { descBar(g, it.desc); } });
      if (r < 0) return false; sel = r;
      if (PF.save.info(r)) { var ok = await U.confirm('スロット' + (r + 1) + 'に うわがき する?'); if (!ok) continue; }
      var pl = PF.field.player;
      if (pl) { var rm = PF.maps.current.reset && PF.field.entry; PF.state.map = rm ? { id: PF.maps.current.id, x: rm.x, y: rm.y, dir: rm.dir } : { id: PF.maps.current.id, x: pl.x, y: pl.y, dir: pl.dir }; } // パズルの部屋は入口位置で保存
      PF.save.write(r); PF.audio.jingle('item'); PF.sfx('save'); await U.say('セーブしました。'); return true;
    }
  };
  M.saveOnly = function () { return M.saveScreen(true); };

  /* ---- 設定 ---- */
  M.settings = function (fromTitle) {
    var sel = 0, S = PF.settings;
    var rows = [
      { n: 'BGMの おおきさ', get: function () { return S.bgm; }, set: function (v) { S.bgm = PF.clamp(v, 0, 10); }, bar: true },
      { n: 'SEの おおきさ', get: function () { return S.sfx; }, set: function (v) { S.sfx = PF.clamp(v, 0, 10); PF.audio.setVolume(S.bgm, S.sfx); PF.sfx('ok'); }, bar: true },
      { n: 'もじの はやさ', get: function () { return S.text; }, set: function (v) { S.text = PF.clamp(v, 0, 2); }, names: ['ゆっくり', 'ふつう', 'はやい'] },
      { n: 'バイブ', get: function () { return S.vib; }, set: function (v) { S.vib = PF.clamp(v, 0, 1); }, names: ['なし', 'あり'] },
      { n: 'もどる' }
    ];
    var m = {
      update: function () {
        var d = PF.input.dirRepeat();
        if (d === 'u') { sel = (sel + rows.length - 1) % rows.length; PF.sfx('cursor'); }
        if (d === 'd') { sel = (sel + 1) % rows.length; PF.sfx('cursor'); }
        var r = rows[sel];
        if (r.get && (d === 'l' || d === 'r')) { r.set(r.get() + (d === 'r' ? 1 : -1)); PF.audio.setVolume(S.bgm, S.sfx); if (!r.bar || sel === 0) PF.sfx('cursor'); }
        if (PF.input.pressed('a')) { if (r.get && r.names) { r.set((r.get() + 1) % r.names.length); PF.sfx('cursor'); } else if (!r.get) { PF.sfx('cancel'); PF.save.saveSettings(); PF.closeModal(m); } }
        if (PF.input.pressed('b')) { PF.sfx('cancel'); PF.save.saveSettings(); PF.closeModal(m); }
      },
      draw: function (g) {
        U.window(g, 24, 20, 192, 120);
        U.textC(g, 'せってい', 120, 28, C.hi);
        rows.forEach(function (r, i) {
          var y = 46 + i * 16;
          U.text(g, r.n, 40, y, i === sel ? C.hi : C.text);
          if (i === sel) U.cursor(g, 30, y);
          if (r.bar) { for (var k = 0; k < 10; k++) { g.fillStyle = k < r.get() ? '#ffd060' : '#3a3e68'; g.fillRect(124 + k * 8, y + 2, 6, 6); } }
          else if (r.names) U.text(g, r.names[r.get()], 140, y, C.text);
        });
        U.text(g, '← → で へんこう', 60, 126, C.dim);
      }
    };
    return PF.openModal(m);
  };

  /* ---- ショップ ---- */
  M.shop = async function (id) {
    var I = PF.db.items, stock = PF.db.shops[id] || [];
    while (true) {
      await U.say('いらっしゃい! なにを おさがしかな?', 'てんいん');
      var c = await U.choice(['かう', 'うる', 'やめる'], { cancel: true });
      if (c === 0) {
        var sel = 0;
        while (true) {
          var items = stock.map(function (sid) { var it = I[sid]; return { label: it.name, icon: it.icon, right: it.price + 'G', desc: it.desc, id: sid, disabled: PF.state.gold < it.price }; });
          var r = await M.list({ items: items, rows: 6, y: 4, def: sel, title: 'もちきん ' + PF.state.gold + 'G', footer: function (g, it) { descBar(g, it.desc); } });
          if (r < 0) break; sel = r;
          var it2 = I[stock[r]];
          if (it2.type === 'equip' && (PF.state.hero[it2.slot] === stock[r] || PF.hasItem(stock[r]))) { await U.say('それは もう もっているよ。', 'てんいん'); continue; }
          PF.addGold(-it2.price); PF.addItem(stock[r], 1); PF.sfx('buy');
          await U.say(it2.name + 'を かった! ありがとう!', 'てんいん');
          if (it2.type === 'equip') { var yn = await U.confirm(it2.name + 'を そうびする?'); if (yn) await doEquip(stock[r]); }
        }
      } else if (c === 1) {
        while (true) {
          var sells = Object.keys(PF.state.items).filter(function (sid) { return I[sid].type !== 'key' && I[sid].price > 0; })
            .map(function (sid) { return { label: I[sid].name, icon: I[sid].icon, right: Math.floor(I[sid].price / 2) + 'G', desc: '×' + PF.state.items[sid], id: sid }; });
          var r2 = await M.list({ items: sells, rows: 6, y: 4, title: 'もちきん ' + PF.state.gold + 'G', footer: function (g, it) { descBar(g, it.desc); }, empty: 'うれる ものが ない' });
          if (r2 < 0) break;
          var sid2 = sells[r2].id, price = Math.floor(I[sid2].price / 2);
          var ok = await U.confirm(I[sid2].name + 'を ' + price + 'Gで うる?', 'てんいん');
          if (ok) { PF.addItem(sid2, -1); PF.addGold(price); PF.sfx('buy'); }
        }
      } else { await U.say('また きてね!', 'てんいん'); return; }
    }
  };

  /* ---- 宿屋 ---- */
  M.inn = async function (price, who) {
    who = who || 'やどのひと';
    var ok = await U.confirm('ひとばん ' + price + 'ゴールドで とまれるよ。\nとまっていく?', who);
    if (!ok) { await U.say('また きておくれ。', who); return false; }
    if (PF.state.gold < price) { PF.sfx('error'); await U.say('おかねが たりないようだね…。', who); return false; }
    PF.addGold(-price); PF.audio.stopBGM(0.3); await PF.fx.fade(1, 24);
    var hr = PF.state.hero, st = PF.battle.calc(hr); hr.hp = st.maxHp; hr.mp = st.maxMp;
    await PF.audio.jingle('inn'); await PF.fx.fade(0, 24);
    if (PF.maps.current && PF.maps.current.bgm) PF.audio.playBGM(PF.maps.current.bgm);
    await U.say('ゆっくり やすめたかな? いってらっしゃい。', who); return true;
  };
})();
