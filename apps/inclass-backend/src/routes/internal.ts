import { Hono } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { logger } from '../utils/logger.js';

const app = new Hono();

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
if (!INTERNAL_API_KEY) {
  logger.warn('[Security] INTERNAL_API_KEY 未設定，內部 API 路由將返回 503');
}

app.use('*', async (c, next) => {
  if (!INTERNAL_API_KEY) {
    return c.json({ error: 'Internal API not configured' }, 503);
  }
  const key = c.req.header('X-Internal-Key');
  if (!key) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const keyBuffer = Buffer.from(key);
  const expectedBuffer = Buffer.from(INTERNAL_API_KEY);
  if (keyBuffer.length !== expectedBuffer.length || !timingSafeEqual(keyBuffer, expectedBuffer)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94inclass', status: 'ok', timestamp: Date.now() });
});

export default app;
