import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/server/identity';

/** Returns the public userId derived from the caller's secret (used to detect "own" messages). */
export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Missing or invalid user identity' }, { status: 401 });
  }
  return NextResponse.json({ userId });
}
