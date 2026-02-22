/**
 * Startup migration runner - runs on server start
 * Checks and adds missing columns to existing tables
 */
import { db } from './index'
import { sql } from 'drizzle-orm'

export async function runMigrations() {
  console.log('Running startup migrations...')
  
  try {
    // Migration v9: Add trial system fields to tenants
    await db.execute(sql`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS trial_status VARCHAR(20) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS trial_approved_by UUID,
      ADD COLUMN IF NOT EXISTS trial_approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS trial_notes TEXT;
    `)
    console.log('Migration v9: trial fields added')
  } catch (err) {
    // Ignore if columns already exist
    console.log('Migration v9: columns may already exist')
  }

  // Migration v10: Add fee fields to courses + payment_records table
  try {
    await db.execute(sql`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS fee_monthly INTEGER,
      ADD COLUMN IF NOT EXISTS fee_quarterly INTEGER,
      ADD COLUMN IF NOT EXISTS fee_semester INTEGER,
      ADD COLUMN IF NOT EXISTS fee_yearly INTEGER
    `)
    console.log('Migration v10: courses fee fields added')
  } catch (err) {
    console.log('Migration v10: courses fee fields may already exist')
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        student_id UUID NOT NULL REFERENCES students(id),
        course_id UUID REFERENCES courses(id),
        payment_type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        payment_date VARCHAR(10),
        period_month VARCHAR(7),
        status VARCHAR(20) DEFAULT 'paid',
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payment_records_tenant ON payment_records(tenant_id)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payment_records_student ON payment_records(student_id)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payment_records_period ON payment_records(period_month)`)
    console.log('Migration v10: payment_records table created')
  } catch (err) {
    console.log('Migration v10: payment_records may already exist')
  }

  // Migration v11: Add audit_logs table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        user_id UUID REFERENCES users(id),
        user_name VARCHAR(100),
        user_role VARCHAR(20),
        action VARCHAR(20) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id UUID,
        old_value JSONB,
        new_value JSONB,
        change_summary VARCHAR(500),
        needs_alert BOOLEAN DEFAULT false,
        alert_sent BOOLEAN DEFAULT false,
        parent_notified BOOLEAN DEFAULT false,
        alert_confirmed_at TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_alert ON audit_logs(needs_alert)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`)
    console.log('Migration v11: audit_logs table created')
  } catch (err) {
    console.log('Migration v11: audit_logs may already exist')
  }
  
  console.log('All migrations complete!')
}
