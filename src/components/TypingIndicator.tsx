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
        className="absolute bottom-full left-4 mb-1"
      >
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/80 backdrop-blur-sm py-1 px-3 rounded-full shadow-sm">
          <div className="flex gap-1">
            <span className="animate-bounce">•</span>
            <span className="animate-bounce [animation-delay:0.2s]">•</span>
            <span className="animate-bounce [animation-delay:0.4s]">•</span>
          </div>
          <span>{otherTypingUsers.length === 1 ? `${otherTypingUsers[0]} is typing...` : `${otherTypingUsers.length} people are typing...`}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
