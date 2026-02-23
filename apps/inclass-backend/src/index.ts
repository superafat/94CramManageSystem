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
import { logger } from 'hono/logger'
import { z, ZodError } from 'zod'
import { jwtVerify } from 'jose'
import { db } from './db/index.js'
import { schools } from './db/schema.js'
import { rateLimit, getClientIP } from './middleware/rateLimit.js'
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
type Variables = {
  schoolId: string
  userId: string
}
const app = new Hono<{ Variables: Variables }>()
// ===== Environment Validation =====
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const jwtPayloadSchema = z.object({
  schoolId: z.string().min(1),
  userId: z.string().min(1),
})
// ===== Global Middleware =====
// CORS - MUST be first (before rate limiter, before auth)
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
}))
// Request Logger
app.use('*', logger())
// Rate limiter for auth routes (skip OPTIONS & demo)
app.use('/api/auth/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  if (c.req.path === '/api/auth/demo') return next()
  const ip = getClientIP(c)
  const result = rateLimit(`auth:${ip}`)
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
  const result = rateLimit(`api:${ip}`)
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
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.substring(7)
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const parsedPayload = jwtPayloadSchema.parse(payload)
    c.set('schoolId', parsedPayload.schoolId)
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
    const dbCheckPromise = db.select().from(schools).limit(1)
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
    console.error('[Health Check] Database connection failed:', error instanceof Error ? error.message : 'Unknown error')
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
// Webhook routes (own auth via X-Webhook-Secret header)
app.route('/api/webhooks', webhookRoutes)
// Internal API (own auth via INTERNAL_API_TOKEN, NOT JWT)
app.route('/internal', internalRoutes)
// ===== Global Error Handler =====
app.onError((err, c) => {
  console.error('[Global Error Handler]', c.req.path, err)
  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json({
      error: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
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
const port = parseInt(process.env.PORT || '3100')
console.log(`🐝 BeeClass Backend starting on port ${port}...`)
const serve = async () => {
  const { serve } = await import('@hono/node-server')
  serve({ port, fetch: app.fetch })
  console.log(`✅ BeeClass Backend running at http://localhost:${port}`)
}
serve()
