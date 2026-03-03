import { serve } from '@hono/node-server';
import { app } from './app';
import { config } from './config';
import { firestore } from './firestore/client';
import { initRateLimitStore } from './utils/rate-limit';
import { logger } from './utils/logger';
import { isRedisAvailable } from '@94cram/shared/redis';
import { initScheduler } from './scheduler';

// Initialise shared rate-limit store so all Cloud Run instances share state
// Skip Firestore sync when Redis is available (Redis handles distributed state)
if (!isRedisAvailable()) {
  initRateLimitStore(firestore);
}

const port = config.PORT;
logger.info(`🤖 蜂神榜 補習班 Ai 助手系統 Gateway starting on port ${port}...`);

serve({ fetch: app.fetch, port });
logger.info(`✅ 蜂神榜 補習班 Ai 助手系統 Gateway running at http://localhost:${port}`);

// 啟動主動推播排程系統（每日繳費提醒、每週家長通知、AI 課程推薦）
initScheduler();
