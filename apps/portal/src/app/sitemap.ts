import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: 'https://94cram.com', lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: 'https://manage.94cram.com', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://inclass.94cram.com', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://stock.94cram.com', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://bot.94cram.com', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ]
}
