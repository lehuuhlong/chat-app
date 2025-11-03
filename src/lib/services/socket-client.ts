const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:5000';
const SOCKET_SERVER_SECRET = process.env.SOCKET_SERVER_SECRET || 'dev-secret-key-change-in-production';

export async function emitSocketEvent(event: string, data: any): Promise<void> {
  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: SOCKET_SERVER_SECRET,
        event,
        data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to emit socket event:', error);
      throw new Error(`Failed to emit socket event: ${error.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log(`Socket event emitted successfully: ${event}`);
    return result;
  } catch (error) {
    console.error('Error emitting socket event:', error);
    // Don't throw error to prevent API request from failing
    // Socket emission is not critical for API functionality
  }
}

export async function getOnlineUsers(): Promise<string[]> {
  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/online-users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch online users');
    }

    const users = await response.json();
    return users;
  } catch (error) {
    console.error('Error fetching online users:', error);
    return [];
  }
}
