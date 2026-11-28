'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  /** Other users currently typing (current user already excluded). */
  users: string[];
}

function describe(users: string[]) {
  if (users.length === 1) return `${users[0]} is typing...`;
  if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
  return `${users.length} people are typing...`;
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  // AnimatePresence must stay mounted for the exit animation to run.
  return (
    <AnimatePresence>
      {users.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full left-5 mb-2 pointer-events-none"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-xs glass-subtle py-1.5 px-3.5 rounded-2xl shadow-sm" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex gap-[3px]">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
            <span className="font-medium">{describe(users)}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
