import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3100),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_POOL_IDLE_TIMEOUT: z.coerce.number().default(30),
  DB_POOL_MAX_LIFETIME: z.coerce.number().default(3600),
  DB_QUERY_TIMEOUT: z.coerce.number().default(30000),
  DB_CONNECT_TIMEOUT: z.coerce.number().default(10),
  GEMINI_API_KEY: z.string().optional(),
  MINIMAX_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET environment variable is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FIREBASE_PROJECT_ID: z.string().optional(),
})

export const config = envSchema.parse(process.env)
