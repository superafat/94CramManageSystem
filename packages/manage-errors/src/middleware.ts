import type { ErrorHandler } from 'hono';
import { AppError } from './errors.js';

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    stack?: string;
  };
}

/**
 * Global error handler for Hono using onError
 */
export function createErrorHandler(
  isDevelopment: boolean = process.env.NODE_ENV !== 'production',
  logger?: (error: Error, context: any) => void
): ErrorHandler {
  return (error: Error, c) => {
    // Generate request ID for tracking
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();

    // Handle AppError instances
    if (error instanceof AppError) {
      const response: ErrorResponse = {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
        },
      };

      if (isDevelopment) {
        response.error.stack = error.stack;
      }

      // Structured logging
      const logData = {
        requestId,
        type: 'AppError',
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
        path: c.req.path,
        method: c.req.method,
        timestamp: new Date().toISOString(),
      };

      if (logger) {
        logger(error, logData);
      } else if (error.statusCode >= 500) {
        console.error('[Error]', JSON.stringify(logData));
      } else if (isDevelopment) {
        console.warn('[Warning]', JSON.stringify(logData));
      }

      c.header('x-request-id', requestId);
      return c.json(response, error.statusCode as any);
    }

    // Handle unknown errors
    const logData = {
      requestId,
      type: 'UnhandledError',
      name: error.name,
      message: error.message,
      path: c.req.path,
      method: c.req.method,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    if (logger) {
      logger(error, logData);
    } else {
      console.error('[Error]', JSON.stringify(logData));
    }

    const response: ErrorResponse = {
      success: false,
      error: {
        message: isDevelopment ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      },
    };

    if (isDevelopment) {
      response.error.stack = error.stack;
    }

    c.header('x-request-id', requestId);
    return c.json(response, 500 as any);
  };
}

/**
 * @deprecated Use createErrorHandler() with app.onError() instead
 */
export function errorHandler(isDevelopment: boolean = process.env.NODE_ENV !== 'production') {
  return createErrorHandler(isDevelopment);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler<T extends any[]>(
  fn: (...args: T) => Promise<Response | void>
) {
  return async (...args: T): Promise<Response | void> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error; // Re-throw to be caught by errorHandler
    }
  };
}
