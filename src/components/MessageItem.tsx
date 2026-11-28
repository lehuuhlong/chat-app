'use client';
import { Message, MessageFile } from '@/types';
import React, { Fragment, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageViewer } from './ImageViewer';
import { REACTION_EMOJIS, MAX_TEXT_LENGTH } from '@/lib/constants';
import { formatFileSize, formatTime, getAvatarColor, getFileIcon, getFileKind, getMessageFiles } from '@/lib/client/format';

// Ngưỡng để thu gọn tin nhắn dài
const MAX_COLLAPSED_HEIGHT = 200; // px

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  /** Same author as the previous message within a few minutes → hide avatar & name. */
  isGrouped: boolean;
  /** Only the last message of a group shows its time. */
  showTime: boolean;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string, text: string) => Promise<boolean>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  search?: string;
  username: string;
}

// Excludes trailing punctuation so "see https://example.com." doesn't link the dot.
const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightParts(text: string, keyword: string | undefined, keyPrefix: string): React.ReactNode[] {
  if (!keyword) return [text];
  const re = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  // With a single capture group, odd indices are always the matches.
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={`${keyPrefix}-${i}`} className="bg-yellow-300/50 dark:bg-yellow-500/30 px-0.5 rounded text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** Linkify URLs and highlight the search keyword — links stay clickable while searching. */
function renderMessageText(text: string, keyword?: string) {
  return text.split(URL_REGEX).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {highlightParts(part, keyword, `l${i}`)}
      </a>
    ) : (
      <Fragment key={i}>{highlightParts(part, keyword, `t${i}`)}</Fragment>
    ),
  );
}

const fileUrl = (id: string) => `/api/files/${id}`;
const downloadUrl = (id: string) => `/api/files/${id}?download`;

const FileAttachment = memo(function FileAttachment({
  file,
  isOwn,
  onOpenImage,
}: {
  file: MessageFile;
  isOwn: boolean;
  onOpenImage: (file: MessageFile) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const kind = getFileKind(file.originalname, file.mimetype);

  if (kind === 'audio') {
    return (
      <audio controls preload="metadata" className="w-full min-w-[220px] mt-1 rounded-lg">
        <source src={fileUrl(file.id)} type={file.mimetype || 'audio/webm'} />
        Your browser does not support the audio element.
      </audio>
    );
  }

  if (kind === 'video') {
    return (
      <video controls preload="metadata" className="w-full max-w-[400px] mt-1 rounded-xl overflow-hidden mobile-msg-video">
        <source src={fileUrl(file.id)} type={file.mimetype} />
        Your browser does not support the video element.
      </video>
    );
  }

  if (kind === 'image' && !imageFailed) {
    // The optimizer can't handle SVG, and would drop GIF animation.
    const unoptimized = /svg|gif/i.test(file.mimetype || file.originalname);
    return (
      <div className="mt-1">
        <button
          type="button"
          className="block rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-all hover:shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            onOpenImage(file);
          }}
          aria-label={`Open ${file.originalname}`}
        >
          <div className="relative w-[300px] max-w-full h-[200px] group mobile-msg-image">
            <Image
              src={fileUrl(file.id)}
              alt={file.originalname}
              fill
              sizes="(max-width: 640px) 240px, 300px"
              className="object-contain"
              unoptimized={unoptimized}
              onError={() => setImageFailed(true)}
            />
          </div>
        </button>
        <a
          href={downloadUrl(file.id)}
          download={file.originalname}
          className={`text-[11px] inline-flex items-center gap-1 hover:opacity-80 transition-opacity mt-1 max-w-full ${isOwn ? 'text-indigo-100' : 'text-indigo-500'}`}
          title="Download file"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="truncate">{file.originalname}</span>
        </a>
      </div>
    );
  }

  // Other file types (PDF, documents, failed images, ...)
  return (
    <a
      href={downloadUrl(file.id)}
      download={file.originalname}
      title="Download file"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1 p-3 rounded-xl border transition-smooth text-sm flex items-center gap-2 hover:opacity-80 ${
        isOwn ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-100/50 dark:bg-zinc-800/50 border-gray-200/50 dark:border-zinc-700/50 text-indigo-600 dark:text-indigo-400'
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {getFileIcon(file.originalname, file.mimetype)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{file.originalname}</div>
        <div className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
          {imageFailed ? 'Preview unavailable · ' : ''}
          {formatFileSize(file.size) || 'Click to download'}
        </div>
      </div>
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    </a>
  );
});

const actionBtn = 'w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md text-xs hover:scale-110';

export const MessageItem = memo(function MessageItem({
  message,
  isOwn,
  isGrouped,
  showTime,
  onDelete,
  onEdit,
  onReact,
  search,
  username,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [viewer, setViewer] = useState<{ src: string; alt: string; downloadHref: string } | null>(null);
  const [showReactionPalette, setShowReactionPalette] = useState(false);
  // On touch devices there is no hover, so tapping the bubble reveals the actions.
  const [isActive, setIsActive] = useState(false);

  // Collapsible long message state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const files = useMemo(() => getMessageFiles(message), [message]);
  const renderedText = useMemo(() => renderMessageText(message.text, search), [message.text, search]);

  useEffect(() => {
    if (!isEditing) setEditText(message.text);
  }, [message.text, isEditing]);

  // Đo chiều cao thực tế của text để xác định có cần thu gọn không
  useLayoutEffect(() => {
    const el = textRef.current;
    setIsOverflowing(!!el && el.scrollHeight > MAX_COLLAPSED_HEIGHT);
  }, [message.text, isEditing]);

  // Close palette / action bar when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!showReactionPalette && !isActive) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setShowReactionPalette(false);
        setIsActive(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowReactionPalette(false);
        setIsActive(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showReactionPalette, isActive]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.text);
    } catch {
      // Fallback for insecure contexts (http on LAN)
      const textarea = document.createElement('textarea');
      textarea.value = message.text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.text]);

  const handleSaveEdit = async () => {
    const next = editText.trim();
    if (!next || next === message.text.trim()) {
      setIsEditing(false);
      setEditText(message.text);
      return;
    }
    setIsSaving(true);
    const ok = await onEdit(message._id, next);
    setIsSaving(false);
    if (ok) setIsEditing(false);
  };

  const handleReaction = (emoji: string) => {
    setShowReactionPalette(false);
    onReact(message._id, emoji);
  };

  const openImage = useCallback(
    (file: MessageFile) => setViewer({ src: fileUrl(file.id), alt: file.originalname, downloadHref: downloadUrl(file.id) }),
    [],
  );

  const createdAt = new Date(message.createdAt);
  const reactions = Object.entries(message.reactions || {}).filter(([, users]) => users.length > 0);
  const actionsVisible = isActive || showReactionPalette;

  return (
    <div ref={rootRef} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (invisible placeholder keeps alignment for grouped messages) */}
      <div
        className={`avatar bg-gradient-to-br ${getAvatarColor(message.username)} shadow-md flex-shrink-0 mt-1 ${isGrouped ? 'invisible' : ''}`}
        aria-hidden={isGrouped}
      >
        {message.username.charAt(0).toUpperCase()}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] min-w-0 mobile-msg-content`}>
        {!isGrouped && (
          <div className={`text-[11px] font-semibold mb-1 px-1 flex items-center gap-1.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <span style={{ color: 'var(--text-secondary)' }}>{highlightParts(message.username, search, 'u')}</span>
            {isOwn && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 font-medium">you</span>}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative group px-4 py-2.5 max-w-full ${isOwn ? 'bubble-own' : 'bubble-other'}`}
          title={createdAt.toLocaleString()}
          onClick={() => !isEditing && setIsActive((v) => !v)}
        >
          {/* Action bar — hover on desktop, tap on touch devices */}
          {!isEditing && (
            <div
              className={`msg-actions absolute -top-3 ${isOwn ? '-left-3' : '-right-3'} flex gap-1 transition-all duration-200 z-10 ${
                actionsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowReactionPalette((v) => !v)} aria-label="React to message" className={`${actionBtn} glass-subtle`}>
                😊
              </button>
              {isOwn && (
                <>
                  <button onClick={() => setIsEditing(true)} aria-label="Edit message" className={`${actionBtn} bg-amber-500 text-white hover:bg-amber-600`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                      />
                    </svg>
                  </button>
                  <button onClick={() => onDelete(message._id)} aria-label="Delete message" className={`${actionBtn} bg-red-500 text-white hover:bg-red-600`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reaction palette */}
          <AnimatePresence>
            {showReactionPalette && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 5 }}
                className={`absolute bottom-full mb-4 ${isOwn ? 'right-0' : 'left-0'} glass rounded-2xl shadow-xl p-1.5 flex gap-1 z-20`}
                onClick={(e) => e.stopPropagation()}
              >
                {REACTION_EMOJIS.map((emoji) => {
                  const mine = message.reactions?.[emoji]?.includes(username);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={`p-1.5 rounded-xl transition-all hover:scale-125 text-base ${
                        mine ? 'bg-indigo-500/20' : 'hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20'
                      }`}
                      aria-pressed={mine}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message text */}
          {isEditing ? (
            <div className="flex gap-2 items-start" onClick={(e) => e.stopPropagation()}>
              <textarea
                className="rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 focus:ring-2 focus:ring-indigo-400 resize-none min-h-[60px] min-w-[200px] flex-1"
                style={{ color: 'var(--text-primary)' }}
                value={editText}
                maxLength={MAX_TEXT_LENGTH}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                onKeyDown={(e) => {
                  // Same convention as the main input: Enter saves, Shift+Enter adds a newline.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditText(message.text);
                  }
                }}
                disabled={isSaving}
                placeholder="Enter to save, Esc to cancel"
              />
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editText.trim()}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  {isSaving ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(message.text);
                  }}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            message.text && (
              <div className="relative">
                <div
                  ref={textRef}
                  className={`break-words whitespace-pre-wrap text-[14px] leading-relaxed overflow-hidden text-wrap transition-all duration-300 ${
                    isOverflowing && !isExpanded ? 'max-h-[200px]' : ''
                  }`}
                  style={
                    isOverflowing && !isExpanded
                      ? {
                          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                        }
                      : undefined
                  }
                >
                  {renderedText}
                </div>

                {isOverflowing && (
                  <div className={`flex items-center gap-2 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setIsExpanded((v) => !v)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${
                        isOwn ? 'text-indigo-100 hover:text-white hover:bg-white/10' : 'text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                      }`}
                    >
                      {isExpanded ? '▲ Thu gọn' : '▼ Xem thêm...'}
                    </button>
                    <button
                      onClick={handleCopyText}
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                        isOwn ? 'text-indigo-100 hover:text-white hover:bg-white/10' : 'text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                      }`}
                      title="Copy toàn bộ tin nhắn"
                    >
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Đã copy!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                            />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {/* Files */}
          {files.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${message.text ? 'mt-2' : ''}`}>
              {files.map((file) => (
                <div key={file.id} className="max-w-[320px] min-w-0 mobile-msg-files">
                  <FileAttachment file={file} isOwn={isOwn} onOpenImage={openImage} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reactions — click a chip to toggle your own reaction */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap items-center gap-1 mt-1 ${isOwn ? 'mr-2 justify-end' : 'ml-2'}`}>
            {reactions.map(([emoji, users]) => {
              const mine = users.includes(username);
              return (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => handleReaction(emoji)}
                  className={`rounded-full px-2 py-0.5 text-xs flex items-center shadow-sm transition-colors ${
                    mine ? 'bg-indigo-500/20 border border-indigo-400/50' : 'glass-subtle hover:bg-indigo-500/10'
                  }`}
                  title={users.join(', ')}
                  aria-pressed={mine}
                >
                  <span>{emoji}</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {users.length}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {(showTime || message.editedAt) && (
          <div className={`text-[10px] mt-1 px-1 flex gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ color: 'var(--text-secondary)' }}>
            {showTime && <time dateTime={message.createdAt}>{formatTime(createdAt)}</time>}
            {message.editedAt && <span title={new Date(message.editedAt).toLocaleString()}>{showTime ? '· ' : ''}edited</span>}
          </div>
        )}
      </div>
      {/* Rendered outside the bubble: portal events still bubble through the React tree. */}
      {viewer && <ImageViewer src={viewer.src} alt={viewer.alt} downloadHref={viewer.downloadHref} onClose={() => setViewer(null)} />}
    </div>
  );
});
