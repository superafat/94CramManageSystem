-- HiveMind v2: Multi-tenant migration
-- Run: psql $DATABASE_URL -f migrate-v2-tenant.sql

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',  -- free | basic | pro | enterprise
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add tenant_id to existing tables
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- 3. Create indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON knowledge_chunks(tenant_id);

-- 4. Insert demo tenants
INSERT INTO tenants (id, name, slug, plan) VALUES
  ('11111111-1111-1111-1111-111111111111', '愛學館', 'imstudy', 'pro'),
  ('22222222-2222-2222-2222-222222222222', '傑人補習班', 'jieren', 'basic')
ON CONFLICT (slug) DO NOTHING;

-- 5. Update existing data to belong to 愛學館 tenant
UPDATE branches SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE users SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE conversations SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE knowledge_chunks SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;

-- 6. Insert demo branch for 傑人
INSERT INTO branches (id, name, code, tenant_id) VALUES
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '傑人總校', 'JR-MAIN', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;
