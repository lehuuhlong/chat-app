'use client';
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { Message } from '@/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { DeleteModal } from './DeleteModal';
import { TypingIndicator } from './TypingIndicator';
import { UsernameModal } from './UsernameModal';
import { generateRandomName } from '@/lib/name-generator';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
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
      const response = await fetch(`${API_URL}/api/messages?page=${pageNum}&limit=${MESSAGES_PER_PAGE}`);
      const data = await response.json();

      if (append) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load messages:', error);
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

    fetch(`${API_URL}/api/online-users`)
      .then((res) => res.json())
      .then(setOnlineUsers);

    socket = io(API_URL);
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

      const response = await fetch(`${API_URL}/api/messages`, {
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

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-zinc-900 dark:to-zinc-800 transition-colors">
        <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-xl shadow-lg flex flex-col h-[90vh] transition-colors">
          <div className="px-6 py-4 border-b flex items-center justify-between bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 transition-colors">
            <span className="font-bold text-lg text-indigo-700 dark:text-yellow-300">💬 Messenger Chat</span>
            <button
              onClick={() => setIsUsernameModalOpen(true)}
              className="text-xs text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700 transition-colors"
            >
              {username ? `You: ${username}` : 'Set Name'}
            </button>
          </div>
          <div className="px-6 py-2 border-b bg-blue-50 dark:bg-zinc-800 text-xs text-gray-700 dark:text-gray-200 flex flex-wrap gap-2 items-center min-h-[32px] transition-colors">
            <span className="font-semibold">Online:</span>
            {onlineUsers.length === 0 ? (
              <span className="italic text-gray-400 dark:text-gray-500">No one online</span>
            ) : (
              onlineUsers.map((user) => (
                <span
                  key={user}
                  className={`px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 font-medium ${
                    user === username ? 'border border-green-400 dark:border-green-600' : ''
                  }`}
                >
                  {user}
                </span>
              ))
            )}
          </div>
          <div className="px-6 py-2 border-b bg-white dark:bg-zinc-900 flex items-center gap-2 transition-colors">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages or names..."
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm placeholder:text-gray-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 dark:text-gray-500 hover:text-red-500 text-lg px-2">
                ×
              </button>
            )}
          </div>
          <MessageList
            messages={filteredMessages}
            username={username}
            onDelete={(messageId) => setDeleteModal({ isOpen: true, messageId })}
            API_URL={API_URL || ''}
            search={search}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
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
          <div className="relative">
            <TypingIndicator typingUsers={typingUsers} currentUser={username} />
          </div>
        </div>
      </div>
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, messageId: null })}
        onConfirm={async () => {
          if (!deleteModal.messageId) return;
          try {
            const response = await fetch(`${API_URL}/api/messages/${deleteModal.messageId}`, {
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
