import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import routes from './routes/index';
import botRoutes from './routes/bot/index';

const app = new Hono();

// CORS whitelist
app.use('/*', cors({
  origin: [
    'https://stock.94cram.app',
    'https://cram94-stock-dashboard-1015149159553.asia-east1.run.app',
    'https://manage.94cram.app',
    'https://cram94-manage-dashboard-1015149159553.asia-east1.run.app',
    'https://inclass.94cram.app',
    'https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app',
    'https://cram94-portal-1015149159553.asia-east1.run.app',
    'http://localhost:3000',
    'http://localhost:3200',
    'http://localhost:3201',
    'http://localhost:3300',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
}));

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
app.use('/api/auth/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `auth:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (entry && now < entry.resetAt) {
    entry.count++;
    if (entry.count > 10) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }
  } else {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
  }
  await next();
});

// General API rate limiter
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `api:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (entry && now < entry.resetAt) {
    entry.count++;
    if (entry.count > 100) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }
  } else {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
  }
  await next();
});

// Periodic rate limit store cleanup (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) rateLimitStore.delete(key);
  }
}, 300000);

app.get('/', (c) => {
  return c.json({ message: '94Stock API' });
});

app.route('/api', routes);
app.route('/api/bot', botRoutes);

const port = parseInt(process.env.PORT || '3001');
console.info(`Server is running on port ${port}`);

try {
  serve({
    fetch: app.fetch,
    port,
  });
} catch (error) {
  console.error('[Startup] Failed to start 94Stock API:', error);
  process.exit(1);
}
