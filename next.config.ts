import type { NextConfig } from 'next';

// Attachments are served from this app's own /api/files route, so next/image needs no remotePatterns.
// (The old pattern pointed at the previous Express backend: /api/messages/files/**.)
const nextConfig: NextConfig = {};

export default nextConfig;
