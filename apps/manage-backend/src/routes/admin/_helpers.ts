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

export type QueryResult = Record<string, unknown>

/** Check if string is a valid UUID (guest tokens like tg-xxx are not) */
export const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export const getUserBranchId = (user: unknown): string | null => {
  if (!user || typeof user !== 'object') return null
  const branchId = (user as { branch_id?: unknown }).branch_id
  return typeof branchId === 'string' && isUUID(branchId) ? branchId : null
}

/** Convert result to array */
export const rows = (result: unknown): QueryResult[] =>
  Array.isArray(result) ? (result as QueryResult[]) : ((result as { rows?: QueryResult[] })?.rows ?? [])

export const first = (result: unknown): QueryResult | undefined => rows(result)[0]

export const isBranchInTenant = async (branchId: string, tenantId: string): Promise<boolean> => {
  const result = await db.execute(sql`
    SELECT 1
    FROM branches
    WHERE id = ${branchId} AND tenant_id = ${tenantId}
    LIMIT 1
  `)
  return Boolean(first(result))
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
