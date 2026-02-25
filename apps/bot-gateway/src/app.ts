import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { telegramWebhook } from './webhooks/telegram';
import { telegramParentWebhook } from './webhooks/telegram-parent';
import { apiRouter } from './api/index';

export const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => c.json({ message: '94CramBot Gateway API', status: 'running' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Telegram webhooks
app.route('/webhook/telegram', telegramWebhook);
app.route('/webhook/telegram-parent', telegramParentWebhook);

// Dashboard REST API
app.route('/api', apiRouter);
