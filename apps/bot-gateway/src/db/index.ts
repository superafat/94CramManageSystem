import { createDbConnection } from '@94cram/shared/db';
import * as schema from '@94cram/shared/db';

let _db: ReturnType<typeof createDbConnection>['db'] | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!_db) {
    _db = createDbConnection(schema).db;
  }
  return _db;
}
