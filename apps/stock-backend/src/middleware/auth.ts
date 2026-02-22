import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';

const DEFAULT_JWT_SECRET = '94stock-secret-key-change-in-prod';

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
    const payload = await verify(token, process.env.JWT_SECRET || DEFAULT_JWT_SECRET, 'HS256');
    const authUser: AuthUser = {
      id: String(payload.userId || payload.id || ''),
      tenantId: String(payload.tenantId || ''),
      role: String(payload.role || 'viewer'),
      email: String(payload.email || ''),
      name: String(payload.name || ''),
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
