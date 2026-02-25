/**
 * JWT Authentication Middleware
 * 使用 @94cram/shared/auth 統一驗證
 * 保留 RBAC（getUserPermissions）
 */
import type { Context, Next } from 'hono'
import { verify, extractToken } from '@94cram/shared/auth'
import { getUserPermissions, Role, type RBACVariables } from './rbac'

interface AuthVariables extends RBACVariables {
  tenantId: string
}

interface AuthenticatedUser {
  id: string
  tenant_id: string
  branch_id: string | null
  email: string
  name: string
  role: Role
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

    if (!payload.tenantId) {
      return c.json({ error: 'Unauthorized: Missing tenant context' }, 401)
    }

    const user: AuthenticatedUser = {
      id: payload.userId || payload.sub || '',
      tenant_id: payload.tenantId,
      branch_id: null,
      email: payload.email || '',
      name: payload.name || '',
      role: (payload.role as Role) || Role.PARENT
    }

    const permissions = getUserPermissions(user.role)
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
      if (payload.tenantId) {
        const user: AuthenticatedUser = {
          id: payload.userId || payload.sub || '',
          tenant_id: payload.tenantId,
          branch_id: null,
          email: payload.email || '',
          name: payload.name || '',
          role: (payload.role as Role) || Role.PARENT
        }
        c.set('user', user)
        c.set('permissions', getUserPermissions(user.role))
        c.set('tenantId', user.tenant_id)
      }
    } catch {
      // Token 無效 — 繼續但不設 user
    }
  }
  await next()
}
