/* 起動とメインループ。 */
(function (RP) {
  'use strict';

  var canvas = document.getElementById('screen');
  RP.gfx.init(canvas);
  RP.input.init(canvas);
  RP.input.onFirstGesture = function () { if (!RP.audio.running()) { RP.audio.unlock(); } };

  // 頻出文字を先に焼いておく（初回描画のカクつき防止）
  RP.text.warm('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:.,+-/%¥!?()[]<>※ ' +
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' +
    'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽっゃゅょぁぃぅぇぉ' +
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンー' +
    'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポッャュョ・、。「」～…');

  var last = performance.now();
  var fpsAcc = 0, fpsN = 0, dbgCount = 0;
  RP.fps = 60;

  // 1フレーム分の更新と描画。検証用に RP.tick として公開（バックグラウンドでrAFが止まる環境でも時間を進められる）
  function tick(dt, draw) {
    try {
      if (autoOn) { autoplay(dt); }
      RP.input.update(dt);
      var ts = RP.fx.timeScale();
      RP.fx.update(dt);
      RP.audio.update(dt);
      RP.scene.update(dt * ts);
      if (draw !== false) {
        RP.scene.draw();
        if (RP.debug) {
          fpsAcc += dt; fpsN++;
          // ヘッドレス検証用：タイトルにエラー数と現在のシーンを出す（--dump-dom で読める）
          if (++dbgCount % 20 === 0) { document.title = 'RP err=' + RP.log.errorCount() + ' scene=' + RP.scene.name() + ' fps=' + RP.fps; }
          if (fpsAcc >= 0.5) { RP.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
          RP.text.draw(RP.fps + 'fps', RP.W - 2, 15, 'lime', { align: 'r', outline: 'ink', size: 10 });
        }
      }
    } catch (e) {
      RP.log.error('フレーム処理で例外', e);
    }
  }
  RP.tick = tick;

  // 開発用の自動プレイ（?bot=1）：営業はボットが遊び、精算・朝メニューは自動で進める（ヘッドレスの通し検証用）
  var botSvc = null, bot = null, botT = 0;
  function autoplay(dt) {
    var sc = RP.scene.name();
    botT += dt;
    if (sc === 'service' && RP.dbg && RP.dbg.svc) {
      if (botSvc !== RP.dbg.svc) { botSvc = RP.dbg.svc; bot = RP.makeBot(RP, botSvc, { skill: 0.8, react: 0.5 }); }
      if (RP.dbg.state() === 'play') { bot.act(dt); }
    } else if (botT > 0.8) {
      botT = 0;
      if (sc === 'result') { RP.input.inject(190, 100); }
      else if (sc === 'morning') { RP.input.inject(100, 115); }
      else if (sc === 'boot') { RP.input.inject(190, 100); }
    }
  }
  var autoOn = RP.debug && RP.query('bot') === '1';
  // 指定秒数ぶん（30Hz）進める。最後のフレームだけ描画する
  RP.advance = function (sec) {
    var n = Math.max(1, Math.round(sec * 30));
    for (var i = 0; i < n; i++) { tick(1 / 30, i === n - 1); }
  };

  function frame(now) {
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    tick(dt, true);
    requestAnimationFrame(frame);
  }

  RP.game.loadSettings();
  var startScene = RP.query('scene') || 'boot';
  var startArgs = {};
  if (RP.query('setup')) { startArgs.debug = RP.query('setup'); }
  // 開発用：本編シーンを直接開く場合はセーブを読むか新規状態を作る（?fresh=1 で常に新規）
  if (['boot', 'title', 'sheet', 'opening', 'howto'].indexOf(startScene) < 0) {
    if (RP.query('fresh') === '1' || !RP.game.load()) { RP.game.newGame(); }
    if (startArgs.debug) { RP.game.debugSetup(startArgs.debug); delete startArgs.debug; }
  }
  RP.scene.go(startScene, startArgs, { trans: 'none' });
  requestAnimationFrame(frame);
})(window.RP);
