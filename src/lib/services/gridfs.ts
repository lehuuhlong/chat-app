import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';

const { GridFSBucket, ObjectId } = mongoose.mongo;

/**
 * Reuse the cached mongoose connection instead of opening a second MongoClient
 * (the old version leaked a new client on every dev hot-reload).
 */
async function getBucket() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready');
  return { db, bucket: new GridFSBucket(db, { bucketName: 'uploads' }) };
}

export async function uploadFile(buffer: Buffer, filename: string, mimetype: string, originalname: string): Promise<string> {
  const { bucket } = await getBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { originalname, mimetype, uploadDate: new Date() },
    });
    uploadStream.once('finish', () => resolve(uploadStream.id.toString()));
    uploadStream.once('error', reject);
    uploadStream.end(buffer);
  });
}

export interface StoredFile {
  length: number;
  filename: string;
  originalname: string;
  contentType: string;
  openStream: (range?: { start: number; end: number }) => NodeJS.ReadableStream;
}

export async function getFile(fileId: string): Promise<StoredFile | null> {
  if (!ObjectId.isValid(fileId)) {
    throw new Error('Invalid file id');
  }

  const { db, bucket } = await getBucket();
  const _id = new ObjectId(fileId);
  const fileDoc = await db.collection('uploads.files').findOne({ _id });
  if (!fileDoc) return null;

  return {
    length: fileDoc.length,
    filename: fileDoc.filename || 'download',
    originalname: fileDoc.metadata?.originalname || fileDoc.filename || 'download',
    contentType: fileDoc.metadata?.mimetype || 'application/octet-stream',
    // GridFS `end` is exclusive, HTTP Range `end` is inclusive.
    openStream: (range) => bucket.openDownloadStream(_id, range ? { start: range.start, end: range.end + 1 } : undefined),
  };
}

export async function deleteFile(fileId: string): Promise<void> {
  if (!ObjectId.isValid(fileId)) {
    console.error('Invalid file id for deletion:', fileId);
    return;
  }
  const { bucket } = await getBucket();
  await bucket.delete(new ObjectId(fileId));
}

export async function deleteFiles(fileIds: string[]): Promise<void> {
  const results = await Promise.allSettled(fileIds.map((id) => deleteFile(id)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Error deleting file ${fileIds[i]}:`, r.reason);
  });
}
