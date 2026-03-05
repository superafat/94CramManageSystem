import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requireRole, Role } from '../../middleware/rbac'
import { uuidSchema } from '../../utils/validation'
import { db, sql, success, notFound, internalError, rows, first } from './_helpers'

const tenantsRoutes = new Hono<{ Variables: RBACVariables }>()

tenantsRoutes.get('/tenants', requireRole(Role.SUPERADMIN), async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT id, name, slug, plan, active, created_at
      FROM tenants
      ORDER BY created_at
    `)
    return success(c, { tenants: rows(result) })
  } catch (err) {
    return internalError(c, err)
  }
})

tenantsRoutes.get('/tenants/:tenantId/stats',
  requireRole(Role.SUPERADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    try {
      const conv = first(await db.execute(sql`SELECT COUNT(*)::int as count FROM conversations WHERE tenant_id = ${tenantId}`))
      const chunk = first(await db.execute(sql`SELECT COUNT(*)::int as count FROM knowledge_chunks WHERE tenant_id = ${tenantId}`))
      const branch = first(await db.execute(sql`SELECT COUNT(*)::int as count FROM branches WHERE tenant_id = ${tenantId}`))
      return success(c, {
        conversations: conv?.count ?? 0,
        knowledgeChunks: chunk?.count ?? 0,
        branches: branch?.count ?? 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

tenantsRoutes.get('/trials', requireRole(Role.SUPERADMIN), async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT
        t.id, t.name, t.slug, t.plan, t.active, t.created_at,
        t.trial_status, t.trial_start_at, t.trial_end_at,
        t.trial_approved_at, t.trial_notes,
        t.trial_approved_by,
        u.name as approver_name
      FROM tenants t
      LEFT JOIN users u ON t.trial_approved_by = u.id
      WHERE t.trial_status != 'none'
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
    return success(c, { trials: rows(result) })
  } catch (err) {
    return internalError(c, err)
  }
})

tenantsRoutes.get('/trials/:tenantId',
  requireRole(Role.SUPERADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    try {
      const tenant = first(await db.execute(sql`
        SELECT
          t.*,
          u.name as approver_name,
          (SELECT COUNT(*)::int FROM users WHERE tenant_id = t.id) as user_count,
          (SELECT COUNT(*)::int FROM branches WHERE tenant_id = t.id) as branch_count
        FROM tenants t
        LEFT JOIN users u ON t.trial_approved_by = u.id
        WHERE t.id = ${tenantId}
      `))

      if (!tenant) {
        return notFound(c, 'Tenant not found')
      }
      return success(c, { tenant })
    } catch (err) {
      return internalError(c, err)
    }
  })

tenantsRoutes.post('/trials/:tenantId/approve',
  requireRole(Role.SUPERADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  zValidator('json', z.object({
    notes: z.string().max(500).optional(),
  })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')
    const approver = c.get('user')

    try {
      const now = new Date().toISOString()
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

      await db.execute(sql`
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
      `)

      return success(c, { message: 'Trial approved for 30 days' })
    } catch (err) {
      return internalError(c, err)
    }
  })

tenantsRoutes.post('/trials/:tenantId/reject',
  requireRole(Role.SUPERADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  zValidator('json', z.object({
    notes: z.string().max(500),
  })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')
    const approver = c.get('user')

    try {
      await db.execute(sql`
        UPDATE tenants
        SET trial_status = 'rejected',
            trial_approved_by = ${approver.id},
            trial_approved_at = NOW(),
            trial_notes = ${notes},
            updated_at = NOW()
        WHERE id = ${tenantId}
      `)

      return success(c, { message: 'Trial request rejected' })
    } catch (err) {
      return internalError(c, err)
    }
  })

tenantsRoutes.post('/trials/:tenantId/revoke',
  requireRole(Role.SUPERADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  zValidator('json', z.object({
    notes: z.string().max(500).optional(),
  })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')

    try {
      await db.execute(sql`
        UPDATE tenants
        SET trial_status = 'expired',
            trial_end_at = NOW(),
            trial_notes = COALESCE(trial_notes || ', ', '') || 'REVOKED: ' || ${notes || 'Admin revoked'},
            updated_at = NOW()
        WHERE id = ${tenantId}
      `)

      return success(c, { message: 'Trial revoked' })
    } catch (err) {
      return internalError(c, err)
    }
  })

export { tenantsRoutes }
