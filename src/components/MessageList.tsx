'use client';
import { Message } from '@/types';
import React, { useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Ẩn button ngay khi click
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // Kiểm tra xem có đang ở cuối cùng không (với tolerance 5px)
      const isAtBottom = scrollHeight - scrollTop - clientHeight <= 5;
      setShowScrollButton(!isAtBottom && messages.length > 3);
    }
  };

  // Khi có tin nhắn mới, ẩn button và scroll xuống
  useEffect(() => {
    scrollToBottom();
    // Delay để đảm bảo scroll hoàn thành trước khi kiểm tra
    setTimeout(() => {
      setShowScrollButton(false);
    }, 100);
  }, [messages]);

  // Kiểm tra initial state
  useEffect(() => {
    const checkInitialState = () => {
      if (containerRef.current && messages.length > 3) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight <= 5;
        setShowScrollButton(!isAtBottom);
      }
    };

    setTimeout(checkInitialState, 200);
  }, [messages.length]);
  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-blue-50 dark:bg-zinc-800 scrollbar-hide transition-colors"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400 mt-10 select-none">No messages yet. Start a conversation!</div>
        ) : (
          messages.map((message) => (
            <MemoMessageItem
              key={message._id}
              message={message}
              isOwn={message.username === username}
              onDelete={onDelete}
              API_URL={API_URL}
              search={search}
              username={username}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button - Fixed position outside */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-6 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50"
          title="Scroll to latest message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </>
  );
}
