/**
 * JWT Authentication Middleware
 * Verifies Bearer token → sets c.var.user + c.var.permissions
 */
import type { Context, Next } from 'hono'
import * as jose from 'jose'
import { config } from '../config'
import { getUserPermissions, Role, type RBACVariables } from './rbac'

const secret = new TextEncoder().encode(config.JWT_SECRET)

interface AuthVariables extends RBACVariables {
  tenantId: string
}

/**
 * Middleware: require valid JWT, populate user + permissions
 */
export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing Bearer token' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const { payload } = await jose.jwtVerify(token, secret)

    const user = {
      id: payload.sub as string,
      tenant_id: (payload.tenant_id as string) || '38068f5a-6bad-4edc-b26b-66bc6ac90fb3',
      branch_id: (payload.branch_id as string) || null,
      email: (payload.email as string) || '',
      name: (payload.name as string) || '',
      role: (payload.role as Role) || Role.PARENT,
    }

    const permissions = getUserPermissions(user.role)
    c.set('user', user as any)
    c.set('permissions', permissions)

    // Also set tenantId for backward compat with getTenantId()
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
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { payload } = await jose.jwtVerify(token, secret)
      const user = {
        id: payload.sub as string,
        tenant_id: (payload.tenant_id as string) || '38068f5a-6bad-4edc-b26b-66bc6ac90fb3',
        branch_id: (payload.branch_id as string) || null,
        email: (payload.email as string) || '',
        name: (payload.name as string) || '',
        role: (payload.role as Role) || Role.PARENT,
      }
      c.set('user', user as any)
      c.set('permissions', getUserPermissions(user.role))
      c.set('tenantId', user.tenant_id)
    } catch {
      // Token invalid — continue without user
    }
  }
  await next()
}
