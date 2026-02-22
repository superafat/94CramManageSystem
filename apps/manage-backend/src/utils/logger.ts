import * as winston from 'winston'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

// Define colors for development
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
}

winston.addColors(colors)

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Human-readable format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const reqId = requestId ? `[${requestId}] ` : ''
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : ''
    return `${timestamp} ${level}: ${reqId}${message}${metaStr}`
  })
)

// Create logger instance
export const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: isDevelopment ? devFormat : jsonFormat,
  transports: [
    new winston.transports.Console(),
  ],
  // Don't exit on uncaught errors
  exitOnError: false,
})

// Create child logger with context
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context)
}
