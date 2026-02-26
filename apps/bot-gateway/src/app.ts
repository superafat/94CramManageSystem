import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { telegramWebhook } from './webhooks/telegram';
import { telegramParentWebhook } from './webhooks/telegram-parent';
import { apiRouter } from './api/index';

export const app = new Hono();

app.use('/*', cors());

// Body size limit: 1MB default
app.use('/*', bodyLimit({ maxSize: 1024 * 1024 }));

app.get('/', (c) => c.json({ message: '蜂神榜 AI 補習班助手系統 Gateway API', status: 'running' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Telegram webhooks
app.route('/webhook/telegram', telegramWebhook);
app.route('/webhook/telegram-parent', telegramParentWebhook);

// Dashboard REST API
app.route('/api', apiRouter);
