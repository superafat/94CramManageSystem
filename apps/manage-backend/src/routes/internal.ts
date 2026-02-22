/**
 * Internal API Routes — 跨系統內部呼叫
 * 認證：X-Internal-Key header
 */
import { Hono } from 'hono';

const app = new Hono();

// Internal key 驗證
app.use('*', async (c, next) => {
  const key = c.req.header('X-Internal-Key');
  const expected = process.env.INTERNAL_API_KEY || 'internal-key-change-in-prod';
  if (!key || key !== expected) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94manage', status: 'ok', timestamp: Date.now() });
});

export default app;
