import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users, tenants } from '@94cram/shared/db'
import { eq } from 'drizzle-orm'
import { sign, signRefreshToken, verifyRefreshToken, setAuthCookie, setRefreshCookie, clearAuthCookie, extractRefreshToken } from '@94cram/shared/auth'
import bcrypt from 'bcryptjs'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const auth = new Hono<{ Variables: Variables }>()

/** Set both access + refresh token cookies */
async function setAuthTokens(c: import('hono').Context, accessToken: string, userId: string, tenantId: string) {
  setAuthCookie(c, accessToken)
  const refreshToken = await signRefreshToken({ userId, tenantId })
  setRefreshCookie(c, refreshToken)
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
})

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')

    const [user] = await db.select().from(users).where(eq(users.email, email))
    if (!user || !user.isActive) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    let school = null
    if (user.tenantId) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId))
      if (tenant) school = { id: tenant.id, name: tenant.name, code: tenant.slug }
    }

    const token = await sign({
      userId: user.id,
      tenantId: user.tenantId ?? '',
      email: user.email,
      name: user.name,
      role: user.role,
      systems: ['inclass'],
    })

    await setAuthTokens(c, token, user.id, user.tenantId ?? '')
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      school,
    })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Login error`)
    return c.json({ error: 'Failed to login' }, 500)
  }
})

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { name, email, password, role } = c.req.valid('json')

    const [existing] = await db.select().from(users).where(eq(users.email, email))
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        role: role ?? 'staff',
        isActive: true,
      })
      .returning()

    if (!user) {
      return c.json({ error: 'Failed to create user' }, 500)
    }

    const token = await sign({
      userId: user.id,
      tenantId: user.tenantId ?? '',
      email: user.email,
      name: user.name,
      role: user.role,
      systems: ['inclass'],
    })

    await setAuthTokens(c, token, user.id, user.tenantId ?? '')
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    }, 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Register error`)
    return c.json({ error: 'Failed to register' }, 500)
  }
})

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
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Get me error`)
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

    await setAuthTokens(c, token, demoUser.id, demoSchool.id)
    return c.json({ token, user: demoUser, school: demoSchool })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Demo login error`)
    return c.json({ error: 'Failed to create demo session' }, 500)
  }
})

auth.post('/refresh', async (c) => {
  const refreshToken = extractRefreshToken(c)
  if (!refreshToken) {
    return c.json({ error: 'No refresh token' }, 401)
  }

  try {
    const { userId, tenantId } = await verifyRefreshToken(refreshToken)

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user || !user.isActive) {
      clearAuthCookie(c)
      return c.json({ error: 'User not found or inactive' }, 401)
    }

    const token = await sign({
      userId: user.id,
      tenantId: user.tenantId ?? '',
      email: user.email,
      name: user.name,
      role: user.role,
      systems: ['inclass'],
    })

    await setAuthTokens(c, token, user.id, user.tenantId ?? '')
    return c.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch {
    clearAuthCookie(c)
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }
})

auth.post('/logout', async (c) => {
  clearAuthCookie(c)
  return c.json({ success: true })
})

export default auth
