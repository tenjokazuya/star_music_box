/* 実績（達成演出）。check(st, svc) が true になった瞬間に一度だけ解除して演出する。 */
(function (RP) {
  'use strict';

  function owned(st, prefix) {
    var n = 0;
    Object.keys(st.items).forEach(function (k) { if (k.indexOf(prefix) === 0 && st.items[k] > 0) { n++; } });
    return n;
  }

  RP.ACH = [
    { id: 'first_perfect', name: 'はじめてのPERFECT', desc: '★3の一杯を提供した', check: function (st, s) { return st.stats.perfect > 0 || (s && s.stats.stars[3] > 0); } },
    { id: 'combo5', name: '連続成功', desc: '5コンボを達成した', check: function (st, s) { return st.stats.bestCombo >= 5 || (s && s.stats.bestCombo >= 5); } },
    { id: 'combo20', name: 'ノンストップ', desc: '20コンボを達成した', check: function (st, s) { return st.stats.bestCombo >= 20 || (s && s.stats.bestCombo >= 20); } },
    { id: 'clean_day', name: '完璧な一日', desc: '10人以上を、ひとりも怒らせず取りこぼさず営業した', check: function (st, s) { return !!(s && s.finished && s.stats.served >= 10 && s.stats.angry === 0 && s.stats.lost === 0); } },
    { id: 'critic', name: '評論家をうならせた', desc: 'グルメ評論家に★3を出した', check: function (st, s) { return !!(s && s.stats.critics > 0 && s.stats.repDelta > 2); } },
    { id: 'day10', name: '十日目の灯り', desc: '10日間営業した', check: function (st) { return st.stats.days >= 10; } },
    { id: 'day30', name: '一か月の味', desc: '30日間営業した', check: function (st) { return st.stats.days >= 30; } },
    { id: 'day100', name: '百夜の屋台', desc: '100日間営業した', check: function (st) { return st.stats.days >= 100; } },
    { id: 'tier2', name: '屋台卒業', desc: '商店街に出店した', check: function (st) { return st.tier >= 2; } },
    { id: 'tier3', name: '駅前の顔', desc: '駅前に出店した', check: function (st) { return st.tier >= 3; } },
    { id: 'tier4', name: '夜の街の人気者', desc: '繁華街に出店した', check: function (st) { return st.tier >= 4; } },
    { id: 'tier5', name: '摩天楼の主', desc: '大都会に出店した', check: function (st) { return st.tier >= 5; } },
    { id: 'tier6', name: '天下一', desc: '全国チェーンの頂点に立った', check: function (st) { return st.tier >= 6; } },
    { id: 'rich1', name: '小金持ち', desc: '所持金が10万円を超えた', check: function (st) { return st.money >= 100000; } },
    { id: 'rich2', name: '百万長者', desc: '所持金が100万円を超えた', check: function (st) { return st.money >= 1000000; } },
    { id: 'rich3', name: '億り人', desc: '所持金が1億円を超えた', check: function (st) { return st.money >= 100000000; } },
    { id: 'spender', name: '散財の達人', desc: '合計100万円を使った', check: function (st) { return st.stats.spent >= 1000000; } },
    { id: 'decor5', name: '飾りつけ好き', desc: '飾り・演出を5種類そろえた', check: function (st) { return owned(st, 'd_') >= 5; } },
    { id: 'staff3', name: '頼れる仲間たち', desc: '従業員を3人雇った', check: function (st) { return owned(st, 'staff_') >= 3; } },
    { id: 'donate', name: '商店街の太っ腹', desc: '商店街へ寄付した', check: function (st) { return (st.stats.endless.e_donate || 0) > 0; } },
    { id: 'bankrupt', name: '七転び八起き', desc: '一度倒産して、立ち上がった', check: function (st) { return st.stats.bankrupt > 0 && st.stats.days > 0; } },
    { id: 'world', name: 'ラーメンで世界へ', desc: '海外に出店した', check: function (st) { return (st.stats.endless.e_world || 0) > 0; } },
    { id: 'space', name: '宇宙のラーメン屋', desc: '宇宙ラーメン計画を始めた', check: function (st) { return (st.stats.endless.e_space || 0) > 0; } }
  ];
})(window.RP);
