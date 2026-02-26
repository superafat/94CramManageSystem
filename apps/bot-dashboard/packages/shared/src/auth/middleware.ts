/**
 * Hono Auth Middleware — 統一認證中介層
 * 三個系統共用：manage / inclass / stock
 */
import type { Context, Next } from 'hono';
import { verify, type JWTPayload } from './jwt';
import { extractToken } from './cookie';

/**
 * JWT Auth Middleware Factory
 * 從 Authorization: Bearer <token> 取出 JWT，驗證後注入 context
 * 
 * Context variables: userId, tenantId, email, name, role, systems, jwtPayload
 */
export function createAuthMiddleware(options?: { skipPaths?: string[] }) {
  const skipPaths = options?.skipPaths || [];

  return async (c: Context, next: Next) => {
    // OPTIONS preflight
    if (c.req.method === 'OPTIONS') return next();

    // 跳過指定路徑
    const path = c.req.path;
    if (skipPaths.some(p => path.startsWith(p))) return next();

    const token = extractToken(c);
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    try {
      const payload = await verify(token);

      c.set('userId', payload.userId);
      c.set('tenantId', payload.tenantId);
      c.set('email', payload.email);
      c.set('name', payload.name);
      c.set('role', payload.role);
      c.set('systems', payload.systems || []);
      c.set('jwtPayload', payload);

      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
}

/**
 * Internal API Key Middleware
 * 驗證 X-Internal-Key header
 */
export function createInternalKeyMiddleware() {
  const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
  if (!INTERNAL_API_KEY) {
    console.warn('WARNING: INTERNAL_API_KEY not set. Internal API access is disabled.');
  }

  return async (c: Context, next: Next) => {
    const key = c.req.header('X-Internal-Key');
    if (!INTERNAL_API_KEY || !key || key !== INTERNAL_API_KEY) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}

/**
 * 從 context 取得已驗證的使用者資訊
 */
export function getAuthUser(c: Context): JWTPayload {
  return c.get('jwtPayload') as JWTPayload;
}

// 舊版相容
export function verifyInternalKey(key: string): boolean {
  const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
  if (!INTERNAL_API_KEY) return false;
  return key === INTERNAL_API_KEY;
}
