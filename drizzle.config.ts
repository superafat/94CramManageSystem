import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema/all.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:94cram-db-2026@35.221.144.161:5432/94platform',
  },
});
