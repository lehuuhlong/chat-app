import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import Message, { IFile, serializeMessage } from '@/lib/db/models/Message';
import { uploadFile, deleteFiles } from '@/lib/services/gridfs';
import { emitSocketEvent } from '@/lib/services/socket-client';
import { getRequestUserId } from '@/lib/server/identity';
import { MAX_FILE_SIZE, MAX_FILES, MAX_TEXT_LENGTH, MAX_USERNAME_LENGTH, MESSAGES_PER_PAGE } from '@/lib/constants';

const MAX_PAGE_SIZE = 50;

/**
 * Cursor-based pagination: `?before=<messageId>&limit=20`.
 * Offset (skip) pagination breaks in a live chat — every new message shifts the pages,
 * so "load more" returned duplicates. A cursor is stable and doesn't need countDocuments().
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const before = searchParams.get('before');
    const limitParam = parseInt(searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_PAGE_SIZE) : MESSAGES_PER_PAGE;

    const filter: Record<string, unknown> = {};
    if (before) {
      if (!mongoose.isValidObjectId(before)) {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
      }
      filter._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    // Fetch one extra row to know whether older messages exist.
    const docs = await Message.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    const messages = docs.slice(0, limit).reverse().map(serializeMessage);

    return NextResponse.json({ messages, hasMore });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Error fetching messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const uploadedIds: string[] = [];
  try {
    const userId = getRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Missing or invalid user identity' }, { status: 401 });
    }

    const formData = await request.formData();
    const username = String(formData.get('username') || '').trim();
    const text = String(formData.get('text') || '');
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);

    // Validate everything up-front so we never leave orphaned uploads behind.
    if (!username || username.length > MAX_USERNAME_LENGTH) {
      return NextResponse.json({ error: `Username is required (max ${MAX_USERNAME_LENGTH} characters)` }, { status: 400 });
    }
    if (!text.trim() && files.length === 0) {
      return NextResponse.json({ error: 'Message must contain text or files' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_TEXT_LENGTH} characters)` }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Too many files. Maximum ${MAX_FILES} files per message.` }, { status: 400 });
    }
    const tooLarge = files.find((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge) {
      return NextResponse.json({ error: `"${tooLarge.name}" is larger than 10MB.` }, { status: 400 });
    }

    await connectDB();

    const uploadedFiles: IFile[] = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name}`;
        const mimetype = file.type || 'application/octet-stream';
        const id = await uploadFile(buffer, filename, mimetype, file.name);
        uploadedIds.push(id);
        return { id, filename, originalname: file.name, mimetype, size: file.size };
      }),
    );

    const message = await Message.create({
      username,
      userId,
      text: text.trim() ? text : '',
      files: uploadedFiles,
    });

    const messageObj = serializeMessage(message);
    await emitSocketEvent('message', messageObj);

    return NextResponse.json({ success: true, message: messageObj }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    if (uploadedIds.length > 0) await deleteFiles(uploadedIds);
    return NextResponse.json({ error: 'Error creating message. Please try again.' }, { status: 500 });
  }
}
