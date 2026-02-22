// DB Schema - 共用連線工廠
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export { pgTable, serial, varchar, uuid, timestamp, boolean, text, integer, decimal, jsonb } from 'drizzle-orm/node-postgres';

// 連線工廠（供各 backend 使用）
let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export function getDb() {
  return drizzle(getPool());
}
