import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { compress } from 'hono/compress'
import { bodyLimit } from 'hono/body-limit'
import { timingSafeEqual } from 'node:crypto'
import { botRoutes } from './routes/bot'
import { authRoutes, handleDemoLogin } from './routes/auth'
import { adminRoutes } from './routes/admin'
import usersRoutes from './routes/users'
import { demoRoutes } from './routes/demo'
import { w8Routes } from './routes/w8'
import notificationRoutes from './routes/notifications'
import lineRoutes from './routes/line'
import { errorTestRoutes } from './routes/error-test'
import { healthRoutes } from './routes/health'
import internalRoutes from './routes/internal'
import parentExtRoutes from './routes/parent-ext'
import botExtRoutes from './routes/bot-ext'
import { errorHandler } from './middleware/errorHandler'
import { tenantMiddleware } from './middleware/tenant'
import { requestTrackingMiddleware } from './middleware/requestTracking'
import { checkRateLimit, getClientIP } from '@94cram/shared/middleware'
import { runMigrations } from './db/startup-migrations'
import { checkDatabaseHealth, getDatabaseMetrics, db } from './db'
import { sql } from 'drizzle-orm'
import { initializeEventSystem } from './events'
import { createSuccessResponse } from './types/api-response'
import { logger } from './utils/logger'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// Run migrations on startup
runMigrations().catch((err) => logger.error({ err }, 'Migration failed'))

// Initialize event system
initializeEventSystem()

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || ''
const gcpOrigin = (service: string) => `https://${service}-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

export const app = new Hono()

// Security headers
app.use('*', secureHeaders())

// Performance: gzip compression
app.use('*', compress())

// Body size limit: 1MB default for API
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }))

// Global error handler using onError
app.onError((error, context) => errorHandler(error, context))

// Request tracking middleware (adds requestId and logger to context)
app.use('*', requestTrackingMiddleware)

app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3200',
    'http://localhost:3201',
    'http://localhost:3300',
    'http://localhost:5173',
    'https://94homework.com',
    'https://94manage-miniapp-855393865280.asia-east1.run.app',
    'https://94manage-dashboard-855393865280.asia-east1.run.app',
    // 新的 Cloud Run URLs (cram94- 前綴)
    gcpOrigin('cram94-manage-dashboard'),
    gcpOrigin('cram94-manage-backend'),
    gcpOrigin('cram94-inclass-dashboard'),
    gcpOrigin('cram94-inclass-backend'),
    gcpOrigin('cram94-stock-dashboard'),
    gcpOrigin('cram94-stock-backend'),
    gcpOrigin('cram94-portal'),
    // Custom domains (94cram.app)
    'https://manage.94cram.app',
    'https://inclass.94cram.app',
    'https://stock.94cram.app',
    // Custom domains (94cram.com)
    'https://manage.94cram.com',
    'https://inclass.94cram.com',
    'https://stock.94cram.com',
    'https://94cram.com',
  ],
  maxAge: 86400,
}))

// Demo login — only available in non-production environments
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/auth/demo', (c) => handleDemoLogin(c))
}

// Global rate limiting (100 requests/min)
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  const ip = getClientIP(c)
  const result = await checkRateLimit(`api:${ip}`, { maxRequests: 100 })
  if (!result.allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }
  await next()
})

app.use('/api/*', tenantMiddleware)

// Health check — no middleware overhead
app.get('/health', (c) => c.json(createSuccessResponse({ status: 'ok', ts: Date.now() })))

// Database health check with metrics
app.get('/health/db', async (c) => {
  const health = await checkDatabaseHealth()
  const metrics = getDatabaseMetrics()
  
  return c.json(createSuccessResponse({
    ...health,
    metrics: {
      totalQueries: metrics.totalQueries,
      slowQueries: metrics.slowQueries,
      timeouts: metrics.timeouts,
      errors: metrics.errors,
      avgQueryTime: Math.round(metrics.avgQueryTime),
      activeConnections: metrics.activeConnections,
      reconnections: metrics.reconnections,
      poolConfig: metrics.poolConfig,
      healthStatus: metrics.healthStatus
    },
    timestamp: Date.now()
  }))
})

// Health check routes (public, no auth)
app.route('/api/health', healthRoutes)
app.route('/api/internal', internalRoutes)
app.route('/api/parent-ext', parentExtRoutes)

// LINE webhook (public, no auth, no tenant middleware)
app.route('/api/line', lineRoutes)

// Bot routes — require bot API key in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/bot/*', async (c, next) => {
    const key = c.req.header('X-Bot-Key')
    if (!key || !process.env.BOT_API_KEY || !safeCompare(key, process.env.BOT_API_KEY)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
  })
  app.use('/api/bot-ext/*', async (c, next) => {
    const key = c.req.header('X-Bot-Key')
    if (!key || !process.env.BOT_API_KEY || !safeCompare(key, process.env.BOT_API_KEY)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
  })
}
app.route('/api/bot', botRoutes)
app.route('/api/bot-ext', botExtRoutes)
app.route('/api/auth', authRoutes)


// Protected admin routes (JWT + RBAC inside)
app.route('/api/admin', adminRoutes)

// User management routes (JWT + RBAC inside)
app.route('/api', usersRoutes)

// Demo fallback (for /admin legacy path without /api prefix)
app.route('/admin', demoRoutes)

// W8: 講師排課 + 薪資系統 (JWT + RBAC protected)
app.route('/api/w8', w8Routes)

// Notification system routes
app.route('/api', notificationRoutes)

// Error testing routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.route('/api/test/errors', errorTestRoutes)
}

// Debug endpoints (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/test', (c) => {
    return c.json({ success: true, message: 'Debug endpoint works' })
  })

  app.get('/debug/tables', async (c) => {
    try {
      const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
      return c.json({ success: true, tables: result })
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500)
    }
  })
}
