'use client';
import { Message } from '@/types';
import { MESSAGES_PER_PAGE } from '@/lib/constants';

const SECRET_KEY = 'userSecret';
const USER_ID_KEY = 'userId';

function randomHex(bytes: number) {
  // getRandomValues works on plain http (LAN) too, unlike crypto.randomUUID / crypto.subtle.
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getUserSecret(): string {
  let secret = localStorage.getItem(SECRET_KEY);
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
    secret = randomHex(32);
    localStorage.setItem(SECRET_KEY, secret);
    localStorage.removeItem(USER_ID_KEY);
  }
  return secret;
}

function authHeaders(username?: string): Record<string, string> {
  const headers: Record<string, string> = { 'x-user-secret': getUserSecret() };
  // Headers must be ASCII; usernames can contain Vietnamese characters.
  if (username) headers['x-username'] = encodeURIComponent(username);
  return headers;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getUserId(): Promise<string> {
  const cached = localStorage.getItem(USER_ID_KEY);
  const secret = getUserSecret();
  if (cached) return cached;
  const { userId } = await request<{ userId: string }>('/api/me', { headers: { 'x-user-secret': secret } });
  localStorage.setItem(USER_ID_KEY, userId);
  return userId;
}

export function fetchMessages(before?: string) {
  const params = new URLSearchParams({ limit: String(MESSAGES_PER_PAGE) });
  if (before) params.set('before', before);
  return request<{ messages: Message[]; hasMore: boolean }>(`/api/messages?${params}`);
}

export function sendMessage(username: string, text: string, files: File[]) {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('text', text);
  files.forEach((file) => formData.append('files', file));
  return request<{ message: Message }>('/api/messages', { method: 'POST', body: formData, headers: authHeaders() });
}

export function editMessage(id: string, text: string, username: string) {
  return request<Message>(`/api/messages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(username) },
    body: JSON.stringify({ text }),
  });
}

export function deleteMessage(id: string, username: string) {
  return request<{ message: string }>(`/api/messages/${id}`, { method: 'DELETE', headers: authHeaders(username) });
}

export function toggleReaction(id: string, reaction: string, username: string) {
  return request<Message>(`/api/messages/${id}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reaction, username }),
  });
}
