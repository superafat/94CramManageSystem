/**
 * Platform Auth Routes - 總後台認證 API
 *
 * POST /login  — superadmin 登入
 * POST /logout — 登出
 * GET  /me     — 取得目前使用者資訊（需 JWT + SUPERADMIN）
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import * as jose from 'jose'
import bcrypt from 'bcryptjs'
import { setAuthCookie, setRefreshCookie, extractToken, signRefreshToken } from '@94cram/shared/auth'
import { config } from '../../config'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { getUserPermissions, Role } from '../../middleware/rbac'
import type { RBACVariables } from '../../middleware/rbac'
import { authMiddleware } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import { createHash } from 'crypto'
import {
  success,
  unauthorized,
  forbidden,
  internalError,
} from '../../utils/response'
import { logger } from '../../utils/logger'

export const platformAuthRoutes = new Hono<{ Variables: RBACVariables }>()

// ===== Types =====

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

function firstRow<T>(result: QueryResultRows<T>): T | null {
  if (Array.isArray(result)) return result[0] ?? null
  return result.rows?.[0] ?? null
}

// ===== Helpers =====

const secret = new TextEncoder().encode(config.JWT_SECRET)

/** Verify password - supports bcrypt and legacy sha256+salt */
async function verifyPassword(password: string, stored: string): Promise<{ valid: boolean; isLegacy: boolean }> {
  if (!stored) return { valid: false, isLegacy: false }
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    const valid = await bcrypt.compare(password, stored)
    return { valid, isLegacy: false }
  }
  if (!stored.includes(':')) return { valid: false, isLegacy: false }
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return { valid: false, isLegacy: false }
  const check = createHash('sha256').update(password + salt).digest('hex')
  return { valid: timingSafeEqual(check, hash), isLegacy: true }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/** Generate JWT token for platform superadmin */
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
    .setExpirationTime('1h')
    .sign(secret)
}

/** Set both access + refresh token cookies */
async function setAuthTokens(c: import('hono').Context, accessToken: string, userId: string, tenantId: string) {
  setAuthCookie(c, accessToken)
  const refreshToken = await signRefreshToken({ userId, tenantId })
  setRefreshCookie(c, refreshToken)
}

// ===== Validation Schema =====

const platformLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// ========================================================================
// POST /login - Platform Superadmin Login
// ========================================================================
platformAuthRoutes.post('/login', zValidator('json', platformLoginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  try {
    const rows = await db.execute(sql`
      SELECT id, username, full_name, email, password_hash, role, tenant_id, branch_id, is_active
      FROM users
      WHERE email = ${email}
        AND deleted_at IS NULL
      LIMIT 1
    `) as QueryResultRows<AuthUserRow>

    const dbUser = firstRow(rows)

    // 不洩露帳號是否存在
    if (!dbUser || !dbUser.password_hash) {
      return unauthorized(c, '帳號或密碼錯誤')
    }

    if (!dbUser.is_active) {
      return forbidden(c, '帳號已停用')
    }

    // 驗證密碼
    const { valid } = await verifyPassword(password, dbUser.password_hash)
    if (!valid) {
      return unauthorized(c, '帳號或密碼錯誤')
    }

    // 額外檢查：必須是 superadmin
    if (dbUser.role !== Role.SUPERADMIN) {
      return forbidden(c, '權限不足，此入口僅供超級管理員使用')
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

    await setAuthTokens(c, jwt, dbUser.id, dbUser.tenant_id)
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
    logger.error({ err }, 'Platform login error')
    return internalError(c, err instanceof Error ? err : undefined)
  }
})

// ========================================================================
// POST /logout - Clear auth cookie
// ========================================================================
platformAuthRoutes.post('/logout', async (c) => {
  return success(c, { message: '已登出' })
})

// ========================================================================
// POST /seed - Create initial superadmin account (one-time setup)
// ========================================================================
platformAuthRoutes.post('/seed', async (c) => {
  try {
    // 檢查是否已有 superadmin
    const existing = firstRow(await db.execute(sql`
      SELECT id FROM users WHERE role = 'superadmin' AND deleted_at IS NULL LIMIT 1
    `) as QueryResultRows<{ id: string }>)

    if (existing) {
      return success(c, { message: 'Superadmin 帳號已存在，無需重複建立' })
    }

    // 建立平台 tenant
    const tenantId = crypto.randomUUID()
    await db.execute(sql`
      INSERT INTO tenants (id, name, slug, plan, active, created_at, updated_at)
      VALUES (${tenantId}, '94cram 平台', 'platform', 'enterprise', true, NOW(), NOW())
      ON CONFLICT (slug) DO UPDATE SET name = '94cram 平台'
    `)

    // 取得 platform tenant id（可能已存在）
    const tenantRow = firstRow(await db.execute(sql`
      SELECT id FROM tenants WHERE slug = 'platform' LIMIT 1
    `) as QueryResultRows<{ id: string }>)
    const finalTenantId = tenantRow?.id ?? tenantId

    // 建立 superadmin 帳號
    const userId = crypto.randomUUID()
    const email = 'superafatus@gmail.com'
    const defaultPassword = 'Smart123!?'
    const passwordHash = await bcrypt.hash(defaultPassword, 12)

    await db.execute(sql`
      INSERT INTO users (id, tenant_id, username, full_name, email, role, password_hash, is_active, created_at, updated_at)
      VALUES (${userId}, ${finalTenantId}, 'superadmin', '平台管理員', ${email}, 'superadmin', ${passwordHash}, true, NOW(), NOW())
    `)

    logger.info({ userId, email }, 'Platform superadmin account created')

    return success(c, {
      message: 'Superadmin 帳號建立成功',
      credentials: {
        email,
        password: defaultPassword,
        note: '請登入後立即修改密碼',
      },
    })
  } catch (err: unknown) {
    logger.error({ err }, 'Platform seed error')
    return internalError(c, err instanceof Error ? err : undefined)
  }
})

// ========================================================================
// GET /me - Get Current Superadmin User Info (requires auth + SUPERADMIN)
// ========================================================================
platformAuthRoutes.get('/me', authMiddleware, requireRole(Role.SUPERADMIN), async (c) => {
  const user = c.get('user')
  const permissions = getUserPermissions(user.role)

  return success(c, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    },
    permissions,
  })
})
