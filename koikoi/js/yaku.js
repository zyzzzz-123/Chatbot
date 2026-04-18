// Yaku detection. Operates on a list of captured card IDs.
// Returns array of { key, name, points }. Only the highest-scoring
// member of mutually-exclusive families is included (e.g. Gokou over Sankou).

import { CARD_BY_ID } from './cards.js';

function group(captured) {
  const cards = captured.map(id => CARD_BY_ID[id]);
  return {
    cards,
    hikari:   cards.filter(c => c.type === 'hikari'),
    tane:     cards.filter(c => c.type === 'tane'),
    tanzaku:  cards.filter(c => c.type === 'tanzaku'),
    kasu:     cards.filter(c => c.type === 'kasu'),
  };
}

export function evaluateYaku(captured) {
  const g = group(captured);
  const yaku = [];

  // --- Hikari family (mutually exclusive) ---
  const brights = g.hikari;
  const hasRain = brights.some(c => c.rain);
  if (brights.length === 5) {
    yaku.push({ key: 'gokou', name: '五光', points: 10 });
  } else if (brights.length === 4) {
    if (hasRain) yaku.push({ key: 'ame-shikou', name: '雨四光', points: 7 });
    else         yaku.push({ key: 'shikou',     name: '四光',   points: 8 });
  } else if (brights.length === 3 && !hasRain) {
    yaku.push({ key: 'sankou', name: '三光', points: 5 });
  }

  // --- Tane family ---
  const inoshikachou = g.tane.filter(c => c.inoshikachou).length === 3;
  if (inoshikachou) {
    const extra = Math.max(0, g.tane.length - 3);
    yaku.push({ key: 'inoshikachou', name: '猪鹿蝶', points: 5 + extra });
  } else if (g.tane.length >= 5) {
    yaku.push({ key: 'tane', name: '种', points: 1 + (g.tane.length - 5) });
  }

  const sake = g.tane.find(c => c.sake);
  const cherry = g.hikari.find(c => c.hanami);
  const moon = g.hikari.find(c => c.tsukimi);
  if (sake && cherry) yaku.push({ key: 'hanami', name: '花见酒', points: 5 });
  if (sake && moon)   yaku.push({ key: 'tsukimi', name: '月见酒', points: 5 });

  // --- Tanzaku family ---
  const aka = g.tanzaku.filter(c => c.ribbon === 'aka').length === 3;
  const ao  = g.tanzaku.filter(c => c.ribbon === 'ao').length === 3;
  if (aka) yaku.push({ key: 'akatan', name: '赤短', points: 5 });
  if (ao)  yaku.push({ key: 'aotan',  name: '青短', points: 5 });
  if (g.tanzaku.length >= 5) {
    yaku.push({ key: 'tan', name: '短', points: 1 + (g.tanzaku.length - 5) });
  }

  // --- Kasu ---
  if (g.kasu.length >= 10) {
    yaku.push({ key: 'kasu', name: '皮', points: 1 + (g.kasu.length - 10) });
  }

  return yaku;
}

export function totalPoints(yakuList) {
  return yakuList.reduce((s, y) => s + y.points, 0);
}

// Compare current yaku list to previous to detect new completions or
// point increases (relevant for koi-koi continuation scoring).
export function hasNewOrIncreased(prev, curr) {
  const map = new Map(prev.map(y => [y.key, y.points]));
  for (const y of curr) {
    const p = map.get(y.key);
    if (p === undefined || y.points > p) return true;
  }
  return false;
}
