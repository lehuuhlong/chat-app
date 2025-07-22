'use client';
import { motion, AnimatePresence } from 'framer-motion';
import data from '@emoji-mart/data';
import EmojiMartPicker from '@emoji-mart/react';

interface EmojiPickerProps {
  onSelect: (emoji: { native: string }) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <AnimatePresence>
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full right-0 mb-2 z-50"
        >
          <EmojiMartPicker
            data={data}
            onEmojiSelect={onSelect}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
            searchPosition="none"
            maxFrequentRows={2}
            navPosition="none"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
