/**
 * Stock Backend Auth Middleware
 * 統一使用 @94cram/shared/auth
 */
import type { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { verify } from '@94cram/shared/auth';
import { users } from '@94cram/shared/db';
import { config } from '../config';
import { db } from '../db';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  name?: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, config.JWT_SECRET);
    const userId = payload.userId || payload.sub || '';
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.isActive === false) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const authUser: AuthUser = {
      id: user.id,
      tenantId: payload.tenantId || user.tenantId || '',
      role: payload.role || user.role || 'viewer',
      email: payload.email || user.email || '',
      name: payload.name || user.name || '',
    };

    if (!authUser.id || !authUser.tenantId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('jwtPayload', payload);
    c.set('authUser', authUser);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

export function getAuthUser(c: Context): AuthUser {
  return c.get('authUser') as AuthUser;
}
