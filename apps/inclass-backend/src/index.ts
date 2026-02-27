/**
 * BeeClass API - Main Entry Point
 *
 * Modular route architecture:
 *   /api/auth/*       → routes/auth.ts
 *   /api/students/*   → routes/students.ts
 *   /api/classes/*    → routes/classes.ts
 *   /api/parents/*    → routes/parents.ts
 *   /api/attendance/* → routes/attendance.ts
 *   /api/exams/*      → routes/exams.ts
 *   /api/admin/*      → routes/admin.ts
 *   /api/payments/*   → routes/payments.ts
 *   /api/*            → routes/misc.ts (teachers, schedules, reports, dashboard, audit, etc.)
 *   /internal/*       → routes/internal.ts (imStudy integration)
 *   /api/webhooks/*   → routes/webhooks.ts (94Manage sync)
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger as honoLogger } from 'hono/logger'
import { bodyLimit } from 'hono/body-limit'
import { z, ZodError } from 'zod'
import { verify, extractToken } from '@94cram/shared/auth'
import { db } from './db/index.js'
import { tenants } from '@94cram/shared/db'
import { checkRateLimit, getClientIP } from '@94cram/shared/middleware'
import { logger } from './utils/logger.js'
// Route modules
import authRoutes from './routes/auth.js'
import studentsRoutes from './routes/students.js'
import classesRoutes from './routes/classes.js'
import parentsRoutes from './routes/parents.js'
import attendanceRoutes from './routes/attendance.js'
import examsRoutes from './routes/exams.js'
import adminRoutes from './routes/admin.js'
import paymentsRoutes from './routes/payments.js'
import miscRoutes from './routes/misc.js'
import internalRoutes from './routes/internal.js'
import webhookRoutes from './routes/webhooks.js'
import botRoutes from './routes/bot/index.js'
import parentExtRoutes from './routes/parent-ext.js'
type Variables = {
  schoolId: string
  userId: string
}
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || ''
const gcpOrigin = (service: string) => `https://${service}-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

const app = new Hono<{ Variables: Variables }>()
// ===== Environment Validation =====
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
const jwtPayloadSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
})
// ===== Global Middleware =====
// Security headers
app.use('*', secureHeaders())
// CORS - MUST be first (before rate limiter, before auth)
app.use('/*', cors({
  origin: [
    'https://inclass.94cram.app',
    gcpOrigin('cram94-inclass-dashboard'),
    'https://manage.94cram.app',
    gcpOrigin('cram94-manage-dashboard'),
    'https://stock.94cram.app',
    gcpOrigin('cram94-stock-dashboard'),
    gcpOrigin('cram94-portal'),
    'https://inclass.94cram.com',
    'https://manage.94cram.com',
    'https://stock.94cram.com',
    'https://94cram.com',
    'http://localhost:3201',
    'http://localhost:3200',
    'http://localhost:3000',
    'http://localhost:3300',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
}))
// Body size limit: 1MB default
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }))
// Request Logger
app.use('*', honoLogger())
// Rate limiter for auth routes (skip OPTIONS & demo)
app.use('/api/auth/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  const ip = getClientIP(c)
  const result = await checkRateLimit(`auth:${ip}`, { maxRequests: 10, enableBlocking: true })
  if (!result.allowed) {
    if (result.blocked) {
      return c.json({ error: 'Too many failed attempts. IP blocked for 15 minutes.' }, 429)
    }
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }
  await next()
})
// General rate limiter for all API routes
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  const ip = getClientIP(c)
  const result = await checkRateLimit(`api:${ip}`, { maxRequests: 100 })
  if (!result.allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }
  await next()
})
// JWT Authentication Middleware
// Skip: OPTIONS, auth routes (except /api/auth/me), internal routes, webhooks
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  if (c.req.path.startsWith('/api/auth/') && c.req.path !== '/api/auth/me') {
    return next()
  }
  // Webhooks use their own auth
  if (c.req.path.startsWith('/api/webhooks/')) return next()
  // Bot routes use GCP IAM auth via botAuth middleware
  if (c.req.path.startsWith('/api/bot/')) return next()
  // Parent-ext routes use X-Internal-Key auth
  if (c.req.path.startsWith('/api/parent-ext/')) return next()
  const token = extractToken(c)
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const payload = await verify(token)
    const parsedPayload = jwtPayloadSchema.parse(payload)
    c.set('schoolId', parsedPayload.tenantId)
    c.set('userId', parsedPayload.userId)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
// ===== Health Check =====
app.get('/', (c) => c.json({
  message: '🐝 蜂神榜 Ai 點名系統 API v1.0',
  status: 'running',
  timestamp: new Date().toISOString()
}))
app.get('/health', async (c) => {
  try {
    const dbCheckPromise = db.select().from(tenants).limit(1)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    )
    await Promise.race([dbCheckPromise, timeoutPromise])
    return c.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Health Check] Database connection failed')
    return c.json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    }, 503)
  }
})
// ===== Mount Route Modules =====
// Auth (public, before JWT middleware is applied to these paths)
app.route('/api/auth', authRoutes)
// Protected API routes
app.route('/api/students', studentsRoutes)
app.route('/api/classes', classesRoutes)
app.route('/api/parents', parentsRoutes)
app.route('/api/attendance', attendanceRoutes)
app.route('/api/exams', examsRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/payments', paymentsRoutes)
// Misc protected routes (teachers, schedules, reports, dashboard, audit, alerts)
app.route('/api', miscRoutes)
// Bot Gateway API routes (GCP IAM auth via botAuth middleware)
app.route('/api/bot', botRoutes)
// Parent-ext routes (X-Internal-Key auth, for bot-gateway parent queries)
app.route('/api/parent-ext', parentExtRoutes)
// Webhook routes (own auth via X-Webhook-Secret header)
app.route('/api/webhooks', webhookRoutes)
// Internal API (own auth via INTERNAL_API_TOKEN, NOT JWT)
app.route('/internal', internalRoutes)
// ===== Global Error Handler =====
app.onError((err, c) => {
  logger.error({ err }, `[Global Error Handler] ${c.req.path}`)
  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json({
      error: 'Validation failed',
      details: err.issues.map(e => ({
        field: e.path.map(String).join('.'),
        message: e.message
      }))
    }, 400)
  }
  // JWT errors
  if (err.name === 'JWTExpired') {
    return c.json({ error: 'Token expired' }, 401)
  }
  if (err.name === 'JWTInvalid') {
    return c.json({ error: 'Invalid token' }, 401)
  }
  // Default error response (don't leak internal details)
  return c.json({ error: 'Internal server error' }, 500)
})
export default app
// ===== Start Server =====
const port = parseInt(process.env.PORT || '3102')
logger.info(`🐝 BeeClass Backend starting on port ${port}...`)
const serve = async () => {
  const { serve } = await import('@hono/node-server')
  const server = serve({ port, fetch: app.fetch })
  logger.info(`✅ BeeClass Backend running at http://localhost:${port}`)

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received, starting graceful shutdown...`)
    try {
      if (server && typeof server.close === 'function') {
        server.close()
      }
      logger.info('✅ BeeClass backend shutdown completed')
      process.exit(0)
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '❌ Error during shutdown')
      process.exit(1)
    }
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

serve().catch((error) => {
  logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Startup] Failed to start BeeClass Backend')
  process.exit(1)
})
