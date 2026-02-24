/**
 * Internal API Routes — 跨系統內部呼叫
 * 認證：X-Internal-Key header
 */
import { timingSafeEqual } from 'crypto';
import { Hono } from 'hono';

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

export default app;
