import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3300),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_PARENT_BOT_TOKEN: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1),
  MANAGE_URL: z.string().url(),
  INCLASS_URL: z.string().url(),
  STOCK_URL: z.string().url(),
  SERVICE_URL: z.string().url().optional(),
  BOT_DASHBOARD_URL: z.string().url().optional(),
  INTERNAL_API_KEY: z.string().min(1).optional(),
  GCP_PROJECT_ID: z.string().default('cram94-manage-system'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
