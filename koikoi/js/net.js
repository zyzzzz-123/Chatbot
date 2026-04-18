// Multiplayer transport via PeerJS (free public broker, WebRTC P2P).
// The host owns the authoritative game state. The guest sends actions
// and applies state snapshots from the host.

const PEER_LIB = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

function loadPeer() {
  return new Promise((resolve, reject) => {
    if (window.Peer) return resolve();
    const s = document.createElement('script');
    s.src = PEER_LIB;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load peerjs'));
    document.head.appendChild(s);
  });
}

const ROOM_PREFIX = 'koikoi-';
function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createHost({ onConnect, onMessage, onClose, onError }) {
  await loadPeer();
  const code = randomRoomCode();
  const peer = new window.Peer(ROOM_PREFIX + code, {
    debug: 1,
  });

  return new Promise((resolve, reject) => {
    let opened = false;
    peer.on('open', id => {
      opened = true;
      const link = `${location.origin}${location.pathname}?room=${code}`;
      resolve({
        code, link, peer,
        send: null, // populated when guest connects
      });
    });
    peer.on('connection', conn => {
      conn.on('open', () => {
        const send = data => conn.send(data);
        onConnect && onConnect({ send });
      });
      conn.on('data', data => onMessage && onMessage(data));
      conn.on('close', () => onClose && onClose());
      conn.on('error', err => onError && onError(err));
    });
    peer.on('error', err => {
      if (!opened) reject(err);
      else onError && onError(err);
    });
  });
}

export async function joinHost(code, { onOpen, onMessage, onClose, onError }) {
  await loadPeer();
  const peer = new window.Peer(undefined, { debug: 1 });
  return new Promise((resolve, reject) => {
    peer.on('open', () => {
      const conn = peer.connect(ROOM_PREFIX + code, { reliable: true });
      conn.on('open', () => {
        const send = data => conn.send(data);
        onOpen && onOpen({ send });
        resolve({ peer, conn, send });
      });
      conn.on('data', data => onMessage && onMessage(data));
      conn.on('close', () => onClose && onClose());
      conn.on('error', err => onError && onError(err));
    });
    peer.on('error', err => {
      reject(err);
      onError && onError(err);
    });
  });
}
