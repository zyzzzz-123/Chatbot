// Authoritative Koi-Koi game state machine.
// Single source of truth lives on the host; the host serialises this
// into snapshots and broadcasts them to the guest after each action.
// All player actions are validated against the current `phase`.

import { CARD_BY_ID, newShuffledDeck } from './cards.js';
import { evaluateYaku, totalPoints, hasNewOrIncreased } from './yaku.js';

export const PHASES = {
  PLAY_HAND:       'play_hand',
  PICK_HAND_PAIR:  'pick_hand_pair',
  DRAW_DECK:       'draw_deck',
  PICK_DRAW_PAIR:  'pick_draw_pair',
  KOI_DECISION:    'koi_decision',
  ROUND_OVER:      'round_over',
  MATCH_OVER:      'match_over',
};

const ROUNDS_PER_MATCH = 6;

function dealRound(rng) {
  const deck = newShuffledDeck(rng);
  // 8 to opponent, 8 to field, 8 to oya, rest to yama. Spec says "2-2-2"
  // pattern; final hand sizes are identical so we deal in bulk for speed.
  const opp   = deck.splice(0, 8);
  const field = deck.splice(0, 8);
  const oya   = deck.splice(0, 8);
  return { hands: { oya, opp }, field, yama: deck };
}

export function newMatch(seedNames /* { host, guest } */) {
  const rng = Math.random;
  return {
    players: { host: seedNames.host, guest: seedNames.guest },
    oya: 'host',                  // first oya: host
    round: 0,
    matchScores: { host: 0, guest: 0 },
    rounds: ROUNDS_PER_MATCH,
    state: null,                  // current round state
    history: [],                  // per-round results
    rng,
  };
}

export function startRound(match) {
  const dealt = dealRound(match.rng);
  const oya = match.oya;
  const opp = oya === 'host' ? 'guest' : 'host';
  match.round += 1;
  match.state = {
    phase: PHASES.PLAY_HAND,
    turn: oya,
    oya,
    hands: { [oya]: dealt.hands.oya, [opp]: dealt.hands.opp },
    field: dealt.field,
    yama: dealt.yama,
    captured: { host: [], guest: [] },
    yaku: { host: [], guest: [] },
    yakuAtKoi: { host: null, guest: null }, // snapshot of yaku at moment of koi-koi
    koiCalled: { host: false, guest: false },
    pending: null, // staged card mid-turn awaiting pair choice
    lastEvent: { kind: 'deal' },
    log: [`第 ${match.round} 局开始 — 庄家：${match.players[oya]}`],
  };
  return match.state;
}

function findFieldMatches(field, month) {
  return field.filter(id => CARD_BY_ID[id].month === month);
}

function moveCardToCapture(state, side, cardId) {
  state.captured[side].push(cardId);
}

function applyMatch(state, side, playedId, fieldMatches, choiceId, source /* 'hand'|'deck' */) {
  // Returns { kind: 'captured'|'placed'|'pick_pair', placed?: id, captured?: ids[] }
  if (fieldMatches.length === 0) {
    state.field.push(playedId);
    return { kind: 'placed', placed: playedId };
  }
  if (fieldMatches.length === 1) {
    const matchId = fieldMatches[0];
    state.field = state.field.filter(id => id !== matchId);
    moveCardToCapture(state, side, playedId);
    moveCardToCapture(state, side, matchId);
    return { kind: 'captured', captured: [playedId, matchId] };
  }
  if (fieldMatches.length === 2) {
    if (!choiceId) return { kind: 'pick_pair', candidates: fieldMatches, played: playedId, source };
    if (!fieldMatches.includes(choiceId)) throw new Error('invalid pair choice');
    state.field = state.field.filter(id => id !== choiceId);
    moveCardToCapture(state, side, playedId);
    moveCardToCapture(state, side, choiceId);
    return { kind: 'captured', captured: [playedId, choiceId] };
  }
  // 3 matches in field => sweep all four
  state.field = state.field.filter(id => !fieldMatches.includes(id));
  moveCardToCapture(state, side, playedId);
  for (const id of fieldMatches) moveCardToCapture(state, side, id);
  return { kind: 'captured', captured: [playedId, ...fieldMatches] };
}

function checkYakuProgress(state, side) {
  const newYaku = evaluateYaku(state.captured[side]);
  const baseline = state.yakuAtKoi[side] ?? state.yaku[side];
  state.yaku[side] = newYaku;
  // After a koi-koi the player must improve over the baseline at koi time.
  // Otherwise compare to the previous turn's yaku.
  return hasNewOrIncreased(baseline, newYaku);
}

// ---- Public action handlers (called by net layer / local UI) ----

export function actPlayHand(match, side, cardId, choiceId) {
  const s = match.state;
  if (s.phase !== PHASES.PLAY_HAND) throw new Error('not play_hand phase');
  if (s.turn !== side) throw new Error('not your turn');
  const hand = s.hands[side];
  const idx = hand.indexOf(cardId);
  if (idx < 0) throw new Error('card not in hand');
  const card = CARD_BY_ID[cardId];
  const matches = findFieldMatches(s.field, card.month);

  if (matches.length === 2 && !choiceId) {
    s.phase = PHASES.PICK_HAND_PAIR;
    s.pending = { source: 'hand', played: cardId, candidates: matches };
    s.lastEvent = { kind: 'await_pair', source: 'hand', played: cardId, candidates: matches };
    return s;
  }
  hand.splice(idx, 1);
  const r = applyMatch(s, side, cardId, matches, choiceId, 'hand');
  s.lastEvent = { kind: 'play_hand', side, played: cardId, result: r };
  s.pending = null;
  s.phase = PHASES.DRAW_DECK;
  s.log.push(`${match.players[side]} 出牌：${card.name}`);
  return s;
}

export function actPickPair(match, side, choiceId) {
  const s = match.state;
  const isHand = s.phase === PHASES.PICK_HAND_PAIR;
  const isDraw = s.phase === PHASES.PICK_DRAW_PAIR;
  if (!isHand && !isDraw) throw new Error('not pair pick phase');
  if (s.turn !== side) throw new Error('not your turn');
  const { played, candidates, source } = s.pending;
  if (!candidates.includes(choiceId)) throw new Error('invalid pair choice');
  if (isHand) {
    const hand = s.hands[side];
    const i = hand.indexOf(played);
    if (i >= 0) hand.splice(i, 1);
  }
  applyMatch(s, side, played, candidates, choiceId, source);
  s.pending = null;
  s.lastEvent = { kind: 'pair_chosen', source, played, choice: choiceId };
  s.phase = isHand ? PHASES.DRAW_DECK : PHASES.KOI_DECISION;
  if (isHand) {
    return s;
  }
  return finishTurnAfterDraw(match, side);
}

export function actDrawDeck(match, side) {
  const s = match.state;
  if (s.phase !== PHASES.DRAW_DECK) throw new Error('not draw phase');
  if (s.turn !== side) throw new Error('not your turn');
  if (s.yama.length === 0) {
    // Nothing to flip; treat as straight to yaku check.
    return finishTurnAfterDraw(match, side);
  }
  const drawn = s.yama.shift();
  const card = CARD_BY_ID[drawn];
  const matches = findFieldMatches(s.field, card.month);

  if (matches.length === 2) {
    s.phase = PHASES.PICK_DRAW_PAIR;
    s.pending = { source: 'deck', played: drawn, candidates: matches };
    s.lastEvent = { kind: 'await_pair', source: 'deck', played: drawn, candidates: matches };
    s.log.push(`${match.players[side]} 翻到：${card.name}`);
    return s;
  }
  applyMatch(s, side, drawn, matches, null, 'deck');
  s.lastEvent = { kind: 'draw_deck', side, played: drawn };
  s.log.push(`${match.players[side]} 翻到：${card.name}`);
  return finishTurnAfterDraw(match, side);
}

function finishTurnAfterDraw(match, side) {
  const s = match.state;
  const improved = checkYakuProgress(s, side);
  if (improved) {
    s.phase = PHASES.KOI_DECISION;
    s.lastEvent = { kind: 'yaku_made', side, yaku: s.yaku[side] };
    s.log.push(`${match.players[side]} 成役！`);
    return s;
  }
  return advanceTurn(match);
}

function advanceTurn(match) {
  const s = match.state;
  // Round end: both hands empty after this turn.
  const handsEmpty = s.hands.host.length === 0 && s.hands.guest.length === 0;
  if (handsEmpty) {
    return endRound(match, null);
  }
  s.turn = s.turn === 'host' ? 'guest' : 'host';
  s.phase = PHASES.PLAY_HAND;
  s.lastEvent = { kind: 'turn_passed', to: s.turn };
  return s;
}

export function actAgari(match, side) {
  const s = match.state;
  if (s.phase !== PHASES.KOI_DECISION) throw new Error('not decision phase');
  if (s.turn !== side) throw new Error('not your turn');
  return endRound(match, side);
}

export function actKoiKoi(match, side) {
  const s = match.state;
  if (s.phase !== PHASES.KOI_DECISION) throw new Error('not decision phase');
  if (s.turn !== side) throw new Error('not your turn');
  s.koiCalled[side] = true;
  s.yakuAtKoi[side] = JSON.parse(JSON.stringify(s.yaku[side]));
  s.lastEvent = { kind: 'koi_koi', side };
  s.log.push(`${match.players[side]} 宣告：来来！`);
  return advanceTurn(match);
}

function endRound(match, winner) {
  const s = match.state;
  let winnerSide = winner;
  let pts = 0;
  if (winnerSide) {
    pts = totalPoints(s.yaku[winnerSide]);
    if (pts >= 7) pts *= 2;             // 7+ doubling
    const loser = winnerSide === 'host' ? 'guest' : 'host';
    if (s.koiCalled[loser]) pts *= 2;   // koi-koi penalty
    match.matchScores[winnerSide] += pts;
  }
  s.phase = PHASES.ROUND_OVER;
  s.lastEvent = { kind: 'round_over', winner: winnerSide, points: pts };
  match.history.push({
    round: match.round,
    winner: winnerSide,
    points: pts,
    yaku: winnerSide ? s.yaku[winnerSide] : [],
    oya: s.oya,
  });
  s.log.push(winnerSide
    ? `${match.players[winnerSide]} 获胜 ${pts} 文！`
    : `平局（手牌打完）`);

  // Oya rotation: winner becomes next oya; on draw, oya stays.
  if (winnerSide) match.oya = winnerSide;

  if (match.round >= match.rounds) {
    s.phase = PHASES.MATCH_OVER;
    s.lastEvent = { kind: 'match_over', scores: match.matchScores };
  }
  return s;
}

export function nextRound(match) {
  if (match.state.phase !== PHASES.ROUND_OVER) throw new Error('round not over');
  return startRound(match);
}

// ---- View / serialisation ----
// Hide opponent's hand by replacing IDs with `?` markers so cheating
// peers can't inspect the wire format.
export function viewFor(match, side) {
  const s = match.state;
  if (!s) return { match: { ...match, state: null } };
  const opp = side === 'host' ? 'guest' : 'host';
  return {
    players: match.players,
    round: match.round,
    rounds: match.rounds,
    matchScores: match.matchScores,
    oya: match.oya,
    history: match.history,
    state: {
      phase: s.phase,
      turn: s.turn,
      hands: { [side]: s.hands[side], [opp]: new Array(s.hands[opp].length).fill('?') },
      field: s.field,
      yamaCount: s.yama.length,
      captured: s.captured,
      yaku: s.yaku,
      koiCalled: s.koiCalled,
      pending: s.pending,
      lastEvent: s.lastEvent,
      log: s.log.slice(-20),
    },
  };
}
