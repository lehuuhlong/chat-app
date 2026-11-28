'use client';
import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmojiPickerComponent } from './EmojiPicker';
import { getFileIcon } from '@/lib/client/format';
import { MAX_TEXT_LENGTH } from '@/lib/constants';

interface ChatInputProps {
  username: string;
  files: File[];
  isSubmitting: boolean;
  onSend: (text: string) => Promise<boolean>;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onError: (message: string) => void;
}

// Re-send "typing" at most this often, and send "stopTyping" after this much idle time.
const TYPING_THROTTLE_MS = 2000;

// Stable keys for file chips (index keys broke the exit animation when removing a middle file).
const fileKeys = new WeakMap<File, number>();
let nextFileKey = 0;
const keyFor = (file: File) => {
  if (!fileKeys.has(file)) fileKeys.set(file, ++nextFileKey);
  return fileKeys.get(file)!;
};

const FilePreviewChip = memo(function FilePreviewChip({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Create the object URL once per file and revoke it — the old code created a new
  // blob URL on every render (every keystroke) and never released them.
  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center gap-1.5 glass-subtle px-2.5 py-1.5 rounded-xl text-xs mobile-file-preview"
      style={{ color: 'var(--text-primary)' }}
      title={file.name}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={file.name} className="w-8 h-8 object-cover rounded-lg" />
      ) : (
        <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-indigo-500/10 text-sm">{getFileIcon(file.name, file.type)}</span>
      )}
      <span className="truncate max-w-[80px] font-medium">{file.name}</span>
      <button
        type="button"
        className="ml-0.5 w-5 h-5 rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors disabled:opacity-50"
        onClick={onRemove}
        title="Remove file"
        aria-label={`Remove ${file.name}`}
        disabled={disabled}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
});

function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  // Safari doesn't support webm recording; it records mp4/aac.
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t));
}

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const ChatInput = memo(function ChatInput({
  username,
  files,
  isSubmitting,
  onSend,
  onAddFiles,
  onRemoveFile,
  onTyping,
  onStopTyping,
  onError,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);
  const lastTypingEmitRef = useRef(0);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const discardRecordingRef = useRef(false);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    ta.style.overflowY = ta.scrollHeight > 120 ? 'auto' : 'hidden';
  }, [text]);

  // ---------- Typing (throttled: the old code emitted an event on every keystroke) ----------
  const stopTyping = useCallback(() => {
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = null;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping();
    }
  }, [onStopTyping]);

  const signalTyping = useCallback(() => {
    const now = Date.now();
    if (!isTypingRef.current || now - lastTypingEmitRef.current > TYPING_THROTTLE_MS) {
      isTypingRef.current = true;
      lastTypingEmitRef.current = now;
      onTyping();
    }
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(stopTyping, TYPING_THROTTLE_MS);
  }, [onTyping, stopTyping]);

  useEffect(() => () => stopTyping(), [stopTyping]);

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.trim()) signalTyping();
    else stopTyping();
  };

  // ---------- Submit ----------
  const canSend = !!username && (!!text.trim() || files.length > 0) && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const toSend = text;
    stopTyping();
    // Clear optimistically so the user can keep typing; restore if sending fails.
    setText('');
    textareaRef.current?.focus();
    const ok = await onSend(toSend);
    if (!ok) setText((current) => current || toSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: don't submit while a Vietnamese/IME composition is in progress.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  // ---------- Files ----------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAddFiles(e.target.files ? Array.from(e.target.files) : []);
    if (fileInput.current) fileInput.current.value = '';
  };

  // Paste screenshots / images straight from the clipboard.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = Array.from(e.clipboardData.files || []);
    // If there's text too (e.g. copying from Word), prefer pasting the text.
    if (pasted.length > 0 && !e.clipboardData.getData('text/plain')) {
      e.preventDefault();
      onAddFiles(pasted);
    }
  };

  // ---------- Emoji ----------
  const insertAtCursor = (insert: string) => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    handleTextChange(text.slice(0, start) + insert + text.slice(end));
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const pos = start + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // ---------- Voice recording ----------
  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('Your browser does not support audio recording');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError('Microphone access was denied');
      return;
    }

    const mimeType = pickRecordingMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    discardRecordingRef.current = false;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      releaseStream();
      if (discardRecordingRef.current || chunks.length === 0) return;
      const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunks, { type });
      // onAddFiles appends to the latest list (the old closure dropped files added while recording).
      onAddFiles([new File([blob], `voice-message-${Date.now()}.${ext}`, { type })]);
    };

    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.start();
    setRecordSeconds(0);
    setIsRecording(true);
  };

  const handleStopRecording = (discard = false) => {
    discardRecordingRef.current = discard;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  // Release the microphone if the component unmounts mid-recording.
  useEffect(
    () => () => {
      discardRecordingRef.current = true;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      releaseStream();
    },
    [],
  );

  const showCounter = text.length > MAX_TEXT_LENGTH * 0.8;

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 dark:border-white/5 rounded-b-3xl mobile-chat-input">
      {/* File Previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 mb-3">
            <AnimatePresence>
              {files.map((file, idx) => (
                <FilePreviewChip key={keyFor(file)} file={file} onRemove={() => onRemoveFile(idx)} disabled={isSubmitting} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div
        className="flex items-end gap-2 rounded-2xl p-2 transition-smooth"
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {isRecording ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-red-500" aria-live="polite">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium tabular-nums">Recording {formatDuration(recordSeconds)}</span>
            <button type="button" onClick={() => handleStopRecording(true)} className="ml-auto text-xs px-2 py-1 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            maxLength={MAX_TEXT_LENGTH}
            className="flex-1 w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 resize-none overflow-y-hidden"
            style={{ color: 'var(--text-primary)', boxShadow: 'none' }}
            placeholder="Type a message..."
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={stopTyping}
          />
        )}
        <div className="flex items-center gap-0.5">
          {showCounter && (
            <span className={`text-[10px] tabular-nums mr-1 ${text.length >= MAX_TEXT_LENGTH ? 'text-red-500' : ''}`} style={{ color: text.length >= MAX_TEXT_LENGTH ? undefined : 'var(--text-secondary)' }}>
              {text.length}/{MAX_TEXT_LENGTH}
            </span>
          )}

          {/* Emoji Button */}
          {!isRecording && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen((v) => !v)}
                className="p-2 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 transition-smooth"
                title="Emoji"
                aria-label="Insert emoji"
              >
                <span aria-hidden className="text-lg">
                  😊
                </span>
              </button>
              {isEmojiPickerOpen && (
                <EmojiPickerComponent
                  onSelect={(emoji) => {
                    insertAtCursor(emoji.native);
                    setIsEmojiPickerOpen(false);
                  }}
                  onClose={() => setIsEmojiPickerOpen(false)}
                />
              )}
            </div>
          )}

          {/* File Attachment */}
          {!isRecording && (
            <label className="cursor-pointer p-2 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 transition-smooth" title="Attach files">
              <input type="file" ref={fileInput} onChange={handleFileChange} className="hidden" multiple aria-label="Attach files" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: 'var(--text-secondary)' }}>
                <path
                  fillRule="evenodd"
                  d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                  clipRule="evenodd"
                />
              </svg>
            </label>
          )}

          {/* Voice Recording */}
          <button
            type="button"
            onClick={() => (isRecording ? handleStopRecording(false) : handleStartRecording())}
            className={`p-2 rounded-xl transition-smooth ${isRecording ? 'bg-red-500/15 text-red-500' : 'hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20'}`}
            title={isRecording ? 'Stop & attach recording' : 'Record a voice message'}
            aria-label={isRecording ? 'Stop recording' : 'Record a voice message'}
          >
            {isRecording ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" style={{ color: 'var(--text-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.25v1.25m0 0c-3.25 0-6-2.75-6-6V9.75m12 0v3.75c0 3.25-2.75 6-6 6zm0 0V19.5m0 0h-4.5m4.5 0h4.5" />
                <rect x="9" y="3" width="6" height="10" rx="3" fill="currentColor" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300/30 dark:bg-gray-600/30 mx-1"></div>

          {/* Send Button */}
          <motion.button
            type="submit"
            disabled={!canSend || isRecording}
            whileTap={canSend ? { scale: 0.9 } : {}}
            aria-label="Send message"
            className={`p-2.5 rounded-xl transition-smooth ${canSend && !isRecording ? 'send-btn' : 'bg-gray-200/50 dark:bg-zinc-700/50 cursor-not-allowed'}`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
                style={{ color: canSend ? 'white' : 'var(--text-secondary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  );
});
