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
app.use(cors());
app.use(express.json());

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
