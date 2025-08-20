import { Server } from 'socket.io';

let io;
const onlineUsers = new Set();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://chat-app-three-theta-95.vercel.app',
        /\.vercel\.app$/,
        /^http:\/\/localhost:\d+$/,
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('userOnline', (username) => {
      currentUser = username;
      if (username) {
        onlineUsers.add(username);
        io.emit('onlineUsers', Array.from(onlineUsers));
      }
    });

    socket.on('disconnect', () => {
      if (currentUser) {
        onlineUsers.delete(currentUser);
        io.emit('onlineUsers', Array.from(onlineUsers));
      }
    });

    socket.on('typing', (username) => {
      socket.broadcast.emit('userTyping', username);
    });

    socket.on('stopTyping', (username) => {
      socket.broadcast.emit('userStoppedTyping', username);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers);
};
