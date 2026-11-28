'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
  src: string;
  alt: string;
  downloadHref?: string;
  onClose: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const clamp = (v: number) => Math.min(Math.max(MIN_SCALE, v), MAX_SCALE);

const iconBtn = 'bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors';

export function ImageViewer({ src, alt, downloadHref, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const imageAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Keyboard: Esc closes, +/- zoom, 0 resets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') setScale((s) => clamp(s + 0.5));
      else if (e.key === '-') setScale((s) => clamp(s - 0.5));
      else if (e.key === '0') setScale(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // React registers wheel listeners as passive, so preventDefault() there only logs a warning.
  useEffect(() => {
    const el = imageAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(s + e.deltaY * -0.01));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [mounted]);

  if (!mounted) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1001]"
        onClick={() => !isDragging && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label={alt}
      >
        <div className="absolute top-4 right-4 flex gap-3 z-10" onClick={stop}>
          <button onClick={() => setScale((s) => clamp(s + 0.5))} className={iconBtn} title="Zoom in (+)" aria-label="Zoom in">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
          </button>
          <button onClick={() => setScale((s) => clamp(s - 0.5))} className={iconBtn} title="Zoom out (-)" aria-label="Zoom out">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
            </svg>
          </button>
          <button onClick={() => setScale(1)} className={iconBtn} title="Reset zoom (0)" aria-label="Reset zoom">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          </button>
          {downloadHref && (
            <a href={downloadHref} download={alt} className={iconBtn} title="Download" aria-label="Download image">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>
          )}
          <button onClick={onClose} className={iconBtn} title="Close (Esc)" aria-label="Close">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <motion.div
          ref={imageAreaRef}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
          className="relative cursor-move"
          onClick={stop}
        >
          <motion.div animate={{ scale }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} style={{ transformOrigin: 'center center' }}>
            {/* Plain <img>: the original file is shown at full resolution, no optimizer round-trip. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] object-contain pointer-events-none select-none" draggable={false} />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
