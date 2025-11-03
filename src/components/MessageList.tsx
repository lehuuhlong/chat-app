'use client';
import { Message } from '@/types';
import React, { useEffect, useRef, useState } from 'react';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  username: string;
  onDelete: (messageId: string) => void;
  search?: string;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}

const MemoMessageItem = React.memo(MessageItem);

export function MessageList({ messages, username, onDelete, search, onLoadMore, hasMore, isLoadingMore }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);
  const [scrollPosition, setScrollPosition] = useState<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Ẩn button ngay khi click
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

      // Check if user scrolled to top to load more messages
      if (scrollTop === 0 && hasMore && !isLoadingMore) {
        // Save current scroll position before loading more
        setScrollPosition(scrollHeight);
        onLoadMore();
      }

      // Check if user is at bottom
      const isAtBottom = scrollHeight - scrollTop - clientHeight <= 5;
      setShowScrollButton(!isAtBottom && messages.length > 3);
    }
  };

  // Handle scroll position restoration after loading more messages
  useEffect(() => {
    if (containerRef.current && scrollPosition && messages.length > prevMessagesLength) {
      const { scrollHeight } = containerRef.current;
      const newScrollTop = scrollHeight - scrollPosition;
      containerRef.current.scrollTop = newScrollTop;
      setScrollPosition(null);
    }
    setPrevMessagesLength(messages.length);
  }, [messages, scrollPosition, prevMessagesLength]);

  // Only auto-scroll to bottom for genuinely new messages (not when loading more)
  useEffect(() => {
    if (messages.length > prevMessagesLength && !isLoadingMore && !scrollPosition) {
      // This is a new message, scroll to bottom
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages.length, prevMessagesLength, isLoadingMore, scrollPosition]);
  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-blue-50 dark:bg-zinc-800 scrollbar-hide transition-colors"
      >
        {/* Loading indicator for loading more messages */}
        {isLoadingMore && (
          <div className="text-center py-2">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading more messages...</p>
          </div>
        )}

        {/* No more messages indicator */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">No more messages</p>
          </div>
        )}

        {messages.length === 0 && !isLoadingMore ? (
          <div className="text-center text-gray-600 dark:text-gray-400 mt-10 select-none">No messages yet. Start a conversation!</div>
        ) : (
          messages.map((message) => (
            <MemoMessageItem
              key={message._id}
              message={message}
              isOwn={message.username === username}
              onDelete={onDelete}
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
