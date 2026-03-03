import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { checkRateLimit, getClientIP, clearRateLimitTimer } from '@94cram/shared/middleware';
import routes from './routes/index';
import botRoutes from './routes/bot/index';

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || ''
const gcpOrigin = (service: string) => `https://${service}-${GCP_PROJECT_NUMBER}.asia-east1.run.app`

export const app = new Hono();

// Security headers
app.use('/*', secureHeaders());

// CORS whitelist
app.use('/*', cors({
  origin: [
    'https://stock.94cram.com',
    gcpOrigin('cram94-stock-dashboard'),
    'https://manage.94cram.com',
    gcpOrigin('cram94-manage-dashboard'),
    'https://inclass.94cram.com',
    gcpOrigin('cram94-inclass-dashboard'),
    gcpOrigin('cram94-portal'),
    'https://stock.94cram.com',
    'https://manage.94cram.com',
    'https://inclass.94cram.com',
    'https://94cram.com',
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

export { clearRateLimitTimer };
