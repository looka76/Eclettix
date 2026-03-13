/* ── Eclettix — app.js ── */

const socket = io();

// State
let myName = '';
let currentRoom = null;
let peerConnections = {}; // socketId -> RTCPeerConnection
let localStream = null;
let micActive = false;
let audioCtx = null;
let analyserNode = null;
let speakingTimer = null;

// DOM refs
const $ = id => document.getElementById(id);

const screens = {
  entry: $('entry-screen'),
  lobby: $('lobby-screen'),
  room: $('room-screen')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ──────────────────────────────────────────────
// ENTRY
// ──────────────────────────────────────────────
$('username-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') enterApp();
});
$('enter-btn').addEventListener('click', enterApp);

function enterApp() {
  const val = $('username-input').value.trim();
  if (!val) { $('username-input').focus(); return; }
  myName = val;
  $('lobby-username').textContent = myName;
  showScreen('lobby');
  loadRooms();
}

// ──────────────────────────────────────────────
// LOBBY
// ──────────────────────────────────────────────
async function loadRooms() {
  const res = await fetch('/api/rooms');
  const rooms = await res.json();
  const grid = $('rooms-grid');
  grid.innerHTML = '';
  rooms.forEach(room => {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.style.setProperty('--card-color', room.color);
    card.innerHTML = `
      <span class="card-emoji">${room.emoji}</span>
      <div class="card-name">${room.name}</div>
      <div class="card-genre">${room.genre}</div>
      <div class="card-footer">
        <span class="card-users">👤 ${room.userCount} online</span>
        <span class="card-track">${room.currentTrack.title}</span>
      </div>
    `;
    card.addEventListener('click', () => joinRoom(room.id));
    grid.appendChild(card);
  });
}

// ──────────────────────────────────────────────
// JOIN ROOM
// ──────────────────────────────────────────────
function joinRoom(roomId) {
  socket.emit('join-room', { roomId, name: myName });
}

socket.on('room-joined', ({ roomId, track, startedAt, users }) => {
  currentRoom = roomId;

  // Populate header from data attribute (set before emitting join)
  const roomMeta = window._rooms || {};
  fetch('/api/rooms').then(r => r.json()).then(rooms => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    $('room-emoji').textContent = room.emoji;
    $('room-name-hdr').textContent = room.name;
    $('room-genre-hdr').textContent = room.genre;
    $('room-screen').style.setProperty('--room-color', room.color);
    document.querySelector('.room-bg').style.background =
      `radial-gradient(ellipse at 50% 50%, ${room.color} 0%, transparent 70%)`;
  });

  $('room-username').textContent = myName;
  $('chat-messages').innerHTML = '';
  renderUsers(users);
  playTrack(track, startedAt);
  showScreen('room');
  addSystemMessage('Sei entrato nella stanza');
});

// ──────────────────────────────────────────────
// BACK TO LOBBY
// ──────────────────────────────────────────────
$('back-btn').addEventListener('click', () => {
  leaveRoom();
  loadRooms();
  showScreen('lobby');
});

function leaveRoom() {
  // Close all peer connections
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};

  // Stop mic
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  micActive = false;
  updateMicUI();

  // Stop music
  const audio = $('audio-player');
  audio.pause();
  audio.src = '';

  currentRoom = null;
}

// ──────────────────────────────────────────────
// USERS
// ──────────────────────────────────────────────
socket.on('user-list', users => renderUsers(users));
socket.on('user-joined', ({ id, name }) => addSystemMessage(`${name} è entrato`));
socket.on('user-left', ({ id, name }) => {
  addSystemMessage(`${name} ha lasciato la stanza`);
  if (peerConnections[id]) { peerConnections[id].close(); delete peerConnections[id]; }
});

function renderUsers(users) {
  const list = $('users-list');
  list.innerHTML = '';
  users.forEach(u => {
    const el = document.createElement('div');
    el.className = 'user-item' + (u.id === socket.id ? ' user-me' : '');
    el.id = `user-${u.id}`;
    el.innerHTML = `
      <div class="user-avatar">${u.name.charAt(0).toUpperCase()}</div>
      <span>${u.name}${u.id === socket.id ? ' (tu)' : ''}</span>
    `;
    list.appendChild(el);
  });
}

// ──────────────────────────────────────────────
// MUSIC PLAYER
// ──────────────────────────────────────────────
let trackDuration = 180; // assume 3min per track

function playTrack(track, startedAt) {
  $('track-title').textContent = track.title;
  $('track-artist').textContent = track.artist;

  const audio = $('audio-player');
  audio.src = track.url;
  audio.volume = parseFloat($('volume-slider').value);

  // Sync to server time offset
  const elapsed = (Date.now() - startedAt) / 1000;
  audio.addEventListener('canplay', () => {
    if (elapsed < audio.duration) audio.currentTime = elapsed;
    audio.play().catch(() => {
      // Autoplay blocked — show play button hint
      $('music-toggle').textContent = '▶ Avvia musica';
    });
  }, { once: true });

  audio.addEventListener('ended', () => {
    $('music-bar').style.width = '0%';
  });

  // Progress bar
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      $('music-bar').style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
  });
}

socket.on('track-change', ({ track, startedAt }) => {
  addSystemMessage(`♫ Ora in riproduzione: ${track.title}`);
  playTrack(track, startedAt);
});

$('volume-slider').addEventListener('input', e => {
  $('audio-player').volume = parseFloat(e.target.value);
});

$('music-toggle').addEventListener('click', () => {
  const audio = $('audio-player');
  if (audio.paused) {
    audio.play();
    $('music-toggle').textContent = '⏸ Pausa musica';
  } else {
    audio.pause();
    $('music-toggle').textContent = '▶ Riprendi musica';
  }
});

// ──────────────────────────────────────────────
// VOICE / WebRTC
// ──────────────────────────────────────────────
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

$('mic-btn').addEventListener('click', toggleMic);

async function toggleMic() {
  if (micActive) {
    stopMic();
  } else {
    await startMic();
  }
}

async function startMic() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micActive = true;
    updateMicUI();
    setupSpeakingDetection();

    // Create peer connections with all existing users
    const items = document.querySelectorAll('.user-item:not(.user-me)');
    // We'll create offers via user-joined events; here initiate with existing peers
    const users = Array.from($('users-list').querySelectorAll('.user-item'))
      .filter(el => !el.classList.contains('user-me'))
      .map(el => el.id.replace('user-', ''));

    for (const uid of users) {
      await createOffer(uid);
    }
  } catch (e) {
    $('mic-status').textContent = 'Microfono non disponibile';
    console.error('Mic error:', e);
  }
}

function stopMic() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  micActive = false;
  updateMicUI();
}

function updateMicUI() {
  const btn = $('mic-btn');
  const label = btn.querySelector('.mic-label');
  if (micActive) {
    btn.classList.remove('muted');
    btn.classList.add('active');
    label.textContent = 'Microfono attivo';
  } else {
    btn.classList.remove('active');
    btn.classList.add('muted');
    label.textContent = 'Microfono spento';
  }
}

function setupSpeakingDetection() {
  if (!localStream) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(localStream);
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 512;
  source.connect(analyserNode);

  const data = new Uint8Array(analyserNode.frequencyBinCount);
  function check() {
    if (!micActive) return;
    analyserNode.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const myEl = $(`user-${socket.id}`);
    if (myEl) {
      myEl.querySelector('.user-avatar').classList.toggle('user-speaking', avg > 15);
    }
    requestAnimationFrame(check);
  }
  check();
}

async function createOffer(targetId) {
  const pc = createPC(targetId);
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('offer', { to: targetId, offer });
}

function createPC(peerId) {
  if (peerConnections[peerId]) peerConnections[peerId].close();
  const pc = new RTCPeerConnection(ICE_CONFIG);
  peerConnections[peerId] = pc;

  pc.onicecandidate = e => {
    if (e.candidate) socket.emit('ice-candidate', { to: peerId, candidate: e.candidate });
  };

  pc.ontrack = e => {
    let audioEl = document.getElementById(`audio-${peerId}`);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `audio-${peerId}`;
      audioEl.autoplay = true;
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
    }
    audioEl.srcObject = e.streams[0];
  };

  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
      const el = document.getElementById(`audio-${peerId}`);
      if (el) el.remove();
    }
  };

  return pc;
}

// Signaling
socket.on('user-joined', async ({ id }) => {
  if (micActive && localStream) {
    // New user joined while we have mic: they will send us an offer when they enable mic
  }
});

socket.on('offer', async ({ from, offer }) => {
  if (!localStream) {
    // Accept offer even without mic (to receive audio), but don't add tracks
  }
  const pc = createPC(from);
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', { to: from, answer });
});

socket.on('answer', async ({ from, answer }) => {
  const pc = peerConnections[from];
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async ({ from, candidate }) => {
  const pc = peerConnections[from];
  if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

// ──────────────────────────────────────────────
// CHAT
// ──────────────────────────────────────────────
$('chat-form').addEventListener('submit', e => {
  e.preventDefault();
  const msg = $('chat-input').value.trim();
  if (!msg) return;
  socket.emit('chat-message', { message: msg });
  $('chat-input').value = '';
});

socket.on('chat-message', ({ id, name, message, time }) => {
  const wrap = document.createElement('div');
  const isMine = id === socket.id;
  wrap.className = 'chat-message ' + (isMine ? 'mine' : 'theirs');
  wrap.innerHTML = `
    <div class="msg-header">
      <span class="msg-name">${isMine ? 'Tu' : name}</span>
      <span>${time}</span>
    </div>
    <div class="msg-bubble">${escapeHtml(message)}</div>
  `;
  const msgs = $('chat-messages');
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
});

function addSystemMessage(text) {
  const el = document.createElement('div');
  el.className = 'chat-system';
  el.textContent = text;
  const msgs = $('chat-messages');
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
