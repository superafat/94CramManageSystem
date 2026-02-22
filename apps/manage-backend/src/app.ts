import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { compress } from 'hono/compress'
import { botRoutes } from './routes/bot'
import { authRoutes } from './routes/auth'
import { adminRoutes } from './routes/admin'
import usersRoutes from './routes/users'
import { demoRoutes } from './routes/demo'
import { w8Routes } from './routes/w8'
import notificationRoutes from './routes/notifications'
import lineRoutes from './routes/line'
import { errorTestRoutes } from './routes/error-test'
import { healthRoutes } from './routes/health'
import { errorHandler } from './middleware/errorHandler'
import { tenantMiddleware } from './middleware/tenant'
import { requestTrackingMiddleware } from './middleware/requestTracking'
import { rateLimit } from './middleware/rateLimit'
import { runMigrations } from './db/startup-migrations'
import { checkDatabaseHealth, getDatabaseMetrics } from './db'
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.onError(errorHandler as any)

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
  ],
  maxAge: 86400,
}))

// Global rate limiting (100 requests/min)
app.use('/api/*', rateLimit())

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
