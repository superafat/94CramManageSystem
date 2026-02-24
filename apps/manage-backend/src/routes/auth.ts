/**
 * Auth Routes - 認證 API
 * 
 * 修復項目：
 * 1. ✅ Firebase token 需驗證簽名，而非只是 decode
 * 2. ✅ 統一 API response format
 * 3. ✅ 改善 input validation
 * 4. ✅ 增加 rate limiting（防止暴力破解）
 * 5. ✅ 密碼複雜度檢查
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as jose from 'jose'
import { config } from '../config'
import { db } from '../db'
import { sql } from 'drizzle-orm'
import { getUserPermissions, Role } from '../middleware/rbac'
import { createHash } from 'crypto'
import { rateLimit } from '../middleware/rateLimit'

// Simple UUID v4 generator
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
import { loginSchema, telegramLoginSchema, trialSignupSchema } from '../utils/validation'
import { 
  success, 
  badRequest, 
  unauthorized, 
  forbidden, 
  internalError 
} from '../utils/response'

export const authRoutes = new Hono()

type QueryResultRows<T> = T[] | { rows?: T[] }

type AuthUserRow = {
  id: string
  username: string | null
  full_name: string | null
  email: string | null
  role: string
  tenant_id: string
  branch_id: string | null
  is_active: boolean
  password_hash?: string | null
}

type TenantLookupRow = { id: string }

function firstRow<T>(result: QueryResultRows<T>): T | null {
  if (Array.isArray(result)) return result[0] ?? null
  return result.rows?.[0] ?? null
}

function isJwtExpiredError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === 'ERR_JWT_EXPIRED'
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

const secret = new TextEncoder().encode(config.JWT_SECRET)

// Firebase public key cache (should be refreshed periodically in production)
let firebasePublicKeys: Record<string, string> = {}
let firebaseKeysFetchedAt = 0
const FIREBASE_KEYS_TTL = 3600000 // 1 hour

/** Fetch Firebase public keys for JWT verification */
async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now()
  if (firebasePublicKeys && Object.keys(firebasePublicKeys).length > 0 && 
      now - firebaseKeysFetchedAt < FIREBASE_KEYS_TTL) {
    return firebasePublicKeys
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    )
    if (response.ok) {
      firebasePublicKeys = await response.json()
      firebaseKeysFetchedAt = now
    }
  } catch (error) {
    console.error('Failed to fetch Firebase public keys:', error)
  }
  return firebasePublicKeys
}

/** Verify password - supports bcrypt and legacy sha256+salt hash stored as "salt:hash" */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false
  // bcrypt hashes start with $2a$ or $2b$
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    const bcrypt = await import('bcryptjs')
    return bcrypt.default.compare(password, stored)
  }
  // Legacy: sha256 with salt stored as "salt:hash"
  if (!stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const check = createHash('sha256').update(password + salt).digest('hex')
  return timingSafeEqual(check, hash)
}

/** Timing-safe string comparison */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/** Generate JWT token */
async function generateToken(payload: {
  sub: string
  name?: string
  email?: string
  role: string
  tenant_id: string
  branch_id?: string | null
}): Promise<string> {
  return new jose.SignJWT({
    sub: payload.sub,
    userId: payload.sub,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenant_id,
    branchId: payload.branch_id ?? undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

// ========================================================================
// POST /login - Username/Password or Firebase Token Login
// ========================================================================
authRoutes.post('/login', rateLimit('login'), zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')

  // === Username/password login ===
  if (body.username && body.password) {
    try {
      const rows = await db.execute(sql`
        SELECT id, username, full_name, email, password_hash, role, tenant_id, branch_id, is_active
        FROM users
        WHERE username = ${body.username}
          AND deleted_at IS NULL
        LIMIT 1
      `) as QueryResultRows<AuthUserRow>

      const dbUser = firstRow(rows)
      
      // 不要洩露帳號是否存在
      if (!dbUser || !dbUser.password_hash) {
        return unauthorized(c, '帳號或密碼錯誤')
      }

      if (!dbUser.is_active) {
        return forbidden(c, '帳號已停用')
      }

      if (!(await verifyPassword(body.password, dbUser.password_hash))) {
        return unauthorized(c, '帳號或密碼錯誤')
      }

      const role = dbUser.role as Role
      const permissions = getUserPermissions(role)

        const jwt = await generateToken({
          sub: dbUser.id,
          name: (dbUser.full_name ?? dbUser.username) ?? undefined,
          email: dbUser.email ?? undefined,
          role: role,
          tenant_id: dbUser.tenant_id,
          branch_id: dbUser.branch_id ?? undefined,
        })

      // Update last_login_at (non-blocking)
      db.execute(sql`UPDATE users SET last_login_at = NOW() WHERE id = ${dbUser.id}`)
        .catch(() => { /* non-critical */ })

      return success(c, {
        token: jwt,
        user: {
          id: dbUser.id,
          name: (dbUser.full_name ?? dbUser.username) ?? undefined,
          email: dbUser.email ?? undefined,
          role: role,
          permissions,
        },
      })
    } catch (err: unknown) {
      console.error('Login DB error:', errorMessage(err))
    return internalError(c, err instanceof Error ? err : undefined)
    }
  }

  // === Firebase token login ===
  if (body.firebaseToken) {
    try {
      // 解碼 header 取得 kid
      const tokenParts = body.firebaseToken.split('.')
      if (tokenParts.length !== 3) {
        return badRequest(c, 'Invalid Firebase token format')
      }

      const header = JSON.parse(
        Buffer.from(tokenParts[0], 'base64url').toString()
      )
      const kid = header.kid

      // 取得 Firebase public keys 並驗證
      const publicKeys = await getFirebasePublicKeys()
      const publicKey = publicKeys[kid]

      if (!publicKey) {
        return unauthorized(c, 'Invalid Firebase token: unknown key')
      }

      // 驗證 Firebase token
      const key = await jose.importX509(publicKey, 'RS256')
      const { payload } = await jose.jwtVerify(body.firebaseToken, key, {
        issuer: `https://securetoken.google.com/${config.FIREBASE_PROJECT_ID || ''}`,
        audience: config.FIREBASE_PROJECT_ID || '',
      })

      // 檢查是否已有綁定用戶
      const rows = await db.execute(sql`
        SELECT id, username, full_name, email, role, tenant_id, branch_id, is_active
        FROM users
        WHERE firebase_uid = ${payload.sub}
          AND deleted_at IS NULL
        LIMIT 1
      `) as QueryResultRows<AuthUserRow>

      const dbUser = firstRow(rows)

      if (dbUser) {
        if (!dbUser.is_active) {
          return forbidden(c, '帳號已停用')
        }

        const role = dbUser.role as Role
        const permissions = getUserPermissions(role)

        const jwt = await generateToken({
          sub: dbUser.id,
          name: (dbUser.full_name ?? dbUser.username) ?? undefined,
          email: dbUser.email ?? undefined,
          role: role,
          tenant_id: dbUser.tenant_id,
          branch_id: dbUser.branch_id ?? undefined,
        })

        return success(c, {
          token: jwt,
          user: {
            id: dbUser.id,
            name: (dbUser.full_name ?? dbUser.username) ?? undefined,
            email: dbUser.email ?? undefined,
            role: role,
            permissions,
          },
        })
      }

      // 建立訪客 token
      const jwt = await generateToken({
        sub: payload.sub as string,
        email: payload.email as string,
        role: 'parent',
        tenant_id: '38068f5a-6bad-4edc-b26b-66bc6ac90fb3', // 預設 tenant
      })

      return success(c, {
        token: jwt,
        user: {
          id: payload.sub,
          email: payload.email,
          role: 'parent',
          permissions: getUserPermissions(Role.PARENT),
        },
        isGuest: true,
      })
    } catch (err: unknown) {
      console.error('Firebase login error:', errorMessage(err))
      if (isJwtExpiredError(err)) {
        return unauthorized(c, 'Firebase token expired')
      }
      return unauthorized(c, 'Invalid Firebase token')
    }
  }

  return badRequest(c, '請提供帳號密碼或 Firebase Token')
})

// ========================================================================
// POST /telegram - Telegram Mini App Auto-Login
// ========================================================================
authRoutes.post('/telegram', zValidator('json', telegramLoginSchema), async (c) => {
  const body = c.req.valid('json')
  const telegramId = body.telegram_id

  try {
    // 1. 嘗試用 telegram_id 找已綁定的 user
    const rows = await db.execute(sql`
      SELECT id, username, full_name, email, role, tenant_id, branch_id, is_active
      FROM users
      WHERE telegram_id = ${String(telegramId)}
        AND deleted_at IS NULL
      LIMIT 1
    `) as QueryResultRows<AuthUserRow>

    const dbUser = firstRow(rows)

    if (dbUser) {
      if (!dbUser.is_active) {
        return forbidden(c, '帳號已停用')
      }

      const role = dbUser.role as Role
      const permissions = getUserPermissions(role)

        const jwt = await generateToken({
          sub: dbUser.id,
          name: (dbUser.full_name ?? dbUser.username) ?? undefined,
          email: dbUser.email ?? undefined,
          role: role,
          tenant_id: dbUser.tenant_id,
          branch_id: dbUser.branch_id ?? undefined,
        })

      return success(c, {
        token: jwt,
        user: {
          id: dbUser.id,
          name: (dbUser.full_name ?? dbUser.username) ?? undefined,
          email: dbUser.email ?? undefined,
          role: role,
          permissions,
        },
      })
    }

    // 2. 未綁定的 Telegram 用戶 → 建立訪客 token (parent role, 唯讀)
    const guestName = [body.first_name, body.last_name].filter(Boolean).join(' ') || `TG${telegramId}`

    const jwt = await generateToken({
      sub: `tg-${telegramId}`,
      name: guestName,
      role: 'parent',
      tenant_id: '11111111-1111-1111-1111-111111111111',
      branch_id: 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d',
    })

    return success(c, {
      token: jwt,
      user: {
        id: `tg-${telegramId}`,
        name: guestName,
        role: 'parent',
        permissions: getUserPermissions(Role.PARENT),
      },
      isGuest: true,
    })
  } catch (err: unknown) {
    console.error('Telegram login error:', errorMessage(err))
    return internalError(c, err instanceof Error ? err : undefined)
  }
})

// ========================================================================
// POST /trial-signup - Apply for 30-day Trial
// ========================================================================
authRoutes.post('/trial-signup', rateLimit('trial-signup'), zValidator('json', trialSignupSchema), async (c) => {
  const body = c.req.valid('json')
  
  try {
    // Check if slug already exists
    const existing = firstRow(await db.execute(sql`
      SELECT id FROM tenants WHERE slug = ${body.tenantSlug}
    `) as QueryResultRows<TenantLookupRow>)
    
    if (existing) {
      return badRequest(c, 'This URL is already taken. Please choose another.')
    }
    
    // Check if email already registered
    const existingEmail = firstRow(await db.execute(sql`
      SELECT id FROM users WHERE email = ${body.adminEmail}
    `) as QueryResultRows<TenantLookupRow>)
    
    if (existingEmail) {
      return badRequest(c, 'This email is already registered.')
    }
    
    // Create tenant with pending trial status
    const tenantId = generateId()
    const userId = generateId()
    const now = new Date().toISOString()
    
    // Hash password with bcrypt
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.default.hash(body.password, 10)
    
    // Create tenant
    await db.execute(sql`
      INSERT INTO tenants (id, name, slug, plan, trial_status, active, created_at, updated_at)
      VALUES (${tenantId}, ${body.tenantName}, ${body.tenantSlug}, 'free', 'pending', true, ${now}, ${now})
    `)
    
    // Create default branch
    const branchId = generateId()
    await db.execute(sql`
      INSERT INTO branches (id, tenant_id, name, code, created_at)
      VALUES (${branchId}, ${tenantId}, ${body.tenantName}, ${body.tenantSlug}, ${now})
    `)
    
    // Create admin user
    await db.execute(sql`
      INSERT INTO users (id, tenant_id, branch_id, full_name, email, phone, password_hash, role, is_active, created_at, updated_at)
      VALUES (${userId}, ${tenantId}, ${branchId}, ${body.adminName}, ${body.adminEmail}, ${body.adminPhone || null}, ${passwordHash}, 'admin', true, ${now}, ${now})
    `)
    
    return success(c, {
      message: 'Trial application submitted! We will review and get back to you within 24 hours.',
      tenantId,
    })
  } catch (err: unknown) {
    console.error('Trial signup error:', errorMessage(err))
    return internalError(c, err instanceof Error ? err : undefined)
  }
})

// ========================================================================
// GET /me - Get Current User Info
// ========================================================================
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(c, 'Missing Bearer token')
  }

  const token = authHeader.slice(7)
  try {
    const { payload } = await jose.jwtVerify(token, secret)
    const role = payload.role as Role
    const permissions = getUserPermissions(role)
    
    return success(c, {
      user: {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: role,
        tenant_id: (payload.tenantId as string) || (payload.tenant_id as string),
        branch_id: (payload.branchId as string) || (payload.branch_id as string),
      },
      permissions,
    })
  } catch (err: unknown) {
    if (isJwtExpiredError(err)) {
      return unauthorized(c, 'Token expired')
    }
    return unauthorized(c, 'Invalid token')
  }
})

// Seed endpoint - creates initial admin user
authRoutes.post('/seed', async (c) => {
  if (config.NODE_ENV === 'production') {
    return forbidden(c, 'Seed endpoint disabled in production')
  }

  try {
    // Check if admin already exists
    const existing = firstRow(await db.execute(sql`
      SELECT id FROM users WHERE username = 'admin' LIMIT 1
    `))

    if (existing) {
      return success(c, { message: 'Admin user already exists', userId: existing.id })
    }

    // Create default tenant
    const tenantId = generateId()
    await db.execute(sql`
      INSERT INTO tenants (id, name, status, created_at)
      VALUES (${tenantId}, 'Default Tenant', 'active', NOW())
    `)

    // Create admin user with bcrypt password hash
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.default.hash('admin123', 10)

    const userId = generateId()
    await db.execute(sql`
      INSERT INTO users (id, tenant_id, username, full_name, email, role, password_hash, is_active, created_at)
      VALUES (${userId}, ${tenantId}, 'admin', '系統管理員', 'admin@94cram.app', 'superadmin', ${passwordHash}, true, NOW())
    `)

    return success(c, { message: 'Admin user created', userId, tenantId })
  } catch (error) {
    console.error('Seed error:', error)
    return internalError(c, error instanceof Error ? error : undefined)
  }
})

// ========================================================================
// POST /demo - Direct demo login (no DB required, generates JWT directly)
// ========================================================================
authRoutes.post('/demo', async (c) => {
  const DEMO_TENANT_1 = '11111111-1111-1111-1111-111111111111'
  const DEMO_TENANT_2 = '22222222-2222-2222-2222-222222222222'
  const BRANCH_1 = 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d'
  const BRANCH_2 = 'b2c3d4e5-f6a7-2b3c-9d4e-5f6a7b8c9d0e'

  const DEMO_ACCOUNTS: Record<string, { id: string; name: string; role: Role; tenantId: string; branchId: string }> = {
    boss:     { id: 'demo-boss',     name: 'Demo 館長',  role: Role.ADMIN,   tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
    staff:    { id: 'demo-staff',    name: 'Demo 行政',  role: Role.STAFF,   tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
    teacher2: { id: 'demo-teacher',  name: 'Demo 教師',  role: Role.TEACHER, tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
    parent2:  { id: 'demo-parent',   name: 'Demo 家長',  role: Role.PARENT,  tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
    student:  { id: 'demo-student',  name: 'Demo 學生',  role: Role.STUDENT, tenantId: DEMO_TENANT_1, branchId: BRANCH_1 },
    boss2:    { id: 'demo-boss2',    name: 'Demo 館長2', role: Role.ADMIN,   tenantId: DEMO_TENANT_2, branchId: BRANCH_2 },
  }

  try {
    const body = await c.req.json<{ username?: string }>().catch(() => ({ username: undefined }))
    const username = body.username || 'boss'
    const account = DEMO_ACCOUNTS[username]

    if (!account) {
      return badRequest(c, `Unknown demo account: ${username}`)
    }

    const permissions = getUserPermissions(account.role)
    const jwt = await generateToken({
      sub: account.id,
      name: account.name,
      email: `${username}@demo.94cram.com`,
      role: account.role,
      tenant_id: account.tenantId,
      branch_id: account.branchId,
    })

    return success(c, {
      token: jwt,
      user: {
        id: account.id,
        name: account.name,
        email: `${username}@demo.94cram.com`,
        role: account.role,
        tenant_id: account.tenantId,
        branch_id: account.branchId,
        permissions,
      },
    })
  } catch (error) {
    console.error('Demo login error:', error)
    return internalError(c, error instanceof Error ? error : undefined)
  }
})
