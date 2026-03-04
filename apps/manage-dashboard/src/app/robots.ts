import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cram94-manage-dashboard-1015149159553.asia-east1.run.app'
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/landing', '/login', '/trial-signup', '/demo'], disallow: ['/dashboard/', '/api/', '/my-children/', '/headquarters/'] },
      { userAgent: 'GPTBot', allow: ['/', '/landing'] },
      { userAgent: 'ClaudeBot', allow: ['/', '/landing'] },
      { userAgent: 'PerplexityBot', allow: ['/', '/landing'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
