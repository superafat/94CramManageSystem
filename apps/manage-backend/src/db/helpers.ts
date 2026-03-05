/**
 * Drizzle raw SQL result helpers
 * Centralised rows/first to eliminate `as any[]` casts across the codebase.
 *
 * postgres-js returns an array-like RowList, node-postgres returns { rows: T[] }.
 * These helpers normalise both into plain arrays.
 */

export type QueryResult = Record<string, unknown>

/** Normalise a drizzle execute() result into a typed array */
export const rows = <T = QueryResult>(result: unknown): T[] =>
  Array.isArray(result) ? (result as T[]) : ((result as { rows?: T[] })?.rows ?? [])

/** Return the first row (or undefined) */
export const first = <T = QueryResult>(result: unknown): T | undefined =>
  rows<T>(result)[0]

/** Check if string is a valid UUID (guest tokens like tg-xxx are not) */
export const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

/** Safely extract branch_id from user object (may come from raw SQL join) */
export const getUserBranchId = (user: unknown): string | null => {
  if (!user || typeof user !== 'object') return null
  const branchId = (user as { branch_id?: unknown }).branch_id
  return typeof branchId === 'string' && isUUID(branchId) ? branchId : null
}
