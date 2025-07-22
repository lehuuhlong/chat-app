'use client';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import { Message } from '@/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
let socket: any;

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteModal({ isOpen, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 transform"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Xác nhận xóa tin nhắn</h3>
          <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa tin nhắn này? Hành động này không thể hoàn tác.</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Hủy
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              Xóa tin nhắn
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [username, setUsername] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; messageId: string | null }>({
    isOpen: false,
    messageId: null,
  });

  useEffect(() => {
    fetch(`${API_URL}/api/messages`)
      .then((res) => res.json())
      .then(setMessages);
    socket = io(API_URL);
    socket.on('message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('messageDeleted', (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });
    return () => socket.disconnect();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return alert('Nhập tên trước!');
    const formData = new FormData();
    formData.append('username', username);
    formData.append('text', text);
    if (file) formData.append('file', file);
    await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      body: formData,
    });
    setText('');
    setFile(null);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg flex flex-col h-[80vh]">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <span className="font-bold text-lg text-indigo-700">💬 Messenger Chat</span>
            <span className="text-xs text-gray-400">{username ? `Bạn: ${username}` : 'Chưa đặt tên'}</span>
          </div>
          <MessageList
            messages={messages}
            username={username}
            onDelete={(messageId) => setDeleteModal({ isOpen: true, messageId })}
            API_URL={API_URL || ''}
          />
          <ChatInput
            username={username}
            text={text}
            onUsernameChange={setUsername}
            onTextChange={setText}
            onFileChange={setFile}
            onSubmit={handleSendMessage}
          />
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
            alert('Không thể xóa tin nhắn. Vui lòng thử lại!');
          }
        }}
      />
    </>
  );
}
