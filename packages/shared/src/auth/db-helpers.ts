/**
 * Shared DB helpers for auth middleware
 * Eliminates duplication across manage / inclass / stock / bot backends
 */
import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

type QueryResultRows<T> = T[] | { rows?: T[] }

/** Minimal interface satisfied by any drizzle db instance */
interface DbExecutor {
  execute: (query: SQL<unknown>) => Promise<unknown>
}

export function firstRow<T>(result: QueryResultRows<T>): T | null {
  if (Array.isArray(result)) return result[0] ?? null
  return result.rows?.[0] ?? null
}

export async function hasDbSystemEntitlement(
  db: DbExecutor,
  userId: string,
  tenantId: string,
  systemKey: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT id
    FROM user_system_entitlements
    WHERE user_id = ${userId}
      AND tenant_id = ${tenantId}
      AND system_key = ${systemKey}
      AND status = 'active'
    LIMIT 1
  `)
  return Boolean(firstRow(result as QueryResultRows<{ id: string }>))
}
