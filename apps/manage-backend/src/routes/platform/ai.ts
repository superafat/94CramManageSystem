/**
 * Platform AI Routes — AI 與 Bot 管理
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET  /providers                — AI 供應商狀態
 *   GET  /usage                    — 全平台 AI 用量彙總
 *   GET  /usage/:tenantId          — 單一租戶用量
 *   POST /quota/limits             — 設定速率/成本限制
 *   GET  /subscriptions            — 全部租戶 Bot 訂閱列表
 *   PUT  /subscriptions/:tenantId  — 修改租戶方案與配額
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { providerFactory, quotaManager } from '../../ai/providers'
import { success, notFound, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'

export const platformAiRoutes = new Hono<{ Variables: RBACVariables }>()

// Helper: normalise drizzle result rows
type AnyRow = Record<string, unknown>
function getRows(result: unknown): AnyRow[] {
  if (Array.isArray(result)) return result as AnyRow[]
  return ((result as { rows?: unknown[] })?.rows ?? []) as AnyRow[]
}

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const tenantIdParamSchema = z.object({
  tenantId: z.string().uuid({ message: 'Invalid tenant ID' }),
})

const quotaLimitSchema = z.object({
  provider: z.enum(['gemini', 'claude', 'minimax']),
  requestsPerMinute: z.number().min(1).optional(),
  requestsPerDay: z.number().min(1).optional(),
  costPerDay: z.number().min(0).optional(),
})

const updateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']),
  aiQuota: z.number().int().nonnegative().optional(),
  botEnabled: z.boolean().optional(),
})

// ─────────────────────────────────────────────
// GET /providers — AI 供應商狀態
// ─────────────────────────────────────────────
platformAiRoutes.get('/providers', async (c) => {
  try {
    const status = await providerFactory.getProvidersStatus()
    const availableProviders = providerFactory.getAvailableProviders()

    return success(c, {
      providers: status,
      available: availableProviders,
    })
  } catch (err) {
    logger.error({ err }, '[Platform AI] GET /providers error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// GET /usage — 全平台 AI 用量彙總
// ─────────────────────────────────────────────
platformAiRoutes.get('/usage', async (c) => {
  try {
    const allStats = quotaManager.getAllStats()
    const totalCost24h = quotaManager.getTotalCost(24)
    const totalCost7d = quotaManager.getTotalCost(168)

    return success(c, {
      stats: allStats,
      totalCost: {
        last24Hours: totalCost24h,
        last7Days: totalCost7d,
      },
    })
  } catch (err) {
    logger.error({ err }, '[Platform AI] GET /usage error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// GET /usage/:tenantId — 單一租戶用量
// ─────────────────────────────────────────────
platformAiRoutes.get(
  '/usage/:tenantId',
  zValidator('param', tenantIdParamSchema),
  async (c) => {
    const { tenantId } = c.req.valid('param')

    try {
      // 確認租戶存在
      const tenantResult = await db.execute(sql`
        SELECT id, name, plan, settings FROM tenants
        WHERE id = ${tenantId} AND deleted_at IS NULL
      `)
      const tenantRows = getRows(tenantResult)
      if (tenantRows.length === 0) {
        return notFound(c, 'Tenant')
      }

      const tenant = tenantRows[0]!
      const settings = (tenant.settings ?? {}) as Record<string, unknown>

      return success(c, {
        tenantId,
        tenantName: tenant.name,
        plan: tenant.plan,
        aiUsage: settings.ai_usage ?? 0,
        conversationCount: settings.conversation_count ?? 0,
        aiQuota: settings.ai_quota ?? null,
      })
    } catch (err) {
      logger.error({ err, tenantId }, '[Platform AI] GET /usage/:tenantId error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /quota/limits — 設定速率/成本限制
// ─────────────────────────────────────────────
platformAiRoutes.post(
  '/quota/limits',
  zValidator('json', quotaLimitSchema),
  async (c) => {
    const { provider, ...limits } = c.req.valid('json')

    try {
      quotaManager.setLimit(provider, limits)

      return success(c, {
        message: 'Quota limits updated',
        provider,
        limits: quotaManager.getStats(provider).limits,
      })
    } catch (err) {
      logger.error({ err, provider }, '[Platform AI] POST /quota/limits error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /subscriptions — 全部租戶 Bot 訂閱列表
// ─────────────────────────────────────────────
platformAiRoutes.get('/subscriptions', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT id, name, plan, status, settings,
             (settings->>'ai_usage')::int AS ai_usage,
             (settings->>'ai_quota')::int AS ai_quota,
             (settings->>'bot_enabled') AS bot_enabled
      FROM tenants
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `)

    return success(c, getRows(result))
  } catch (err) {
    logger.error({ err }, '[Platform AI] GET /subscriptions error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// PUT /subscriptions/:tenantId — 修改租戶方案與配額
// ─────────────────────────────────────────────
platformAiRoutes.put(
  '/subscriptions/:tenantId',
  zValidator('param', tenantIdParamSchema),
  zValidator('json', updateSubscriptionSchema),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { plan, aiQuota, botEnabled } = c.req.valid('json')

    try {
      // 更新 plan
      const setClauses: ReturnType<typeof sql>[] = [
        sql`plan = ${plan}`,
        sql`updated_at = NOW()`,
      ]

      // 更新 settings 中的 ai_quota 和 bot_enabled
      if (aiQuota !== undefined) {
        setClauses.push(sql`settings = jsonb_set(COALESCE(settings, '{}'), '{ai_quota}', ${String(aiQuota)}::jsonb)`)
      }
      if (botEnabled !== undefined) {
        setClauses.push(sql`settings = jsonb_set(COALESCE(settings, '{}'), '{bot_enabled}', ${String(botEnabled)}::jsonb)`)
      }

      const setClause = sql.join(setClauses, sql`, `)

      const result = await db.execute(sql`
        UPDATE tenants
        SET ${setClause}
        WHERE id = ${tenantId} AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId, plan, aiQuota, botEnabled }, '[Platform AI] Subscription updated')
      return success(c, { tenantId, plan, aiQuota: aiQuota ?? null, botEnabled: botEnabled ?? null, updated: true })
    } catch (err) {
      logger.error({ err, tenantId }, '[Platform AI] PUT /subscriptions/:tenantId error')
      return internalError(c, err)
    }
  }
)
