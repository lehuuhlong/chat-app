import { NextResponse } from 'next/server';
import { getOnlineUsers } from '@/lib/services/socket-client';

export async function GET() {
  try {
    const users = await getOnlineUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json({ error: 'Error fetching online users' }, { status: 500 });
  }
}
