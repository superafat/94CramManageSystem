export interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  standardHeaders?: boolean
  legacyHeaders?: boolean
}

export const defaultRateLimit: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
}

export const rateLimitConfig = {
  // API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many API requests, please try again later.',
  },

  // Auth endpoints (stricter limits)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
  },

  // Login endpoint
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many login attempts, please try again later.',
  },

  // Registration endpoint
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many registration attempts, please try again later.',
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts, please try again later.',
  },

  // Upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many upload requests, please try again later.',
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many search requests, please slow down.',
  },

  // GraphQL/Heavy queries
  graphql: {
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: 'Too many GraphQL requests, please slow down.',
  },

  // Webhook endpoints
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: 'Too many webhook requests, please slow down.',
  },
}

export type RateLimitEndpoint = keyof typeof rateLimitConfig
