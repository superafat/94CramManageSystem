/**
 * Platform Security Routes — 安全監控
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET    /failed-logins   — 全平台失敗登入紀錄
 *   GET    /blocked-ips     — 封鎖 IP 列表
 *   DELETE /blocked-ips/:ip — 解除封鎖
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, notFound, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'
import { getRows } from './_helpers'

export const platformSecurityRoutes = new Hono<{ Variables: RBACVariables }>()

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const failedLoginsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  days: z.coerce.number().int().positive().max(90).default(7),
})

const ipParamSchema = z.object({
  ip: z.string().min(1, { message: 'IP address is required' }),
})

// ─────────────────────────────────────────────
// GET /failed-logins — 全平台失敗登入紀錄
// ─────────────────────────────────────────────
platformSecurityRoutes.get(
  '/failed-logins',
  zValidator('query', failedLoginsQuerySchema),
  async (c) => {
    const { page, limit, days } = c.req.valid('query')
    const offset = (page - 1) * limit

    try {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const sinceStr = since.toISOString()

      // 總數
      const countResult = await db.execute(sql`
        SELECT COUNT(*)::text AS total
        FROM audit_logs
        WHERE action LIKE '%login_failed%'
          AND created_at >= ${sinceStr}
      `)
      const total = parseInt(getRows(countResult)[0]?.total as string ?? '0', 10)

      // 列表
      const result = await db.execute(sql`
        SELECT al.id, al.user_id, al.tenant_id, al.action, al.resource,
               al.details, al.ip_address, al.created_at,
               t.name AS tenant_name,
               u.name AS user_name, u.email AS user_email
        FROM audit_logs al
        LEFT JOIN tenants t ON t.id = al.tenant_id
        LEFT JOIN users u ON u.id = al.user_id
        WHERE al.action LIKE '%login_failed%'
          AND al.created_at >= ${sinceStr}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `)

      return success(c, {
        logs: getRows(result),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (err) {
      logger.error({ err }, '[Platform Security] GET /failed-logins error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /blocked-ips — 封鎖 IP 列表
// TODO: 目前系統沒有專門的 blocked_ips 表，先回傳空陣列
// ─────────────────────────────────────────────
platformSecurityRoutes.get('/blocked-ips', async (c) => {
  try {
    // TODO: 當建立 blocked_ips 表後，改為查詢實際資料
    return success(c, {
      blockedIps: [],
      message: 'IP blocking not yet implemented — no blocked_ips table',
    })
  } catch (err) {
    logger.error({ err }, '[Platform Security] GET /blocked-ips error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// DELETE /blocked-ips/:ip — 解除封鎖
// TODO: 目前系統沒有專門的 blocked_ips 表
// ─────────────────────────────────────────────
platformSecurityRoutes.delete(
  '/blocked-ips/:ip',
  zValidator('param', ipParamSchema),
  async (c) => {
    const { ip } = c.req.valid('param')

    try {
      // TODO: 當建立 blocked_ips 表後，實作解除封鎖邏輯
      logger.info({ ip }, '[Platform Security] Unblock IP requested (not yet implemented)')
      return notFound(c, 'Blocked IP')
    } catch (err) {
      logger.error({ err, ip }, '[Platform Security] DELETE /blocked-ips/:ip error')
      return internalError(c, err)
    }
  }
)
