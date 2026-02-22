import { Context, Next } from 'hono'
import { createChildLogger } from '../utils/logger'

// Performance monitoring middleware - tracks request duration and logs slow requests
export async function performanceMiddleware(c: Context, next: Next) {
  const startTime = Date.now()
  const logger = c.get('logger') || createChildLogger({})
  
  await next()
  
  const duration = Date.now() - startTime
  const threshold = 1000 // 1 second threshold for slow requests
  
  // Log slow requests
  if (duration > threshold) {
    logger.warn('Slow request detected', {
      method: c.req.method,
      path: c.req.path,
      duration: `${duration}ms`,
      status: c.res.status,
    })
  }
  
  // Add performance timing to response header
  c.res.headers.set('x-response-time', `${duration}ms`)
}
