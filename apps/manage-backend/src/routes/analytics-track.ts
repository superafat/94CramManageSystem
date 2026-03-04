import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db'
import { managePageViews, manageBotVisits } from '@94cram/shared/db'

const trackSchema = z.object({
  path: z.string().max(500),
  referrer: z.string().max(1000).optional(),
})

export const analyticsTrackRoutes = new Hono()

analyticsTrackRoutes.post('/analytics/track', zValidator('json', trackSchema), async (c) => {
  const { path, referrer } = c.req.valid('json')
  const ua = c.req.header('user-agent') || ''
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || ''

  // 非阻塞
  void (async () => {
    try {
      const botPatterns = [
        { p: /GPTBot/i, n: 'GPTBot', c: 'ai_crawler' },
        { p: /ChatGPT-User/i, n: 'ChatGPT-User', c: 'ai_crawler' },
        { p: /ClaudeBot/i, n: 'ClaudeBot', c: 'ai_crawler' },
        { p: /anthropic-ai/i, n: 'Anthropic', c: 'ai_crawler' },
        { p: /PerplexityBot/i, n: 'PerplexityBot', c: 'ai_crawler' },
        { p: /Googlebot/i, n: 'Googlebot', c: 'search_engine' },
        { p: /bingbot/i, n: 'Bingbot', c: 'search_engine' },
      ]
      let bot: { n: string; c: string } | null = null
      for (const b of botPatterns) { if (b.p.test(ua)) { bot = b; break } }
      const device = /mobile|android|iphone/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop'

      await db.insert(managePageViews).values({
        path, referrer: referrer || null, userAgent: ua, ipAddress: ip,
        deviceType: device, isBot: !!bot, botName: bot?.n || null,
      })
      if (bot) {
        await db.insert(manageBotVisits).values({
          botName: bot.n, botCategory: bot.c, path, userAgent: ua, ipAddress: ip,
          statusCode: 200, responseTimeMs: 0,
        })
      }
    } catch { /* ignore */ }
  })()

  return c.json({ ok: true })
})
