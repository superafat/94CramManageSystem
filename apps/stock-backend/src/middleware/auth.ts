/**
 * Stock Backend Auth Middleware
 * 統一使用 @94cram/shared/auth
 */
import type { Context, Next } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { verify, extractToken, hasSystemAccess } from '@94cram/shared/auth';
import { users } from '@94cram/shared/db';
import { config } from '../config';
import { db } from '../db';
import { unauthorized } from '../utils/response';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  name?: string;
}

type QueryResultRows<T> = T[] | { rows?: T[] };

function firstRow<T>(result: QueryResultRows<T>): T | null {
  if (Array.isArray(result)) return result[0] ?? null;
  return result.rows?.[0] ?? null;
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

export async function authMiddleware(c: Context, next: Next) {
  const token = extractToken(c);

  if (!token) {
    return unauthorized(c);
  }

  try {
    const payload = await verify(token, config.JWT_SECRET);
    const userId = payload.userId || payload.sub || '';
    if (!userId) {
      return unauthorized(c, 'Missing user context');
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.isActive === false) {
      return unauthorized(c);
    }
    const tenantId = payload.tenantId || user.tenantId || '';
    if (!tenantId) {
      return unauthorized(c, 'Missing tenant context');
    }

    if (!hasSystemAccess(payload, 'stock', { allowLegacyNoSystems: false }) && user.role !== 'superadmin') {
      return unauthorized(c, 'Stock system access required');
    }
    if (user.role !== 'superadmin' && !(await hasDbSystemEntitlement(userId, tenantId, 'stock'))) {
      return unauthorized(c, 'Stock system entitlement required');
    }

    const authUser: AuthUser = {
      id: user.id,
      tenantId,
      role: payload.role || user.role || 'viewer',
      email: payload.email || user.email || '',
      name: payload.name || user.name || '',
    };

    if (!authUser.id || !authUser.tenantId) {
      return unauthorized(c);
    }

    c.set('jwtPayload', payload);
    c.set('authUser', authUser);
    await next();
  } catch {
    return unauthorized(c);
  }
}

export function getAuthUser(c: Context): AuthUser {
  return c.get('authUser') as AuthUser;
}
