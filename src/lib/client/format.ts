import type { Message, MessageFile } from '@/types';

export type FileKind = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'other';

const EXT_KIND: Record<string, FileKind> = {};
const register = (kind: FileKind, exts: string[]) => exts.forEach((e) => (EXT_KIND[e] = kind));
register('image', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'jfif', 'avif']);
register('audio', ['mp3', 'wav', 'ogg', 'm4a', 'aac']);
register('video', ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']);
register('pdf', ['pdf']);
register('document', ['doc', 'docx', 'txt', 'rtf', 'odt']);
register('spreadsheet', ['xls', 'xlsx', 'csv', 'ods']);
register('presentation', ['ppt', 'pptx', 'odp']);
register('archive', ['zip', 'rar', '7z', 'tar', 'gz']);

/**
 * MIME type wins over the extension. The old extension-only check rendered every `.webm`
 * video as audio (and voice messages recorded on Safari are `.mp4`).
 */
export function getFileKind(name: string, mimetype?: string): FileKind {
  const mime = (mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXT_KIND[ext] || 'other';
}

const KIND_ICON: Record<FileKind, string> = {
  image: '🖼️',
  audio: '🎵',
  video: '🎬',
  pdf: '📄',
  document: '📝',
  spreadsheet: '📊',
  presentation: '📋',
  archive: '🗜️',
  other: '📎',
};

export const getFileIcon = (name: string, mimetype?: string) => KIND_ICON[getFileKind(name, mimetype)];

export function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Messages may store attachments in the legacy `file` field or in `files`. */
export function getMessageFiles(message: Message): MessageFile[] {
  if (message.files && message.files.length > 0) return message.files;
  if (message.file?.id) return [message.file];
  return [];
}

export const authorKey = (m: Message) => m.userId || `name:${m.username}`;

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDayLabel(date: Date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-blue-600',
  'from-red-500 to-orange-500',
  'from-teal-500 to-green-500',
];

/** Single source of truth so the header avatar and message avatars use the same color. */
export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
