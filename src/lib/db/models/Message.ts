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
  userId?: string;
  text: string;
  /** Legacy single-file field. New messages only use `files`. */
  file?: IFile;
  files: IFile[];
  reactions: Map<string, string[]>;
  editedAt?: Date;
  createdAt: Date;
}

const fileSchema = {
  id: String,
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
};

const messageSchema = new Schema<IMessage>({
  username: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    index: true,
  },
  text: {
    type: String,
    default: '',
  },
  file: fileSchema,
  files: [fileSchema],
  reactions: {
    type: Map,
    of: [String],
    default: () => new Map(),
  },
  editedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent model recompilation in development
const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);

/** Convert a mongoose doc / lean object into the JSON shape the client expects. */
export function serializeMessage(msg: any) {
  const obj = typeof msg.toObject === 'function' ? msg.toObject() : { ...msg };
  if (obj.reactions instanceof Map) {
    obj.reactions = Object.fromEntries(obj.reactions);
  }
  // Drop empty reaction buckets left behind by $pull
  if (obj.reactions && typeof obj.reactions === 'object') {
    for (const [emoji, users] of Object.entries(obj.reactions)) {
      if (!Array.isArray(users) || users.length === 0) delete obj.reactions[emoji];
    }
  }
  delete obj.__v;
  return obj;
}

export default Message;
