import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { checkRateLimit, getClientIP, clearRateLimitTimer } from '@94cram/shared/middleware';
import routes from './routes/index';
import botRoutes from './routes/bot/index';
import { logger } from './utils/logger';

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || ''
const gcpOrigin = (service: string) => `https://${service}-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

const app = new Hono();

// Security headers
app.use('/*', secureHeaders());

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
    // Custom domains (94cram.com)
    'https://stock.94cram.com',
    'https://manage.94cram.com',
    'https://inclass.94cram.com',
    'https://94cram.com',
    // Local development
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
  const result = await checkRateLimit(`auth:${ip}`, { maxRequests: 10 });
  if (!result.allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429);
  }
  await next();
});

// General API rate limiter (100/min)
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  const ip = getClientIP(c);
  const result = await checkRateLimit(`api:${ip}`, { maxRequests: 100 });
  if (!result.allowed) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429);
  }
  await next();
});

app.get('/', (c) => {
  return c.json({ message: '94Stock API' });
});

// Health check — Cloud Run uses this to determine instance readiness
app.get('/health', (c) => {
  return c.json({ service: '94stock', status: 'ok', timestamp: Date.now() });
});

app.route('/api', routes);
app.route('/api/bot', botRoutes);

const port = parseInt(process.env.PORT || '3101');
logger.info(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`\n${signal} received, starting graceful shutdown...`)
  try {
    clearRateLimitTimer()
    if (server && typeof server.close === 'function') {
      server.close()
    }
    logger.info('✅ Stock backend shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '❌ Error during shutdown')
    process.exit(1)
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
