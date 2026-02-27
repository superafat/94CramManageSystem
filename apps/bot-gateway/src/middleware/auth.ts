import { createMiddleware } from 'hono/factory';
import { verify } from '@94cram/shared/auth';
import { config } from '../config';
import { logger } from '../utils/logger';

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
    logger.error('[Auth] JWT_SECRET is not configured');
    return c.json({ error: 'Auth not configured' }, 500);
  }

  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, jwtSecret);

    c.set('user', {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions ?? [],
      systems: payload.systems ?? [],
    });

    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
