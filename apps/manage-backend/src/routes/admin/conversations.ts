import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, success, internalError, rows, first } from './_helpers'

const conversationsRoutes = new Hono<{ Variables: RBACVariables }>()

const conversationsQuerySchema = z.object({
  platform: z.enum(['telegram', 'line', 'web', 'all']).default('all'),
  intent: z.string().max(50).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

conversationsRoutes.get('/conversations',
  requirePermission(Permission.REPORTS_READ),
  zValidator('query', conversationsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')

    try {
      const conditions = [sql`c.tenant_id = ${tenantId}`]

      if (query.platform !== 'all') {
        conditions.push(sql`c.channel = ${query.platform}`)
      }
      if (query.intent) {
        conditions.push(sql`c.intent = ${query.intent}`)
      }
      if (query.from) {
        conditions.push(sql`c.created_at >= ${query.from}::timestamptz`)
      }
      if (query.to) {
        conditions.push(sql`c.created_at <= ${query.to}::timestamptz`)
      }

      const where = sql.join(conditions, sql` AND `)

      const countResult = first(await db.execute(sql`
        SELECT COUNT(*)::int as total FROM conversations c WHERE ${where}
      `))

      const convRows = await db.execute(sql`
        SELECT
          c.id, c.channel, c.intent, c.query, c.answer,
          c.model, c.latency_ms, c.tokens_used, c.created_at,
          c.branch_id,
          b.name as branch_name
        FROM conversations c
        LEFT JOIN branches b ON c.branch_id = b.id
        WHERE ${where}
        ORDER BY c.created_at DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `)

      return success(c, {
        conversations: rows(convRows),
        pagination: {
          total: countResult?.total ?? 0,
          limit: query.limit,
          offset: query.offset,
        },
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { conversationsRoutes }
