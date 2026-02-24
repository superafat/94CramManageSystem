import { Hono } from 'hono'
import { db } from '../db/index.js'
import { users, tenants } from '@94cram/shared/db'
import { eq } from 'drizzle-orm'
import { sign } from '@94cram/shared/auth'
import type { Variables } from '../middleware/auth.js'

const auth = new Hono<{ Variables: Variables }>()

auth.get('/me', async (c) => {
  try {
    const userId = c.get('userId')
    const schoolId = c.get('schoolId')
    if (!userId || !schoolId) return c.json({ error: 'Invalid authentication state' }, 401)

    const [userResult, tenantResult] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)),
      db.select().from(tenants).where(eq(tenants.id, schoolId))
    ])

    const [user] = userResult
    const [tenant] = tenantResult
    if (!user || !user.isActive) return c.json({ error: 'User not found' }, 404)
    if (!tenant) return c.json({ error: 'Invalid account state' }, 500)
    if (user.tenantId !== schoolId) return c.json({ error: 'Invalid authentication' }, 401)

    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      school: { id: tenant.id, name: tenant.name, code: tenant.slug }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Get me error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

auth.post('/demo', async (c) => {
  try {
    const demoUser = {
      id: 'demo-inclass-user',
      email: 'demo@94cram.com',
      name: 'Demo 管理員',
      role: 'admin',
    }
    const demoSchool = {
      id: '11111111-1111-1111-1111-111111111111',
      name: '蜂神榜示範補習班',
      code: 'demo',
    }

    const token = await sign({
      userId: demoUser.id,
      tenantId: demoSchool.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      systems: ['inclass'],
    })

    return c.json({ token, user: demoUser, school: demoSchool })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Demo login error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create demo session' }, 500)
  }
})

export default auth
