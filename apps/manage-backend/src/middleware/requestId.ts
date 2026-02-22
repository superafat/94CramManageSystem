import { Context, Next } from 'hono'
import { v4 as uuidv4 } from 'uuid'

// Request ID middleware - generates and tracks request ID
export async function requestIdMiddleware(c: Context, next: Next) {
  // Use existing request ID from header or generate new one
  const requestId = c.req.header('X-Request-ID') || uuidv4()
  
  // Set requestId in context for downstream use
  c.set('requestId', requestId)
  
  await next()
  
  // Add X-Request-ID to response header
  c.res.headers.set('X-Request-ID', requestId)
}
