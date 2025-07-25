import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

// Parse API URL from environment variable
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

const remotePattern: RemotePattern = {
  protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
  hostname: apiUrl.hostname,
  port: apiUrl.port || '',
  pathname: '/api/messages/files/**',
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [remotePattern],
  },
};

export default nextConfig;
