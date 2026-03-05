import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '1015149159553'
    const BACKEND_URL = process.env.BACKEND_URL || `https://cram94-inclass-backend-${GCP_PROJECT_NUMBER}.asia-east1.run.app`
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
