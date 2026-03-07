import { createMiddleware } from 'hono/factory';
import { verify, hasSystemAccess, extractToken, hasDbSystemEntitlement } from '@94cram/shared/auth';
import { eq } from 'drizzle-orm';
import { users } from '@94cram/shared/db';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getDb } from '../db';

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
  const token = extractToken(c);
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const jwtSecret = config.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('[Auth] JWT_SECRET is not configured');
    return c.json({ error: 'Auth not configured' }, 500);
  }

  try {
    const payload = await verify(token, jwtSecret);

    if (!hasSystemAccess(payload, 'bot', { allowLegacyNoSystems: false })) {
      return c.json({ error: 'Forbidden: Missing bot system access' }, 403);
    }

    const db = getDb();
    if (db) {
      const [dbUser] = await db
        .select({ id: users.id, role: users.role, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, payload.userId));

      if (!dbUser?.isActive) {
        return c.json({ error: 'Unauthorized: User not found or inactive' }, 401);
      }

      if (dbUser.role !== 'superadmin' && !(await hasDbSystemEntitlement(db, payload.userId, payload.tenantId, 'bot'))) {
        return c.json({ error: 'Forbidden: Missing bot system entitlement' }, 403);
      }
    } else {
      logger.warn('[Auth] DATABASE_URL not configured — skipping DB entitlement check');
    }

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
