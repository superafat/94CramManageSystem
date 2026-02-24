import type { NextConfig } from 'next'

// NOTE: Next.js rewrites are evaluated at BUILD TIME for static config,
// but when using a function, they are called at runtime on the server.
// We use env var at runtime so Cloud Run BACKEND_URL takes effect.

const nextConfig: NextConfig = {
  output: 'standalone',
  // API proxy to backend — destination resolved at RUNTIME
  async rewrites() {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3100'
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
}

export default nextConfig
