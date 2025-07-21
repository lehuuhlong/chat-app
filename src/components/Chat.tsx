'use client';
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
let socket: any;

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [username, setUsername] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/messages`)
      .then((res) => res.json())
      .then(setMessages);
    socket = io(API_URL);
    socket.on('message', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.disconnect();
  }, []);

  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!username) return alert('Nhập tên trước!');
    const formData = new FormData();
    formData.append('username', username);
    formData.append('text', text);
    if (file) formData.append('file', file);
    await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      body: formData,
    });
    setText('');
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg flex flex-col h-[80vh]">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <span className="font-bold text-lg text-indigo-700">💬 Messenger Chat</span>
          <span className="text-xs text-gray-400">{username ? `Bạn: ${username}` : 'Chưa đặt tên'}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 bg-blue-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-4 py-2 max-w-[80%] shadow-sm ${
                  msg.username === username ? 'bg-indigo-500 text-white' : 'bg-white text-gray-900 border'
                }`}
              >
                <div className="text-xs font-semibold mb-1 flex items-center gap-1">
                  <span>{msg.username}</span>
                  {msg.username === username && <span className="text-[10px] text-indigo-200">(Bạn)</span>}
                </div>
                <div>{msg.text}</div>
                {msg.file && msg.file.id ? (
                  <div className="mt-1">
                    <a
                      href={`${API_URL}/api/files/${msg.file.id}`}
                      download={msg.file.originalname}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-700 underline flex items-center gap-1 hover:text-blue-900 focus:outline-none cursor-pointer select-auto"
                      title="Tải file về máy"
                      onClick={async (e) => {
                        // fallback: nếu trình duyệt không hỗ trợ download attribute với cross-origin
                        try {
                          e.preventDefault();
                          const res = await fetch(`${API_URL}/api/files/${msg.file.id}`);
                          if (!res.ok) throw new Error('Không thể tải file');
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = msg.file.originalname;
                          document.body.appendChild(a);
                          a.click();
                          setTimeout(() => {
                            window.URL.revokeObjectURL(url);
                            a.remove();
                          }, 100);
                        } catch (err) {
                          // fallback: mở link gốc nếu fetch lỗi
                          window.open(`${API_URL}/api/files/${msg.file.id}`, '_blank');
                        }
                      }}
                    >
                      <span role="img" aria-label="file">
                        📎
                      </span>{' '}
                      {msg.file.originalname}
                    </a>
                  </div>
                ) : null}
                <div className="text-[10px] text-gray-300 mt-1 text-right">{new Date(msg.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 border-t bg-white">
          <input
            className="w-1/4 min-w-[110px] rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all duration-150 shadow-sm placeholder:text-gray-400 mr-2"
            placeholder="Tên của bạn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all duration-150 shadow-sm placeholder:text-gray-400 mr-2"
            placeholder="Nhập tin nhắn..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <label className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 transition-all duration-150 shadow border border-indigo-200 mr-2">
            <input type="file" ref={fileInput} onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            <span className="text-2xl text-indigo-500">📎</span>
          </label>
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-full px-8 py-2 font-bold shadow-lg text-base transition-all duration-150"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
}
