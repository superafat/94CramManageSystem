/**
 * Headquarters Routes — 總部管理 API
 * 僅 superadmin 可存取
 *
 * Routes:
 *   GET  /accounts              — 取得帳號列表（支援 ?status 篩選）
 *   POST /accounts/:id/approve  — 批准帳號
 *   POST /accounts/:id/reject   — 駁回帳號
 *   GET  /branches              — 取得所有分校列表（含統計）
 *   POST /branches              — 建立新分校
 *   POST /branches/:id/remind   — 發送催繳通知
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db'
import { sql } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { requireRole, Role } from '../middleware/rbac'
import { success, badRequest, notFound, internalError } from '../utils/response'
import { logger } from '../utils/logger'
import type { RBACVariables } from '../middleware/rbac'

type AppVariables = RBACVariables & { tenantId: string }

const app = new Hono<{ Variables: AppVariables }>()

// Helper: normalise drizzle result rows
const rows = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  return ((result as { rows?: unknown[] })?.rows ?? []) as Record<string, unknown>[]
}

// All routes require valid JWT + superadmin role
app.use('*', authMiddleware)
app.use('*', requireRole(Role.SUPERADMIN))

// ─────────────────────────────────────────────
// GET /accounts — 帳號列表（支援 ?status 篩選）
// ─────────────────────────────────────────────
const accountsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
})

app.get(
  '/accounts',
  zValidator('query', accountsQuerySchema),
  async (c) => {
    const { status } = c.req.valid('query')

    try {
      let result: unknown

      if (status === 'pending') {
        // is_active = false AND deleted_at IS NULL → 待審核
        result = await db.execute(sql`
          SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
                 t.name AS tenant_name, b.name AS branch_name
          FROM users u
          LEFT JOIN tenants t ON u.tenant_id = t.id
          LEFT JOIN branches b ON u.branch_id = b.id
          WHERE u.deleted_at IS NULL
            AND u.is_active = false
          ORDER BY u.created_at DESC
        `)
      } else if (status === 'approved') {
        // is_active = true AND deleted_at IS NULL → 已批准
        result = await db.execute(sql`
          SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
                 t.name AS tenant_name, b.name AS branch_name
          FROM users u
          LEFT JOIN tenants t ON u.tenant_id = t.id
          LEFT JOIN branches b ON u.branch_id = b.id
          WHERE u.deleted_at IS NULL
            AND u.is_active = true
          ORDER BY u.created_at DESC
        `)
      } else if (status === 'rejected') {
        // deleted_at IS NOT NULL → 已駁回
        result = await db.execute(sql`
          SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
                 t.name AS tenant_name, b.name AS branch_name
          FROM users u
          LEFT JOIN tenants t ON u.tenant_id = t.id
          LEFT JOIN branches b ON u.branch_id = b.id
          WHERE u.deleted_at IS NOT NULL
          ORDER BY u.created_at DESC
        `)
      } else {
        // 無篩選 — 所有未軟刪除帳號
        result = await db.execute(sql`
          SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
                 t.name AS tenant_name, b.name AS branch_name
          FROM users u
          LEFT JOIN tenants t ON u.tenant_id = t.id
          LEFT JOIN branches b ON u.branch_id = b.id
          WHERE u.deleted_at IS NULL
          ORDER BY u.created_at DESC
        `)
      }

      return success(c, rows(result))
    } catch (err) {
      logger.error({ err }, '[HQ] GET /accounts error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /accounts/:id/approve — 批准帳號
// ─────────────────────────────────────────────
const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid account ID' }),
})

app.post(
  '/accounts/:id/approve',
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

      if (rows(result).length === 0) {
        return notFound(c, 'Account')
      }

      logger.info({ accountId: id }, '[HQ] Account approved')
      return success(c, { id, approved: true })
    } catch (err) {
      logger.error({ err, accountId: id }, '[HQ] POST /accounts/:id/approve error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /accounts/:id/reject — 駁回帳號
// ─────────────────────────────────────────────
const rejectBodySchema = z.object({
  reason: z.string().min(1, { message: 'Reason is required' }).max(500),
})

app.post(
  '/accounts/:id/reject',
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

      if (rows(result).length === 0) {
        return notFound(c, 'Account')
      }

      logger.info({ accountId: id, reason }, '[HQ] Account rejected')
      return success(c, { id, rejected: true, reason })
    } catch (err) {
      logger.error({ err, accountId: id }, '[HQ] POST /accounts/:id/reject error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /branches — 所有分校列表（含統計）
// ─────────────────────────────────────────────
app.get('/branches', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT t.id, t.name, t.slug, t.status, t.settings, t.created_at,
             (SELECT COUNT(*) FROM users
              WHERE tenant_id = t.id AND deleted_at IS NULL) AS user_count,
             (SELECT COUNT(*) FROM manage_students
              WHERE tenant_id = t.id AND deleted_at IS NULL) AS student_count,
             (SELECT name FROM users
              WHERE tenant_id = t.id AND role = 'admin' AND deleted_at IS NULL
              LIMIT 1) AS admin_name
      FROM tenants t
      ORDER BY t.created_at DESC
    `)

    return success(c, rows(result))
  } catch (err) {
    logger.error({ err }, '[HQ] GET /branches error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// POST /branches — 建立新分校
// ─────────────────────────────────────────────
const createBranchSchema = z.object({
  name: z.string().min(1, { message: 'Branch name is required' }).max(100),
  contactName: z.string().min(1, { message: 'Contact name is required' }).max(100),
  contactEmail: z.string().email({ message: 'Invalid contact email' }),
  address: z.string().min(1, { message: 'Address is required' }).max(300),
  phone: z.string().min(1, { message: 'Phone is required' }).max(30),
  franchiseFee: z.number().int().nonnegative().optional(),
})

app.post(
  '/branches',
  zValidator('json', createBranchSchema),
  async (c) => {
    const body = c.req.valid('json')
    const { name, contactName, contactEmail, address, phone, franchiseFee } = body

    try {
      const tenantId = crypto.randomUUID()
      const adminUserId = crypto.randomUUID()

      // slug: lowercase, replace spaces with dashes, keep alphanumeric + dashes only
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 60)

      const settings: Record<string, unknown> = {}
      if (franchiseFee !== undefined) {
        settings.franchise_fee = franchiseFee
      }

      // 建立 tenant
      await db.execute(sql`
        INSERT INTO tenants (id, name, slug, status, settings, created_at, updated_at)
        VALUES (
          ${tenantId},
          ${name},
          ${slug},
          'active',
          ${JSON.stringify(settings)}::jsonb,
          NOW(),
          NOW()
        )
      `)

      // 建立管理員帳號（is_active=false，待審核）
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, name, email, role, is_active, created_at, updated_at)
        VALUES (
          ${adminUserId},
          ${tenantId},
          ${contactName},
          ${contactEmail},
          'admin',
          false,
          NOW(),
          NOW()
        )
      `)

      logger.info({ tenantId, adminUserId, name }, '[HQ] Branch created')

      return success(
        c,
        {
          tenantId,
          adminUserId,
          name,
          slug,
          address,
          phone,
          contactName,
          contactEmail,
          franchiseFee: franchiseFee ?? null,
        },
        201
      )
    } catch (err) {
      logger.error({ err, name }, '[HQ] POST /branches error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /branches/:id/remind — 發送催繳通知
// ─────────────────────────────────────────────
const branchUuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid branch ID' }),
})

app.post(
  '/branches/:id/remind',
  zValidator('param', branchUuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      // 先確認 tenant 存在
      const tenantCheck = await db.execute(sql`
        SELECT id, settings FROM tenants WHERE id = ${id}
      `)
      if (rows(tenantCheck).length === 0) {
        return notFound(c, 'Branch')
      }

      // 遞增 reminder_count
      await db.execute(sql`
        UPDATE tenants
        SET settings = jsonb_set(
          COALESCE(settings, '{}'),
          '{reminder_count}',
          (COALESCE((settings->>'reminder_count')::int, 0) + 1)::text::jsonb
        ),
        updated_at = NOW()
        WHERE id = ${id}
      `)

      // 取得更新後的 reminder_count
      const updatedResult = await db.execute(sql`
        SELECT (settings->>'reminder_count')::int AS reminder_count
        FROM tenants
        WHERE id = ${id}
      `)
      const updatedRows = rows(updatedResult)
      const reminderCount = Number(updatedRows[0]?.reminder_count ?? 0)

      // 催繳次數 >= 3 → 自動停用
      let suspended = false
      if (reminderCount >= 3) {
        await db.execute(sql`
          UPDATE tenants SET status = 'suspended', updated_at = NOW()
          WHERE id = ${id}
        `)
        suspended = true
        logger.warn({ tenantId: id, reminderCount }, '[HQ] Tenant auto-suspended after 3 reminders')
      }

      logger.info({ tenantId: id, reminderCount, suspended }, '[HQ] Reminder sent')
      return success(c, { id, reminderCount, suspended })
    } catch (err) {
      logger.error({ err, tenantId: id }, '[HQ] POST /branches/:id/remind error')
      return internalError(c, err)
    }
  }
)

export { app as headquartersRoutes }
