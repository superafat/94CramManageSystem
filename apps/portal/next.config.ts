import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/platform/:path*',
        destination: `${process.env.MANAGE_BACKEND_URL || 'http://localhost:3100'}/api/platform/:path*`,
      },
    ]
  },
};

export default nextConfig;
