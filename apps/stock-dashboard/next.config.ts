import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const BACKEND_URL = process.env.BACKEND_URL || 'https://cram94-stock-backend-1015149159553.asia-east1.run.app'
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${BACKEND_URL}/health`,
      },
    ]
  },
};

export default nextConfig;
