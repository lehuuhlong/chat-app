import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Message from '@/lib/db/models/Message';
import { deleteFile } from '@/lib/services/gridfs';
import { emitSocketEvent } from '@/lib/services/socket-client';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const message = await Message.findById(id);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    message.text = text;
    await message.save();

    // Convert to plain object and handle reactions Map
    const messageObj: any = message.toObject();
    if (messageObj.reactions && messageObj.reactions instanceof Map) {
      messageObj.reactions = Object.fromEntries(messageObj.reactions);
    }

    // Emit Socket.IO event
    await emitSocketEvent('messageEdited', { _id: message._id, text });

    return NextResponse.json(messageObj);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Error updating message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const message = await Message.findById(id);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Delete associated files from GridFS
    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        try {
          await deleteFile(file.id);
        } catch (error) {
          console.error(`Error deleting file ${file.id}:`, error);
        }
      }
    } else if (message.file && message.file.id) {
      try {
        await deleteFile(message.file.id);
      } catch (error) {
        console.error(`Error deleting file ${message.file.id}:`, error);
      }
    }

    await Message.findByIdAndDelete(id);

    // Emit Socket.IO event
    await emitSocketEvent('messageDeleted', id);

    return NextResponse.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Error deleting message' }, { status: 500 });
  }
}
