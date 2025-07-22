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
    <form onSubmit={onSubmit} className="flex items-center gap-2 px-4 py-3 border-t bg-white">
      <input
        className="w-1/4 min-w-[110px] rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all duration-150 shadow-sm placeholder:text-gray-400 mr-2"
        placeholder="Tên của bạn"
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        required
      />
      <input
        className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all duration-150 shadow-sm placeholder:text-gray-400 mr-2"
        placeholder="Nhập tin nhắn..."
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
      <label className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 transition-all duration-150 shadow border border-indigo-200 mr-2">
        <input type="file" ref={fileInput} onChange={(e) => onFileChange(e.target.files?.[0] || null)} className="hidden" />
        <span className="text-2xl text-indigo-500">📎</span>
      </label>
      <button
        type="submit"
        disabled={!username || (!text.trim() && !fileInput.current?.files?.[0])}
        className={`rounded-full px-8 py-2 font-bold shadow-lg text-base transition-all duration-150 ${
          !username || (!text.trim() && !fileInput.current?.files?.[0])
            ? 'bg-gray-300 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white'
        }`}
      >
        Gửi
      </button>
    </form>
  );
}
