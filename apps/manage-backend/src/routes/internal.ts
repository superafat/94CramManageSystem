/**
 * Internal API Routes — 跨系統內部呼叫
 * 認證：X-Internal-Key header
 */
import { timingSafeEqual, createHash } from 'crypto';
import { Hono } from 'hono';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger'

const app = new Hono();

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
if (!INTERNAL_API_KEY) {
  throw new Error('INTERNAL_API_KEY is required for internal routes');
}

const INTERNAL_API_KEY_BUFFER = Buffer.from(INTERNAL_API_KEY);

function safeCompare(key: string): boolean {
  const keyBuffer = Buffer.from(key);

  if (keyBuffer.length !== INTERNAL_API_KEY_BUFFER.length) {
    return false;
  }

  return timingSafeEqual(keyBuffer, INTERNAL_API_KEY_BUFFER);
}

// Internal key 驗證
app.use('*', async (c, next) => {
  const key = c.req.header('X-Internal-Key');
  if (!key || !safeCompare(key)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94manage', status: 'ok', timestamp: Date.now() });
});

// Seed database - creates initial data
app.post('/seed', async (c) => {
  try {
    // Create default tenant if not exists
    let tenantId: string | null = null
    
    const tenantResult = await db.execute(sql`SELECT id FROM tenants LIMIT 1`)
    const tenants = Array.isArray(tenantResult) ? tenantResult : (tenantResult as any).rows || []
    
    if (tenants.length === 0) {
      tenantId = crypto.randomUUID()
      await db.execute(sql`
        INSERT INTO tenants (id, name, status, created_at)
        VALUES (${tenantId}, 'Default Tenant', 'active', NOW())
      `)
    } else {
      tenantId = tenants[0].id
    }
    
    // Create admin user if not exists
    const userResult = await db.execute(sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1`)
    const users = Array.isArray(userResult) ? userResult : (userResult as any).rows || []
    
    if (users.length === 0) {
      const userId = crypto.randomUUID()
      const { randomBytes } = await import('crypto')
      const bcrypt = await import('bcryptjs')
      const oneTimePassword = randomBytes(16).toString('hex')
      const passwordHash = await bcrypt.default.hash(oneTimePassword, 12)
      logger.info(`[SEED] 臨時管理員密碼: ${oneTimePassword} — 請立即更改`)

      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, full_name, email, role, password_hash, is_active, created_at)
        VALUES (${userId}, ${tenantId}, 'admin', '系統管理員', 'admin@94cram.app', 'superadmin', ${passwordHash}, true, NOW())
      `)
      return c.json({ success: true, message: 'Admin user created', tenantId, userId })
    }
    
    return c.json({ success: true, message: 'Admin user already exists', tenantId })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

export default app;
