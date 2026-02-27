import type { Context } from 'hono'
import { logger } from '../utils/logger'

export function withErrorHandler(handler: (c: Context) => Promise<any>) {
  return async (c: Context) => {
    try {
      return await handler(c)
    } catch (err) {
      try {
        logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[GlobalError] Unhandled error in request handler')
      } catch (e) {
        // ignore logger errors
      }
      // Don't expose error details to callers. Return generic OK to webhook provider to avoid retries.
      try {
        return c.json({ ok: true })
      } catch (e) {
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
    }
  }
}
