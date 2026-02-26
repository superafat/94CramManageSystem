/**
 * DB Connection Factory — 統一使用 postgres.js (postgres)
 * 三個系統共用：manage / inclass / stock
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Re-export column helpers
export { pgTable, serial, varchar, uuid, timestamp, boolean, text, integer, decimal, jsonb, index, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * 解析 DATABASE_URL，支援 Cloud SQL Unix socket
 * 格式: postgres://user:pass@/database?host=/cloudsql/project:region:instance
 */
function parseConnectionUrl(url: string): postgres.Options<{}> {
  const socketMatch = url.match(/\?host=(.+)$/);
  if (socketMatch) {
    const socketPath = decodeURIComponent(socketMatch[1]);
    const baseUrl = url.replace(/\?host=.+$/, '');
    const parsed = new URL(baseUrl);
    return {
      host: socketPath,
      port: 5432,
      database: parsed.pathname.slice(1),
      username: parsed.username,
      password: decodeURIComponent(parsed.password),
    };
  }
  return { connection: { url } } as any;
}

/**
 * 建立 DB 連線（postgres.js + drizzle）
 * @param url DATABASE_URL，預設從環境變數取
 * @param schema drizzle schema（各 backend 自己的 schema）
 */
export function createDbConnection<T extends Record<string, unknown>>(
  schema: T,
  url?: string,
) {
  const dbUrl = url || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not configured');

  const options = parseConnectionUrl(dbUrl);
  const client = postgres(dbUrl, {
    max: 10,
    idle_timeout: 30,
    max_lifetime: 60 * 30,
    ...options,
  });

  return {
    db: drizzle(client, { schema }),
    client,
  };
}
