/**
 * Internal API Routes — 跨系統內部呼叫
 * 認證：X-Internal-Key header
 */
import { timingSafeEqual, createHash } from 'crypto';
import { Hono } from 'hono';

const app = new Hono();

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
if (!INTERNAL_API_KEY) {
  throw new Error('INTERNAL_API_KEY is required for internal routes');
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(createHash('sha256').update(a).digest());
  const bufB = Buffer.from(createHash('sha256').update(b).digest());
  return timingSafeEqual(bufA, bufB);
}

// Internal key 驗證
app.use('*', async (c, next) => {
  const key = c.req.header('X-Internal-Key');
  if (!key || !safeCompare(key, INTERNAL_API_KEY)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94manage', status: 'ok', timestamp: Date.now() });
});

export default app;
