(function (root) {
  'use strict';

  var Orgel = root.Orgel || (root.Orgel = {});
  var Songs = Orgel.Songs || require('./songs.js');
  var Voices = Orgel.Voices || require('./voices.js');
  var Rng = Orgel.Rng || require('../core/rng.js');

  /**
   * 環境音（ワールドごとに常時鳴る）。仕様: managements/project/game-design.md §10.3。
   * 構成: 「ノイズ＋フィルタ＋ゆっくりした揺れ（LFO）」の連続した層と、「ランダムな間隔で鳴る単発音」。
   *   var amb = Ambience.create(engine);
   *   amb.start('w2', { fade: 1.5 });     // 場面を切り替える（前の場面はクロスフェードで消える）
   *   amb.advance(untilTime);              // 単発音を until まで予約する（実時間では一定間隔で呼ぶ。オフライン検査では1回）
   * 場面名: night（タイトル・選択）／w1〜w18（各ワールド。songs.js の KEYS にあるワールド）／dawn（エンディング）
   */

  var SCENES = ['night'];
  var SCENE_KEY = { night: 'title', dawn: 'ending' };
  Object.keys(Songs.KEYS).filter(function (k) { return /^\d+$/.test(k); }).forEach(function (k) {
    SCENES.push('w' + k);
    SCENE_KEY['w' + k] = k;
  });
  SCENES.push('dawn');

  function create(engine) {
    var ctx = engine.ctx;
    var voices = Voices.create(engine);
    var amb = { current: null };
    var cur = null;       // { name, gain, layers, events, next, rng, key }
    var fading = [];

    /** ノイズ＋フィルタ＋（ゆっくりした音量の揺れ）の連続した層 */
    function noiseLayer(dest, o) {
      var src = ctx.createBufferSource();
      src.buffer = engine.noiseBuffer(o.color || 'pink');
      src.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.value = o.filter.freq;
      f.Q.value = o.filter.q == null ? 0.7 : o.filter.q;
      var g = ctx.createGain();
      g.gain.value = o.gain;
      var stoppers = [src];
      if (o.lfo) {
        var lfo = ctx.createOscillator();
        lfo.frequency.value = o.lfo.rate;
        var depth = ctx.createGain();
        depth.gain.value = o.gain * o.lfo.depth;
        lfo.connect(depth);
        depth.connect(g.gain);
        lfo.start();
        stoppers.push(lfo);
      }
      var out = g;
      if (o.pan && ctx.createStereoPanner) {
        var p = ctx.createStereoPanner();
        p.pan.value = o.pan;
        g.connect(p);
        out = p;
      }
      src.connect(f);
      f.connect(g);
      out.connect(dest);
      src.start(0, Math.random() * 1.5);
      return { stop: function (t) { stoppers.forEach(function (n) { try { n.stop(t); } catch (e) { /* 停止済み */ } }); } };
    }

    /** 低い持続音（ドローン）の層。type: 'sine'|'sawtooth'|'triangle' */
    function toneLayer(dest, o) {
      var osc = ctx.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.value = o.freq;
      if (o.detune) osc.detune.value = o.detune;
      var g = ctx.createGain();
      g.gain.value = o.gain;
      var stoppers = [osc];
      var node = osc;
      if (o.filter) {
        var f = ctx.createBiquadFilter();
        f.type = o.filter.type;
        f.frequency.value = o.filter.freq;
        f.Q.value = o.filter.q == null ? 0.7 : o.filter.q;
        osc.connect(f);
        node = f;
      }
      if (o.lfo) {
        var lfo = ctx.createOscillator();
        lfo.frequency.value = o.lfo.rate;
        var depth = ctx.createGain();
        depth.gain.value = o.gain * o.lfo.depth;
        lfo.connect(depth);
        depth.connect(g.gain);
        lfo.start();
        stoppers.push(lfo);
      }
      node.connect(g);
      g.connect(dest);
      osc.start();
      return { stop: function (t) { stoppers.forEach(function (n) { try { n.stop(t); } catch (e) { /* 停止済み */ } }); } };
    }

    function rand(rng, lo, hi) { return lo + rng.next() * (hi - lo); }

    var BUILDERS = {
      night: function (dest, rng, note) {
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.1, filter: { type: 'bandpass', freq: 450, q: 0.7 }, lfo: { rate: 0.07, depth: 0.45 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.05, filter: { type: 'bandpass', freq: 900, q: 0.8 }, lfo: { rate: 0.11, depth: 0.6 }, pan: 0.2 }),
          ],
          events: [
            // 星のきらめき
            { min: 5, max: 11, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 6)), 3), { dur: 1.6, gain: 0.03, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
          ],
        };
      },
      w1: function (dest, rng, note) {
        function chirp(t) {
          var f = rand(rng, 3900, 4600);
          var pan = rand(rng, -0.7, 0.7);
          var n = 2 + Math.floor(rng.next() * 3);
          for (var i = 0; i < n; i++) {
            engine.tone({ type: 'sine', freq: f, t: t + i * 0.085, dur: 0.035, gain: 0.014, attack: 0.004, pan: pan, dest: dest });
          }
        }
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.105, filter: { type: 'bandpass', freq: 380, q: 0.7 }, lfo: { rate: 0.06, depth: 0.5 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.038, filter: { type: 'bandpass', freq: 1000, q: 0.9 }, lfo: { rate: 0.09, depth: 0.7 }, pan: -0.25 }),
          ],
          events: [
            { min: 0.7, max: 2.4, fire: chirp },
            { min: 1.1, max: 3.2, fire: chirp },
            { min: 18, max: 32, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 4)), 0), { dur: 3, gain: 0.02, dest: dest, pan: rand(rng, -0.3, 0.3) }); } },
          ],
        };
      },
      w2: function (dest, rng, note) {
        function drip(t) {
          var f = rand(rng, 1000, 1800);
          var pan = rand(rng, -0.8, 0.8);
          engine.tone({ type: 'sine', freq: f, freqEnd: f * 0.6, t: t, dur: 0.09, gain: 0.03, attack: 0.002, pan: pan, dest: dest });
          if (rng.chance(0.3)) engine.tone({ type: 'sine', freq: f * 1.2, freqEnd: f * 0.7, t: t + 0.13, dur: 0.07, gain: 0.018, attack: 0.002, pan: pan, dest: dest });
        }
        return {
          layers: [
            toneLayer(dest, { type: 'sine', freq: 55, gain: 0.016, lfo: { rate: 0.05, depth: 0.3 } }),
            toneLayer(dest, { type: 'sine', freq: 82.4, detune: 4, gain: 0.01, lfo: { rate: 0.037, depth: 0.4 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.014, filter: { type: 'lowpass', freq: 250, q: 0.5 }, lfo: { rate: 0.05, depth: 0.3 } }),
          ],
          events: [
            { min: 1.2, max: 4.5, fire: drip },
            { min: 9, max: 16, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 5)), 3), { dur: 3.5, gain: 0.02, dest: dest, pan: rand(rng, -0.5, 0.5) }); } },
          ],
        };
      },
      w3: function (dest, rng, note) {
        return {
          layers: [
            noiseLayer(dest, { color: 'brown', gain: 0.07, filter: { type: 'lowpass', freq: 700, q: 0.5 }, lfo: { rate: 0.11, depth: 0.65 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.015, filter: { type: 'highpass', freq: 2500, q: 0.5 }, lfo: { rate: 0.11, depth: 0.9 } }),
            toneLayer(dest, { type: 'sine', freq: 65, gain: 0.012 }),
          ],
          events: [
            { min: 8, max: 15, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 6)), 3), { dur: 2.2, gain: 0.025, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
          ],
        };
      },
      w4: function (dest, rng, note) {
        function chime(t) {
          var pan = rand(rng, -0.7, 0.7);
          var n = rng.chance(0.3) ? 2 + Math.floor(rng.next() * 2) : 1;
          for (var i = 0; i < n; i++) {
            voices.bell(t + i * 0.16, note(Math.floor(rand(rng, 0, 10)), 2), { dur: 2.4, gain: 0.04, dest: dest, pan: pan });
          }
        }
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.07, filter: { type: 'bandpass', freq: 1100, q: 1.3 }, lfo: { rate: 0.08, depth: 0.5 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.012, filter: { type: 'highpass', freq: 3000, q: 0.5 }, lfo: { rate: 0.06, depth: 0.7 }, pan: 0.3 }),
          ],
          events: [
            { min: 1.6, max: 5.5, fire: chime },
          ],
        };
      },
      w5: function (dest, rng, note) {
        var tock = 0;
        return {
          layers: [
            toneLayer(dest, { type: 'sawtooth', freq: 55, gain: 0.022, filter: { type: 'lowpass', freq: 180, q: 0.6 }, lfo: { rate: 0.04, depth: 0.35 } }),
            toneLayer(dest, { type: 'sine', freq: 110, detune: -5, gain: 0.008 }),
            noiseLayer(dest, { color: 'white', gain: 0.005, filter: { type: 'highpass', freq: 5000, q: 0.5 }, lfo: { rate: 0.09, depth: 0.8 } }),
          ],
          events: [
            // オルゴールのぜんまい（チクタク）: 一定間隔で高低を交互に
            { fixed: 0.5, fire: function (t) {
              tock++;
              engine.tone({ type: 'sine', freq: tock % 2 ? 880 : 660, t: t, dur: 0.025, gain: 0.012, attack: 0.002, pan: tock % 2 ? 0.2 : -0.2, dest: dest });
            } },
            { min: 6, max: 12, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 8)), 2), { dur: 2.6, gain: 0.03, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
          ],
        };
      },
      // ---- ワールド6〜18（v1.1）----
      w6: function (dest, rng, note) {
        // もりの いずみ: 葉ずれ・せせらぎ・虫の声・ふくろう
        function cricket(t) {
          var f = rand(rng, 4100, 4700);
          var pan = rand(rng, -0.8, 0.8);
          var n = 5 + Math.floor(rng.next() * 5);
          for (var i = 0; i < n; i++) engine.tone({ type: 'sine', freq: f, t: t + i * 0.045, dur: 0.02, gain: 0.008, attack: 0.003, pan: pan, dest: dest });
        }
        function owl(t) {
          var pan = rand(rng, -0.5, 0.5);
          engine.tone({ type: 'sine', freq: 392, freqEnd: 349, t: t, dur: 0.4, gain: 0.03, attack: 0.05, pan: pan, dest: dest });
          engine.tone({ type: 'sine', freq: 349, freqEnd: 311, t: t + 0.55, dur: 0.55, gain: 0.03, attack: 0.05, pan: pan, dest: dest });
        }
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.085, filter: { type: 'bandpass', freq: 650, q: 0.7 }, lfo: { rate: 0.07, depth: 0.5 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.03, filter: { type: 'bandpass', freq: 1500, q: 1.4 }, lfo: { rate: 0.28, depth: 0.8 }, pan: 0.3 }),
            noiseLayer(dest, { color: 'white', gain: 0.006, filter: { type: 'highpass', freq: 5200, q: 0.5 }, lfo: { rate: 0.1, depth: 0.7 } }),
          ],
          events: [
            { min: 1.8, max: 4.5, fire: cricket },
            { min: 14, max: 26, fire: owl },
          ],
        };
      },
      w7: function (dest, rng, note) {
        // こおりの ほこら: 冷たい風・雪のざわめき・氷のきらめき
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.08, filter: { type: 'bandpass', freq: 520, q: 0.8 }, lfo: { rate: 0.05, depth: 0.6 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.02, filter: { type: 'bandpass', freq: 1800, q: 1.6 }, lfo: { rate: 0.09, depth: 0.9 }, pan: -0.3 }),
            noiseLayer(dest, { color: 'white', gain: 0.008, filter: { type: 'highpass', freq: 4800, q: 0.5 }, lfo: { rate: 0.13, depth: 0.8 } }),
          ],
          events: [
            { min: 4, max: 9, fire: function (t) { voices.glass(t, note(Math.floor(rand(rng, 0, 7)), 3), { dur: 2.4, gain: 0.03, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
            { min: 15, max: 28, fire: function (t) { engine.noise({ color: 'white', t: t, dur: 0.04, gain: 0.02, attack: 0.001, filter: { type: 'bandpass', freq: 3200, q: 3 }, pan: rand(rng, -0.7, 0.7), dest: dest }); } },
          ],
        };
      },
      w8: function (dest, rng, note) {
        // さばくの よぞら: 乾いた風・砂のさらさら・遠い鐘・流れ星
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.075, filter: { type: 'bandpass', freq: 420, q: 0.6 }, lfo: { rate: 0.045, depth: 0.55 } }),
            noiseLayer(dest, { color: 'white', gain: 0.01, filter: { type: 'highpass', freq: 3200, q: 0.5 }, lfo: { rate: 0.11, depth: 0.9 } }),
          ],
          events: [
            { min: 15, max: 27, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 3)), 1), { dur: 4, gain: 0.026, dest: dest, pan: rand(rng, -0.4, 0.4) }); } },
            { min: 12, max: 22, fire: function (t) { engine.noise({ color: 'pink', t: t, dur: 0.45, gain: 0.012, attack: 0.05, filter: { type: 'bandpass', freq: 1500, freqEnd: 5200, q: 2 }, pan: rand(rng, -0.8, 0.8), dest: dest }); } },
          ],
        };
      },
      w9: function (dest, rng, note) {
        // あかりの みなと: 波・水面・ブイの鐘
        function buoy(t) {
          var pan = rand(rng, -0.5, 0.5);
          voices.bell(t, note(0, 1), { dur: 2.4, gain: 0.032, dest: dest, pan: pan });
          voices.bell(t + 0.75, note(0, 1), { dur: 2.2, gain: 0.026, dest: dest, pan: pan });
        }
        return {
          layers: [
            noiseLayer(dest, { color: 'brown', gain: 0.09, filter: { type: 'lowpass', freq: 520, q: 0.5 }, lfo: { rate: 0.12, depth: 0.7 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.03, filter: { type: 'bandpass', freq: 900, q: 0.9 }, lfo: { rate: 0.2, depth: 0.8 }, pan: 0.3 }),
          ],
          events: [
            { min: 9, max: 16, fire: buoy },
            { min: 10, max: 19, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 2, 6)), 3), { dur: 1.8, gain: 0.018, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
          ],
        };
      },
      w10: function (dest, rng, note) {
        // ほしぞらの とうだい: 低い波・霧笛
        function foghorn(t) {
          engine.tone({ type: 'sine', freq: 110, freqEnd: 104, t: t, dur: 2.4, gain: 0.03, attack: 0.5, release: 0.8, shape: 'sustain', dest: dest });
          engine.tone({ type: 'sine', freq: 165, freqEnd: 156, t: t, dur: 2.4, gain: 0.012, attack: 0.5, release: 0.8, shape: 'sustain', dest: dest });
        }
        return {
          layers: [
            noiseLayer(dest, { color: 'brown', gain: 0.075, filter: { type: 'lowpass', freq: 420, q: 0.5 }, lfo: { rate: 0.08, depth: 0.7 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.012, filter: { type: 'highpass', freq: 2600, q: 0.5 }, lfo: { rate: 0.07, depth: 0.9 } }),
          ],
          events: [
            { min: 20, max: 32, fire: foghorn },
            { min: 7, max: 13, fire: function (t) { voices.glass(t, note(Math.floor(rand(rng, 0, 7)), 3), { dur: 2.4, gain: 0.02, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
          ],
        };
      },
      w11: function (dest, rng, note) {
        // ふかい うみの そこ: 低いうなり・あぶく・くじらの声
        function bubbles(t) {
          var n = 3 + Math.floor(rng.next() * 4);
          var pan = rand(rng, -0.7, 0.7);
          for (var i = 0; i < n; i++) {
            var f = rand(rng, 480, 900);
            engine.tone({ type: 'sine', freq: f, freqEnd: f * 1.9, t: t + i * rand(rng, 0.07, 0.16), dur: 0.08, gain: 0.02, attack: 0.004, pan: pan, dest: dest });
          }
        }
        function whale(t) {
          engine.tone({ type: 'sine', freq: 170, freqEnd: 95, t: t, dur: 2.8, gain: 0.022, attack: 0.6, release: 0.9, shape: 'sustain', pan: rand(rng, -0.4, 0.4), dest: dest });
        }
        return {
          layers: [
            toneLayer(dest, { type: 'sine', freq: 49, gain: 0.018, lfo: { rate: 0.04, depth: 0.35 } }),
            toneLayer(dest, { type: 'sine', freq: 73.4, detune: 5, gain: 0.011, lfo: { rate: 0.03, depth: 0.45 } }),
            noiseLayer(dest, { color: 'brown', gain: 0.035, filter: { type: 'lowpass', freq: 200, q: 0.5 }, lfo: { rate: 0.05, depth: 0.5 } }),
          ],
          events: [
            { min: 3, max: 7, fire: bubbles },
            { min: 24, max: 40, fire: whale },
          ],
        };
      },
      w12: function (dest, rng, note) {
        // からくりの まち: 歯車の低いうなり・時計のチクタク（2つの拍）・オルゴール
        var tock = 0;
        var tick2 = 0;
        function ratchet(t) {
          var pan = rand(rng, -0.6, 0.6);
          for (var i = 0; i < 6; i++) engine.tone({ type: 'sine', freq: 2300, t: t + i * 0.03, dur: 0.012, gain: 0.01, attack: 0.001, pan: pan, dest: dest });
        }
        return {
          layers: [
            toneLayer(dest, { type: 'sawtooth', freq: 65.4, gain: 0.016, filter: { type: 'lowpass', freq: 160, q: 0.6 }, lfo: { rate: 0.05, depth: 0.3 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.012, filter: { type: 'bandpass', freq: 800, q: 1 }, lfo: { rate: 0.2, depth: 0.5 } }),
          ],
          events: [
            { fixed: 0.5, fire: function (t) {
              tock++;
              engine.tone({ type: 'sine', freq: tock % 2 ? 1040 : 780, t: t, dur: 0.025, gain: 0.014, attack: 0.002, pan: tock % 2 ? 0.25 : -0.25, dest: dest });
            } },
            { fixed: 0.75, fire: function (t) {
              tick2++;
              engine.tone({ type: 'sine', freq: 2200, t: t, dur: 0.012, gain: 0.007, attack: 0.001, pan: tick2 % 2 ? 0.5 : -0.5, dest: dest });
            } },
            { min: 6, max: 11, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 8)), 2), { dur: 2.2, gain: 0.028, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
            { min: 10, max: 16, fire: ratchet },
          ],
        };
      },
      w13: function (dest, rng, note) {
        // にじの はし: ウィンドチャイム
        function chimes(t) {
          var pan = rand(rng, -0.7, 0.7);
          var n = 1 + Math.floor(rng.next() * 4);
          for (var i = 0; i < n; i++) voices.glass(t + i * 0.14, note(Math.floor(rand(rng, 0, 10)), 2), { dur: 2.2, gain: 0.034, dest: dest, pan: pan });
        }
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.085, filter: { type: 'bandpass', freq: 1300, q: 1.1 }, lfo: { rate: 0.08, depth: 0.5 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.02, filter: { type: 'highpass', freq: 3500, q: 0.5 }, lfo: { rate: 0.06, depth: 0.7 }, pan: 0.25 }),
          ],
          events: [
            { min: 1.5, max: 4.5, fire: chimes },
          ],
        };
      },
      w14: function (dest, rng, note) {
        // かざんの ほし: 低い地鳴り・はぜる火の粉・溶岩のあぶく
        function sparks(t) {
          var n = 2 + Math.floor(rng.next() * 3);
          for (var i = 0; i < n; i++) engine.noise({ color: 'white', t: t + i * rand(rng, 0.03, 0.12), dur: 0.02, gain: 0.02, attack: 0.001, filter: { type: 'highpass', freq: 3200, q: 0.6 }, pan: rand(rng, -0.8, 0.8), dest: dest });
        }
        function bloop(t) {
          engine.tone({ type: 'sine', freq: 140, freqEnd: 65, t: t, dur: 0.22, gain: 0.05, attack: 0.004, pan: rand(rng, -0.5, 0.5), dest: dest });
        }
        return {
          layers: [
            noiseLayer(dest, { color: 'brown', gain: 0.12, filter: { type: 'lowpass', freq: 130, q: 0.6 }, lfo: { rate: 0.06, depth: 0.5 } }),
            toneLayer(dest, { type: 'sawtooth', freq: 41.2, gain: 0.014, filter: { type: 'lowpass', freq: 110, q: 0.7 }, lfo: { rate: 0.05, depth: 0.3 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.02, filter: { type: 'bandpass', freq: 700, q: 0.6 }, lfo: { rate: 0.11, depth: 0.8 }, pan: -0.3 }),
          ],
          events: [
            { min: 0.9, max: 3.2, fire: sparks },
            { min: 6, max: 12, fire: bloop },
          ],
        };
      },
      w15: function (dest, rng, note) {
        // ゆめの ずかん: ふわふわの持続音・ページをめくる音・鈴
        function page(t) {
          engine.noise({ color: 'pink', t: t, dur: 0.28, gain: 0.02, attack: 0.04, filter: { type: 'bandpass', freq: 2400, freqEnd: 900, q: 1 }, pan: rand(rng, -0.4, 0.4), dest: dest });
        }
        return {
          layers: [
            toneLayer(dest, { type: 'sine', freq: 220, gain: 0.008, lfo: { rate: 0.05, depth: 0.5 } }),
            toneLayer(dest, { type: 'sine', freq: 329.6, detune: 6, gain: 0.006, lfo: { rate: 0.037, depth: 0.5 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.045, filter: { type: 'bandpass', freq: 700, q: 0.7 }, lfo: { rate: 0.06, depth: 0.5 } }),
          ],
          events: [
            { min: 8, max: 14, fire: page },
            { min: 4, max: 9, fire: function (t) { voices.glass(t, note(Math.floor(rand(rng, 0, 8)), 3), { dur: 2, gain: 0.022, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
          ],
        };
      },
      w16: function (dest, rng, note) {
        // つきの うらがわ: 静かなうなり・遠くの音
        function cosmic(t) {
          var n = 2 + Math.floor(rng.next() * 2);
          for (var i = 0; i < n; i++) engine.noise({ color: 'white', t: t + i * rand(rng, 0.05, 0.2), dur: 0.015, gain: 0.01, attack: 0.001, filter: { type: 'highpass', freq: 6000, q: 0.5 }, pan: rand(rng, -0.8, 0.8), dest: dest });
        }
        return {
          layers: [
            toneLayer(dest, { type: 'sine', freq: 73.4, gain: 0.014, lfo: { rate: 0.03, depth: 0.4 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.045, filter: { type: 'bandpass', freq: 300, q: 0.8 }, lfo: { rate: 0.04, depth: 0.6 } }),
            noiseLayer(dest, { color: 'white', gain: 0.004, filter: { type: 'highpass', freq: 6000, q: 0.5 }, lfo: { rate: 0.08, depth: 0.9 } }),
          ],
          events: [
            { min: 12, max: 22, fire: function (t) { voices.glass(t, note(Math.floor(rand(rng, 0, 6)), 3), { dur: 3, gain: 0.02, dest: dest, pan: rand(rng, -0.5, 0.5) }); } },
            { min: 5, max: 11, fire: cosmic },
          ],
        };
      },
      w17: function (dest, rng, note) {
        // ほしの うみ: 星くずの持続音・きらめき・ゆるやかなうねり
        function swell(t) {
          engine.noise({ color: 'pink', t: t, dur: 3, gain: 0.02, attack: 1.2, release: 1.2, shape: 'sustain', filter: { type: 'bandpass', freq: 400, freqEnd: 1600, q: 0.9 }, pan: rand(rng, -0.4, 0.4), dest: dest });
        }
        return {
          layers: [
            toneLayer(dest, { type: 'sine', freq: 196, gain: 0.009, lfo: { rate: 0.04, depth: 0.5 } }),
            toneLayer(dest, { type: 'sine', freq: 293.7, detune: 5, gain: 0.007, lfo: { rate: 0.05, depth: 0.5 } }),
            toneLayer(dest, { type: 'sine', freq: 392, detune: -4, gain: 0.005, lfo: { rate: 0.033, depth: 0.6 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.03, filter: { type: 'bandpass', freq: 900, q: 0.8 }, lfo: { rate: 0.07, depth: 0.6 } }),
            noiseLayer(dest, { color: 'white', gain: 0.006, filter: { type: 'highpass', freq: 4800, q: 0.5 }, lfo: { rate: 0.1, depth: 0.8 } }),
          ],
          events: [
            { min: 1.8, max: 5, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 10)), 2), { dur: 2, gain: 0.03, dest: dest, pan: rand(rng, -0.7, 0.7) }); } },
            { min: 14, max: 22, fire: swell },
          ],
        };
      },
      w18: function (dest, rng, note) {
        // ほしの たまてばこ: やさしいオルゴールのぜんまいと、きらめき
        var tock = 0;
        function winding(t) {
          var pan = rand(rng, -0.4, 0.4);
          for (var i = 0; i < 8; i++) engine.tone({ type: 'sine', freq: 1500 + i * 60, t: t + i * 0.045, dur: 0.012, gain: 0.008, attack: 0.001, pan: pan, dest: dest });
        }
        return {
          layers: [
            toneLayer(dest, { type: 'sine', freq: 130.8, gain: 0.012, lfo: { rate: 0.05, depth: 0.4 } }),
            toneLayer(dest, { type: 'sine', freq: 196, detune: 4, gain: 0.008, lfo: { rate: 0.04, depth: 0.5 } }),
            noiseLayer(dest, { color: 'pink', gain: 0.03, filter: { type: 'bandpass', freq: 700, q: 0.7 }, lfo: { rate: 0.06, depth: 0.5 } }),
          ],
          events: [
            { fixed: 0.5, fire: function (t) {
              tock++;
              engine.tone({ type: 'sine', freq: tock % 2 ? 990 : 740, t: t, dur: 0.025, gain: 0.01, attack: 0.002, pan: tock % 2 ? 0.2 : -0.2, dest: dest });
            } },
            { min: 3, max: 7, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 9)), 2), { dur: 2.4, gain: 0.035, dest: dest, pan: rand(rng, -0.6, 0.6) }); } },
            { min: 16, max: 26, fire: winding },
          ],
        };
      },
      dawn: function (dest, rng, note) {
        return {
          layers: [
            noiseLayer(dest, { color: 'pink', gain: 0.075, filter: { type: 'bandpass', freq: 500, q: 0.7 }, lfo: { rate: 0.06, depth: 0.5 } }),
          ],
          events: [
            // 小さな鳥のさえずり
            { min: 2.5, max: 6, fire: function (t) {
              var f = rand(rng, 2800, 3500);
              var pan = rand(rng, -0.7, 0.7);
              var n = 2 + Math.floor(rng.next() * 3);
              for (var i = 0; i < n; i++) engine.tone({ type: 'sine', freq: f, freqEnd: f * 1.25, t: t + i * 0.1, dur: 0.07, gain: 0.016, attack: 0.005, pan: pan, dest: dest });
            } },
            { min: 7, max: 13, fire: function (t) { voices.bell(t, note(Math.floor(rand(rng, 0, 6)), 3), { dur: 2, gain: 0.025, dest: dest, pan: rand(rng, -0.5, 0.5) }); } },
          ],
        };
      },
    };

    function noteFn(key) {
      var k = Songs.KEYS[key];
      return function (deg, oct) { return Songs.degToMidi(k.root + 12 * (oct || 0), k.pent, deg); };
    }

    function stopScene(s, fade) {
      var t = ctx.currentTime;
      s.gain.gain.cancelScheduledValues(t);
      s.gain.gain.setValueAtTime(s.gain.gain.value, t);
      s.gain.gain.linearRampToValueAtTime(0, t + fade);
      s.layers.forEach(function (l) { l.stop(t + fade + 0.1); });
      s.stopped = true;
    }

    /**
     * 場面を始める。すでに同じ場面なら何もしない。
     * @param {string} name 場面名
     * @param {{fade:number, t:number}=} o fade=クロスフェードの秒数（既定1.6）／t=開始時刻（オフライン検査用）
     */
    amb.start = function (name, o) {
      o = o || {};
      if (!BUILDERS[name]) return false;
      if (cur && cur.name === name && !cur.stopped) return true;
      var fade = o.fade == null ? 1.6 : o.fade;
      var t = o.t == null ? ctx.currentTime : o.t;
      if (cur) stopScene(cur, fade);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(1, t + fade);
      gain.connect(engine.bus('amb'));
      var rng = Rng.create('amb-' + name + '-' + Math.floor(t * 1000));
      var built = BUILDERS[name](gain, rng, noteFn(SCENE_KEY[name]));
      cur = { name: name, gain: gain, layers: built.layers, events: built.events, rng: rng, next: built.events.map(function (e) { return e.fixed ? t + e.fixed : t + rand(rng, e.min * 0.3, e.max * 0.7); }) };
      amb.current = name;
      return true;
    };

    amb.stop = function (fade) {
      if (cur) stopScene(cur, fade == null ? 1.2 : fade);
      cur = null;
      amb.current = null;
    };

    /** until（AudioContext の時刻）までの単発音を予約する */
    amb.advance = function (until) {
      if (!cur || cur.stopped) return;
      for (var i = 0; i < cur.events.length; i++) {
        var e = cur.events[i];
        while (cur.next[i] < until) {
          e.fire(cur.next[i]);
          cur.next[i] += e.fixed ? e.fixed : rand(cur.rng, e.min, e.max);
        }
      }
    };

    return amb;
  }

  var Ambience = { SCENES: SCENES, create: create };

  Orgel.Ambience = Ambience;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Ambience; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
