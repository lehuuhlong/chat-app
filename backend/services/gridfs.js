import { MongoClient, ObjectId, GridFSBucket } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let mongoClient, db, bucket;

async function getGridFS() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });
    await mongoClient.connect();
    db = mongoClient.db();
    bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  }
  return { db, bucket };
}

export const downloadFileStream = async (req, res) => {
  try {
    const { bucket } = await getGridFS();
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid file id' });
    }
    const _id = new ObjectId(req.params.id);
    const fileDoc = await db.collection('uploads.files').findOne({ _id });

    if (!fileDoc) {
      return res.status(404).json({ error: 'File not found' });
    }

    const downloadStream = bucket.openDownloadStream(_id);
    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileDoc.filename)}"`);
    downloadStream.pipe(res);
  } catch (err) {
    console.error('File download error:', err);
    res.status(500).json({ error: 'Error downloading file' });
  }
};

export const deleteFile = async (fileId) => {
  try {
    if (!ObjectId.isValid(fileId)) {
      console.error('Invalid file id for deletion:', fileId);
      return;
    }
    const { bucket } = await getGridFS();
    const _id = new ObjectId(fileId);
    await bucket.delete(_id);
  } catch (err) {
    console.error('Error deleting file from GridFS:', err);
  }
};
