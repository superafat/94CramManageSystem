import { Hono } from 'hono';
import { timingSafeEqual } from 'node:crypto';

const app = new Hono();

app.use('*', async (c, next) => {
  const key = c.req.header('X-Internal-Key');
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) {
    console.error('[Security] INTERNAL_API_KEY is not configured');
    return c.json({ error: 'Service unavailable' }, 503);
  }
  if (!key) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const keyBuffer = Buffer.from(key);
  const expectedBuffer = Buffer.from(expected);
  if (keyBuffer.length !== expectedBuffer.length || !timingSafeEqual(keyBuffer, expectedBuffer)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94inclass', status: 'ok', timestamp: Date.now() });
});

export default app;
