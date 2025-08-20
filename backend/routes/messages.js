import express from 'express';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import dotenv from 'dotenv';
import Message from '../models/Message.js';
import { getIO } from '../services/socket.js';
import { downloadFileStream, deleteFile } from '../services/gridfs.js';

dotenv.config();

const router = express.Router();

// Cấu hình multer-gridfs-storage
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  file: (req, file) => {
    // Acceptable file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/jfif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'uploads',
      metadata: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        uploadDate: new Date(),
      },
    };
  },
});

// Multer configuration with file size and type validation
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/jfif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  },
});

// Routes
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments();

    // Get messages with pagination, sorted by newest first for pagination, then reverse
    const messages = await Message.find()
      .sort({ createdAt: -1 }) // Newest first for pagination
      .skip(skip)
      .limit(limit);

    // Reverse to show oldest first in the UI
    const reversedMessages = messages.reverse();

    const result = reversedMessages.map((msg) => {
      const obj = msg.toObject();
      if (obj.reactions) {
        obj.reactions = Object.fromEntries(obj.reactions);
      }
      return obj;
    });

    // Calculate pagination info
    const hasMore = skip + limit < totalMessages;
    const totalPages = Math.ceil(totalMessages / limit);

    res.json({
      messages: result,
      pagination: {
        currentPage: page,
        totalPages,
        totalMessages,
        hasMore,
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { username, text } = req.body;

    // Validate required fields
    if (!username || (!text && (!req.files || req.files.length === 0))) {
      return res.status(400).json({
        error: 'Username and either text or files are required',
      });
    }

    let files = null;
    if (req.files && req.files.length > 0) {
      files = req.files.map((f) => ({
        id: f.id.toString(),
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      }));
    }

    const messageData = {
      username,
      text: text || '',
      files: files || [],
    };

    // Backward compatibility
    if (files && files.length === 1) {
      messageData.file = files[0];
    }

    const message = new Message(messageData);
    await message.save();

    const io = getIO();
    io.emit('message', message.toObject());

    res.status(201).json({
      success: true,
      message: message.toObject(),
    });
  } catch (err) {
    console.error('Error creating message:', err);

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size too large. Maximum size is 10MB per file.',
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files. Maximum 10 files per message.',
      });
    }

    if (err.message && err.message.includes('File type')) {
      return res.status(400).json({
        error: err.message,
      });
    }

    res.status(500).json({
      error: 'Error creating message. Please try again.',
    });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    message.text = text;
    await message.save();
    const io = getIO();
    io.emit('messageEdited', { _id: message._id, text });
    res.status(200).json(message.toObject());
  } catch (err) {
    res.status(500).json({ error: 'Error updating message' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        await deleteFile(file.id);
      }
    } else if (message.file && message.file.id) {
      await deleteFile(message.file.id);
    }

    await Message.findByIdAndDelete(req.params.id);
    const io = getIO();
    io.emit('messageDeleted', req.params.id);
    res.status(200).json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting message' });
  }
});

router.post('/:id/react', async (req, res) => {
  try {
    const { reaction, username } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    const reactions = message.reactions || new Map();
    const users = reactions.get(reaction) || [];
    if (users.includes(username)) {
      reactions.set(
        reaction,
        users.filter((user) => user !== username)
      );
    } else {
      reactions.set(reaction, [...users, username]);
    }
    message.reactions = reactions;
    await message.save();
    const io = getIO();
    io.emit('messageReacted', { _id: message._id, reactions: Object.fromEntries(message.reactions) });
    res.status(200).json(message.toObject());
  } catch (err) {
    res.status(500).json({ error: 'Error reacting to message' });
  }
});

router.get('/files/:id', downloadFileStream);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size too large. Maximum size is 10MB per file.',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files. Maximum 10 files per message.',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field name for file upload.',
      });
    }
  }

  if (error.message && error.message.includes('File type')) {
    return res.status(400).json({
      error: error.message,
    });
  }

  return res.status(500).json({
    error: 'File upload error. Please try again.',
  });
});

export default router;
