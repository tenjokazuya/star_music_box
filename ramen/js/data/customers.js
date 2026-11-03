/* 客のタイプと見た目。w=出現の重み、pat=忍耐倍率、tip=チップ倍率。
 * soup/hard は優先する味・硬さ（重み）。tops=具の個数範囲。sides=サイドを頼む確率。 */
(function (RP) {
  'use strict';

  RP.CUSTOMERS = {
    types: [
      { id: 'salaryman', name: '会社員', w: 30, pat: 1.0, tip: 1.0, tops: [0, 2], sides: { gyoza: 0.35, beer: 0.30, rice: 0.15 },
        soup: { shoyu: 3, miso: 2, shio: 1, tonkotsu: 2 }, hard: { futsu: 3, katame: 2, bari: 1, yawa: 1 },
        bodies: ['suit', 'suit', 'shirt'], hairs: ['short', 'side', 'bald'] },
      { id: 'student', name: '学生', w: 20, pat: 0.85, tip: 0.6, tops: [0, 3], sides: { gyoza: 0.25, beer: 0, rice: 0.6 },
        soup: { shoyu: 2, miso: 2, shio: 1, tonkotsu: 3 }, hard: { futsu: 2, katame: 2, bari: 2, yawa: 1 },
        bodies: ['gakuran', 'tee', 'tee'], hairs: ['short', 'spiky', 'bob'] },
      { id: 'ol', name: 'OL', w: 16, pat: 1.0, tip: 1.1, tops: [0, 2], sides: { gyoza: 0.40, beer: 0.20, rice: 0.05 },
        soup: { shoyu: 1, miso: 1, shio: 3, tonkotsu: 1 }, hard: { futsu: 3, katame: 1, bari: 0, yawa: 2 },
        bodies: ['blouse', 'blouse', 'dress'], hairs: ['bob', 'long', 'bun'] },
      { id: 'worker', name: '職人さん', w: 14, pat: 0.9, tip: 1.3, tops: [1, 3], sides: { gyoza: 0.5, beer: 0.45, rice: 0.5 },
        soup: { shoyu: 2, miso: 3, shio: 0, tonkotsu: 3 }, hard: { futsu: 2, katame: 2, bari: 3, yawa: 0 },
        bodies: ['overall', 'tee'], hairs: ['towel', 'spiky', 'short'] },
      { id: 'oldman', name: '常連のおじさん', w: 10, pat: 1.35, tip: 1.6, tops: [1, 2], sides: { gyoza: 0.5, beer: 0.5, rice: 0.1 },
        soup: { shoyu: 5, miso: 1, shio: 2, tonkotsu: 0 }, hard: { futsu: 2, katame: 1, bari: 0, yawa: 4 },
        bodies: ['haori', 'shirt'], hairs: ['bald', 'side'], minRep: 10 },
      { id: 'drunk', name: '酔っ払い', w: 8, pat: 0.8, tip: 1.8, tops: [0, 2], sides: { gyoza: 0.5, beer: 0.95, rice: 0 },
        soup: { shoyu: 2, miso: 2, shio: 1, tonkotsu: 1 }, hard: { futsu: 1, katame: 1, bari: 1, yawa: 3 },
        bodies: ['suit', 'shirt'], hairs: ['side', 'short'], late: true, tie: true },
      { id: 'sumo', name: '力士', w: 5, pat: 1.25, tip: 2.2, tops: [2, 4], sides: { gyoza: 0.9, beer: 0.3, rice: 0.9 },
        soup: { shoyu: 1, miso: 1, shio: 0, tonkotsu: 4 }, hard: { futsu: 3, katame: 1, bari: 0, yawa: 1 },
        bodies: ['sumo'], hairs: ['mage'], minTier: 3, big: true },
      { id: 'critic', name: 'グルメ評論家', w: 4, pat: 1.1, tip: 2.5, tops: [1, 3], sides: { gyoza: 0.2, beer: 0, rice: 0 },
        soup: { shoyu: 2, miso: 1, shio: 2, tonkotsu: 2 }, hard: { futsu: 1, katame: 3, bari: 1, yawa: 0 },
        bodies: ['blazer'], hairs: ['side', 'glasses'], minRep: 28, minTier: 2, critic: true },
      // エンディング後の世界で現れる客（e_world / e_space の購入回数で解禁）
      { id: 'tourist', name: '海外の観光客', w: 12, pat: 1.2, tip: 2.0, tops: [1, 3], sides: { gyoza: 0.6, beer: 0.4, rice: 0.3 },
        soup: { shoyu: 3, miso: 2, shio: 1, tonkotsu: 3 }, hard: { futsu: 3, katame: 2, bari: 1, yawa: 0 },
        bodies: ['tee', 'shirt', 'dress'], hairs: ['short', 'long', 'bun', 'spiky'], needs: 'e_world', minTier: 6 },
      { id: 'alien', name: '宇宙人', w: 8, pat: 1.5, tip: 3.5, tops: [2, 4], sides: { gyoza: 0.7, beer: 0.5, rice: 0.5 },
        soup: { shoyu: 1, miso: 1, shio: 1, tonkotsu: 2 }, hard: { futsu: 2, katame: 1, bari: 1, yawa: 1 },
        bodies: ['blazer', 'gakuran'], hairs: ['bald'], skin: '#88d878', needs: 'e_space', minTier: 6 }
    ],
    hairCols: ['#2a2230', '#2a2230', '#3a2a22', '#5a3a22', '#8a6a3a', '#b88a4a', '#6a6a7a', '#c8c8d0'],
    skins: ['skin', 'skin', 'skin', '#e8b088', '#d89868'],
    clothes: [
      ['#3c4a7c', '#28325a'], ['#6a3c3c', '#4a2828'], ['#3c6a4c', '#284a34'], ['#6a6a78', '#4a4a58'],
      ['#7c5a2c', '#5a4020'], ['#2c2c3c', '#1c1c28'], ['#8a3c6a', '#5a2848'], ['#3c7c8a', '#285a64']
    ]
  };

  RP.CUSTOMERS.type = function (id) {
    return RP.CUSTOMERS.types.filter(function (t) { return t.id === id; })[0];
  };
})(window.RP);
