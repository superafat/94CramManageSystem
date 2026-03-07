import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users, tenants, authSessions, authSessionEvents, userTenantMemberships, userBranchMemberships, userSystemEntitlements } from '@94cram/shared/db'
import { eq, and, isNull } from 'drizzle-orm'
import { sign, signRefreshToken, verifyRefreshToken, setAuthCookie, setRefreshCookie, clearAuthCookie, extractRefreshToken, hashSessionToken, getRefreshTokenExpiryDate } from '@94cram/shared/auth'
import bcrypt from 'bcryptjs'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'
import { success, unauthorized, notFound, internalError, conflict } from '../utils/response.js'

const auth = new Hono<{ Variables: Variables }>()

async function ensureIdentityRecords(userId: string, tenantId: string, branchId?: string | null) {
  const [membership] = await db.select().from(userTenantMemberships).where(and(
    eq(userTenantMemberships.userId, userId),
    eq(userTenantMemberships.tenantId, tenantId),
    eq(userTenantMemberships.status, 'active')
  ))

  if (!membership) {
    await db.insert(userTenantMemberships).values({
      userId,
      tenantId,
      membershipRole: 'member',
      status: 'active',
      primaryBranchId: branchId ?? undefined,
    })
  }

  if (branchId) {
    const [branchMembership] = await db.select().from(userBranchMemberships).where(and(
      eq(userBranchMemberships.userId, userId),
      eq(userBranchMemberships.tenantId, tenantId),
      eq(userBranchMemberships.branchId, branchId),
      eq(userBranchMemberships.status, 'active')
    ))

    if (!branchMembership) {
      await db.insert(userBranchMemberships).values({
        userId,
        tenantId,
        branchId,
        branchRole: 'member',
        status: 'active',
      })
    }
  }

  const [entitlement] = await db.select().from(userSystemEntitlements).where(and(
    eq(userSystemEntitlements.userId, userId),
    eq(userSystemEntitlements.tenantId, tenantId),
    eq(userSystemEntitlements.systemKey, 'inclass'),
    eq(userSystemEntitlements.status, 'active')
  ))

  if (!entitlement) {
    await db.insert(userSystemEntitlements).values({
      userId,
      tenantId,
      systemKey: 'inclass',
      accessLevel: 'member',
      status: 'active',
    })
  }
}

async function revokeSessionByRefreshToken(refreshToken: string | null, eventType: string) {
  if (!refreshToken) return

  const refreshTokenHash = hashSessionToken(refreshToken)
  const sessions = await db
    .update(authSessions)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(authSessions.refreshTokenHash, refreshTokenHash), isNull(authSessions.revokedAt)))
    .returning({ id: authSessions.id, userId: authSessions.userId, tenantId: authSessions.tenantId })

  if (sessions.length > 0) {
    await db.insert(authSessionEvents).values(sessions.map((session) => ({
      sessionId: session.id,
      userId: session.userId,
      tenantId: session.tenantId ?? undefined,
      eventType,
      createdAt: new Date(),
    })))
  }
}

/** Set both access + refresh token cookies */
async function setAuthTokens(c: import('hono').Context, accessToken: string, userId: string, tenantId: string, branchId?: string | null, eventType = 'login') {
  setAuthCookie(c, accessToken)
  const refreshToken = await signRefreshToken({ userId, tenantId })
  setRefreshCookie(c, refreshToken)

  await ensureIdentityRecords(userId, tenantId, branchId)

  const session = await db.insert(authSessions).values({
    userId,
    tenantId,
    branchId: branchId ?? undefined,
    refreshTokenHash: hashSessionToken(refreshToken),
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: c.req.header('user-agent'),
    expiresAt: getRefreshTokenExpiryDate(),
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: authSessions.id })

  if (session[0]) {
    await db.insert(authSessionEvents).values({
      sessionId: session[0].id,
      userId,
      tenantId,
      eventType,
      ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: c.req.header('user-agent'),
      createdAt: new Date(),
    })
  }
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
      return unauthorized(c, 'Invalid email or password')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return unauthorized(c, 'Invalid email or password')
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

    await setAuthTokens(c, token, user.id, user.tenantId ?? '', user.branchId ?? null, 'login')
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      school,
    })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Login error`)
    return internalError(c, e)
  }
})

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { name, email, password, role } = c.req.valid('json')

    const [existing] = await db.select().from(users).where(eq(users.email, email))
    if (existing) {
      return conflict(c, 'Email already registered')
    }

    const passwordHash = await bcrypt.hash(password, 12)
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
      return internalError(c, new Error('Failed to create user'))
    }

    const token = await sign({
      userId: user.id,
      tenantId: user.tenantId ?? '',
      email: user.email,
      name: user.name,
      role: user.role,
      systems: ['inclass'],
    })

    await setAuthTokens(c, token, user.id, user.tenantId ?? '', user.branchId ?? null, 'register')
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    }, 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Register error`)
    return internalError(c, e)
  }
})

auth.get('/me', async (c) => {
  try {
    const userId = c.get('userId')
    const schoolId = c.get('schoolId')
    if (!userId || !schoolId) return unauthorized(c, 'Invalid authentication state')

    const [userResult, tenantResult] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)),
      db.select().from(tenants).where(eq(tenants.id, schoolId))
    ])

    const [user] = userResult
    const [tenant] = tenantResult
    if (!user || !user.isActive) return notFound(c, 'User')
    if (!tenant) return internalError(c, new Error('Invalid account state'))
    if (user.tenantId !== schoolId) return unauthorized(c, 'Invalid authentication')

    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      school: { id: tenant.id, name: tenant.name, code: tenant.slug }
    })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Get me error`)
    return internalError(c, e)
  }
})

auth.post('/google', async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>
  const credential = body.credential as string | undefined

  if (!credential) {
    return c.json({ error: '缺少 Google credential' }, 400)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return c.json({ error: 'Google OAuth 未設定' }, 500)
  }

  try {
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    )
    if (!tokenInfoRes.ok) {
      return unauthorized(c, 'Google 憑證驗證失敗')
    }

    const tokenInfo = await tokenInfoRes.json() as {
      aud: string
      email: string
      email_verified: string
      name?: string
      error_description?: string
    }

    if (tokenInfo.error_description || tokenInfo.aud !== clientId || tokenInfo.email_verified !== 'true') {
      return unauthorized(c, 'Google 憑證無效')
    }

    const [user] = await db.select().from(users).where(eq(users.email, tokenInfo.email))
    if (!user || !user.isActive) {
      return unauthorized(c, '此 Google 帳號尚未在系統中建立，請聯繫管理員')
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

    await setAuthTokens(c, token, user.id, user.tenantId ?? '', user.branchId ?? null, 'google_login')
    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      school,
    })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Google login error`)
    return internalError(c, e)
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

    await setAuthTokens(c, token, demoUser.id, demoSchool.id, null, 'demo_login')
    return c.json({ token, user: demoUser, school: demoSchool })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Demo login error`)
    return internalError(c, e)
  }
})

auth.post('/refresh', async (c) => {
  const refreshToken = extractRefreshToken(c)
  if (!refreshToken) {
    return unauthorized(c, 'No refresh token')
  }

  try {
    const { userId, tenantId } = await verifyRefreshToken(refreshToken)

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user || !user.isActive) {
      clearAuthCookie(c)
      return unauthorized(c, 'User not found or inactive')
    }

    const token = await sign({
      userId: user.id,
      tenantId: user.tenantId ?? '',
      email: user.email,
      name: user.name,
      role: user.role,
      systems: ['inclass'],
    })

    await revokeSessionByRefreshToken(refreshToken, 'refresh_replaced')
    await setAuthTokens(c, token, user.id, user.tenantId ?? '', user.branchId ?? null, 'refresh')
    return c.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch {
    clearAuthCookie(c)
    return unauthorized(c, 'Invalid or expired refresh token')
  }
})

auth.post('/logout', async (c) => {
  await revokeSessionByRefreshToken(extractRefreshToken(c), 'logout')
  clearAuthCookie(c)
  return c.json({ success: true })
})

export default auth
