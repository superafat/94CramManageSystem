import { serve } from '@hono/node-server'
import { app } from './app'
import { config } from './config'
import { createBot, startBot } from './bot/telegram'
import { closeDatabaseConnection } from './db'

const port = Number(process.env.PORT) || 3100
const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID ?? 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d'

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🐝 HiveMind Backend running on http://localhost:${info.port}`)

  // Start Telegram bot if token is configured (non-blocking)
  if (config.TELEGRAM_BOT_TOKEN) {
    const bot = createBot(config.TELEGRAM_BOT_TOKEN, DEFAULT_BRANCH_ID)
    startBot(bot, 'polling').catch(err => {
      console.error('❌ Telegram Bot failed to start:', err.message)
      console.error('   API server continues running without bot.')
    })
  } else {
    console.log('ℹ️  No TELEGRAM_BOT_TOKEN set, bot disabled')
  }
})

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, starting graceful shutdown...`)
  
  try {
    // Close database connections
    await closeDatabaseConnection()
    
    // Close server
    if (server && typeof server.close === 'function') {
      server.close()
    }
    
    console.log('✅ Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
