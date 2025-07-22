'use client';
import { Message } from '@/types';
import React, { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  username: string;
  onDelete: (messageId: string) => void;
  API_URL: string;
  search?: string;
}

const MemoMessageItem = React.memo(MessageItem);

export function MessageList({ messages, username, onDelete, API_URL, search }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-blue-50 scrollbar-hide">
      {messages.length === 0 ? (
        <div className="text-center text-gray-600 mt-10 select-none">No messages yet. Start a conversation!</div>
      ) : (
        messages.map((message) => (
          <MemoMessageItem
            key={message._id}
            message={message}
            isOwn={message.username === username}
            onDelete={onDelete}
            API_URL={API_URL}
            search={search}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
