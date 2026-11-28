'use client';
import { Message } from '@/types';
import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageItem } from './MessageItem';
import { authorKey, formatDayLabel, isSameDay } from '@/lib/client/format';
import { GROUP_WINDOW_MS } from '@/lib/constants';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  username: string;
  search: string;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string, text: string) => Promise<boolean>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadError: boolean;
  isInitialLoading: boolean;
}

const NEAR_BOTTOM_PX = 120;

function canGroup(a: Message | undefined, b: Message | undefined) {
  if (!a || !b || authorKey(a) !== authorKey(b)) return false;
  const da = new Date(a.createdAt);
  const db = new Date(b.createdAt);
  return isSameDay(da, db) && Math.abs(db.getTime() - da.getTime()) < GROUP_WINDOW_MS;
}

export const MessageList = memo(function MessageList({
  messages,
  currentUserId,
  username,
  search,
  onDelete,
  onEdit,
  onReact,
  onLoadMore,
  hasMore,
  isLoadingMore,
  loadError,
  isInitialLoading,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prependAnchorRef = useRef<{ height: number; top: number } | null>(null);
  const prevRef = useRef<{ first?: string; last?: string; count: number }>({ count: 0 });
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  const isOwnMessage = useCallback(
    (m: Message) => (m.userId ? m.userId === currentUserId : m.username === username),
    [currentUserId, username],
  );

  const updateNearBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distance < NEAR_BOTTOM_PX;
    setShowScrollButton(distance > 300);
    if (isNearBottomRef.current) setUnseenCount(0);
  };

  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setUnseenCount(0);
  }, []);

  // Decide how to scroll whenever the list changes. Runs before paint, so there's no visible jump.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prev = prevRef.current;
    const first = messages[0]?._id;
    const last = messages[messages.length - 1]?._id;

    if (prev.count === 0 && messages.length > 0) {
      // Initial load: jump straight to the newest message.
      el.scrollTop = el.scrollHeight;
    } else if (prependAnchorRef.current && first !== prev.first) {
      // Older messages were prepended: keep the viewport anchored on what the user was reading.
      const anchor = prependAnchorRef.current;
      el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
      prependAnchorRef.current = null;
    } else if (last !== prev.last && messages.length > prev.count) {
      const lastMsg = messages[messages.length - 1];
      if (isNearBottomRef.current || isOwnMessage(lastMsg)) {
        requestAnimationFrame(() => scrollToBottom(true));
      } else {
        // Don't yank the user away from the history they're reading.
        setUnseenCount((c) => c + (messages.length - prev.count));
      }
    }

    if (!isLoadingMore) prependAnchorRef.current = null;
    prevRef.current = { first, last, count: messages.length };
    updateNearBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isOwnMessage, isLoadingMore, scrollToBottom]);

  // Stay pinned to the bottom while media (video/audio metadata) changes the content height.
  const hasContent = !isInitialLoading && messages.length > 0;
  useEffect(() => {
    const el = containerRef.current;
    const content = contentRef.current;
    if (!hasContent || !el || !content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (isNearBottomRef.current && !prependAnchorRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [hasContent]);

  // Infinite scroll upward. Using an observer (instead of `scrollTop === 0`) also loads more
  // automatically when the first page is too short to be scrollable.
  const canLoadMore = hasMore && !isLoadingMore && !loadError && !search && !isInitialLoading && messages.length > 0;
  useEffect(() => {
    const root = containerRef.current;
    const target = topSentinelRef.current;
    if (!canLoadMore || !root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          prependAnchorRef.current = { height: root.scrollHeight, top: root.scrollTop };
          onLoadMore();
        }
      },
      { root, rootMargin: '200px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, onLoadMore]);

  return (
    <>
      <div
        ref={containerRef}
        onScroll={updateNearBottom}
        className="relative flex-1 overflow-y-auto px-5 py-4 custom-scrollbar mobile-messages-area"
        style={{ background: 'transparent', overflowAnchor: 'none' }}
      >
        <div ref={topSentinelRef} className="h-px" aria-hidden />

        {/* Absolutely positioned so it doesn't shift the content while loading */}
        {isLoadingMore && (
          <div className="absolute top-2 inset-x-0 flex justify-center z-10 pointer-events-none">
            <div className="inline-flex items-center gap-2 glass-subtle px-4 py-2 rounded-full shadow-sm">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Loading messages...
              </span>
            </div>
          </div>
        )}

        {loadError && !search && (
          <div className="text-center py-3">
            <button onClick={onLoadMore} className="text-xs font-medium px-4 py-1.5 rounded-full glass-subtle text-indigo-500 hover:opacity-80">
              Couldn&apos;t load older messages — Retry
            </button>
          </div>
        )}

        {!hasMore && !search && messages.length > 0 && (
          <div className="text-center py-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-xs">Beginning of conversation</span>
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
            </div>
          </div>
        )}

        {isInitialLoading ? (
          <div className="space-y-4 py-2" aria-label="Loading messages">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`flex gap-2.5 ${i % 2 ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-gray-300/40 dark:bg-zinc-700/40 animate-pulse flex-shrink-0" />
                <div className={`h-12 rounded-2xl bg-gray-300/40 dark:bg-zinc-700/40 animate-pulse ${i % 2 ? 'w-1/3' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center"
            >
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.009Z"
                />
              </svg>
            </motion.div>
            <div className="text-center">
              {search ? (
                <>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    No results for &ldquo;{search}&rdquo;
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Only loaded messages are searched — scroll up to load older ones.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    No messages yet
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Start a conversation!
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div ref={contentRef}>
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const prev = messages[index - 1];
                const next = messages[index + 1];
                const date = new Date(message.createdAt);
                const isNewDay = !prev || !isSameDay(new Date(prev.createdAt), date);
                const isGrouped = !isNewDay && canGroup(prev, message);
                const isLastInGroup = !canGroup(message, next);

                return (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={isGrouped ? 'mt-1' : 'mt-4 first:mt-0'}
                  >
                    {isNewDay && (
                      <div className="flex items-center gap-3 my-3 select-none" role="separator">
                        <div className="flex-1 h-px bg-gray-300/50 dark:bg-gray-600/40" />
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full glass-subtle" style={{ color: 'var(--text-secondary)' }}>
                          {formatDayLabel(date)}
                        </span>
                        <div className="flex-1 h-px bg-gray-300/50 dark:bg-gray-600/40" />
                      </div>
                    )}
                    <MessageItem
                      message={message}
                      isOwn={isOwnMessage(message)}
                      isGrouped={isGrouped}
                      showTime={isLastInGroup}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onReact={onReact}
                      search={search}
                      username={username}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {(showScrollButton || unseenCount > 0) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => scrollToBottom(true)}
            className={`absolute bottom-28 right-6 h-10 rounded-full send-btn flex items-center justify-center gap-1.5 z-40 mobile-scroll-btn ${
              unseenCount > 0 ? 'px-3.5' : 'w-10'
            }`}
            title="Scroll to latest message"
          >
            {unseenCount > 0 && <span className="text-xs font-semibold text-white">{unseenCount} new</span>}
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
});
