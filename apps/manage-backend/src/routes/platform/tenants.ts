/**
 * Platform Tenants Routes — 租戶（補習班）管理 CRUD
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET    /             — 租戶列表（支援篩選 + 分頁）
 *   POST   /             — 新增租戶 + 初始管理員
 *   GET    /:id          — 租戶詳情 + 統計
 *   PUT    /:id          — 編輯租戶
 *   DELETE /:id          — 軟刪除
 *   POST   /:id/suspend  — 停用租戶
 *   POST   /:id/activate — 啟用租戶
 *   POST   /:id/remind   — 催繳提醒（>= 3 次自動停用）
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, successWithPagination, badRequest, notFound, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'
import { getRows } from './_helpers'

export const platformTenantsRoutes = new Hono<{ Variables: RBACVariables }>()

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid tenant ID' }),
})

const listQuerySchema = z.object({
  status: z.enum(['active', 'suspended', 'trial']).optional(),
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createTenantSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100),
  contactName: z.string().min(1, { message: 'Contact name is required' }).max(100),
  contactEmail: z.string().email({ message: 'Invalid contact email' }),
  address: z.string().min(1, { message: 'Address is required' }).max(300),
  phone: z.string().min(1, { message: 'Phone is required' }).max(30),
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  franchiseFee: z.number().int().nonnegative().optional(),
})

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'trial']).optional(),
  suspendedReason: z.string().max(500).optional(),
})

const suspendBodySchema = z.object({
  reason: z.string().min(1, { message: 'Reason is required' }).max(500),
})

// ─────────────────────────────────────────────
// GET / — 租戶列表（篩選 + 分頁）
// ─────────────────────────────────────────────
platformTenantsRoutes.get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
    const { status, plan, search, page, limit } = c.req.valid('query')
    const offset = (page - 1) * limit

    try {
      // 動態 WHERE 條件
      const conditions: ReturnType<typeof sql>[] = [sql`t.deleted_at IS NULL`]

      if (status) {
        conditions.push(sql`t.status = ${status}`)
      }
      if (plan) {
        conditions.push(sql`t.plan = ${plan}`)
      }
      if (search) {
        const like = `%${search}%`
        conditions.push(sql`t.name ILIKE ${like}`)
      }

      const whereClause = sql.join(conditions, sql` AND `)

      // 總數查詢
      const countResult = await db.execute(sql`
        SELECT COUNT(*)::text AS total
        FROM tenants t
        WHERE ${whereClause}
      `)
      const total = parseInt(getRows(countResult)[0]?.total as string ?? '0', 10)

      // 列表查詢
      const result = await db.execute(sql`
        SELECT t.id, t.name, t.slug, t.status, t.plan, t.settings, t.created_at,
               t.suspended_reason, t.trial_status, t.last_payment_at, t.payment_due_at,
               (SELECT COUNT(*) FROM users
                WHERE tenant_id = t.id AND deleted_at IS NULL) AS user_count,
               (SELECT COUNT(*) FROM manage_students
                WHERE tenant_id = t.id AND deleted_at IS NULL) AS student_count,
               (SELECT name FROM users
                WHERE tenant_id = t.id AND role = 'admin' AND deleted_at IS NULL
                LIMIT 1) AS admin_name
        FROM tenants t
        WHERE ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `)

      return successWithPagination(c, getRows(result), { page, limit, total })
    } catch (err) {
      logger.error({ err }, '[Platform Tenants] GET / error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST / — 新增租戶 + 初始管理員
// ─────────────────────────────────────────────
platformTenantsRoutes.post(
  '/',
  zValidator('json', createTenantSchema),
  async (c) => {
    const { name, contactName, contactEmail, address, phone, plan, franchiseFee } = c.req.valid('json')

    try {
      const tenantId = crypto.randomUUID()
      const adminUserId = crypto.randomUUID()

      // slug: lowercase, replace spaces with dashes, keep alphanumeric + dashes
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
        INSERT INTO tenants (id, name, slug, status, plan, settings, created_at, updated_at)
        VALUES (
          ${tenantId},
          ${name},
          ${slug},
          'active',
          ${plan ?? 'free'},
          ${JSON.stringify(settings)}::jsonb,
          NOW(),
          NOW()
        )
      `)

      // 建立管理員帳號（is_active=false，待審核）
      await db.execute(sql`
        INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (
          ${adminUserId},
          ${tenantId},
          ${contactName},
          ${contactEmail},
          '',
          'admin',
          false,
          NOW(),
          NOW()
        )
      `)

      logger.info({ tenantId, adminUserId, name }, '[Platform Tenants] Tenant created')

      return success(
        c,
        {
          tenantId,
          adminUserId,
          name,
          slug,
          plan: plan ?? 'free',
          address,
          phone,
          contactName,
          contactEmail,
          franchiseFee: franchiseFee ?? null,
        },
        201
      )
    } catch (err) {
      logger.error({ err, name }, '[Platform Tenants] POST / error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /:id — 租戶詳情 + 統計
// ─────────────────────────────────────────────
platformTenantsRoutes.get(
  '/:id',
  zValidator('param', uuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const result = await db.execute(sql`
        SELECT t.id, t.name, t.slug, t.status, t.plan, t.settings, t.created_at, t.updated_at,
               t.suspended_reason, t.trial_status, t.trial_start_at, t.trial_end_at,
               t.trial_notes, t.last_payment_at, t.payment_due_at,
               (SELECT COUNT(*) FROM users
                WHERE tenant_id = t.id AND deleted_at IS NULL) AS user_count,
               (SELECT COUNT(*) FROM manage_students
                WHERE tenant_id = t.id AND deleted_at IS NULL) AS student_count,
               COALESCE((t.settings->>'ai_usage')::int, 0) AS ai_usage,
               COALESCE((t.settings->>'conversation_count')::int, 0) AS conversation_count,
               (SELECT name FROM users
                WHERE tenant_id = t.id AND role = 'admin' AND deleted_at IS NULL
                LIMIT 1) AS admin_name
        FROM tenants t
        WHERE t.id = ${id}
          AND t.deleted_at IS NULL
      `)

      const rows = getRows(result)
      if (rows.length === 0) {
        return notFound(c, 'Tenant')
      }

      return success(c, rows[0])
    } catch (err) {
      logger.error({ err, tenantId: id }, '[Platform Tenants] GET /:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// PUT /:id — 編輯租戶
// ─────────────────────────────────────────────
platformTenantsRoutes.put(
  '/:id',
  zValidator('param', uuidParamSchema),
  zValidator('json', updateTenantSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    // 至少要有一個欄位要更新
    if (Object.keys(body).length === 0) {
      return badRequest(c, 'At least one field is required')
    }

    try {
      // 動態 SET 子句
      const setClauses: ReturnType<typeof sql>[] = []

      if (body.name !== undefined) {
        setClauses.push(sql`name = ${body.name}`)
      }
      if (body.slug !== undefined) {
        setClauses.push(sql`slug = ${body.slug}`)
      }
      if (body.plan !== undefined) {
        setClauses.push(sql`plan = ${body.plan}`)
      }
      if (body.status !== undefined) {
        setClauses.push(sql`status = ${body.status}`)
      }
      if (body.suspendedReason !== undefined) {
        setClauses.push(sql`suspended_reason = ${body.suspendedReason}`)
      }

      setClauses.push(sql`updated_at = NOW()`)

      const setClause = sql.join(setClauses, sql`, `)

      const result = await db.execute(sql`
        UPDATE tenants
        SET ${setClause}
        WHERE id = ${id}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId: id, fields: Object.keys(body) }, '[Platform Tenants] Tenant updated')
      return success(c, { id, updated: true })
    } catch (err) {
      logger.error({ err, tenantId: id }, '[Platform Tenants] PUT /:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /:id — 軟刪除
// ─────────────────────────────────────────────
platformTenantsRoutes.delete(
  '/:id',
  zValidator('param', uuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const result = await db.execute(sql`
        UPDATE tenants
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId: id }, '[Platform Tenants] Tenant soft-deleted')
      return success(c, { id, deleted: true })
    } catch (err) {
      logger.error({ err, tenantId: id }, '[Platform Tenants] DELETE /:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:id/suspend — 停用租戶
// ─────────────────────────────────────────────
platformTenantsRoutes.post(
  '/:id/suspend',
  zValidator('param', uuidParamSchema),
  zValidator('json', suspendBodySchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const { reason } = c.req.valid('json')

    try {
      const result = await db.execute(sql`
        UPDATE tenants
        SET status = 'suspended',
            suspended_reason = ${reason},
            updated_at = NOW()
        WHERE id = ${id}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId: id, reason }, '[Platform Tenants] Tenant suspended')
      return success(c, { id, suspended: true, reason })
    } catch (err) {
      logger.error({ err, tenantId: id }, '[Platform Tenants] POST /:id/suspend error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:id/activate — 啟用租戶
// ─────────────────────────────────────────────
platformTenantsRoutes.post(
  '/:id/activate',
  zValidator('param', uuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const result = await db.execute(sql`
        UPDATE tenants
        SET status = 'active',
            suspended_reason = NULL,
            updated_at = NOW()
        WHERE id = ${id}
          AND deleted_at IS NULL
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Tenant')
      }

      logger.info({ tenantId: id }, '[Platform Tenants] Tenant activated')
      return success(c, { id, activated: true })
    } catch (err) {
      logger.error({ err, tenantId: id }, '[Platform Tenants] POST /:id/activate error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /:id/remind — 催繳提醒（>= 3 次自動停用）
// ─────────────────────────────────────────────
platformTenantsRoutes.post(
  '/:id/remind',
  zValidator('param', uuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      // 確認 tenant 存在
      const tenantCheck = await db.execute(sql`
        SELECT id, settings FROM tenants
        WHERE id = ${id} AND deleted_at IS NULL
      `)
      if (getRows(tenantCheck).length === 0) {
        return notFound(c, 'Tenant')
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
      const updatedRows = getRows(updatedResult)
      const reminderCount = Number(updatedRows[0]?.reminder_count ?? 0)

      // 催繳次數 >= 3 → 自動停用
      let suspended = false
      if (reminderCount >= 3) {
        await db.execute(sql`
          UPDATE tenants
          SET status = 'suspended',
              suspended_reason = '催繳超過 3 次自動停用',
              updated_at = NOW()
          WHERE id = ${id}
        `)
        suspended = true
        logger.warn({ tenantId: id, reminderCount }, '[Platform Tenants] Tenant auto-suspended after 3 reminders')
      }

      logger.info({ tenantId: id, reminderCount, suspended }, '[Platform Tenants] Reminder sent')
      return success(c, { id, reminderCount, suspended })
    } catch (err) {
      logger.error({ err, tenantId: id }, '[Platform Tenants] POST /:id/remind error')
      return internalError(c, err)
    }
  }
)
