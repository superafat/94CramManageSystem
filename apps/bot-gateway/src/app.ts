import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { telegramWebhook } from './webhooks/telegram';

export const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => c.json({ message: '94CramBot Gateway API', status: 'running' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Telegram webhook
app.route('/webhook/telegram', telegramWebhook);
