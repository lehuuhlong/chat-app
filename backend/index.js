import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import { MongoClient, ObjectId } from 'mongodb';

// Config
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Models
const messageSchema = new mongoose.Schema({
  username: String,
  text: String,
  file: {
    id: String, // Always store as string for compatibility
    filename: String,
    originalname: String,
    mimetype: String,
    size: Number,
  },
  files: [
    {
      // Add files field for multiple files
      id: String,
      filename: String,
      originalname: String,
      mimetype: String,
      size: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// GridFS storage setup
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'uploads',
    };
  },
});
const upload = multer({ storage });

// API routes
app.get('/api/messages', async (req, res) => {
  const messages = await Message.find().sort({ createdAt: 1 });
  // Đảm bảo mọi message có file đều trả về file.id là string
  const result = messages.map((msg) => {
    const obj = msg.toObject();

    return obj;
  });
  res.json(result);
});

// Download file from GridFS

// Tạo client MongoDB toàn cục, chỉ connect 1 lần
let mongoClient, db, bucket;
import { GridFSBucket } from 'mongodb';
async function getGridFS() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });
    await mongoClient.connect();
    db = mongoClient.db();
    bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  }
  return { db, bucket };
}

app.get('/api/files/:id', async (req, res) => {
  try {
    const { db, bucket } = await getGridFS();
    let fileDoc;
    let downloadStream;
    try {
      // Only allow valid ObjectId
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid file id' });
      }
      const _id = new ObjectId(req.params.id);
      fileDoc = await db.collection('uploads.files').findOne({ _id });
      if (fileDoc) {
        downloadStream = bucket.openDownloadStream(_id);
      }
    } catch (e) {
      console.error('Download error:', e);
      return res.status(400).json({ error: 'Invalid file id' });
    }
    if (!fileDoc || !downloadStream) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileDoc.filename)}"`);
    downloadStream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      } else {
        res.destroy(err);
      }
    });
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// Delete message endpoint
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // If message has a file, delete it from GridFS
    if (message.file && message.file.id) {
      try {
        const { bucket } = await getGridFS();
        const fileId = new ObjectId(message.file.id);
        await bucket.delete(fileId);
      } catch (err) {
        console.error('Error deleting file:', err);
        // Continue with message deletion even if file deletion fails
      }
    }

    // Delete the message from database
    await Message.findByIdAndDelete(req.params.id);

    // Emit socket event to notify all clients about message deletion
    io.emit('messageDeleted', req.params.id);
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting message' });
  }
});

app.post('/api/messages', upload.array('files', 10), async (req, res) => {
  const { username, text } = req.body;
  let files = null;
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    files = req.files.map((f) => ({
      id: f.id?.toString?.() || f.id,
      filename: f.filename,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
    }));
  }
  // Đảm bảo tương thích với frontend: nếu chỉ có 1 file thì lưu dạng cũ (file), nếu nhiều file thì lưu files
  let messageData = { username, text };
  if (files && files.length === 1) messageData.file = files[0];
  if (files && files.length > 1) messageData.files = files;
  const message = new Message(messageData);
  await message.save();
  const msgObj = message.toObject();
  if (msgObj.file && msgObj.file.id) msgObj.file.id = msgObj.file.id.toString();
  if (msgObj.files) msgObj.files = msgObj.files.map((f) => ({ ...f, id: f.id.toString() }));
  io.emit('message', msgObj);
  res.status(201).json(msgObj);
});

// API chỉnh sửa tin nhắn
app.patch('/api/messages/:id', async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    message.text = text;
    await message.save();
    io.emit('messageEdited', { _id: message._id, text });
    res.status(200).json({ message: 'Message updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error editing message' });
  }
});

// Quản lý user online
const onlineUsers = new Set();

// Socket.IO
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

  socket.on('message', async (data) => {
    const { username, text, file } = data;
    const message = new Message({ username, text, file });
    await message.save();
    io.emit('message', message);
  });

  // Xử lý sự kiện typing
  socket.on('typing', (username) => {
    // Gửi đến tất cả client khác trừ người gửi
    socket.broadcast.emit('userTyping', username);
  });

  socket.on('stopTyping', (username) => {
    // Gửi đến tất cả client khác trừ người gửi
    socket.broadcast.emit('userStoppedTyping', username);
  });
});

// API trả về danh sách user online
app.get('/api/online-users', (req, res) => {
  res.json(Array.from(onlineUsers));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
