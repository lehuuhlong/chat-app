# 💬 Real-time Chat Application

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
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

### Frontend

```
src/
├── app/                 # Next.js App Router
├── components/          # React Components
│   ├── Chat.tsx        # Main chat container
│   ├── MessageList.tsx # Message display with pagination
│   ├── MessageItem.tsx # Individual message component
│   ├── ChatInput.tsx   # Message input with file upload
│   └── ...
├── types/              # TypeScript type definitions
└── lib/                # Utility functions
```

### Backend

```
backend/
├── config/             # Database configuration
├── models/             # MongoDB models
├── routes/             # API endpoints
├── services/           # Business logic
│   ├── socket.js      # Socket.io event handlers
│   └── gridfs.js      # File storage service
└── index.js           # Express server entry point
```

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Framer Motion
- **Real-time**: Socket.io Client
- **State Management**: React Hooks

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **File Storage**: GridFS (MongoDB)
- **Real-time**: Socket.io
- **File Upload**: Multer with GridFS Storage

### DevOps & Deployment

- **Frontend**: Vercel
- **Backend**: Railway/Heroku
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

### 2. Setup Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and other configs
```

### 3. Setup Frontend

```bash
cd ..
npm install

# Create .env.local file
cp .env.local.example .env.local
# Edit .env.local with your API URL
```

### 4. Environment Variables

#### Backend (.env)

```env
MONGODB_URI=mongodb://localhost:27017/chatapp
PORT=5000
NODE_ENV=development
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 5. Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd ..
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## 📖 Documentation

### API Endpoints

#### Messages

- `GET /api/messages` - Get messages with pagination
- `POST /api/messages` - Send new message with files
- `PATCH /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/react` - React to message

#### Files

- `GET /api/messages/files/:id` - Download file

#### Real-time Events

- `message` - New message received
- `messageDeleted` - Message deleted
- `messageEdited` - Message edited
- `messageReacted` - Message reaction added
- `typing` / `stopTyping` - Typing indicators
- `userOnline` / `userOffline` - User presence

### Components Usage

#### MessageList

```tsx
<MessageList
  messages={messages}
  username={username}
  onDelete={handleDelete}
  onLoadMore={handleLoadMore}
  hasMore={hasMore}
  isLoadingMore={isLoadingMore}
  API_URL={API_URL}
  search={search}
/>
```

#### ChatInput

```tsx
<ChatInput
  username={username}
  text={text}
  files={files}
  onTextChange={setText}
  onFilesChange={setFiles}
  onSubmit={handleSubmit}
  onTyping={handleTyping}
  onStopTyping={handleStopTyping}
/>
```

---

## 🔧 Configuration

### File Upload Limits

- Maximum file size: 16MB
- Supported formats: Images, Audio, Documents
- Multiple file upload supported

### Message Pagination

- Messages per page: 10
- Auto-load on scroll to top
- Smart scroll position preservation

### Real-time Features

- Typing timeout: 1 second
- Automatic reconnection on disconnect
- Online user tracking

---

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway/Heroku)

1. Create new project on Railway/Heroku
2. Connect GitHub repository
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)

1. Create MongoDB Atlas cluster
2. Get connection string
3. Update MONGODB_URI in environment variables

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
