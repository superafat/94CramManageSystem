import { Hono } from 'hono';

const app = new Hono();

app.use('*', async (c, next) => {
  const key = c.req.header('X-Internal-Key');
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) {
    console.error('[Security] INTERNAL_API_KEY is not configured');
    return c.json({ error: 'Service unavailable' }, 503);
  }
  if (!key || key !== expected) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94inclass', status: 'ok', timestamp: Date.now() });
});

export default app;
