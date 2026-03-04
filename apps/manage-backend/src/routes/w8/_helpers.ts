/**
 * Shared helper functions and re-exports for w8 route modules
 */
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
  conflict,
} from '../../utils/response'

export { db, sql, logger, success, successWithPagination, badRequest, notFound, forbidden, internalError, conflict }

export type QueryResult = Record<string, unknown>

/** Check if string is a valid UUID */
export const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export const getUserBranchId = (user: unknown): string | null => {
  if (!user || typeof user !== 'object') return null
  const branchId = (user as { branch_id?: unknown }).branch_id
  return typeof branchId === 'string' && isUUID(branchId) ? branchId : null
}

/** Convert result to typed array */
export const rows = <T = QueryResult>(result: unknown): T[] =>
  Array.isArray(result) ? (result as T[]) : ((result as { rows?: T[] })?.rows ?? [])

export const first = <T = QueryResult>(result: unknown): T | undefined => rows<T>(result)[0]
