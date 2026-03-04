import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app'
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/landing', '/login', '/register'], disallow: ['/dashboard/', '/api/'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
