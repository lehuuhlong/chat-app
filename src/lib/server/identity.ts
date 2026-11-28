import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Lightweight anonymous identity.
 *
 * Each browser keeps a random secret in localStorage and sends it in the `x-user-secret` header.
 * The public userId is derived from that secret on the server, so:
 *  - two people with the same display name are still different users;
 *  - knowing someone's (public) userId is not enough to edit/delete their messages.
 */
const SECRET_PATTERN = /^[a-f0-9]{64}$/;

export function deriveUserId(secret: string): string {
  return createHash('sha256').update(`chat-user:${secret}`).digest('hex').slice(0, 32);
}

export function getRequestUserId(request: NextRequest): string | null {
  const secret = request.headers.get('x-user-secret');
  if (!secret || !SECRET_PATTERN.test(secret)) return null;
  return deriveUserId(secret);
}

export function getRequestUsername(request: NextRequest): string | null {
  const raw = request.headers.get('x-username');
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/**
 * Messages created before userId existed only have a username, so for those we fall back
 * to the old (weaker) username match to keep them editable by their author.
 */
export function canModifyMessage(message: { userId?: string; username: string }, request: NextRequest): boolean {
  if (message.userId) {
    return getRequestUserId(request) === message.userId;
  }
  return getRequestUsername(request) === message.username;
}
