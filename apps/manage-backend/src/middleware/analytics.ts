import { db } from '../db'
import { managePageViews, manageBotVisits } from '@94cram/shared/db'
import { logger } from '../utils/logger'

// 已知 Bot UA patterns
const BOT_PATTERNS: { pattern: RegExp; name: string; category: string }[] = [
  // AI Crawlers
  { pattern: /GPTBot/i, name: 'GPTBot', category: 'ai_crawler' },
  { pattern: /ChatGPT-User/i, name: 'ChatGPT-User', category: 'ai_crawler' },
  { pattern: /ClaudeBot/i, name: 'ClaudeBot', category: 'ai_crawler' },
  { pattern: /anthropic-ai/i, name: 'Anthropic', category: 'ai_crawler' },
  { pattern: /PerplexityBot/i, name: 'PerplexityBot', category: 'ai_crawler' },
  { pattern: /Bytespider/i, name: 'Bytespider', category: 'ai_crawler' },
  { pattern: /CCBot/i, name: 'CCBot', category: 'ai_crawler' },
  { pattern: /Google-Extended/i, name: 'Google-Extended', category: 'ai_crawler' },
  { pattern: /cohere-ai/i, name: 'Cohere', category: 'ai_crawler' },
  // Search Engines
  { pattern: /Googlebot/i, name: 'Googlebot', category: 'search_engine' },
  { pattern: /bingbot/i, name: 'Bingbot', category: 'search_engine' },
  { pattern: /YandexBot/i, name: 'YandexBot', category: 'search_engine' },
  { pattern: /DuckDuckBot/i, name: 'DuckDuckBot', category: 'search_engine' },
  { pattern: /Baiduspider/i, name: 'Baiduspider', category: 'search_engine' },
  // Social
  { pattern: /facebookexternalhit/i, name: 'Facebook', category: 'social' },
  { pattern: /Twitterbot/i, name: 'Twitter', category: 'social' },
  { pattern: /LinkedInBot/i, name: 'LinkedIn', category: 'social' },
  // Monitoring
  { pattern: /UptimeRobot/i, name: 'UptimeRobot', category: 'monitoring' },
  { pattern: /pingdom/i, name: 'Pingdom', category: 'monitoring' },
]

function detectBot(ua: string): { name: string; category: string } | null {
  for (const { pattern, name, category } of BOT_PATTERNS) {
    if (pattern.test(ua)) return { name, category }
  }
  // Generic bot detection
  if (/bot|crawler|spider|scraper|fetch/i.test(ua)) {
    return { name: 'Unknown Bot', category: 'other' }
  }
  return null
}

function detectDevice(ua: string): string {
  if (/mobile|android|iphone/i.test(ua)) return 'mobile'
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  return 'desktop'
}

// Hono middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function analyticsMiddleware() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (c: any, next: any) => {
    const path = new URL(c.req.url).pathname

    // 排除 API 和 health 路徑
    if (path.startsWith('/api/') || path === '/health') {
      return next()
    }

    const startTime = Date.now()
    await next()
    const responseTime = Date.now() - startTime

    // Fire-and-forget: 非阻塞寫入 DB
    const ua = c.req.header('user-agent') || ''
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || ''
    const referrer = c.req.header('referer') || null
    const bot = detectBot(ua)

    void (async () => {
      try {
        // 寫入 page_views
        await db.insert(managePageViews).values({
          path,
          referrer,
          userAgent: ua,
          ipAddress: ip,
          deviceType: detectDevice(ua),
          isBot: !!bot,
          botName: bot?.name || null,
        })

        // Bot 額外記錄
        if (bot) {
          await db.insert(manageBotVisits).values({
            botName: bot.name,
            botCategory: bot.category,
            path,
            userAgent: ua,
            ipAddress: ip,
            statusCode: c.res.status,
            responseTimeMs: responseTime,
          })
        }
      } catch (err) {
        logger.warn({ err }, '[Analytics] Failed to record page view')
      }
    })()
  }
}
