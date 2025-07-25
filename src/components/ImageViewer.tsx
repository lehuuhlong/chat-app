'use client';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(0.5, scale + delta), 3);
    setScale(newScale);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
        onClick={() => !isDragging && onClose()}
      >
        <div className="absolute top-4 right-4 flex gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScale((prev) => Math.min(3, prev + 0.5));
            }}
            className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
            title="Zoom in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScale((prev) => Math.max(0.5, prev - 0.5));
            }}
            className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
            title="Zoom out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScale(1);
            }}
            className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
            title="Reset zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          </button>
        </div>
        <motion.div
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
          className="relative cursor-move"
          onWheel={handleWheel}
        >
          <motion.div animate={{ scale }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} style={{ transformOrigin: 'center center' }}>
            <Image
              src={src}
              alt={alt}
              width={800}
              height={600}
              className="max-w-[90vw] max-h-[90vh] object-contain pointer-events-none"
              priority
              quality={100}
              unoptimized
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
