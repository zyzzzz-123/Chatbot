// 48-card Hanafuda deck definition for Koi-Koi.
// Each card: { id, month (1-12), type: 'hikari'|'tane'|'tanzaku'|'kasu',
//   ribbon: 'aka'|'ao'|'red'|null, name, special: optional flag }
// "special" markers are used by yaku detection (e.g. sake cup, rain man).

export const FLOWERS = {
  1:  { name: 'Pine',          jp: '松',   kanji: '一月' },
  2:  { name: 'Plum',          jp: '梅',   kanji: '二月' },
  3:  { name: 'Cherry',        jp: '桜',   kanji: '三月' },
  4:  { name: 'Wisteria',      jp: '藤',   kanji: '四月' },
  5:  { name: 'Iris',          jp: '菖蒲', kanji: '五月' },
  6:  { name: 'Peony',         jp: '牡丹', kanji: '六月' },
  7:  { name: 'Bush Clover',   jp: '萩',   kanji: '七月' },
  8:  { name: 'Pampas',        jp: '芒',   kanji: '八月' },
  9:  { name: 'Chrysanthemum', jp: '菊',   kanji: '九月' },
  10: { name: 'Maple',         jp: '紅葉', kanji: '十月' },
  11: { name: 'Willow',        jp: '柳',   kanji: '十一月' },
  12: { name: 'Paulownia',     jp: '桐',   kanji: '十二月' },
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
  card(1, 1, 'hikari',  '鶴に朝日'),
  card(1, 2, 'tanzaku', '赤短「あかよろし」', { ribbon: 'aka' }),
  card(1, 3, 'kasu',    '松のカス1'),
  card(1, 4, 'kasu',    '松のカス2'),
  // 2 — Plum
  card(2, 1, 'tane',    '梅に鶯'),
  card(2, 2, 'tanzaku', '赤短「あかよろし」', { ribbon: 'aka' }),
  card(2, 3, 'kasu',    '梅のカス1'),
  card(2, 4, 'kasu',    '梅のカス2'),
  // 3 — Cherry
  card(3, 1, 'hikari',  '桜に幕', { hanami: true }),
  card(3, 2, 'tanzaku', '赤短「みよしの」', { ribbon: 'aka' }),
  card(3, 3, 'kasu',    '桜のカス1'),
  card(3, 4, 'kasu',    '桜のカス2'),
  // 4 — Wisteria
  card(4, 1, 'tane',    '藤に不如帰'),
  card(4, 2, 'tanzaku', '藤の赤短',          { ribbon: 'red' }),
  card(4, 3, 'kasu',    '藤のカス1'),
  card(4, 4, 'kasu',    '藤のカス2'),
  // 5 — Iris
  card(5, 1, 'tane',    '菖蒲に八ツ橋'),
  card(5, 2, 'tanzaku', '菖蒲の赤短',        { ribbon: 'red' }),
  card(5, 3, 'kasu',    '菖蒲のカス1'),
  card(5, 4, 'kasu',    '菖蒲のカス2'),
  // 6 — Peony
  card(6, 1, 'tane',    '牡丹に蝶',          { inoshikachou: true }),
  card(6, 2, 'tanzaku', '青短',              { ribbon: 'ao' }),
  card(6, 3, 'kasu',    '牡丹のカス1'),
  card(6, 4, 'kasu',    '牡丹のカス2'),
  // 7 — Bush Clover
  card(7, 1, 'tane',    '萩に猪',            { inoshikachou: true }),
  card(7, 2, 'tanzaku', '萩の赤短',          { ribbon: 'red' }),
  card(7, 3, 'kasu',    '萩のカス1'),
  card(7, 4, 'kasu',    '萩のカス2'),
  // 8 — Pampas
  card(8, 1, 'hikari',  '芒に月',            { tsukimi: true }),
  card(8, 2, 'tane',    '芒に雁'),
  card(8, 3, 'kasu',    '芒のカス1'),
  card(8, 4, 'kasu',    '芒のカス2'),
  // 9 — Chrysanthemum
  card(9, 1, 'tane',    '菊に盃',            { sake: true }),
  card(9, 2, 'tanzaku', '青短',              { ribbon: 'ao' }),
  card(9, 3, 'kasu',    '菊のカス1'),
  card(9, 4, 'kasu',    '菊のカス2'),
  // 10 — Maple
  card(10, 1, 'tane',   '紅葉に鹿',          { inoshikachou: true }),
  card(10, 2, 'tanzaku','青短',              { ribbon: 'ao' }),
  card(10, 3, 'kasu',   '紅葉のカス1'),
  card(10, 4, 'kasu',   '紅葉のカス2'),
  // 11 — Willow
  card(11, 1, 'hikari', '柳に小野道風',      { rain: true }),
  card(11, 2, 'tane',   '柳に燕'),
  card(11, 3, 'tanzaku','柳の赤短',          { ribbon: 'red' }),
  card(11, 4, 'kasu',   '柳に雷'),
  // 12 — Paulownia
  card(12, 1, 'hikari', '桐に鳳凰'),
  card(12, 2, 'kasu',   '桐のカス1'),
  card(12, 3, 'kasu',   '桐のカス2'),
  card(12, 4, 'kasu',   '桐のカス3'),
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
  hikari:  { jp: '光',   en: 'Bright' },
  tane:    { jp: '種',   en: 'Animal' },
  tanzaku: { jp: '短',   en: 'Ribbon' },
  kasu:    { jp: 'カス', en: 'Plain'  },
};
