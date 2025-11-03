# 💬 Real-time Chat Application

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Socket.io](https://img.shields.io/badge/Socket.io-4-green?style=for-the-badge&logo=socket.io)
![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=for-the-badge&logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-blue?style=for-the-badge&logo=tailwind-css)

**A modern, feature-rich real-time chat application built with Next.js and Socket.io**

[🚀 Live Demo](https://chat-app-three-theta-95.vercel.app) • [📖 Documentation](#documentation) • [🛠️ Installation](#installation)

</div>

---

## ✨ Features

### 🔥 Core Features

- **Real-time Messaging** - Instant message delivery with Socket.io
- **File Sharing** - Support for images, audio, and documents with GridFS
- **Image Preview** - Built-in image viewer with zoom functionality
- **Message Management** - Edit, delete, and react to messages
- **Typing Indicators** - See when others are typing
- **Online Users** - Real-time user presence tracking
- **Search Messages** - Find messages and users instantly

### 🎨 User Experience

- **Responsive Design** - Optimized for all devices
- **Dark/Light Mode** - Toggle between themes
- **Emoji Picker** - Express yourself with emojis
- **Smart Scrolling** - Auto-scroll to new messages
- **Message Formatting** - Preserve line breaks and spacing
- **URL Auto-linking** - Automatic link detection and formatting

### ⚡ Performance

- **Pagination** - Load messages incrementally (10 per page)
- **Optimized Rendering** - React.memo for message components
- **Lazy Loading** - Load older messages on scroll
- **Image Optimization** - Next.js Image component for better performance

---

## 🏗️ Architecture

This application uses a **hybrid architecture** optimized for Vercel deployment:

### Next.js Application (Vercel)

- **Frontend**: React components with TypeScript
- **API Routes**: RESTful endpoints for CRUD operations
- **Database**: MongoDB connection via Mongoose
- **File Storage**: GridFS for file uploads/downloads

### Socket.IO Server (Railway/Render)

- **Real-time Communication**: WebSocket connections
- **Online Users Tracking**: Track and broadcast online users
- **Typing Indicators**: Real-time typing status
- **Event Broadcasting**: Emit events for messages, edits, deletes, reactions

> **Why separate Socket.IO?** Vercel's serverless functions don't support WebSocket connections. By keeping Socket.IO as a separate service, we can deploy the main app to Vercel while maintaining real-time features.

### Project Structure

```
project-root/
├── src/
│   ├── app/
│   │   ├── api/              # Next.js API Routes
│   │   │   ├── messages/     # Message CRUD endpoints
│   │   │   ├── files/        # File download endpoint
│   │   │   └── online-users/ # Online users endpoint
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── components/           # React Components
│   │   ├── Chat.tsx         # Main chat container
│   │   ├── MessageList.tsx  # Message display with pagination
│   │   ├── MessageItem.tsx  # Individual message component
│   │   ├── ChatInput.tsx    # Message input with file upload
│   │   └── ...
│   ├── lib/
│   │   ├── db/              # MongoDB connection & models
│   │   │   ├── mongodb.ts
│   │   │   └── models/
│   │   │       └── Message.ts
│   │   └── services/        # Business logic
│   │       ├── gridfs.ts    # File storage service
│   │       └── socket-client.ts # Socket.IO client
│   └── types/               # TypeScript type definitions
├── socket-server/           # Separate Socket.IO server
│   ├── index.js
│   ├── package.json
│   └── .env
└── ...
```

---

## 🛠️ Tech Stack

### Frontend & API

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Framer Motion
- **Real-time Client**: Socket.io Client
- **State Management**: React Hooks

### Backend Services

- **API**: Next.js API Routes (serverless)
- **Database**: MongoDB with Mongoose
- **File Storage**: GridFS (MongoDB)
- **Real-time Server**: Socket.io (separate service)

### DevOps & Deployment

- **Frontend + API**: Vercel
- **Socket.IO Server**: Railway or Render
- **Database**: MongoDB Atlas
- **Package Manager**: npm

---

## 🚀 Installation

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/lehuuhlong/chat-app.git
cd chat-app
```

### 2. Install Dependencies

```bash
# Install Next.js dependencies
npm install

# Install Socket.IO server dependencies
cd socket-server
npm install
cd ..
```

### 3. Environment Variables

#### Next.js (.env.local)

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/chat-app

# Socket.IO Server Configuration
SOCKET_SERVER_URL=http://localhost:5000
SOCKET_SERVER_SECRET=dev-secret-key-change-in-production

# Public (Browser-accessible)
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

#### Socket.IO Server (socket-server/.env)

```env
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EMIT_SECRET=dev-secret-key-change-in-production
```

### 4. Run the Application

```bash
# Terminal 1 - Socket.IO Server
cd socket-server
npm run dev

# Terminal 2 - Next.js Application
cd ..
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## 📖 API Documentation

### REST API Endpoints

#### Messages

- `GET /api/messages?page=1&limit=10` - Get paginated messages
- `POST /api/messages` - Send new message with files (multipart/form-data)
- `PATCH /api/messages/:id` - Edit message text
- `DELETE /api/messages/:id` - Delete message and associated files
- `POST /api/messages/:id/react` - Toggle reaction on message

#### Files

- `GET /api/files/:id` - Download file from GridFS

#### Users

- `GET /api/online-users` - Get list of currently online users

### Socket.IO Events

#### Client → Server

- `userOnline` - User comes online
- `typing` - User starts typing
- `stopTyping` - User stops typing

#### Server → Client

- `message` - New message received
- `messageDeleted` - Message deleted
- `messageEdited` - Message edited
- `messageReacted` - Message reaction updated
- `onlineUsers` - Online users list updated
- `userTyping` - User is typing
- `userStoppedTyping` - User stopped typing

---

## 🚀 Deployment

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for detailed deployment instructions.

### Quick Start

1. **Deploy Socket.IO Server** to Railway or Render
2. **Deploy Next.js** to Vercel
3. **Configure Environment Variables** on both platforms
4. **Update CORS Origins** in Socket.IO server

### Free Tier Hosting

- **Vercel**: 100GB bandwidth/month, unlimited deployments
- **Railway**: $5 free credit/month (~500 hours)
- **Render**: 750 hours/month free
- **MongoDB Atlas**: 512MB storage free

**Total Monthly Cost: $0** (within free tiers)

---

## 🔧 Configuration

### File Upload Limits

- Maximum file size: 10MB per file
- Maximum files per message: 10
- Supported formats: All file types (images, audio, video, documents, etc.)

### Message Pagination

- Messages per page: 10
- Auto-load on scroll to top
- Smart scroll position preservation

### Real-time Features

- Typing timeout: 1 second
- Automatic reconnection on disconnect
- Online user tracking with Set data structure

---

## 📚 Additional Documentation

- [README-MIGRATION.md](README-MIGRATION.md) - Architecture and migration details
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) - Step-by-step deployment guide

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**LE HUU HOANG LONG**

- GitHub: [@lehuuhlong](https://github.com/lehuuhlong)
- LinkedIn: [LE HUU HOANG LONG](https://linkedin.com/in/lehuuhlong)
- Email: lehuuhlong@gmail.com

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Socket.io](https://socket.io/) for real-time communication
- [MongoDB](https://www.mongodb.com/) for the database
- [Tailwind CSS](https://tailwindcss.com/) for the styling
- [Vercel](https://vercel.com/) for hosting

---

<div align="center">

**Made with ❤️ and ☕**

If you found this project helpful, please give it a ⭐!

</div>
