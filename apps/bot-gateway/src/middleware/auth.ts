import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import { config } from '../config';

export interface DashboardUser {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  systems: string[];
}

type Env = { Variables: { user: DashboardUser } };

export const dashboardAuth = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const jwtSecret = config.JWT_SECRET;
  if (!jwtSecret) {
    console.error('[Auth] JWT_SECRET is not configured');
    return c.json({ error: 'Auth not configured' }, 500);
  }

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    const userId = (typeof payload.userId === 'string' ? payload.userId : null) ?? payload.sub ?? null;
    const tenantId = typeof payload.tenantId === 'string' ? payload.tenantId : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const name = typeof payload.name === 'string' ? payload.name : null;
    const role = typeof payload.role === 'string' ? payload.role : null;

    if (!userId || !tenantId || !email || !name || !role) {
      return c.json({ error: 'Invalid token payload' }, 401);
    }

    c.set('user', {
      userId,
      tenantId,
      email,
      name,
      role,
      permissions: Array.isArray(payload.permissions) ? (payload.permissions as string[]) : [],
      systems: Array.isArray(payload.systems) ? (payload.systems as string[]) : [],
    });

    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
