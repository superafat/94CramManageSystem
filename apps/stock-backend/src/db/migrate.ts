import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

const runMigrate = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  console.info('Connecting to database...');
  const connection = postgres(url, { max: 1 });
  const db = drizzle(connection);

  try {
    await connection.unsafe(`
CREATE TABLE IF NOT EXISTS stock_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(50),
  subject VARCHAR(100),
  school_year VARCHAR(20),
  student_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_class_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES stock_classes(id),
  item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity_per_student INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_material_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  class_id UUID REFERENCES stock_classes(id),
  warehouse_id UUID NOT NULL REFERENCES stock_warehouses(id),
  item_id UUID NOT NULL REFERENCES stock_items(id),
  distributed_quantity INTEGER NOT NULL,
  student_name VARCHAR(100),
  distributed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  performed_by UUID,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS stock_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  telegram_chat_id VARCHAR(100),
  telegram_bot_token VARCHAR(200),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  telegram_chat_id VARCHAR(100),
  telegram_message_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES stock_items(id),
  warehouse_id UUID NOT NULL REFERENCES stock_warehouses(id),
  prediction_type VARCHAR(50) NOT NULL,
  predicted_quantity INTEGER NOT NULL,
  confidence DECIMAL(3,2),
  reason TEXT,
  school_year VARCHAR(20),
  semester VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_historical_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES stock_items(id),
  warehouse_id UUID NOT NULL REFERENCES stock_warehouses(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  out_quantity INTEGER NOT NULL DEFAULT 0,
  class_count INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  integration_type VARCHAR(50) NOT NULL,
  api_endpoint VARCHAR(500),
  api_key VARCHAR(500),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  external_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  class_id UUID REFERENCES stock_classes(id),
  tuition_paid BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES stock_warehouses(id),
  name VARCHAR(200) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_inventory_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES stock_inventory_counts(id),
  item_id UUID NOT NULL REFERENCES stock_items(id),
  system_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  difference INTEGER,
  barcode VARCHAR(100),
  counted_at TIMESTAMP,
  counted_by UUID,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS stock_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES stock_items(id),
  barcode VARCHAR(100) NOT NULL UNIQUE,
  barcode_type VARCHAR(50) DEFAULT 'code128',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`);

    await migrate(db, { migrationsFolder: './drizzle' });
    console.info('Migrations complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

runMigrate();
