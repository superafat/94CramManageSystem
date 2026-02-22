/**
 * inClass Backend Auth Middleware
 * 統一使用 @94cram/shared/auth
 * 
 * 注意：inclass 用 schoolId = tenantId（alias）
 */
import type { Context, Next } from 'hono';
import { verify, type JWTPayload } from '@94cram/shared/auth';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export type Variables = {
  schoolId: string;
  userId: string;
};

export function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || '94cram-secret-change-in-prod';
  return new TextEncoder().encode(secret);
}

/**
 * JWT Authentication Middleware
 * schoolId = tenantId（inclass 歷史命名）
 */
export function jwtAuth() {
  return async (c: any, next: () => Promise<void>) => {
    if (c.req.method === 'OPTIONS') return next();
    if (c.req.path.startsWith('/api/auth/') && c.req.path !== '/api/auth/me') {
      return next();
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);
    try {
      const payload = await verify(token);
      // inclass 用 schoolId = tenantId
      c.set('schoolId', payload.tenantId || (payload as any).schoolId || '');
      c.set('userId', payload.userId || payload.sub || '');
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
}

/**
 * Admin-only Middleware
 */
export function adminOnly() {
  return async (c: any, next: () => Promise<void>) => {
    const userId = c.get('userId');
    const [adminUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!adminUser || adminUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    c.set('adminUser', adminUser);
    await next();
  };
}
