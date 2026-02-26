import type { Context } from 'hono'

export function withErrorHandler(handler: (c: Context) => Promise<any>) {
  return async (c: Context) => {
    try {
      return await handler(c)
    } catch (err) {
      try {
        console.error('[GlobalError] Unhandled error in request handler:', err)
      } catch (e) {
        // ignore console errors
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
