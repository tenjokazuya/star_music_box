/* BGMの記譜データ。1小節=16ステップ（4/4の16分）。'|' は小節線で、tools/check.js が各小節=16ステップかを検証する。
 * 記譜の詳細は js/core/music.js の冒頭コメントを参照。 */
(function (RP) {
  'use strict';

  function B() { return Array.prototype.join.call(arguments, ' | '); }
  function rep(n, s) { var a = []; for (var i = 0; i < n; i++) { a.push(s); } return a.join(' | '); }

  var S = RP.songs = {};

  // ============ タイトル：夜の屋台の郷愁（イ短調・ヨナ抜き） ============
  var titleMel = B(
    'E5:4 A5:2 G5:2 E5:4 r:2 D5:2',
    'F5:4 A5:4 G5:4 F5:2 E5:2',
    'E5:4 G#5:4 B5:4 A5:2 G#5:2',
    'A5:8 r:4 E5:2 D5:2',
    'C5:4 E5:2 F5:2 A5:4 G5:4',
    'B4:4 D5:4 G5:4 F5:2 D5:2',
    'F5:4 E5:4 D5:4 C5:2 B4:2',
    'A4:12 r:4');
  var titleBass = B(
    'A2:4 E3:4 A2:4 E3:4', 'D3:4 A3:4 D3:4 A3:4', 'E3:4 B3:4 E3:4 B3:4', 'A2:4 E3:4 A2:4 E3:4',
    'F2:4 C3:4 F2:4 C3:4', 'G2:4 D3:4 G2:4 D3:4', 'D3:4 A3:4 E3:4 B3:4', 'A2:16');
  var titleArp = B(
    'A3:2 E4 A4 C5 A4 E4 C5 E4', 'D4:2 A4 D5 F5 D5 A4 F5 A4', 'E4:2 B4 E5 G#5 E5 B4 G#5 B4', 'A3:2 E4 A4 C5 A4 E4 C5 E4',
    'F3:2 C4 F4 A4 F4 C4 A4 C5', 'G3:2 D4 G4 B4 G4 D4 B4 D5', 'D4:2 A4 D5 F5 D5 A4 F5 A4', 'A3:2 E4 A4 E4 A4 E4 C5 E4');
  S.title = {
    bpm: 84, steps: 128,
    tracks: [
      { id: 'mel', inst: 'pluck', vol: 0.15, notes: titleMel },
      { id: 'koto', inst: 'koto', vol: 0.08, notes: titleArp },
      { id: 'bass', inst: 'bass', vol: 0.15, notes: titleBass },
      { id: 'drum', kind: 'drum', vol: 0.07, pat: rep(8, 'w...h...w...h.h.') }
    ]
  };

  // ============ オープニング：静かなコト ============
  S.opening = {
    bpm: 66, steps: 128,
    tracks: [
      { id: 'mel', inst: 'koto', vol: 0.14, notes: titleMel },
      { id: 'pad', inst: 'pad', vol: 0.06, notes: B(
        'A3+C4+E4:16', 'D3+F3+A3:16', 'E3+G#3+B3:16', 'A3+C4+E4:16', 'F3+A3+C4:16', 'G3+B3+D4:16', 'D3+F3+A3:8 E3+G#3+B3:8', 'A3+C4+E4:16') },
      { id: 'bass', inst: 'bass', vol: 0.1, notes: titleBass }
    ]
  };

  // ============ 朝の仕込み：のどかで明るい ============
  var mornMel = B(
    'E5:2 G5:2 A5:2 G5:2 E5:4 D5:2 C5:2',
    'C5:2 E5:2 A5:2 E5:2 C5:4 r:4',
    'A4:2 C5:2 F5:2 C5:2 A4:4 G4:2 A4:2',
    'D5:2 G5:2 B5:2 G5:2 D5:4 r:4',
    'G5:2 A5:2 C6:2 A5:2 G5:4 E5:2 G5:2',
    'A5:2 G5:2 E5:2 C5:2 E5:4 r:4',
    'F5:2 A5:2 C6:2 A5:2 F5:4 A5:2 G5:2',
    'E5:2 D5:2 C5:2 D5:2 C5:8');
  S.morning = {
    bpm: 98, steps: 128,
    tracks: [
      { id: 'mel', inst: 'pluck', vol: 0.14, notes: mornMel },
      { id: 'bass', inst: 'bass', vol: 0.14, notes: B(
        'C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 G3:2', 'A2:2 E3:2 A2:2 E3:2 A2:2 E3:2 A2:2 E3:2',
        'F2:2 C3:2 F2:2 C3:2 F2:2 C3:2 F2:2 C3:2', 'G2:2 D3:2 G2:2 D3:2 G2:2 D3:2 G2:2 D3:2',
        'C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 G3:2', 'A2:2 E3:2 A2:2 E3:2 A2:2 E3:2 A2:2 E3:2',
        'F2:2 C3:2 F2:2 C3:2 G2:2 D3:2 G2:2 D3:2', 'C3:2 G3:2 C3:2 G3:2 C3:8') },
      { id: 'arp', inst: 'arp', vol: 0.06, notes: B(
        'C4:1 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4', 'A3:1 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4',
        'F3:1 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3', 'G3:1 B3 D4 B3 G3 B3 D4 B3 G3 B3 D4 B3 G3 B3 D4 B3',
        'C4:1 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4', 'A3:1 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4',
        'F3:1 A3 C4 A3 F3 A3 C4 A3 G3 B3 D4 B3 G3 B3 D4 B3', 'C4:1 E4 G4 E4 C4 E4 G4 E4 C4:8') },
      { id: 'drum', kind: 'drum', vol: 0.06, pat: rep(8, 'k...h...s...h...') }
    ]
  };

  // ============ 営業：テンポよく忙しい（ラッシュで加速＋重ね） ============
  var dayMel = B(
    'A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 A4:2',
    'F4:2 A4:2 C5:2 F5:2 E5:2 C5:2 A4:2 C5:2',
    'G4:2 B4:2 D5:2 G5:2 F5:2 D5:2 B4:2 D5:2',
    'E5:4 D5:2 C5:2 B4:2 C5:2 D5:2 E5:2',
    'A5:3 G5:1 E5:2 G5:2 A5:4 C6:2 B5:2',
    'F5:3 E5:1 C5:2 E5:2 F5:4 A5:2 G5:2',
    'G5:3 F5:1 D5:2 F5:2 G5:4 B5:2 A5:2',
    'E5:2 G#5:2 B5:2 E6:2 D6:2 B5:2 G#5:2 B5:2');
  var dayBass = B(
    'A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 E3:2 G3:2',
    'F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 C3:2 E3:2',
    'G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 D3:2 F3:2',
    'A2:2 A3:2 A2:2 A3:2 E2:2 E3:2 E2:2 E3:2',
    'A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 E3:2 G3:2',
    'F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 C3:2 E3:2',
    'G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 D3:2 F3:2',
    'E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 B2:2 D3:2');
  var dayArp = B(
    'A3:1 C4 E4 A4 C5 A4 E4 C4 A3 C4 E4 A4 C5 A4 E4 C4',
    'F3:1 A3 C4 F4 A4 F4 C4 A3 F3 A3 C4 F4 A4 F4 C4 A3',
    'G3:1 B3 D4 G4 B4 G4 D4 B3 G3 B3 D4 G4 B4 G4 D4 B3',
    'A3:1 C4 E4 A4 C5 A4 E4 C4 E3 G#3 B3 E4 G#4 E4 B3 G#3',
    'A3:1 C4 E4 A4 C5 A4 E4 C4 A3 C4 E4 A4 C5 A4 E4 C4',
    'F3:1 A3 C4 F4 A4 F4 C4 A3 F3 A3 C4 F4 A4 F4 C4 A3',
    'G3:1 B3 D4 G4 B4 G4 D4 B3 G3 B3 D4 G4 B4 G4 D4 B3',
    'E3:1 G#3 B3 E4 G#4 E4 B3 G#3 E3 G#3 B3 E4 G#4 E4 B3 G#3');
  S.day = {
    bpm: 128, steps: 128, rushTempo: 0.13,
    tracks: [
      { id: 'mel', inst: 'pluck', vol: 0.22, notes: dayMel },
      { id: 'bass', inst: 'bass2', vol: 0.22, notes: dayBass },
      { id: 'drum', kind: 'drum', vol: 0.11, pat: rep(8, 'k.hhs.h.k.hhs.hh') },
      { id: 'rush', inst: 'arp', vol: 0.1, notes: dayArp, layer: 'rush' },
      { id: 'taiko', kind: 'drum', vol: 0.12, pat: rep(8, 'd...d...d..dd.d.'), layer: 'rush' }
    ]
  };

  // ============ 営業（購入BGM）：夜の屋台節（演歌風・都節） ============
  S.day_enka = {
    bpm: 72, steps: 128, rushTempo: 0.1,
    tracks: [
      { id: 'mel', inst: 'shami', vol: 0.15, notes: B(
        'E5:6 F5:2 E5:4 D5:4', 'A4:6 Bb4:2 A4:4 E4:4', 'D5:6 E5:2 F5:4 E5:4', 'E5:12 r:4',
        'A5:6 F5:2 E5:4 D5:4', 'E5:4 F5:4 E5:4 D5:4', 'A4:6 Bb4:2 A4:4 E4:4', 'A4:16') },
      { id: 'koto', inst: 'koto', vol: 0.07, notes: B(
        'A3:2 E4 A4 E4 A3 E4 A4 E4', 'A3:2 E4 A4 E4 A3 E4 A4 E4', 'D4:2 A4 D5 A4 D4 A4 D5 A4', 'E4:2 A4 E5 A4 E4 A4 E5 A4',
        'A3:2 E4 A4 E4 A3 E4 A4 E4', 'D4:2 A4 D5 A4 E4 A4 E5 A4', 'A3:2 E4 A4 E4 A3 E4 A4 E4', 'A3:2 E4 A4 E4 A4:8') },
      { id: 'bass', inst: 'bass', vol: 0.14, notes: B(
        'A2:8 E3:8', 'A2:8 E3:8', 'D3:8 A3:8', 'E3:8 B3:8', 'A2:8 E3:8', 'D3:8 E3:8', 'A2:8 E3:8', 'A2:16') },
      { id: 'drum', kind: 'drum', vol: 0.07, pat: rep(8, 'd.......w.w.....') },
      { id: 'hat', kind: 'drum', vol: 0.05, pat: rep(8, '..h...h...h...h.'), layer: 'rush' }
    ]
  };

  // ============ 営業（購入BGM）：深夜のラーメン・ジャズ ============
  S.day_jazz = {
    bpm: 112, swing: 0.34, steps: 64, rushTempo: 0.1,
    tracks: [
      { id: 'mel', inst: 'lead50', vol: 0.12, notes: B(
        'F5:3 A5:1 C6:4 A5:4 F5:4', 'D5:4 F5:2 G5:2 B5:4 G5:4', 'E5:6 G5:2 B5:4 r:4', 'C6:3 A5:1 G5:4 E5:2 D5:2 C5:4') },
      { id: 'chord', inst: 'pad', vol: 0.07, notes: B(
        'D3+F3+A3+C4:6 r:2 D3+F3+A3+C4:4 r:4', 'G2+B2+D3+F3:6 r:2 G2+B2+D3+F3:4 r:4',
        'C3+E3+G3+B3:6 r:2 C3+E3+G3+B3:4 r:4', 'A2+C3+E3+G3:6 r:2 A2+C3+E3+G3:4 r:4') },
      { id: 'bass', inst: 'bass', vol: 0.15, notes: B(
        'D2:4 F2:4 A2:4 C3:4', 'G2:4 B2:4 D3:4 F3:4', 'C3:4 E3:4 G3:4 E3:4', 'A2:4 C3:4 E3:4 G3:4') },
      { id: 'drum', kind: 'drum', vol: 0.06, pat: rep(4, 'k.h.s.h.k.h.s.h.') },
      { id: 'hat', kind: 'drum', vol: 0.04, pat: rep(4, 'h.hhh.hhh.hhh.hh'), layer: 'rush' }
    ]
  };

  // ============ 営業（購入BGM）：替え玉ロック ============
  S.day_rock = {
    bpm: 150, steps: 64, rushTempo: 0.08,
    tracks: [
      { id: 'mel', inst: 'lead', vol: 0.2, notes: B(
        'E5:4 G5:4 B5:4 A5:2 G5:2', 'E5:4 G5:4 C6:4 B5:2 G5:2', 'F#5:4 A5:4 D6:4 C#6:2 A5:2', 'B5:6 G5:2 E5:4 r:4') },
      { id: 'riff', inst: 'shami', vol: 0.2, notes: B(
        'E3+B3:3 E3+B3:3 E3+B3:2 r:2 E3+B3:3 G3+D4:3', 'C3+G3:3 C3+G3:3 C3+G3:2 r:2 C3+G3:3 B2+F#3:3',
        'D3+A3:3 D3+A3:3 D3+A3:2 r:2 D3+A3:3 E3+B3:3', 'E3+B3:3 E3+B3:3 E3+B3:2 r:2 E3+B3:6') },
      { id: 'bass', inst: 'bass2', vol: 0.2, notes: B(
        'E2:2 E2 E2 E2 E2 E2 E2 E2', 'C2:2 C2 C2 C2 C2 C2 C2 C2', 'D2:2 D2 D2 D2 D2 D2 D2 D2', 'E2:2 E2 E2 E2 E2 E2 E2 E2') },
      { id: 'drum', kind: 'drum', vol: 0.11, pat: rep(4, 'k.h.s.h.k.k.s.hh') },
      { id: 'crash', kind: 'drum', vol: 0.06, pat: rep(4, 'c...............') },
      { id: 'hat', kind: 'drum', vol: 0.05, pat: rep(4, 'hhhhhhhhhhhhhhhh'), layer: 'rush' }
    ]
  };

  // ============ 精算：しみじみ、オルゴール ============
  S.result = {
    bpm: 88, steps: 128,
    tracks: [
      { id: 'mel', inst: 'bell', vol: 0.13, notes: B(
        'E5:4 G5:4 C6:4 G5:4', 'E5:4 A5:4 C6:4 A5:4', 'F5:4 A5:4 C6:4 A5:4', 'D5:4 G5:4 B5:4 G5:4',
        'C6:8 G5:4 E5:4', 'A5:8 E5:4 C5:4', 'F5:4 G5:4 A5:4 B5:4', 'C6:16') },
      { id: 'pad', inst: 'pad', vol: 0.06, notes: B(
        'C3+E3+G3:16', 'A2+C3+E3:16', 'F2+A2+C3:16', 'G2+B2+D3:16', 'C3+E3+G3:16', 'A2+C3+E3:16', 'F2+A2+C3:8 G2+B2+D3:8', 'C3+E3+G3:16') },
      { id: 'bass', inst: 'bass', vol: 0.1, notes: B(
        'C3:8 G3:8', 'A2:8 E3:8', 'F2:8 C3:8', 'G2:8 D3:8', 'C3:8 G3:8', 'A2:8 E3:8', 'F2:8 G2:8', 'C3:16') }
    ]
  };

  // ============ ショップ・出店移転：弾む ============
  S.shop = {
    bpm: 120, steps: 64,
    tracks: [
      { id: 'mel', inst: 'pluck', vol: 0.14, notes: B(
        'C5:2 E5:2 G5:2 E5:2 C5:2 E5:2 G5:4', 'A4:2 C5:2 F5:2 C5:2 A4:2 C5:2 F5:4',
        'B4:2 D5:2 G5:2 D5:2 B4:2 D5:2 G5:4', 'E5:2 G5:2 C6:2 G5:2 E5:4 C5:4') },
      { id: 'bass', inst: 'bass', vol: 0.13, notes: B(
        'C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 G3:2', 'F2:2 C3:2 F2:2 C3:2 F2:2 C3:2 F2:2 C3:2',
        'G2:2 D3:2 G2:2 D3:2 G2:2 D3:2 G2:2 D3:2', 'C3:2 G3:2 C3:2 G3:2 C3:4 r:4') },
      { id: 'arp', inst: 'arp', vol: 0.05, notes: B(
        'E4:1 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4 E4 G4 C5 G4', 'F4:1 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4',
        'G4:1 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4', 'E4:1 G4 C5 G4 E4 G4 C5 G4 E4:8') },
      { id: 'drum', kind: 'drum', vol: 0.06, pat: rep(4, 'k.h.s.h.k.h.s.h.') }
    ]
  };

  // ============ エンディング：大団円 ============
  var endMel = B(
    'G4:4 C5:4 E5:4 G5:4', 'D5:4 G5:4 B5:4 D6:4', 'C5:4 E5:4 A5:4 C6:4', 'B4:4 E5:4 G5:4 B5:4',
    'A4:4 C5:4 F5:4 A5:4', 'G4:4 C5:4 E5:4 G5:4', 'F5:4 A5:4 C6:4 F6:4', 'G5:8 B5:4 D6:4',
    'E6:6 D6:2 C6:4 G5:4', 'D6:6 C6:2 B5:4 G5:4', 'C6:6 B5:2 A5:4 E5:4', 'F5:4 G5:4 A5:4 B5:4',
    'E6:6 D6:2 C6:4 G5:4', 'B5:6 A5:2 G5:4 E5:4', 'A5:4 C6:4 F6:4 C6:4', 'G5:4 B5:4 D6:4 B5:2 D6:2');
  S.ending = {
    bpm: 118, steps: 256,
    tracks: [
      { id: 'mel', inst: 'lead', vol: 0.15, notes: endMel },
      { id: 'harm', inst: 'lead50', vol: 0.06, notes: B(
        'E4:4 G4:4 C5:4 E5:4', 'B4:4 D5:4 G5:4 B5:4', 'A4:4 C5:4 E5:4 A5:4', 'G4:4 B4:4 E5:4 G5:4',
        'F4:4 A4:4 C5:4 F5:4', 'E4:4 G4:4 C5:4 E5:4', 'C5:4 F5:4 A5:4 C6:4', 'D5:8 G5:4 B5:4',
        'C6:6 B5:2 A5:4 E5:4', 'B5:6 A5:2 G5:4 D5:4', 'A5:6 G5:2 F5:4 C5:4', 'D5:4 E5:4 F5:4 G5:4',
        'C6:6 B5:2 A5:4 E5:4', 'G5:6 F5:2 E5:4 C5:4', 'F5:4 A5:4 C6:4 A5:4', 'D5:4 G5:4 B5:4 G5:2 B5:2') },
      { id: 'bass', inst: 'bass2', vol: 0.12, notes: B(
        'C3:2 C3 G3 G3 C3 C3 G3 G3', 'G2:2 G2 D3 D3 G2 G2 D3 D3', 'A2:2 A2 E3 E3 A2 A2 E3 E3', 'E2:2 E2 B2 B2 E2 E2 B2 B2',
        'F2:2 F2 C3 C3 F2 F2 C3 C3', 'C3:2 C3 G3 G3 C3 C3 G3 G3', 'F2:2 F2 C3 C3 F2 F2 C3 C3', 'G2:2 G2 D3 D3 G2 G2 D3 D3',
        'C3:2 C3 G3 G3 C3 C3 G3 G3', 'G2:2 G2 D3 D3 G2 G2 D3 D3', 'A2:2 A2 E3 E3 A2 A2 E3 E3', 'F2:4 G2:4 A2:4 B2:4',
        'C3:2 C3 G3 G3 C3 C3 G3 G3', 'E2:2 E2 B2 B2 E2 E2 B2 B2', 'F2:2 F2 C3 C3 F2 F2 C3 C3', 'G2:4 G2:4 G2:4 G2:4') },
      { id: 'bell', inst: 'bell', vol: 0.06, notes: rep(16, 'C6:4 r:4 G6:4 r:4') },
      { id: 'drum', kind: 'drum', vol: 0.08, pat: rep(16, 'k.h.s.h.k.k.s.hh') },
      { id: 'taiko', kind: 'drum', vol: 0.09, pat: rep(16, 'd...d...d..dd...') },
      { id: 'crash', kind: 'drum', vol: 0.06, pat: rep(16, 'c...............') }
    ]
  };

  // ============ ゲームオーバー：もの悲しいコト ============
  S.gameover = {
    bpm: 60, steps: 64,
    tracks: [
      { id: 'mel', inst: 'koto', vol: 0.15, notes: B(
        'A4:8 G4:4 F4:4', 'E4:8 D4:4 C4:4', 'D4:8 E4:8', 'A3:12 r:4') },
      { id: 'pad', inst: 'pad', vol: 0.07, notes: B('A3+C4+E4:16', 'A3+C4+E4:16', 'D3+F3+A3:8 E3+G#3+B3:8', 'A3+C4+E4:16') },
      { id: 'bass', inst: 'bass', vol: 0.1, notes: B('A2:16', 'A2:16', 'D3:8 E3:8', 'A2:16') }
    ]
  };

  // 開発者向け：曲名一覧
  RP.songNames = Object.keys(S);
})(window.RP);
