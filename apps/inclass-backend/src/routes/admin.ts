/**
 * Admin Routes - 管理員功能（使用 adminOnly middleware）
 */
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { adminOnly } from '../middleware/auth.js'
import { getFailedLogins, getBlockedIPs } from '../middleware/rateLimit.js'
import type { AdminVariables } from '../middleware/auth.js'

const adminRouter = new Hono<{ Variables: AdminVariables }>()

// Apply admin-only middleware to all routes
adminRouter.use('*', adminOnly())

// 取得待審核的用戶列表
adminRouter.get('/pending-users', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const pendingUsers = await db.select().from(users)
      .where(eq(users.schoolId, schoolId))

    const filtered = pendingUsers.filter(u => u.status === 'pending')
    return c.json({ users: filtered })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Admin error:', e)
    return c.json({ error: 'Failed to get pending users' }, 500)
  }
})

// 核准用戶
adminRouter.post('/users/:id/approve', async (c) => {
  try {
    const adminUser = c.get('adminUser')
    const targetId = c.req.param('id')

    const [updated] = await db.update(users)
      .set({
        status: 'active',
        approvedBy: adminUser.id,
        approvedAt: new Date()
      })
      .where(eq(users.id, targetId))
      .returning()

    if (!updated) return c.json({ error: 'User not found' }, 404)
    return c.json({ success: true, user: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Approve error:', e)
    return c.json({ error: 'Failed to approve user' }, 500)
  }
})

// 拒絕/停用用戶
adminRouter.post('/users/:id/reject', async (c) => {
  try {
    const adminUser = c.get('adminUser')
    const targetId = c.req.param('id')

    const [updated] = await db.update(users)
      .set({
        status: 'suspended',
        approvedBy: adminUser.id,
        approvedAt: new Date()
      })
      .where(eq(users.id, targetId))
      .returning()

    if (!updated) return c.json({ error: 'User not found' }, 404)
    return c.json({ success: true, user: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Reject error:', e)
    return c.json({ error: 'Failed to reject user' }, 500)
  }
})

// 取得失敗登入記錄
adminRouter.get('/security/failed-logins', async (c) => {
  try {
    const hours = parseInt(c.req.query('hours') || '24')
    const logins = getFailedLogins(hours)

    return c.json({
      failedLogins: logins,
      summary: {
        total: logins.length,
        uniqueIPs: [...new Set(logins.map(l => l.ip))].length,
        blockedIPs: getBlockedIPs()
      }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Security error:', e)
    return c.json({ error: 'Failed to get security data' }, 500)
  }
})

// 取得被封鎖的 IP
adminRouter.get('/security/blocked-ips', async (c) => {
  try {
    const blocked = getBlockedIPs()
    return c.json({ blockedIPs: blocked, count: blocked.length })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Security error:', e)
    return c.json({ error: 'Failed to get blocked IPs' }, 500)
  }
})

export default adminRouter
