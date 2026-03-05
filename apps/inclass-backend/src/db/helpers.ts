/**
 * Drizzle raw SQL result helpers
 * node-postgres returns { rows: T[] }, postgres-js returns array-like RowList.
 * These helpers normalise both into plain arrays.
 */

export type QueryResult = Record<string, unknown>

/** Normalise a drizzle execute() result into a typed array */
export const rows = <T = QueryResult>(result: unknown): T[] =>
  Array.isArray(result) ? (result as T[]) : ((result as { rows?: T[] })?.rows ?? [])

/** Return the first row (or undefined) */
export const first = <T = QueryResult>(result: unknown): T | undefined =>
  rows<T>(result)[0]
