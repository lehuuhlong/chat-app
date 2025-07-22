'use client';
import { useRef } from 'react';

interface ChatInputProps {
  username: string;
  text: string;
  onUsernameChange: (username: string) => void;
  onTextChange: (text: string) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChatInput({ username, text, onUsernameChange, onTextChange, onFileChange, onSubmit }: ChatInputProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3 p-4 border-t bg-white shadow-lg">
      <input
        className="w-1/4 min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm placeholder:text-gray-600 text-gray-900"
        placeholder="Your name"
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        required
      />
      <div className="flex-1 flex items-center gap-2">
        <input
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm placeholder:text-gray-600 text-gray-900"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <label
          className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-300"
          title="Attach file"
        >
          <input type="file" ref={fileInput} onChange={(e) => onFileChange(e.target.files?.[0] || null)} className="hidden" />
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
            <path
              fillRule="evenodd"
              d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
              clipRule="evenodd"
            />
          </svg>
        </label>
        <button
          type="submit"
          disabled={!username || (!text.trim() && !fileInput.current?.files?.[0])}
          className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
            !username || (!text.trim() && !fileInput.current?.files?.[0])
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
