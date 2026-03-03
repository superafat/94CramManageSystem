import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, success, internalError } from './_helpers'

const settingsRoutes = new Hono<{ Variables: RBACVariables }>()

const settingsSchema = z.object({
  aiMode: z.string().max(100),
  aiEngine: z.string().max(100),
  searchThreshold: z.number().min(0).max(1),
  maxResults: z.number().int().min(1).max(10),
  telegramToken: z.string().max(500),
  defaultBranchId: z.string().max(36),
})

settingsRoutes.get('/settings',
  requirePermission(Permission.SETTINGS_READ),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id

    try {
      const [row] = await db.execute(sql`
        SELECT settings FROM manage_settings WHERE tenant_id = ${tenantId}
      `) as any[]

      return success(c, { settings: row?.settings ?? {} })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

settingsRoutes.post('/settings',
  requirePermission(Permission.SETTINGS_WRITE),
  zValidator('json', settingsSchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')

    try {
      await db.execute(sql`
        INSERT INTO manage_settings (tenant_id, settings, updated_at, updated_by)
        VALUES (${tenantId}, ${JSON.stringify(body)}::jsonb, NOW(), ${user.id})
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          settings = ${JSON.stringify(body)}::jsonb,
          updated_at = NOW(),
          updated_by = ${user.id}
      `)

      return success(c, { settings: body })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { settingsRoutes }
