import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Message from '@/lib/db/models/Message';
import { uploadFile } from '@/lib/services/gridfs';
import { emitSocketEvent } from '@/lib/services/socket-client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalMessages = await Message.countDocuments();

    // Get messages with pagination, sorted by newest first for pagination, then reverse
    const messages = await Message.find()
      .sort({ createdAt: -1 }) // Newest first for pagination
      .skip(skip)
      .limit(limit)
      .lean();

    // Reverse to show oldest first in the UI
    const reversedMessages = messages.reverse();

    // Convert reactions Map to object
    const result = reversedMessages.map((msg: any) => {
      if (msg.reactions && msg.reactions instanceof Map) {
        msg.reactions = Object.fromEntries(msg.reactions);
      } else if (msg.reactions && typeof msg.reactions === 'object') {
        // Already an object from .lean(), keep as is
        msg.reactions = msg.reactions;
      }
      return msg;
    });

    // Calculate pagination info
    const hasMore = skip + limit < totalMessages;
    const totalPages = Math.ceil(totalMessages / limit);

    return NextResponse.json({
      messages: result,
      pagination: {
        currentPage: page,
        totalPages,
        totalMessages,
        hasMore,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Error fetching messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const username = formData.get('username') as string;
    const text = formData.get('text') as string;
    const files = formData.getAll('files') as File[];

    // Validate required fields
    if (!username || (!text && files.length === 0)) {
      return NextResponse.json({ error: 'Username and either text or files are required' }, { status: 400 });
    }

    // Validate file count
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Too many files. Maximum ${MAX_FILES} files per message.` }, { status: 400 });
    }

    // Process file uploads
    const uploadedFiles = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size too large. Maximum size is 10MB per file.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name}`;

      try {
        const fileId = await uploadFile(buffer, filename, file.type, file.name);
        uploadedFiles.push({
          id: fileId,
          filename,
          originalname: file.name,
          mimetype: file.type,
          size: file.size,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Error uploading file. Please try again.' }, { status: 500 });
      }
    }

    // Create message data
    const messageData: any = {
      username,
      text: text || '',
      files: uploadedFiles,
    };

    // Backward compatibility - if only one file, also set file field
    if (uploadedFiles.length === 1) {
      messageData.file = uploadedFiles[0];
    }

    const message = new Message(messageData);
    await message.save();

    // Convert to plain object and handle reactions Map
    const messageObj = message.toObject();
    if (messageObj.reactions) {
      messageObj.reactions = Object.fromEntries(messageObj.reactions);
    }

    // Emit Socket.IO event
    await emitSocketEvent('message', messageObj);

    return NextResponse.json(
      {
        success: true,
        message: messageObj,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Error creating message. Please try again.' }, { status: 500 });
  }
}
