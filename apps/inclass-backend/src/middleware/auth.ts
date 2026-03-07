/**
 * inClass Backend Auth Middleware
 * 統一使用 @94cram/shared/auth
 * 
 * 注意：inclass 用 schoolId = tenantId（alias）
 */
import type { Context, Next } from 'hono';
import { verify, type JWTPayload, extractToken, hasSystemAccess } from '@94cram/shared/auth';
import { db } from '../db/index.js';
import { users } from '@94cram/shared/db';
import { eq, sql } from 'drizzle-orm';
import { unauthorized, forbidden } from '../utils/response.js';

export type Variables = {
  schoolId: string;
  userId: string;
  botBody: Record<string, unknown>;
};

export type AdminUser = typeof users.$inferSelect;
export type AdminVariables = Variables & {
  adminUser: AdminUser;
};

type QueryResultRows<T> = T[] | { rows?: T[] };

function firstRow<T>(result: QueryResultRows<T>): T | null {
  if (Array.isArray(result)) return result[0] ?? null;
  return result.rows?.[0] ?? null;
}

async function getActiveUser(userId: string) {
  return firstRow(await db.execute(sql`
    SELECT id, role, is_active
    FROM users
    WHERE id = ${userId}
      AND deleted_at IS NULL
    LIMIT 1
  `) as QueryResultRows<{ id: string; role: string; is_active: boolean }>);
}

async function hasDbSystemEntitlement(userId: string, tenantId: string, systemKey: string): Promise<boolean> {
  const entitlement = firstRow(await db.execute(sql`
    SELECT id
    FROM user_system_entitlements
    WHERE user_id = ${userId}
      AND tenant_id = ${tenantId}
      AND system_key = ${systemKey}
      AND status = 'active'
    LIMIT 1
  `) as QueryResultRows<{ id: string }>);

  return Boolean(entitlement);
}

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
      return unauthorized(c);
    }

    try {
      const payload = await verify(token);
      const legacyPayload = payload as JWTPayload & { schoolId?: string };
      const schoolId = payload.tenantId || legacyPayload.schoolId || '';
      const userId = payload.userId || payload.sub || '';

      if (!schoolId || !userId) {
        return unauthorized(c, 'Missing tenant context');
      }

      const dbUser = await getActiveUser(userId);
      if (!dbUser?.is_active) {
        return unauthorized(c, 'User not found or inactive');
      }

      if (!hasSystemAccess(payload, 'inclass', { allowLegacyNoSystems: false }) && dbUser.role !== 'superadmin') {
        return forbidden(c, 'InClass system access required');
      }
      if (dbUser.role !== 'superadmin' && !(await hasDbSystemEntitlement(userId, schoolId, 'inclass'))) {
        return forbidden(c, 'InClass system entitlement required');
      }
      // inclass 用 schoolId = tenantId
      c.set('schoolId', schoolId);
      c.set('userId', userId);
      await next();
    } catch {
      return unauthorized(c, 'Invalid token');
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
      return forbidden(c, 'Admin access required');
    }
    if (schoolId && adminUser.tenantId !== schoolId) {
      return forbidden(c, 'Tenant mismatch');
    }
    c.set('adminUser', adminUser);
    await next();
  };
}
