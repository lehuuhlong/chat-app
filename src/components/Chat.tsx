'use client';
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { Message } from '@/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { DeleteModal } from './DeleteModal';
import { TypingIndicator } from './TypingIndicator';

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

  useEffect(() => {
    fetch(`${API_URL}/api/messages`)
      .then((res) => res.json())
      .then(setMessages);
    fetch(`${API_URL}/api/online-users`)
      .then((res) => res.json())
      .then(setOnlineUsers);
    socket = io(API_URL);
    socket.on('message', (msg: Message) => {
      setMessages((prev) => {
        // Thông báo nếu cửa sổ không focus và tin nhắn không phải của mình
        if (typeof window !== 'undefined' && document.visibilityState !== 'visible' && msg.username !== username) {
          if (window.Notification && Notification.permission === 'granted') {
            new Notification(`Tin nhắn mới từ ${msg.username}`, {
              body: msg.text || 'Bạn nhận được một tin nhắn mới',
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
      files.forEach((file) => formData.append('files', file));
      await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        body: formData,
      });
      setText('');
      setFiles([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Gửi tin nhắn thất bại, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lọc tin nhắn theo search
  const filteredMessages = search.trim()
    ? messages.filter((msg) => msg.text?.toLowerCase().includes(search.toLowerCase()) || msg.username?.toLowerCase().includes(search.toLowerCase()))
    : messages;

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-zinc-900 dark:to-zinc-800 transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-lg flex flex-col h-[80vh] transition-colors">
          <div className="px-6 py-4 border-b flex items-center justify-between bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 transition-colors">
            <span className="font-bold text-lg text-indigo-700 dark:text-yellow-300">💬 Messenger Chat</span>
            <span className="text-xs text-gray-600 dark:text-gray-300">{username ? `You: ${username}` : 'Not signed in'}</span>
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
              placeholder="Tìm kiếm tin nhắn hoặc tên..."
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
          />
          <ChatInput
            username={username}
            text={text}
            files={files}
            isSubmitting={isSubmitting}
            onUsernameChange={setUsername}
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
    </>
  );
}
