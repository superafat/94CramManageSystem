/**
 * Authentication & Authorization Middleware
 */
import { Hono } from 'hono'
import { jwtVerify } from 'jose'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

// JWT_SECRET is validated at app startup in index.ts
export function getJWTSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET!)
}

export type Variables = {
  schoolId: string
  userId: string
}

/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT token, sets schoolId and userId in context
 */
export function jwtAuth() {
  return async (c: any, next: () => Promise<void>) => {
    if (c.req.method === 'OPTIONS') return next()
    if (c.req.path.startsWith('/api/auth/') && c.req.path !== '/api/auth/me') {
      return next()
    }

    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7)
    try {
      const { payload } = await jwtVerify(token, getJWTSecret())
      c.set('schoolId', payload.schoolId as string)
      c.set('userId', payload.userId as string)
      await next()
    } catch (e) {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
}

/**
 * Admin-only Middleware
 * Must be used AFTER jwtAuth. Verifies the user has admin role.
 */
export function adminOnly() {
  return async (c: any, next: () => Promise<void>) => {
    const userId = c.get('userId')
    const [adminUser] = await db.select().from(users).where(eq(users.id, userId))
    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    // Store admin user info for downstream handlers
    c.set('adminUser', adminUser)
    await next()
  }
}
