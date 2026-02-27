/**
 * inClass Backend Auth Middleware
 * 統一使用 @94cram/shared/auth
 * 
 * 注意：inclass 用 schoolId = tenantId（alias）
 */
import type { Context, Next } from 'hono';
import { verify, type JWTPayload, extractToken } from '@94cram/shared/auth';
import { db } from '../db/index.js';
import { users } from '@94cram/shared/db';
import { eq } from 'drizzle-orm';

export type Variables = {
  schoolId: string;
  userId: string;
  botBody: Record<string, unknown>;
};

export type AdminUser = typeof users.$inferSelect;
export type AdminVariables = Variables & {
  adminUser: AdminUser;
};

export function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

/**
 * JWT Authentication Middleware
 * schoolId = tenantId（inclass 歷史命名）
 * @deprecated 實際 JWT 驗證在 index.ts 中
 */
export function jwtAuth() {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    if (c.req.method === 'OPTIONS') return next();
    if (c.req.path.startsWith('/api/auth/') && c.req.path !== '/api/auth/me') {
      return next();
    }

    const token = extractToken(c);
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const payload = await verify(token);
      const legacyPayload = payload as JWTPayload & { schoolId?: string };
      // inclass 用 schoolId = tenantId
      c.set('schoolId', payload.tenantId || legacyPayload.schoolId || '');
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
  return async (c: Context<{ Variables: AdminVariables }>, next: Next) => {
    const userId = c.get('userId');
    const schoolId = c.get('schoolId');
    const [adminUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!adminUser || adminUser.role !== 'admin' || !adminUser.isActive) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    if (schoolId && adminUser.tenantId !== schoolId) {
      return c.json({ error: 'Tenant mismatch' }, 403);
    }
    c.set('adminUser', adminUser);
    await next();
  };
}
