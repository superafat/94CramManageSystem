/**
 * Startup migration runner - runs on server start
 * Checks and adds missing columns to existing tables
 */
import { db } from './index'
import { sql } from 'drizzle-orm'

export async function runMigrations() {
  console.info('Running startup migrations...')
  
  // Migration v0: Add essential columns to users table for password login
  try {
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS tenant_id UUID,
      ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `)
    console.info('Migration v0: users table columns added')
  } catch (err) {
    console.info('Migration v0: users columns may already exist')
  }
  
  // Migration v1: Ensure tenants table exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.info('Migration v1: tenants table created')
  } catch (err) {
    console.info('Migration v1: tenants table may already exist')
  }
  
  // Migration v2: Add tenant_id to users if not exists
  try {
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)
    `)
    console.info('Migration v2: users.tenant_id added')
  } catch (err) {
    console.info('Migration v2: users.tenant_id may already exist')
  }
  
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
    console.info('Migration v9: trial fields added')
  } catch (err) {
    // Ignore if columns already exist
    console.info('Migration v9: columns may already exist')
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
    console.info('Migration v10: courses fee fields added')
  } catch (err) {
    console.info('Migration v10: courses fee fields may already exist')
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
    console.info('Migration v10: payment_records table created')
  } catch (err) {
    console.info('Migration v10: payment_records may already exist')
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
    console.info('Migration v11: audit_logs table created')
  } catch (err) {
    console.info('Migration v11: audit_logs may already exist')
  }
  
  // Migration v12: Ensure conversations table exists (for AI dialogue log)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        branch_id UUID REFERENCES branches(id),
        user_id UUID REFERENCES users(id),
        channel VARCHAR(20) NOT NULL DEFAULT 'web',
        intent VARCHAR(30),
        query TEXT NOT NULL,
        answer TEXT NOT NULL,
        model TEXT,
        latency_ms INTEGER,
        tokens_used INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_conversations_branch ON conversations(branch_id)`)
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at)`)
    console.info('Migration v12: conversations table created')
  } catch (err) {
    console.info('Migration v12: conversations may already exist')
  }

  // Migration v13: Ensure manage_settings table exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS manage_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
        settings JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES users(id)
      )
    `)
    console.info('Migration v13: manage_settings table created')
  } catch (err) {
    console.info('Migration v13: manage_settings may already exist')
  }

  console.info('All migrations complete!')
}
