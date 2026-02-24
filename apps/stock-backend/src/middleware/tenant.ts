import type { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import { tenants } from '@94cram/shared/db'
import { db } from '../db'

// 預設的測試 tenantId (沿用 94Manage)
const DEFAULT_TENANT_ID = '38068f5a-6bad-4edc-b26b-66bc6ac90fb3'

/**
 * Tenant middleware: extracts tenant_id from JWT, header, or query param.
 * Sets c.set('tenantId', ...) for downstream use.
 */
export async function tenantMiddleware(c: Context, next: Next) {
  let tenantId: string | undefined

  // 1. From JWT
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

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId))
  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404)
  }

  c.set('tenantId', tenantId)
  await next()
}

/** Helper to get tenantId from context */
export function getTenantId(c: Context): string {
  return c.get('tenantId') as string ?? DEFAULT_TENANT_ID
}
