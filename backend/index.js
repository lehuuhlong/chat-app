import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { initSocket, getOnlineUsers } from './services/socket.js';
import messageRoutes from './routes/messages.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect to database
connectDB();

// Initialize Socket.IO
initSocket(server);

// Middlewares
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://chat-app-three-theta-95.vercel.app',
    /\.vercel\.app$/,
    /^http:\/\/localhost:\d+$/,
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware for CORS
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// API Routes
app.use('/api/messages', messageRoutes);

// Route for online users (remains here as it's a direct query to the socket service)
app.get('/api/online-users', (req, res) => {
  res.json(getOnlineUsers());
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
