# Quick Start Guide

Hướng dẫn nhanh để chạy ứng dụng sau khi migration.

## Bước 1: Cài đặt Dependencies

```bash
# Cài đặt dependencies cho Next.js
npm install

# Cài đặt dependencies cho Socket.IO server
cd socket-server         
npm install
cd ..
```

## Bước 2: Cấu hình Environment Variables

### Tạo file .env.local (nếu chưa có)

```bash
# Copy từ example
cp .env.local.example .env.local
```

Hoặc tạo file `.env.local` với nội dung:

```env
# MongoDB Connection (thay đổi nếu cần)
MONGODB_URI=mongodb://localhost:27017/chat-app

# Socket.IO Server Configuration
SOCKET_SERVER_URL=http://localhost:5000
SOCKET_SERVER_SECRET=dev-secret-key-change-in-production

# Public Environment Variables
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Kiểm tra file socket-server/.env

File này đã được tạo sẵn với config mặc định:

```env
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EMIT_SECRET=dev-secret-key-change-in-production
```

## Bước 3: Chạy MongoDB

Đảm bảo MongoDB đang chạy:

```bash
# Nếu dùng MongoDB local
mongod

# Hoặc sử dụng MongoDB Atlas (update MONGODB_URI trong .env.local)
```

## Bước 4: Chạy Ứng Dụng

Mở 2 terminal:

### Terminal 1: Socket.IO Server

```bash
cd socket-server
npm run dev
```

Bạn sẽ thấy:

```
Socket.IO server running on port 5000
Allowed origins: http://localhost:3000, http://127.0.0.1:3000
```

### Terminal 2: Next.js Application

```bash
npm run dev
```

Bạn sẽ thấy:

```
▲ Next.js 15.4.2
- Local:        http://localhost:3000
```

## Bước 5: Truy Cập Ứng Dụng

Mở trình duyệt và truy cập: **http://localhost:3000**

## Kiểm Tra Nhanh

### 1. Kiểm tra Socket.IO Server

Truy cập: http://localhost:5000

Bạn sẽ thấy:

```json
{
  "status": "ok",
  "message": "Socket.IO server is running",
  "onlineUsers": 0
}
```

### 2. Kiểm tra API Routes

- Messages: http://localhost:3000/api/messages
- Online Users: http://localhost:3000/api/online-users

### 3. Test Các Tính Năng

1. **Gửi tin nhắn**: Nhập text và nhấn Enter
2. **Upload file**: Click icon 📎 và chọn file
3. **Real-time**: Mở 2 tab browser và test tin nhắn real-time
4. **Online users**: Kiểm tra danh sách users online
5. **Typing indicator**: Gõ tin nhắn và xem typing indicator
6. **Reactions**: Click vào tin nhắn và thêm reaction
7. **Edit/Delete**: Click vào tin nhắn của bạn để edit/delete

## Troubleshooting

### Lỗi: "Cannot connect to MongoDB"

**Giải pháp:**

1. Kiểm tra MongoDB đang chạy
2. Kiểm tra MONGODB_URI trong .env.local
3. Nếu dùng MongoDB Atlas, kiểm tra IP whitelist

### Lỗi: "Socket.IO connection failed"

**Giải pháp:**

1. Kiểm tra Socket.IO server đang chạy (terminal 1)
2. Kiểm tra NEXT_PUBLIC_SOCKET_URL trong .env.local
3. Kiểm tra browser console để xem lỗi chi tiết

### Lỗi: "File upload failed"

**Giải pháp:**

1. Kiểm tra MongoDB connection
2. Kiểm tra file size < 10MB
3. Kiểm tra số lượng files <= 10

### Port đã được sử dụng

**Giải pháp:**

```bash
# Thay đổi port trong socket-server/.env
PORT=5001

# Và update trong .env.local
SOCKET_SERVER_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

## Cấu Trúc Mới

```
project-root/
├── src/
│   ├── app/
│   │   └── api/              # ✅ API Routes (mới)
│   ├── components/           # ✅ Frontend components
│   └── lib/
│       ├── db/              # ✅ MongoDB connection (mới)
│       └── services/        # ✅ GridFS, Socket client (mới)
├── socket-server/           # ✅ Socket.IO server riêng (mới)
└── backend/                 # ❌ Đã xóa
```

## So Sánh Trước và Sau

### Trước Migration

```bash
# Terminal 1: Backend
cd backend
npm run dev  # Port 5000

# Terminal 2: Frontend
npm run dev  # Port 3000
```

### Sau Migration

```bash
# Terminal 1: Socket.IO Server
cd socket-server
npm run dev  # Port 5000

# Terminal 2: Next.js (Frontend + API)
npm run dev  # Port 3000
```

## Lợi Ích

1. ✅ **Deploy dễ dàng**: Chỉ cần deploy 2 services thay vì 3
2. ✅ **API Routes**: Tích hợp sẵn trong Next.js
3. ✅ **Type Safety**: Shared types giữa frontend và API
4. ✅ **Vercel Ready**: Sẵn sàng deploy lên Vercel
5. ✅ **Free Hosting**: Vercel + Railway/Render free tiers

## Tiếp Theo

- Đọc [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) để deploy lên production
- Đọc [README-MIGRATION.md](README-MIGRATION.md) để hiểu architecture chi tiết
- Đọc [README.md](README.md) để xem full documentation

## Cần Giúp Đỡ?

Nếu gặp vấn đề:

1. Kiểm tra logs trong terminal
2. Kiểm tra browser console
3. Đọc phần Troubleshooting ở trên
4. Tham khảo DEPLOYMENT-GUIDE.md
