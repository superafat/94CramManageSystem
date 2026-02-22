import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3101),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/94stock'),
  DB_POOL_MAX: z.coerce.number().default(10),
  DB_POOL_IDLE_TIMEOUT: z.coerce.number().default(30),
  DB_POOL_MAX_LIFETIME: z.coerce.number().default(3600),
  DB_QUERY_TIMEOUT: z.coerce.number().default(30000),
  DB_CONNECT_TIMEOUT: z.coerce.number().default(10),
  JWT_SECRET: z.string().default('94stock-secret-key-change-in-prod'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const config = envSchema.parse(process.env)
