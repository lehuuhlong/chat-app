import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  username: String,
  text: String,
  file: {
    id: String,
    filename: String,
    originalname: String,
    mimetype: String,
    size: Number,
  },
  files: [
    {
      id: String,
      filename: String,
      originalname: String,
      mimetype: String,
      size: Number,
    },
  ],
  reactions: {
    type: Map,
    of: [String],
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
