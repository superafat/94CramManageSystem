/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3102'
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
