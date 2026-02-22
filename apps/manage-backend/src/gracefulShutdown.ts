import { closeDatabaseConnection } from './db'
import { logger } from './utils/logger'

interface ShutdownOptions {
  timeout?: number
  onShutdown?: () => Promise<void>
}

/**
 * Graceful shutdown handler for the application
 * Handles SIGTERM and SIGINT signals to ensure clean shutdown
 */
export class GracefulShutdown {
  private isShuttingDown = false
  private server: any = null
  private options: ShutdownOptions

  constructor(options: ShutdownOptions = {}) {
    this.options = {
      timeout: options.timeout || 30000, // 30 seconds default
      onShutdown: options.onShutdown,
    }
  }

  /**
   * Register the server instance for shutdown
   */
  registerServer(server: any) {
    this.server = server
    return this
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'))
    process.on('SIGINT', () => this.shutdown('SIGINT'))
    return this
  }

  /**
   * Perform graceful shutdown
   */
  private async shutdown(signal: string) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal', { signal })
      return
    }

    this.isShuttingDown = true
    logger.info(`${signal} received, starting graceful shutdown...`)

    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit')
      process.exit(1)
    }, this.options.timeout)

    try {
      // Execute custom shutdown logic if provided
      if (this.options.onShutdown) {
        logger.info('Executing custom shutdown logic...')
        await this.options.onShutdown()
      }

      // Close database connections
      logger.info('Closing database connections...')
      await closeDatabaseConnection()

      // Close HTTP server
      if (this.server && typeof this.server.close === 'function') {
        logger.info('Closing HTTP server...')
        await new Promise<void>((resolve, reject) => {
          this.server.close((err?: Error) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }

      clearTimeout(shutdownTimeout)
      logger.info('✅ Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      clearTimeout(shutdownTimeout)
      logger.error('❌ Error during shutdown', { error })
      process.exit(1)
    }
  }
}

/**
 * Initialize graceful shutdown with default configuration
 */
export function initGracefulShutdown(server: any, options?: ShutdownOptions) {
  const shutdown = new GracefulShutdown(options)
  shutdown.registerServer(server).setupHandlers()
  return shutdown
}
