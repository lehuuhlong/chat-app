'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MAX_USERNAME_LENGTH } from '@/lib/constants';
import { generateRandomName } from '@/lib/name-generator';

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentUsername: string;
}

export function UsernameModal({ isOpen, onClose, onSave, currentUsername }: UsernameModalProps) {
  const [name, setName] = useState(currentUsername);

  // Reset the field each time the modal opens (discard an abandoned edit).
  useEffect(() => {
    if (isOpen) setName(currentUsername);
  }, [isOpen, currentUsername]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const trimmed = name.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= MAX_USERNAME_LENGTH;

  const handleSave = () => {
    if (!isValid) return;
    if (trimmed !== currentUsername) onSave(trimmed);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="username-modal-title"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="glass rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
            <h3 id="username-modal-title" className="text-lg font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              Change Your Name
            </h3>
            <p className="mt-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Enter a new name to be displayed in the chat.
            </p>
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  maxLength={MAX_USERNAME_LENGTH}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl pl-4 pr-11 py-3 text-sm transition-smooth"
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                  }}
                  placeholder="Your new name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setName(generateRandomName())}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-indigo-500/10 flex items-center justify-center"
                  title="Random name"
                  aria-label="Generate a random name"
                >
                  🎲
                </button>
              </div>
              <div className="mt-1.5 text-[11px] text-right" style={{ color: 'var(--text-secondary)' }}>
                {trimmed.length}/{MAX_USERNAME_LENGTH}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium glass-subtle hover:opacity-80 transition-smooth"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={!isValid} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white send-btn disabled:opacity-50">
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
