import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users } from '@94cram/shared/db'
import { and, eq } from 'drizzle-orm'
import { adminOnly } from '../middleware/auth.js'
import { getFailedLogins, getBlockedIPs } from '../middleware/rateLimit.js'
import { isValidUUID } from '../utils/date.js'
import type { AdminVariables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const adminRouter = new Hono<{ Variables: AdminVariables }>()
adminRouter.use('*', adminOnly())

adminRouter.get('/pending-users', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const tenantUsers = await db.select().from(users).where(eq(users.tenantId, schoolId))
    return c.json({ users: tenantUsers.filter(u => !u.isActive) })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Admin error`)
    return c.json({ error: 'Failed to get pending users' }, 500)
  }
})

adminRouter.post('/users/:id/approve', async (c) => {
  try {
    const targetId = c.req.param('id')
    if (!isValidUUID(targetId)) return c.json({ error: 'Invalid user ID format' }, 400)
    const [updated] = await db.update(users).set({ isActive: true }).where(and(eq(users.id, targetId), eq(users.tenantId, c.get('schoolId')))).returning()
    if (!updated) return c.json({ error: 'User not found' }, 404)
    return c.json({ success: true, user: updated })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Approve error`)
    return c.json({ error: 'Failed to approve user' }, 500)
  }
})

adminRouter.post('/users/:id/reject', async (c) => {
  try {
    const targetId = c.req.param('id')
    if (!isValidUUID(targetId)) return c.json({ error: 'Invalid user ID format' }, 400)
    const [updated] = await db.update(users).set({ isActive: false }).where(and(eq(users.id, targetId), eq(users.tenantId, c.get('schoolId')))).returning()
    if (!updated) return c.json({ error: 'User not found' }, 404)
    return c.json({ success: true, user: updated })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Reject error`)
    return c.json({ error: 'Failed to reject user' }, 500)
  }
})

adminRouter.get('/security/failed-logins', async (c) => {
  try {
    const hours = parseInt(c.req.query('hours') || '24')
    const logins = getFailedLogins(hours)
    return c.json({ failedLogins: logins, summary: { total: logins.length, uniqueIPs: [...new Set(logins.map(l => l.ip))].length, blockedIPs: getBlockedIPs() } })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Security error`)
    return c.json({ error: 'Failed to get security data' }, 500)
  }
})

adminRouter.get('/security/blocked-ips', async (c) => c.json({ blockedIPs: getBlockedIPs(), count: getBlockedIPs().length }))

export default adminRouter
