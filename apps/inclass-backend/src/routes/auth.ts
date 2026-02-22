/**
 * Auth Routes - 認證系統
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from '../db/index.js'
import { users, schools } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { getJWTSecret, type Variables } from '../middleware/auth.js'
import { getClientIP, recordFailedLogin, recordSuccessfulLogin } from '../middleware/rateLimit.js'

const auth = new Hono<{ Variables: Variables }>()

const registerSchema = z.object({
  schoolName: z.string().min(1).max(100),
  email: z.string().email().transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1).max(100),
})

const loginSchema = z.object({
  email: z.string().email().transform(val => val.toLowerCase().trim()),
  password: z.string().min(1).max(128),
})

// 註冊
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    const [existingUser] = await db.select().from(users).where(eq(users.email, body.email))
    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 400)
    }

    const passwordHash = await bcrypt.hash(body.password, 10)

    const result = await db.transaction(async (tx) => {
      let schoolCode: string
      let attempts = 0
      do {
        schoolCode = `SCH${crypto.randomUUID().slice(0, 8).toUpperCase()}`
        const existingSchools = await tx.select().from(schools).where(eq(schools.code, schoolCode))
        if (existingSchools.length === 0) break
        attempts++
      } while (attempts < 5)

      if (attempts >= 5) {
        throw new Error('Failed to generate unique school code')
      }

      const [newSchool] = await tx.insert(schools).values({
        name: body.schoolName,
        code: schoolCode,
      }).returning()

      const [newUser] = await tx.insert(users).values({
        schoolId: newSchool.id,
        email: body.email,
        passwordHash,
        name: body.name,
        role: 'teacher',
        status: 'pending',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).returning()

      return { newSchool, newUser }
    })

    const token = await new SignJWT({
      userId: result.newUser.id,
      schoolId: result.newSchool.id,
      email: result.newUser.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2d')
      .sign(getJWTSecret())

    return c.json({
      success: true,
      token,
      user: {
        id: result.newUser.id,
        email: result.newUser.email,
        name: result.newUser.name,
        role: result.newUser.role
      },
      school: {
        id: result.newSchool.id,
        name: result.newSchool.name
      }
    }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Register error:', e instanceof Error ? e.message : 'Unknown error')
    if (e instanceof Error && e.message.includes('unique')) {
      return c.json({ error: 'Email already registered' }, 400)
    }
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// 登入
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const [user] = await db.select().from(users).where(eq(users.email, body.email))

    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
    const hashToCompare = user?.passwordHash || dummyHash
    const isValid = await bcrypt.compare(body.password, hashToCompare)

    if (!user || !isValid) {
      const ip = getClientIP(c)
      const userAgent = c.req.header('user-agent') || 'unknown'
      console.warn('[Security] Failed login attempt:', { ip, email: body.email, userAgent })
      recordFailedLogin(ip, body.email, userAgent)
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    if (user.status === 'pending') {
      return c.json({ error: 'Account pending approval. Please wait for admin to approve.' }, 403)
    }
    if (user.status === 'suspended') {
      return c.json({ error: 'Account suspended. Please contact admin.' }, 403)
    }

    const [school] = await db.select().from(schools).where(eq(schools.id, user.schoolId))
    if (!school) {
      console.error('[API Error] School not found for user:', user.id)
      return c.json({ error: 'Invalid account state' }, 500)
    }

    const token = await new SignJWT({
      userId: user.id,
      schoolId: user.schoolId,
      email: user.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2d')
      .sign(getJWTSecret())

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
    const ip = getClientIP(c)
    recordSuccessfulLogin(ip)

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      },
      school: { id: school.id, name: school.name }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Login error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Demo 帳號登入
auth.post('/demo', async (c) => {
  try {
    let [demoSchool] = await db.select().from(schools).where(eq(schools.code, 'DEMO001'))
    if (!demoSchool) {
      const [newSchool] = await db.insert(schools).values({
        name: '🐝 Demo School',
        code: 'DEMO001',
      }).returning()
      demoSchool = newSchool
    }

    let [demoUser] = await db.select().from(users).where(eq(users.email, 'demo@beeclass.com'))
    if (!demoUser) {
      const [newUser] = await db.insert(users).values({
        schoolId: demoSchool.id,
        email: 'demo@beeclass.com',
        passwordHash: await bcrypt.hash('demo-only-read-only', 10),
        name: 'Demo User',
        role: 'demo',
        status: 'active',
      }).returning()
      demoUser = newUser
    }

    const token = await new SignJWT({
      userId: demoUser.id,
      schoolId: demoSchool.id,
      email: demoUser.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(getJWTSecret())

    return c.json({
      success: true,
      token,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        isDemo: true
      },
      school: { id: demoSchool.id, name: demoSchool.name }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Demo login error:', e)
    return c.json({ error: 'Demo login failed' }, 500)
  }
})

// 取得當前使用者
auth.get('/me', async (c) => {
  try {
    const userId = c.get('userId')
    const schoolId = c.get('schoolId')

    if (!userId || !schoolId) {
      return c.json({ error: 'Invalid authentication state' }, 401)
    }

    const [userResult, schoolResult] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)),
      db.select().from(schools).where(eq(schools.id, schoolId))
    ])

    const [user] = userResult
    const [school] = schoolResult

    if (!user) return c.json({ error: 'User not found' }, 404)
    if (!school) {
      console.error('[API Error] School not found for user:', userId)
      return c.json({ error: 'Invalid account state' }, 500)
    }

    if (user.schoolId !== schoolId) {
      console.error('[Security] User school mismatch:', { userId, userSchool: user.schoolId, jwtSchool: schoolId })
      return c.json({ error: 'Invalid authentication' }, 401)
    }

    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      school: { id: school.id, name: school.name, code: school.code }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Get me error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to get user' }, 500)
  }
})

export default auth
