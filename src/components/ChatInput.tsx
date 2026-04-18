'use client';
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmojiPickerComponent } from './EmojiPicker';

interface ChatInputProps {
  username: string;
  text: string;
  files: File[];
  isSubmitting: boolean;
  onTextChange: (text: string) => void;
  onFilesChange: (files: File[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

const getFileIcon = (filename: string, type: string) => {
  if (type.startsWith('image')) return '🖼️';
  if (type.startsWith('audio')) return '🎵';
  if (type.startsWith('video')) return '🎬';
  if (filename.toLowerCase().endsWith('.pdf')) return '📄';
  if (filename.toLowerCase().match(/\.(doc|docx|txt|rtf|odt)$/)) return '📝';
  if (filename.toLowerCase().match(/\.(xls|xlsx|csv|ods)$/)) return '📊';
  if (filename.toLowerCase().match(/\.(ppt|pptx|odp)$/)) return '📋';
  if (filename.toLowerCase().match(/\.(zip|rar|7z|tar|gz)$/)) return '🗜️';
  return '📎';
};

export function ChatInput({ username, text, files, isSubmitting, onTextChange, onFilesChange, onSubmit, onTyping, onStopTyping }: ChatInputProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (value: string) => {
    onTextChange(value);
    if (onTyping) {
      onTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) onStopTyping();
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files ? Array.from(e.target.files) : [];
    onFilesChange([...files, ...newFiles]);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Your browser does not support audio recording!');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const audioFile = new File([blob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
      onFilesChange([...files, audioFile]);
      stream.getTracks().forEach((track) => track.stop());
    };
    setMediaRecorder(recorder);
    recorder.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const canSend = username && (text.trim() || files.length > 0) && !isSubmitting;

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-white/10 dark:border-white/5 rounded-b-3xl">
      {/* File Previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 mb-3"
          >
            {files.map((file, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 glass-subtle px-2.5 py-1.5 rounded-xl text-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                {file.type.startsWith('image') ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-8 h-8 object-cover rounded-lg" />
                ) : (
                  <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-indigo-500/10 text-sm">
                    {getFileIcon(file.name, file.type)}
                  </span>
                )}
                <span className="truncate max-w-[80px] font-medium">{file.name}</span>
                <button
                  type="button"
                  className="ml-0.5 w-5 h-5 rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors"
                  onClick={() => handleRemoveFile(idx)}
                  title="Remove file"
                  disabled={isSubmitting}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ))}
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
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 resize-none overflow-y-hidden"
          style={{ color: 'var(--text-primary)', boxShadow: 'none' }}
          placeholder="Type a message..."
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
        />
        <div className="flex items-center gap-0.5">
          {/* Emoji Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="p-2 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 transition-smooth"
              disabled={isSubmitting}
              title="Emoji"
            >
              <span role="img" aria-label="emoji" className="text-lg">
                😊
              </span>
            </button>
            {isEmojiPickerOpen && (
              <EmojiPickerComponent
                onSelect={(emoji) => {
                  onTextChange(text + emoji.native);
                  setIsEmojiPickerOpen(false);
                }}
                onClose={() => setIsEmojiPickerOpen(false)}
              />
            )}
          </div>

          {/* File Attachment */}
          <label className={`cursor-pointer p-2 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 transition-smooth ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}>
            <input type="file" ref={fileInput} onChange={handleFileChange} className="hidden" multiple disabled={isSubmitting} />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: 'var(--text-secondary)' }}>
              <path
                fillRule="evenodd"
                d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                clipRule="evenodd"
              />
            </svg>
          </label>

          {/* Voice Recording */}
          <button
            type="button"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`p-2 rounded-xl transition-smooth ${
              isRecording
                ? 'bg-red-500/15 text-red-500 animate-pulse'
                : 'hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20'
            } ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
            title={isRecording ? 'Stop recording' : 'Record a voice message'}
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" style={{ color: isRecording ? undefined : 'var(--text-secondary)' }}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.25v1.25m0 0c-3.25 0-6-2.75-6-6V9.75m12 0v3.75c0 3.25-2.75 6-6 6zm0 0V19.5m0 0h-4.5m4.5 0h4.5"
              />
              <rect x="9" y="3" width="6" height="10" rx="3" fill="currentColor" />
            </svg>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300/30 dark:bg-gray-600/30 mx-1"></div>

          {/* Send Button */}
          <motion.button
            type="submit"
            disabled={!canSend}
            whileTap={canSend ? { scale: 0.9 } : {}}
            className={`p-2.5 rounded-xl transition-smooth ${
              canSend
                ? 'send-btn'
                : 'bg-gray-200/50 dark:bg-zinc-700/50 cursor-not-allowed'
            }`}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            )}
          </motion.button>
        </div>
      </div>
    </form>
  );
}
