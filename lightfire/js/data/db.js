/* db.js — アイテム・技・敵・ショップなどのデータ */
(function () {
  'use strict';
  var DB = PF.db = {};

  /* ---------- アイテム ---------- */
  // type: heal / mp / equip / key / misc
  DB.items = {
    herb:    { name: 'やくそう', icon: 'herb', type: 'heal', hp: 30, price: 12, desc: 'HPを 30 かいふくする' },
    herb2:   { name: 'こいやくそう', icon: 'herb', type: 'heal', hp: 80, price: 40, desc: 'HPを 80 かいふくする' },
    herb3:   { name: 'せいなるくさ', icon: 'herb', type: 'heal', hp: 200, price: 120, desc: 'HPを 200 かいふくする' },
    tea:     { name: 'ひなたちゃ', icon: 'potion2', type: 'mp', mp: 12, price: 30, desc: 'MPを 12 かいふくする' },
    tea2:    { name: 'こいちゃ', icon: 'potion2', type: 'mp', mp: 40, price: 90, desc: 'MPを 40 かいふくする' },
    bread:   { name: 'やきたてパン', icon: 'bread', type: 'heal', hp: 50, mp: 5, price: 25, desc: 'HP50とMP5を かいふくする' },
    wing:    { name: 'かえりのはね', icon: 'wing', type: 'warp', price: 60, desc: 'ダンジョンから でぐちへ もどる' },
    // 武器
    stick:   { name: 'きのぼう', icon: 'sword', type: 'equip', slot: 'weapon', atk: 1, price: 0, desc: 'こうげき +1' },
    rustsw:  { name: 'さびたけん', icon: 'sword', type: 'equip', slot: 'weapon', atk: 4, price: 80, desc: 'こうげき +4' },
    ironsw:  { name: 'てつのけん', icon: 'sword', type: 'equip', slot: 'weapon', atk: 9, price: 240, desc: 'こうげき +9' },
    steelsw: { name: 'はがねのけん', icon: 'sword', type: 'equip', slot: 'weapon', atk: 15, price: 620, desc: 'こうげき +15' },
    firesw:  { name: 'ほのおのけん', icon: 'sword', type: 'equip', slot: 'weapon', atk: 22, fire: true, price: 0, desc: 'こうげき +22 ほのおを まとう' },
    emsw:    { name: 'ひだねのけん', icon: 'sword', type: 'equip', slot: 'weapon', atk: 32, fire: true, price: 0, desc: 'こうげき +32 ほのおを まとう' },
    // 防具
    cloth:   { name: 'ぬののふく', icon: 'armor', type: 'equip', slot: 'armor', def: 1, price: 0, desc: 'ぼうぎょ +1' },
    leather: { name: 'かわのふく', icon: 'armor', type: 'equip', slot: 'armor', def: 4, price: 90, desc: 'ぼうぎょ +4' },
    chain:   { name: 'くさりかたびら', icon: 'armor', type: 'equip', slot: 'armor', def: 8, price: 280, desc: 'ぼうぎょ +8' },
    plate:   { name: 'てつのよろい', icon: 'armor', type: 'equip', slot: 'armor', def: 14, price: 700, desc: 'ぼうぎょ +14' },
    warmcoat:{ name: 'あったかコート', icon: 'armor', type: 'equip', slot: 'armor', def: 11, price: 0, desc: 'ぼうぎょ +11 こおりに つよい' },
    ashrobe: { name: 'ひのけごろも', icon: 'armor', type: 'equip', slot: 'armor', def: 18, price: 0, desc: 'ぼうぎょ +18' },
    // 装飾
    ring1:   { name: 'ちからのゆびわ', icon: 'ring', type: 'equip', slot: 'acc', atk: 3, price: 150, desc: 'こうげき +3' },
    ring2:   { name: 'まもりのゆびわ', icon: 'ring', type: 'equip', slot: 'acc', def: 3, price: 150, desc: 'ぼうぎょ +3' },
    charm:   { name: 'ひのおまもり', icon: 'fire', type: 'equip', slot: 'acc', mp: 10, price: 0, desc: 'さいだいMP +10' },
    // 大事なもの
    lamp:    { name: 'ともしびランプ', icon: 'lamp', type: 'key', desc: 'ヒダネが やどる ちいさな ランプ' },
    stone1:  { name: 'ひだねのいし', icon: 'orb', type: 'key', desc: 'ほらあなで ひろった あたたかい いし' },
    stone2:  { name: 'しおかぜのいし', icon: 'gem', type: 'key', desc: 'とうだいで ひかる いし' },
    stone3:  { name: 'ふぶきのいし', icon: 'snow', type: 'key', desc: 'ほこらで ねむっていた いし' },
    stone4:  { name: 'ようがんのいし', icon: 'fire', type: 'key', desc: 'かざんの おくで あつく もえる いし' },
    key2:    { name: 'とうだいのかぎ', icon: 'key', type: 'key', desc: 'さびた かぎ' },
  };

  /* ---------- 技 ---------- */
  // kind: dmg / heal / buff ; target: one / all ; elem: fire
  DB.skills = {
    flame:   { name: 'ほのお', mp: 4, kind: 'dmg', power: 1.6, base: 8, elem: 'fire', target: 'one', desc: 'ほのおで こうげき', fx: 'fire' },
    sunny:   { name: 'ひだまり', mp: 5, kind: 'heal', power: 1.0, base: 30, target: 'self', desc: 'HPを かいふくする', fx: 'heal' },
    guard:   { name: 'ひのこのたて', mp: 6, kind: 'buff', turns: 3, def: 2.0, target: 'self', desc: '3ターン ぼうぎょが あがる', fx: 'buff' },
    dance:   { name: 'ほのおのまい', mp: 10, kind: 'dmg', power: 1.2, base: 10, elem: 'fire', target: 'all', desc: 'ほのおで ぜんたいを こうげき', fx: 'fire' },
    heal2:   { name: 'いやしのひ', mp: 14, kind: 'heal', power: 1.0, base: 120, target: 'self', desc: 'HPを おおきく かいふくする', fx: 'heal' },
    great:   { name: 'おおび', mp: 26, kind: 'dmg', power: 2.6, base: 40, elem: 'fire', target: 'all', desc: 'おおきな ほのおで ぜんたいを やく', fx: 'fire' }
  };
  // 習得: 技ID → レベル（flame は ヒダネ加入、他はレベル）
  DB.learn = [{ skill: 'sunny', lv: 3 }, { skill: 'guard', lv: 6 }, { skill: 'dance', lv: 9 }, { skill: 'heal2', lv: 13 }, { skill: 'great', lv: 19 }];

  /* ---------- 成長 ---------- */
  DB.stats = {
    maxHp: function (lv) { return Math.floor(24 + lv * 8 + lv * lv * 0.18); },
    maxMp: function (lv) { return 6 + lv * 3 + Math.floor(lv / 3); },
    atk: function (lv) { return 4 + lv * 2; },
    def: function (lv) { return 2 + Math.floor(lv * 1.3); },
    spd: function (lv) { return 6 + lv; },
    total: function (lv) { return lv <= 1 ? 0 : Math.round(6 * Math.pow(lv - 1, 2.2)); },
    maxLv: 40
  };

  /* ---------- 敵 ---------- */
  // hp atk def spd exp gold weak:'fire' resist:'fire' ; acts: 行動パターン
  function E(id, name, o) { o.id = id; o.name = name; DB.enemies[id] = o; }
  DB.enemies = {};
  E('chibikage', 'ちびかげ', { sprite: 'chibikage', hp: 14, atk: 6, def: 1, spd: 6, exp: 5, gold: 4, weak: 'fire' });
  E('komori', 'こうもり', { sprite: 'komori', hp: 12, atk: 7, def: 1, spd: 10, exp: 5, gold: 5 });
  E('kinoko', 'おばけキノコ', { sprite: 'kinoko', hp: 20, atk: 7, def: 2, spd: 4, exp: 7, gold: 6, weak: 'fire' });
  E('ookage', 'おおかげ', { sprite: 'ookage', boss: true, hp: 150, atk: 13, def: 3, spd: 7, exp: 70, gold: 60, weak: 'fire',
    acts: [{ w: 3, t: 'atk' }, { w: 1, t: 'charge', msg: 'おおかげは ちからを ためている…' }], bossMusic: 'boss' });
  E('yadokari', 'ヤドカリ', { sprite: 'yadokari', hp: 34, atk: 12, def: 6, spd: 5, exp: 12, gold: 10 });
  E('mizudama', 'みずだま', { sprite: 'mizudama', hp: 30, atk: 12, def: 3, spd: 7, exp: 11, gold: 9, weak: 'fire' });
  E('hitode', 'ヒトデ', { sprite: 'hitode', hp: 28, atk: 14, def: 4, spd: 8, exp: 12, gold: 10 });
  E('funayurei', 'ふなゆうれい', { sprite: 'funayurei', hp: 40, atk: 15, def: 4, spd: 8, exp: 16, gold: 14, weak: 'fire' });
  E('shizuku', 'しずくのヌシ', { sprite: 'shizuku', boss: true, hp: 380, atk: 24, def: 6, spd: 8, exp: 170, gold: 150, weak: 'fire',
    acts: [{ w: 3, t: 'atk' }, { w: 1, t: 'heal', msg: 'ヌシは しずくを あつめている…' }, { w: 1, t: 'charge', msg: 'ヌシが おおきく なみを よびよせる!' }], bossMusic: 'boss' });
  E('yukidaruma', 'ゆきだるま', { sprite: 'yukidaruma', hp: 60, atk: 20, def: 8, spd: 6, exp: 28, gold: 20, weak: 'fire' });
  E('koorislime', 'こおりスライム', { sprite: 'koorislime', hp: 54, atk: 21, def: 7, spd: 8, exp: 27, gold: 18, weak: 'fire' });
  E('fubukidori', 'ふぶきどり', { sprite: 'fubukidori', hp: 48, atk: 23, def: 6, spd: 14, exp: 30, gold: 22 });
  E('tsurara', 'ツララおばけ', { sprite: 'tsurara', hp: 66, atk: 24, def: 10, spd: 7, exp: 34, gold: 24, weak: 'fire' });
  E('koorikishi', 'こおりのきし', { sprite: 'koorikishi', boss: true, hp: 700, atk: 36, def: 12, spd: 10, exp: 360, gold: 280, weak: 'fire',
    acts: [{ w: 3, t: 'atk' }, { w: 1, t: 'charge', msg: 'きしが やりを ふりかぶる!' }, { w: 1, t: 'guard', msg: 'きしは かたい ぼうぎょを とった' }], bossMusic: 'boss' });
  E('honootokage', 'ほのおトカゲ', { sprite: 'honootokage', hp: 90, atk: 32, def: 12, spd: 10, exp: 50, gold: 36, resist: 'fire' });
  E('magmaslime', 'マグマスライム', { sprite: 'magmaslime', hp: 100, atk: 30, def: 10, spd: 7, exp: 52, gold: 38, resist: 'fire' });
  E('iwagoro', 'いわゴロ', { sprite: 'iwagoro', hp: 130, atk: 36, def: 20, spd: 4, exp: 62, gold: 44 });
  E('hinotama', 'ひのたま', { sprite: 'hinotama', hp: 80, atk: 34, def: 8, spd: 13, exp: 56, gold: 40, resist: 'fire' });
  E('yogangolem', 'ようがんゴーレム', { sprite: 'yogangolem', boss: true, hp: 900, atk: 44, def: 18, spd: 8, exp: 600, gold: 400,
    acts: [{ w: 3, t: 'atk' }, { w: 2, t: 'charge', msg: 'ゴーレムの からだが あかく かがやく!' }], bossMusic: 'boss' });
  E('kagekishi', 'かげのきし', { sprite: 'kagekishi', hp: 150, atk: 48, def: 18, spd: 11, exp: 90, gold: 60, weak: 'fire' });
  E('yurei', 'さまようかげ', { sprite: 'yurei', hp: 110, atk: 46, def: 10, spd: 12, exp: 84, gold: 56, weak: 'fire' });
  E('kogoeta', 'こごえたひとかげ', { sprite: 'kogoeta', hp: 170, atk: 50, def: 20, spd: 7, exp: 96, gold: 64, weak: 'fire' });
  E('fuyunokage', 'ふゆのかげ', { sprite: 'fuyunokage', boss: true, final: true, hp: 1300, atk: 54, def: 22, spd: 12, exp: 0, gold: 0, weak: 'fire',
    acts: [{ w: 3, t: 'atk' }, { w: 2, t: 'charge', msg: 'ふゆのかげが こごえる ふぶきを まきおこす!' }, { w: 1, t: 'heal', msg: 'ふゆのかげは やみを すいこんでいる…' }], bossMusic: 'finalboss' });
  E('furuki', 'ふるきひのかげ', { sprite: 'furuki', boss: true, hp: 2000, atk: 62, def: 24, spd: 14, exp: 2000, gold: 2000,
    acts: [{ w: 3, t: 'atk' }, { w: 2, t: 'charge', msg: 'ふるきひの かげが ほのおを あつめている!' }], bossMusic: 'boss' });

  /* ---------- エンカウント表 ---------- */
  DB.encounters = {
    forest: { rate: 0.11, bg: 'forest', list: [['chibikage', 4], ['komori', 3], ['kinoko', 2]], max: 2 },
    cave1: { rate: 0.12, bg: 'cave', list: [['chibikage', 3], ['komori', 4], ['kinoko', 2]], max: 2 },
    port: { rate: 0.10, bg: 'port', list: [['yadokari', 3], ['mizudama', 4], ['hitode', 2]], max: 2 },
    lighthouse: { rate: 0.12, bg: 'lighthouse', list: [['mizudama', 3], ['hitode', 3], ['funayurei', 3]], max: 3 },
    snow: { rate: 0.10, bg: 'snow', list: [['yukidaruma', 3], ['koorislime', 3], ['fubukidori', 3]], max: 2 },
    ice: { rate: 0.12, bg: 'ice', list: [['koorislime', 3], ['tsurara', 3], ['fubukidori', 2]], max: 3 },
    volcano: { rate: 0.12, bg: 'volcano', list: [['honootokage', 3], ['magmaslime', 3], ['hinotama', 2], ['iwagoro', 2]], max: 3 },
    tower: { rate: 0.12, bg: 'tower', list: [['kagekishi', 3], ['yurei', 3], ['kogoeta', 2]], max: 3 },
    field: { rate: 0.07, bg: 'plain', list: [['chibikage', 3], ['komori', 2]], max: 2 },
    ruins: { rate: 0.12, bg: 'tower', list: [['kagekishi', 2], ['yurei', 2], ['kogoeta', 2], ['hinotama', 1]], max: 3 }
  };

  /* ---------- ショップ ---------- */
  DB.shops = {
    kotori: ['herb', 'tea', 'bread', 'rustsw', 'leather'],
    nagi: ['herb', 'herb2', 'tea', 'bread', 'ironsw', 'chain', 'ring1', 'wing'],
    yukisato: ['herb2', 'tea', 'tea2', 'bread', 'steelsw', 'plate', 'ring2', 'wing'],
    kazan: ['herb2', 'herb3', 'tea2', 'wing']
  };
})();
