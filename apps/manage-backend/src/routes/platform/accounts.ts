/**
 * Platform Accounts Routes — 帳號審核
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET    /              — 跨租戶帳號列表（支援 ?status, ?tenantId 篩選）
 *   POST   /:id/approve   — 通過帳號（設 is_active=true）
 *   POST   /:id/reject    — 駁回帳號（body: { reason }，設 deleted_at）
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, badRequest, notFound, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'

export const platformAccountsRoutes = new Hono<{ Variables: RBACVariables }>()

// Helper: normalise drizzle result rows
type AnyRow = Record<string, unknown>
function getRows(result: unknown): AnyRow[] {
  if (Array.isArray(result)) return result as AnyRow[]
  return ((result as { rows?: unknown[] })?.rows ?? []) as AnyRow[]
}

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  tenantId: z.string().uuid().optional(),
})

const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid account ID' }),
})

const rejectBodySchema = z.object({
  reason: z.string().min(1, { message: 'Reason is required' }).max(500),
})

// ─────────────────────────────────────────────
// GET / — 跨租戶帳號列表（支援 ?status, ?tenantId 篩選）
// ─────────────────────────────────────────────
platformAccountsRoutes.get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
    const { status, tenantId } = c.req.valid('query')

    try {
      const conditions: ReturnType<typeof sql>[] = []

      // status 篩選
      if (status === 'pending') {
        conditions.push(sql`u.is_active = false AND u.deleted_at IS NULL`)
      } else if (status === 'approved') {
        conditions.push(sql`u.is_active = true AND u.deleted_at IS NULL`)
      } else if (status === 'rejected') {
        conditions.push(sql`u.deleted_at IS NOT NULL`)
      } else {
        // 無 status 篩選 — 所有未軟刪除帳號
        conditions.push(sql`u.deleted_at IS NULL`)
      }

      // tenantId 篩選
      if (tenantId) {
        conditions.push(sql`u.tenant_id = ${tenantId}`)
      }

      const whereClause = sql.join(conditions, sql` AND `)

      const result = await db.execute(sql`
        SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
               t.name AS tenant_name, b.name AS branch_name
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE ${whereClause}
        ORDER BY u.created_at DESC
      `)

      return success(c, getRows(result))
    } catch (err) {
      logger.error({ err }, '[Platform Accounts] GET / error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:id/approve — 通過帳號
// ─────────────────────────────────────────────
platformAccountsRoutes.post(
  '/:id/approve',
  zValidator('param', uuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const result = await db.execute(sql`
        UPDATE users
        SET is_active = true, updated_at = NOW()
        WHERE id = ${id}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Account')
      }

      logger.info({ accountId: id }, '[Platform Accounts] Account approved')
      return success(c, { id, approved: true })
    } catch (err) {
      logger.error({ err, accountId: id }, '[Platform Accounts] POST /:id/approve error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:id/reject — 駁回帳號
// ─────────────────────────────────────────────
platformAccountsRoutes.post(
  '/:id/reject',
  zValidator('param', uuidParamSchema),
  zValidator('json', rejectBodySchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const { reason } = c.req.valid('json')

    try {
      const result = await db.execute(sql`
        UPDATE users
        SET is_active = false,
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Account')
      }

      logger.info({ accountId: id, reason }, '[Platform Accounts] Account rejected')
      return success(c, { id, rejected: true, reason })
    } catch (err) {
      logger.error({ err, accountId: id }, '[Platform Accounts] POST /:id/reject error')
      return internalError(c, err)
    }
  }
)
