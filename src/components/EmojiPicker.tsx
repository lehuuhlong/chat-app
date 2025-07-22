'use client';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface EmojiPickerProps {
  onSelect: (emoji: { native: string }) => void;
  onClose: () => void;
}

export function EmojiPickerComponent({ onSelect, onClose }: EmojiPickerProps) {
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect({ native: emojiData.emoji });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full right-0 mb-2 z-50"
        >
          <div className="bg-white rounded-lg shadow-lg border">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              theme={Theme.LIGHT}
              previewConfig={{
                showPreview: false,
              }}
              searchDisabled={false}
              skinTonesDisabled={true}
              width={320}
              height={400}
            />
          </div>
        </motion.div>
        
        {/* Backdrop to close picker when clicking outside */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      </div>
    </AnimatePresence>
  );
}