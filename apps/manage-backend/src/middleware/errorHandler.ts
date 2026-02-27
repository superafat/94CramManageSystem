import { createErrorHandler } from '@94cram/errors'
import { logger } from '../utils/logger'

interface ErrorHandlerContext {
  statusCode?: number
  [key: string]: unknown
}

// Custom logger function for error handler
function errorLogger(error: Error, context?: ErrorHandlerContext) {
  const payload = { ...context, stack: error.stack }
  if (context?.statusCode && context.statusCode >= 500) {
    logger.error({ ...payload }, error.message)
  } else {
    logger.warn({ ...(context || payload) }, error.message)
  }
}

export const errorHandler = createErrorHandler(
  process.env.NODE_ENV !== 'production',
  errorLogger
)
