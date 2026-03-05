/**
 * Platform Trials Routes — 試用管理
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET    /                    — 試用列表（trial_status != 'none'，支援 ?status 篩選）
 *   GET    /:tenantId           — 試用詳情（tenant 基本資訊 + trial 欄位 + 統計）
 *   POST   /:tenantId/approve   — 通過試用（設 trial_status='approved', plan='pro', trial_end_at=NOW()+30天）
 *   POST   /:tenantId/reject    — 駁回（body: { notes }，設 trial_status='rejected'）
 *   POST   /:tenantId/revoke    — 撤銷（設 trial_status='expired', plan='free'）
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, notFound, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'

export const platformTrialsRoutes = new Hono<{ Variables: RBACVariables }>()

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
  status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional(),
})

const tenantIdParamSchema = z.object({
  tenantId: z.string().uuid({ message: 'Invalid tenant ID' }),
})

const approveBodySchema = z.object({
  notes: z.string().max(500).optional(),
})

const rejectBodySchema = z.object({
  notes: z.string().min(1, { message: 'Notes is required' }).max(500),
})

const revokeBodySchema = z.object({
  notes: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────
// GET / — 試用列表（trial_status != 'none'）
// ─────────────────────────────────────────────
platformTrialsRoutes.get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
    const { status } = c.req.valid('query')

    try {
      const conditions: ReturnType<typeof sql>[] = [sql`t.trial_status != 'none'`]

      if (status) {
        conditions.push(sql`t.trial_status = ${status}`)
      }

      const whereClause = sql.join(conditions, sql` AND `)

      const result = await db.execute(sql`
        SELECT
          t.id, t.name, t.slug, t.plan, t.status, t.created_at,
          t.trial_status, t.trial_start_at, t.trial_end_at,
          t.trial_approved_at, t.trial_notes,
          t.trial_approved_by,
          u.name AS approver_name
        FROM tenants t
        LEFT JOIN users u ON t.trial_approved_by = u.id
        WHERE ${whereClause}
        ORDER BY
          CASE t.trial_status
            WHEN 'pending' THEN 1
            WHEN 'approved' THEN 2
            WHEN 'rejected' THEN 3
            WHEN 'expired' THEN 4
            ELSE 5
          END,
          t.created_at DESC
      `)

      return success(c, getRows(result))
    } catch (err) {
      logger.error({ err }, '[Platform Trials] GET / error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /:tenantId — 試用詳情
// ─────────────────────────────────────────────
platformTrialsRoutes.get(
  '/:tenantId',
  zValidator('param', tenantIdParamSchema),
  async (c) => {
    const { tenantId } = c.req.valid('param')

    try {
      const result = await db.execute(sql`
        SELECT
          t.*,
          u.name AS approver_name,
          (SELECT COUNT(*)::int FROM users WHERE tenant_id = t.id AND deleted_at IS NULL) AS user_count,
          (SELECT COUNT(*)::int FROM branches WHERE tenant_id = t.id) AS branch_count
        FROM tenants t
        LEFT JOIN users u ON t.trial_approved_by = u.id
        WHERE t.id = ${tenantId}
      `)

      const rows = getRows(result)
      if (rows.length === 0) {
        return notFound(c, 'Tenant')
      }

      return success(c, rows[0])
    } catch (err) {
      logger.error({ err, tenantId }, '[Platform Trials] GET /:tenantId error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:tenantId/approve — 通過試用
// ─────────────────────────────────────────────
platformTrialsRoutes.post(
  '/:tenantId/approve',
  zValidator('param', tenantIdParamSchema),
  zValidator('json', approveBodySchema),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')
    const approver = c.get('user')

    try {
      const now = new Date().toISOString()
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const result = await db.execute(sql`
        UPDATE tenants
        SET trial_status = 'approved',
            trial_start_at = ${now},
            trial_end_at = ${trialEnd},
            trial_approved_by = ${approver.id},
            trial_approved_at = ${now},
            trial_notes = ${notes || null},
            plan = 'pro',
            updated_at = NOW()
        WHERE id = ${tenantId}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId }, '[Platform Trials] Trial approved for 30 days')
      return success(c, { tenantId, approved: true, trialEndAt: trialEnd })
    } catch (err) {
      logger.error({ err, tenantId }, '[Platform Trials] POST /:tenantId/approve error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:tenantId/reject — 駁回試用
// ─────────────────────────────────────────────
platformTrialsRoutes.post(
  '/:tenantId/reject',
  zValidator('param', tenantIdParamSchema),
  zValidator('json', rejectBodySchema),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')
    const approver = c.get('user')

    try {
      const result = await db.execute(sql`
        UPDATE tenants
        SET trial_status = 'rejected',
            trial_approved_by = ${approver.id},
            trial_approved_at = NOW(),
            trial_notes = ${notes},
            updated_at = NOW()
        WHERE id = ${tenantId}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId, notes }, '[Platform Trials] Trial rejected')
      return success(c, { tenantId, rejected: true })
    } catch (err) {
      logger.error({ err, tenantId }, '[Platform Trials] POST /:tenantId/reject error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:tenantId/revoke — 撤銷試用
// ─────────────────────────────────────────────
platformTrialsRoutes.post(
  '/:tenantId/revoke',
  zValidator('param', tenantIdParamSchema),
  zValidator('json', revokeBodySchema),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')

    try {
      const result = await db.execute(sql`
        UPDATE tenants
        SET trial_status = 'expired',
            trial_end_at = NOW(),
            trial_notes = COALESCE(trial_notes || ', ', '') || 'REVOKED: ' || ${notes || 'Admin revoked'},
            plan = 'free',
            updated_at = NOW()
        WHERE id = ${tenantId}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId }, '[Platform Trials] Trial revoked')
      return success(c, { tenantId, revoked: true })
    } catch (err) {
      logger.error({ err, tenantId }, '[Platform Trials] POST /:tenantId/revoke error')
      return internalError(c, err)
    }
  }
)
