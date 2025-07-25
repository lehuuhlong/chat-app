'use client';
import { useRef, useState } from 'react';
import { EmojiPickerComponent } from './EmojiPicker';

interface ChatInputProps {
  username: string;
  text: string;
  files: File[];
  isSubmitting: boolean;
  onUsernameChange: (username: string) => void;
  onTextChange: (text: string) => void;
  onFilesChange: (files: File[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export function ChatInput({
  username,
  text,
  files,
  isSubmitting,
  onUsernameChange,
  onTextChange,
  onFilesChange,
  onSubmit,
  onTyping,
  onStopTyping,
}: ChatInputProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioFileRef = useRef<File | null>(null);

  const handleTextChange = (value: string) => {
    onTextChange(value);
    if (onTyping) {
      onTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) {
          onStopTyping();
        }
      }, 1000);
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
    const recorder = new window.MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioURL(URL.createObjectURL(blob));
      const audioFile = new File([blob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
      onFilesChange([...files, audioFile]);
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

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-3 p-4 border-t bg-white dark:bg-zinc-900 shadow-lg border-gray-200 dark:border-zinc-800 transition-colors"
    >
      <input
        className="w-1/4 min-w-[120px] rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm placeholder:text-gray-600 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
        placeholder="Your name"
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        disabled={isSubmitting}
        required
      />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-4 pr-14 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm placeholder:text-gray-600 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 transition-opacity hover:opacity-70"
              disabled={isSubmitting}
            >
              <span role="img" aria-label="emoji" className="text-xl">
                😊
              </span>
            </button>
            {isEmojiPickerOpen && (
              <div className="absolute right-0 bottom-full mb-2 z-50 shadow-xl rounded-lg border border-gray-200">
                <EmojiPickerComponent
                  onSelect={(emoji) => {
                    onTextChange(text + emoji.native);
                    setIsEmojiPickerOpen(false);
                  }}
                  onClose={() => setIsEmojiPickerOpen(false)}
                />
              </div>
            )}
          </div>
          <label
            className={`cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 border ${
              isSubmitting
                ? 'cursor-not-allowed bg-gray-100 dark:bg-zinc-800'
                : 'hover:bg-gray-100 dark:hover:bg-zinc-800 border-gray-300 dark:border-zinc-700'
            }`}
            title="Attach files"
          >
            <input type="file" ref={fileInput} onChange={handleFileChange} className="hidden" multiple disabled={isSubmitting} />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
              <path
                fillRule="evenodd"
                d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                clipRule="evenodd"
              />
            </svg>
          </label>
          {/* Nút ghi âm voice message */}
          <button
            type="button"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-200 ml-1 ${
              isRecording
                ? 'bg-red-100 border-red-400 dark:bg-red-900 dark:border-red-700'
                : 'bg-gray-100 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700'
            } ${isSubmitting ? 'cursor-not-allowed' : ''}`}
            title={isRecording ? 'Stop recording' : 'Record a voice message'}
            disabled={isSubmitting}
          >
            {isRecording ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-red-500 animate-pulse"
              >
                <circle cx="12" cy="12" r="8" fill="red" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.25v1.25m0 0c-3.25 0-6-2.75-6-6V9.75m12 0v3.75c0 3.25-2.75 6-6 6zm0 0V19.5m0 0h-4.5m4.5 0h4.5"
                />
                <rect x="9" y="3" width="6" height="10" rx="3" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs text-gray-900 dark:text-gray-100"
              >
                {file.type.startsWith('image') ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-8 h-8 object-cover rounded mr-1" />
                ) : (
                  <span className="inline-block w-8 h-8 bg-gray-300 rounded mr-1 flex items-center justify-center">📎</span>
                )}
                <span className="truncate max-w-[80px]">{file.name}</span>
                <button
                  type="button"
                  className="ml-1 text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveFile(idx)}
                  title="Remove file"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={!username || (!text.trim() && files.length === 0) || isSubmitting}
          className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center ${
            !username || (!text.trim() && files.length === 0) || isSubmitting
              ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isSubmitting ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </form>
  );
}
