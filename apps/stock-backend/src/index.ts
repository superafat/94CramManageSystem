import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { checkRateLimit, getClientIP, clearRateLimitTimer } from '@94cram/shared/middleware';
import routes from './routes/index';
import botRoutes from './routes/bot/index';

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '1015149159553'
const gcpOrigin = (service: string) => `https://${service}-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

const app = new Hono();

// CORS whitelist
app.use('/*', cors({
  origin: [
    'https://stock.94cram.app',
    gcpOrigin('cram94-stock-dashboard'),
    'https://manage.94cram.app',
    gcpOrigin('cram94-manage-dashboard'),
    'https://inclass.94cram.app',
    gcpOrigin('cram94-inclass-dashboard'),
    gcpOrigin('cram94-portal'),
    'http://localhost:3000',
    'http://localhost:3200',
    'http://localhost:3201',
    'http://localhost:3300',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
}));

// Body size limit: 1MB default
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));

// Auth rate limiter (stricter: 10/min)
app.use('/api/auth/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  const ip = getClientIP(c);
  const result = checkRateLimit(`auth:${ip}`, { maxRequests: 10 });
  if (!result.allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429);
  }
  await next();
});

// General API rate limiter (100/min)
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  const ip = getClientIP(c);
  const result = checkRateLimit(`api:${ip}`, { maxRequests: 100 });
  if (!result.allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429);
  }
  await next();
});

app.get('/', (c) => {
  return c.json({ message: '94Stock API' });
});

app.route('/api', routes);
app.route('/api/bot', botRoutes);

const port = parseInt(process.env.PORT || '3101');
console.info(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.info(`\n${signal} received, starting graceful shutdown...`)
  try {
    clearRateLimitTimer()
    if (server && typeof server.close === 'function') {
      server.close()
    }
    console.info('✅ Stock backend shutdown completed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
