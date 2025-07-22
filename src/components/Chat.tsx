'use client';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Message } from '@/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { DeleteModal } from './DeleteModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
let socket: any;

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
    if (!username) return alert('Please enter your name first!');
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
            <span className="text-xs text-gray-600">{username ? `You: ${username}` : 'Not signed in'}</span>
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
            alert('Failed to delete message. Please try again!');
          }
        }}
      />
    </>
  );
}
