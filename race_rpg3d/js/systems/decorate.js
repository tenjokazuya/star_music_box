/* 家の模様替え。家具は S.furniture.placed = [{id, x, y}]（マップ座標）に記録し、家のマップ構築時に置かれる */
(function () {
  'use strict';
  var RR = window.RR, U = RR.U, F = RR.Font, In = RR.Input, UI = RR.UI, D = RR.Data;
  var Dec = RR.Decorate = {};
  // 家の部屋の範囲（js/maps/home/layout.js と合わせる）
  Dec.ROOM = { x0: 1, x1: 10, y0: 2, y1: 7, wallY: 1, keep: [[5, 7], [5, 8]], wallBlocked: [[2, 1], [10, 1]] };

  function S() { return RR.State.S; }
  function size(f) { return RR.Props.defs[f.prop].size(f.opts); }
  function cells(id, x, y) {
    var f = D.furniture[id], sz = size(f), out = [];
    for (var j = 0; j < sz[1]; j++) for (var i = 0; i < sz[0]; i++) out.push([x + i, y + j]);
    return out;
  }
  function itemAt(x, y) {
    var placed = S().furniture.placed;
    for (var k = placed.length - 1; k >= 0; k--) {
      var p = placed[k];
      if (cells(p.id, p.x, p.y).some(function (c) { return c[0] === x && c[1] === y; })) return k;
    }
    return -1;
  }
  function canPlace(id, x, y, ignore) {
    var f = D.furniture[id], R = Dec.ROOM;
    var cs = cells(id, x, y);
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (f.wall) {
        if (c[1] !== R.wallY || c[0] < R.x0 || c[0] > R.x1) return false;
        if (R.wallBlocked.some(function (k) { return k[0] === c[0] && k[1] === c[1]; })) return false;
      }
      else {
        if (c[0] < R.x0 || c[0] > R.x1 || c[1] < R.y0 || c[1] > R.y1) return false;
        if (R.keep.some(function (k) { return k[0] === c[0] && k[1] === c[1]; })) return false;
        var p = RR.Field.player; if (p && p.x === c[0] && p.y === c[1]) return false;
      }
    }
    var placed = S().furniture.placed;
    for (var k = 0; k < placed.length; k++) {
      if (k === ignore) continue;
      var o = D.furniture[placed[k].id];
      if (!!o.wall !== !!f.wall) continue;
      if (!!o.floor !== !!f.floor) continue; // ラグは他の家具と重ねられる
      var oc = cells(placed[k].id, placed[k].x, placed[k].y);
      for (var a = 0; a < cs.length; a++) for (var b = 0; b < oc.length; b++) if (cs[a][0] === oc[b][0] && cs[a][1] === oc[b][1]) return false;
    }
    return true;
  }
  function spare(id) { return (S().furniture.owned[id] || 0) - D.placedCount(id); }

  Dec.open = function () {
    var st = { x: 5, y: 4, mode: 'cursor', hold: null, holdIdx: -1 };
    var reload = function () { var p = RR.Field.player; RR.Field.loadMap('home', p.x, p.y, p.dir); };
    return UI.say('', 'もようがえ を します。|じゅうじキーで えらんで Aで けってい、Bで おわり。').then(function () {
      return UI.custom({
        update: function () {
          var self = this;
          if (this.wait) return;
          var R = Dec.ROOM;
          var mv = function (dx, dy) { st.x = U.clamp(st.x + dx, R.x0, R.x1); st.y = U.clamp(st.y + dy, R.wallY, R.y1); RR.Audio.sfx('cursor'); };
          if (In.repeat('left')) mv(-1, 0);
          if (In.repeat('right')) mv(1, 0);
          if (In.repeat('up')) mv(0, -1);
          if (In.repeat('down')) mv(0, 1);
          if (st.mode === 'place') {
            if (In.pressed('b')) { st.mode = 'cursor'; st.hold = null; RR.Audio.sfx('cancel'); return; }
            if (In.pressed('a')) {
              if (!canPlace(st.hold, st.x, st.y, st.holdIdx)) { RR.Audio.sfx('error'); return; }
              if (st.holdIdx >= 0) { S().furniture.placed[st.holdIdx].x = st.x; S().furniture.placed[st.holdIdx].y = st.y; }
              else S().furniture.placed.push({ id: st.hold, x: st.x, y: st.y });
              RR.Audio.sfx('place');
              st.mode = 'cursor'; st.hold = null; st.holdIdx = -1;
              reload();
            }
            return;
          }
          if (In.pressed('b')) { RR.Audio.sfx('close'); this.close(); return; }
          if (In.pressed('a')) {
            var k = itemAt(st.x, st.y);
            this.wait = true;
            if (k >= 0) {
              var pid = S().furniture.placed[k].id;
              UI.choice(['うごかす', 'しまう', 'やめる'], { x: 150, y: 8 }).then(function (c) {
                self.wait = false;
                if (c === 0) { st.mode = 'place'; st.hold = pid; st.holdIdx = k; var p0 = S().furniture.placed[k]; st.x = p0.x; st.y = p0.y; }
                else if (c === 1) { S().furniture.placed.splice(k, 1); RR.Audio.sfx('place'); reload(); }
              });
            } else {
              var list = Object.keys(S().furniture.owned).filter(function (id) { return D.furniture[id] && spare(id) > 0; });
              if (!list.length) { this.wait = false; RR.Audio.sfx('error'); UI.toast('おける ものが ない'); return; }
              var items = list.map(function (id) { return { label: D.furniture[id].name, right: 'x' + spare(id), id: id }; });
              UI.menu({
                title: 'なにを おく?', items: items, x: 8, y: 4, w: 160, rows: 6,
                drawExtra: function (g, m) {
                  var f = D.furniture[items[m.sel].id];
                  UI.win(g, 170, 4, 66, 56, 'paper');
                  var sz = size(f);
                  RR.Props.drawIcon(g, f.prop, f.opts, 203 - sz[0] * 8, 30);
                  UI.descBox(g, f.desc + (f.wall ? ' (かべに かける)' : ''));
                }
              }).then(function (i) {
                self.wait = false;
                if (i < 0) return;
                st.mode = 'place'; st.hold = items[i].id; st.holdIdx = -1;
                if (D.furniture[st.hold].wall) st.y = Dec.ROOM.wallY; else if (st.y < Dec.ROOM.y0) st.y = Dec.ROOM.y0;
              });
            }
          }
        },
        draw: function (g) {
          var F3 = RR.Field3D, blink = Math.sin(RR.Game.frame * 0.4) > 0;
          var f = st.mode === 'place' ? D.furniture[st.hold] : null;
          var sz = f ? size(f) : [1, 1];
          var wall = f ? f.wall : st.y === Dec.ROOM.wallY;
          var pts = wall
            ? [[st.x, 0.8, st.y + 1], [st.x + sz[0], 0.8, st.y + 1], [st.x + sz[0], 2.0, st.y + 1], [st.x, 2.0, st.y + 1]]
            : [[st.x, 0.1, st.y], [st.x + sz[0], 0.1, st.y], [st.x + sz[0], 0.1, st.y + sz[1]], [st.x, 0.1, st.y + sz[1]]];
          var pp = pts.map(function (q) { return F3.project(q[0], q[1], q[2]); });
          function poly() { g.beginPath(); pp.forEach(function (q, i) { if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }); g.closePath(); }
          if (st.mode === 'place') {
            var ok = canPlace(st.hold, st.x, st.y, st.holdIdx);
            var base = wall ? F3.project(st.x + sz[0] / 2, 1.4, st.y + 1) : F3.project(st.x + sz[0] / 2, 0, st.y + sz[1] * 0.8);
            g.globalAlpha = 0.85;
            RR.Props.drawIcon(g, f.prop, f.opts, base.x, base.y + (wall ? 14 : 0));
            g.globalAlpha = 0.4;
            poly(); g.fillStyle = ok ? '#40f080' : '#f84040'; g.fill();
            g.globalAlpha = 1;
            poly(); g.lineWidth = 0.8; g.strokeStyle = ok ? '#a0f8c0' : '#f8a0a0'; g.stroke();
            F.draw(g, ok ? 'Aで おく' : 'ここには おけない', 120, 148, ok ? '#a0f8c0' : '#f8a0a0', { align: 'center' });
          } else {
            poly(); g.lineWidth = 1.2; g.strokeStyle = blink ? '#f8e060' : '#f8f8f8'; g.stroke();
            g.globalAlpha = 0.18; g.fillStyle = '#f8e060'; g.fill(); g.globalAlpha = 1;
            var k = itemAt(st.x, st.y);
            if (k >= 0) F.draw(g, D.furniture[S().furniture.placed[k].id].name, 120, 148, '#f8f8f8', { align: 'center' });
          }
          F.draw(g, 'もようがえ  B:おわる', 4, 2, '#f8e060');
        }
      });
    }).then(function () {
      reload();
    });
  };
})();
