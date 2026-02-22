import { createErrorHandler } from '@94cram/errors'
import { logger } from '../utils/logger'

// Custom logger function for error handler
function errorLogger(error: Error, context: any) {
  if (context.statusCode && context.statusCode >= 500) {
    logger.error(error.message, { ...context, stack: error.stack })
  } else {
    logger.warn(error.message, context)
  }
}

export const errorHandler = createErrorHandler(
  process.env.NODE_ENV !== 'production',
  errorLogger
)
