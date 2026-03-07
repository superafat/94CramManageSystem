/**
 * Stock Backend Auth Middleware
 * 統一使用 @94cram/shared/auth
 */
import type { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { verify, extractToken, hasSystemAccess, hasDbSystemEntitlement } from '@94cram/shared/auth';
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
    if (user.role !== 'superadmin' && !(await hasDbSystemEntitlement(db, userId, tenantId, 'stock'))) {
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
