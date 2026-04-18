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
      setStatus('请先选择一张手牌', 'warn');
      return;
    }
    const handCard = CARD_BY_ID[session.selectedHand];
    const fieldCard = CARD_BY_ID[cid];
    if (handCard.month !== fieldCard.month) {
      setStatus('月份不匹配', 'warn');
      return;
    }
    sendAction({ type: 'play_hand', cardId: session.selectedHand, choiceId: cid });
    session.selectedHand = null;
  } else if (s.phase === PHASES.PICK_HAND_PAIR || s.phase === PHASES.PICK_DRAW_PAIR) {
    if (!s.pending.candidates.includes(cid)) {
      setStatus('这张牌无法选择', 'warn');
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
    setStatus('非法操作：' + e.message, 'warn');
    return;
  }
  session.view = viewFor(m, session.mySide);
  if (session.send) session.send({ type: 'state', view: viewFor(m, 'guest') });
  rerender();
}

// ---- Lobby ----
async function onCreateRoom() {
  const name = ($('host-name').value || '').trim() || '庄家';
  session.myName = name;
  session.role = 'host';
  session.mySide = 'host';
  setStatus('创建房间中…');
  try {
    const room = await createHost({
      onConnect: ({ send }) => { session.send = send; },
      onMessage: data => onHostMessage(data),
      onClose:   () => setStatus('对手已断开', 'warn'),
      onError:   err => setStatus('通信错误：' + (err.type || err.message), 'warn'),
    });
    $('share-code').textContent = room.code;
    $('share-link').value = room.link;
    $('share-block').classList.remove('hidden');
    setStatus(`房间 ${room.code} 已创建，等待对手加入…`, 'ok');
  } catch (e) {
    setStatus('创建失败：' + (e.message || e.type), 'warn');
  }
}

function onHostMessage(data) {
  if (data.type === 'hello') {
    session.oppName = data.name || '玩家';
    session.match = newMatch({ host: session.myName, guest: session.oppName });
    startRound(session.match);
    session.view = viewFor(session.match, 'host');
    session.send({ type: 'state', view: viewFor(session.match, 'guest') });
    setStatus(`${session.oppName} 已加入 — 对局开始！`, 'ok');
    rerender();
  } else if (data.type === 'action') {
    applyHostAction(data.side, data.action);
  }
}

async function onJoinRoom() {
  const code = ($('join-code').value || '').trim().toUpperCase();
  const name = ($('guest-name').value || '').trim() || '玩家';
  if (code.length < 4) { setStatus('请输入房间号', 'warn'); return; }
  session.myName = name;
  session.role = 'guest';
  session.mySide = 'guest';
  setStatus(`连接房间 ${code} 中…`);
  try {
    await joinHost(code, {
      onOpen: ({ send }) => {
        session.send = send;
        send({ type: 'hello', name });
        setStatus('连接成功，等待发牌…', 'ok');
      },
      onMessage: data => onGuestMessage(data),
      onClose:   () => setStatus('庄家已断开', 'warn'),
      onError:   err => setStatus('通信错误：' + (err.type || err.message), 'warn'),
    });
  } catch (e) {
    setStatus('连接失败：' + (e.message || e.type), 'warn');
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
      () => setStatus('链接已复制', 'ok'),
      () => setStatus('复制失败', 'warn')
    );
  };
}

window.addEventListener('DOMContentLoaded', init);
