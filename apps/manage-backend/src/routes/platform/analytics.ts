/**
 * Platform Analytics Routes — 數據分析
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET /overview   — 今日/本週/本月 PV+UV + 30 天趨勢
 *   GET /pages      — 頁面排行 Top 20
 *   GET /referrers  — 流量來源 Top 10
 *   GET /bots       — 爬蟲統計
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { sql, desc, eq, gte, and, count, countDistinct } from 'drizzle-orm'
import { db } from '../../db'
import { managePageViews, manageBotVisits } from '@94cram/shared/db'
import { success, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'

export const platformAnalyticsRoutes = new Hono<{ Variables: RBACVariables }>()

// ─────────────────────────────────────────────
// Shared schema
// ─────────────────────────────────────────────

const daysQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
})

// ─────────────────────────────────────────────
// GET /overview — 今日/本週/本月 PV+UV + 30 天趨勢
// ─────────────────────────────────────────────
platformAnalyticsRoutes.get('/overview', async (c) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(todayStart)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [todayStats, weekStats, monthStats, dailyTrend] = await Promise.all([
      db.select({
        pv: count(),
        uv: countDistinct(managePageViews.ipAddress),
      }).from(managePageViews).where(
        and(gte(managePageViews.createdAt, todayStart), eq(managePageViews.isBot, false))
      ).then((r) => r[0]),

      db.select({
        pv: count(),
        uv: countDistinct(managePageViews.ipAddress),
      }).from(managePageViews).where(
        and(gte(managePageViews.createdAt, weekStart), eq(managePageViews.isBot, false))
      ).then((r) => r[0]),

      db.select({
        pv: count(),
        uv: countDistinct(managePageViews.ipAddress),
      }).from(managePageViews).where(
        and(gte(managePageViews.createdAt, monthStart), eq(managePageViews.isBot, false))
      ).then((r) => r[0]),

      // 過去 30 天每日趨勢
      db.select({
        date: sql<string>`DATE(${managePageViews.createdAt})`.as('date'),
        pv: count(),
        uv: countDistinct(managePageViews.ipAddress),
      }).from(managePageViews).where(
        and(gte(managePageViews.createdAt, thirtyDaysAgo), eq(managePageViews.isBot, false))
      ).groupBy(sql`DATE(${managePageViews.createdAt})`).orderBy(sql`DATE(${managePageViews.createdAt})`),
    ])

    return success(c, {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      dailyTrend,
    })
  } catch (err) {
    logger.error({ err }, '[Platform Analytics] GET /overview error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// GET /pages — 頁面排行 Top 20
// ─────────────────────────────────────────────
platformAnalyticsRoutes.get(
  '/pages',
  zValidator('query', daysQuerySchema),
  async (c) => {
    try {
      const { days } = c.req.valid('query')
      const since = new Date()
      since.setDate(since.getDate() - days)

      const pages = await db.select({
        path: managePageViews.path,
        pv: count(),
        uv: countDistinct(managePageViews.ipAddress),
      }).from(managePageViews).where(
        and(gte(managePageViews.createdAt, since), eq(managePageViews.isBot, false))
      ).groupBy(managePageViews.path).orderBy(desc(count())).limit(20)

      return success(c, pages)
    } catch (err) {
      logger.error({ err }, '[Platform Analytics] GET /pages error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /referrers — 流量來源 Top 10
// ─────────────────────────────────────────────
platformAnalyticsRoutes.get(
  '/referrers',
  zValidator('query', daysQuerySchema),
  async (c) => {
    try {
      const { days } = c.req.valid('query')
      const since = new Date()
      since.setDate(since.getDate() - days)

      const referrers = await db.select({
        referrer: managePageViews.referrer,
        count: count(),
      }).from(managePageViews).where(
        and(
          gte(managePageViews.createdAt, since),
          eq(managePageViews.isBot, false),
          sql`${managePageViews.referrer} IS NOT NULL`
        )
      ).groupBy(managePageViews.referrer).orderBy(desc(count())).limit(10)

      return success(c, referrers)
    } catch (err) {
      logger.error({ err }, '[Platform Analytics] GET /referrers error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /bots — 爬蟲統計
// ─────────────────────────────────────────────
platformAnalyticsRoutes.get(
  '/bots',
  zValidator('query', daysQuerySchema),
  async (c) => {
    try {
      const { days } = c.req.valid('query')
      const since = new Date()
      since.setDate(since.getDate() - days)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const [botStats, todayTotal, monthTotal] = await Promise.all([
        db.select({
          botName: manageBotVisits.botName,
          botCategory: manageBotVisits.botCategory,
          totalVisits: count(),
        }).from(manageBotVisits).where(
          gte(manageBotVisits.createdAt, since)
        ).groupBy(manageBotVisits.botName, manageBotVisits.botCategory).orderBy(desc(count())),

        db.select({ count: count() }).from(manageBotVisits).where(gte(manageBotVisits.createdAt, todayStart)).then((r) => r[0]),

        db.select({ count: count() }).from(manageBotVisits).where(gte(manageBotVisits.createdAt, monthStart)).then((r) => r[0]),
      ])

      return success(c, {
        bots: botStats,
        todayCount: todayTotal?.count || 0,
        monthCount: monthTotal?.count || 0,
        activeBots: botStats.length,
      })
    } catch (err) {
      logger.error({ err }, '[Platform Analytics] GET /bots error')
      return internalError(c, err)
    }
  }
)
