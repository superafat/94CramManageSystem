import { serve } from '@hono/node-server';
import { app } from './app';
import { config } from './config';

const port = config.PORT;
console.info(`🤖 蜂神榜 AI 補習班助手系統 Gateway starting on port ${port}...`);

serve({ fetch: app.fetch, port });
console.info(`✅ 蜂神榜 AI 補習班助手系統 Gateway running at http://localhost:${port}`);
