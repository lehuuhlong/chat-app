'use client';
import { Message } from '@/types';
import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageViewer } from './ImageViewer';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onDelete: (messageId: string) => void;
  search?: string;
  username: string;
}

const handleFileDownload = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, fileId: string, originalname: string) => {
  try {
    e.preventDefault();
    const res = await fetch(`/api/files/${fileId}`);
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
    window.open(`/api/files/${fileId}`, '_blank');
  }
};

const isImage = (filename: string) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'jfif'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? imageExtensions.includes(extension) : false;
};

const isAudio = (filename: string) => {
  const audioExtensions = ['webm', 'mp3', 'wav', 'ogg', 'm4a', 'aac'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? audioExtensions.includes(extension) : false;
};

const isVideo = (filename: string) => {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? videoExtensions.includes(extension) : false;
};

const isPDF = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
};

const isDocument = (filename: string) => {
  const docExtensions = ['doc', 'docx', 'txt', 'rtf', 'odt'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? docExtensions.includes(extension) : false;
};

const isSpreadsheet = (filename: string) => {
  const spreadsheetExtensions = ['xls', 'xlsx', 'csv', 'ods'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? spreadsheetExtensions.includes(extension) : false;
};

const isPresentation = (filename: string) => {
  const presentationExtensions = ['ppt', 'pptx', 'odp'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? presentationExtensions.includes(extension) : false;
};

const isArchive = (filename: string) => {
  const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? archiveExtensions.includes(extension) : false;
};

const getFileIcon = (filename: string) => {
  if (isImage(filename)) return '🖼️';
  if (isAudio(filename)) return '🎵';
  if (isVideo(filename)) return '🎬';
  if (isPDF(filename)) return '📄';
  if (isDocument(filename)) return '📝';
  if (isSpreadsheet(filename)) return '📊';
  if (isPresentation(filename)) return '📋';
  if (isArchive(filename)) return '🗜️';
  return '📎';
};

const formatMessageText = (text: string) => {
  // Regular expression for matching URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Split text by URLs and map each part
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity">
          {part}
        </a>
      );
    }
    // Giữ nguyên xuống dòng và khoảng trắng cho phần text thường
    return part;
  });
};

function highlight(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-300/50 dark:bg-yellow-500/30 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// Generate avatar color from username
const getAvatarColor = (name: string) => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-600',
    'from-red-500 to-orange-500',
    'from-teal-500 to-green-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const MessageItem = React.memo(function MessageItem({ message, isOwn, onDelete, search, username }: MessageItemProps) {
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
    await fetch(`/api/messages/${message._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText }),
    });
    setIsEditing(false);
  };

  const handleReaction = async (emoji: string) => {
    await fetch(`/api/messages/${message._id}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: emoji, username }),
    });
    setShowReactionPalette(false);
  };

  // Helper render file (ảnh/audio/video/khác)
  const renderFile = (file: any) => {
    if (!file) return null;

    if (isAudio(file.originalname)) {
      return (
        <audio controls className="w-full mt-2 rounded-lg">
          <source src={`/api/files/${file.id}`} type={file.mimetype || 'audio/webm'} />
          Your browser does not support the audio element.
        </audio>
      );
    }

    if (isVideo(file.originalname)) {
      return (
        <video controls className="w-full max-w-[400px] mt-2 rounded-xl overflow-hidden">
          <source src={`/api/files/${file.id}`} type={file.mimetype} />
          Your browser does not support the video element.
        </video>
      );
    }

    if (isImage(file.originalname)) {
      return (
        <>
          <a
            href={`/api/files/${file.id}`}
            download={file.originalname}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer mt-1 ${isOwn ? 'text-indigo-200' : 'text-indigo-500'}`}
            title="Download file"
            onClick={(e) => handleFileDownload(e, file.id, file.originalname)}
          >
            <span role="img" aria-label="file">📎</span>{' '}
            {file.originalname}
          </a>
          <div
            className="mt-2 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all hover:shadow-lg"
            onClick={() => setViewerState({ open: true, src: `/api/files/${file.id}`, alt: file.originalname })}
          >
            <div className="relative w-[300px] h-[200px] group">
              <Image
                src={`/api/files/${file.id}`}
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
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

    // Other file types (PDF, documents, etc.)
    return (
      <div className={`mt-2 p-3 rounded-xl border transition-smooth ${
        isOwn
          ? 'bg-white/10 border-white/20'
          : 'bg-gray-100/50 dark:bg-zinc-800/50 border-gray-200/50 dark:border-zinc-700/50'
      }`}>
        <a
          href={`/api/files/${file.id}`}
          download={file.originalname}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer ${
            isOwn ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'
          }`}
          title="Download file"
          onClick={(e) => handleFileDownload(e, file.id, file.originalname)}
        >
          <span className="text-2xl" role="img" aria-label="file">
            {getFileIcon(file.originalname)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{file.originalname}</div>
            <div className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Click to download'}
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        </a>
      </div>
    );
  };

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`avatar bg-gradient-to-br ${getAvatarColor(message.username)} shadow-md flex-shrink-0 mt-1`}>
        {message.username.charAt(0).toUpperCase()}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Username */}
        <div className={`text-[11px] font-semibold mb-1 px-1 flex items-center gap-1.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {search ? highlight(message.username, search) : message.username}
          </span>
          {isOwn && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 font-medium">
              you
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative group px-4 py-2.5 ${isOwn ? 'bubble-own' : 'bubble-other'}`}
        >
          {/* Action buttons for own messages */}
          {isOwn && (
            <div className="absolute -top-2 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(message._id);
                }}
                aria-label="Delete message"
                className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md text-xs"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
              <button
                onClick={() => setIsEditing((v) => !v)}
                aria-label="Edit message"
                className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition-colors shadow-md text-xs"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
          )}

          {/* Reaction button for other's messages */}
          {!isOwn && (
            <button
              onClick={() => setShowReactionPalette(true)}
              className="absolute -top-2 -right-2 w-6 h-6 glass-subtle rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-xs shadow-md hover:scale-110"
              aria-label="React to message"
            >
              😊
            </button>
          )}

          {/* Reaction palette */}
          <AnimatePresence>
            {showReactionPalette && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 5 }}
                className="absolute bottom-full mb-2 left-0 glass rounded-2xl shadow-xl p-1.5 flex gap-1 z-10"
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1.5 rounded-xl hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 transition-all hover:scale-125 text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message text */}
          {isEditing ? (
            <div className="flex gap-2 items-start">
              <textarea
                className="rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 focus:ring-2 focus:ring-indigo-400 resize-none min-h-[60px] flex-1"
                style={{ color: 'var(--text-primary)' }}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) handleEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                placeholder="Press Ctrl+Enter to save"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleEdit}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="break-words whitespace-pre-wrap text-[14px] leading-relaxed">
              {search ? highlight(message.text, search) : formattedText}
            </div>
          )}

          {/* Files */}
          {Array.isArray(message.files) && message.files.length > 1 ? (
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
        </div>

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'mr-2' : 'ml-2'}`}>
            {Object.entries(message.reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <motion.div
                  key={emoji}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="glass-subtle rounded-full px-2 py-0.5 text-xs flex items-center shadow-sm cursor-default"
                  title={users.join(', ')}
                >
                  <span>{emoji}</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{users.length}</span>
                </motion.div>
              ) : null
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-[10px] mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-secondary)' }}>
          {new Date(message.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
});
