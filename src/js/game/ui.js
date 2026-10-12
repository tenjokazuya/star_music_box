(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});

  /**
   * UI: DOM画面の切り替え・オーバーレイ・キーボードでの移動・各画面の中身の描画。
   * ゲームの流れ（どの画面に行くか）は App が決め、ここは表示と操作の部品に徹する。
   *   var ui = UI.create(document);
   *   ui.showScreen('title');  ui.openOverlay('pause');  ui.toast('...');
   */

  var CONFIG = {
    SCREEN_FADE_MS: 220,
    STAR_STAGGER_MS: 420,   // クリア画面で★が1つずつ点灯する間隔
    TOAST_MS: 2200,
  };

  var SCREENS = ['boot', 'title', 'select', 'play', 'worldclear', 'ending'];
  var OVERLAYS = ['pause', 'clear', 'settings', 'help', 'confirm'];

  var STAR_PATH = 'M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.3 5.8 21.1l1.6-7L2 9.3l7.1-.7z';
  var LOCK_PATH = 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z';

  function create(doc) {
    var Text = Orgel.Text;
    var Sprites = Orgel.Sprites;
    var ui = { screen: null, onToastHidden: null };
    var screens = {};
    var overlays = {};
    var overlayStack = [];
    var toastTimer = 0;
    var starTimers = [];
    var confirmYesReset = function () {};

    function $(id) { return doc.getElementById(id); }

    SCREENS.forEach(function (n) { screens[n] = $('screen-' + n); });
    OVERLAYS.forEach(function (n) { overlays[n] = $('overlay-' + n); });

    function lookup(path) {
      var v = Text;
      path.split('.').forEach(function (k) { v = v == null ? v : v[k]; });
      return v;
    }

    /** data-t 属性を持つ要素に text.js の文言を入れる */
    ui.bindText = function () {
      var els = doc.querySelectorAll('[data-t]');
      for (var i = 0; i < els.length; i++) {
        var v = lookup(els[i].getAttribute('data-t'));
        if (typeof v === 'string') els[i].textContent = v;
      }
    };

    // -----------------------------------------------------------------------
    // 画面・オーバーレイ
    // -----------------------------------------------------------------------

    ui.showScreen = function (name) {
      var cur = ui.screen && screens[ui.screen];
      var next = screens[name];
      if (cur && cur !== next) {
        cur.classList.remove('is-active');
        cur.classList.add('is-leaving');
        root.setTimeout(function () { cur.classList.remove('is-leaving'); }, CONFIG.SCREEN_FADE_MS);
      }
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      ui.screen = name;
      // 前の画面のボタンにフォーカスが残らないようにする
      if (doc.activeElement && doc.activeElement !== doc.body) doc.activeElement.blur();
    };

    ui.openOverlay = function (name) {
      var el = overlays[name];
      if (!el) return;
      var at = overlayStack.indexOf(name);
      if (at >= 0) overlayStack.splice(at, 1);
      overlayStack.push(name);
      el.classList.add('is-open');
    };

    ui.closeOverlay = function (name) {
      var el = overlays[name];
      if (!el) return;
      if (name === 'confirm') confirmYesReset();
      el.classList.remove('is-open');
      var at = overlayStack.indexOf(name);
      if (at >= 0) overlayStack.splice(at, 1);
      if (doc.activeElement && el.contains(doc.activeElement)) doc.activeElement.blur();
    };

    ui.closeAllOverlays = function () {
      overlayStack.slice().forEach(ui.closeOverlay);
    };

    /** いちばん手前に開いているオーバーレイの名前（なければ null） */
    ui.topOverlay = function () {
      return overlayStack.length ? overlayStack[overlayStack.length - 1] : null;
    };

    ui.toast = function (text, ms) {
      var el = $('toast');
      el.textContent = text;
      el.classList.add('is-show');
      root.clearTimeout(toastTimer);
      toastTimer = root.setTimeout(function () { el.classList.remove('is-show'); }, ms || CONFIG.TOAST_MS);
    };

    // -----------------------------------------------------------------------
    // キーボードでの移動（矢印キー／Tab）
    // -----------------------------------------------------------------------

    function focusables(container) {
      var list = container.querySelectorAll('button, input, [data-nav]');
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (el.disabled || el.hidden || el.offsetParent === null) continue;
        if (el.type === 'hidden') continue;
        out.push(el);
      }
      return out;
    }

    function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

    /** 方向キーで、いちばん近い要素へフォーカスを移す */
    function navigate(container, key) {
      var els = focusables(container);
      if (!els.length) return false;
      var cur = doc.activeElement;
      if (els.indexOf(cur) < 0) { els[0].focus(); return true; }
      var c0 = center(cur.getBoundingClientRect());
      var best = null;
      var bestScore = Infinity;
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el === cur) continue;
        var c1 = center(el.getBoundingClientRect());
        var dx = c1.x - c0.x;
        var dy = c1.y - c0.y;
        var primary, secondary;
        if (key === 'ArrowDown') { if (dy <= 4) continue; primary = dy; secondary = Math.abs(dx); }
        else if (key === 'ArrowUp') { if (dy >= -4) continue; primary = -dy; secondary = Math.abs(dx); }
        else if (key === 'ArrowRight') { if (dx <= 4) continue; primary = dx; secondary = Math.abs(dy); }
        else { if (dx >= -4) continue; primary = -dx; secondary = Math.abs(dy); }
        var score = primary + secondary * 2.4;
        if (score < bestScore) { bestScore = score; best = el; }
      }
      if (best) { best.focus(); return true; }
      return false;
    }

    function navContainer() {
      var top = ui.topOverlay();
      if (top) return overlays[top];
      return screens[ui.screen] || null;
    }

    /** プレイ中以外の画面（またはオーバーレイ表示中）か */
    ui.navActive = function () {
      return !!ui.topOverlay() || (ui.screen && ui.screen !== 'play' && ui.screen !== 'boot');
    };

    doc.addEventListener('keydown', function (e) {
      if (!ui.navActive()) return;
      var container = navContainer();
      if (!container) return;
      var k = e.key;
      var a = doc.activeElement;
      if (k === 'Tab') {
        // オーバーレイ表示中はフォーカスを中に閉じ込める
        if (ui.topOverlay()) {
          var els = focusables(container);
          if (!els.length) return;
          var first = els[0];
          var last = els[els.length - 1];
          if (e.shiftKey && (a === first || els.indexOf(a) < 0)) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && (a === last || els.indexOf(a) < 0)) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      if (k !== 'ArrowUp' && k !== 'ArrowDown' && k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      // つまみ（スライダー）は左右キーで値を変える
      if (a && a.type === 'range' && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
      e.preventDefault();
      navigate(container, k);
    });

    /** コンテナ内の最初の（またはセレクタに合う）要素にフォーカスを当てる */
    ui.focus = function (selector, container) {
      var scope = container || navContainer() || doc;
      var el = selector ? scope.querySelector(selector) : focusables(scope)[0];
      if (el && !el.disabled && !el.hidden) { el.focus(); return true; }
      var list = scope === doc ? [] : focusables(scope);
      if (list.length) { list[0].focus(); return true; }
      return false;
    };

    // -----------------------------------------------------------------------
    // ステージ選択
    // -----------------------------------------------------------------------

    function starSvg(on, cls) {
      return '<svg viewBox="0 0 24 24" class="' + (cls || '') + (on ? ' on' : '') + '" aria-hidden="true"><path d="' + STAR_PATH + '"/></svg>';
    }

    /**
     * ステージ選択画面を描く。
     * @param {object} s { levels, worlds, save, world(選択中), unlockAll, nextId, onWorld(w), onPlay(id), onLocked() }
     */
    ui.renderSelect = function (s) {
      var tabs = $('world-tabs');
      var grid = $('stage-grid');
      tabs.innerHTML = '';
      grid.innerHTML = '';
      var maxStars = s.levels.length * 3;
      $('sel-stars').textContent = String(s.save.totalStars());
      $('sel-stars-max').textContent = '/ ' + maxStars;

      s.worlds.forEach(function (w) {
        var firstIdx = -1;
        var stars = 0;
        var count = 0;
        s.levels.forEach(function (lv, i) {
          if (lv.world !== w.id) return;
          if (firstIdx < 0) firstIdx = i;
          count++;
          var info = s.save.stageInfo(lv.id);
          if (info) stars += info.stars;
        });
        var unlocked = firstIdx >= 0 && s.save.isUnlocked(s.levels, firstIdx, s.unlockAll);
        var b = doc.createElement('button');
        b.type = 'button';
        b.className = 'world-tab' + (w.id === s.world ? ' is-selected' : '') + (unlocked ? '' : ' is-locked');
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', w.id === s.world ? 'true' : 'false');
        b.dataset.world = String(w.id);
        b.innerHTML = '<span class="num">' + w.id + '</span><span class="nm">' + w.short + '</span>' +
          (unlocked ? '<span class="cnt">' + stars + '/' + count * 3 + '</span>' :
            '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><path d="' + LOCK_PATH + '"/></svg>');
        b.addEventListener('click', function () { s.onWorld(w.id); });
        tabs.appendChild(b);
      });

      var world = s.worlds[s.world - 1];
      $('world-name').textContent = world.name;
      $('world-story').textContent = world.story;

      s.levels.forEach(function (lv, i) {
        if (lv.world !== s.world) return;
        var info = s.save.stageInfo(lv.id);
        var unlocked = s.save.isUnlocked(s.levels, i, s.unlockAll);
        var b = doc.createElement('button');
        b.type = 'button';
        b.dataset.id = lv.id;
        b.className = 'stage-card' + (unlocked ? '' : ' is-locked') + (info && info.cleared ? ' is-cleared' : '') + (s.nextId === lv.id ? ' is-next' : '');
        if (!unlocked) b.setAttribute('aria-disabled', 'true');
        var starsHtml = '';
        for (var k = 1; k <= 3; k++) starsHtml += starSvg(!!(info && info.stars >= k));
        b.innerHTML =
          '<span class="no">' + lv.id + '</span>' +
          (unlocked ? '<span class="nm">' + lv.name + '</span><span class="stars">' + starsHtml + '</span>' +
            '<span class="best">' + (info && info.cleared ? Text.select.best + ' ' + info.best + Text.select.moves : '') + '</span>' :
            '<svg class="lock-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="' + LOCK_PATH + '"/></svg><span class="best"></span><span class="best"></span>');
        b.setAttribute('aria-label', lv.id + ' ' + (unlocked ? lv.name : Text.select.locked));
        b.addEventListener('click', function () {
          if (!unlocked) { s.onLocked(); return; }
          s.onPlay(lv.id);
        });
        grid.appendChild(b);
      });
    };

    // -----------------------------------------------------------------------
    // クリア画面
    // -----------------------------------------------------------------------

    /**
     * ステージクリアのパネルを設定する。★が1つずつ点灯し、点灯のたびに onStar(n) が呼ばれる。
     * @param {object} c { stageId, moves, par, stars, newBest, first, onStar }
     */
    ui.renderClear = function (c) {
      starTimers.forEach(root.clearTimeout);
      starTimers = [];
      $('clear-stage').textContent = c.stageId + '  ' + c.name;
      $('clear-moves').textContent = String(c.moves);
      $('clear-par').textContent = String(c.par);
      $('clear-msg').textContent = Text.clear['msg' + c.stars];
      var badge = $('clear-badge');
      if (c.first) { badge.textContent = Text.clear.first; badge.hidden = false; }
      else if (c.newBest) { badge.textContent = Text.clear.newBest; badge.hidden = false; }
      else badge.hidden = true;
      var stars = $('clear-stars').querySelectorAll('.big-star');
      for (var i = 0; i < stars.length; i++) {
        stars[i].classList.remove('on');
        stars[i].style.animationDelay = '';
      }
      for (var k = 0; k < c.stars; k++) {
        (function (n) {
          starTimers.push(root.setTimeout(function () {
            stars[n].classList.add('on');
            if (c.onStar) c.onStar(n + 1);
          }, 380 + n * CONFIG.STAR_STAGGER_MS));
        })(k);
      }
    };

    // -----------------------------------------------------------------------
    // 設定
    // -----------------------------------------------------------------------

    var SETTING_RANGES = ['bgm', 'sfx', 'amb'];
    var SETTING_CHECKS = ['muted', 'reduced', 'marks'];

    /** 設定画面の部品の値をセーブデータの設定に合わせる */
    ui.syncSettings = function (settings) {
      SETTING_RANGES.forEach(function (k) {
        $('set-' + k).value = String(Math.round(settings[k] * 100));
        $('out-' + k).textContent = Math.round(settings[k] * 100) + '%';
      });
      SETTING_CHECKS.forEach(function (k) { $('set-' + k).checked = !!settings[k]; });
    };

    /** 設定が変えられたときの通知を登録する。fn(name, value) */
    ui.onSetting = function (fn) {
      SETTING_RANGES.forEach(function (k) {
        $('set-' + k).addEventListener('input', function (e) {
          var v = Number(e.target.value) / 100;
          $('out-' + k).textContent = Math.round(v * 100) + '%';
          fn(k, v);
        });
      });
      SETTING_CHECKS.forEach(function (k) {
        $('set-' + k).addEventListener('change', function (e) { fn(k, e.target.checked); });
      });
    };

    // -----------------------------------------------------------------------
    // あそびかた
    // -----------------------------------------------------------------------

    function drawIcon(canvas, kind) {
      var dpr = Math.min(root.devicePixelRatio || 1, 2);
      var size = 56;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      var g = canvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, size, size);
      var c = size;
      if (kind === 'orb') {
        Sprites.drawOrb(g, 28, 30, 16, 0, { glow: 0.5 });
      } else if (kind === 'tilt') {
        Sprites.drawOrb(g, 22, 30, 13, 2, { sx: 1.15, sy: 0.9, angle: 0, glow: 0.4, mouth: 'o', look: [1, 0], shadow: 0 });
        g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(34, 30); g.lineTo(50, 30); g.moveTo(44, 22); g.lineTo(52, 30); g.lineTo(44, 38); g.stroke();
      } else if (kind === 'keys') {
        g.fillStyle = 'rgba(255,255,255,0.16)';
        [[19, 10], [19, 30], [3, 30], [35, 30]].forEach(function (p) { Sprites.roundRect(g, p[0], p[1], 18, 18, 5); g.fill(); });
        g.fillStyle = '#ffd166';
        g.beginPath(); g.moveTo(28, 14); g.lineTo(24, 20); g.lineTo(32, 20); g.fill();
      } else if (kind === 'star') {
        g.fillStyle = '#ffd166';
        g.shadowColor = 'rgba(255,209,102,0.8)'; g.shadowBlur = 8;
        g.save(); g.translate(28, 28); g.scale(2, 2); g.translate(-12, -12);
        g.fill(new root.Path2D(STAR_PATH)); g.restore();
      } else if (kind === 'mud') {
        Sprites.drawMud(g, 28, 28, c, 0, 3);
      } else if (kind === 'flow') {
        Sprites.drawFlow(g, 4, 4, 48, 1, 1200, 0);
      } else if (kind === 'portal') {
        Sprites.drawPortal(g, 28, 28, c, 0, 800, 0);
      } else if (kind === 'rev') {
        Sprites.drawOrb(g, 28, 30, 15, 1, { rev: true, glow: 0.4, shadow: 0 });
      } else if (kind === 'bud') {
        Sprites.drawBud(g, 28, 28, c, 0, 1);
      }
    }

    /**
     * あそびかたの中身を作る。maxWorld までに登場するギミックだけ紹介する（先のネタばらしを避ける）。
     */
    ui.renderHelp = function (maxWorld) {
      var body = $('help-body');
      body.innerHTML = '';
      var iconFor = ['orb', 'tilt', 'keys', 'star'];
      Text.help.basics.forEach(function (b, i) {
        body.appendChild(card(iconFor[i], b.title, b.text));
      });
      var any = false;
      Text.help.gimmicks.forEach(function (g) {
        if (g.world > maxWorld) return;
        if (!any) {
          var h = doc.createElement('p');
          h.className = 'help-section';
          h.textContent = 'ギミック';
          body.appendChild(h);
          any = true;
        }
        body.appendChild(card(g.key, g.title, g.text));
      });
    };

    function card(icon, title, text) {
      var d = doc.createElement('div');
      d.className = 'help-card';
      var cv = doc.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      d.appendChild(cv);
      var t = doc.createElement('div');
      t.innerHTML = '<h4></h4><p></p>';
      t.querySelector('h4').textContent = title;
      t.querySelector('p').textContent = text;
      d.appendChild(t);
      drawIcon(cv, icon);
      return d;
    }

    // -----------------------------------------------------------------------
    // 確認ダイアログ
    // -----------------------------------------------------------------------

    var confirmYes = null;
    confirmYesReset = function () { confirmYes = null; };
    $('confirm-yes').addEventListener('click', function () {
      var fn = confirmYes;
      ui.closeOverlay('confirm');
      if (fn) fn();
    });
    $('confirm-no').addEventListener('click', function () { ui.closeOverlay('confirm'); });

    /**
     * 確認ダイアログを開く。「はい」が押されたときだけ onYes を呼ぶ（初期フォーカスは安全な「いいえ」側）。
     * @param {{title:string, body:string, yes:string, no:string}} c
     */
    ui.confirm = function (c, onYes) {
      $('confirm-title').textContent = c.title;
      $('confirm-body').textContent = c.body;
      $('confirm-yes').textContent = c.yes;
      $('confirm-no').textContent = c.no;
      confirmYes = onYes || null;
      ui.openOverlay('confirm');
      $('confirm-no').focus();
    };

    ui.elements = { $: $, screens: screens, overlays: overlays };
    return ui;
  }

  var UI = { CONFIG: CONFIG, create: create };

  Orgel.UI = UI;
  if (typeof module !== 'undefined' && module.exports) { module.exports = UI; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
