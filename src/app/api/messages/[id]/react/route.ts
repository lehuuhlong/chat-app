import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import Message, { serializeMessage } from '@/lib/db/models/Message';
import { emitSocketEvent } from '@/lib/services/socket-client';
import { REACTION_EMOJIS, MAX_USERNAME_LENGTH } from '@/lib/constants';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reaction = body.reaction;
    const username = typeof body.username === 'string' ? body.username.trim() : '';

    // Whitelisting the emoji also prevents arbitrary keys like "$set" or "a.b" in the Map path.
    if (!REACTION_EMOJIS.includes(reaction) || !username || username.length > MAX_USERNAME_LENGTH) {
      return NextResponse.json({ error: 'Invalid reaction or username' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    await connectDB();
    const path = `reactions.${reaction}`;

    // Atomic toggle: try to remove first; if the user hadn't reacted, add instead.
    // The old read-modify-write lost reactions when two people reacted at the same time.
    let message = await Message.findOneAndUpdate({ _id: id, [path]: username }, { $pull: { [path]: username } }, { new: true });
    if (!message) {
      message = await Message.findByIdAndUpdate(id, { $addToSet: { [path]: username } }, { new: true });
    }
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const messageObj = serializeMessage(message);
    await emitSocketEvent('messageReacted', { _id: message._id, reactions: messageObj.reactions });

    return NextResponse.json(messageObj);
  } catch (error) {
    console.error('Error reacting to message:', error);
    return NextResponse.json({ error: 'Error reacting to message' }, { status: 500 });
  }
}
