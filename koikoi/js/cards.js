// 48-card Hanafuda deck definition for Koi-Koi.
// Each card: { id, month (1-12), type: 'hikari'|'tane'|'tanzaku'|'kasu',
//   ribbon: 'aka'|'ao'|'red'|null, name, special: optional flag }
// "special" markers are used by yaku detection (e.g. sake cup, rain man).

export const FLOWERS = {
  1:  { name: '松',   kanji: '一月' },
  2:  { name: '梅',   kanji: '二月' },
  3:  { name: '樱',   kanji: '三月' },
  4:  { name: '藤',   kanji: '四月' },
  5:  { name: '菖蒲', kanji: '五月' },
  6:  { name: '牡丹', kanji: '六月' },
  7:  { name: '胡枝子', kanji: '七月' },
  8:  { name: '芒',   kanji: '八月' },
  9:  { name: '菊',   kanji: '九月' },
  10: { name: '枫',   kanji: '十月' },
  11: { name: '柳',   kanji: '十一月' },
  12: { name: '桐',   kanji: '十二月' },
};

// month -> hex base color used in SVG card art
export const FLOWER_COLOR = {
  1: '#1f6b3a', 2: '#d6437a', 3: '#f2b6c6', 4: '#7d4ea1',
  5: '#3a64a3', 6: '#c43a3a', 7: '#7c4a8c', 8: '#c8b27a',
  9: '#e1a93b', 10: '#c2492c', 11: '#5b6e3e', 12: '#5a3a8a',
};

function card(month, idx, type, name, extra = {}) {
  return { id: `m${month}-${idx}`, month, type, name, ribbon: null, ...extra };
}

export const DECK = [
  // 1 — Pine
  card(1, 1, 'hikari',  '松上仙鹤'),
  card(1, 2, 'tanzaku', '松·诗笺',         { ribbon: 'aka' }),
  card(1, 3, 'kasu',    '松·皮一'),
  card(1, 4, 'kasu',    '松·皮二'),
  // 2 — Plum
  card(2, 1, 'tane',    '梅上莺'),
  card(2, 2, 'tanzaku', '梅·诗笺',         { ribbon: 'aka' }),
  card(2, 3, 'kasu',    '梅·皮一'),
  card(2, 4, 'kasu',    '梅·皮二'),
  // 3 — Cherry
  card(3, 1, 'hikari',  '樱下幔帐',          { hanami: true }),
  card(3, 2, 'tanzaku', '樱·诗笺',         { ribbon: 'aka' }),
  card(3, 3, 'kasu',    '樱·皮一'),
  card(3, 4, 'kasu',    '樱·皮二'),
  // 4 — Wisteria
  card(4, 1, 'tane',    '藤上杜鹃'),
  card(4, 2, 'tanzaku', '藤·赤短',         { ribbon: 'red' }),
  card(4, 3, 'kasu',    '藤·皮一'),
  card(4, 4, 'kasu',    '藤·皮二'),
  // 5 — Iris
  card(5, 1, 'tane',    '菖蒲八桥'),
  card(5, 2, 'tanzaku', '菖蒲·赤短',       { ribbon: 'red' }),
  card(5, 3, 'kasu',    '菖蒲·皮一'),
  card(5, 4, 'kasu',    '菖蒲·皮二'),
  // 6 — Peony
  card(6, 1, 'tane',    '牡丹上蝶',          { inoshikachou: true }),
  card(6, 2, 'tanzaku', '牡丹·青短',       { ribbon: 'ao' }),
  card(6, 3, 'kasu',    '牡丹·皮一'),
  card(6, 4, 'kasu',    '牡丹·皮二'),
  // 7 — Bush Clover
  card(7, 1, 'tane',    '胡枝子上猪',        { inoshikachou: true }),
  card(7, 2, 'tanzaku', '胡枝子·赤短',     { ribbon: 'red' }),
  card(7, 3, 'kasu',    '胡枝子·皮一'),
  card(7, 4, 'kasu',    '胡枝子·皮二'),
  // 8 — Pampas
  card(8, 1, 'hikari',  '芒草满月',          { tsukimi: true }),
  card(8, 2, 'tane',    '芒草飞雁'),
  card(8, 3, 'kasu',    '芒草·皮一'),
  card(8, 4, 'kasu',    '芒草·皮二'),
  // 9 — Chrysanthemum
  card(9, 1, 'tane',    '菊上酒杯',          { sake: true }),
  card(9, 2, 'tanzaku', '菊·青短',         { ribbon: 'ao' }),
  card(9, 3, 'kasu',    '菊·皮一'),
  card(9, 4, 'kasu',    '菊·皮二'),
  // 10 — Maple
  card(10, 1, 'tane',   '枫上鹿',            { inoshikachou: true }),
  card(10, 2, 'tanzaku','枫·青短',         { ribbon: 'ao' }),
  card(10, 3, 'kasu',   '枫·皮一'),
  card(10, 4, 'kasu',   '枫·皮二'),
  // 11 — Willow
  card(11, 1, 'hikari', '柳下小野道风',      { rain: true }),
  card(11, 2, 'tane',   '柳上燕'),
  card(11, 3, 'tanzaku','柳·赤短',         { ribbon: 'red' }),
  card(11, 4, 'kasu',   '柳上雷'),
  // 12 — Paulownia
  card(12, 1, 'hikari', '桐上凤凰'),
  card(12, 2, 'kasu',   '桐·皮一'),
  card(12, 3, 'kasu',   '桐·皮二'),
  card(12, 4, 'kasu',   '桐·皮三'),
];

export const CARD_BY_ID = Object.fromEntries(DECK.map(c => [c.id, c]));

export function newShuffledDeck(rng = Math.random) {
  const arr = DECK.map(c => c.id);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const TYPE_LABEL = {
  hikari:  { jp: '光', en: 'Bright', zh: '光' },
  tane:    { jp: '种', en: 'Animal', zh: '种' },
  tanzaku: { jp: '短', en: 'Ribbon', zh: '短' },
  kasu:    { jp: '皮', en: 'Plain',  zh: '皮' },
};
