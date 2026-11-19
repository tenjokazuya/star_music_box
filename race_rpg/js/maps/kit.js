/* マップ作成の共通部品（屋内の部屋、パーキングエリア、会話のひな形） */
(function () {
  'use strict';
  var RR = window.RR;
  var Kit = RR.MapKit = {};

  // 屋内: 上2行が壁、下1行が出口。o: {w,h,floor,wall,doorX,exit:{map,x}}
  Kit.room = function (M, o) {
    var w = o.w, h = o.h;
    M.fill('void');
    M.rect(1, 0, w - 2, 2, o.wall || 'wall');
    M.rect(1, 2, w - 2, h - 3, o.floor || 'wood');
    M.set(o.doorX, h - 1, 'mat');
    M.warp(o.doorX, h - 1, o.exit);
    M.spot('door', o.doorX, h - 2, 'up');
    M.light(o.doorX * 16 + 8, (h - 1) * 16, 24, '#f8e8c0');
  };

  // NPC の会話: 文字列の配列を順番に話す（最後は繰り返し）
  Kit.lines = function (name, list, key) {
    return async function (E) {
      var k = 'talk_' + (key || name);
      var n = E.num(k);
      var t = list[Math.min(n, list.length - 1)];
      E.addNum(k, 1);
      if (Array.isArray(t)) { for (var i = 0; i < t.length; i++) await E.say(name, t[i]); }
      else await E.say(name, t);
    };
  };
  // ランダムに一言
  Kit.random = function (name, list) {
    return async function (E) { await E.say(name, list[Math.floor(Math.random() * list.length)]); };
  };

  // 走り屋とのフリー対戦（賭け金を選べる）
  Kit.racer = function (name, raceId, o) {
    o = o || {};
    return async function (E) {
      var race = RR.Data.races[raceId];
      var rec = E.record(race.rival || raceId);
      await E.say(name, rec.w > 0 ? (o.again || 'また やるかい?') : (o.hello || 'しょうぶ するかい?'));
      var stake = race.stake;
      var c = await E.ask(name, 'かけきんは ¥' + E.U.money(stake) + ' だ。', ['しょうぶ!', 'やめておく']);
      if (c !== 0) { await E.say(name, o.no || 'いつでも こいよ。'); return; }
      if (E.money < stake) { await E.say(name, 'かけきんが たりない みたいだな。'); return; }
      var r = await E.race(raceId);
      if (r.win) await E.say(name, o.win || 'くっ... まけたよ。');
      else if (r.retire) await E.say(name, 'なんだ、やめちまうのか。');
      else await E.say(name, o.lose || 'へへ、もらって いくぜ。');
    };
  };

  // タイムアタック（はじめて達成した時だけ賞金。2回目からは少し）
  Kit.timeAttack = function (name, raceId) {
    return async function (E) {
      var race = RR.Data.races[raceId];
      var key = 'ta_' + raceId;
      await E.say(name, 'この とうげを {y}' + E.U.time(race.target) + '{w} いないで はしれたら|しょうきんを だすよ。' + (E.flag(key) ? '|2かいめ からは すこし だけど。' : ''));
      var c = await E.ask(name, 'やってみる?', ['やる', 'やめる']);
      if (c !== 0) return;
      var cfg = { prize: E.flag(key) ? 500 : race.prize };
      var r = await E.race(raceId, cfg);
      if (r.win) { E.setFlag(key); await E.say(name, 'おみごと! やくそくの しょうきんだ。'); }
      else if (!r.retire) await E.say(name, 'おしい! タイヤの ねつと ブレーキの ポイントを みなおして みな。');
    };
  };

  // パーキングエリア（峠の駐車場）o: {name, w, h, exitX, exit, fog}
  Kit.pa = function (M, o) {
    var w = o.w, h = o.h;
    M.fill('grass');
    M.border('forest', 1);
    // 谷側（上）は崖とガードレール
    M.rect(1, 1, w - 2, 2, 'rock');
    M.rect(1, 3, w - 2, 1, 'rail');
    M.rect(1, 4, w - 2, h - 6, 'road');
    // 駐車枠
    for (var x = 3; x < w - 3; x += 2) { M.set(x, 4, 'park_t'); M.set(x, 5, 'park'); }
    M.rect(1, h - 2, w - 2, 1, 'walk');
    // 出入り口の道
    M.rect(o.exitX - 1, h - 1, 3, 1, 'road');
    M.warp(o.exitX - 1, h - 1, o.exit); M.warp(o.exitX, h - 1, o.exit); M.warp(o.exitX + 1, h - 1, o.exit);
    M.spot('entry', o.exitX, h - 2, 'up');
    // トイレと自販機
    M.building(1, h - 7, 4, 4, { roof: 'gray', wall: 'white', fakeDoor: [1], noWin: true, sign: 'WC', signC: '#3858a0' });
    M.prop('vending', 5, h - 4, { c: '#c83838' }); M.prop('vending', 6, h - 4, { c: '#3060c0' });
    M.prop('trash', 7, h - 4);
    M.lamp(9, h - 3); M.lamp(w - 4, h - 3); M.lamp(Math.floor(w / 2), 6);
    M.prop('board', w - 6, h - 4);
    M.prop('bench', w - 8, h - 3);
  };
})();
