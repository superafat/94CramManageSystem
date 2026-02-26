import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './packages/shared/src/db/schema/common.ts',
    './packages/shared/src/db/schema/manage.ts',
    './packages/shared/src/db/schema/inclass.ts',
    './packages/shared/src/db/schema/stock.ts',
  ],
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
