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

app.post('/api/messages', upload.single('file'), async (req, res) => {
  const { username, text } = req.body;
  let file = null;
  if (req.file) {
    file = {
      id: req.file.id?.toString?.() || req.file.id,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
  }
  const message = new Message({ username, text, file });
  await message.save();
  // Đảm bảo trả về file.id là string cho client
  const msgObj = message.toObject();
  if (msgObj.file && msgObj.file.id) msgObj.file.id = msgObj.file.id.toString();
  io.emit('message', msgObj);
  res.status(201).json(msgObj);
});

// Socket.IO
io.on('connection', (socket) => {
  socket.on('message', async (data) => {
    const { username, text, file } = data;
    const message = new Message({ username, text, file });
    await message.save();
    io.emit('message', message);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
