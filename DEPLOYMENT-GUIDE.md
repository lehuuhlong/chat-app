# Deployment Guide

This guide will walk you through deploying your chat application with the new architecture.

## Prerequisites

- MongoDB Atlas account (free tier available)
- Vercel account (free tier available)
- Railway or Render account (free tier available)
- GitHub repository

## Step 1: Prepare MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with read/write permissions
4. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/database`)
5. **Important**: In Network Access, add `0.0.0.0/0` to allow connections from anywhere (or add specific IPs for Vercel and Railway/Render)

## Step 2: Deploy Socket.IO Server

### Option A: Railway (Recommended)

1. Go to [Railway](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Click "Add variables" and add:
   ```
   PORT=5000
   ALLOWED_ORIGINS=http://localhost:3000
   EMIT_SECRET=your-random-secret-key-here
   ```
5. In Settings:
   - Set "Root Directory" to `socket-server`
   - Set "Start Command" to `npm start`
6. Click "Deploy"
7. Copy your Railway app URL (e.g., `https://your-app.up.railway.app`)

### Option B: Render

1. Go to [Render](https://render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: socket-server
   - **Root Directory**: `socket-server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables:
   ```
   PORT=5000
   ALLOWED_ORIGINS=http://localhost:3000
   EMIT_SECRET=your-random-secret-key-here
   ```
6. Click "Create Web Service"
7. Copy your Render app URL (e.g., `https://your-app.onrender.com`)

## Step 3: Deploy Next.js to Vercel

1. Go to [Vercel](https://vercel.com/)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `.` (leave as root)
5. Add environment variables:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   SOCKET_SERVER_URL=https://your-socket-server-url
   SOCKET_SERVER_SECRET=same-secret-as-socket-server
   NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-url
   ```
6. Click "Deploy"
7. Wait for deployment to complete
8. Copy your Vercel app URL (e.g., `https://your-app.vercel.app`)

## Step 4: Update CORS Configuration

After getting your Vercel URL, you need to update Socket.IO server's CORS configuration:

### Railway:

1. Go to your Socket.IO project on Railway
2. Click "Variables"
3. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
   ```
4. Save and redeploy

### Render:

1. Go to your Socket.IO service on Render
2. Click "Environment"
3. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
   ```
4. Save (will auto-redeploy)

## Step 5: Verify Deployment

1. Open your Vercel app URL in a browser
2. Check browser console for any errors
3. Try sending a message
4. Open another browser/incognito window and verify:
   - Real-time message updates work
   - Online users list updates
   - Typing indicators work
5. Test file uploads (images, documents, etc.)
6. Test reactions
7. Test message editing and deletion

## Troubleshooting

### Socket.IO Connection Failed

**Symptoms**: Messages don't appear in real-time, online users not updating

**Solutions**:

1. Check browser console for WebSocket errors
2. Verify `NEXT_PUBLIC_SOCKET_URL` in Vercel matches your Socket.IO server URL
3. Check Socket.IO server logs for CORS errors
4. Ensure `ALLOWED_ORIGINS` includes your Vercel URL
5. Try accessing Socket.IO server URL directly (should show status page)

### File Upload Errors

**Symptoms**: "Error uploading file" or files not appearing

**Solutions**:

1. Check MongoDB connection string is correct
2. Verify MongoDB user has read/write permissions
3. Check MongoDB Atlas Network Access allows connections
4. Check Vercel function logs for errors
5. Verify file size is under 10MB

### Database Connection Errors

**Symptoms**: "Error fetching messages" or empty message list

**Solutions**:

1. Verify `MONGODB_URI` is correct in Vercel
2. Check MongoDB Atlas IP whitelist
3. Test connection string locally first
4. Check Vercel function logs

### Messages Not Emitting to Socket.IO

**Symptoms**: Messages save but don't appear in real-time

**Solutions**:

1. Verify `SOCKET_SERVER_SECRET` matches in both Vercel and Socket.IO server
2. Check Socket.IO server logs for authentication errors
3. Verify `SOCKET_SERVER_URL` is correct in Vercel

## Environment Variables Checklist

### Vercel (Next.js)

- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `SOCKET_SERVER_URL` - Socket.IO server URL (https://...)
- [ ] `SOCKET_SERVER_SECRET` - Secret key for Socket.IO authentication
- [ ] `NEXT_PUBLIC_SOCKET_URL` - Socket.IO server URL for browser

### Railway/Render (Socket.IO Server)

- [ ] `PORT` - 5000
- [ ] `ALLOWED_ORIGINS` - Comma-separated list of allowed origins
- [ ] `EMIT_SECRET` - Same as SOCKET_SERVER_SECRET

## Cost Estimation

### Free Tier Limits

**Vercel**:

- 100GB bandwidth/month
- 100 hours serverless function execution/month
- Unlimited deployments

**Railway**:

- $5 free credit/month
- ~500 hours of uptime (if using minimal resources)

**Render**:

- 750 hours/month free (enough for 1 service running 24/7)
- Spins down after 15 minutes of inactivity (free tier)

**MongoDB Atlas**:

- 512MB storage
- Shared cluster
- No credit card required

### Estimated Monthly Cost: $0 (within free tiers)

## Scaling Considerations

When you outgrow free tiers:

1. **Vercel Pro** ($20/month):

   - 1TB bandwidth
   - Unlimited serverless function execution
   - Better performance

2. **Railway** (Pay as you go):

   - $5 free credit/month
   - ~$5-10/month for small Socket.IO server

3. **MongoDB Atlas** (Shared tier $9/month):
   - 2GB-5GB storage
   - Better performance

## Next Steps

1. Set up custom domain (optional)
2. Configure SSL certificates (automatic on Vercel/Railway/Render)
3. Set up monitoring and logging
4. Configure backup strategy for MongoDB
5. Implement rate limiting for API routes
6. Add authentication (if needed)

## Support

If you encounter issues:

1. Check Vercel function logs
2. Check Socket.IO server logs (Railway/Render)
3. Check MongoDB Atlas logs
4. Review browser console errors
5. Refer to README-MIGRATION.md for architecture details
