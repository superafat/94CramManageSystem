/**
 * Shared helpers for platform routes
 */

export type AnyRow = Record<string, unknown>

export function getRows(result: unknown): AnyRow[] {
  if (Array.isArray(result)) return result as AnyRow[]
  return ((result as { rows?: unknown[] })?.rows ?? []) as AnyRow[]
}
