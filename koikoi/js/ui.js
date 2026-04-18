import { renderCard, renderBack } from './render.js';
import { CARD_BY_ID, FLOWERS } from './cards.js';
import { totalPoints } from './yaku.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function setStatus(text, kind = 'info') {
  const el = $('#status');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
}

export function showLobby() {
  $('#lobby').classList.remove('hidden');
  $('#game').classList.add('hidden');
}
export function showGame() {
  $('#lobby').classList.add('hidden');
  $('#game').classList.remove('hidden');
}

function renderHand(cards, opts = {}) {
  if (!cards.length) return '<div class="empty">（空）</div>';
  return cards.map(id => id === '?'
    ? `<div class="card-slot">${renderBack()}</div>`
    : `<div class="card-slot${opts.matchableMonth && CARD_BY_ID[id].month === opts.matchableMonth ? ' is-pulse' : ''}" data-card="${id}">
         ${renderCard(id, { selected: opts.selectedId === id })}
       </div>`
  ).join('');
}

function renderField(field, highlightMonth) {
  if (!field.length) return '<div class="empty">（场上无牌）</div>';
  return field.map(id => {
    const c = CARD_BY_ID[id];
    const hl = highlightMonth && c.month === highlightMonth ? ' is-match' : '';
    return `<div class="card-slot${hl}" data-card="${id}">${renderCard(id)}</div>`;
  }).join('');
}

function renderCaptured(ids) {
  const groups = { hikari: [], tane: [], tanzaku: [], kasu: [] };
  for (const id of ids) groups[CARD_BY_ID[id].type].push(id);
  const order = ['hikari', 'tane', 'tanzaku', 'kasu'];
  const typeZh = { hikari: '光', tane: '种', tanzaku: '短', kasu: '皮' };
  return order.map(t => `
    <div class="cap-row cap-${t}">
      <span class="cap-label">${typeZh[t]}</span>
      <div class="cap-cards">
        ${groups[t].map(id => `<div class="card-slot mini">${renderCard(id)}</div>`).join('') || '<span class="dim">—</span>'}
      </div>
    </div>`).join('');
}

function renderYakuList(yaku) {
  if (!yaku.length) return '<span class="dim">暂无役</span>';
  return yaku.map(y => `<span class="yaku-chip">${y.name} <b>${y.points}</b></span>`).join('');
}

export function render(view, mySide, handlers) {
  const s = view.state;
  const opp = mySide === 'host' ? 'guest' : 'host';
  const myName = view.players[mySide];
  const oppName = view.players[opp];
  const isMyTurn = s.turn === mySide;

  const selectedHandId = handlers.getSelected?.();
  const selectedCard = selectedHandId ? CARD_BY_ID[selectedHandId] : null;
  const matchableMonth = selectedCard?.month;

  $('#scoreboard').innerHTML = `
    <div class="sb-row">
      <span>第 ${view.round}/${view.rounds} 局</span>
      <span>庄家：${view.players[view.oya]}</span>
      <span>牌堆：${s.yamaCount}</span>
    </div>
    <div class="sb-row">
      <span class="${s.turn === 'host' ? 'turn-on' : ''}">${view.players.host}：${view.matchScores.host}</span>
      <span class="vs">vs</span>
      <span class="${s.turn === 'guest' ? 'turn-on' : ''}">${view.players.guest}：${view.matchScores.guest}</span>
    </div>
  `;

  $('#opp-info').innerHTML = `
    <div class="player-name">${oppName} ${s.turn === opp ? '<span class="badge">出牌中</span>' : ''}
      ${s.koiCalled[opp] ? '<span class="badge koi">来来中</span>' : ''}</div>
    <div class="yaku-row">${renderYakuList(s.yaku[opp])}
      <span class="pts">合计 ${totalPoints(s.yaku[opp])} 文</span></div>
  `;
  $('#opp-captured').innerHTML = renderCaptured(s.captured[opp]);
  $('#opp-hand').innerHTML = renderHand(s.hands[opp]);

  $('#field').innerHTML = renderField(s.field, matchableMonth);

  $('#me-captured').innerHTML = renderCaptured(s.captured[mySide]);
  $('#me-info').innerHTML = `
    <div class="player-name">${myName} ${isMyTurn ? '<span class="badge mine">轮到你</span>' : ''}
      ${s.koiCalled[mySide] ? '<span class="badge koi">来来中</span>' : ''}</div>
    <div class="yaku-row">${renderYakuList(s.yaku[mySide])}
      <span class="pts">合计 ${totalPoints(s.yaku[mySide])} 文</span></div>
  `;
  $('#me-hand').innerHTML = renderHand(s.hands[mySide], { selectedId: selectedHandId, matchableMonth });

  // Phase-driven action bar
  const bar = $('#actionbar');
  bar.innerHTML = '';
  if (s.phase === 'play_hand' && isMyTurn) {
    bar.innerHTML = `<div class="hint">点一张手牌 → 再点场上同月的牌来取</div>`;
  } else if (s.phase === 'pick_hand_pair' && isMyTurn) {
    bar.innerHTML = `<div class="hint">选择要取走的场牌</div>`;
  } else if (s.phase === 'draw_deck' && isMyTurn) {
    bar.innerHTML = `<button class="btn-primary" id="btn-draw">翻牌堆（剩 ${s.yamaCount}）</button>`;
    $('#btn-draw').onclick = () => handlers.onDraw();
  } else if (s.phase === 'pick_draw_pair' && isMyTurn) {
    bar.innerHTML = `<div class="hint">选择与翻出牌配对的场牌</div>`;
  } else if (s.phase === 'koi_decision' && isMyTurn) {
    bar.innerHTML = `
      <button class="btn-secondary" id="btn-agari">结算（${totalPoints(s.yaku[mySide])} 文）</button>
      <button class="btn-primary" id="btn-koi">来来！继续</button>
    `;
    $('#btn-agari').onclick = () => handlers.onAgari();
    $('#btn-koi').onclick = () => handlers.onKoi();
  } else if (s.phase === 'round_over') {
    const winner = s.lastEvent?.winner;
    bar.innerHTML = `
      <div class="result">
        ${winner ? `${view.players[winner]} 胜！+${s.lastEvent.points} 文` : '平局'}
      </div>
      <button class="btn-primary" id="btn-next">下一局</button>
    `;
    $('#btn-next').onclick = () => handlers.onNextRound();
  } else if (s.phase === 'match_over') {
    const h = view.matchScores.host, g = view.matchScores.guest;
    const winner = h === g ? null : (h > g ? 'host' : 'guest');
    bar.innerHTML = `
      <div class="result big">
        ${winner ? `🎉 ${view.players[winner]} 赢得比赛！` : '全场平局'}
        <br><small>${view.players.host} ${h} - ${g} ${view.players.guest}</small>
      </div>
    `;
  } else {
    bar.innerHTML = `<div class="hint">等待 ${view.players[s.turn]} 出牌…</div>`;
  }

  // Wire card clicks
  $$('#me-hand .card-slot').forEach(el => {
    el.onclick = () => {
      const cid = el.dataset.card;
      if (s.phase === 'play_hand' && isMyTurn) handlers.onSelectHand(cid);
    };
  });
  $$('#field .card-slot').forEach(el => {
    el.onclick = () => {
      const cid = el.dataset.card;
      if (isMyTurn) handlers.onSelectField(cid);
    };
  });

  $('#log').innerHTML = s.log.map(l => `<div>${l}</div>`).join('');
}
