import express from 'express';
import http from 'http';
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

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check if origin matches any pattern
    if (originPatterns.some((pattern) => pattern.test(origin))) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (originPatterns.some((pattern) => pattern.test(origin))) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Track online users
const onlineUsers = new Set();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let currentUser = null;

  socket.on('userOnline', (username) => {
    currentUser = username;
    if (username) {
      onlineUsers.add(username);
      io.emit('onlineUsers', Array.from(onlineUsers));
      console.log(`User online: ${username}. Total online: ${onlineUsers.size}`);
    }
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit('onlineUsers', Array.from(onlineUsers));
      console.log(`User offline: ${currentUser}. Total online: ${onlineUsers.size}`);
    }
    console.log('Client disconnected:', socket.id);
  });

  socket.on('typing', (username) => {
    socket.broadcast.emit('userTyping', username);
  });

  socket.on('stopTyping', (username) => {
    socket.broadcast.emit('userStoppedTyping', username);
  });
});

// REST API endpoints

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Socket.IO server is running',
    onlineUsers: onlineUsers.size,
  });
});

// Get online users
app.get('/online-users', (req, res) => {
  res.json(Array.from(onlineUsers));
});

// Emit event endpoint (protected by secret key)
app.post('/emit', (req, res) => {
  const { secret, event, data } = req.body;

  // Validate secret key
  if (secret !== process.env.EMIT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!event) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  try {
    io.emit(event, data);
    console.log(`Emitted event: ${event}`);
    res.json({ success: true, event, data });
  } catch (error) {
    console.error('Error emitting event:', error);
    res.status(500).json({ error: 'Error emitting event' });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
