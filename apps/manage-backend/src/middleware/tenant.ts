import type { Context, Next } from 'hono'
import { db } from '../db'
import { tenants } from '../db/schema'
import { eq } from 'drizzle-orm'

// Default tenant for demo/dev
const DEFAULT_TENANT_ID = '38068f5a-6bad-4edc-b26b-66bc6ac90fb3' // 補習班

/**
 * Tenant middleware: extracts tenant_id from JWT, header, or query param.
 * Sets c.set('tenantId', ...) for downstream use.
 */
export async function tenantMiddleware(c: Context, next: Next) {
  // Priority: JWT claim > X-Tenant-Id header > query param > default
  let tenantId: string | undefined

  // 1. From JWT (if authenticated)
  const jwtPayload = c.get('jwtPayload') as { tenantId?: string } | undefined
  if (jwtPayload?.tenantId) {
    tenantId = jwtPayload.tenantId
  }

  // 2. From header
  if (!tenantId) {
    tenantId = c.req.header('X-Tenant-Id') ?? undefined
  }

  // 3. From query param
  if (!tenantId) {
    tenantId = c.req.query('tenantId') ?? undefined
  }

  // 4. Default
  if (!tenantId) {
    tenantId = DEFAULT_TENANT_ID
  }

  c.set('tenantId', tenantId)
  await next()
}

/** Helper to get tenantId from context */
export function getTenantId(c: Context): string {
  return c.get('tenantId') ?? DEFAULT_TENANT_ID
}
