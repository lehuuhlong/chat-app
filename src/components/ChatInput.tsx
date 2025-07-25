'use client';
import { useRef, useState } from 'react';
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

export function ChatInput({ username, text, files, isSubmitting, onTextChange, onFilesChange, onSubmit, onTyping, onStopTyping }: ChatInputProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

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

  return (
    <form onSubmit={onSubmit} className="p-4 border-t bg-white dark:bg-zinc-900 shadow-lg border-gray-200 dark:border-zinc-800 transition-colors">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
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
      <div
        className={`flex items-center gap-1 rounded-lg border border-gray-300 dark:border-zinc-700 p-1 transition-all ${
          isSubmitting ? 'bg-gray-100 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'
        } focus-within:ring-2 focus-within:ring-blue-400`}
      >
        <input
          className="flex-1 w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm placeholder:text-gray-600 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 px-3 py-1.5"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="flex items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
              disabled={isSubmitting}
              title="Emoji"
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
          <label className={`cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 ${isSubmitting ? 'cursor-not-allowed' : ''}`}>
            <input type="file" ref={fileInput} onChange={handleFileChange} className="hidden" multiple disabled={isSubmitting} />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300">
              <path
                fillRule="evenodd"
                d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                clipRule="evenodd"
              />
            </svg>
          </label>
          <button
            type="button"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`p-2 rounded-lg ${
              isRecording ? 'text-red-500 animate-pulse' : 'text-gray-600 dark:text-gray-300'
            } hover:bg-gray-100 dark:hover:bg-zinc-800 ${isSubmitting ? 'cursor-not-allowed' : ''}`}
            title={isRecording ? 'Stop recording' : 'Record a voice message'}
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.25v1.25m0 0c-3.25 0-6-2.75-6-6V9.75m12 0v3.75c0 3.25-2.75 6-6 6zm0 0V19.5m0 0h-4.5m4.5 0h4.5"
              />
              <rect x="9" y="3" width="6" height="10" rx="3" fill="currentColor" />
            </svg>
          </button>
          <div className="h-5 w-px bg-gray-300 dark:bg-zinc-600 mx-1"></div>
          <button
            type="submit"
            disabled={!username || (!text.trim() && files.length === 0) || isSubmitting}
            className={`p-2 rounded-lg transition-colors ${
              !username || (!text.trim() && files.length === 0) || isSubmitting
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
            }`}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
