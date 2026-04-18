'use client';
import { Message } from '@/types';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar"
        style={{ background: 'transparent' }}
      >
        {/* Loading indicator for loading more messages */}
        {isLoadingMore && (
          <div className="text-center py-3">
            <div className="inline-flex items-center gap-2 glass-subtle px-4 py-2 rounded-full">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Loading messages...</span>
            </div>
          </div>
        )}

        {/* No more messages indicator */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-xs">Beginning of conversation</span>
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
            </div>
          </div>
        )}

        {messages.length === 0 && !isLoadingMore ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center"
            >
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.009Z" />
              </svg>
            </motion.div>
            <div className="text-center">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Start a conversation!</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <MemoMessageItem
                  key={message._id}
                  message={message}
                  isOwn={message.username === username}
                  onDelete={onDelete}
                  search={search}
                  username={username}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-28 right-6 w-10 h-10 rounded-full send-btn flex items-center justify-center z-50"
            title="Scroll to latest message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
