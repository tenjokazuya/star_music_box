/* 飲食店のメニュー。食べても能力は変わらない。lines は食べる度に順に出る主人公のひとこと */
(function () {
  'use strict';
  var RR = window.RR;
  var D = RR.Data = RR.Data || {};
  D.foodShops = {
    ramen: {
      name: 'ラーメン', clerk: 'おやじ', greet: 'へい らっしゃい!', thanks: 'まいど!',
      items: [
        { id: 'shoyu', name: 'しょうゆ ラーメン', price: 600, sfx: 'eat', lines: ['すんだ スープに ほそめん。|ほっと する あじだ。', 'なんど たべても あきない。', 'ネギを おおめに して くれた。'] },
        { id: 'miso', name: 'みそ ラーメン', price: 700, sfx: 'eat', lines: ['こってりした みそが からだに しみる。', 'ひえた よるには これに かぎる。', 'スープまで ぜんぶ のんで しまった。'] },
        { id: 'tonkotsu', name: 'とんこつ ラーメン', price: 750, sfx: 'eat', lines: ['どっしりした スープだ。|あしたの あさまで もちそう。', 'かえだまを たのみたく なる。'] },
        { id: 'chahan', name: 'チャーハン', price: 550, sfx: 'eat', lines: ['パラパラで いい においだ。', 'レンゲが とまらない。'] },
        { id: 'gyoza', name: 'ぎょうざ', price: 300, sfx: 'eat', lines: ['パリッと やけてる。', 'ラーメンと いっしょだと なお いい。'] }
      ]
    },
    cafe: {
      name: 'きっさ ゆうやけ', clerk: 'マスター', greet: 'いらっしゃい。すきな せきに どうぞ。', thanks: 'ありがとう ございました。',
      items: [
        { id: 'blend', name: 'ブレンド コーヒー', price: 400, sfx: 'drink', lines: ['にがみが ちょうどいい。|あたまが さえてきた。', 'ここの コーヒーは いつも おなじ あじだ。', 'まどの そとを くるまが とおって いった。'] },
        { id: 'aulait', name: 'カフェオレ', price: 450, sfx: 'drink', lines: ['やさしい あまさだ。', 'ミルクが おおめで ほっとする。'] },
        { id: 'napolitan', name: 'ナポリタン', price: 700, sfx: 'eat', lines: ['ケチャップの あじが なつかしい。', 'ピーマンも ちゃんと はいってる。'] },
        { id: 'hotcake', name: 'ホットケーキ', price: 550, sfx: 'eat', lines: ['バターが とけて いい かおり。', '2まい かさねが うれしい。'] },
        { id: 'soda', name: 'クリームソーダ', price: 500, sfx: 'drink', lines: ['みどりいろが きれいだ。', 'アイスを いつ たべるか まよう。'] }
      ]
    },
    konbini: {
      name: 'コンビニ', clerk: 'てんいん', greet: 'いらっしゃいませー。', thanks: 'ありがとう ございましたー。',
      items: [
        { id: 'onigiri', name: 'おにぎり', price: 150, sfx: 'eat', lines: ['しゃけ だった。あたり。', 'のりが パリパリだ。', 'うめぼしで めが さめた。'] },
        { id: 'karaage', name: 'からあげ', price: 250, sfx: 'eat', lines: ['あつあつだ。|ねこじたには きつい。', 'ひとつ おまけ して もらえた。'] },
        { id: 'nikuman', name: 'にくまん', price: 180, sfx: 'eat', lines: ['ふかふかで あったかい。', 'よるの にくまんは なぜか うまい。'] },
        { id: 'cupmen', name: 'カップめん', price: 200, sfx: 'eat', lines: ['3ぷん まてずに ふたを あけた。', 'ちょっと かためも わるくない。'] },
        { id: 'ice', name: 'アイス', price: 150, sfx: 'eat', lines: ['よるに たべる アイスは とくべつだ。', 'あたりは でなかった。'] },
        { id: 'energy', name: 'エナジードリンク', price: 220, sfx: 'drink', lines: ['めが ぱっちり した。', 'のみすぎには きを つけよう。'] }
      ]
    },
    vending: {
      name: 'じどうはんばいき', clerk: '', greet: '', thanks: '',
      items: [
        { id: 'cancoffee', name: 'かん コーヒー', price: 120, sfx: 'drink', lines: ['あまい。けど これが いい。', 'てが あたたまった。'] },
        { id: 'tea', name: 'おちゃ', price: 120, sfx: 'drink', lines: ['すっきり した。'] },
        { id: 'sports', name: 'スポーツドリンク', price: 150, sfx: 'drink', lines: ['のどが うるおった。'] },
        { id: 'corn', name: 'コーンスープ', price: 130, sfx: 'drink', lines: ['さいごの コーンが でてこない...', 'ふってから のむのが コツ らしい。'] }
      ]
    }
  };
})();
