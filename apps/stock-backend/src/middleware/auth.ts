/**
 * Stock Backend Auth Middleware
 * 統一使用 @94cram/shared/auth
 */
import type { Context, Next } from 'hono';
import { verify, type JWTPayload } from '@94cram/shared/auth';

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
    const payload = await verify(token);
    const authUser: AuthUser = {
      id: payload.userId || payload.sub || '',
      tenantId: payload.tenantId || '',
      role: payload.role || 'viewer',
      email: payload.email || '',
      name: payload.name || '',
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
