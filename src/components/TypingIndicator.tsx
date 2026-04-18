'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  typingUsers: Set<string>;
  currentUser: string;
}

export function TypingIndicator({ typingUsers, currentUser }: TypingIndicatorProps) {
  const otherTypingUsers = Array.from(typingUsers).filter((user) => user !== currentUser);

  if (otherTypingUsers.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-5 mb-2"
      >
        <div className="flex items-center gap-2 text-xs glass-subtle py-1.5 px-3.5 rounded-2xl shadow-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex gap-[3px]">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
          <span className="font-medium">
            {otherTypingUsers.length === 1 ? `${otherTypingUsers[0]} is typing...` : `${otherTypingUsers.length} people are typing...`}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
