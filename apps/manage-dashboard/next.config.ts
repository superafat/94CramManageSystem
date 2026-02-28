import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // API proxy to backend — destination resolved at RUNTIME
  async rewrites() {
    const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '1015149159553'
    const BACKEND_URL = process.env.BACKEND_URL || `https://cram94-manage-backend-${GCP_PROJECT_NUMBER}.asia-east1.run.app`
    return [
      {
        source: '/health',
        destination: `${BACKEND_URL}/health`,
      },
    ]
  },
}

export default nextConfig
