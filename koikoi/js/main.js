import { newMatch, startRound, viewFor, nextRound,
  actPlayHand, actDrawDeck, actPickPair, actAgari, actKoiKoi, PHASES } from './game.js';
import { CARD_BY_ID } from './cards.js';
import { createHost, joinHost } from './net.js';
import { render, setStatus, showGame } from './ui.js';

const $ = id => document.getElementById(id);

const session = {
  role: null,        // 'host' | 'guest'
  mySide: null,
  match: null,       // host-only authoritative match object
  view: null,        // most-recent view snapshot (both sides)
  send: null,        // function(payload) — sends to peer
  selectedHand: null,
  myName: 'Player',
  oppName: 'Player',
};

const params = new URLSearchParams(location.search);

function rerender() {
  if (!session.view) return;
  showGame();
  render(session.view, session.mySide, {
    getSelected: () => session.selectedHand,
    onSelectHand: smartSelectHand,
    onSelectField: cid => handleFieldClick(cid),
    onDraw:       () => sendAction({ type: 'draw' }),
    onAgari:      () => sendAction({ type: 'agari' }),
    onKoi:        () => sendAction({ type: 'koikoi' }),
    onNextRound:  () => sendAction({ type: 'next_round' }),
  });
}

function smartSelectHand(cid) {
  const s = session.view.state;
  if (s.phase !== PHASES.PLAY_HAND) return;
  if (s.turn !== session.mySide) return;
  const card = CARD_BY_ID[cid];
  const matches = s.field.filter(id => CARD_BY_ID[id].month === card.month);
  if (matches.length === 0 || matches.length === 1) {
    sendAction({ type: 'play_hand', cardId: cid, choiceId: matches[0] || null });
    session.selectedHand = null;
  } else {
    session.selectedHand = cid;
    rerender();
  }
}

function handleFieldClick(cid) {
  const s = session.view.state;
  if (s.turn !== session.mySide) return;
  if (s.phase === PHASES.PLAY_HAND) {
    if (!session.selectedHand) {
      setStatus('まず手札を選んでください', 'warn');
      return;
    }
    const handCard = CARD_BY_ID[session.selectedHand];
    const fieldCard = CARD_BY_ID[cid];
    if (handCard.month !== fieldCard.month) {
      setStatus('月が合いません', 'warn');
      return;
    }
    sendAction({ type: 'play_hand', cardId: session.selectedHand, choiceId: cid });
    session.selectedHand = null;
  } else if (s.phase === PHASES.PICK_HAND_PAIR || s.phase === PHASES.PICK_DRAW_PAIR) {
    if (!s.pending.candidates.includes(cid)) {
      setStatus('そのカードは選べません', 'warn');
      return;
    }
    sendAction({ type: 'pick_pair', choiceId: cid });
  }
}

function sendAction(action) {
  if (session.role === 'host') {
    applyHostAction(session.mySide, action);
  } else {
    session.send && session.send({ type: 'action', side: session.mySide, action });
  }
}

function applyHostAction(side, action) {
  const m = session.match;
  try {
    switch (action.type) {
      case 'play_hand': actPlayHand(m, side, action.cardId, action.choiceId || null); break;
      case 'pick_pair': actPickPair(m, side, action.choiceId); break;
      case 'draw':      actDrawDeck(m, side); break;
      case 'agari':     actAgari(m, side); break;
      case 'koikoi':    actKoiKoi(m, side); break;
      case 'next_round':
        if (m.state.phase === PHASES.ROUND_OVER) nextRound(m);
        break;
    }
  } catch (e) {
    setStatus('反則: ' + e.message, 'warn');
    return;
  }
  session.view = viewFor(m, session.mySide);
  if (session.send) session.send({ type: 'state', view: viewFor(m, 'guest') });
  rerender();
}

// ---- Lobby ----
async function onCreateRoom() {
  const name = ($('host-name').value || '').trim() || 'Host';
  session.myName = name;
  session.role = 'host';
  session.mySide = 'host';
  setStatus('ルームを作成中…');
  try {
    const room = await createHost({
      onConnect: ({ send }) => { session.send = send; },
      onMessage: data => onHostMessage(data),
      onClose:   () => setStatus('相手が切断しました', 'warn'),
      onError:   err => setStatus('通信エラー: ' + (err.type || err.message), 'warn'),
    });
    $('share-code').textContent = room.code;
    $('share-link').value = room.link;
    $('share-block').classList.remove('hidden');
    setStatus(`ルーム ${room.code} を作成。相手の参加を待っています…`, 'ok');
  } catch (e) {
    setStatus('ルーム作成失敗: ' + (e.message || e.type), 'warn');
  }
}

function onHostMessage(data) {
  if (data.type === 'hello') {
    session.oppName = data.name || 'Guest';
    session.match = newMatch({ host: session.myName, guest: session.oppName });
    startRound(session.match);
    session.view = viewFor(session.match, 'host');
    session.send({ type: 'state', view: viewFor(session.match, 'guest') });
    setStatus(`${session.oppName} が参加 — 対局開始！`, 'ok');
    rerender();
  } else if (data.type === 'action') {
    applyHostAction(data.side, data.action);
  }
}

async function onJoinRoom() {
  const code = ($('join-code').value || '').trim().toUpperCase();
  const name = ($('guest-name').value || '').trim() || 'Guest';
  if (code.length < 4) { setStatus('ルームコードを入力してください', 'warn'); return; }
  session.myName = name;
  session.role = 'guest';
  session.mySide = 'guest';
  setStatus(`ルーム ${code} に接続中…`);
  try {
    await joinHost(code, {
      onOpen: ({ send }) => {
        session.send = send;
        send({ type: 'hello', name });
        setStatus('接続成功。配牌を待っています…', 'ok');
      },
      onMessage: data => onGuestMessage(data),
      onClose:   () => setStatus('ホストが切断しました', 'warn'),
      onError:   err => setStatus('通信エラー: ' + (err.type || err.message), 'warn'),
    });
  } catch (e) {
    setStatus('接続失敗: ' + (e.message || e.type), 'warn');
  }
}

function onGuestMessage(data) {
  if (data.type === 'state') {
    session.view = data.view;
    rerender();
  }
}

function init() {
  if (params.get('room')) $('join-code').value = params.get('room');
  $('btn-create').onclick = onCreateRoom;
  $('btn-join').onclick = onJoinRoom;
  $('btn-copy').onclick = () => {
    const link = $('share-link').value;
    if (!link) return;
    navigator.clipboard.writeText(link).then(
      () => setStatus('リンクをコピーしました', 'ok'),
      () => setStatus('コピー失敗', 'warn')
    );
  };
}

window.addEventListener('DOMContentLoaded', init);
