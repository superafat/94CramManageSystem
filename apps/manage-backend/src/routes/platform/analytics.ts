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
import { sql, desc, eq, gte, and, count, countDistinct } from 'drizzle-orm'
import { db } from '../../db'
import { managePageViews, manageBotVisits } from '@94cram/shared/db'
import { success, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'

export const platformAnalyticsRoutes = new Hono<{ Variables: RBACVariables }>()

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

    const [todayStats] = await db.select({
      pv: count(),
      uv: countDistinct(managePageViews.ipAddress),
    }).from(managePageViews).where(
      and(gte(managePageViews.createdAt, todayStart), eq(managePageViews.isBot, false))
    )

    const [weekStats] = await db.select({
      pv: count(),
      uv: countDistinct(managePageViews.ipAddress),
    }).from(managePageViews).where(
      and(gte(managePageViews.createdAt, weekStart), eq(managePageViews.isBot, false))
    )

    const [monthStats] = await db.select({
      pv: count(),
      uv: countDistinct(managePageViews.ipAddress),
    }).from(managePageViews).where(
      and(gte(managePageViews.createdAt, monthStart), eq(managePageViews.isBot, false))
    )

    // 過去 30 天每日趨勢
    const thirtyDaysAgo = new Date(todayStart)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dailyTrend = await db.select({
      date: sql<string>`DATE(${managePageViews.createdAt})`.as('date'),
      pv: count(),
      uv: countDistinct(managePageViews.ipAddress),
    }).from(managePageViews).where(
      and(gte(managePageViews.createdAt, thirtyDaysAgo), eq(managePageViews.isBot, false))
    ).groupBy(sql`DATE(${managePageViews.createdAt})`).orderBy(sql`DATE(${managePageViews.createdAt})`)

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
platformAnalyticsRoutes.get('/pages', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30')
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
})

// ─────────────────────────────────────────────
// GET /referrers — 流量來源 Top 10
// ─────────────────────────────────────────────
platformAnalyticsRoutes.get('/referrers', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30')
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
})

// ─────────────────────────────────────────────
// GET /bots — 爬蟲統計
// ─────────────────────────────────────────────
platformAnalyticsRoutes.get('/bots', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30')
    const since = new Date()
    since.setDate(since.getDate() - days)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const botStats = await db.select({
      botName: manageBotVisits.botName,
      botCategory: manageBotVisits.botCategory,
      totalVisits: count(),
    }).from(manageBotVisits).where(
      gte(manageBotVisits.createdAt, since)
    ).groupBy(manageBotVisits.botName, manageBotVisits.botCategory).orderBy(desc(count()))

    const [todayTotal] = await db.select({ count: count() }).from(manageBotVisits).where(gte(manageBotVisits.createdAt, todayStart))
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const [monthTotal] = await db.select({ count: count() }).from(manageBotVisits).where(gte(manageBotVisits.createdAt, monthStart))

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
})
