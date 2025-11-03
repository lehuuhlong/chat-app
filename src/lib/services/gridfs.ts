import { MongoClient, ObjectId, GridFSBucket, Db } from 'mongodb';
import { Readable } from 'stream';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let cachedBucket: GridFSBucket | null = null;

async function getGridFSBucket(): Promise<{ db: Db; bucket: GridFSBucket }> {
  if (cachedClient && cachedDb && cachedBucket) {
    return { db: cachedDb, bucket: cachedBucket };
  }

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();

  const db = client.db();
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

  cachedClient = client;
  cachedDb = db;
  cachedBucket = bucket;

  return { db, bucket };
}

export async function uploadFile(buffer: Buffer, filename: string, mimetype: string, originalname: string): Promise<string> {
  const { bucket } = await getGridFSBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalname,
        mimetype,
        uploadDate: new Date(),
      },
    });

    const readableStream = Readable.from(buffer);

    readableStream.pipe(uploadStream);

    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });
  });
}

export async function downloadFile(fileId: string): Promise<{
  stream: NodeJS.ReadableStream;
  filename: string;
  contentType: string;
} | null> {
  if (!ObjectId.isValid(fileId)) {
    throw new Error('Invalid file id');
  }

  const { db, bucket } = await getGridFSBucket();
  const _id = new ObjectId(fileId);

  const fileDoc = await db.collection('uploads.files').findOne({ _id });

  if (!fileDoc) {
    return null;
  }

  const downloadStream = bucket.openDownloadStream(_id);

  return {
    stream: downloadStream,
    filename: fileDoc.filename || 'download',
    contentType: fileDoc.metadata?.mimetype || 'application/octet-stream',
  };
}

export async function deleteFile(fileId: string): Promise<void> {
  if (!ObjectId.isValid(fileId)) {
    console.error('Invalid file id for deletion:', fileId);
    return;
  }

  try {
    const { bucket } = await getGridFSBucket();
    const _id = new ObjectId(fileId);
    await bucket.delete(_id);
  } catch (err) {
    console.error('Error deleting file from GridFS:', err);
    throw err;
  }
}

export { getGridFSBucket };
