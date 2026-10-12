(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * 音の監督: 画面の場面（タイトル・選択・プレイ…）に合わせて、BGM と環境音を切り替え、効果音とジングルを鳴らす。
   * Sound（窓口）に登録され、ユーザー操作の後（Audio.ensure でエンジンができたとき）に attach される。
   * エンジンができる前の要求は、最後の場面と設定だけを覚えておいて、attach 後に反映する。
   */

  var CONFIG = {
    MUSIC_TICK_MS: 30,        // BGM の先読み予約の間隔
    MUSIC_AHEAD: 0.35,        // BGM をどれだけ先まで予約するか(秒)
    AMB_TICK_MS: 250,         // 環境音の単発音の予約の間隔
    AMB_AHEAD: 1.2,
    DUCK_BGM: 0.3,            // ジングル中の BGM の音量（倍率）
    DUCK_AMB: 0.6,            // ジングル中の環境音の音量（倍率）
  };

  /** 場面ごとの BGM・環境音・層のバランス */
  var SCENES = {
    boot: { song: null, amb: 'night' },
    title: { song: 'title', amb: 'night' },
    select: { song: 'w', amb: 'w', mix: { melody: 0.85, perc: 0, bass: 0.6 } },
    play: { song: 'w', amb: 'w', mix: {} },
    worldclear: { song: 'w', amb: 'w', mix: { perc: 0.6 } },
    ending: { song: 'ending', amb: 'dawn' },
  };

  function create() {
    var Sfx = Orgel.Sfx;
    var Ambience = Orgel.Ambience;
    var Music = Orgel.Music;
    var d = { engine: null };
    var sfxMod = null;
    var ambMod = null;
    var musicMod = null;
    var timers = [];
    var pendingScene = null;
    var pendingSettings = null;
    var world = 1;

    /** エンジンができたら呼ばれる（ユーザー操作の中で） */
    d.attach = function (engine) {
      if (d.engine === engine) return;
      d.engine = engine;
      sfxMod = Sfx.create(engine);
      ambMod = Ambience.create(engine);
      musicMod = Music.create(engine);
      timers.push(root.setInterval(function () { musicMod.advance(engine.ctx.currentTime + CONFIG.MUSIC_AHEAD); }, CONFIG.MUSIC_TICK_MS));
      timers.push(root.setInterval(function () { ambMod.advance(engine.ctx.currentTime + CONFIG.AMB_AHEAD); }, CONFIG.AMB_TICK_MS));
      if (pendingSettings) d.applySettings(pendingSettings);
      if (pendingScene) d.scene(pendingScene.name, pendingScene.world);
    };

    d.sfx = function (id, opts) {
      if (!sfxMod) return;
      sfxMod.play(id, opts);
    };

    /** 場面を切り替える。同じ曲・同じ環境音なら、そのまま続ける（層のバランスだけ変える） */
    d.scene = function (name, w) {
      pendingScene = { name: name, world: w };
      if (!d.engine) return;
      var def = SCENES[name] || SCENES.title;
      world = w || 1;
      if (sfxMod) sfxMod.setWorld(name === 'title' ? 'title' : (name === 'ending' ? 'ending' : world));
      var song = def.song === 'w' ? 'w' + world : def.song;
      var amb = def.amb === 'w' ? 'w' + world : def.amb;
      if (song) musicMod.start(song, { mix: def.mix || {} });
      else musicMod.stop(1);
      if (amb) ambMod.start(amb);
    };

    /** ジングルを鳴らす。その間 BGM と環境音を下げ、終わったらゆっくり戻す */
    d.jingle = function (id, opts) {
      if (!sfxMod) return;
      var len = sfxMod.jingle(id, opts);
      d.engine.duck('bgm', CONFIG.DUCK_BGM, 0.05, Math.max(0.3, len * 0.7), 0.9);
      d.engine.duck('amb', CONFIG.DUCK_AMB, 0.05, Math.max(0.3, len * 0.5), 0.9);
    };

    /** セーブデータの設定（音量・ミュート）を反映する */
    d.applySettings = function (s) {
      pendingSettings = s;
      if (!d.engine) return;
      d.engine.setVolume('bgm', s.bgm);
      d.engine.setVolume('sfx', s.sfx);
      d.engine.setVolume('amb', s.amb);
      d.engine.setVolume('master', s.master);
      d.engine.setMuted(s.muted);
    };

    d.stop = function () {
      timers.forEach(root.clearInterval);
      timers = [];
    };

    return d;
  }

  var Director = { CONFIG: CONFIG, SCENES: SCENES, create: create };

  Orgel.Director = Director;
  if (Orgel.Sound) Orgel.Sound.register(create());
  if (typeof module !== 'undefined' && module.exports) { module.exports = Director; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
