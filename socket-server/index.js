import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000'];

// Add regex patterns for dynamic origins
const originPatterns = [/\.vercel\.app$/, /\.onrender\.com$/, /^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

const checkOrigin = (origin, callback) => {
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  if (originPatterns.some((pattern) => pattern.test(origin))) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
};

const corsOptions = { origin: checkOrigin, methods: ['GET', 'POST'], credentials: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

const io = new Server(server, { cors: corsOptions });

const MAX_USERNAME_LENGTH = 30;
const EMITTABLE_EVENTS = new Set(['message', 'messageDeleted', 'messageEdited', 'messageReacted']);

const EMIT_SECRET = process.env.EMIT_SECRET;
if (!EMIT_SECRET) {
  console.warn('⚠️  EMIT_SECRET is not set — the /emit endpoint will reject every request.');
}

/**
 * Presence is tracked per socket, not per username:
 *  - closing one of two tabs no longer marks the user offline;
 *  - renaming no longer leaves the old name stuck in the list.
 */
const socketUsers = new Map(); // socket.id -> username

const getOnlineUsers = () => [...new Set(socketUsers.values())];
const broadcastOnlineUsers = () => io.emit('onlineUsers', getOnlineUsers());

const sanitizeUsername = (value) => {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && name.length <= MAX_USERNAME_LENGTH ? name : null;
};

io.on('connection', (socket) => {
  socket.on('userOnline', (rawUsername) => {
    const username = sanitizeUsername(rawUsername);
    if (!username) return;

    const previous = socketUsers.get(socket.id);
    if (previous === username) return;
    if (previous) socket.broadcast.emit('userStoppedTyping', previous);

    socketUsers.set(socket.id, username);
    broadcastOnlineUsers();
  });

  socket.on('typing', () => {
    const username = socketUsers.get(socket.id);
    if (username) socket.broadcast.emit('userTyping', username);
  });

  socket.on('stopTyping', () => {
    const username = socketUsers.get(socket.id);
    if (username) socket.broadcast.emit('userStoppedTyping', username);
  });

  socket.on('disconnect', () => {
    const username = socketUsers.get(socket.id);
    socketUsers.delete(socket.id);
    if (username) {
      // Otherwise the "is typing..." bubble stays forever if the user closes the tab mid-typing.
      socket.broadcast.emit('userStoppedTyping', username);
      broadcastOnlineUsers();
    }
  });
});

// REST API endpoints

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Socket.IO server is running', onlineUsers: getOnlineUsers().length });
});

app.get('/online-users', (req, res) => {
  res.json(getOnlineUsers());
});

const isValidSecret = (provided) => {
  if (!EMIT_SECRET || typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(EMIT_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Emit event endpoint (protected by secret key) — called by the Next.js API routes.
app.post('/emit', (req, res) => {
  const { secret, event, data } = req.body || {};

  if (!isValidSecret(secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!EMITTABLE_EVENTS.has(event)) {
    return res.status(400).json({ error: 'Unknown event' });
  }

  io.emit(event, data);
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
