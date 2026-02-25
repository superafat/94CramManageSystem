import type { Context, Next } from 'hono'
import { eq } from 'drizzle-orm'
import { tenants } from '@94cram/shared/db'
import { db } from '../db'

const DEFAULT_TENANT_ID = '38068f5a-6bad-4edc-b26b-66bc6ac90fb3'

export async function tenantMiddleware(c: Context, next: Next) {
  let tenantId: string | undefined

  // 1. From JWT — authoritative source, cannot be overridden
  const jwtPayload = c.get('jwtPayload') as { tenantId?: string } | undefined
  if (jwtPayload?.tenantId) {
    tenantId = jwtPayload.tenantId
  } else {
    // Only allow header/query/default for unauthenticated routes (e.g. bot, internal)
    tenantId = c.req.header('X-Tenant-Id') ?? c.req.query('tenantId') ?? DEFAULT_TENANT_ID
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId))
  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404)
  }

  c.set('tenantId', tenantId)
  await next()
}

export function getTenantId(c: Context): string {
  return c.get('tenantId') as string ?? DEFAULT_TENANT_ID
}
