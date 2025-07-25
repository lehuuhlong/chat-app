'use client';
import { Message } from '@/types';
import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { ImageViewer } from './ImageViewer';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onDelete: (messageId: string) => void;
  API_URL: string;
  search?: string;
  username: string;
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

const isAudio = (filename: string) => {
  const audioExtensions = ['webm', 'mp3', 'wav', 'ogg', 'm4a'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? audioExtensions.includes(extension) : false;
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

function highlight(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const MessageItem = React.memo(function MessageItem({ message, isOwn, onDelete, API_URL, search, username }: MessageItemProps) {
  const formattedText = useMemo(() => formatMessageText(message.text), [message.text]);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  useEffect(() => {
    setEditText(message.text);
  }, [message.text]);

  // Thay vì chỉ dùng isViewerOpen, dùng viewerState để lưu src ảnh đang xem
  const [viewerState, setViewerState] = useState<{ open: boolean; src: string; alt: string } | null>(null);
  const [showReactionPalette, setShowReactionPalette] = useState(false);

  const handleEdit = async () => {
    if (editText.trim() === message.text) {
      setIsEditing(false);
      return;
    }
    await fetch(`${API_URL}/api/messages/${message._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText }),
    });
    setIsEditing(false);
  };

  const handleReaction = async (emoji: string) => {
    await fetch(`${API_URL}/api/messages/${message._id}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: emoji, username }),
    });
    setShowReactionPalette(false);
  };

  // Helper render file (ảnh/audio/khác)
  const renderFile = (file: any) => {
    if (!file) return null;
    if (isAudio(file.originalname)) {
      return (
        <audio controls className="w-full mt-1">
          <source src={`${API_URL}/api/files/${file.id}`} type={file.mimetype || 'audio/webm'} />
          Your browser does not support the audio element.
        </audio>
      );
    }
    if (isImage(file.originalname)) {
      return (
        <>
          <a
            href={`${API_URL}/api/files/${file.id}`}
            download={file.originalname}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-700 flex items-center gap-1 hover:text-blue-900 focus:outline-none cursor-pointer select-auto"
            title="Download file"
            onClick={(e) => handleFileDownload(e, file.id, file.originalname, API_URL)}
          >
            <span role="img" aria-label="file">
              📎
            </span>{' '}
            {file.originalname}
          </a>
          <div
            className="mt-2 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setViewerState({ open: true, src: `${API_URL}/api/files/${file.id}`, alt: file.originalname })}
          >
            <div className="relative w-[300px] h-[200px] group">
              <Image
                src={`${API_URL}/api/files/${file.id}`}
                alt={file.originalname}
                fill
                quality={100}
                sizes="300px"
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </>
      );
    }
    // File khác
    return (
      <a
        href={`${API_URL}/api/files/${file.id}`}
        download={file.originalname}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-700 flex items-center gap-1 hover:text-blue-900 focus:outline-none cursor-pointer select-auto"
        title="Download file"
        onClick={(e) => handleFileDownload(e, file.id, file.originalname, API_URL)}
      >
        <span role="img" aria-label="file">
          📎
        </span>{' '}
        {file.originalname}
      </a>
    );
  };

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={`rounded-2xl px-4 py-2 max-w-[80%] shadow-sm relative group ${
          isOwn
            ? 'bg-indigo-500 text-white dark:bg-indigo-700'
            : 'bg-white text-gray-900 border dark:bg-zinc-900 dark:text-gray-100 dark:border-zinc-700'
        } transition-colors`}
      >
        {isOwn && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(message._id);
              }}
              aria-label="Delete message"
              className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              ×
            </button>
            <button
              onClick={() => setIsEditing((v) => !v)}
              aria-label="Edit message"
              className="absolute -right-2 top-6 w-6 h-6 bg-yellow-400 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              ✎
            </button>
          </>
        )}
        {!isOwn && (
          <button
            onClick={() => setShowReactionPalette(true)}
            className="absolute -right-2 -top-2 w-6 h-6 bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            aria-label="React to message"
          >
            😊
          </button>
        )}

        {showReactionPalette && (
          <div className="absolute bottom-full mb-1 left-0 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-full shadow-lg p-1 flex gap-1 z-10">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="text-xs font-semibold mb-1 flex items-center gap-1">
          <span>{search ? highlight(message.username, search) : message.username}</span>
          {isOwn && <span className="text-[10px] text-indigo-200">(You)</span>}
        </div>
        {isEditing ? (
          <div className="flex gap-2 items-center">
            <input
              className="rounded px-2 py-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <button onClick={handleEdit} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-bold">
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 font-bold">
              Cancel
            </button>
          </div>
        ) : (
          <div className={`${isOwn ? 'text-white' : 'text-gray-900 dark:text-gray-100'} break-words`}>
            {search ? highlight(message.text, search) : formattedText}
          </div>
        )}
        {Array.isArray(message.files) && message.files.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.files.map((file, idx) => (
              <div key={file.id || idx} className="max-w-[320px]">
                {renderFile(file)}
              </div>
            ))}
          </div>
        ) : message.file && message.file.id ? (
          <div className="mt-1">{renderFile(message.file)}</div>
        ) : null}
        {viewerState?.open && <ImageViewer src={viewerState.src} alt={viewerState.alt} onClose={() => setViewerState(null)} />}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="absolute -bottom-4 right-0 flex items-center gap-1">
            {Object.entries(message.reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <div
                  key={emoji}
                  className="bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-full px-2 py-0.5 text-xs flex items-center shadow-sm"
                >
                  <span>{emoji}</span>
                  <span className="ml-1 text-gray-600 dark:text-gray-300">{users.length}</span>
                </div>
              ) : null
            )}
          </div>
        )}
        <div className={`text-[10px] ${isOwn ? 'text-indigo-200' : 'text-gray-400'} mt-1 text-right`}>
          {new Date(message.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
});
