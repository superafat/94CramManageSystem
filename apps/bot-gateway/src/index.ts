import { serve } from '@hono/node-server';
import { app } from './app';
import { config } from './config';

const port = config.PORT;
console.info(`🤖 94CramBot Gateway starting on port ${port}...`);

serve({ fetch: app.fetch, port });
console.info(`✅ 94CramBot Gateway running at http://localhost:${port}`);
