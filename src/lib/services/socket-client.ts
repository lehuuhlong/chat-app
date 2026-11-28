const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:5000';
const SOCKET_SERVER_SECRET = process.env.SOCKET_SERVER_SECRET || 'dev-secret-key-change-in-production';

// The API response must not hang if the socket server is slow or asleep (e.g. Render free tier).
const EMIT_TIMEOUT_MS = 3000;

export async function emitSocketEvent(event: string, data: unknown): Promise<void> {
  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SOCKET_SERVER_SECRET, event, data }),
      signal: AbortSignal.timeout(EMIT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error(`Failed to emit socket event "${event}":`, error);
    }
  } catch (error) {
    // Socket emission is not critical for the API request itself.
    console.error(`Error emitting socket event "${event}":`, error);
  }
}

export async function getOnlineUsers(): Promise<string[]> {
  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/online-users`, {
      signal: AbortSignal.timeout(EMIT_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error('Failed to fetch online users');
    return await response.json();
  } catch (error) {
    console.error('Error fetching online users:', error);
    return [];
  }
}
