'use client';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { useEffect, useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: { native: string }) => void;
  onClose: () => void;
}

export function EmojiPickerComponent({ onSelect, onClose }: EmojiPickerProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect({ native: emojiData.emoji });
    onClose();
  };

  return (
    <AnimatePresence>
      {/* Backdrop to close picker when clicking outside */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[998]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-20 right-[calc(50%-160px)] z-[999] shadow-2xl rounded-2xl overflow-hidden"
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          autoFocusSearch={false}
          theme={isDark ? Theme.DARK : Theme.LIGHT}
          previewConfig={{
            showPreview: false,
          }}
          searchDisabled={false}
          skinTonesDisabled={true}
          width={320}
          height={400}
        />
      </motion.div>
    </AnimatePresence>
  );
}