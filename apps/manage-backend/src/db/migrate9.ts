// Migration v9: Add trial system fields to tenants

import { db } from './index'
import { sql } from 'drizzle-orm'
import { logger } from '../utils/logger'

async function migrate() {
  logger.info('Running migration v9: trial system...')
  
  // Add trial fields to tenants table
  await db.execute(sql`
    ALTER TABLE tenants 
    ADD COLUMN IF NOT EXISTS trial_status VARCHAR(20) DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS trial_approved_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS trial_approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS trial_notes TEXT;
  `)
  
  logger.info('Migration v9 completed!')
}

migrate().catch((err) => logger.error({ err }, "Migration failed"))
