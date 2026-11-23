/* 家具・置物（家の模様替え用）。prop は js/field/props.js の種類、wall:true は壁に掛けるもの */
(function () {
  'use strict';
  var RR = window.RR;
  var D = RR.Data = RR.Data || {};
  function f(id, name, price, prop, opts, o) {
    o = o || {};
    D.furniture[id] = { id: id, name: name, price: price, prop: prop, opts: opts || {}, wall: !!o.wall, floor: !!o.floor, shop: o.shop !== false, desc: o.desc || '' };
  }
  D.furniture = {};
  // ---- はじめから持っているもの ----
  f('bed', 'ベッド', 0, 'bed', { c: '#4868b8' }, { shop: false });
  f('desk_pc', 'つくえと パソコン', 0, 'desk', { pc: true }, { shop: false });
  f('shelf_book', 'ほんだな', 0, 'bookshelf', {}, { shop: false });
  f('clock', 'かけどけい', 0, 'clock', {}, { wall: true, shop: false });
  // ---- ざっか屋 ----
  f('sofa_red', 'あかい ソファ', 6000, 'sofa', { c: '#a04848' }, { desc: 'ふかふかの 2にんがけ' });
  f('sofa_blue', 'あおい ソファ', 6500, 'sofa', { c: '#405898' }, { desc: 'おちついた いろの ソファ' });
  f('tv', 'テレビ', 8000, 'tv', {}, { desc: 'レースの ビデオも みられる' });
  f('plant', 'かんようしょくぶつ', 1500, 'plant', {}, { desc: 'へやに みどりを' });
  f('rug_red', 'ラグ (あか)', 2000, 'rug', { c: '#c05050' }, { floor: true, desc: 'あしもとが あたたかい' });
  f('rug_blue', 'ラグ (あお)', 2000, 'rug', { c: '#4060a8' }, { floor: true, desc: 'すずしげな ラグ' });
  f('table', 'テーブル', 3000, 'table', {}, { desc: 'ふつうの テーブル' });
  f('kotatsu', 'こたつ', 5000, 'kotatsu', {}, { desc: 'いちど はいると でられない' });
  f('lamp', 'スタンド ライト', 2500, 'lamp_in', {}, { desc: 'へやが あたたかい ひかりに' });
  f('chair', 'いす', 1200, 'chair', {}, { desc: 'きの いす' });
  f('bookshelf2', 'ほんだな (くるまの ほん)', 3500, 'bookshelf', {}, { desc: 'くるまの ざっしで いっぱい' });
  f('poster_race', 'ポスター (レース)', 1000, 'poster', { c: '#e85848' }, { wall: true, desc: 'あついレースの ポスター' });
  f('poster_car', 'ポスター (くるま)', 1000, 'poster', { c: '#4878d8' }, { wall: true, desc: 'あこがれの くるま' });
  f('poster_sea', 'ポスター (うみ)', 1000, 'poster', { c: '#48b8a8' }, { wall: true, desc: 'いつか いきたい うみ' });
  f('neon', 'ネオン サイン', 12000, 'neon', {}, { wall: true, desc: 'よるに ひかる かべの かざり' });
  f('arcade', 'ゲームき', 15000, 'arcade', {}, { desc: 'むかしの レースゲーム' });
  f('aquarium', 'すいそう', 9000, 'aquarium', {}, { desc: 'ちいさな さかなが およぐ' });
  f('tires', 'タイヤの オブジェ', 2000, 'tires', {}, { desc: 'つかいおわった タイヤを つんだ' });
  f('minicar', 'ミニカーの たな', 4000, 'shelf', { goods: ['#e83030', '#3060e0', '#f0f0f0', '#202028', '#e8c030', '#30a050'] }, { desc: 'ミニカーが ならんでいる' });
  f('fridge', 'れいぞうこ', 7000, 'fridge', {}, { desc: 'のみものを ひやして おける' });
  // ---- トロフィー（ライバルに勝つと もらえる） ----
  f('trophy_kenta', 'ウラヤマの トロフィー', 0, 'trophy', { c: '#b87840' }, { shop: false, desc: 'はじめての しょうり' });
  f('sticker_saki', 'サキの ステッカー', 0, 'poster', { c: '#202028', sticker: true }, { wall: true, shop: false, desc: 'ツヅラの かしらが くれた' });
  f('trophy_saki', 'ツヅラの トロフィー', 0, 'trophy', { c: '#a8b0c0' }, { shop: false, desc: 'ヘアピンを せいした あかし' });
  f('trophy_gou', 'ヘビノセの トロフィー', 0, 'trophy', { c: '#d0a030' }, { shop: false, desc: 'パワーに まけなかった' });
  f('trophy_shinobu', 'キリガタニの トロフィー', 0, 'trophy', { c: '#80b0d0' }, { shop: false, desc: 'きりを ぬけた' });
  f('trophy_kurosawa', 'ヤシャの トロフィー', 0, 'trophy', { c: '#f8d040', big: true }, { shop: false, desc: 'とうげの ヌシに かった' });
  f('helmet', 'じいちゃんの ヘルメット', 0, 'helmet', {}, { shop: false, desc: 'しろい カゲから うけとった' });
  f('photo', 'みんなの しゃしん', 0, 'photo', {}, { wall: true, shop: false, desc: 'よあけの ヤシャで とった' });
  D.furnitureShopList = Object.keys(D.furniture).filter(function (k) { return D.furniture[k].shop; });
})();
