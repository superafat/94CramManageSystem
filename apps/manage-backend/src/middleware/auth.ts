/**
 * JWT Authentication Middleware
 * 使用 @94cram/shared/auth 統一驗證
 * 保留 RBAC（getUserPermissions）
 */
import type { Context, Next } from 'hono'
import { verify, extractToken, hasSystemAccess, type JWTPayload } from '@94cram/shared/auth'
import { db } from '../db'
import { sql } from 'drizzle-orm'
import { getUserPermissions, Role, type RBACVariables } from './rbac'
import { logger } from '../utils/logger'

interface AuthVariables extends RBACVariables {
  tenantId: string
  jwtPayload: JWTPayload
}

interface AuthenticatedUser {
  id: string
  tenant_id: string
  branch_id: string | null
  email: string
  name: string
  role: Role
}

type QueryResultRows<T> = T[] | { rows?: T[] }

type AuthUserRow = {
  id: string
  username: string | null
  full_name: string | null
  email: string | null
  role: string
  tenant_id: string | null
  branch_id: string | null
  is_active: boolean
}

function firstRow<T>(result: QueryResultRows<T>): T | null {
  if (Array.isArray(result)) return result[0] ?? null
  return result.rows?.[0] ?? null
}

async function getActiveUser(userId: string): Promise<AuthUserRow | null> {
  return firstRow(await db.execute(sql`
    SELECT id, username, full_name, email, role, tenant_id, branch_id, is_active
    FROM users
    WHERE id = ${userId}
      AND deleted_at IS NULL
    LIMIT 1
  `) as QueryResultRows<AuthUserRow>)
}

async function hasDbSystemEntitlement(userId: string, tenantId: string, systemKey: string): Promise<boolean> {
  const entitlement = firstRow(await db.execute(sql`
    SELECT id
    FROM user_system_entitlements
    WHERE user_id = ${userId}
      AND tenant_id = ${tenantId}
      AND system_key = ${systemKey}
      AND status = 'active'
    LIMIT 1
  `) as QueryResultRows<{ id: string }>)

  return Boolean(entitlement)
}

/**
 * Middleware: require valid JWT, populate user + permissions
 */
export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const token = extractToken(c)
  if (!token) {
    return c.json({ error: 'Unauthorized: Missing token' }, 401)
  }

  try {
    const payload = await verify(token)
    const userId = payload.userId || payload.sub || ''

    if (!payload.tenantId || !userId) {
      return c.json({ error: 'Unauthorized: Missing tenant context' }, 401)
    }

    const dbUser = await getActiveUser(userId)
    if (!dbUser || !dbUser.is_active) {
      return c.json({ error: 'Unauthorized: User not found or inactive' }, 401)
    }

    if (!hasSystemAccess(payload, 'manage', { allowLegacyNoSystems: false }) && dbUser.role !== Role.SUPERADMIN) {
      return c.json({ error: 'Forbidden: Missing manage system access' }, 403)
    }

    if (dbUser.role !== Role.SUPERADMIN && !(await hasDbSystemEntitlement(dbUser.id, payload.tenantId, 'manage'))) {
      return c.json({ error: 'Forbidden: Missing manage system access' }, 403)
    }

    const user: AuthenticatedUser = {
      id: dbUser.id,
      tenant_id: payload.tenantId,
      branch_id: dbUser.branch_id,
      email: dbUser.email || payload.email || '',
      name: (dbUser.full_name ?? dbUser.username) || payload.name || '',
      role: (dbUser.role as Role) || Role.PARENT
    }

    const permissions = getUserPermissions(user.role)
    c.set('jwtPayload', payload)
    c.set('user', user)
    c.set('permissions', permissions)
    c.set('tenantId', user.tenant_id)

    await next()
  } catch {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401)
  }
}

/**
 * Optional auth — sets user if token present, continues anyway
 */
export async function optionalAuth(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const token = extractToken(c)
  if (token) {
    try {
      const payload = await verify(token)
      const userId = payload.userId || payload.sub || ''
      if (payload.tenantId && userId) {
        const dbUser = await getActiveUser(userId)
        if (!dbUser || !dbUser.is_active) {
          await next()
          return
        }
        if (!hasSystemAccess(payload, 'manage', { allowLegacyNoSystems: false }) && dbUser.role !== Role.SUPERADMIN) {
          await next()
          return
        }
        if (dbUser.role !== Role.SUPERADMIN && !(await hasDbSystemEntitlement(dbUser.id, payload.tenantId, 'manage'))) {
          await next()
          return
        }
        const user: AuthenticatedUser = {
          id: dbUser.id,
          tenant_id: payload.tenantId,
          branch_id: dbUser.branch_id,
          email: dbUser.email || payload.email || '',
          name: (dbUser.full_name ?? dbUser.username) || payload.name || '',
          role: (dbUser.role as Role) || Role.PARENT
        }
        c.set('jwtPayload', payload)
        c.set('user', user)
        c.set('permissions', getUserPermissions(user.role))
        c.set('tenantId', user.tenant_id)
      }
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)) }, '[optionalAuth] Ignoring invalid token')
    }
  }
  await next()
}
