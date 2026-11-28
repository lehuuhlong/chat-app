// Shared between client and server so validation rules never drift apart.
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
export const MAX_FILES = 10;
export const MAX_TEXT_LENGTH = 5000;
export const MAX_USERNAME_LENGTH = 30;
export const MESSAGES_PER_PAGE = 20;
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Consecutive messages from the same author within this window are visually grouped.
export const GROUP_WINDOW_MS = 5 * 60 * 1000;
