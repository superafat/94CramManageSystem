import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { telegramWebhook } from './webhooks/telegram';
import { telegramParentWebhook } from './webhooks/telegram-parent';
import { apiRouter } from './api/index';

export const app = new Hono();

app.use('/*', cors({
  origin: [
    'https://bot.94cram.com',
    'https://94cram.com',
    'https://manage.94cram.com',
    'http://localhost:3000',
    'http://localhost:3200',
    'http://localhost:3300',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key'],
  credentials: true,
}));

// Security headers
app.use('/*', secureHeaders());

// Body size limit: 1MB default
app.use('/*', bodyLimit({ maxSize: 1024 * 1024 }));

app.get('/', (c) => c.json({ message: '蜂神榜 補習班 Ai 助手系統 Gateway API', status: 'running' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Telegram webhooks
app.route('/webhook/telegram', telegramWebhook);
app.route('/webhook/telegram-parent', telegramParentWebhook);

// Dashboard REST API
app.route('/api', apiRouter);
