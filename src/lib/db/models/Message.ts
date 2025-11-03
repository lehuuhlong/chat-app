import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFile {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface IMessage extends Document {
  username: string;
  text: string;
  file?: IFile;
  files: IFile[];
  reactions: Map<string, string[]>;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  username: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    default: '',
  },
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
    default: new Map(),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent model recompilation in development
const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);

export default Message;
