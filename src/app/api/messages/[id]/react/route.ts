import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Message from '@/lib/db/models/Message';
import { emitSocketEvent } from '@/lib/services/socket-client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { reaction, username } = body;

    if (!reaction || !username) {
      return NextResponse.json({ error: 'Reaction and username are required' }, { status: 400 });
    }

    const message = await Message.findById(id);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Get current reactions or initialize empty Map
    const reactions = message.reactions || new Map<string, string[]>();
    const users = reactions.get(reaction) || [];

    // Toggle reaction - remove if exists, add if not
    if (users.includes(username)) {
      const updatedUsers = users.filter((user) => user !== username);
      if (updatedUsers.length === 0) {
        reactions.delete(reaction);
      } else {
        reactions.set(reaction, updatedUsers);
      }
    } else {
      reactions.set(reaction, [...users, username]);
    }

    message.reactions = reactions;
    await message.save();

    // Convert to plain object and handle reactions Map
    const messageObj: any = message.toObject();
    if (messageObj.reactions && messageObj.reactions instanceof Map) {
      messageObj.reactions = Object.fromEntries(messageObj.reactions);
    }

    // Emit Socket.IO event
    const reactionsObj = message.reactions instanceof Map ? Object.fromEntries(message.reactions) : message.reactions;

    await emitSocketEvent('messageReacted', {
      _id: message._id,
      reactions: reactionsObj,
    });

    return NextResponse.json(messageObj);
  } catch (error) {
    console.error('Error reacting to message:', error);
    return NextResponse.json({ error: 'Error reacting to message' }, { status: 500 });
  }
}
