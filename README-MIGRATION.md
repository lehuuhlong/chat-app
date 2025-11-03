# Backend Migration to Next.js

This document describes the migration of the Express backend into Next.js for simplified deployment.

## Architecture Overview

The application now uses a **hybrid architecture**:

### Next.js Application (Vercel)

- **Frontend**: React components
- **REST API**: All CRUD operations for messages, files, reactions
- **Database**: MongoDB connection via Mongoose
- **File Storage**: GridFS for file uploads/downloads

### Socket.IO Server (Railway/Render)

- **Real-time Communication**: WebSocket connections
- **Online Users Tracking**: Track and broadcast online users
- **Typing Indicators**: Real-time typing status
- **Event Broadcasting**: Emit events for new messages, edits, deletes, reactions

## Why Separate Socket.IO Server?

Vercel's serverless functions don't support WebSocket connections. To maintain real-time features while deploying to Vercel, we keep Socket.IO as a separate service that can be deployed to platforms like Railway or Render (both offer free tiers).

## Environment Variables

### Next.js (.env.local)

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Socket.IO Server Configuration
SOCKET_SERVER_URL=https://your-socket-server.railway.app
SOCKET_SERVER_SECRET=your-secret-key-here

# Public (Browser-accessible)
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.railway.app
```

### Socket.IO Server (socket-server/.env)

```env
PORT=5000
ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app,http://localhost:3000
EMIT_SECRET=your-secret-key-here
```

## API Routes

All API routes are now in `src/app/api/`:

- `GET /api/messages` - Fetch paginated messages
- `POST /api/messages` - Create new message with file uploads
- `PATCH /api/messages/[id]` - Edit message text
- `DELETE /api/messages/[id]` - Delete message and files
- `POST /api/messages/[id]/react` - Toggle reaction
- `GET /api/files/[id]` - Download file from GridFS
- `GET /api/online-users` - Get list of online users

## Deployment

### 1. Deploy Socket.IO Server

**Railway:**

1. Create new project on Railway
2. Connect your GitHub repository
3. Set root directory to `socket-server`
4. Add environment variables:
   - `PORT=5000`
   - `ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app,http://localhost:3000`
   - `EMIT_SECRET=your-secret-key`
5. Deploy

**Render:**

1. Create new Web Service
2. Connect your GitHub repository
3. Set root directory to `socket-server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables (same as Railway)

### 2. Deploy Next.js to Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables:
   - `MONGODB_URI` - Your MongoDB connection string
   - `SOCKET_SERVER_URL` - Your Socket.IO server URL (e.g., https://your-app.railway.app)
   - `SOCKET_SERVER_SECRET` - Same secret as Socket.IO server
   - `NEXT_PUBLIC_SOCKET_URL` - Same as SOCKET_SERVER_URL (for browser)
3. Deploy

### 3. Update CORS Origins

After deployment, update Socket.IO server's `ALLOWED_ORIGINS` to include your Vercel deployment URL.

## Local Development

### 1. Start Socket.IO Server

```bash
cd socket-server
npm install
npm run dev
```

### 2. Start Next.js

```bash
npm install
npm run dev
```

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and update with your MongoDB URI.

## File Structure

```
project-root/
├── src/
│   ├── app/
│   │   ├── api/              # Next.js API routes
│   │   │   ├── messages/
│   │   │   ├── files/
│   │   │   └── online-users/
│   │   └── ...
│   ├── components/           # React components
│   ├── lib/
│   │   ├── db/              # MongoDB connection & models
│   │   └── services/        # GridFS, Socket.IO client
│   └── types/
├── socket-server/           # Separate Socket.IO server
│   ├── index.js
│   ├── package.json
│   └── .env
└── ...
```

## Migration Benefits

1. **Simplified Deployment**: Single Vercel deployment for frontend + API
2. **Better Performance**: API routes run in same environment as frontend
3. **Type Safety**: Shared TypeScript types between frontend and API
4. **Cost Effective**: Vercel free tier + Railway/Render free tier
5. **Scalability**: Serverless functions scale automatically

## Troubleshooting

### Socket.IO Connection Issues

- Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
- Check Socket.IO server logs for CORS errors
- Ensure `ALLOWED_ORIGINS` includes your frontend URL

### File Upload Issues

- Check MongoDB connection
- Verify GridFS bucket is accessible
- Check file size limits (10MB per file, max 10 files)

### Database Connection Issues

- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (allow all: 0.0.0.0/0)
- Ensure database user has read/write permissions
