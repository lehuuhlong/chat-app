import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import Message, { serializeMessage } from '@/lib/db/models/Message';
import { deleteFiles } from '@/lib/services/gridfs';
import { emitSocketEvent } from '@/lib/services/socket-client';
import { canModifyMessage } from '@/lib/server/identity';
import { MAX_TEXT_LENGTH } from '@/lib/constants';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text : '';

    if (!text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_TEXT_LENGTH} characters)` }, { status: 400 });
    }

    await connectDB();
    const message = await Message.findById(id);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (!canModifyMessage(message, request)) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }

    message.text = text;
    message.editedAt = new Date();
    await message.save();

    await emitSocketEvent('messageEdited', { _id: message._id, text, editedAt: message.editedAt });

    return NextResponse.json(serializeMessage(message));
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Error updating message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await connectDB();
    const message = await Message.findById(id);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (!canModifyMessage(message, request)) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    const fileIds = new Set<string>();
    message.files?.forEach((f) => f.id && fileIds.add(f.id));
    if (message.file?.id) fileIds.add(message.file.id);

    await message.deleteOne();
    await deleteFiles([...fileIds]);

    await emitSocketEvent('messageDeleted', id);

    return NextResponse.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Error deleting message' }, { status: 500 });
  }
}
