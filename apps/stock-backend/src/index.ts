import { serve } from '@hono/node-server';
import { app, clearRateLimitTimer } from './app';
import { logger } from './utils/logger';

const port = parseInt(process.env.PORT || '3101');
logger.info(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`\n${signal} received, starting graceful shutdown...`)
  try {
    clearRateLimitTimer()
    if (server && typeof server.close === 'function') {
      server.close()
    }
    logger.info('✅ Stock backend shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '❌ Error during shutdown')
    process.exit(1)
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
