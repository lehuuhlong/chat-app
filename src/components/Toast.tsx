'use client';
import { AnimatePresence, motion } from 'framer-motion';

export interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'info';
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 w-[min(92vw,380px)] pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={() => onDismiss(toast.id)}
            className={`pointer-events-auto w-full text-left glass rounded-xl px-4 py-3 text-sm shadow-xl flex items-start gap-2.5 border-l-4 ${
              toast.type === 'error' ? 'border-l-red-500' : 'border-l-indigo-500'
            }`}
            style={{ color: 'var(--text-primary)' }}
          >
            <span aria-hidden>{toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span className="flex-1">{toast.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
