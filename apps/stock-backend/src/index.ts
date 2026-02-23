import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import routes from './routes/index';
const app = new Hono();
app.use('/*', cors());
app.get('/', (c) => {
  return c.json({ message: '94Stock API' });
});
app.route('/api', routes);
const port = parseInt(process.env.PORT || '3001');
console.log(`Server is running on port ${port}`);
serve({
  fetch: app.fetch,
  port,
}).catch((error) => {
  console.error('[Startup] Failed to start 94Stock API:', error);
  process.exit(1);
});
