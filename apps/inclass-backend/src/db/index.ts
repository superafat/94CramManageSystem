import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@94cram/shared/db';

const { Pool } = pg;

// Cloud SQL connection
// - Production: via Cloud SQL Auth Proxy unix socket (no SSL needed, IAM-authed)
// - Fallback: direct public IP with SSL
const rawDbUrl = process.env.DATABASE_URL;
if (!rawDbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const isUnixSocket = rawDbUrl.includes('/cloudsql/');
const dbUrl = rawDbUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const needsSsl = !isUnixSocket && (rawDbUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
