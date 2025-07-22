'use client';
import { Message } from '@/types';
import React from 'react';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onDelete: (messageId: string) => void;
  API_URL: string;
}

const handleFileDownload = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, fileId: string, originalname: string, API_URL: string) => {
  try {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/files/${fileId}`);
    if (!res.ok) throw new Error('Không thể tải file');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalname;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  } catch (err) {
    window.open(`${API_URL}/api/files/${fileId}`, '_blank');
  }
};

export const MessageItem = React.memo(function MessageItem({ message, isOwn, onDelete, API_URL }: MessageItemProps) {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={`rounded-2xl px-4 py-2 max-w-[80%] shadow-sm relative group ${
          isOwn ? 'bg-indigo-500 text-white' : 'bg-white text-gray-900 border'
        }`}
      >
        {isOwn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(message._id);
            }}
            aria-label="Xóa tin nhắn"
            className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            ×
          </button>
        )}
        <div className="text-xs font-semibold mb-1 flex items-center gap-1">
          <span>{message.username}</span>
          {isOwn && <span className="text-[10px] text-indigo-200">(Bạn)</span>}
        </div>
        <div>{message.text}</div>
        {message.file && message.file.id ? (
          <div className="mt-1">
            <a
              href={`${API_URL}/api/files/${message.file.id}`}
              download={message.file.originalname}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-700 underline flex items-center gap-1 hover:text-blue-900 focus:outline-none cursor-pointer select-auto"
              title="Tải file về máy"
              onClick={(e) => handleFileDownload(e, message.file!.id, message.file!.originalname, API_URL)}
            >
              <span role="img" aria-label="file">
                📎
              </span>{' '}
              {message.file.originalname}
            </a>
          </div>
        ) : null}
        <div className="text-[10px] text-gray-300 mt-1 text-right">{new Date(message.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
});
