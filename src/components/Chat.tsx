'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io, { Socket } from 'socket.io-client';
import { Message } from '@/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { DeleteModal } from './DeleteModal';
import { TypingIndicator } from './TypingIndicator';
import { UsernameModal } from './UsernameModal';
import { ToastStack, ToastItem } from './Toast';
import { generateRandomName } from '@/lib/name-generator';
import { getAvatarColor } from '@/lib/client/format';
import { deleteMessage, editMessage, fetchMessages, getUserId, sendMessage, toggleReaction } from '@/lib/client/api';
import { MAX_FILE_SIZE, MAX_FILES, MAX_TEXT_LENGTH, MAX_USERNAME_LENGTH } from '@/lib/constants';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
// If a "stopTyping" event is lost, the indicator still disappears after this delay.
const TYPING_EXPIRY_MS = 5000;

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Please try again.');

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Refs let socket handlers read the latest values without re-subscribing (the old code
  // reconnected the socket and reloaded all messages every time the username changed).
  const socketRef = useRef<Socket | null>(null);
  const usernameRef = useRef('');
  const userIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const filesRef = useRef<File[]>([]);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const typingTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const unreadRef = useRef(0);
  const baseTitleRef = useRef('');
  const dragCounterRef = useRef(0);
  const toastIdRef = useRef(0);

  messagesRef.current = messages;

  // ---------- Toasts ----------
  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message: string, type: ToastItem['type'] = 'error') => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast],
  );

  // ---------- Attachments ----------
  const updateFiles = useCallback((next: File[]) => {
    filesRef.current = next;
    setFiles(next);
  }, []);

  /** Validate on the client so users don't upload 50MB just to be rejected by the server. */
  const addFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0) return;
      const tooLarge = incoming.filter((f) => f.size > MAX_FILE_SIZE);
      const accepted = incoming.filter((f) => f.size > 0 && f.size <= MAX_FILE_SIZE);
      if (tooLarge.length > 0) {
        notify(`${tooLarge.map((f) => f.name).join(', ')} ${tooLarge.length === 1 ? 'is' : 'are'} larger than 10MB`);
      }
      const room = MAX_FILES - filesRef.current.length;
      if (accepted.length > room) notify(`You can attach up to ${MAX_FILES} files per message`);
      const toAdd = accepted.slice(0, Math.max(0, room));
      if (toAdd.length > 0) updateFiles([...filesRef.current, ...toAdd]);
    },
    [notify, updateFiles],
  );

  const removeFile = useCallback(
    (index: number) => updateFiles(filesRef.current.filter((_, i) => i !== index)),
    [updateFiles],
  );

  // ---------- Drag & drop ----------
  const hasDraggedFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');

  const handleDragEnter = (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  };

  // ---------- Loading messages ----------
  const setHasMoreBoth = (value: boolean) => {
    hasMoreRef.current = value;
    setHasMore(value);
  };

  /** Loads the newest page. Also used after a reconnect to catch up on missed messages. */
  const loadLatest = useCallback(async () => {
    const isFirstLoad = messagesRef.current.length === 0;
    try {
      const data = await fetchMessages();
      setMessages((prev) => {
        if (prev.length === 0 || data.messages.length === 0) return data.messages;
        // Keep the older history we already have, replace the window covered by this page
        // (this also drops messages that were deleted while we were offline).
        const oldestFetched = data.messages[0]._id;
        return [...prev.filter((m) => m._id < oldestFetched), ...data.messages];
      });
      if (isFirstLoad) setHasMoreBoth(data.hasMore);
    } catch (e) {
      notify(`Could not load messages: ${errorMessage(e)}`);
    } finally {
      setIsInitialLoading(false);
    }
  }, [notify]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0]?._id;
    if (!oldest || isLoadingMoreRef.current || !hasMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadError(false);
    try {
      const data = await fetchMessages(oldest);
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m._id));
        return [...data.messages.filter((m) => !known.has(m._id)), ...prev];
      });
      setHasMoreBoth(data.hasMore);
    } catch (e) {
      setLoadError(true);
      notify(`Could not load older messages: ${errorMessage(e)}`);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [notify]);

  // ---------- Typing ----------
  const removeTypingUser = useCallback((name: string) => {
    const timers = typingTimersRef.current;
    clearTimeout(timers.get(name));
    timers.delete(name);
    setTypingUsers((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : prev));
  }, []);

  const addTypingUser = useCallback(
    (name: string) => {
      const timers = typingTimersRef.current;
      clearTimeout(timers.get(name));
      timers.set(
        name,
        setTimeout(() => removeTypingUser(name), TYPING_EXPIRY_MS),
      );
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    },
    [removeTypingUser],
  );

  const isOwn = (msg: Message) => (msg.userId ? msg.userId === userIdRef.current : msg.username === usernameRef.current);

  // ---------- Socket & bootstrap (runs once) ----------
  useEffect(() => {
    let savedName = localStorage.getItem('username')?.trim().slice(0, MAX_USERNAME_LENGTH);
    if (!savedName) {
      savedName = generateRandomName();
      localStorage.setItem('username', savedName);
    }
    usernameRef.current = savedName;
    setUsername(savedName);

    getUserId()
      .then((id) => {
        userIdRef.current = id;
        setUserId(id);
      })
      .catch(() => notify('Could not verify your identity. Editing your messages may not work.'));

    loadLatest();

    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    let connectedBefore = false;

    socket.on('connect', () => {
      setIsConnected(true);
      // Re-announce on every (re)connect, otherwise we disappear from the online list after a network blip.
      socket.emit('userOnline', usernameRef.current);
      if (connectedBefore) loadLatest();
      connectedBefore = true;
    });
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('message', (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      removeTypingUser(msg.username);

      if (!isOwn(msg) && document.visibilityState !== 'visible') {
        unreadRef.current += 1;
        document.title = `(${unreadRef.current}) ${baseTitleRef.current}`;
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(`New message from ${msg.username}`, {
            body: msg.text || '📎 Sent an attachment',
            icon: '/favicon.ico',
            tag: 'chat-message',
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
      }
    });
    socket.on('messageDeleted', (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });
    socket.on('messageEdited', (data: { _id: string; text: string; editedAt?: string }) => {
      setMessages((prev) => prev.map((msg) => (msg._id === data._id ? { ...msg, text: data.text, editedAt: data.editedAt } : msg)));
    });
    socket.on('messageReacted', (data: { _id: string; reactions: Message['reactions'] }) => {
      setMessages((prev) => prev.map((msg) => (msg._id === data._id ? { ...msg, reactions: data.reactions } : msg)));
    });
    socket.on('userTyping', addTypingUser);
    socket.on('userStoppedTyping', removeTypingUser);
    socket.on('onlineUsers', setOnlineUsers);

    const timers = typingTimersRef.current;
    return () => {
      socket.disconnect();
      socketRef.current = null;
      timers.forEach(clearTimeout);
      timers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unread counter in the tab title
  useEffect(() => {
    baseTitleRef.current = document.title;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && unreadRef.current > 0) {
        unreadRef.current = 0;
        document.title = baseTitleRef.current;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ---------- Actions ----------
  const handleSend = useCallback(
    async (text: string): Promise<boolean> => {
      const name = usernameRef.current;
      const toSend = filesRef.current;
      if (!name || (!text.trim() && toSend.length === 0)) return false;
      if (text.length > MAX_TEXT_LENGTH) {
        notify(`Message is too long (max ${MAX_TEXT_LENGTH} characters)`);
        return false;
      }

      setIsSubmitting(true);
      try {
        const { message } = await sendMessage(name, text, toSend);
        // Add from the response too, so the sender sees the message even if the socket is down.
        setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
        // Only remove files that were actually sent (the user may have attached more meanwhile).
        updateFiles(filesRef.current.filter((f) => !toSend.includes(f)));
        // Ask for notification permission after a user gesture — browsers block/penalize it on page load.
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
        return true;
      } catch (e) {
        notify(`Failed to send message: ${errorMessage(e)}`);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [notify, updateFiles],
  );

  const handleEdit = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      try {
        const updated = await editMessage(id, text, usernameRef.current);
        setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, text: updated.text, editedAt: updated.editedAt } : m)));
        return true;
      } catch (e) {
        notify(`Failed to edit message: ${errorMessage(e)}`);
        return false;
      }
    },
    [notify],
  );

  const handleReact = useCallback(
    async (id: string, emoji: string) => {
      try {
        const updated = await toggleReaction(id, emoji, usernameRef.current);
        setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, reactions: updated.reactions } : m)));
      } catch (e) {
        notify(`Failed to react: ${errorMessage(e)}`);
      }
    },
    [notify],
  );

  const handleConfirmDelete = useCallback(async () => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    if (!id) return;
    try {
      await deleteMessage(id, usernameRef.current);
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (e) {
      notify(`Failed to delete message: ${errorMessage(e)}`);
    }
  }, [deleteTargetId, notify]);

  const requestDelete = useCallback((id: string) => setDeleteTargetId(id), []);

  const handleUsernameChange = useCallback((newUsername: string) => {
    usernameRef.current = newUsername;
    setUsername(newUsername);
    localStorage.setItem('username', newUsername);
    socketRef.current?.emit('userOnline', newUsername);
  }, []);

  const emitTyping = useCallback(() => socketRef.current?.emit('typing'), []);
  const emitStopTyping = useCallback(() => socketRef.current?.emit('stopTyping'), []);

  const filteredMessages = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return messages;
    return messages.filter((msg) => msg.text?.toLowerCase().includes(keyword) || msg.username?.toLowerCase().includes(keyword));
  }, [messages, search]);

  const otherTypingUsers = useMemo(() => typingUsers.filter((u) => u !== username), [typingUsers, username]);

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10 mobile-chat-wrapper">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-3xl glass rounded-3xl flex flex-col h-[92vh] mobile-chat-container overflow-hidden"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-none bg-indigo-500/10 backdrop-blur-sm rounded-3xl"
              >
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-indigo-400/70">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Thả ảnh hoặc file vào đây
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Tối đa {MAX_FILES} file, mỗi file ≤ 10MB
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 dark:border-white/5 rounded-t-3xl mobile-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>Messenger</h1>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {isConnected === false ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Reconnecting…</span>
                    </>
                  ) : isConnected === null ? (
                    <span>Connecting…</span>
                  ) : (
                    <>
                      <span className="online-dot"></span>
                      <span>{onlineUsers.length} online</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsUsernameModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl glass-subtle hover:scale-[1.02] transition-smooth cursor-pointer mobile-username-btn"
              title="Change your name"
            >
              <div className={`avatar bg-gradient-to-br ${getAvatarColor(username)} w-7 h-7 text-[11px]`}>{username.charAt(0).toUpperCase()}</div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {username || 'Set Name'}
              </span>
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
            </button>
          </div>

          {/* Online Users Bar */}
          <div className="px-6 py-2.5 border-b border-white/10 dark:border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-hide mobile-online-bar">
            {onlineUsers.length === 0 ? (
              <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                No one online
              </span>
            ) : (
              onlineUsers.map((user) => (
                <motion.div
                  key={user}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-smooth flex-shrink-0 mobile-user-chip ${
                    user === username
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 dark:border-indigo-500/30'
                      : 'glass-subtle'
                  }`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span className="online-dot"></span>
                  <span className="mobile-user-chip-name">{user}</span>
                  {user === username && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold">you</span>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Search Bar */}
          <div className="px-6 py-2.5 border-b border-white/10 dark:border-white/5 mobile-search-bar">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
                placeholder="Search loaded messages..."
                className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm transition-smooth placeholder:text-gray-400 dark:placeholder:text-gray-500"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300/50 dark:bg-gray-600/50 flex items-center justify-center hover:bg-gray-400/50 transition-smooth"
                >
                  <svg className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <MessageList
            messages={filteredMessages}
            currentUserId={userId}
            username={username}
            search={search.trim()}
            onDelete={requestDelete}
            onEdit={handleEdit}
            onReact={handleReact}
            onLoadMore={loadOlder}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            loadError={loadError}
            isInitialLoading={isInitialLoading}
          />

          {/* Typing Indicator */}
          <div className="relative">
            <TypingIndicator users={otherTypingUsers} />
          </div>

          {/* Chat Input */}
          <ChatInput
            username={username}
            files={files}
            isSubmitting={isSubmitting}
            onSend={handleSend}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            onTyping={emitTyping}
            onStopTyping={emitStopTyping}
            onError={notify}
          />
        </motion.div>
      </div>
      <DeleteModal isOpen={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} onConfirm={handleConfirmDelete} />
      <UsernameModal
        isOpen={isUsernameModalOpen}
        onClose={() => setIsUsernameModalOpen(false)}
        onSave={handleUsernameChange}
        currentUsername={username}
      />
    </>
  );
}
