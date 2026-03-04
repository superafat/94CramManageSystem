import { Hono } from 'hono'
import { sql, desc, eq, gte, and, count, countDistinct } from 'drizzle-orm'
import { db } from '../../db'
import { managePageViews, manageBotVisits } from '@94cram/shared/db'
import type { RBACVariables } from '../../middleware/rbac'
import { requireRole, Role } from '../../middleware/rbac'

export const analyticsRoutes = new Hono<{ Variables: RBACVariables }>()

// 所有 analytics 端點需要 superadmin 權限
analyticsRoutes.use('*', requireRole(Role.SUPERADMIN))

// GET /analytics/overview — 總覽
analyticsRoutes.get('/analytics/overview', async (c) => {
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

  return c.json({ success: true, data: {
    today: todayStats, week: weekStats, month: monthStats, dailyTrend
  }})
})

// GET /analytics/pages — 熱門頁面
analyticsRoutes.get('/analytics/pages', async (c) => {
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

  return c.json({ success: true, data: pages })
})

// GET /analytics/referrers — 來源
analyticsRoutes.get('/analytics/referrers', async (c) => {
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

  return c.json({ success: true, data: referrers })
})

// GET /analytics/bots — AI 爬蟲統計
analyticsRoutes.get('/analytics/bots', async (c) => {
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

  return c.json({ success: true, data: {
    bots: botStats,
    todayCount: todayTotal?.count || 0,
    monthCount: monthTotal?.count || 0,
    activeBots: botStats.length,
  }})
})

// GET /analytics/bots/logs — 爬蟲詳細日誌
analyticsRoutes.get('/analytics/bots/logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  const botName = c.req.query('botName')

  const logs = await db.select().from(manageBotVisits)
    .where(botName ? eq(manageBotVisits.botName, botName) : undefined)
    .orderBy(desc(manageBotVisits.createdAt))
    .limit(limit)
    .offset(offset)

  const [total] = await db.select({ count: count() }).from(manageBotVisits)
    .where(botName ? eq(manageBotVisits.botName, botName) : undefined)

  return c.json({ success: true, data: { logs, total: total?.count || 0, limit, offset }})
})
