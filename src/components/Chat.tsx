'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import { Message } from '@/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { DeleteModal } from './DeleteModal';
import { TypingIndicator } from './TypingIndicator';
import { UsernameModal } from './UsernameModal';
import { generateRandomName } from '@/lib/name-generator';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
let socket: any;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [username, setUsername] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; messageId: string | null }>({
    isOpen: false,
    messageId: null,
  });
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MESSAGES_PER_PAGE = 10;

  // Load messages with pagination
  const loadMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoadingMore(true);
      const response = await fetch(`/api/messages?page=${pageNum}&limit=${MESSAGES_PER_PAGE}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.messages) {
        if (append) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }

        if (data.pagination) {
          setHasMore(data.pagination.hasMore);
        }
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  // Load more messages when scrolling to top
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadMessages(page + 1, true);
    }
  }, [loadMessages, page, isLoadingMore, hasMore]);

  useEffect(() => {
    // Check for saved username, or generate a new one
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      const newUsername = generateRandomName();
      setUsername(newUsername);
      localStorage.setItem('username', newUsername);
    }

    // Load initial messages with pagination
    loadMessages(1, false);

    fetch('/api/online-users')
      .then((res) => res.json())
      .then(setOnlineUsers);

    socket = io(SOCKET_URL);
    socket.on('message', (msg: Message) => {
      setMessages((prev) => {
        // Notify if window is not focused and message is not from self
        if (typeof window !== 'undefined' && document.visibilityState !== 'visible' && msg.username !== username) {
          if (window.Notification && Notification.permission === 'granted') {
            new Notification(`New message from ${msg.username}`, {
              body: msg.text || 'You have a new message',
              icon: '/favicon.ico',
            });
          }
        }
        return [...prev, msg];
      });
    });
    socket.on('messageDeleted', (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });
    socket.on('messageEdited', (data: { _id: string; text: string }) => {
      setMessages((prev) => prev.map((msg) => (msg._id === data._id ? { ...msg, text: data.text } : msg)));
    });
    socket.on('messageReacted', (data: { _id: string; reactions: { [key: string]: string[] } }) => {
      setMessages((prev) => prev.map((msg) => (msg._id === data._id ? { ...msg, reactions: data.reactions } : msg)));
    });
    socket.on('typing', (username: string) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(username);
        return newSet;
      });
    });
    socket.on('stopTyping', (username: string) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    });
    socket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });
    // Yêu cầu quyền thông báo khi load lần đầu
    if (typeof window !== 'undefined' && window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    return () => socket.disconnect();
  }, [username]);

  useEffect(() => {
    if (username && socket) {
      socket.emit('userOnline', username);
    }
  }, [username]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || isSubmitting) return;
    if (!text.trim() && files.length === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('text', text);

      // Add each file to formData
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let browser set it with boundary for FormData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      setText('');
      setFiles([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      alert(`Failed to send message: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    localStorage.setItem('username', newUsername);
  };

  // Lọc tin nhắn theo search
  const filteredMessages = search.trim()
    ? messages.filter((msg) => msg.text?.toLowerCase().includes(search.toLowerCase()) || msg.username?.toLowerCase().includes(search.toLowerCase()))
    : messages;

  // Generate avatar color from username
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-orange-500 to-amber-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-3xl glass rounded-3xl flex flex-col h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 dark:border-white/5 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>Messenger</h1>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="online-dot"></span>
                  <span>{onlineUsers.length} online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsUsernameModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl glass-subtle hover:scale-[1.02] transition-smooth cursor-pointer"
            >
              <div className={`avatar bg-gradient-to-br ${getAvatarColor(username)} w-7 h-7 text-[11px]`}>
                {username.charAt(0)}
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {username || 'Set Name'}
              </span>
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
            </button>
          </div>

          {/* Online Users Bar */}
          <div className="px-6 py-2.5 border-b border-white/10 dark:border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {onlineUsers.length === 0 ? (
              <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>No one online</span>
            ) : (
              onlineUsers.map((user) => (
                <motion.div
                  key={user}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-smooth flex-shrink-0 ${
                    user === username
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 dark:border-indigo-500/30'
                      : 'glass-subtle'
                  }`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span className="online-dot"></span>
                  {user}
                  {user === username && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold">
                      you
                    </span>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Search Bar */}
          <div className="px-6 py-2.5 border-b border-white/10 dark:border-white/5">
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
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
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
            username={username}
            onDelete={(messageId) => setDeleteModal({ isOpen: true, messageId })}
            search={search}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />

          {/* Typing Indicator */}
          <div className="relative">
            <TypingIndicator typingUsers={typingUsers} currentUser={username} />
          </div>

          {/* Chat Input */}
          <ChatInput
            username={username}
            text={text}
            files={files}
            isSubmitting={isSubmitting}
            onTextChange={setText}
            onFilesChange={setFiles}
            onSubmit={handleSendMessage}
            onTyping={() => {
              if (username) {
                socket.emit('typing', username);
              }
            }}
            onStopTyping={() => {
              if (username) {
                socket.emit('stopTyping', username);
              }
            }}
          />
        </motion.div>
      </div>
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, messageId: null })}
        onConfirm={async () => {
          if (!deleteModal.messageId) return;
          try {
            const response = await fetch(`/api/messages/${deleteModal.messageId}`, {
              method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete message');
          } catch (error) {
            alert('Failed to delete message. Please try again!');
          }
        }}
      />
      <UsernameModal
        isOpen={isUsernameModalOpen}
        onClose={() => setIsUsernameModalOpen(false)}
        onSave={handleUsernameChange}
        currentUsername={username}
      />
    </>
  );
}
