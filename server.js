const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// Rooms state: { roomId: { name, genre, track, users: Map<socketId, {name}> } }
const rooms = {
  lounge: {
    id: 'lounge',
    name: 'The Lounge',
    genre: 'Jazz & Soul',
    emoji: '🎷',
    color: '#c9a96e',
    playlist: [
      { title: 'Autumn Leaves', artist: 'Jazz Standards', url: 'https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3' },
      { title: 'Jazzy Frenchy', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3' },
      { title: 'Tenderness', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-tenderness.mp3' }
    ],
    currentTrack: 0,
    startedAt: Date.now(),
    users: {}
  },
  electronic: {
    id: 'electronic',
    name: 'Electronic Pulse',
    genre: 'Electronic & Beats',
    emoji: '⚡',
    color: '#7c3aed',
    playlist: [
      { title: 'Energy', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-energy.mp3' },
      { title: 'Sci-Fi', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-scifi.mp3' },
      { title: 'Dance', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-dance.mp3' }
    ],
    currentTrack: 0,
    startedAt: Date.now(),
    users: {}
  },
  chill: {
    id: 'chill',
    name: 'Chill Zone',
    genre: 'Lo-fi & Ambient',
    emoji: '🌙',
    color: '#0d9488',
    playlist: [
      { title: 'Acoustic Breeze', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3' },
      { title: 'Sweet', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-sweet.mp3' },
      { title: 'Sunny', artist: 'Bensound', url: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3' }
    ],
    currentTrack: 0,
    startedAt: Date.now(),
    users: {}
  }
};

// Advance tracks every ~3 minutes
setInterval(() => {
  Object.values(rooms).forEach(room => {
    room.currentTrack = (room.currentTrack + 1) % room.playlist.length;
    room.startedAt = Date.now();
    io.to(room.id).emit('track-change', {
      track: room.playlist[room.currentTrack],
      startedAt: room.startedAt
    });
  });
}, 3 * 60 * 1000);

io.on('connection', socket => {
  let currentRoom = null;
  let userName = 'Guest';

  socket.on('join-room', ({ roomId, name }) => {
    if (!rooms[roomId]) return;
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms[currentRoom]) {
        delete rooms[currentRoom].users[socket.id];
        io.to(currentRoom).emit('user-left', { id: socket.id, name: userName });
        io.to(currentRoom).emit('user-list', Object.values(rooms[currentRoom].users));
      }
    }

    currentRoom = roomId;
    userName = name || 'Guest';
    rooms[roomId].users[socket.id] = { id: socket.id, name: userName };

    socket.join(roomId);

    // Send room state to joiner
    const room = rooms[roomId];
    socket.emit('room-joined', {
      roomId,
      track: room.playlist[room.currentTrack],
      startedAt: room.startedAt,
      users: Object.values(room.users)
    });

    // Notify others
    socket.to(roomId).emit('user-joined', { id: socket.id, name: userName });
    io.to(roomId).emit('user-list', Object.values(room.users));
  });

  // WebRTC signaling
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('chat-message', ({ message }) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('chat-message', {
      id: socket.id,
      name: userName,
      message,
      time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      delete rooms[currentRoom].users[socket.id];
      io.to(currentRoom).emit('user-left', { id: socket.id, name: userName });
      io.to(currentRoom).emit('user-list', Object.values(rooms[currentRoom].users));
    }
  });
});

// API: room list
app.get('/api/rooms', (req, res) => {
  res.json(Object.values(rooms).map(r => ({
    id: r.id,
    name: r.name,
    genre: r.genre,
    emoji: r.emoji,
    color: r.color,
    userCount: Object.keys(r.users).length,
    currentTrack: r.playlist[r.currentTrack]
  })));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Eclettix running on http://localhost:${PORT}`));
