/**
 * Shared helper functions and re-exports for admin route modules
 */
import type { Context } from 'hono'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { logger } from '../../utils/logger'
import {
  success,
  successWithPagination,
  badRequest,
  notFound,
  forbidden,
  internalError,
} from '../../utils/response'

export { db, sql, logger, success, successWithPagination, badRequest, notFound, forbidden, internalError }

export { type QueryResult, rows, first, isUUID, getUserBranchId } from '../../db/helpers'
import { first as _first } from '../../db/helpers'

export const isBranchInTenant = async (branchId: string, tenantId: string): Promise<boolean> => {
  const result = await db.execute(sql`
    SELECT 1
    FROM branches
    WHERE id = ${branchId} AND tenant_id = ${tenantId}
    LIMIT 1
  `)
  return Boolean(_first(result))
}

/** Check if request wants markdown response */
export function wantsMd(c: Context): boolean {
  const accept = c.req.header('Accept') ?? ''
  return accept.includes('text/markdown') || c.req.query('format') === 'md'
}

/** Send markdown response */
export function mdResponse(c: Context, text: string) {
  return c.text(text, 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
}
