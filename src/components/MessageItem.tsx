'use client';
import { Message } from '@/types';
import React, { useMemo } from 'react';
import Image from 'next/image';

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
    if (!res.ok) throw new Error('Failed to download file');
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

const isImage = (filename: string) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? imageExtensions.includes(extension) : false;
};

const formatMessageText = (text: string) => {
  // Regular expression for matching URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Split text by URLs and map each part
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const MessageItem = React.memo(function MessageItem({ message, isOwn, onDelete, API_URL }: MessageItemProps) {
  const formattedText = useMemo(() => formatMessageText(message.text), [message.text]);

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
            aria-label="Delete message"
            className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            ×
          </button>
        )}
        <div className="text-xs font-semibold mb-1 flex items-center gap-1">
          <span>{message.username}</span>
          {isOwn && <span className="text-[10px] text-indigo-200">(You)</span>}
        </div>
        <div className={isOwn ? 'text-white' : 'text-gray-900'}>{formattedText}</div>
        {message.file && message.file.id ? (
          <div className="mt-1">
            <a
              href={`${API_URL}/api/files/${message.file.id}`}
              download={message.file.originalname}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-700 flex items-center gap-1 hover:text-blue-900 focus:outline-none cursor-pointer select-auto"
              title="Download file"
              onClick={(e) => handleFileDownload(e, message.file!.id, message.file!.originalname, API_URL)}
            >
              <span role="img" aria-label="file">
                📎
              </span>{' '}
              {message.file.originalname}
            </a>
            {isImage(message.file.originalname) && (
              <div className="mt-2 rounded-lg overflow-hidden">
                <div className="relative w-[300px] h-[200px]">
                  <Image
                    src={`${API_URL}/api/files/${message.file.id}`}
                    alt={message.file.originalname}
                    fill
                    sizes="300px"
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
        <div className={`text-[10px] ${isOwn ? 'text-indigo-200' : 'text-gray-400'} mt-1 text-right`}>
          {new Date(message.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
});
