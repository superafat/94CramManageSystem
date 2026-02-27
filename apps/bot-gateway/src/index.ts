import { serve } from '@hono/node-server';
import { app } from './app';
import { config } from './config';
import { firestore } from './firestore/client';
import { initRateLimitStore } from './utils/rate-limit';
import { logger } from './utils/logger';

// Initialise shared rate-limit store so all Cloud Run instances share state
initRateLimitStore(firestore);

const port = config.PORT;
logger.info(`🤖 蜂神榜 補習班 Ai 助手系統 Gateway starting on port ${port}...`);

serve({ fetch: app.fetch, port });
logger.info(`✅ 蜂神榜 補習班 Ai 助手系統 Gateway running at http://localhost:${port}`);
