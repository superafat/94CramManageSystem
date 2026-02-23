import { Hono } from 'hono';

const app = new Hono();

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

app.use('*', async (c, next) => {
  if (!INTERNAL_API_KEY) {
    console.error('[Security] INTERNAL_API_KEY is not configured');
    return c.json({ error: 'Service unavailable' }, 503);
  }
  const key = c.req.header('X-Internal-Key');
  if (!key || key !== INTERNAL_API_KEY) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94stock', status: 'ok', timestamp: Date.now() });
});

export default app;
