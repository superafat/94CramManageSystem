/**
 * Platform Settings Routes — 平台設定
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET /        — 全域設定列表
 *   PUT /        — 更新設定
 *   GET /health  — 各 service 健康狀態
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, badRequest, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'
import { getRows } from './_helpers'

export const platformSettingsRoutes = new Hono<{ Variables: RBACVariables }>()

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const updateSettingSchema = z.object({
  key: z.string().min(1, { message: 'Key is required' }).max(100),
  value: z.unknown(),
})

// ─────────────────────────────────────────────
// GET / — 全域設定列表
// ─────────────────────────────────────────────
platformSettingsRoutes.get('/', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT id, key, value, updated_at
      FROM platform_settings
      ORDER BY key ASC
    `)

    return success(c, getRows(result))
  } catch (err) {
    logger.error({ err }, '[Platform Settings] GET / error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// PUT / — 更新設定（upsert）
// ─────────────────────────────────────────────
platformSettingsRoutes.put(
  '/',
  zValidator('json', updateSettingSchema),
  async (c) => {
    const { key, value } = c.req.valid('json')

    if (value === undefined) {
      return badRequest(c, 'Value is required')
    }

    try {
      const jsonStr = JSON.stringify(value)

      await db.execute(sql`
        INSERT INTO platform_settings (id, key, value, updated_at)
        VALUES (gen_random_uuid(), ${key}, ${jsonStr}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${jsonStr}::jsonb, updated_at = NOW()
      `)

      logger.info({ key }, '[Platform Settings] Setting updated')
      return success(c, { key, value, updated: true })
    } catch (err) {
      logger.error({ err, key }, '[Platform Settings] PUT / error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /health — 各 service 健康狀態
// ─────────────────────────────────────────────
platformSettingsRoutes.get('/health', async (c) => {
  const services: Array<{ name: string; status: string; latencyMs?: number; error?: string }> = []

  // 檢查 DB 連線
  const dbStart = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
    services.push({
      name: 'database',
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
    })
  } catch (err) {
    services.push({
      name: 'database',
      status: 'unhealthy',
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // 各 service 狀態（根據 Cloud Run service 列表）
  const cloudRunServices = [
    { name: 'manage-backend', port: 3100 },
    { name: 'manage-dashboard', port: 3200 },
    { name: 'inclass-backend', port: 3102 },
    { name: 'inclass-dashboard', port: 3201 },
    { name: 'stock-backend', port: 3101 },
    { name: 'stock-dashboard', port: 3000 },
    { name: 'portal', port: 3300 },
  ]

  for (const svc of cloudRunServices) {
    services.push({
      name: svc.name,
      status: 'registered',
    })
  }

  const overallStatus = services.every((s) => s.status !== 'unhealthy') ? 'healthy' : 'degraded'

  return success(c, {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  })
})
