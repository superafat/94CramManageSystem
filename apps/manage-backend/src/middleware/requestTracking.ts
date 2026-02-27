import { Context, Next } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { createChildLogger } from '../utils/logger'

// Request tracking middleware - adds requestId to context
export async function requestTrackingMiddleware(c: Context, next: Next) {
  const requestId = c.req.header('x-request-id') || uuidv4()
  
  // Set requestId in context for later use
  c.set('requestId', requestId)
  
  // Create a child logger with requestId
  const logger = createChildLogger({ requestId })
  c.set('logger', logger)
  
  // Log incoming request
  logger.info({
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
  }, 'Incoming request')
  
  const startTime = Date.now()
  
  await next()
  
  // Log response
  const duration = Date.now() - startTime
  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${duration}ms`,
  }, 'Request completed')
  
  // Add requestId to response header
  c.res.headers.set('x-request-id', requestId)
}
