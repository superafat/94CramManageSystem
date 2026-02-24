import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { compress } from 'hono/compress'
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
import { errorHandler } from './middleware/errorHandler'
import { tenantMiddleware } from './middleware/tenant'
import { requestTrackingMiddleware } from './middleware/requestTracking'
import { rateLimit } from './middleware/rateLimit'
import { runMigrations } from './db/startup-migrations'
import { checkDatabaseHealth, getDatabaseMetrics, db } from './db'
import { sql } from 'drizzle-orm'
import { initializeEventSystem } from './events'
import { createSuccessResponse } from './types/api-response'
import { logger } from './utils/logger'

// Run migrations on startup
runMigrations().catch((err) => logger.error('Migration failed', { error: err }))

// Initialize event system
initializeEventSystem()

export const app = new Hono()

// Performance: gzip compression
app.use('*', compress())

// Global error handler using onError
app.onError((error, context) => errorHandler(error, context))

// Request tracking middleware (adds requestId and logger to context)
if (process.env.NODE_ENV !== 'production') {
  app.use('*', requestTrackingMiddleware)
}

app.use('*', cors({
  origin: [
    'http://localhost:3200',
    'http://localhost:3300',
    'http://localhost:5173',
    'https://94homework.com',
    'https://94manage-miniapp-855393865280.asia-east1.run.app',
    'https://94manage-dashboard-855393865280.asia-east1.run.app',
    // 新的 Cloud Run URLs (cram94- 前綴)
    'https://cram94-manage-dashboard-1015149159553.asia-east1.run.app',
    'https://cram94-manage-backend-1015149159553.asia-east1.run.app',
    'https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app',
    'https://cram94-inclass-backend-1015149159553.asia-east1.run.app',
    'https://cram94-stock-dashboard-1015149159553.asia-east1.run.app',
    'https://cram94-stock-backend-1015149159553.asia-east1.run.app',
    'https://cram94-portal-1015149159553.asia-east1.run.app',
    // Custom domain
    'https://manage.94cram.com',
    'https://inclass.94cram.com',
    'https://stock.94cram.com',
    'https://94cram.com',
  ],
  maxAge: 86400,
}))

// Demo login — registered before /api/* middleware to avoid auth interception
app.post('/api/auth/demo', (c) => handleDemoLogin(c))
app.get('/api/auth/demo', (c) => handleDemoLogin(c))

// Global rate limiting (100 requests/min)
app.use('/api/*', rateLimit())

app.use('/api/*', tenantMiddleware)

// Health check — no middleware overhead
app.get('/health', (c) => c.json(createSuccessResponse({ status: 'ok', ts: Date.now(), build: '54d050e-v2' })))

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

// LINE webhook (public, no auth, no tenant middleware)
app.route('/api/line', lineRoutes)

// Public routes (no auth)
app.route('/api/bot', botRoutes)
app.route('/api/auth', authRoutes)


// Protected admin routes (JWT + RBAC inside)
app.route('/api/admin', adminRoutes)

// User management routes (JWT + RBAC inside)
app.route('/api', usersRoutes)

// Demo fallback (for /admin legacy path without /api prefix)
app.route('/admin', demoRoutes)

// W8: 講師排課 + 薪資系統 (無 auth, 用於 Dashboard)
app.route('/api/w8', w8Routes)

// Notification system routes
app.route('/api', notificationRoutes)

// Error testing routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.route('/api/test/errors', errorTestRoutes)
}

// Public debug endpoint (no auth)
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
