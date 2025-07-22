'use client';
import { useRef, useState } from 'react';
import { EmojiPickerComponent } from './EmojiPicker';

interface ChatInputProps {
  username: string;
  text: string;
  onUsernameChange: (username: string) => void;
  onTextChange: (text: string) => void;
  onFilesChange: (files: File[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export function ChatInput({ username, text, onUsernameChange, onTextChange, onFilesChange, onSubmit, onTyping, onStopTyping }: ChatInputProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFiles((prev) => {
      const newFiles = [...prev, ...files];
      onFilesChange(newFiles);
      return newFiles;
    });
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      onFilesChange(newFiles);
      return newFiles;
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3 p-4 border-t bg-white shadow-lg">
      <input
        className="w-1/4 min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm placeholder:text-gray-600 text-gray-900"
        placeholder="Your name"
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        required
      />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              className="w-full rounded-lg border border-gray-300 bg-white pl-4 pr-14 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm placeholder:text-gray-600 text-gray-900"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 transition-opacity hover:opacity-70"
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
            className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-300"
            title="Attach files"
          >
            <input type="file" ref={fileInput} onChange={handleFileChange} className="hidden" multiple />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
              <path
                fillRule="evenodd"
                d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                clipRule="evenodd"
              />
            </svg>
          </label>
        </div>
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                {file.type.startsWith('image') ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-8 h-8 object-cover rounded mr-1" />
                ) : (
                  <span className="inline-block w-8 h-8 bg-gray-300 rounded mr-1 flex items-center justify-center">📎</span>
                )}
                <span className="truncate max-w-[80px]">{file.name}</span>
                <button type="button" className="ml-1 text-red-500 hover:text-red-700" onClick={() => handleRemoveFile(idx)} title="Remove file">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={!username || (!text.trim() && selectedFiles.length === 0)}
          className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
            !username || (!text.trim() && selectedFiles.length === 0)
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          Send
        </button>
      </div>
    </form>
  );
}
