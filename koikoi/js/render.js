// SVG card renderer. Self-contained, no external assets.
// Each card is drawn as a stylised hanafuda card with a flower glyph,
// month indicator, and prominent type label so they're recognisable
// during play even at small sizes.

import { CARD_BY_ID, FLOWER_COLOR, FLOWERS, TYPE_LABEL } from './cards.js';

const W = 100, H = 160;

const RIBBON_COLOR = { aka: '#c93636', ao: '#2a4f9e', red: '#c93636' };
const RIBBON_TEXT  = { aka: 'あかよろし', ao: '', red: '' };

function flowerGlyph(month) {
  // Simple stylised flower drawn with circles/strokes per month.
  const c = FLOWER_COLOR[month];
  const g = (() => {
    switch (month) {
      case 1:  return `<g stroke="#0d4424" stroke-width="2" fill="${c}">
        <path d="M50 90 Q35 70 30 50 M50 90 Q65 70 70 50 M50 90 V40" fill="none"/>
        <circle cx="30" cy="50" r="6"/><circle cx="70" cy="50" r="6"/><circle cx="50" cy="40" r="7"/>
      </g>`;
      case 2:  return `<g fill="${c}" stroke="#7a1d3f" stroke-width="1">
        <circle cx="50" cy="60" r="10"/><circle cx="38" cy="75" r="8"/><circle cx="62" cy="75" r="8"/>
        <circle cx="44" cy="50" r="7"/><circle cx="56" cy="50" r="7"/>
      </g>`;
      case 3:  return `<g fill="${c}" stroke="#a4496b" stroke-width="1">
        ${[[50,55],[36,68],[64,68],[44,82],[56,82]].map(([x,y]) =>
          `<g transform="translate(${x},${y})">
            ${[0,72,144,216,288].map(a => `<ellipse cx="0" cy="-7" rx="3.5" ry="6" transform="rotate(${a})"/>`).join('')}
            <circle r="2" fill="#f6e27a"/>
          </g>`).join('')}
      </g>`;
      case 4:  return `<g fill="${c}" stroke="#3a1d56" stroke-width="1">
        ${[55,68,81,94,107].map((y,i) => `<ellipse cx="${50+(i%2?6:-6)}" cy="${y}" rx="6" ry="4"/>`).join('')}
      </g>`;
      case 5:  return `<g fill="${c}" stroke="#1d3868" stroke-width="1">
        <path d="M50 50 Q40 75 30 100 M50 50 Q60 75 70 100 M50 50 V100" stroke="${c}" stroke-width="3" fill="none"/>
        <ellipse cx="50" cy="55" rx="9" ry="14"/>
      </g>`;
      case 6:  return `<g fill="${c}" stroke="#6b1d1d" stroke-width="1">
        <circle cx="50" cy="70" r="14"/>
        ${[0,60,120,180,240,300].map(a =>
          `<ellipse cx="50" cy="${70-18}" rx="7" ry="10" transform="rotate(${a} 50 70)"/>`).join('')}
        <circle cx="50" cy="70" r="5" fill="#f6e27a"/>
      </g>`;
      case 7:  return `<g fill="${c}" stroke="#3f1d56" stroke-width="1">
        ${[[40,60],[60,60],[35,78],[50,78],[65,78],[42,96],[58,96]].map(([x,y]) =>
          `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}
      </g>`;
      case 8:  return `<g stroke="#5a4a1d" stroke-width="2" fill="none">
        ${[35,45,55,65,75].map(x => `<path d="M${x} 110 Q${x} 70 ${x+(x<55?-5:5)} 50"/>`).join('')}
        <circle cx="50" cy="40" r="14" fill="#fff8d8" stroke="#000" stroke-width="1"/>
      </g>`;
      case 9:  return `<g fill="${c}" stroke="#7a4d10" stroke-width="1">
        <circle cx="50" cy="70" r="12"/>
        ${Array.from({length:12}).map((_,i)=>{
          const a = i*30;
          return `<ellipse cx="50" cy="${70-16}" rx="3.5" ry="9" transform="rotate(${a} 50 70)"/>`;
        }).join('')}
      </g>`;
      case 10: return `<g fill="${c}" stroke="#6b1d1d" stroke-width="1">
        ${[[50,55],[38,72],[62,72],[42,92],[58,92]].map(([x,y]) =>
          `<g transform="translate(${x},${y})">
            ${[0,72,144,216,288].map(a => `<path d="M0 0 L0 -8 L3 -3 Z" transform="rotate(${a})"/>`).join('')}
          </g>`).join('')}
      </g>`;
      case 11: return `<g stroke="#2d4a1d" stroke-width="2" fill="${c}">
        <path d="M50 30 Q40 70 30 110 M50 30 Q50 70 50 110 M50 30 Q60 70 70 110" fill="none"/>
        ${[[34,55],[50,65],[66,55],[38,85],[50,95],[62,85]].map(([x,y]) =>
          `<ellipse cx="${x}" cy="${y}" rx="3" ry="6"/>`).join('')}
      </g>`;
      case 12: return `<g fill="${c}" stroke="#2a1a4a" stroke-width="1">
        ${[[50,45],[36,65],[64,65],[44,85],[56,85],[50,100]].map(([x,y]) =>
          `<g transform="translate(${x},${y})">
            <ellipse cx="0" cy="0" rx="6" ry="9"/>
            <line x1="0" y1="0" x2="0" y2="9" stroke="#2a1a4a"/>
          </g>`).join('')}
      </g>`;
      default: return '';
    }
  })();
  return g;
}

function ribbonOverlay(card) {
  if (!card.ribbon) return '';
  const color = RIBBON_COLOR[card.ribbon];
  const text = RIBBON_TEXT[card.ribbon] || '';
  return `
    <rect x="14" y="42" width="72" height="22" rx="3" fill="${color}" opacity="0.92"/>
    ${text ? `<text x="50" y="57" text-anchor="middle" font-size="9" fill="#fff7d6" font-family="serif">${text}</text>` : ''}
  `;
}

function specialOverlay(card) {
  if (card.sake)  return `<text x="50" y="135" text-anchor="middle" font-size="10" font-weight="700" fill="#7a4d10">盃</text>`;
  if (card.rain)  return `<text x="50" y="135" text-anchor="middle" font-size="10" font-weight="700" fill="#1c2c4a">雨</text>`;
  if (card.tsukimi) return `<text x="50" y="135" text-anchor="middle" font-size="10" font-weight="700" fill="#5a4a1d">月</text>`;
  if (card.hanami)  return `<text x="50" y="135" text-anchor="middle" font-size="10" font-weight="700" fill="#a4496b">幕</text>`;
  if (card.inoshikachou) return `<text x="50" y="135" text-anchor="middle" font-size="9" fill="#3f1d1d">猪鹿蝶</text>`;
  return '';
}

export function renderCard(cardId, opts = {}) {
  const card = CARD_BY_ID[cardId];
  if (!card) return '';
  const flower = FLOWERS[card.month];
  const typeLbl = TYPE_LABEL[card.type].jp;
  const baseColor = FLOWER_COLOR[card.month];
  const cls = [
    'hf-card',
    `hf-type-${card.type}`,
    opts.selected ? 'hf-selected' : '',
    opts.matchable ? 'hf-matchable' : '',
    opts.dim ? 'hf-dim' : '',
  ].filter(Boolean).join(' ');

  return `<svg viewBox="0 0 ${W} ${H}" class="${cls}" data-card="${card.id}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="bg-${card.id}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#fff8e6"/>
        <stop offset="1" stop-color="#f3e6c0"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="${W-4}" height="${H-4}" rx="6" ry="6" fill="url(#bg-${card.id})" stroke="#1a1a1a" stroke-width="2"/>
    <rect x="6" y="6" width="${W-12}" height="${H-12}" rx="4" ry="4" fill="none" stroke="${baseColor}" stroke-width="1" opacity="0.5"/>
    <text x="9" y="18" font-size="10" font-weight="700" fill="#1a1a1a">${flower.kanji}</text>
    <text x="${W-9}" y="18" text-anchor="end" font-size="11" font-weight="700" fill="${baseColor}">${typeLbl}</text>
    ${flowerGlyph(card.month)}
    ${ribbonOverlay(card)}
    ${specialOverlay(card)}
    <text x="50" y="${H-8}" text-anchor="middle" font-size="8" fill="#3a3a3a" font-family="serif">${flower.jp}</text>
  </svg>`;
}

export function renderBack() {
  return `<svg viewBox="0 0 ${W} ${H}" class="hf-card hf-back" preserveAspectRatio="xMidYMid meet">
    <rect x="2" y="2" width="${W-4}" height="${H-4}" rx="6" ry="6" fill="#7a0e1f" stroke="#1a1a1a" stroke-width="2"/>
    <g fill="none" stroke="#f6c33b" stroke-width="1.2" opacity="0.85">
      ${Array.from({length:6}).map((_,i)=>`<circle cx="50" cy="80" r="${10+i*9}"/>`).join('')}
    </g>
    <text x="50" y="86" text-anchor="middle" font-size="22" font-weight="800" fill="#f6c33b" font-family="serif">花</text>
  </svg>`;
}
